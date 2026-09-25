import type { PaymentProviderType } from '@tripgenie/types';

export interface CreatePaymentIntentProviderInput {
  bookingId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface PaymentIntentResult {
  providerPaymentId: string;
  provider: PaymentProviderType;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  clientSecret?: string;
  razorpayKeyId?: string;
}

export interface ProviderEventInput {
  eventId?: string;
  providerPaymentId: string;
  eventType: 'payment.succeeded' | 'payment.failed' | 'payment.cancelled';
  failureReason?: string;
}

export interface ProviderEventResult {
  eventId: string;
  providerPaymentId: string;
  eventType: string;
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  failureReason?: string;
}

export interface CreateRefundProviderInput {
  paymentId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  reason?: string;
}

export interface RefundProviderResult {
  providerRefundId: string;
  provider: PaymentProviderType;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  failureReason?: string;
}

export interface ProviderRefundEventInput {
  eventId?: string;
  providerRefundId: string;
  eventType: 'refund.processed' | 'refund.failed';
  failureReason?: string;
}

export interface ProviderRefundEventResult {
  eventId: string;
  providerRefundId: string;
  eventType: string;
  status: 'SUCCEEDED' | 'FAILED';
  failureReason?: string;
}

export interface PaymentProvider {
  createPaymentIntent(input: CreatePaymentIntentProviderInput): Promise<PaymentIntentResult>;
  processEvent(input: ProviderEventInput): Promise<ProviderEventResult>;
  createRefund(input: CreateRefundProviderInput): Promise<RefundProviderResult>;
  processRefundEvent(input: ProviderRefundEventInput): Promise<ProviderRefundEventResult>;
  fetchPaymentStatus?(providerPaymentId: string): Promise<{ status: string; amount?: number; currency?: string }>;
}
