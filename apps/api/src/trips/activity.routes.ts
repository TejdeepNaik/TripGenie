import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { db } from '../db/prisma.js';
import { authenticate } from '../auth/auth.middleware.js';
import {
  createActivitySchema,
  updateActivitySchema,
  mapActivityToDTO,
} from './activity.schemas.js';

export async function activityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // All activity endpoints require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * Helper function to check if user is a member of the trip
   */
  async function verifyTripMembership(tripId: string, userId: string): Promise<boolean> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId)) {
      return false;
    }

    const member = await db.tripMember.findFirst({
      where: {
        tripId,
        userId,
      },
    });
    return !!member;
  }

  /**
   * GET /trips/:tripId/activities - List activities for a trip
   */
  fastify.get<{ Params: { tripId: string } }>('/:tripId/activities', async (request, reply) => {
    const userId = request.user!.id;
    const { tripId } = request.params;

    const isMember = await verifyTripMembership(tripId, userId);
    if (!isMember) {
      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found or access denied.',
        },
      });
      return;
    }

    const activities = await db.activity.findMany({
      where: {
        tripDay: {
          tripId,
        },
      },
      include: {
        place: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    });

    reply.send({
      success: true,
      data: activities.map((act) => mapActivityToDTO(act)),
    });
  });

  /**
   * POST /trips/:tripId/activities - Create an activity for a trip day
   */
  fastify.post<{ Params: { tripId: string } }>('/:tripId/activities', async (request, reply) => {
    const userId = request.user!.id;
    const { tripId } = request.params;

    const isMember = await verifyTripMembership(tripId, userId);
    if (!isMember) {
      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found or access denied.',
        },
      });
      return;
    }

    const parseResult = createActivitySchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid activity parameters',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const {
      tripDayId,
      placeId,
      title,
      description,
      startTime,
      endTime,
      durationMinutes,
      estimatedCost,
      notes,
      sortOrder,
    } = parseResult.data;

    // CRITICAL: Cross-trip verification - ensure tripDayId actually belongs to tripId!
    const tripDay = await db.tripDay.findFirst({
      where: {
        id: tripDayId,
        tripId,
      },
    });

    if (!tripDay) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'CROSS_TRIP_FORGERY',
          message: 'Target trip day does not belong to the specified trip.',
        },
      });
      return;
    }

    // Verify place exists if placeId provided
    if (placeId) {
      const placeExists = await db.place.findUnique({ where: { id: placeId } });
      if (!placeExists) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PLACE',
            message: 'Referenced place does not exist.',
          },
        });
        return;
      }
    }

    const createdActivity = await db.activity.create({
      data: {
        tripDayId,
        placeId: placeId || null,
        title,
        description: description || null,
        startTime: startTime || null,
        endTime: endTime || null,
        durationMinutes: durationMinutes || null,
        estimatedCost: estimatedCost !== undefined && estimatedCost !== null ? estimatedCost : null,
        notes: notes || null,
        sortOrder: sortOrder || 0,
      },
      include: {
        place: true,
      },
    });

    reply.status(201).send({
      success: true,
      data: mapActivityToDTO(createdActivity),
    });
  });

  /**
   * PATCH /trips/:tripId/activities/:activityId - Update an existing activity
   */
  fastify.patch<{ Params: { tripId: string; activityId: string } }>(
    '/:tripId/activities/:activityId',
    async (request, reply) => {
      const userId = request.user!.id;
      const { tripId, activityId } = request.params;

      const isMember = await verifyTripMembership(tripId, userId);
      if (!isMember) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Trip not found or access denied.',
          },
        });
        return;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId);
      const existingActivity = isUuid
        ? await db.activity.findFirst({
            where: {
              id: activityId,
              tripDay: {
                tripId,
              },
            },
          })
        : null;

      if (!existingActivity) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Activity not found in this trip.',
          },
        });
        return;
      }

      const parseResult = updateActivitySchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid activity update parameters',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      const updatedActivity = await db.activity.update({
        where: { id: activityId },
        data: parseResult.data,
        include: { place: true },
      });

      reply.send({
        success: true,
        data: mapActivityToDTO(updatedActivity),
      });
    }
  );

  /**
   * DELETE /trips/:tripId/activities/:activityId - Delete an activity from a trip
   */
  fastify.delete<{ Params: { tripId: string; activityId: string } }>(
    '/:tripId/activities/:activityId',
    async (request, reply) => {
      const userId = request.user!.id;
      const { tripId, activityId } = request.params;

      const isMember = await verifyTripMembership(tripId, userId);
      if (!isMember) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Trip not found or access denied.',
          },
        });
        return;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId);
      const existingActivity = isUuid
        ? await db.activity.findFirst({
            where: {
              id: activityId,
              tripDay: {
                tripId,
              },
            },
          })
        : null;

      if (!existingActivity) {
        reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Activity not found in this trip.',
          },
        });
        return;
      }

      await db.activity.delete({
        where: { id: activityId },
      });

      reply.send({
        success: true,
        data: { message: 'Activity deleted successfully.' },
      });
    }
  );
}
