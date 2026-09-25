import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { createBookingSchema } from './booking.schemas.js';
import {
  createBookingService,
  getUserBookingsService,
  getBookingByIdService,
  cancelBookingService,
  updateBookingStatusService,
} from './booking.service.js';

export async function bookingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // All booking routes require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /bookings - Create a new booking/reservation
   */
  fastify.post('/', async (request, reply) => {
    const parseResult = createBookingSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking parameters',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const userId = request.user!.id;

    try {
      const booking = await createBookingService(parseResult.data, userId);
      reply.status(201).send({
        success: true,
        data: booking,
      });
    } catch (err: any) {
      const msg = err?.message || '';

      if (msg.includes('TRIP_UNAUTHORIZED')) {
        reply.status(403).send({
          success: false,
          error: {
            code: 'TRIP_UNAUTHORIZED',
            message: msg.replace('TRIP_UNAUTHORIZED:', '').trim(),
          },
        });
        return;
      }

      if (msg.includes('RESOURCE_REQUIRED')) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'RESOURCE_REQUIRED',
            message: msg.replace('RESOURCE_REQUIRED:', '').trim(),
          },
        });
        return;
      }

      if (msg.includes('INVALID_PLACE')) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PLACE',
            message: msg.replace('INVALID_PLACE:', '').trim(),
          },
        });
        return;
      }

      if (msg.includes('BOOKING_UNAVAILABLE')) {
        reply.status(409).send({
          success: false,
          error: {
            code: 'BOOKING_UNAVAILABLE',
            message: msg.replace('BOOKING_UNAVAILABLE:', '').trim(),
          },
        });
        return;
      }

      console.error('Create booking error:', err);
      reply.status(500).send({
        success: false,
        error: {
          code: 'BOOKING_CREATION_FAILED',
          message: 'Failed to create booking reservation.',
        },
      });
    }
  });

  /**
   * GET /bookings - List user's bookings
   */
  fastify.get<{ Querystring: { status?: string } }>('/', async (request, reply) => {
    const userId = request.user!.id;
    const { status } = request.query;

    const bookings = await getUserBookingsService(userId, status);
    reply.send({
      success: true,
      data: bookings,
    });
  });

  /**
   * GET /bookings/:bookingId - Get booking details
   */
  fastify.get<{ Params: { bookingId: string } }>('/:bookingId', async (request, reply) => {
    const { bookingId } = request.params;
    const userId = request.user!.id;

    try {
      const booking = await getBookingByIdService(bookingId, userId);
      reply.send({
        success: true,
        data: booking,
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
  });

  /**
   * POST /bookings/:bookingId/cancel - Cancel a booking
   */
  fastify.post<{ Params: { bookingId: string } }>('/:bookingId/cancel', async (request, reply) => {
    const { bookingId } = request.params;
    const userId = request.user!.id;

    try {
      const cancelledBooking = await cancelBookingService(bookingId, userId);
      reply.send({
        success: true,
        data: cancelledBooking,
      });
    } catch (err: any) {
      const msg = err?.message || '';

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

      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found or access denied.',
        },
      });
    }
  });

  /**
   * POST /bookings/:bookingId/confirm - Controlled booking confirmation endpoint
   */
  fastify.post<{ Params: { bookingId: string } }>('/:bookingId/confirm', async (request, reply) => {
    const { bookingId } = request.params;
    const userId = request.user!.id;

    try {
      const confirmedBooking = await updateBookingStatusService(bookingId, 'CONFIRMED', userId);
      reply.send({
        success: true,
        data: confirmedBooking,
      });
    } catch (err: any) {
      const msg = err?.message || '';

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

      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found or access denied.',
        },
      });
    }
  });
}
