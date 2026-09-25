import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { APP_CONFIG } from '@tripgenie/config';
import { db } from '../db/prisma.js';
import { env } from '../config/env.js';

export async function healthRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const startTime = Date.now();

  /**
   * GET /health - Process liveness check
   */
  fastify.get('/health', async (_request, reply) => {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: `${APP_CONFIG.name}-api`,
      version: APP_CONFIG.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  /**
   * GET /ready - Dependency readiness evaluation
   */
  fastify.get('/ready', async (_request, reply) => {
    let dbStatus = 'ok';
    let paymentStatus = 'ok';
    let isReady = true;

    // 1. Check PostgreSQL Database Connectivity
    try {
      await db.$queryRaw`SELECT 1`;
    } catch (err: any) {
      dbStatus = 'unreachable';
      isReady = false;
      fastify.log.error({ msg: 'Database readiness check failed', error: err?.message });
    }

    // 2. Check Payment Provider Configuration Readiness
    if (env.PAYMENT_PROVIDER === 'razorpay') {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        paymentStatus = 'misconfigured';
        isReady = false;
      }
    }

    const responseCode = isReady ? 200 : 503;
    reply.status(responseCode).send({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      service: `${APP_CONFIG.name}-api`,
      checks: {
        database: dbStatus,
        paymentProvider: paymentStatus,
      },
      environment: env.NODE_ENV,
      paymentMode: env.PAYMENT_PROVIDER,
    });
  });
}
