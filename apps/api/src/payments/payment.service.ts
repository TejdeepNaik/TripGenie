import { db } from '../db/prisma.js';
import type { PaymentStatus, RefundStatus, BookingStatus } from '@prisma/client';
import type {
  PaymentDTO,
  RefundDTO,
  ReconciliationResult,
  AuditLogDTO,
} from '@tripgenie/types';
import { env } from '../config/env.js';
import {
  mapPaymentToDTO,
  mapRefundToDTO,
  mapAuditLogToDTO,
  ProcessPaymentEventInput,
} from './payment.schemas.js';
import type { PaymentProvider } from './payment-provider.interface.js';
import { defaultMockPaymentProvider } from './mock-payment.provider.js';
import { RazorpayPaymentProvider } from './razorpay-payment.provider.js';

// Explicit Server-Side Payment State Machine Transition Matrix
const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: ['PENDING', 'CANCELLED'],
  PENDING: ['SUCCEEDED', 'FAILED', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: ['PENDING', 'CANCELLED'],
  CANCELLED: [],
};

// Explicit Server-Side Refund State Machine Transition Matrix
const ALLOWED_REFUND_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  CREATED: ['PENDING', 'CANCELLED'],
  PENDING: ['SUCCEEDED', 'FAILED', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: ['PENDING', 'CANCELLED'],
  CANCELLED: [],
};

