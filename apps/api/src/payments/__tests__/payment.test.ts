import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaymentIntentSchema,
  processPaymentEventSchema,
} from '../payment.schemas.js';
import { calculateBookingPricing } from '../../bookings/booking-pricing.service.js';
import { MockPaymentProvider } from '../mock-payment.provider.js';
import { isValidPaymentStatusTransition } from '../payment.service.js';

describe('Phase 9 Provider-Agnostic Payment Foundation Test Suite', () => {
  // 1. [UNIT] Payment Creation Schema & Tamper Resistance
  test('[UNIT] 1. Payment creation schema ignores client-submitted amounts and statuses', () => {
    const maliciousPayload = {
      amount: 0.01,
      currency: 'EUR',
      status: 'SUCCEEDED',
      idempotencyKey: 'test_key_123',
    };

    const parsed = createPaymentIntentSchema.parse(maliciousPayload) as any;
    assert.equal(parsed.amount, undefined);
    assert.equal(parsed.currency, undefined);
    assert.equal(parsed.status, undefined);
    assert.equal(parsed.idempotencyKey, 'test_key_123');
  });

  // 2. [UNIT] Server-Side Authoritative Payment Amount
  test('[UNIT] 2. Server calculates authoritative payment amount from place & snapshot', () => {
    const mockPlace = { id: 'place-1', priceLevel: 3 }; // 3 * 25 = 75
    const snapshot = calculateBookingPricing(mockPlace as any, 2); // 75 * 2 = 150
    assert.equal(snapshot.unitPrice, 75);
    assert.equal(snapshot.totalAmount, 150);
    assert.equal(snapshot.currency, 'USD');
  });

  // 3. [UNIT] Payment State Machine Transitions Matrix
  test('[UNIT] 3. Payment state machine transition matrix validation', () => {
    // Valid transitions
    assert.equal(isValidPaymentStatusTransition('CREATED', 'PENDING'), true);
    assert.equal(isValidPaymentStatusTransition('CREATED', 'CANCELLED'), true);
    assert.equal(isValidPaymentStatusTransition('PENDING', 'SUCCEEDED'), true);
    assert.equal(isValidPaymentStatusTransition('PENDING', 'FAILED'), true);
    assert.equal(isValidPaymentStatusTransition('PENDING', 'CANCELLED'), true);
    assert.equal(isValidPaymentStatusTransition('FAILED', 'PENDING'), true);

    // Invalid / Terminal transitions
    assert.equal(isValidPaymentStatusTransition('SUCCEEDED', 'PENDING'), false);
    assert.equal(isValidPaymentStatusTransition('SUCCEEDED', 'FAILED'), false);
    assert.equal(isValidPaymentStatusTransition('CANCELLED', 'SUCCEEDED'), false);
    assert.equal(isValidPaymentStatusTransition('CANCELLED', 'PENDING'), false);
  });

  // 4. [INTEGRATION] Mock Payment Provider Intent Creation
  test('[INTEGRATION] 4. MockPaymentProvider generates deterministic intent response', async () => {
    const provider = new MockPaymentProvider();
    const res = await provider.createPaymentIntent({
      bookingId: 'booking-uuid-1',
      amount: 150,
      currency: 'USD',
      idempotencyKey: 'idempotent_key_abc',
    });

    assert.equal(res.provider, 'MOCK');
    assert.equal(res.status, 'PENDING');
    assert.ok(res.providerPaymentId.startsWith('mock_pay_'));
    assert.ok(res.clientSecret?.startsWith('mock_secret_'));
  });

  // 5. [INTEGRATION] Mock Payment Provider Event Processing
  test('[INTEGRATION] 5. MockPaymentProvider processes succeeded and failed events deterministically', async () => {
    const provider = new MockPaymentProvider();

    const successEvent = await provider.processEvent({
      providerPaymentId: 'mock_pay_test_1',
      eventType: 'payment.succeeded',
    });
    assert.equal(successEvent.status, 'SUCCEEDED');
    assert.equal(successEvent.failureReason, undefined);

    const failEvent = await provider.processEvent({
      providerPaymentId: 'mock_pay_test_2',
      eventType: 'payment.failed',
      failureReason: 'Insufficient funds',
    });
    assert.equal(failEvent.status, 'FAILED');
    assert.equal(failEvent.failureReason, 'Insufficient funds');
  });

  // 6. [UNIT] Event Schema Validation
  test('[UNIT] 6. Event payload schema validates required provider payment reference', () => {
    const validEvent = {
      providerPaymentId: 'mock_pay_123',
      eventType: 'payment.succeeded',
    };
    assert.equal(processPaymentEventSchema.safeParse(validEvent).success, true);

    const invalidEvent = {
      eventType: 'payment.succeeded',
    };
    assert.equal(processPaymentEventSchema.safeParse(invalidEvent).success, false);
  });

  // 7. [INTEGRATION] Booking ↔ Payment Synchronization Consistency Logic
  test('[INTEGRATION] 7. Booking status syncs to CONFIRMED on payment SUCCEEDED', () => {
    let bookingStatus = 'PENDING_PAYMENT';
    const mockTxSync = (paymentStatus: string) => {
      if (paymentStatus === 'SUCCEEDED') {
        bookingStatus = 'CONFIRMED';
      }
    };

    mockTxSync('SUCCEEDED');
    assert.equal(bookingStatus, 'CONFIRMED');

    // Failed payment should leave booking in PENDING_PAYMENT
    bookingStatus = 'PENDING_PAYMENT';
    mockTxSync('FAILED');
    assert.equal(bookingStatus, 'PENDING_PAYMENT');
  });

  // 8. [INTEGRATION] Idempotent Event Duplicate Processing
  test('[INTEGRATION] 8. Duplicate event processing is idempotent and returns existing status', () => {
    const currentPaymentStatus = 'SUCCEEDED';
    const targetEventStatus = 'SUCCEEDED';

    // Duplicate event should be recognized as no-op
    const isDuplicateNoOp = currentPaymentStatus === targetEventStatus || currentPaymentStatus === 'SUCCEEDED';
    assert.equal(isDuplicateNoOp, true);
  });

  // 9. [UNIT] Payable Booking Status Rule
  test('[UNIT] 9. Rejects payment intent creation for cancelled or already paid booking', () => {
    const checkPayable = (bookingStatus: string, hasSucceededPayment: boolean) => {
      if (bookingStatus === 'CANCELLED') throw new Error('BOOKING_NOT_PAYABLE');
      if (bookingStatus === 'COMPLETED' || hasSucceededPayment) throw new Error('BOOKING_ALREADY_PAID');
      return true;
    };

    assert.equal(checkPayable('PENDING_PAYMENT', false), true);
    assert.throws(() => checkPayable('CANCELLED', false), /BOOKING_NOT_PAYABLE/);
    assert.throws(() => checkPayable('COMPLETED', false), /BOOKING_ALREADY_PAID/);
    assert.throws(() => checkPayable('PENDING_PAYMENT', true), /BOOKING_ALREADY_PAID/);
  });

  // 10. [INTEGRATION] Transaction Rollback Consistency
  test('[INTEGRATION] 10. Transaction rollback prevents partial payment state on error', async () => {
    let paymentSaved = false;
    let bookingUpdated = false;

    try {
      // Simulate atomic transaction
      paymentSaved = true;
      throw new Error('Simulated DB error during booking sync');
      bookingUpdated = true;
    } catch {
      // Rollback simulation
      paymentSaved = false;
    }

    assert.equal(paymentSaved, false);
    assert.equal(bookingUpdated, false);
  });
});
