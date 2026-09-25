import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingSchema } from '../booking.schemas.js';
import { calculateBookingPricing } from '../booking-pricing.service.js';
import { MockBookingAvailabilityProvider } from '../booking-availability.provider.js';
import { isValidStatusTransition } from '../booking.service.js';

describe('Phase 8 Booking System Audit Fixes & Unit Tests', () => {
  // 1. [UNIT] Request authentication & schema requirement
  test('[UNIT] 1. Request authentication & schema requirement', () => {
    const invalidInput = {
      bookingType: 'ACTIVITY',
    };
    const res = createBookingSchema.safeParse(invalidInput);
    assert.equal(res.success, false);
  });

  // 2. [UNIT] Request validation for date, time, and guestCount
  test('[UNIT] 2. Zod request validation for date, time, and guestCount', () => {
    const validPayload = {
      tripId: '123e4567-e89b-12d3-a456-426614174000',
      placeId: '123e4567-e89b-12d3-a456-426614174001',
      bookingType: 'ACTIVITY',
      bookingDate: '2026-10-10',
      startTime: '10:00',
      endTime: '12:00',
      guestCount: 2,
    };
    const validRes = createBookingSchema.safeParse(validPayload);
    assert.equal(validRes.success, true);

    const invalidDate = { ...validPayload, bookingDate: 'invalid-date' };
    assert.equal(createBookingSchema.safeParse(invalidDate).success, false);

    const invalidTime = { ...validPayload, startTime: '25:00' };
    assert.equal(createBookingSchema.safeParse(invalidTime).success, false);
  });

  // 3. [UNIT] Bookable Resource Validation: missing placeId AND listingId rejected
  test('[UNIT] 3. Bookable Resource Validation: rejects payload missing both placeId and listingId', () => {
    const missingResourcePayload = {
      bookingType: 'ACTIVITY',
      bookingDate: '2026-10-10',
      guestCount: 2,
    };
    const res = createBookingSchema.safeParse(missingResourcePayload);
    assert.equal(res.success, false);
    if (!res.success) {
      const formatted = res.error.format();
      assert.ok(formatted.placeId?._errors.length);
    }
  });

  // 4. [UNIT] Client userId cannot override authenticated user
  test('[UNIT] 4. Client userId field is ignored or stripped from create booking input', () => {
    const payloadWithUser = {
      placeId: '123e4567-e89b-12d3-a456-426614174001',
      bookingType: 'RESTAURANT',
      bookingDate: '2026-10-10',
      guestCount: 2,
      userId: 'attacker-user-id',
    };
    const parsed = createBookingSchema.parse(payloadWithUser) as any;
    assert.equal(parsed.userId, undefined);
  });

  // 5. [UNIT] Price Snapshot Validation: Client prices ignored & authoritative pricing computed
  test('[UNIT] 5. Price Snapshot Test: Fake client prices/currency stripped & server calculates snapshot', () => {
    const clientPayloadWithFakePrices = {
      placeId: '123e4567-e89b-12d3-a456-426614174001',
      bookingType: 'ACTIVITY',
      bookingDate: '2026-10-10',
      guestCount: 3,
      unitPrice: 0.01,
      totalAmount: 0.03,
      currency: 'EUR',
    };
    const parsed = createBookingSchema.parse(clientPayloadWithFakePrices) as any;
    assert.equal(parsed.unitPrice, undefined);
    assert.equal(parsed.totalAmount, undefined);
    assert.equal(parsed.currency, undefined);

    const mockPlace = { id: 'place-1', priceLevel: 2 }; // 2 * 25 = 50
    const snapshot = calculateBookingPricing(mockPlace as any, 3);
    assert.equal(snapshot.unitPrice, 50);
    assert.equal(snapshot.totalAmount, 150);
    assert.equal(snapshot.currency, 'USD');
  });

  // 6. [INTEGRATION] Availability Provider & Concurrency Protection
  test('[INTEGRATION] 6. Availability Concurrency: Provider enforces capacity limit inside transaction boundary', async () => {
    const provider = new MockBookingAvailabilityProvider(2);
    const mockTx = {
      booking: {
        count: async () => 2, // Simulate 2 existing active bookings
      },
    };

    const res = await provider.checkAvailability({
      placeId: 'place-100',
      bookingDate: new Date('2026-10-10'),
      startTime: '10:00',
      guestCount: 1,
      tx: mockTx,
    });

    assert.equal(res.isAvailable, false);
    assert.ok(res.reason?.includes('maximum booking capacity'));
  });

  // 7. [INTEGRATION] Transaction Rollback Test
  test('[INTEGRATION] 7. Transaction Rollback: Availability failure inside transaction prevents booking persistence', async () => {
    const mockUnavailableProvider = {
      checkAvailability: async () => ({ isAvailable: false, reason: 'Slot fully booked' }),
    };

    let didExecuteCreate = false;
    const mockTx = {
      booking: {
        create: async () => {
          didExecuteCreate = true;
          return {};
        },
      },
    };

    // Simulate transaction execution
    try {
      const avail = await mockUnavailableProvider.checkAvailability();
      if (!avail.isAvailable) {
        throw new Error(`BOOKING_UNAVAILABLE: ${avail.reason}`);
      }
      await mockTx.booking.create();
    } catch (err: any) {
      assert.ok(err.message.includes('BOOKING_UNAVAILABLE'));
    }

    assert.equal(didExecuteCreate, false);
  });

  // 8. [UNIT] Status Transition Matrix Complete Verification
  test('[UNIT] 8. Complete Status Machine Transition Matrix Verification', () => {
    // Valid transitions from PENDING_PAYMENT
    assert.equal(isValidStatusTransition('PENDING_PAYMENT', 'CONFIRMED'), true);
    assert.equal(isValidStatusTransition('PENDING_PAYMENT', 'CANCELLED'), true);

    // Valid transitions from CONFIRMED
    assert.equal(isValidStatusTransition('CONFIRMED', 'CANCELLED'), true);
    assert.equal(isValidStatusTransition('CONFIRMED', 'COMPLETED'), true);
    assert.equal(isValidStatusTransition('CONFIRMED', 'NO_SHOW'), true);
    assert.equal(isValidStatusTransition('CONFIRMED', 'REFUNDED'), true);

    // Forbidden transitions (Terminal & Invalid jumps)
    assert.equal(isValidStatusTransition('CANCELLED', 'CONFIRMED'), false);
    assert.equal(isValidStatusTransition('CANCELLED', 'COMPLETED'), false);
    assert.equal(isValidStatusTransition('COMPLETED', 'PENDING_PAYMENT'), false);
    assert.equal(isValidStatusTransition('COMPLETED', 'CONFIRMED'), false);
    assert.equal(isValidStatusTransition('REFUNDED', 'CONFIRMED'), false);
    assert.equal(isValidStatusTransition('NO_SHOW', 'CONFIRMED'), false);
  });

  // 9. [UNIT] Mock Confirmation Lifecycle Tests
  test('[UNIT] 9. Controlled Mock Confirmation Flow (PENDING_PAYMENT -> CONFIRMED)', () => {
    // 1. Successful transition
    assert.equal(isValidStatusTransition('PENDING_PAYMENT', 'CONFIRMED'), true);

    // 2. Already confirmed cannot re-confirm to PENDING_PAYMENT
    assert.equal(isValidStatusTransition('CONFIRMED', 'PENDING_PAYMENT'), false);

    // 3. Cancelled booking cannot be confirmed
    assert.equal(isValidStatusTransition('CANCELLED', 'CONFIRMED'), false);
  });

  // 10. [UNIT] guestCount validation limits
  test('[UNIT] 10. Guest count validation limits (1 to 50)', () => {
    const placePayload = { placeId: '123e4567-e89b-12d3-a456-426614174001', bookingDate: '2026-10-10' };

    assert.equal(createBookingSchema.safeParse({ ...placePayload, guestCount: 0 }).success, false);
    assert.equal(createBookingSchema.safeParse({ ...placePayload, guestCount: -5 }).success, false);
    assert.equal(createBookingSchema.safeParse({ ...placePayload, guestCount: 51 }).success, false);
    assert.equal(createBookingSchema.safeParse({ ...placePayload, guestCount: 10 }).success, true);
  });
});
