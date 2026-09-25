import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { db } from '../../db/prisma.js';
import { RazorpayPaymentProvider } from '../razorpay-payment.provider.js';
import {
  createPaymentIntentService,
  processPaymentEventService,
  verifyRazorpayPaymentService,
} from '../payment.service.js';

describe('Phase 11 — Razorpay Payment Provider Integration & Verification', () => {
  let testUser: any;
  let testPlace: any;
  let testBooking: any;

  const mockKeyId = 'rzp_test_mockKeyId123';
  const mockKeySecret = 'mock_secret_key_4567890abcdef';
  const mockWebhookSecret = 'webhook_secret_key_987654321';

  before(async () => {
    // 1. Seed test user & booking in database
    testUser = await db.user.create({
      data: {
        email: `rzp_test_${Date.now()}@example.com`,
        name: 'Razorpay Test Customer',
        passwordHash: 'hashed_pw',
        role: 'CUSTOMER',
      },
    });

    testPlace = await db.place.create({
      data: {
        name: 'Razorpay Test Resort',
        city: 'Mumbai',
        country: 'India',
        priceLevel: 3,
      },
    });

    testBooking = await db.booking.create({
      data: {
        userId: testUser.id,
        placeId: testPlace.id,
        bookingType: 'ACTIVITY',
        status: 'PENDING_PAYMENT',
        bookingDate: new Date('2026-10-15'),
        guestCount: 2,
        unitPrice: 49.99,
        totalAmount: 99.98,
        currency: 'USD',
      },
    });
  });

  after(async () => {
    // Clean up created records
    await db.payment.deleteMany({ where: { bookingId: testBooking.id } });
    await db.booking.delete({ where: { id: testBooking.id } });
    await db.place.delete({ where: { id: testPlace.id } });
    await db.user.delete({ where: { id: testUser.id } });
  });

  describe('1. Provider Configuration & Setup', () => {
    test('Throws CONFIGURATION_ERROR if credentials are missing', () => {
      assert.throws(
        () => new RazorpayPaymentProvider('', ''),
        (err: any) => err.message.includes('CONFIGURATION_ERROR')
      );
    });

    test('Instantiates cleanly when valid credentials are provided', () => {
      const provider = new RazorpayPaymentProvider(mockKeyId, mockKeySecret);
      assert.ok(provider);
    });
  });

  describe('2. Monetary Conversion & Order Creation', () => {
    test('Converts monetary amount to smallest unit (cents/paise) without floating point imprecision', async () => {
      const provider = new RazorpayPaymentProvider(mockKeyId, mockKeySecret);
      let capturedOrderOptions: any = null;

      // Mock razorpay orders.create internally
      (provider as any).razorpay = {
        orders: {
          create: async (opts: any) => {
            capturedOrderOptions = opts;
            return { id: 'order_test_9998', ...opts };
          },
        },
      };

      const result = await provider.createPaymentIntent({
        bookingId: testBooking.id,
        amount: 99.98,
        currency: 'USD',
        idempotencyKey: 'idemp_test_conv_1',
      });

      assert.equal(capturedOrderOptions.amount, 9998); // 99.98 * 100 = 9998
      assert.equal(capturedOrderOptions.currency, 'USD');
      assert.equal(result.providerPaymentId, 'order_test_9998');
      assert.equal(result.provider, 'RAZORPAY');
      assert.equal(result.razorpayKeyId, mockKeyId);
    });
  });

  describe('3. Server-Side Cryptographic Signature Verification', () => {
    test('Valid signature returns true', () => {
      const orderId = 'order_test_12345';
      const paymentId = 'pay_test_67890';
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', mockKeySecret)
        .update(payload)
        .digest('hex');

      const isValid = RazorpayPaymentProvider.verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
        secret: mockKeySecret,
      });

      assert.equal(isValid, true);
    });

    test('Tampered signature returns false', () => {
      const isValid = RazorpayPaymentProvider.verifyPaymentSignature({
        razorpayOrderId: 'order_test_12345',
        razorpayPaymentId: 'pay_test_67890',
        razorpaySignature: 'invalid_tampered_signature_12345',
        secret: mockKeySecret,
      });

      assert.equal(isValid, false);
    });

    test('Modified order ID returns false', () => {
      const orderId = 'order_test_12345';
      const paymentId = 'pay_test_67890';
      const validSignature = crypto
        .createHmac('sha256', mockKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = RazorpayPaymentProvider.verifyPaymentSignature({
        razorpayOrderId: 'order_tampered_999',
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
        secret: mockKeySecret,
      });

      assert.equal(isValid, false);
    });
  });

  describe('4. Server-Side Razorpay Payment Verification Service', () => {
    let razorpayOrderPayment: any;
    const razorpayOrderId = `order_test_${Date.now()}`;
    const razorpayPaymentId = `pay_test_${Date.now()}`;

    before(async () => {
      // Create a pending payment intent in DB
      razorpayOrderPayment = await db.payment.create({
        data: {
          bookingId: testBooking.id,
          amount: testBooking.totalAmount,
          currency: testBooking.currency,
          status: 'PENDING',
          provider: 'RAZORPAY',
          providerPaymentId: razorpayOrderId,
          idempotencyKey: `rzp_idemp_verify_${Date.now()}`,
        },
      });
    });

    test('Rejects invalid signature and transitions payment to FAILED', async () => {
      const fakeSignature = 'bad_sig_123';

      await assert.rejects(
        () =>
          verifyRazorpayPaymentService({
            bookingId: testBooking.id,
            userId: testUser.id,
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: fakeSignature,
          }),
        (err: any) => err.message.includes('INVALID_SIGNATURE')
      );

      // Verify payment in DB transitioned to FAILED
      const failedPayment = await db.payment.findUnique({
        where: { id: razorpayOrderPayment.id },
      });
      assert.equal(failedPayment?.status, 'FAILED');
    });

    test('Successfully verifies valid signature & confirms booking', async () => {
      // Reset payment status back to PENDING for verification test
      await db.payment.update({
        where: { id: razorpayOrderPayment.id },
        data: { status: 'PENDING', failureReason: null },
      });

      const validSignature = crypto
        .createHmac('sha256', mockKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      // Create provider mock instance
      const mockProvider = new RazorpayPaymentProvider(mockKeyId, mockKeySecret);
      (mockProvider as any).razorpay = {
        payments: {
          fetch: async () => ({
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 9998, // 99.98 * 100
            currency: 'USD',
            status: 'captured',
          }),
        },
      };

      // Set environment variable temporarily for static method verification
      process.env.RAZORPAY_KEY_SECRET = mockKeySecret;

      const verifiedResult = await verifyRazorpayPaymentService(
        {
          bookingId: testBooking.id,
          userId: testUser.id,
          razorpayOrderId: razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId,
          razorpaySignature: validSignature,
        },
        mockProvider
      );

      assert.equal(verifiedResult.status, 'SUCCEEDED');

      // Verify booking updated to CONFIRMED
      const updatedBooking = await db.booking.findUnique({
        where: { id: testBooking.id },
      });
      assert.equal(updatedBooking?.status, 'CONFIRMED');
    });
  });

  describe('5. Amount Mismatch & Security Safeguards', () => {
    test('Rejects underpayment attack where paid amount is less than booking total', async () => {
      const underpayOrderId = `order_underpay_${Date.now()}`;
      const underpayPaymentId = `pay_underpay_${Date.now()}`;

      await db.payment.create({
        data: {
          bookingId: testBooking.id,
          amount: testBooking.totalAmount,
          currency: testBooking.currency,
          status: 'PENDING',
          provider: 'RAZORPAY',
          providerPaymentId: underpayOrderId,
          idempotencyKey: `rzp_idemp_underpay_${Date.now()}`,
        },
      });

      const validSig = crypto
        .createHmac('sha256', mockKeySecret)
        .update(`${underpayOrderId}|${underpayPaymentId}`)
        .digest('hex');

      const mockProvider = new RazorpayPaymentProvider(mockKeyId, mockKeySecret);
      (mockProvider as any).razorpay = {
        payments: {
          fetch: async () => ({
            id: underpayPaymentId,
            order_id: underpayOrderId,
            amount: 100, // Attacker paid $1.00 instead of $99.98
            currency: 'USD',
            status: 'captured',
          }),
        },
      };

      await assert.rejects(
        () =>
          verifyRazorpayPaymentService(
            {
              bookingId: testBooking.id,
              userId: testUser.id,
              razorpayOrderId: underpayOrderId,
              razorpayPaymentId: underpayPaymentId,
              razorpaySignature: validSig,
            },
            mockProvider
          ),
        (err: any) => err.message.includes('AMOUNT_MISMATCH')
      );
    });

    test('Rejects payment for another user booking (IDOR)', async () => {
      const otherUser = await db.user.create({
        data: {
          email: `other_user_${Date.now()}@example.com`,
          name: 'Other User',
          passwordHash: 'pw',
        },
      });

      await assert.rejects(
        () =>
          verifyRazorpayPaymentService({
            bookingId: testBooking.id,
            userId: otherUser.id, // User B trying to access User A's booking
            razorpayOrderId: 'order_fake',
            razorpayPaymentId: 'pay_fake',
            razorpaySignature: 'sig_fake',
          }),
        (err: any) => err.message.includes('NOT_FOUND')
      );

      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('6. Razorpay Webhook Signature Verification', () => {
    test('Verifies valid HMAC webhook signature', () => {
      const rawPayload = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123' } } },
      });

      const expectedSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(rawPayload)
        .digest('hex');

      const isValid = RazorpayPaymentProvider.verifyWebhookSignature(
        rawPayload,
        expectedSignature,
        mockWebhookSecret
      );

      assert.equal(isValid, true);
    });

    test('Rejects tampered webhook signature', () => {
      const rawPayload = JSON.stringify({ event: 'payment.captured' });
      const isValid = RazorpayPaymentProvider.verifyWebhookSignature(
        rawPayload,
        'invalid_webhook_sig_999',
        mockWebhookSecret
      );

      assert.equal(isValid, false);
    });
  });
});
