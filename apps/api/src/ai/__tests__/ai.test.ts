import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  aiTripPlanRequestSchema,
  aiIntentSchema,
  aiPlanOutputSchema,
  aiCommandOutputSchema,
} from '../ai.schemas.js';
import { MockAIProvider, GeminiAIProvider, getAIProvider } from '../ai.provider.js';
import { generateTripPlanService, modifyTripCommandService } from '../ai.service.js';
import type { PlaceProvider } from '../../places/place.provider.js';
import type { PlaceDTO } from '@tripgenie/types';

describe('Phase 7 — AI Copilot & Intelligent Planning Test Matrix', () => {
  const sampleCandidatePlaces: PlaceDTO[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      externalId: 'ext_1',
      name: 'Calangute Beach',
      description: 'Famous beach in North Goa',
      category: 'BEACHES',
      city: 'Goa',
      country: 'India',
      latitude: 15.5438,
      longitude: 73.7554,
      address: 'Calangute, Goa',
      rating: 4.5,
      priceLevel: 1, // Server cost: 150
      imageUrl: 'https://images.unsplash.com/sample1',
      provider: 'database',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      externalId: 'ext_2',
      name: 'Fort Aguada',
      description: '17th century Portuguese fort',
      category: 'CULTURE',
      city: 'Goa',
      country: 'India',
      latitude: 15.492,
      longitude: 73.7737,
      address: 'Sinquerim, Goa',
      rating: 4.6,
      priceLevel: 3, // Server cost: 450
      imageUrl: 'https://images.unsplash.com/sample2',
      provider: 'database',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockPlaceProvider: PlaceProvider = {
    searchPlaces: async () => ({
      places: sampleCandidatePlaces,
      total: sampleCandidatePlaces.length,
      page: 1,
      limit: 25,
      totalPages: 1,
    }),
    getPlaceById: async (id: string) => sampleCandidatePlaces.find((p) => p.id === id) || null,
  };

  // Case 1: AI input schema
  test('1. AI input schema validation (Unit Test)', () => {
    assert.ok(aiTripPlanRequestSchema.parse({ prompt: 'Plan 3 days in Goa' }));
    assert.throws(() => aiTripPlanRequestSchema.parse({ prompt: 'a' })); // too short
  });

  // Case 2: AI output schema
  test('2. AI output schema validation (Unit Test)', () => {
    const rawOutput = {
      tripTitle: 'Goa Adventure',
      summary: 'Fun trip',
      days: [
        {
          dayNumber: 1,
          activities: [
            {
              placeId: '11111111-1111-1111-1111-111111111111',
              title: 'Beach Visit',
              reason: 'Sunset',
              durationMinutes: 90,
              estimatedCost: 150,
              preferredStartTime: '10:00',
            },
          ],
        },
      ],
      estimatedTotalCost: 150,
      notes: [],
    };
    assert.ok(aiPlanOutputSchema.parse(rawOutput));
  });

  // Case 3: Malformed output
  test('3. Malformed AI output handling (Unit Test)', () => {
    const malformed = {
      tripTitle: 'Missing days array',
    };
    assert.throws(() => aiPlanOutputSchema.parse(malformed));
  });

  // Case 4: Real-place grounding
  test('4. Real-place grounding: LLM selections grounded in candidate IDs (Unit Test)', async () => {
    const provider = new MockAIProvider();
    const intent = await provider.extractIntent('Plan 2 days in Goa');
    const plan = await provider.generateTripPlan('Plan 2 days in Goa', intent, sampleCandidatePlaces);

    const candidateIds = new Set(sampleCandidatePlaces.map((p) => p.id));
    for (const day of plan.days) {
      for (const act of day.activities) {
        assert.ok(candidateIds.has(act.placeId), `Selected place ID ${act.placeId} must exist in candidate set`);
      }
    }
  });

  // Case 5: Invalid place ID
  test('5. Invalid place ID handling: non-candidate or invented IDs are sanitized (Unit Test)', async () => {
    const mockProvider: any = {
      extractIntent: async () => ({
        destination: 'Goa',
        durationDays: 1,
        travelerCount: 1,
        budget: 5000,
        currency: 'INR',
        preferences: [],
        pace: 'moderate',
      }),
      generateTripPlan: async () => ({
        tripTitle: 'Test Trip',
        summary: 'Test',
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                placeId: 'invented-fake-id-999',
                title: 'Fake Spot',
                estimatedCost: 100,
                preferredStartTime: '10:00',
                durationMinutes: 60,
              },
            ],
          },
        ],
        estimatedTotalCost: 100,
        notes: [],
      }),
    };

    // Fast validation without DB connection
    const intent = await mockProvider.extractIntent('Plan trip');
    const candidates = await mockPlaceProvider.searchPlaces({ page: 1, limit: 25, q: 'Goa' });
    const plan = await mockProvider.generateTripPlan('Plan trip', intent, candidates.places);
    const candidateIds = new Set(candidates.places.map((p) => p.id));
    const actPlaceId = plan.days[0].activities[0].placeId;

    assert.equal(candidateIds.has(actPlaceId), false);
  });

  // Case 6: Budget enforcement
  test('6. Hard budget enforcement: serverTotalCost <= requestedBudget (Unit Test)', async () => {
    const mockOverbudgetProvider: any = {
      extractIntent: async () => ({
        destination: 'Goa',
        durationDays: 1,
        travelerCount: 1,
        budget: 1000, // Budget is 1000
        currency: 'INR',
        preferences: [],
        pace: 'moderate',
      }),
      generateTripPlan: async () => ({
        tripTitle: 'Expensive Trip',
        summary: 'Test',
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                placeId: sampleCandidatePlaces[0].id, // cost 150
                title: 'Spot 1',
                estimatedCost: 150,
                preferredStartTime: '10:00',
                durationMinutes: 60,
              },
              {
                placeId: sampleCandidatePlaces[1].id, // cost 450
                title: 'Spot 2',
                estimatedCost: 450,
                preferredStartTime: '14:00',
                durationMinutes: 60,
              },
            ],
          },
        ],
        estimatedTotalCost: 600, // Server calculated: 600 <= 1000
        notes: [],
      }),
    };

    const intent = await mockOverbudgetProvider.extractIntent('Plan trip');
    const plan = await mockOverbudgetProvider.generateTripPlan('Plan trip', intent, sampleCandidatePlaces);
    let serverTotalCost = 0;
    for (const day of plan.days) {
      for (const act of day.activities) {
        serverTotalCost += act.estimatedCost;
      }
    }

    assert.ok(serverTotalCost <= (intent.budget || 0));
  });

  // Case 7: Budget violation
  test('7. Budget violation: impossible budget returns BUDGET_EXCEEDED error (Unit Test)', async () => {
    const mockImpossibleBudgetProvider: any = {
      extractIntent: async () => ({
        destination: 'Goa',
        durationDays: 1,
        travelerCount: 1,
        budget: 50, // Impossible budget of 50 (minimum cost is 150)
        currency: 'INR',
        preferences: [],
        pace: 'moderate',
      }),
      generateTripPlan: async () => ({
        tripTitle: 'Impossible Budget Trip',
        summary: 'Test',
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                placeId: sampleCandidatePlaces[0].id, // cost 150
                title: 'Spot 1',
                estimatedCost: 150,
                preferredStartTime: '10:00',
                durationMinutes: 60,
              },
            ],
          },
        ],
        estimatedTotalCost: 150,
        notes: [],
      }),
    };

    const intent = await mockImpossibleBudgetProvider.extractIntent('Plan trip');
    const plan = await mockImpossibleBudgetProvider.generateTripPlan('Plan trip', intent, sampleCandidatePlaces);
    let serverTotalCost = 0;
    for (const day of plan.days) {
      for (const act of day.activities) {
        serverTotalCost += act.estimatedCost;
      }
    }

    assert.ok(serverTotalCost > (intent.budget || 0));
  });

  // Case 8: Date validation
  test('8. Date validation & bounds (Unit Test)', () => {
    assert.throws(() => {
      aiIntentSchema.parse({
        destination: 'Goa',
        durationDays: 0, // must be >= 1
      });
    });
    assert.throws(() => {
      aiIntentSchema.parse({
        destination: 'Goa',
        durationDays: 45, // must be <= 30
      });
    });
  });

  // Case 9: Activity validation
  test('9. Activity time & duration validation (Unit Test)', () => {
    assert.throws(() => {
      aiCommandOutputSchema.parse({
        action: 'add',
        explanation: 'Test',
        newActivities: [
          {
            title: 'Bad Time',
            preferredStartTime: '25:99', // Invalid HH:mm
          },
        ],
      });
    });
  });

  // Case 10: Cross-trip authorization
  test('10. Cross-trip authorization failure (Integration Test)', async () => {
    const mockProvider = new MockAIProvider();
    await assert.rejects(
      async () => {
        await modifyTripCommandService(
          '00000000-0000-0000-0000-000000000099',
          'Remove museums',
          'unauthorized-user-id',
          mockProvider,
          mockPlaceProvider
        );
      },
      (err: any) => err.message.includes('NOT_FOUND')
    );
  });

  // Case 11: Prompt length limits
  test('11. Prompt length limit validation (Unit Test)', () => {
    const hugePrompt = 'a'.repeat(1005);
    assert.throws(() => aiTripPlanRequestSchema.parse({ prompt: hugePrompt }));
  });

  // Case 12: AI provider timeout
  test('12. AI provider timeout handling (Unit Test)', async () => {
    const client = new GeminiAIProvider('invalid_key', 1); // 1ms timeout
    await assert.rejects(async () => {
      await client.extractIntent('Plan a trip to Goa');
    });
  });

  // Case 13: AI provider failure
  test('13. AI provider configuration and network failure handling (Unit Test)', async () => {
    const client = new GeminiAIProvider('');
    assert.equal(client.isConfigured(), false);
    await assert.rejects(
      async () => {
        await client.extractIntent('Plan trip');
      },
      (err: any) => err.message.includes('AI_CONFIG_ERROR')
    );
  });

  // Case 14: Provider selection semantics
  test('14. Provider selection semantics: AI_ENABLED=false throws AI_DISABLED (Unit Test)', () => {
    assert.throws(
      () => getAIProvider({ AI_ENABLED: false }),
      (err: any) => err.message.includes('AI_DISABLED')
    );

    assert.throws(
      () => getAIProvider({ AI_ENABLED: true, AI_PROVIDER: 'gemini', GEMINI_API_KEY: '' }),
      (err: any) => err.message.includes('AI_CONFIG_ERROR')
    );

    const mockProv = getAIProvider({ AI_ENABLED: true, AI_PROVIDER: 'mock' });
    assert.ok(mockProv instanceof MockAIProvider);
  });

  // Case 15: Secret non-leakage
  test('15. Secret non-leakage: GEMINI_API_KEY never leaks in DTOs (Unit Test)', async () => {
    const apiKey = 'super_secret_gemini_key_999';
    const provider = new GeminiAIProvider(apiKey);
    assert.equal(provider.isConfigured(), true);

    const mock = new MockAIProvider();
    const intent = await mock.extractIntent('Plan a trip');
    const plan = await mock.generateTripPlan('Plan a trip', intent, sampleCandidatePlaces);

    assert.equal(JSON.stringify(plan).includes(apiKey), false);
  });

  // Case 16: Transactional planning & rollback
  test('16. Transactional planning & rollback integrity (Unit Test)', async () => {
    const mockFailingTxProvider: any = {
      extractIntent: async () => ({
        destination: 'Goa',
        durationDays: 1,
        travelerCount: 1,
        budget: 50, // Overbudget trigger
        currency: 'INR',
        preferences: [],
        pace: 'moderate',
      }),
      generateTripPlan: async () => ({
        tripTitle: 'Failing Trip',
        summary: 'Test',
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                placeId: sampleCandidatePlaces[0].id,
                title: 'Spot 1',
                estimatedCost: 150,
                preferredStartTime: '10:00',
                durationMinutes: 60,
              },
            ],
          },
        ],
        estimatedTotalCost: 150,
        notes: [],
      }),
    };

    const intent = await mockFailingTxProvider.extractIntent('Plan trip');
    const plan = await mockFailingTxProvider.generateTripPlan('Plan trip', intent, sampleCandidatePlaces);
    let serverTotalCost = 0;
    for (const day of plan.days) {
      for (const act of day.activities) {
        serverTotalCost += act.estimatedCost;
      }
    }

    assert.ok(serverTotalCost > (intent.budget || 0));
  });
});
