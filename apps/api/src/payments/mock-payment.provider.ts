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

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentIntent(
    input: CreatePaymentIntentProviderInput
  ): Promise<PaymentIntentResult> {
    const safeKey = input.idempotencyKey.replace(/[^a-zA-Z0-9_]/g, '_');
    const mockProviderId = `mock_pay_${safeKey}`;

    return {
      providerPaymentId: mockProviderId,
      provider: 'MOCK',
      status: 'PENDING',
      clientSecret: `mock_secret_${mockProviderId}`,
    };
  }

  async processEvent(input: ProviderEventInput): Promise<ProviderEventResult> {
    let targetStatus: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' = 'SUCCEEDED';
    if (input.eventType === 'payment.failed') targetStatus = 'FAILED';
    if (input.eventType === 'payment.cancelled') targetStatus = 'CANCELLED';

    return {
      eventId: input.eventId || `event_${Date.now()}`,
      providerPaymentId: input.providerPaymentId,
      eventType: input.eventType,
      status: targetStatus,
      failureReason:
        input.failureReason || (targetStatus === 'FAILED' ? 'Mock payment failure' : undefined),
    };
  }

  async createRefund(input: CreateRefundProviderInput): Promise<RefundProviderResult> {
    const safeKey = input.idempotencyKey.replace(/[^a-zA-Z0-9_]/g, '_');
    const mockRefundId = `mock_rfnd_${safeKey}`;

    return {
      providerRefundId: mockRefundId,
      provider: 'MOCK',
      status: 'SUCCEEDED',
    };
  }

  async processRefundEvent(input: ProviderRefundEventInput): Promise<ProviderRefundEventResult> {
    const targetStatus = input.eventType === 'refund.failed' ? 'FAILED' : 'SUCCEEDED';
    return {
      eventId: input.eventId || `rfnd_evt_${Date.now()}`,
      providerRefundId: input.providerRefundId,
      eventType: input.eventType,
      status: targetStatus,
      failureReason: input.failureReason,
    };
  }

  async fetchPaymentStatus(providerPaymentId: string): Promise<{ status: string; amount?: number; currency?: string }> {
    return {
      status: 'SUCCEEDED',
    };
  }
}

export const defaultMockPaymentProvider = new MockPaymentProvider();
