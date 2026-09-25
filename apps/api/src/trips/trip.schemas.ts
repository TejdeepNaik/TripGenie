import { z } from 'zod';

export const createTripSchema = z
  .object({
    title: z
      .string({ required_error: 'Trip title is required' })
      .trim()
      .min(2, 'Title must be at least 2 characters long')
      .max(120, 'Title cannot exceed 120 characters'),
    destination: z
      .string({ required_error: 'Destination is required' })
      .trim()
      .min(2, 'Destination must be at least 2 characters long')
      .max(150, 'Destination cannot exceed 150 characters'),
    startDate: z
      .string({ required_error: 'Start date is required' })
      .datetime({ message: 'Start date must be a valid ISO date string' }),
    endDate: z
      .string({ required_error: 'End date is required' })
      .datetime({ message: 'End date must be a valid ISO date string' }),
    budget: z
      .number()
      .min(0, 'Budget cannot be negative')
      .optional()
      .nullable(),
    currency: z.string().default('USD'),
    travelers: z.number().int().min(1, 'At least 1 traveler is required').max(100).default(1),
    preferences: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date cannot be earlier than start date',
      path: ['endDate'],
    }
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;

export interface TripResponseDTO {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  travelersCount?: number;
  daysCount?: number;
  days?: {
    id: string;
    date: string;
    title: string | null;
    note: string | null;
    activities?: import('@tripgenie/types').ActivityDTO[];
  }[];
}