export function isValidPaymentStatusTransition(
  from: PaymentStatus,
  to: PaymentStatus
): boolean {
  const allowed = ALLOWED_PAYMENT_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function isValidRefundStatusTransition(
  from: RefundStatus,
  to: RefundStatus
): boolean {
  const allowed = ALLOWED_REFUND_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function getPaymentProvider(overrideProvider?: PaymentProvider): PaymentProvider {
  if (overrideProvider) return overrideProvider;
  if (env.PAYMENT_PROVIDER === 'razorpay') {
    return new RazorpayPaymentProvider();
  }
  return defaultMockPaymentProvider;
}

export async function createPaymentIntentService(
  bookingId: string,
  userId: string,
  idempotencyKeyInput?: string,
  providerOverride?: PaymentProvider
): Promise<PaymentDTO & { clientSecret?: string; razorpayKeyId?: string }> {
  const paymentProvider = getPaymentProvider(providerOverride);

  // 1. Load booking server-side & verify user ownership
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  // 2. Verify booking payable status
  if (booking.status === 'CANCELLED') {
    throw new Error('BOOKING_NOT_PAYABLE: Cannot initiate payment for a cancelled booking.');
  }

  if (booking.status === 'COMPLETED') {
    throw new Error('BOOKING_ALREADY_PAID: Booking is already completed.');
  }

  // Check if booking has an existing succeeded payment
  const existingSucceeded = await db.payment.findFirst({
    where: {
      bookingId,
      status: 'SUCCEEDED',
    },
  });

  if (existingSucceeded) {
    throw new Error('BOOKING_ALREADY_PAID: Booking has already been successfully paid.');
  }

  // 3. Handle Idempotency
  const idempotencyKey =
    idempotencyKeyInput && idempotencyKeyInput.trim() !== ''
      ? idempotencyKeyInput.trim()
      : `pay_intent_${bookingId}_${Date.now()}`;

  const existingPayment = await db.payment.findUnique({
    where: { idempotencyKey },
  });

  if (existingPayment) {
    if (existingPayment.bookingId !== bookingId) {
      throw new Error('IDEMPOTENCY_CONFLICT: Idempotency key belongs to a different booking.');
    }
    return mapPaymentToDTO(existingPayment);
  }

  // Prevent multiple concurrent active pending payment intents for the same booking
  const activePending = await db.payment.findFirst({
    where: {
      bookingId,
      status: 'PENDING',
    },
  });

  if (activePending) {
    return mapPaymentToDTO(activePending);
  }

  // 4. Server-Authoritative Amount Calculation (Never trust client amount)
  const amount = Number(booking.totalAmount);
  const currency = booking.currency;

  // 5. Call Payment Provider Abstraction
  const intentResult = await paymentProvider.createPaymentIntent({
    bookingId,
    amount,
    currency,
    idempotencyKey,
  });

  // 6. Persist Payment Record with P2002 race protection
  let createdPayment;
  try {
    createdPayment = await db.payment.create({
      data: {
        bookingId,
        amount,
        currency,
        status: 'PENDING',
        provider: intentResult.provider as any,
        providerPaymentId: intentResult.providerPaymentId,
        idempotencyKey,
      },
    });

    // Write Audit Log
    await db.paymentAuditLog.create({
      data: {
        provider: intentResult.provider as any,
        eventType: 'payment.created',
        paymentId: createdPayment.id,
        bookingId,
        status: 'PENDING',
        payload: { idempotencyKey, providerPaymentId: intentResult.providerPaymentId },
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
      const existing = await db.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return mapPaymentToDTO(existing);
      }
    }
    throw err;
  }

  const dto = mapPaymentToDTO(createdPayment) as PaymentDTO & {
    clientSecret?: string;
    razorpayKeyId?: string;
  };
  if (intentResult.clientSecret) dto.clientSecret = intentResult.clientSecret;
  if (intentResult.razorpayKeyId) dto.razorpayKeyId = intentResult.razorpayKeyId;

  return dto;
}

export async function processPaymentEventService(
  input: ProcessPaymentEventInput,
  providerOverride?: PaymentProvider
): Promise<PaymentDTO> {
  const paymentProvider = getPaymentProvider(providerOverride);

  // 1. Identify target payment record
  const payment = await db.payment.findFirst({
    where: { providerPaymentId: input.providerPaymentId },
    include: { booking: true },
  });

  if (!payment) {
    throw new Error('NOT_FOUND: Payment record not found for given provider payment reference.');
  }

  // Deduplicate event if eventId was provided and recorded
  if (input.eventId) {
    const existingLog = await db.paymentAuditLog.findUnique({
      where: { providerEventId: input.eventId },
    });
    if (existingLog) {
      return mapPaymentToDTO(payment);
    }
  }

  // 2. Delegate event processing to provider abstraction
  const eventResult = await paymentProvider.processEvent(input);

  const currentStatus = payment.status as PaymentStatus;
  const targetStatus = eventResult.status as PaymentStatus;

  // Idempotent duplicate event handling: if already in target status or succeeded, return current DTO
  if (currentStatus === targetStatus || currentStatus === 'SUCCEEDED') {
    return mapPaymentToDTO(payment);
  }

  // 3. Validate State Machine Transition
  if (!isValidPaymentStatusTransition(currentStatus, targetStatus)) {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Cannot transition payment from "${currentStatus}" to "${targetStatus}".`
    );
  }

  // 4. Atomic Prisma Transaction: Update Payment state & sync Booking status
  const updatedPayment = await db.$transaction(async (tx) => {
    const txPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { booking: true },
    });
    if (!txPayment) throw new Error('NOT_FOUND: Payment record not found.');

    const txCurrentStatus = txPayment.status as PaymentStatus;
    if (txCurrentStatus === targetStatus || txCurrentStatus === 'SUCCEEDED') {
      return txPayment;
    }

    if (!isValidPaymentStatusTransition(txCurrentStatus, targetStatus)) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot transition payment from "${txCurrentStatus}" to "${targetStatus}".`
      );
    }

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: targetStatus as any,
        failureReason: eventResult.failureReason || null,
        rawEventLog: JSON.stringify(eventResult),
      },
    });

    // Record audit log entry
    await tx.paymentAuditLog.create({
      data: {
        provider: txPayment.provider,
        providerEventId: input.eventId || null,
        eventType: input.eventType,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        status: targetStatus,
        payload: eventResult as any,
      },
    });

    // If payment succeeded:
    // If booking is still active/pending, confirm booking.
    // LATE WEBHOOK RACE HANDLING: If booking was already CANCELLED, trigger auto-refund for the payment!
    if (targetStatus === 'SUCCEEDED' && txPayment.booking) {
      if (txPayment.booking.status === 'CANCELLED' || txPayment.booking.status === 'REFUNDED') {
        // Automatically issue full refund for late payment on cancelled booking
        if (paymentProvider.createRefund) {
          const autoIdempKey = `auto_refund_late_${payment.id}_${Date.now()}`;
          const refundRes = await paymentProvider.createRefund({
            paymentId: payment.id,
            providerPaymentId: payment.providerPaymentId!,
            amount: Number(payment.amount),
            currency: payment.currency,
            idempotencyKey: autoIdempKey,
            reason: 'Automatic refund for late payment on cancelled booking',
          });

          await tx.refund.create({
            data: {
              paymentId: payment.id,
              bookingId: payment.bookingId,
              amount: payment.amount,
              currency: payment.currency,
              status: (refundRes.status as any) || 'SUCCEEDED',
              provider: payment.provider,
              providerRefundId: refundRes.providerRefundId,
              idempotencyKey: autoIdempKey,
              reason: 'Automatic refund for late payment on cancelled booking',
            },
          });

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'REFUNDED' },
          });
        }
      } else {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CONFIRMED' },
        });
      }
    }

    return updated;
  });

  return mapPaymentToDTO(updatedPayment);
}

