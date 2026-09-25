import test from 'node:test';
import assert from 'node:assert/strict';
import { createTripSchema } from '../trip.schemas.js';

test('Trip Creation Schema Validation', async (t) => {
  await t.test('should validate valid trip creation input', () => {
    const valid = {
      title: 'Kyoto Autumn Photography Tour',
      destination: 'Kyoto, Japan',
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-10T00:00:00.000Z',
      budget: 3500,
      currency: 'USD',
      travelers: 2,
    };

    const res = createTripSchema.safeParse(valid);
    assert.equal(res.success, true);
  });

  await t.test('should reject end date earlier than start date', () => {
    const invalidDates = {
      title: 'Backwards Trip',
      destination: 'Paris, France',
      startDate: '2026-12-10T00:00:00.000Z',
      endDate: '2026-12-05T00:00:00.000Z',
    };

    const res = createTripSchema.safeParse(invalidDates);
    assert.equal(res.success, false);
    if (!res.success) {
      const formatted = res.error.format();
      assert.ok(formatted.endDate?._errors.length);
    }
  });

  await t.test('should reject negative budget or 0 travelers', () => {
    const negativeBudget = createTripSchema.safeParse({
      title: 'Budget Test',
      destination: 'Rome, Italy',
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-05T00:00:00.000Z',
      budget: -500,
    });
    assert.equal(negativeBudget.success, false);

    const zeroTravelers = createTripSchema.safeParse({
      title: 'Travelers Test',
      destination: 'Rome, Italy',
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-05T00:00:00.000Z',
      travelers: 0,
    });
    assert.equal(zeroTravelers.success, false);
  });
});
