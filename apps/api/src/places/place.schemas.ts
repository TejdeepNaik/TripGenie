import { z } from 'zod';
import type { Place } from '@prisma/client';
import type { PlaceDTO } from '@tripgenie/types';

export const placeSearchSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(1).max(4).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type PlaceSearchInput = z.infer<typeof placeSearchSchema>;

export function mapPlaceToDTO(place: Place, isSaved: boolean = false): PlaceDTO {
  return {
    id: place.id,
    externalId: place.externalId,
    name: place.name,
    description: place.description,
    category: place.category,
    city: place.city,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
    rating: place.rating,
    priceLevel: place.priceLevel,
    imageUrl: place.imageUrl,
    metadata: place.metadata as Record<string, any> | null,
    provider: place.provider || 'database',
    createdAt: place.createdAt.toISOString(),
    updatedAt: place.updatedAt.toISOString(),
    isSaved,
  };
}
