import { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { env } from '../config/env.js';

export function setupErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = (request as any).requestId || 'unknown';
      const msg = error.message || '';

      // Default status code and code
      let statusCode = (error as FastifyError).statusCode || 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let userMessage = 'An unexpected internal error occurred.';

      // Map domain error messages
      if (msg.includes('NOT_FOUND') || msg.includes('PAYMENT_NOT_FOUND')) {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        userMessage = msg.replace(/^(NOT_FOUND|PAYMENT_NOT_FOUND):/, '').trim();
      } else if (msg.includes('UNAUTHORIZED') || msg.includes('TOKEN_EXPIRED')) {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        userMessage = msg.replace(/^(UNAUTHORIZED|TOKEN_EXPIRED):/, '').trim();
      } else if (msg.includes('FORBIDDEN') || msg.includes('TRIP_UNAUTHORIZED')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
        userMessage = msg.replace(/^(FORBIDDEN|TRIP_UNAUTHORIZED):/, '').trim();
      } else if (msg.includes('IDEMPOTENCY_CONFLICT')) {
        statusCode = 409;
        errorCode = 'IDEMPOTENCY_CONFLICT';
        userMessage = msg.replace('IDEMPOTENCY_CONFLICT:', '').trim();
      } else if (msg.includes('RATE_LIMITED') || statusCode === 429) {
        statusCode = 429;
        errorCode = 'RATE_LIMITED';
        userMessage = 'Too many requests. Please slow down and try again later.';
      } else if (
        msg.includes('VALIDATION_ERROR') ||
        msg.includes('BOOKING_NOT_PAYABLE') ||
        msg.includes('BOOKING_ALREADY_PAID') ||
        msg.includes('INVALID_SIGNATURE') ||
        msg.includes('AMOUNT_MISMATCH') ||
        msg.includes('CURRENCY_MISMATCH') ||
        msg.includes('ORDER_MISMATCH') ||
        msg.includes('NO_SUCCEEDED_PAYMENT') ||
        msg.includes('ALREADY_FULLY_REFUNDED') ||
        msg.includes('INVALID_REFUND_AMOUNT') ||
        msg.includes('EXCEEDS_REFUNDABLE_AMOUNT') ||
        msg.includes('INVALID_STATUS_TRANSITION') ||
        msg.includes('RESOURCE_REQUIRED') ||
        msg.includes('INVALID_PLACE') ||
        msg.includes('BOOKING_UNAVAILABLE')
      ) {
        statusCode = 400;
        errorCode = msg.split(':')[0].trim();
        userMessage = msg.split(':').slice(1).join(':').trim() || msg;
      } else if (statusCode === 400 && (error as any).validation) {
        errorCode = 'VALIDATION_ERROR';
        userMessage = 'Request input validation failed.';
      }

      // Log full error details internally (never expose to client)
      server.log.error({
        requestId,
        errorCode,
        statusCode,
        errorMessage: error.message,
        stack: env.NODE_ENV !== 'production' ? error.stack : undefined,
      });

      // Send sanitized machine-readable error response
      reply.status(statusCode).send({
        success: false,
        error: {
          code: errorCode,
          message: userMessage,
          requestId,
          details:
            env.NODE_ENV !== 'production' && (error as FastifyError).validation
              ? (error as FastifyError).validation
              : undefined,
        },
      });
    }
  );
}
