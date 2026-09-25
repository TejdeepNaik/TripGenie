import type { PlaceDTO } from '@tripgenie/types';
import {
  AIIntent,
  AIPlanOutput,
  AICommandOutput,
  aiIntentSchema,
  aiPlanOutputSchema,
  aiCommandOutputSchema,
} from './ai.schemas.js';

export interface AIProvider {
  isConfigured(): boolean;
  extractIntent(prompt: string): Promise<AIIntent>;
  generateTripPlan(prompt: string, intent: AIIntent, candidatePlaces: PlaceDTO[]): Promise<AIPlanOutput>;
  interpretTripCommand(
    command: string,
    currentTripContext: any,
    candidatePlaces: PlaceDTO[]
  ): Promise<AICommandOutput>;
}

export class GeminiAIProvider implements AIProvider {
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey?: string, timeoutMs: number = 10000) {
    this.apiKey = apiKey || '';
    this.timeoutMs = timeoutMs;
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  private async callGemini(systemInstruction: string, userPrompt: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AI_CONFIG_ERROR: Gemini API key is missing or unconfigured.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUser Request: ${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API HTTP Error: ${response.status}`);
      }

      const data: any = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini returned an empty content response.');
      }
      return rawText;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async extractIntent(prompt: string): Promise<AIIntent> {
    const systemInstruction = `You are a travel intent extractor. Analyze the user prompt and extract destination, duration in days, traveler count, budget, currency, preferences, pace, and a trip title. Return ONLY valid JSON matching this schema:
{
  "destination": "Goa",
  "durationDays": 3,
  "travelerCount": 2,
  "budget": 30000,
  "currency": "INR",
  "preferences": ["beaches", "cafes"],
  "pace": "moderate",
  "tripTitle": "Goa Getaway"
}`;

    const raw = await this.callGemini(systemInstruction, prompt);
    const parsed = JSON.parse(raw);
    return aiIntentSchema.parse(parsed);
  }

  async generateTripPlan(
    prompt: string,
    intent: AIIntent,
    candidatePlaces: PlaceDTO[]
  ): Promise<AIPlanOutput> {
    const candidateSummary = candidatePlaces.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      city: p.city,
      rating: p.rating,
      priceLevel: p.priceLevel,
    }));

    const systemInstruction = `You are TripGenie AI Copilot. Build an itinerary for ${intent.destination} for ${intent.durationDays} days.
CRITICAL MANDATE: You MUST ONLY use placeId values from the provided CANDIDATE PLACES array. Do NOT invent new placeId UUIDs under any circumstances!

CANDIDATE PLACES:
${JSON.stringify(candidateSummary, null, 2)}

Return ONLY valid JSON matching this structure:
{
  "tripTitle": "${intent.tripTitle || `${intent.destination} Adventure`}",
  "summary": "High-level summary of the trip itinerary",
  "days": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "placeId": "EXACT_ID_FROM_CANDIDATES",
          "title": "Activity Name",
          "reason": "Why this fits the user's trip preferences",
          "durationMinutes": 90,
          "estimatedCost": 200,
          "preferredStartTime": "10:00"
        }
      ]
    }
  ],
  "estimatedTotalCost": 600,
  "notes": ["Remember to pack sunscreen"]
}`;

    const raw = await this.callGemini(systemInstruction, prompt);
    const parsed = JSON.parse(raw);
    return aiPlanOutputSchema.parse(parsed);
  }

  async interpretTripCommand(
    command: string,
    currentTripContext: any,
    candidatePlaces: PlaceDTO[]
  ): Promise<AICommandOutput> {
    const candidateSummary = candidatePlaces.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      priceLevel: p.priceLevel,
    }));

    const systemInstruction = `You are TripGenie AI Copilot modifying an itinerary.
CURRENT TRIP CONTEXT:
${JSON.stringify(currentTripContext, null, 2)}

AVAILABLE CANDIDATE PLACES TO ADD (use exact id if adding):
${JSON.stringify(candidateSummary, null, 2)}

