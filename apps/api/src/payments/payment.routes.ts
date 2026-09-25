import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import {
  createPaymentIntentSchema,
  processPaymentEventSchema,
  verifyRazorpayPaymentSchema,
  createRefundSchema,
} from './payment.schemas.js';
import {
  createPaymentIntentService,
  processPaymentEventService,
  verifyRazorpayPaymentService,
  createRefundService,
  reconcilePaymentService,
  getBookingPaymentsService,
  getBookingRefundsService,
  getPaymentAuditLogsService,
} from './payment.service.js';
import { RazorpayPaymentProvider } from './razorpay-payment.provider.js';

export async function paymentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Capture raw body stream for webhook HMAC signature verification
  fastify.addHook('preParsing', async (request, _reply, payload) => {
    if (request.url.startsWith('/payments/webhooks/razorpay')) {
      const chunks: Buffer[] = [];
      for await (const chunk of payload) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBuffer = Buffer.concat(chunks);
      (request as any).rawBody = rawBuffer;

      const { Readable } = await import('stream');
      return Readable.from(rawBuffer);
    }
    return payload;
  });

  /**
   * POST /bookings/:bookingId/payments - Create payment intent for a booking
   */
  fastify.post<{ Params: { bookingId: string } }>(
    '/bookings/:bookingId/payments',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { bookingId } = request.params;
      const userId = request.user!.id;

      const parseResult = createPaymentIntentSchema.safeParse(request.body || {});
      if (!parseResult.success) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payment parameters',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      try {
        const payment = await createPaymentIntentService(
          bookingId,
          userId,
          parseResult.data.idempotencyKey
        );
        reply.status(201).send({
          success: true,
          data: payment,
        });
      } catch (err: any) {
        const msg = err?.message || '';

        if (msg.includes('NOT_FOUND')) {
          reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: msg.replace('NOT_FOUND:', '').trim(),
            },
          });
          return;
        }

        if (msg.includes('BOOKING_NOT_PAYABLE')) {
          reply.status(400).send({
            success: false,
            error: {
              code: 'BOOKING_NOT_PAYABLE',
              message: msg.replace('BOOKING_NOT_PAYABLE:', '').trim(),
            },
          });
          return;
        }

        if (msg.includes('BOOKING_ALREADY_PAID')) {
          reply.status(400).send({
            success: false,
            error: {
              code: 'BOOKING_ALREADY_PAID',
              message: msg.replace('BOOKING_ALREADY_PAID:', '').trim(),
            },
          });
          return;
        }

        if (msg.includes('IDEMPOTENCY_CONFLICT')) {
          reply.status(409).send({
            success: false,
            error: {
              code: 'IDEMPOTENCY_CONFLICT',
              message: msg.replace('IDEMPOTENCY_CONFLICT:', '').trim(),
            },
          });
          return;
        }

        console.error('Create payment intent error:', err);
        reply.status(500).send({
          success: false,
          error: {
            code: 'PAYMENT_CREATION_FAILED',
            message: 'Failed to initiate payment intent.',
          },
        });
      }
    }
  );

  /**
   * GET /bookings/:bookingId/payments - Retrieve payment history for a booking
   */
  fastify.get<{ Params: { bookingId: string } }>(
    '/bookings/:bookingId/payments',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { bookingId } = request.params;
      const userId = request.user!.id;

      try {
        const payments = await getBookingPaymentsService(bookingId, userId);
        reply.send({
          success: true,
          data: payments,
        });
      } catch (err: any) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found or access denied.',
          },
        });
      }
    }
  );

  /**
   * POST /bookings/:bookingId/refunds - Request a refund for a booking payment
   */
  fastify.post<{ Params: { bookingId: string } }>(
    '/bookings/:bookingId/refunds',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { bookingId } = request.params;
      const userId = request.user!.id;

      const parseResult = createRefundSchema.safeParse(request.body || {});
      if (!parseResult.success) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid refund parameters',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      try {
        const refund = await createRefundService({
          bookingId,
          userId,
          paymentId: parseResult.data.paymentId,
          amount: parseResult.data.amount,
          reason: parseResult.data.reason,
          idempotencyKeyInput: parseResult.data.idempotencyKey,
        });

        reply.status(201).send({
          success: true,
          data: refund,
        });
      } catch (err: any) {
        const msg = err?.message || '';

        if (msg.includes('NOT_FOUND')) {
          reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: msg.replace('NOT_FOUND:', '').trim(),
            },
          });
          return;
        }

        if (
          msg.includes('NO_SUCCEEDED_PAYMENT') ||
          msg.includes('ALREADY_FULLY_REFUNDED') ||
          msg.includes('INVALID_REFUND_AMOUNT') ||
          msg.includes('EXCEEDS_REFUNDABLE_AMOUNT')
        ) {
          reply.status(400).send({
            success: false,
            error: {
              code: msg.split(':')[0].trim(),
              message: msg.split(':').slice(1).join(':').trim(),
            },
          });
          return;
        }

        console.error('Create refund error:', err);
        reply.status(500).send({
          success: false,
          error: {
            code: 'REFUND_CREATION_FAILED',
            message: 'Failed to initiate refund.',
          },
        });
      }
    }
  );

  /**
   * GET /bookings/:bookingId/refunds - Retrieve refund history for a booking
   */
  fastify.get<{ Params: { bookingId: string } }>(
    '/bookings/:bookingId/refunds',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { bookingId } = request.params;
      const userId = request.user!.id;

      try {
        const refunds = await getBookingRefundsService(bookingId, userId);
        reply.send({
          success: true,
          data: refunds,
        });
      } catch (err: any) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found or access denied.',
          },
        });
      }
    }
  );

  /**
   * GET /bookings/:bookingId/audit-logs - Retrieve audit log trail for a booking
   */
  fastify.get<{ Params: { bookingId: string } }>(
    '/bookings/:bookingId/audit-logs',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { bookingId } = request.params;
      const userId = request.user!.id;

      try {
        const logs = await getPaymentAuditLogsService(bookingId, userId);
        reply.send({
          success: true,
          data: logs,
        });
      } catch (err: any) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found or access denied.',
          },
        });
      }
    }
  );

  /**
   * POST /payments/:paymentId/reconcile - Provider-agnostic payment state reconciliation
   */
  fastify.post<{ Params: { paymentId: string } }>(
    '/payments/:paymentId/reconcile',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { paymentId } = request.params;

      try {
        const result = await reconcilePaymentService(paymentId);
        reply.send({
          success: true,
          data: result,
        });
      } catch (err: any) {
        const msg = err?.message || '';

        if (msg.includes('NOT_FOUND')) {
          reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: msg.replace('NOT_FOUND:', '').trim(),
            },
          });
          return;
        }

        console.error('Reconciliation error:', err);
        reply.status(500).send({
          success: false,
          error: {
            code: 'RECONCILIATION_FAILED',
            message: 'Payment reconciliation failed.',
          },
        });
      }
    }
  );

  /**
   * POST /payments/verify - Server-side verification of Razorpay checkout signature & payment state
   */
  fastify.post(
    '/payments/verify',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const parseResult = verifyRazorpayPaymentSchema.safeParse(request.body);

      if (!parseResult.success) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid verification payload',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      try {
        const payment = await verifyRazorpayPaymentService({
          bookingId: parseResult.data.bookingId,
          userId,
          razorpayOrderId: parseResult.data.razorpayOrderId,
          razorpayPaymentId: parseResult.data.razorpayPaymentId,
          razorpaySignature: parseResult.data.razorpaySignature,
        });

        reply.send({
          success: true,
          data: payment,
        });
      } catch (err: any) {
        const msg = err?.message || '';

        if (msg.includes('NOT_FOUND') || msg.includes('PAYMENT_NOT_FOUND')) {
          reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: msg.replace(/^(NOT_FOUND|PAYMENT_NOT_FOUND):/, '').trim(),
            },
          });
          return;
        }

        if (
          msg.includes('INVALID_SIGNATURE') ||
          msg.includes('AMOUNT_MISMATCH') ||
          msg.includes('CURRENCY_MISMATCH') ||
          msg.includes('ORDER_MISMATCH')
        ) {
          reply.status(400).send({
            success: false,
            error: {
              code: msg.split(':')[0].trim(),
              message: msg.split(':').slice(1).join(':').trim(),
            },
          });
          return;
        }

        console.error('Verify Razorpay payment error:', err);
        reply.status(500).send({
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Payment verification failed.',
          },
        });
      }
    }
  );

  /**
   * POST /payments/webhooks/razorpay - Dedicated Razorpay Webhook Endpoint
   */
  fastify.post('/payments/webhooks/razorpay', async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'] as string;
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);

    if (!signature) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'x-razorpay-signature header is missing.',
        },
      });
      return;
    }

    const isValid = RazorpayPaymentProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Razorpay webhook signature verification failed.',
        },
      });
      return;
    }

    const body = request.body as any;
    const event = body?.event;
    const payload = body?.payload;

    let providerPaymentId: string | null = null;
    let eventType: 'payment.succeeded' | 'payment.failed' | 'payment.cancelled' = 'payment.succeeded';
    let failureReason: string | undefined = undefined;

    if (event === 'payment.captured' || event === 'order.paid') {
      eventType = 'payment.succeeded';
      providerPaymentId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;
    } else if (event === 'payment.failed') {
      eventType = 'payment.failed';
      providerPaymentId = payload?.payment?.entity?.order_id || payload?.payment?.entity?.id;
      failureReason = payload?.payment?.entity?.error_description || 'Razorpay payment failed';
    } else {
      reply.send({ success: true, message: `Ignored unhandled event type: ${event}` });
      return;
    }

    if (!providerPaymentId) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Could not extract provider order/payment reference from webhook payload.',
        },
      });
      return;
    }

    try {
      const payment = await processPaymentEventService({
        providerPaymentId,
        eventType,
        failureReason,
        eventId: body?.event_id,
      });

      reply.send({
        success: true,
        data: payment,
      });
    } catch (err: any) {
      console.error('Razorpay webhook processing error:', err);
      reply.status(500).send({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: err?.message || 'Failed to process Razorpay webhook.',
        },
      });
    }
  });

  /**
   * POST /payments/events - Provider-neutral payment webhook/event processor (Development/Mock)
   */
  fastify.post('/payments/events', async (request, reply) => {
    const parseResult = processPaymentEventSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment event payload',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    try {
      const payment = await processPaymentEventService(parseResult.data);
      reply.send({
        success: true,
        data: payment,
      });
    } catch (err: any) {
      const msg = err?.message || '';

      if (msg.includes('NOT_FOUND')) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: msg.replace('NOT_FOUND:', '').trim(),
          },
        });
        return;
      }

      if (msg.includes('INVALID_STATUS_TRANSITION')) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: msg.replace('INVALID_STATUS_TRANSITION:', '').trim(),
          },
        });
        return;
      }

      console.error('Process payment event error:', err);
      reply.status(500).send({
        success: false,
        error: {
          code: 'EVENT_PROCESSING_FAILED',
          message: 'Failed to process payment event.',
        },
      });
    }
  });
}
