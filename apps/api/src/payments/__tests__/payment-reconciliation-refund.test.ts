import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../db/prisma.js';
import {
  createPaymentIntentService,
  processPaymentEventService,
  createRefundService,
  reconcilePaymentService,
  getBookingRefundsService,
  getPaymentAuditLogsService,
} from '../payment.service.js';
import { cancelBookingService } from '../../bookings/booking.service.js';
import { MockPaymentProvider } from '../mock-payment.provider.js';

describe('Phase 12 — Payment Reconciliation, Refunds & Lifecycle Hardening', () => {
  let testUser: any;
  let testPlace: any;

  before(async () => {
    testUser = await db.user.create({
      data: {
        email: `recon_test_${Date.now()}@example.com`,
        name: 'Reconciliation Test Customer',
        passwordHash: 'hashed_pw',
        role: 'CUSTOMER',
      },
    });

    testPlace = await db.place.create({
      data: {
        name: 'Reconciliation Test Hotel',
        city: 'Bengaluru',
        country: 'India',
        priceLevel: 3,
      },
    });
  });

  after(async () => {
    await db.paymentAuditLog.deleteMany({});
    await db.refund.deleteMany({
      where: { booking: { userId: testUser.id } },
    });
    await db.payment.deleteMany({
      where: { booking: { userId: testUser.id } },
    });
    await db.booking.deleteMany({
      where: { userId: testUser.id },
    });
    await db.place.delete({ where: { id: testPlace.id } });
    await db.user.delete({ where: { id: testUser.id } });
  });

  describe('1. Full & Partial Refunds with Server-Authoritative Protection', () => {
    let booking: any;
    let payment: any;

    before(async () => {
      booking = await db.booking.create({
        data: {
          userId: testUser.id,
          placeId: testPlace.id,
          bookingType: 'ACTIVITY',
          status: 'PENDING_PAYMENT',
          bookingDate: new Date('2026-11-01'),
          guestCount: 2,
          unitPrice: 50.0,
          totalAmount: 100.0,
          currency: 'USD',
        },
      });

      const intent = await createPaymentIntentService(booking.id, testUser.id, `idemp_rfnd_${Date.now()}`);
      payment = await processPaymentEventService({
        providerPaymentId: intent.providerPaymentId!,
        eventType: 'payment.succeeded',
      });
    });

    test('Supports valid partial refund', async () => {
      const refund1 = await createRefundService({
        bookingId: booking.id,
        userId: testUser.id,
        amount: 40.0,
        reason: 'Partial cancellation - 1 guest dropped',
        idempotencyKeyInput: `idemp_part_1_${Date.now()}`,
      });

      assert.equal(refund1.amount, 40.0);
      assert.equal(refund1.status, 'SUCCEEDED');

      // Booking status should still be CONFIRMED because partial refund $40 < total $100
      const checkBooking = await db.booking.findUnique({ where: { id: booking.id } });
      assert.equal(checkBooking?.status, 'CONFIRMED');
    });

    test('Supports second partial refund', async () => {
      const refund2 = await createRefundService({
        bookingId: booking.id,
        userId: testUser.id,
        amount: 30.0,
        reason: 'Second partial refund',
        idempotencyKeyInput: `idemp_part_2_${Date.now()}`,
      });

      assert.equal(refund2.amount, 30.0);
      assert.equal(refund2.status, 'SUCCEEDED');
    });

    test('Rejects over-refund attempt exceeding remaining balance', async () => {
      // Paid: $100, Refunded: $40 + $30 = $70. Remaining balance = $30.
      // Attempting to refund $50 should fail.
      await assert.rejects(
        () =>
          createRefundService({
            bookingId: booking.id,
            userId: testUser.id,
            amount: 50.0,
            reason: 'Greedy refund',
          }),
        (err: any) => err.message.includes('EXCEEDS_REFUNDABLE_AMOUNT')
      );
    });

    test('Final full refund transitions booking status to REFUNDED', async () => {
      // Refund remaining $30
      const refund3 = await createRefundService({
        bookingId: booking.id,
        userId: testUser.id,
        amount: 30.0,
        reason: 'Final refund',
        idempotencyKeyInput: `idemp_part_3_${Date.now()}`,
      });

      assert.equal(refund3.amount, 30.0);

      const checkBooking = await db.booking.findUnique({ where: { id: booking.id } });
      assert.equal(checkBooking?.status, 'REFUNDED');
    });

    test('Rejects refund request on fully refunded payment', async () => {
      await assert.rejects(
        () =>
          createRefundService({
            bookingId: booking.id,
            userId: testUser.id,
            amount: 10.0,
          }),
        (err: any) => err.message.includes('ALREADY_FULLY_REFUNDED')
      );
    });
  });

  describe('2. Refund Idempotency & Concurrent Requests', () => {
    let booking: any;
    let payment: any;

    before(async () => {
      booking = await db.booking.create({
        data: {
          userId: testUser.id,
          placeId: testPlace.id,
          bookingType: 'ACTIVITY',
          status: 'PENDING_PAYMENT',
          bookingDate: new Date('2026-11-10'),
          guestCount: 2,
          unitPrice: 100.0,
          totalAmount: 200.0,
          currency: 'USD',
        },
      });

      const intent = await createPaymentIntentService(booking.id, testUser.id, `idemp_rfnd_conc_${Date.now()}`);
      payment = await processPaymentEventService({
        providerPaymentId: intent.providerPaymentId!,
        eventType: 'payment.succeeded',
      });
    });

    test('Duplicate refund request with same idempotency key returns exact same RefundDTO', async () => {
      const key = `same_idemp_key_${Date.now()}`;

      const res1 = await createRefundService({
        bookingId: booking.id,
        userId: testUser.id,
        amount: 50.0,
        idempotencyKeyInput: key,
      });

      const res2 = await createRefundService({
        bookingId: booking.id,
        userId: testUser.id,
        amount: 50.0,
        idempotencyKeyInput: key,
      });

      assert.equal(res1.id, res2.id);
      assert.equal(res1.amount, res2.amount);
    });

    test('50 concurrent refund requests with different idempotency keys never refund more than total amount', async () => {
      // Total amount is $200. $50 already refunded. Remaining = $150.
      // Send 50 concurrent requests each requesting full refund.
      const requests = Array.from({ length: 50 }).map((_, i) =>
        createRefundService({
          bookingId: booking.id,
          userId: testUser.id,
          amount: 150.0,
          idempotencyKeyInput: `conc_rfnd_key_${i}_${Date.now()}`,
        })
          .then((res) => ({ success: true, res }))
          .catch((err) => ({ success: false, error: err.message }))
      );

      const results = await Promise.all(requests);
      const succeededCount = results.filter((r) => r.success).length;

      // Exactly ONE request should succeed to claim the remaining $150
      assert.equal(succeededCount, 1);

      // Verify total refunded amount in DB equals exactly $200
      const totalRefundedSum = await db.refund.aggregate({
        where: { bookingId: booking.id, status: 'SUCCEEDED' },
        _sum: { amount: true },
      });

      assert.equal(Number(totalRefundedSum._sum.amount), 200.0);
    });
  });

  describe('3. Booking Cancellation + Payment & Late Webhook Races', () => {
    test('Cancelling a paid booking auto-triggers full refund and marks status REFUNDED', async () => {
      const booking = await db.booking.create({
        data: {
          userId: testUser.id,
          placeId: testPlace.id,
          bookingType: 'ACTIVITY',
          status: 'PENDING_PAYMENT',
          bookingDate: new Date('2026-12-01'),
          guestCount: 1,
          unitPrice: 150.0,
          totalAmount: 150.0,
          currency: 'USD',
        },
      });

      const intent = await createPaymentIntentService(booking.id, testUser.id, `idemp_cancel_${Date.now()}`);
      await processPaymentEventService({
        providerPaymentId: intent.providerPaymentId!,
        eventType: 'payment.succeeded',
      });

      const cancelledBooking = await cancelBookingService(booking.id, testUser.id);
      assert.equal(cancelledBooking.status, 'REFUNDED');

      const refunds = await getBookingRefundsService(booking.id, testUser.id);
      assert.equal(refunds.length, 1);
      assert.equal(refunds[0].amount, 150.0);
    });

    test('Late payment webhook arriving on an ALREADY CANCELLED booking automatically issues a refund', async () => {
      const booking = await db.booking.create({
        data: {
          userId: testUser.id,
          placeId: testPlace.id,
          bookingType: 'ACTIVITY',
          status: 'PENDING_PAYMENT',
          bookingDate: new Date('2026-12-05'),
          guestCount: 1,
          unitPrice: 80.0,
          totalAmount: 80.0,
          currency: 'USD',
        },
      });

      const intent = await createPaymentIntentService(booking.id, testUser.id, `idemp_late_wh_${Date.now()}`);

      // User cancels booking while payment intent was still PENDING
      await cancelBookingService(booking.id, testUser.id);

      const checkBefore = await db.booking.findUnique({ where: { id: booking.id } });
      assert.equal(checkBefore?.status, 'CANCELLED');

      // Late payment.succeeded webhook arrives from provider
      await processPaymentEventService({
        providerPaymentId: intent.providerPaymentId!,
        eventType: 'payment.succeeded',
      });

      // Verify payment was recorded as SUCCEEDED, but booking was auto-refunded
      const updatedPayment = await db.payment.findUnique({ where: { idempotencyKey: intent.idempotencyKey } });
      assert.equal(updatedPayment?.status, 'SUCCEEDED');

      const checkAfter = await db.booking.findUnique({ where: { id: booking.id } });
      assert.equal(checkAfter?.status, 'REFUNDED');
    });
  });

  describe('4. Reconciliation Service', () => {
    let booking: any;
    let payment: any;

    before(async () => {
      booking = await db.booking.create({
        data: {
          userId: testUser.id,
          placeId: testPlace.id,
          bookingType: 'ACTIVITY',
          status: 'PENDING_PAYMENT',
          bookingDate: new Date('2026-12-10'),
          guestCount: 1,
          unitPrice: 60.0,
          totalAmount: 60.0,
          currency: 'USD',
        },
      });

      payment = await db.payment.create({
        data: {
          bookingId: booking.id,
          amount: 60.0,
          currency: 'USD',
          status: 'PENDING',
          provider: 'MOCK',
          providerPaymentId: `mock_recon_${Date.now()}`,
          idempotencyKey: `idemp_recon_${Date.now()}`,
        },
      });
    });

    test('Reconciles payment when provider is SUCCEEDED but DB is PENDING (Syncs state)', async () => {
      const mockProvider = new MockPaymentProvider();
      mockProvider.fetchPaymentStatus = async () => ({ status: 'SUCCEEDED' });

      const reconResult = await reconcilePaymentService(payment.id, mockProvider);

      assert.equal(reconResult.status, 'SYNCED');
      assert.equal(reconResult.dbPaymentStatus, 'SUCCEEDED');
      assert.equal(reconResult.dbBookingStatus, 'CONFIRMED');

      const updatedDbPayment = await db.payment.findUnique({ where: { id: payment.id } });
      assert.equal(updatedDbPayment?.status, 'SUCCEEDED');

      const updatedDbBooking = await db.booking.findUnique({ where: { id: booking.id } });
      assert.equal(updatedDbBooking?.status, 'CONFIRMED');
    });

    test('Returns MATCHED status when DB and Provider states are aligned', async () => {
      const mockProvider = new MockPaymentProvider();
      mockProvider.fetchPaymentStatus = async () => ({ status: 'SUCCEEDED' });

      const reconResult = await reconcilePaymentService(payment.id, mockProvider);
      assert.equal(reconResult.status, 'MATCHED');
    });

    test('Detects DISCREPANCY when DB is SUCCEEDED but Provider is UNKNOWN', async () => {
      const mockProvider = new MockPaymentProvider();
      mockProvider.fetchPaymentStatus = async () => ({ status: 'UNKNOWN' });

      const reconResult = await reconcilePaymentService(payment.id, mockProvider);
      assert.equal(reconResult.status, 'DISCREPANCY_DETECTED');
    });
  });

  describe('5. Audit Logs & Security Checks', () => {
    test('Audit log entries are recorded for payment lifecycle events', async () => {
      const booking = await db.booking.create({
        data: {
          userId: testUser.id,
          placeId: testPlace.id,
          bookingType: 'ACTIVITY',
          status: 'PENDING_PAYMENT',
          bookingDate: new Date('2026-12-20'),
          guestCount: 1,
          unitPrice: 50.0,
          totalAmount: 50.0,
          currency: 'USD',
        },
      });

      const intent = await createPaymentIntentService(booking.id, testUser.id, `audit_idemp_${Date.now()}`);
      await processPaymentEventService({
        providerPaymentId: intent.providerPaymentId!,
        eventType: 'payment.succeeded',
      });

      const logs = await getPaymentAuditLogsService(booking.id, testUser.id);
      assert.ok(logs.length >= 2);
      assert.ok(logs.some((l) => l.eventType === 'payment.created'));
      assert.ok(logs.some((l) => l.eventType === 'payment.succeeded'));
    });

    test('Rejects refund attempt by unauthorized user (IDOR)', async () => {
      const unauthorizedUser = await db.user.create({
        data: {
          email: `unauth_${Date.now()}@example.com`,
          name: 'Unauthorized User',
          passwordHash: 'pw',
        },
      });

      const booking = await db.booking.create({
        data: {
          userId: testUser.id,
          placeId: testPlace.id,
          bookingType: 'ACTIVITY',
          status: 'PENDING_PAYMENT',
          bookingDate: new Date('2026-12-25'),
          guestCount: 1,
          unitPrice: 70.0,
          totalAmount: 70.0,
          currency: 'USD',
        },
      });

      await assert.rejects(
        () =>
          createRefundService({
            bookingId: booking.id,
            userId: unauthorizedUser.id,
            amount: 70.0,
          }),
        (err: any) => err.message.includes('NOT_FOUND')
      );

      await db.user.delete({ where: { id: unauthorizedUser.id } });
    });
  });
});