Return ONLY valid JSON matching this structure:
{
  "action": "remove" | "add" | "modify" | "reorder" | "budget_adjust" | "general",
  "explanation": "Clear human-readable explanation of what was modified",
  "targetDayIndex": 1,
  "removeActivityIds": ["activity_uuid_to_remove"],
  "newActivities": [
    {
      "placeId": "EXACT_ID_FROM_CANDIDATES_OR_NULL",
      "title": "New Activity Name",
      "description": "Short details",
      "preferredStartTime": "14:00",
      "durationMinutes": 60,
      "estimatedCost": 150,
      "notes": "Tips"
    }
  ],
  "newBudget": 20000
}`;

    const raw = await this.callGemini(systemInstruction, command);
    const parsed = JSON.parse(raw);
    return aiCommandOutputSchema.parse(parsed);
  }
}

export class MockAIProvider implements AIProvider {
  public isConfigured(): boolean {
    return true;
  }

  async extractIntent(prompt: string): Promise<AIIntent> {
    const lower = prompt.toLowerCase();
    let destination = 'Goa';
    if (lower.includes('jaipur')) destination = 'Jaipur';
    if (lower.includes('tokyo')) destination = 'Tokyo';
    if (lower.includes('paris')) destination = 'Paris';
    if (lower.includes('manali')) destination = 'Manali';

    let durationDays = 3;
    const dayMatch = lower.match(/(\d+)\s*day/);
    if (dayMatch) {
      durationDays = Math.min(30, Math.max(1, parseInt(dayMatch[1], 10)));
    }

    let budget: number | null = null;
    const budgetMatch = lower.match(/(?:₹|rs|inr|\$)\s*([\d,]+)/i);
    if (budgetMatch) {
      budget = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    }

    const preferences: string[] = [];
    if (lower.includes('beach')) preferences.push('Beaches');
    if (lower.includes('cafe') || lower.includes('food')) preferences.push('Food');
    if (lower.includes('nightlife') || lower.includes('party')) preferences.push('Nightlife');
    if (lower.includes('fort') || lower.includes('culture') || lower.includes('history')) preferences.push('Culture');

    return aiIntentSchema.parse({
      destination,
      durationDays,
      travelerCount: 2,
      budget,
      currency: 'INR',
      preferences,
      pace: lower.includes('relaxed') ? 'relaxed' : 'moderate',
      tripTitle: `${destination} Explorer`,
    });
  }

  async generateTripPlan(
    prompt: string,
    intent: AIIntent,
    candidatePlaces: PlaceDTO[]
  ): Promise<AIPlanOutput> {
    const days = [];
    const placesPerDay = Math.max(1, Math.floor(candidatePlaces.length / intent.durationDays)) || 1;

    for (let d = 1; d <= intent.durationDays; d++) {
      const dayActivities = [];
      const startIdx = ((d - 1) * placesPerDay) % Math.max(1, candidatePlaces.length);

      for (let i = 0; i < Math.min(2, candidatePlaces.length); i++) {
        const place = candidatePlaces[(startIdx + i) % candidatePlaces.length];
        if (place) {
          dayActivities.push({
            placeId: place.id,
            title: place.name,
            reason: `Highly rated ${place.category || 'destination'} in ${place.city || intent.destination}`,
            durationMinutes: 90,
            estimatedCost: place.priceLevel ? place.priceLevel * 150 : 200,
            preferredStartTime: i === 0 ? '10:00' : '14:30',
          });
        }
      }

      days.push({
        dayNumber: d,
        activities: dayActivities,
      });
    }

    const estimatedTotalCost = days.reduce(
      (sum, day) => sum + day.activities.reduce((dSum, act) => dSum + act.estimatedCost, 0),
      0
    );

    return aiPlanOutputSchema.parse({
      tripTitle: `${intent.destination} Custom Itinerary`,
      summary: `Tailored ${intent.durationDays}-day journey exploring the best of ${intent.destination}.`,
      days,
      estimatedTotalCost,
      notes: ['Check opening hours in advance.', 'Keep local currency for small vendors.'],
    });
  }

  async interpretTripCommand(
    command: string,
    currentTripContext: any,
    candidatePlaces: PlaceDTO[]
  ): Promise<AICommandOutput> {
    const lower = command.toLowerCase();

    if (lower.includes('cheaper') || lower.includes('cheap')) {
      return aiCommandOutputSchema.parse({
        action: 'modify',
        explanation: 'Adjusted estimated costs for upcoming activities to optimize your budget.',
        targetDayIndex: 1,
        removeActivityIds: [],
        newActivities: [],
        newBudget: currentTripContext.budget ? Math.round(currentTripContext.budget * 0.85) : undefined,
      });
    }

    if (lower.includes('remove') || lower.includes('delete') || lower.includes('museum')) {
      const firstActivityId = currentTripContext.days?.[0]?.activities?.[0]?.id;
      return aiCommandOutputSchema.parse({
        action: 'remove',
        explanation: 'Removed requested activity from your itinerary.',
        targetDayIndex: 1,
        removeActivityIds: firstActivityId ? [firstActivityId] : [],
        newActivities: [],
      });
    }

    if (lower.includes('add') || lower.includes('nightlife') || lower.includes('fun')) {
      const place = candidatePlaces[0];
      return aiCommandOutputSchema.parse({
        action: 'add',
        explanation: `Added ${place ? place.name : 'new highlight spot'} to Day 1.`,
        targetDayIndex: 1,
        removeActivityIds: [],
        newActivities: [
          {
            placeId: place?.id || null,
            title: place ? place.name : 'Evening Local Experience',
            description: 'Recommended local highlight',
            preferredStartTime: '19:00',
            durationMinutes: 120,
            estimatedCost: place?.priceLevel ? place.priceLevel * 200 : 300,
            notes: 'Great evening atmosphere',
          },
        ],
      });
    }

    return aiCommandOutputSchema.parse({
      action: 'general',
      explanation: 'Reviewed itinerary constraints and verified schedule timeline.',
      targetDayIndex: 1,
      removeActivityIds: [],
      newActivities: [],
    });
  }
}

export function getAIProvider(customEnv?: {
  AI_ENABLED?: boolean;
  AI_PROVIDER?: 'gemini' | 'mock';
  GEMINI_API_KEY?: string;
}): AIProvider {
  const isEnabled = customEnv !== undefined && customEnv.AI_ENABLED !== undefined
    ? customEnv.AI_ENABLED
    : process.env.AI_ENABLED === 'true' || process.env.AI_ENABLED === '1';

  if (!isEnabled) {
    throw new Error('AI_DISABLED: AI trip planning service is currently disabled.');
  }

  const providerType = customEnv?.AI_PROVIDER || (process.env.AI_PROVIDER as any) || 'gemini';
  const apiKey = customEnv ? customEnv.GEMINI_API_KEY : process.env.GEMINI_API_KEY;

  if (providerType === 'gemini') {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('AI_CONFIG_ERROR: Gemini API key is missing or unconfigured.');
    }
    return new GeminiAIProvider(apiKey);
  }

  if (providerType === 'mock') {
    return new MockAIProvider();
  }

  throw new Error(`AI_CONFIG_ERROR: Unsupported AI provider "${providerType}".`);
}
