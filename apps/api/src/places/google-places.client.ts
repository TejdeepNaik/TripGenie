import type { PlaceDTO } from '@tripgenie/types';

export interface GooglePlacesSearchQuery {
  q?: string;
  category?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export class GooglePlacesClient {
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey?: string, timeoutMs: number = 5000) {
    this.apiKey = apiKey || '';
    this.timeoutMs = timeoutMs;
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  /**
   * Perform Google Places Text Search
   */
  async searchPlaces(query: GooglePlacesSearchQuery): Promise<PlaceDTO[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Places API key is missing or unconfigured.');
    }

    const textSearchQuery = [query.q, query.category, query.city]
      .filter(Boolean)
      .join(' ');

    if (!textSearchQuery.trim()) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        textSearchQuery
      )}&key=${this.apiKey}`;

      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Google Places API HTTP Error: ${response.status}`);
      }

      const data: any = await response.json();
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error status: ${data.status}`);
      }

      const results = data.results || [];
      const limit = query.limit || 12;

      return results.slice(0, limit).map((item: any) => this.normalizeGooglePlace(item));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch single Google Place details
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDTO | null> {
    if (!this.isConfigured()) {
      throw new Error('Google Places API key is missing or unconfigured.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&key=${this.apiKey}`;

      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;

      const data: any = await response.json();
      if (data.status !== 'OK' || !data.result) {
        return null;
      }

      return this.normalizeGooglePlace(data.result);
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Helper to normalize raw Google Place payloads into TripGenie PlaceDTO
   */
  public normalizeGooglePlace(item: any): PlaceDTO {
    // Return high-quality visual URL without leaking server-side secret API key into client bundles
    const imageUrl = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

    // Estimate city from formatted address if available
    let city: string | null = null;
    let country: string | null = null;
    if (item.formatted_address) {
      const parts = item.formatted_address.split(',').map((s: string) => s.trim());
      if (parts.length >= 2) {
        country = parts[parts.length - 1];
        city = parts[parts.length - 2];
      }
    }

    return {
      id: item.place_id,
      externalId: item.place_id,
      name: item.name || 'Unnamed Place',
      description: item.editorial_summary?.overview || item.formatted_address || null,
      category: item.types?.[0]?.toUpperCase() || 'GENERAL',
      city,
      country,
      latitude: item.geometry?.location?.lat || null,
      longitude: item.geometry?.location?.lng || null,
      address: item.formatted_address || null,
      rating: item.rating ? Number(item.rating) : null,
      priceLevel: item.price_level !== undefined ? Number(item.price_level) : null,
      imageUrl,
      metadata: {
        googlePlaceId: item.place_id,
        userRatingsTotal: item.user_ratings_total || 0,
      },
      provider: 'google',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
