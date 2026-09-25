import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { TripRole, TripStatus } from '@prisma/client';
import { db } from '../db/prisma.js';
import { authenticate } from '../auth/auth.middleware.js';
import { createTripSchema, TripResponseDTO } from './trip.schemas.js';
import { mapActivityToDTO } from './activity.schemas.js';

export async function tripRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // All trip endpoints require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /trips - List trips for the authenticated user
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;

    const trips = await db.trip.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            days: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const responseData: TripResponseDTO[] = trips.map((trip) => ({
      id: trip.id,
      ownerId: trip.ownerId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      budget: trip.budget ? Number(trip.budget) : null,
      currency: trip.currency,
      status: trip.status,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      travelersCount: trip._count.members,
      daysCount: trip._count.days,
    }));

    reply.send({
      success: true,
      data: responseData,
    });
  });

  /**
   * POST /trips - Create a new trip for the authenticated user
   */
  fastify.post('/', async (request, reply) => {
    const parseResult = createTripSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid trip parameters',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const userId = request.user!.id;
    const { title, destination, startDate, endDate, budget, currency } = parseResult.data;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate total days (capped to max 30 for safe initial allocation)
    const dayDiff = Math.max(
      1,
      Math.min(30, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    );

    // Atomic transaction: Create Trip + TripMember (OWNER) + Initial TripDays
    const createdTrip = await db.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          ownerId: userId,
          title,
          destination,
          startDate: start,
          endDate: end,
          budget: budget !== undefined && budget !== null ? budget : null,
          currency,
          status: TripStatus.PLANNING,
          members: {
            create: {
              userId,
              role: TripRole.OWNER,
            },
          },
        },
      });

      // Generate daily itinerary records using UTC timestamp offset
      const tripDaysData = Array.from({ length: dayDiff }, (_, i) => {
        const dayDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        return {
          tripId: trip.id,
          date: dayDate,
          title: `Day ${i + 1}`,
          note: null,
        };
      });

      await tx.tripDay.createMany({
        data: tripDaysData,
      });

      return trip;
    });

    const tripDays = await db.tripDay.findMany({
      where: { tripId: createdTrip.id },
      orderBy: { date: 'asc' },
    });

    const responseDTO: TripResponseDTO = {
      id: createdTrip.id,
      ownerId: createdTrip.ownerId,
      title: createdTrip.title,
      destination: createdTrip.destination,
      startDate: createdTrip.startDate.toISOString(),
      endDate: createdTrip.endDate.toISOString(),
      budget: createdTrip.budget ? Number(createdTrip.budget) : null,
      currency: createdTrip.currency,
      status: createdTrip.status,
      createdAt: createdTrip.createdAt.toISOString(),
      updatedAt: createdTrip.updatedAt.toISOString(),
      travelersCount: 1,
      daysCount: tripDays.length,
      days: tripDays.map((d) => ({
        id: d.id,
        date: d.date.toISOString(),
        title: d.title,
        note: d.note,
      })),
    };

    reply.status(201).send({
      success: true,
      data: responseDTO,
    });
  });

  /**
   * GET /trips/:tripId - Get trip details (requires ownership/membership)
   */
  fastify.get<{ Params: { tripId: string } }>('/:tripId', async (request, reply) => {
    const userId = request.user!.id;
    const { tripId } = request.params;

    const trip = await db.trip.findFirst({
      where: {
        id: tripId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        days: {
          orderBy: {
            date: 'asc',
          },
          include: {
            activities: {
              include: {
                place: true,
              },
              orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!trip) {
      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found or you do not have permission to view it.',
        },
      });
      return;
    }

    const responseDTO: TripResponseDTO = {
      id: trip.id,
      ownerId: trip.ownerId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      budget: trip.budget ? Number(trip.budget) : null,
      currency: trip.currency,
      status: trip.status,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      travelersCount: trip._count.members,
      daysCount: trip.days.length,
      days: trip.days.map((d) => ({
        id: d.id,
        date: d.date.toISOString(),
        title: d.title,
        note: d.note,
        activities: d.activities.map((a) => mapActivityToDTO(a)),
      })),
    };

    reply.send({
      success: true,
      data: responseDTO,
    });
  });
}
