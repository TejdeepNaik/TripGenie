import { z } from 'zod';
import type { Booking, Place, Trip } from '@prisma/client';
import type { BookingDTO } from '@tripgenie/types';
import { mapPlaceToDTO } from '../places/place.schemas.js';

export const bookingStatusEnum = z.enum([
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'REFUNDED',
  'NO_SHOW',
]);

export const bookingTypeEnum = z.enum([
  'RESTAURANT',
  'ACTIVITY',
  'ATTRACTION',
  'ENTERTAINMENT',
  'RENTAL',
  'OTHER',
]);

export const createBookingSchema = z
  .object({
    tripId: z.string().uuid().nullable().optional(),
    placeId: z.string().uuid().nullable().optional(),
    listingId: z.string().max(100).nullable().optional(),
    bookingType: bookingTypeEnum.default('ACTIVITY'),
    bookingDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid date or ISO date string required for bookingDate',
    }),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:mm format')
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:mm format')
      .nullable()
      .optional(),
    guestCount: z.coerce.number().int().min(1, 'At least 1 guest required').max(50, 'Maximum 50 guests per booking').default(1),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Boolean(data.placeId || data.listingId), {
    message: 'Booking must specify either a valid placeId or listingId.',
    path: ['placeId'],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export function mapBookingToDTO(booking: Booking & { place?: Place | null; trip?: Trip | null }): BookingDTO {
  return {
    id: booking.id,
    userId: booking.userId,
    tripId: booking.tripId,
    placeId: booking.placeId,
    listingId: booking.listingId,
    bookingType: booking.bookingType as any,
    status: booking.status as any,
    bookingDate: booking.bookingDate.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    guestCount: booking.guestCount,
    unitPrice: Number(booking.unitPrice),
    totalAmount: Number(booking.totalAmount),
    currency: booking.currency,
    notes: booking.notes,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    place: booking.place ? mapPlaceToDTO(booking.place) : null,
    trip: booking.trip ? { id: booking.trip.id, title: booking.trip.title } : null,
  };
}
