import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createActivitySchema, updateActivitySchema } from '../activity.schemas.js';

describe('Activity Schema Validation & Security Rules', () => {
  const validTripDayId = '11111111-1111-1111-1111-111111111111';
  const validPlaceId = '22222222-2222-2222-2222-222222222222';

  test('should validate valid activity creation input', () => {
    const input = {
      tripDayId: validTripDayId,
      placeId: validPlaceId,
      title: 'Baga Beach Surfing',
      description: 'Morning surfing session',
      startTime: '09:00',
      endTime: '11:00',
      durationMinutes: 120,
      estimatedCost: 25.5,
      notes: 'Bring sunscreen',
      sortOrder: 1,
    };

    const parsed = createActivitySchema.parse(input);
    assert.equal(parsed.title, 'Baga Beach Surfing');
    assert.equal(parsed.tripDayId, validTripDayId);
    assert.equal(parsed.startTime, '09:00');
    assert.equal(parsed.endTime, '11:00');
    assert.equal(parsed.durationMinutes, 120);
    assert.equal(parsed.estimatedCost, 25.5);
  });

  test('should reject activity when end time precedes start time', () => {
    const input = {
      tripDayId: validTripDayId,
      title: 'Invalid Time Activity',
      startTime: '14:00',
      endTime: '10:00',
    };

    const result = createActivitySchema.safeParse(input);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.format().endTime);
    }
  });

  test('should reject negative cost or non-positive duration', () => {
    const negativeCost = createActivitySchema.safeParse({
      tripDayId: validTripDayId,
      title: 'Sample Activity',
      estimatedCost: -50,
    });
    assert.equal(negativeCost.success, false);

    const zeroDuration = createActivitySchema.safeParse({
      tripDayId: validTripDayId,
      title: 'Sample Activity',
      durationMinutes: 0,
    });
    assert.equal(zeroDuration.success, false);
  });

  test('should validate invalid time string formats', () => {
    const badTime = createActivitySchema.safeParse({
      tripDayId: validTripDayId,
      title: 'Sample Activity',
      startTime: '25:99',
    });
    assert.equal(badTime.success, false);
  });

  test('should validate activity update schema', () => {
    const updateInput = {
      title: 'Updated Beach Sunset Walk',
      startTime: '17:30',
      endTime: '18:30',
      estimatedCost: 0,
    };

    const parsed = updateActivitySchema.parse(updateInput);
    assert.equal(parsed.title, 'Updated Beach Sunset Walk');
    assert.equal(parsed.startTime, '17:30');
    assert.equal(parsed.endTime, '18:30');
  });
});
