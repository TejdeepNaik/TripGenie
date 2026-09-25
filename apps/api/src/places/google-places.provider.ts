import { db } from '../db/prisma.js';
import type { PlaceDTO, PlaceSearchResult } from '@tripgenie/types';
import type { PlaceProvider } from './place.provider.js';
import { DatabasePlaceProvider } from './place.provider.js';
import { GooglePlacesClient } from './google-places.client.js';
import { PlaceSearchInput } from './place.schemas.js';

export class GooglePlacesProvider implements PlaceProvider {
  private client: GooglePlacesClient;
  private fallbackProvider: DatabasePlaceProvider;

  constructor(client: GooglePlacesClient, fallbackProvider?: DatabasePlaceProvider) {
    this.client = client;
    this.fallbackProvider = fallbackProvider || new DatabasePlaceProvider();
  }

  async searchPlaces(input: PlaceSearchInput, userId?: string): Promise<PlaceSearchResult> {
    if (!this.client.isConfigured()) {
      return this.fallbackProvider.searchPlaces(input, userId);
    }

    try {
      const places = await this.client.searchPlaces(input);

      // Check saved places status if user is authenticated
      let savedExternalIds = new Set<string>();
      if (userId && places.length > 0) {
        const externalIds = places.map((p) => p.externalId || p.id).filter(Boolean);
        const saved = await db.savedPlace.findMany({
          where: {
            userId,
            place: {
              externalId: { in: externalIds },
            },
          },
          select: { place: { select: { externalId: true } } },
        });
        savedExternalIds = new Set(
          saved.map((s) => s.place?.externalId).filter((id): id is string => !!id)
        );
      }

      const placeDTOs = places.map((place) => ({
        ...place,
        isSaved: savedExternalIds.has(place.externalId || place.id),
      }));

      const page = input.page || 1;
      const limit = input.limit || 12;

      return {
        places: placeDTOs,
        total: placeDTOs.length,
        page,
        limit,
        totalPages: 1,
      };
    } catch (err: any) {
      console.warn(`⚠️ GooglePlacesProvider search failed (${err?.message}). Falling back to DatabasePlaceProvider.`);
      return this.fallbackProvider.searchPlaces(input, userId);
    }
  }

  async getPlaceById(id: string, userId?: string): Promise<PlaceDTO | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // If ID is a UUID, check local database first
    if (isUuid) {
      const dbPlace = await this.fallbackProvider.getPlaceById(id, userId);
      if (dbPlace) return dbPlace;
    }

    // Otherwise query Google Places API directly
    if (this.client.isConfigured()) {
      try {
        const googlePlace = await this.client.getPlaceDetails(id);
        if (googlePlace) {
          let isSaved = false;
          if (userId) {
            const saved = await db.savedPlace.findFirst({
              where: {
                userId,
                place: { externalId: googlePlace.externalId || googlePlace.id },
              },
            });
            isSaved = !!saved;
          }
          return { ...googlePlace, isSaved };
        }
      } catch (err: any) {
        console.warn(`⚠️ GooglePlacesProvider getPlaceById failed (${err?.message}).`);
      }
    }

    return this.fallbackProvider.getPlaceById(id, userId);
  }
}
