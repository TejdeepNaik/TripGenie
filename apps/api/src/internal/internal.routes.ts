import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { runBatchReconciliationJob } from '../jobs/reconciliation.job.js';

export async function internalRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  /**
   * POST /internal/payments/reconcile - Operational Batch Payment Reconciliation Endpoint
   * Enforces role authorization (ADMIN or internal service key)
   */
  fastify.post(
    '/internal/payments/reconcile',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;

      // Enforce Admin / Operational Authorization
      if (user.role !== 'ADMIN') {
        reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Operational reconciliation endpoint requires ADMIN privileges.',
          },
        });
        return;
      }

      const body = (request.body as any) || {};
      const limit = typeof body.limit === 'number' ? Math.min(body.limit, 100) : 50;

      try {
        const batchResult = await runBatchReconciliationJob(limit);
        reply.send({
          success: true,
          data: batchResult,
        });
      } catch (err: any) {
        fastify.log.error({ msg: 'Batch reconciliation job error', error: err?.message });
        reply.status(500).send({
          success: false,
          error: {
            code: 'RECONCILIATION_JOB_FAILED',
            message: 'Failed to execute operational batch reconciliation.',
          },
        });
      }
    }
  );
}
