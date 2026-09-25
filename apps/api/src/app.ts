import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { setupRequestCorrelationAndLogging } from './logging/logger.js';
import { setupErrorHandler } from './errors/errorHandler.js';
import { healthRoutes } from './health/health.routes.js';
import { authRoutes } from './auth/auth.routes.js';
import { tripRoutes } from './trips/trip.routes.js';
import { activityRoutes } from './trips/activity.routes.js';
import { placeRoutes } from './places/place.routes.js';
import { aiRoutes } from './ai/ai.routes.js';
import { bookingRoutes } from './bookings/booking.routes.js';
import { paymentRoutes } from './payments/payment.routes.js';
import { internalRoutes } from './internal/internal.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'info',
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.secret',
        'body.razorpaySignature',
      ],
    },
  });

  // 1. Setup Request Correlation ID and Structured Request/Response Logging
  setupRequestCorrelationAndLogging(server);

  // 2. Setup Centralized Machine-Readable Error Handler
  setupErrorHandler(server);

  // 3. Configure CORS with environment-restricted origins (no wildcard *)
  const allowedOrigins = Array.from(
    new Set([env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'])
  );

  await server.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  });

  // 4. Register Cookie plugin
  await server.register(cookie, {
    secret: env.SESSION_SECRET,
    hook: 'onRequest',
  });

  // 5. Register Rate Limit plugin for DDoS and brute-force protection
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, _context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down and try again later.',
          requestId: (request as any).requestId || 'unknown',
        },
      };
    },
  });

  // 6. Register Health & Readiness Endpoints (/health, /ready)
  await server.register(healthRoutes);

  // 7. Register Authentication Routes
  await server.register(authRoutes, { prefix: '/auth' });

  // 8. Register Trip & Activity Management Routes
  await server.register(tripRoutes, { prefix: '/trips' });
  await server.register(activityRoutes, { prefix: '/trips' });

  // 9. Register Place Discovery Routes
  await server.register(placeRoutes, { prefix: '/places' });

  // 10. Register AI Travel Copilot Routes
  await server.register(aiRoutes, { prefix: '/ai' });

  // 11. Register Booking Routes
  await server.register(bookingRoutes, { prefix: '/bookings' });

  // 12. Register Payment & Refund Routes
  await server.register(paymentRoutes);

  // 13. Register Operational Internal Routes
  await server.register(internalRoutes);

  return server;
}