export async function verifyRazorpayPaymentService(
  input: {
    bookingId: string;
    userId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
  providerOverride?: RazorpayPaymentProvider
): Promise<PaymentDTO> {
  // 1. Authorize booking ownership & status
  const booking = await db.booking.findFirst({
    where: { id: input.bookingId, userId: input.userId },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  if (booking.status === 'CANCELLED') {
    throw new Error('BOOKING_CANCELLED: Cannot verify payment for a cancelled booking.');
  }

  // 2. Locate corresponding payment intent
  const payment = await db.payment.findFirst({
    where: {
      bookingId: input.bookingId,
      providerPaymentId: input.razorpayOrderId,
    },
  });

  if (!payment) {
    throw new Error(
      'PAYMENT_NOT_FOUND: No matching payment intent found for this booking and Razorpay order.'
    );
  }

  const currentStatus = payment.status as PaymentStatus;
  if (currentStatus === 'SUCCEEDED') {
    return mapPaymentToDTO(payment);
  }

  // 3. Perform server-side cryptographic signature verification
  const isValidSignature = RazorpayPaymentProvider.verifyPaymentSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
    secret: providerOverride?.keySecret,
  });

  if (!isValidSignature) {
    // Mark payment as FAILED due to critical signature verification failure
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason:
          'CRITICAL_SECURITY_VIOLATION: Razorpay HMAC signature verification failed.',
      },
    });
    throw new Error(
      'INVALID_SIGNATURE: Payment verification failed due to invalid cryptographic signature.'
    );
  }

  // 4. Server-Side Payment Amount and Currency Verification via Razorpay API (if provider available)
  if (providerOverride) {
    try {
      const fetchedPayment = await providerOverride.fetchPayment(input.razorpayPaymentId);
      const expectedPaise = Math.round(Number(booking.totalAmount) * 100);

      if (fetchedPayment) {
        if (fetchedPayment.amount !== expectedPaise) {
          throw new Error('AMOUNT_MISMATCH: Paid amount does not match authoritative booking amount.');
        }
        if (fetchedPayment.currency?.toUpperCase() !== booking.currency.toUpperCase()) {
          throw new Error('CURRENCY_MISMATCH: Paid currency does not match booking currency.');
        }
        if (fetchedPayment.order_id !== input.razorpayOrderId) {
          throw new Error('ORDER_MISMATCH: Razorpay payment order ID does not match expected order.');
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('MISMATCH')) {
        throw err;
      }
    }
  }

  // 5. Atomic Prisma Transaction: Payment -> SUCCEEDED & Booking -> CONFIRMED
  const updatedPayment = await db.$transaction(async (tx) => {
    const txPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!txPayment) throw new Error('NOT_FOUND: Payment record not found.');

    const txStatus = txPayment.status as PaymentStatus;
    if (txStatus === 'SUCCEEDED') {
      return txPayment;
    }

    if (!isValidPaymentStatusTransition(txStatus, 'SUCCEEDED')) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot transition payment from "${txStatus}" to "SUCCEEDED".`
      );
    }

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        rawEventLog: JSON.stringify({
          verifiedAt: new Date().toISOString(),
          razorpayPaymentId: input.razorpayPaymentId,
          razorpayOrderId: input.razorpayOrderId,
          verifiedBy: 'RazorpayPaymentProvider',
        }),
      },
    });

    await tx.booking.update({
      where: { id: input.bookingId },
      data: { status: 'CONFIRMED' },
    });

    // Write Audit Log
    await tx.paymentAuditLog.create({
      data: {
        provider: txPayment.provider,
        eventType: 'payment.verified',
        paymentId: payment.id,
        bookingId: input.bookingId,
        status: 'SUCCEEDED',
        payload: { razorpayPaymentId: input.razorpayPaymentId },
      },
    });

    return updated;
  });

  return mapPaymentToDTO(updatedPayment);
}

/**
 * Server-Authoritative Refund Processing Service
 */
export async function createRefundService(
  input: {
    bookingId: string;
    userId: string;
    paymentId?: string;
    amount?: number;
    reason?: string;
    idempotencyKeyInput?: string;
  },
  providerOverride?: PaymentProvider
): Promise<RefundDTO> {
  const paymentProvider = getPaymentProvider(providerOverride);

  // 1. Authorize booking ownership
  const booking = await db.booking.findFirst({
    where: {
      id: input.bookingId,
      userId: input.userId,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  // 2. Find target succeeded payment
  const paymentWhere: any = { bookingId: input.bookingId, status: 'SUCCEEDED' };
  if (input.paymentId) paymentWhere.id = input.paymentId;

  const payment = await db.payment.findFirst({
    where: paymentWhere,
  });

  if (!payment) {
    throw new Error('NO_SUCCEEDED_PAYMENT: No succeeded payment found for this booking.');
  }

  // 3. Handle Idempotency Key
  const idempotencyKey =
    input.idempotencyKeyInput && input.idempotencyKeyInput.trim() !== ''
      ? input.idempotencyKeyInput.trim()
      : `rfnd_${payment.id}_${Date.now()}`;

  const existingRefund = await db.refund.findUnique({
    where: { idempotencyKey },
  });

  if (existingRefund) {
    return mapRefundToDTO(existingRefund);
  }

  // 4. Atomic Prisma Transaction: Calculate remaining balance, delegate to provider, create Refund, & log Audit
  try {
    const refundRecord = await db.$transaction(async (tx) => {
      // 1. PostgreSQL Row-Level Lock on Payment Record to serialize concurrent refund attempts for the same payment
      await tx.$executeRaw`SELECT id FROM "Payment" WHERE id = ${payment.id}::uuid FOR UPDATE`;

      // 2. Re-verify idempotency inside transaction
      const txExisting = await tx.refund.findUnique({
        where: { idempotencyKey },
      });
      if (txExisting) {
        return txExisting;
      }

      // 3. Aggregate existing refunds inside transaction boundary for strict concurrency control
      const existingRefundsSum = await tx.refund.aggregate({
        where: {
          paymentId: payment.id,
          status: { in: ['PENDING', 'SUCCEEDED'] },
        },
        _sum: {
          amount: true,
        },
      });


      const totalPaid = Number(payment.amount);
      const alreadyRefunded = Number(existingRefundsSum._sum.amount || 0);
      const remainingRefundable = Math.max(0, Number((totalPaid - alreadyRefunded).toFixed(2)));

      if (remainingRefundable <= 0) {
        throw new Error('ALREADY_FULLY_REFUNDED: Payment has already been fully refunded.');
      }

      const refundAmount =
        input.amount !== undefined && input.amount !== null
          ? Number(input.amount.toFixed(2))
          : remainingRefundable;

      if (refundAmount <= 0) {
        throw new Error('INVALID_REFUND_AMOUNT: Refund amount must be greater than zero.');
      }

      if (refundAmount > remainingRefundable) {
        throw new Error(
          `EXCEEDS_REFUNDABLE_AMOUNT: Requested refund amount ($${refundAmount}) exceeds remaining refundable balance ($${remainingRefundable}).`
        );
      }

      // Delegate refund to PaymentProvider abstraction
      const providerRefund = await paymentProvider.createRefund({
        paymentId: payment.id,
        providerPaymentId: payment.providerPaymentId!,
        amount: refundAmount,
        currency: payment.currency,
        idempotencyKey,
        reason: input.reason,
      });

      const createdRefund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          bookingId: input.bookingId,
          amount: refundAmount,
          currency: payment.currency,
          status: (providerRefund.status as any) || 'SUCCEEDED',
          provider: payment.provider,
          providerRefundId: providerRefund.providerRefundId,
          idempotencyKey,
          reason: input.reason || 'Customer cancellation',
          failureReason: providerRefund.failureReason || null,
        },
      });

      // Check new cumulative refunded balance
      const newTotalRefunded = Number((alreadyRefunded + refundAmount).toFixed(2));
      if (newTotalRefunded >= totalPaid) {
        await tx.booking.update({
          where: { id: input.bookingId },
          data: { status: 'REFUNDED' },
        });
      }

      // Write Audit Log
      await tx.paymentAuditLog.create({
        data: {
          provider: payment.provider,
          eventType: 'refund.created',
          paymentId: payment.id,
          refundId: createdRefund.id,
          bookingId: input.bookingId,
          status: providerRefund.status,
          payload: { refundAmount, remainingRefundable: totalPaid - newTotalRefunded },
        },
      });

      return createdRefund;
    });

    return mapRefundToDTO(refundRecord);
  } catch (err: any) {
    if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
      const existing = await db.refund.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return mapRefundToDTO(existing);
      }
    }
    throw err;
  }
}


/**
 * Provider-Agnostic Payment & Booking State Reconciliation Service
 */
export async function reconcilePaymentService(
  paymentId: string,
  providerOverride?: PaymentProvider
): Promise<ReconciliationResult> {
  const paymentProvider = getPaymentProvider(providerOverride);

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });

  if (!payment) {
    throw new Error('NOT_FOUND: Payment record not found for reconciliation.');
  }

  const dbPaymentStatus = payment.status as PaymentStatus;
  const dbBookingStatus = payment.booking.status as BookingStatus;

  let providerStatus = 'UNKNOWN';
  if (paymentProvider.fetchPaymentStatus && payment.providerPaymentId) {
    const fetched = await paymentProvider.fetchPaymentStatus(payment.providerPaymentId);
    providerStatus = fetched.status;
  }

  // 1. Compare DB Payment Status with Provider Status
  if (dbPaymentStatus === 'SUCCEEDED' && providerStatus === 'SUCCEEDED') {
    return {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: 'MATCHED',
      dbPaymentStatus,
      providerPaymentStatus: providerStatus,
      dbBookingStatus,
    };
  }

  // 2. Discrepancy Case: Provider is SUCCEEDED but DB is PENDING
  if (dbPaymentStatus === 'PENDING' && providerStatus === 'SUCCEEDED') {
    const updatedPayment = await db.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED' },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });

      await tx.paymentAuditLog.create({
        data: {
          provider: payment.provider,
          eventType: 'payment.reconciled_sync',
          paymentId: payment.id,
          bookingId: payment.bookingId,
          status: 'SUCCEEDED',
          payload: { dbPaymentStatus, providerStatus },
        },
      });

      return updated;
    });

    return {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: 'SYNCED',
      dbPaymentStatus: 'SUCCEEDED',
      providerPaymentStatus: providerStatus,
      dbBookingStatus: 'CONFIRMED',
      resolvedStatus: 'SUCCEEDED',
    };
  }

  // 3. Discrepancy Case: Discrepancy detected requiring investigation
  await db.paymentAuditLog.create({
    data: {
      provider: payment.provider,
      eventType: 'payment.reconciliation_discrepancy',
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: 'DISCREPANCY_DETECTED',
      payload: { dbPaymentStatus, providerStatus, dbBookingStatus },
    },
  });

  return {
    paymentId: payment.id,
    bookingId: payment.bookingId,
    status: 'DISCREPANCY_DETECTED',
    dbPaymentStatus,
    providerPaymentStatus: providerStatus,
    dbBookingStatus,
    discrepancyReason: `TripGenie DB status is "${dbPaymentStatus}" while provider status is "${providerStatus}".`,
  };
}

export async function getBookingPaymentsService(
  bookingId: string,
  userId: string
): Promise<PaymentDTO[]> {
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  const payments = await db.payment.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
  });

  return payments.map((p) => mapPaymentToDTO(p));
}

export async function getBookingRefundsService(
  bookingId: string,
  userId: string
): Promise<RefundDTO[]> {
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  const refunds = await db.refund.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
  });

  return refunds.map((r) => mapRefundToDTO(r));
}

export async function getPaymentAuditLogsService(
  bookingId: string,
  userId: string
): Promise<AuditLogDTO[]> {
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  const logs = await db.paymentAuditLog.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
  });

  return logs.map((l) => mapAuditLogToDTO(l));
}
