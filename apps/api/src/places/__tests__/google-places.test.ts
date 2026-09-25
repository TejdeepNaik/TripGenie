import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GooglePlacesClient } from '../google-places.client.js';
import { GooglePlacesProvider } from '../google-places.provider.js';
import { getPlaceProvider, DatabasePlaceProvider, PlaceProvider } from '../place.provider.js';
import { placeSearchSchema } from '../place.schemas.js';

describe('Google Places Client & Provider Integration Unit Tests', () => {
  test('should identify when Google Places API key is unconfigured', () => {
    const client = new GooglePlacesClient('');
    assert.equal(client.isConfigured(), false);
  });

  test('should normalize raw Google Place payloads into standardized PlaceDTO', () => {
    const client = new GooglePlacesClient('dummy_key_123');

    const rawGooglePlace = {
      place_id: 'ChIJgUbEo88TrjsR5mDAA8n6ZgU',
      name: 'Senso-ji Temple',
      formatted_address: '2 Chome-3-1 Asakusa, Taito City, Tokyo, Japan',
      types: ['tourist_attraction', 'place_of_worship'],
      rating: 4.7,
      price_level: 2,
      geometry: {
        location: {
          lat: 35.7148,
          lng: 139.7967,
        },
      },
    };

    const normalized = client.normalizeGooglePlace(rawGooglePlace);

    assert.equal(normalized.id, 'ChIJgUbEo88TrjsR5mDAA8n6ZgU');
    assert.equal(normalized.externalId, 'ChIJgUbEo88TrjsR5mDAA8n6ZgU');
    assert.equal(normalized.name, 'Senso-ji Temple');
    assert.equal(normalized.category, 'TOURIST_ATTRACTION');
    assert.equal(normalized.city, 'Tokyo');
    assert.equal(normalized.country, 'Japan');
    assert.equal(normalized.latitude, 35.7148);
    assert.equal(normalized.longitude, 139.7967);
    assert.equal(normalized.rating, 4.7);
    assert.equal(normalized.priceLevel, 2);
    assert.equal(normalized.provider, 'google');
  });

  test('should fallback to DatabasePlaceProvider when GOOGLE_PLACES_ENABLED is false', () => {
    const provider = getPlaceProvider({
      GOOGLE_PLACES_ENABLED: false,
      GOOGLE_PLACES_API_KEY: undefined,
    });

    assert.ok(provider instanceof DatabasePlaceProvider);
  });

  test('should select GooglePlacesProvider when GOOGLE_PLACES_ENABLED is true with API key', () => {
    const provider = getPlaceProvider({
      GOOGLE_PLACES_ENABLED: true,
      GOOGLE_PLACES_API_KEY: 'mock_secret_api_key',
    });

    assert.ok(provider instanceof GooglePlacesProvider);
  });

  test('should gracefully handle network timeout and fallback to DatabasePlaceProvider', async () => {
    const unconfiguredClient = new GooglePlacesClient('invalid_key');

    const mockDbProvider: PlaceProvider = {
      searchPlaces: async () => ({
        places: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 1,
      }),
      getPlaceById: async () => null,
    };

    const provider = new GooglePlacesProvider(unconfiguredClient, mockDbProvider as any);

    // Mock searchPlaces to simulate a 5000ms network timeout
    unconfiguredClient.searchPlaces = async () => {
      throw new Error('Google Places API network timeout (5000ms)');
    };
    const result = await provider.searchPlaces(placeSearchSchema.parse({ q: 'Test' }));
    assert.ok(result);
    assert.equal(result.total, 0);
    assert.ok(Array.isArray(result.places));
  });

  test('should ensure secret API key is never leaked inside normalized PlaceDTO metadata or imageUrl', () => {
    const apiKey = 'super_secret_google_key_999';
    const client = new GooglePlacesClient(apiKey);

    const raw = {
      place_id: 'sample_id',
      name: 'Sample Place',
      photos: [
        {
          photo_reference: 'secret_photo_ref_abc123',
        },
      ],
    };

    const dto = client.normalizeGooglePlace(raw);
    const dtoJson = JSON.stringify(dto);

    assert.equal(dtoJson.includes(apiKey), false);
  });
});
