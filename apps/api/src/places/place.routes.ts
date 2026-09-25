import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { db } from '../db/prisma.js';
import { authenticate } from '../auth/auth.middleware.js';
import { placeSearchSchema, mapPlaceToDTO } from './place.schemas.js';
import { getPlaceProvider } from './place.provider.js';

export async function placeRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  /**
   * GET /places - Search & filter places
   */
  fastify.get('/', async (request, reply) => {
    const parseResult = placeSearchSchema.safeParse(request.query);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid place search parameters',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const userId = request.user?.id;
    const provider = getPlaceProvider();
    const searchResult = await provider.searchPlaces(parseResult.data, userId);

    reply.send({
      success: true,
      data: searchResult,
    });
  });

  /**
   * GET /places/saved - List saved places for authenticated user
   */
  fastify.get('/saved', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;

    const savedRecords = await db.savedPlace.findMany({
      where: { userId },
      include: { place: true },
      orderBy: { createdAt: 'desc' },
    });

    const savedPlaces = savedRecords.map((rec) => mapPlaceToDTO(rec.place, true));

    reply.send({
      success: true,
      data: savedPlaces,
    });
  });

  /**
   * GET /places/:placeId - Get details for a place
   */
  fastify.get<{ Params: { placeId: string } }>('/:placeId', async (request, reply) => {
    const { placeId } = request.params;
    const userId = request.user?.id;

    const provider = getPlaceProvider();
    const place = await provider.getPlaceById(placeId, userId);

    if (!place) {
      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Place not found.',
        },
      });
      return;
    }

    reply.send({
      success: true,
      data: place,
    });
  });

  /**
   * POST /places/:placeId/save - Save place for user
   */
  fastify.post<{ Params: { placeId: string } }>(
    '/:placeId/save',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const { placeId } = request.params;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(placeId)) {
        reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Place not found.' },
        });
        return;
      }

      const placeExists = await db.place.findUnique({ where: { id: placeId } });
      if (!placeExists) {
        reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Place not found.' },
        });
        return;
      }

      const existingSaved = await db.savedPlace.findFirst({
        where: { userId, placeId },
      });

      if (!existingSaved) {
        await db.savedPlace.create({
          data: { userId, placeId },
        });
      }

      reply.send({
        success: true,
        data: { isSaved: true },
      });
    }
  );

  /**
   * DELETE /places/:placeId/save - Unsave place for user
   */
  fastify.delete<{ Params: { placeId: string } }>(
    '/:placeId/save',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const { placeId } = request.params;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(placeId)) {
        reply.send({
          success: true,
          data: { isSaved: false },
        });
        return;
      }

      await db.savedPlace.deleteMany({
        where: { userId, placeId },
      });

      reply.send({
        success: true,
        data: { isSaved: false },
      });
    }
  );
}
