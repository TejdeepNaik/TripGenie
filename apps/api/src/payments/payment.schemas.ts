import { z } from 'zod';
import type { Payment, Refund, PaymentAuditLog } from '@prisma/client';
import type { PaymentDTO, RefundDTO, AuditLogDTO } from '@tripgenie/types';

export const paymentStatusEnum = z.enum([
  'CREATED',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
]);

export const paymentProviderEnum = z.enum(['MOCK', 'STRIPE', 'RAZORPAY']);

export const createPaymentIntentSchema = z.object({
  idempotencyKey: z.string().max(100).optional(),
});

export const processPaymentEventSchema = z.object({
  eventId: z.string().max(100).optional(),
  providerPaymentId: z.string().min(1, 'providerPaymentId is required'),
  eventType: z.enum(['payment.succeeded', 'payment.failed', 'payment.cancelled']),
  failureReason: z.string().max(500).optional(),
});

export const verifyRazorpayPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid bookingId'),
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
});

export const createRefundSchema = z.object({
  paymentId: z.string().uuid('Invalid paymentId').optional(),
  amount: z.number().positive('Refund amount must be positive').optional(),
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type ProcessPaymentEventInput = z.infer<typeof processPaymentEventSchema>;
export type VerifyRazorpayPaymentInputSchema = z.infer<typeof verifyRazorpayPaymentSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;

export function mapPaymentToDTO(payment: Payment): PaymentDTO {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status as any,
    provider: payment.provider as any,
    providerPaymentId: payment.providerPaymentId,
    idempotencyKey: payment.idempotencyKey,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export function mapRefundToDTO(refund: Refund): RefundDTO {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    bookingId: refund.bookingId,
    amount: Number(refund.amount),
    currency: refund.currency,
    status: refund.status as any,
    provider: refund.provider as any,
    providerRefundId: refund.providerRefundId,
    idempotencyKey: refund.idempotencyKey,
    reason: refund.reason,
    failureReason: refund.failureReason,
    createdAt: refund.createdAt.toISOString(),
    updatedAt: refund.updatedAt.toISOString(),
  };
}

export function mapAuditLogToDTO(log: PaymentAuditLog): AuditLogDTO {
  return {
    id: log.id,
    provider: log.provider as any,
    providerEventId: log.providerEventId,
    eventType: log.eventType,
    paymentId: log.paymentId,
    refundId: log.refundId,
    bookingId: log.bookingId,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
  };
}
