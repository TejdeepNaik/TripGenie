import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { placeSearchSchema } from '../place.schemas.js';

describe('Place Search Schema Validation', () => {
  test('should apply sensible defaults for pagination', () => {
    const parsed = placeSearchSchema.parse({});
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 12);
  });

  test('should validate search query and filter parameters', () => {
    const input = {
      q: 'Beach',
      category: 'Beaches',
      city: 'Goa',
      minRating: '4.5',
      maxPrice: '2',
      page: '2',
      limit: '20',
    };

    const parsed = placeSearchSchema.parse(input);
    assert.equal(parsed.q, 'Beach');
    assert.equal(parsed.category, 'Beaches');
    assert.equal(parsed.city, 'Goa');
    assert.equal(parsed.minRating, 4.5);
    assert.equal(parsed.maxPrice, 2);
    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 20);
  });

  test('should enforce maximum pagination limit of 50', () => {
    const result = placeSearchSchema.safeParse({ limit: 100 });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.format().limit);
    }
  });

  test('should reject invalid rating or price values', () => {
    const resultRating = placeSearchSchema.safeParse({ minRating: 6 });
    assert.equal(resultRating.success, false);

    const resultPrice = placeSearchSchema.safeParse({ maxPrice: 5 });
    assert.equal(resultPrice.success, false);
  });
});
