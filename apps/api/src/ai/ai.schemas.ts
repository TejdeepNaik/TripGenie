import { z } from 'zod';

export const aiTripPlanRequestSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters long').max(1000, 'Prompt too long'),
});

export const aiTripCommandRequestSchema = z.object({
  command: z.string().min(2, 'Command must be at least 2 characters long').max(500, 'Command too long'),
});

export const aiIntentSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  durationDays: z.number().int().min(1).max(30).default(3),
  travelerCount: z.number().int().min(1).max(20).default(1),
  budget: z.number().min(0).nullable().optional(),
  currency: z.string().default('INR'),
  preferences: z.array(z.string()).default([]),
  pace: z.enum(['relaxed', 'moderate', 'packed']).default('moderate'),
  tripTitle: z.string().optional(),
});

export type AIIntent = z.infer<typeof aiIntentSchema>;

export const aiPlanActivitySelectionSchema = z.object({
  placeId: z.string().min(1, 'Place ID is required'),
  title: z.string().min(1),
  reason: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().default(90),
  estimatedCost: z.number().min(0).default(0),
  preferredStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default('10:00'),
});

export const aiPlanDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  activities: z.array(aiPlanActivitySelectionSchema),
});

export const aiPlanOutputSchema = z.object({
  tripTitle: z.string().min(1),
  summary: z.string(),
  days: z.array(aiPlanDaySchema),
  estimatedTotalCost: z.number().min(0),
  notes: z.array(z.string()).default([]),
});

export type AIPlanOutput = z.infer<typeof aiPlanOutputSchema>;

export const aiCommandOutputSchema = z.object({
  action: z.enum(['add', 'remove', 'modify', 'reorder', 'budget_adjust', 'general']),
  explanation: z.string(),
  targetDayIndex: z.number().int().nullable().optional(),
  removeActivityIds: z.array(z.string()).default([]),
  newActivities: z
    .array(
      z.object({
        placeId: z.string().nullable().optional(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        preferredStartTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .nullable()
          .optional(),
        durationMinutes: z.number().int().positive().default(90),
        estimatedCost: z.number().min(0).default(0),
        notes: z.string().nullable().optional(),
      })
    )
    .default([]),
  newBudget: z.number().min(0).nullable().optional(),
});

export type AICommandOutput = z.infer<typeof aiCommandOutputSchema>;
