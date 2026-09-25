import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { aiTripPlanRequestSchema, aiTripCommandRequestSchema } from './ai.schemas.js';
import { generateTripPlanService, modifyTripCommandService } from './ai.service.js';

export async function aiRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // All AI routes require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /ai/trips/plan - Generate a new trip from natural language prompt
   */
  fastify.post('/trips/plan', async (request, reply) => {
    const parseResult = aiTripPlanRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid AI trip request',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const userId = request.user!.id;

    try {
      const planResult = await generateTripPlanService(parseResult.data.prompt, userId);
      reply.status(201).send({
        success: true,
        data: planResult,
      });
    } catch (err: any) {
      const msg = err?.message || '';

      if (msg.includes('BUDGET_EXCEEDED')) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'BUDGET_EXCEEDED',
            message: msg.replace('BUDGET_EXCEEDED:', '').trim(),
          },
        });
        return;
      }

      if (msg.includes('AI_DISABLED')) {
        reply.status(503).send({
          success: false,
          error: {
            code: 'AI_DISABLED',
            message: msg.replace('AI_DISABLED:', '').trim(),
          },
        });
        return;
      }

      if (msg.includes('AI_CONFIG_ERROR')) {
        reply.status(500).send({
          success: false,
          error: {
            code: 'AI_CONFIG_ERROR',
            message: 'AI planning service is improperly configured on the server.',
          },
        });
        return;
      }

      console.error('AI trip planning error:', err);
      reply.status(500).send({
        success: false,
        error: {
          code: 'AI_PLANNING_FAILED',
          message: 'We could not generate a valid trip itinerary from your prompt.',
        },
      });
    }
  });

  /**
   * POST /ai/trips/:tripId/commands - Execute copilot command on existing trip
   */
  fastify.post<{ Params: { tripId: string } }>('/trips/:tripId/commands', async (request, reply) => {
    const { tripId } = request.params;
    const userId = request.user!.id;

    const parseResult = aiTripCommandRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid AI copilot command parameters',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    try {
      const commandResult = await modifyTripCommandService(tripId, parseResult.data.command, userId);
      reply.send({
        success: true,
        data: commandResult,
      });
    } catch (err: any) {
      const msg = err?.message || '';

      if (msg.includes('BUDGET_EXCEEDED')) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'BUDGET_EXCEEDED',
            message: msg.replace('BUDGET_EXCEEDED:', '').trim(),
          },
        });
        return;
      }

      if (msg.includes('NOT_FOUND')) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Trip not found or access denied.',
          },
        });
        return;
      }

      reply.status(500).send({
        success: false,
        error: {
          code: 'AI_COMMAND_FAILED',
          message: 'Could not execute AI copilot command on this trip.',
        },
      });
    }
  });
}
