import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';
import {
  PaymentProvider,
  CreatePaymentIntentProviderInput,
  PaymentIntentResult,
  ProviderEventInput,
  ProviderEventResult,
  CreateRefundProviderInput,
  RefundProviderResult,
  ProviderRefundEventInput,
  ProviderRefundEventResult,
} from './payment-provider.interface.js';

export class RazorpayPaymentProvider implements PaymentProvider {
  private razorpay: Razorpay;
  public keyId: string;
  public keySecret: string;

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || env.RAZORPAY_KEY_SECRET || '';

    if (!this.keyId || !this.keySecret) {
      throw new Error(
        'CONFIGURATION_ERROR: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for Razorpay payment provider.'
      );
    }

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  /**
   * Creates a Razorpay Order server-side.
   * Converts monetary amount to smallest currency unit (paise for INR / cents for USD).
   */
  async createPaymentIntent(
    input: CreatePaymentIntentProviderInput
  ): Promise<PaymentIntentResult> {
    const amountInSmallestUnit = Math.round(Number(input.amount.toFixed(2)) * 100);

    if (amountInSmallestUnit <= 0) {
      throw new Error('INVALID_AMOUNT: Payment amount must be greater than zero.');
    }

    const safeReceipt = `bkg_${input.bookingId.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30)}`;

    const orderOptions = {
      amount: amountInSmallestUnit,
      currency: input.currency.toUpperCase(),
      receipt: safeReceipt,
      notes: {
        bookingId: input.bookingId,
        idempotencyKey: input.idempotencyKey,
      },
    };

    const order = await this.razorpay.orders.create(orderOptions);

    return {
      providerPaymentId: order.id,
      provider: 'RAZORPAY',
      status: 'PENDING',
      clientSecret: order.id,
      razorpayKeyId: this.keyId,
    };
  }

  /**
   * Process a payment provider event payload
   */
  async processEvent(input: ProviderEventInput): Promise<ProviderEventResult> {
    let targetStatus: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' = 'SUCCEEDED';
    if (input.eventType === 'payment.failed') targetStatus = 'FAILED';
    if (input.eventType === 'payment.cancelled') targetStatus = 'CANCELLED';

    return {
      eventId: input.eventId || `rzp_evt_${Date.now()}`,
      providerPaymentId: input.providerPaymentId,
      eventType: input.eventType,
      status: targetStatus,
      failureReason:
        input.failureReason || (targetStatus === 'FAILED' ? 'Razorpay payment failed' : undefined),
    };
  }

  /**
   * Creates a refund for a captured Razorpay payment
   */
  async createRefund(input: CreateRefundProviderInput): Promise<RefundProviderResult> {
    const amountInSmallestUnit = Math.round(Number(input.amount.toFixed(2)) * 100);

    try {
      const refund = await this.razorpay.payments.refund(input.providerPaymentId, {
        amount: amountInSmallestUnit,
        notes: {
          paymentId: input.paymentId,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason || 'Customer cancellation',
        },
      });

      return {
        providerRefundId: refund.id,
        provider: 'RAZORPAY',
        status: 'SUCCEEDED',
      };
    } catch (err: any) {
      return {
        providerRefundId: `rzp_rfnd_err_${Date.now()}`,
        provider: 'RAZORPAY',
        status: 'FAILED',
        failureReason: err?.message || 'Razorpay refund creation failed',
      };
    }
  }

  /**
   * Process a refund provider event payload
   */
  async processRefundEvent(input: ProviderRefundEventInput): Promise<ProviderRefundEventResult> {
    const targetStatus = input.eventType === 'refund.failed' ? 'FAILED' : 'SUCCEEDED';
    return {
      eventId: input.eventId || `rzp_rfnd_evt_${Date.now()}`,
      providerRefundId: input.providerRefundId,
      eventType: input.eventType,
      status: targetStatus,
      failureReason: input.failureReason,
    };
  }

  /**
   * Fetch payment status for reconciliation
   */
  async fetchPaymentStatus(providerPaymentId: string): Promise<{ status: string; amount?: number; currency?: string }> {
    try {
      const payment = await this.razorpay.payments.fetch(providerPaymentId);
      let mappedStatus = 'PENDING';
      if (payment.status === 'captured') mappedStatus = 'SUCCEEDED';
      if (payment.status === 'failed') mappedStatus = 'FAILED';
      if (payment.status === 'authorized') mappedStatus = 'PENDING';

      return {
        status: mappedStatus,
        amount: payment.amount ? Number(payment.amount) / 100 : undefined,
        currency: payment.currency,
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
      };
    }
  }

  /**
   * Verifies Razorpay Checkout HMAC-SHA256 signature server-side.
   */
  static verifyPaymentSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    secret?: string;
  }): boolean {
    const secret = params.secret || env.RAZORPAY_KEY_SECRET;
    if (!secret || !params.razorpayOrderId || !params.razorpayPaymentId || !params.razorpaySignature) {
      return false;
    }

    const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(params.razorpaySignature, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Verifies Razorpay Webhook HMAC-SHA256 signature using raw request body buffer/string.
   */
  static verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret?: string
  ): boolean {
    const webhookSecret = secret || env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret || !signature || !rawBody) return false;

    try {
      return Razorpay.validateWebhookSignature(
        typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'),
        signature,
        webhookSecret
      );
    } catch {
      return false;
    }
  }

  /**
   * Fetches payment details directly from Razorpay API.
   */
  async fetchPayment(paymentId: string) {
    return this.razorpay.payments.fetch(paymentId);
  }
}
