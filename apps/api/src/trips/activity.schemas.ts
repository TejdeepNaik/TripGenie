import { z } from 'zod';
import type { Activity, Place } from '@prisma/client';
import type { ActivityDTO } from '@tripgenie/types';
import { mapPlaceToDTO } from '../places/place.schemas.js';

export const createActivitySchema = z
  .object({
    tripDayId: z.string().uuid({ message: 'Valid tripDayId is required' }),
    placeId: z.string().uuid().nullable().optional(),
    title: z.string().min(1, 'Title is required').max(120, 'Title cannot exceed 120 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:mm format (e.g., 09:30)')
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:mm format (e.g., 11:30)')
      .nullable()
      .optional(),
    durationMinutes: z.number().int().positive('Duration must be greater than 0').nullable().optional(),
    estimatedCost: z.number().min(0, 'Estimated cost cannot be negative').nullable().optional(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime >= data.startTime;
      }
      return true;
    },
    {
      message: 'End time cannot precede start time',
      path: ['endTime'],
    }
  );

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
    estimatedCost: z.number().min(0).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime >= data.startTime;
      }
      return true;
    },
    {
      message: 'End time cannot precede start time',
      path: ['endTime'],
    }
  );

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export function mapActivityToDTO(activity: Activity & { place?: Place | null }): ActivityDTO {
  return {
    id: activity.id,
    tripDayId: activity.tripDayId,
    placeId: activity.placeId,
    place: activity.place ? mapPlaceToDTO(activity.place) : null,
    title: activity.title,
    description: activity.description,
    startTime: activity.startTime,
    endTime: activity.endTime,
    durationMinutes: activity.durationMinutes,
    estimatedCost: activity.estimatedCost ? Number(activity.estimatedCost) : null,
    notes: activity.notes,
    sortOrder: activity.sortOrder,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}
