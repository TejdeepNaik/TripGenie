import { Prisma } from '@prisma/client';
import { db } from '../db/prisma.js';
import type { PlaceDTO, PlaceSearchResult } from '@tripgenie/types';
import { mapPlaceToDTO, PlaceSearchInput } from './place.schemas.js';
import { GooglePlacesClient } from './google-places.client.js';
import { GooglePlacesProvider } from './google-places.provider.js';

export interface PlaceProvider {
  searchPlaces(input: PlaceSearchInput, userId?: string): Promise<PlaceSearchResult>;
  getPlaceById(id: string, userId?: string): Promise<PlaceDTO | null>;
}

export class DatabasePlaceProvider implements PlaceProvider {
  async searchPlaces(input: PlaceSearchInput, userId?: string): Promise<PlaceSearchResult> {
    const page = input.page || 1;
    const limit = input.limit || 12;
    const skip = (page - 1) * limit;

    const where: Prisma.PlaceWhereInput = {};

    if (input.category && input.category !== 'Everything') {
      where.category = { equals: input.category, mode: 'insensitive' };
    }

    if (input.city) {
      where.city = { equals: input.city, mode: 'insensitive' };
    }

    if (input.minRating !== undefined) {
      where.rating = { gte: input.minRating };
    }

    if (input.maxPrice !== undefined) {
      where.priceLevel = { lte: input.maxPrice };
    }

    if (input.q && input.q.trim().length > 0) {
      const queryStr = input.q.trim();
      where.OR = [
        { name: { contains: queryStr, mode: 'insensitive' } },
        { description: { contains: queryStr, mode: 'insensitive' } },
        { city: { contains: queryStr, mode: 'insensitive' } },
      ];
    }

    const [places, total] = await Promise.all([
      db.place.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ rating: 'desc' }, { name: 'asc' }],
      }),
      db.place.count({ where }),
    ]);

    let savedPlaceIds = new Set<string>();
    if (userId && places.length > 0) {
      const saved = await db.savedPlace.findMany({
        where: {
          userId,
          placeId: { in: places.map((p) => p.id) },
        },
        select: { placeId: true },
      });
      savedPlaceIds = new Set(saved.map((s) => s.placeId));
    }

    const placeDTOs = places.map((place) =>
      mapPlaceToDTO(place, savedPlaceIds.has(place.id))
    );

    return {
      places: placeDTOs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPlaceById(id: string, userId?: string): Promise<PlaceDTO | null> {
    const place = await db.place.findUnique({
      where: { id },
    });

    if (!place) return null;

    let isSaved = false;
    if (userId) {
      const saved = await db.savedPlace.findFirst({
        where: { userId, placeId: id },
      });
      isSaved = !!saved;
    }

    return mapPlaceToDTO(place, isSaved);
  }
}

export const defaultDatabasePlaceProvider = new DatabasePlaceProvider();
export const defaultPlaceProvider = defaultDatabasePlaceProvider;

export function getPlaceProvider(customEnv?: { GOOGLE_PLACES_ENABLED?: boolean; GOOGLE_PLACES_API_KEY?: string }): PlaceProvider {
  const isEnabled = customEnv
    ? customEnv.GOOGLE_PLACES_ENABLED
    : process.env.GOOGLE_PLACES_ENABLED === 'true' || process.env.GOOGLE_PLACES_ENABLED === '1';
  const apiKey = customEnv ? customEnv.GOOGLE_PLACES_API_KEY : process.env.GOOGLE_PLACES_API_KEY;

  if (isEnabled && apiKey) {
    const client = new GooglePlacesClient(apiKey);
    return new GooglePlacesProvider(client, defaultDatabasePlaceProvider);
  }
  return defaultDatabasePlaceProvider;
}
