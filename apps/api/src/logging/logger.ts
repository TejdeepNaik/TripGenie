import crypto from 'crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface LogContext {
  requestId?: string;
  userId?: string;
  paymentId?: string;
  bookingId?: string;
  refundId?: string;
  provider?: string;
  providerPaymentId?: string;
  operation?: string;
  result?: string;
  [key: string]: any;
}

const REDACT_KEYS = [
  'password',
  'passwordHash',
  'secret',
  'razorpaySignature',
  'razorpay_signature',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'authorization',
  'cookie',
  'cvv',
  'cardNumber',
];

/**
 * Redacts sensitive credentials from log metadata
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (REDACT_KEYS.some((rk) => key.toLowerCase().includes(rk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeLogData(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }

  return sanitized;
}

export function setupRequestCorrelationAndLogging(server: FastifyInstance): void {
  // 1. Assign/Propagate X-Request-Id header
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawHeader = request.headers['x-request-id'];
    let requestId: string;

    if (
      typeof rawHeader === 'string' &&
      rawHeader.trim().length > 0 &&
      rawHeader.length <= 100 &&
      /^[a-zA-Z0-9_\-]+$/.test(rawHeader.trim())
    ) {
      requestId = rawHeader.trim();
    } else {
      requestId = crypto.randomUUID();
    }

    (request as any).requestId = requestId;
    reply.header('X-Request-Id', requestId);
  });

  // 2. Log completed requests with durationMs and correlation ID
  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).requestId;
    const durationMs = Math.round(reply.getResponseTime());

    server.log.info({
      requestId,
      method: request.method,
      route: request.url,
      statusCode: reply.statusCode,
      durationMs,
      userId: (request as any).user?.id || undefined,
    });
  });
}
