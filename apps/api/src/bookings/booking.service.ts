import { db } from '../db/prisma.js';
import type { BookingStatus } from '@prisma/client';
import type { BookingDTO } from '@tripgenie/types';
import { CreateBookingInput, mapBookingToDTO } from './booking.schemas.js';
import {
  BookingAvailabilityProvider,
  defaultMockBookingAvailabilityProvider,
} from './booking-availability.provider.js';
import { calculateBookingPricing } from './booking-pricing.service.js';

// Explicit Server-Side Status Transition Matrix
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED', 'NO_SHOW', 'REFUNDED'],
  CANCELLED: [],
  COMPLETED: [],
  REFUNDED: [],
  NO_SHOW: [],
};

export function isValidStatusTransition(from: BookingStatus, to: BookingStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export async function createBookingService(
  input: CreateBookingInput,
  userId: string,
  availabilityProviderOverride?: BookingAvailabilityProvider
): Promise<BookingDTO> {
  const availabilityProvider = availabilityProviderOverride || defaultMockBookingAvailabilityProvider;

  // 1. Bookable Resource Validation: Must specify either placeId or listingId
  if (!input.placeId && !input.listingId) {
    throw new Error('RESOURCE_REQUIRED: Booking must specify either a valid placeId or listingId.');
  }

  // 2. Verify trip membership if tripId is provided
  if (input.tripId) {
    const member = await db.tripMember.findFirst({
      where: {
        tripId: input.tripId,
        userId,
      },
    });

    if (!member) {
      throw new Error('TRIP_UNAUTHORIZED: Referenced trip does not belong to authenticated user.');
    }
  }

  // 3. Verify place exists if placeId is provided
  let place = null;
  if (input.placeId) {
    place = await db.place.findUnique({
      where: { id: input.placeId },
    });

    if (!place) {
      throw new Error('INVALID_PLACE: Referenced place does not exist.');
    }
  }

  const bookingDate = new Date(input.bookingDate);

  // 4. Calculate server-authoritative price snapshot
  const priceSnapshot = calculateBookingPricing(place, input.guestCount);

  // 5. Transactional availability check & atomic booking creation
  const createdBooking = await db.$transaction(async (tx) => {
    // Perform final transactional availability check inside transaction boundary
    const availability = await availabilityProvider.checkAvailability({
      placeId: input.placeId,
      bookingDate,
      startTime: input.startTime,
      guestCount: input.guestCount,
      tx,
    });

    if (!availability.isAvailable) {
      throw new Error(`BOOKING_UNAVAILABLE: ${availability.reason || 'Selected place/time slot is unavailable.'}`);
    }

    return tx.booking.create({
      data: {
        userId,
        tripId: input.tripId || null,
        placeId: input.placeId || null,
        listingId: input.listingId || null,
        bookingType: input.bookingType as any,
        status: 'PENDING_PAYMENT', // Default state; confirmable via POST /bookings/:id/confirm
        bookingDate,
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        guestCount: input.guestCount,
        unitPrice: priceSnapshot.unitPrice,
        totalAmount: priceSnapshot.totalAmount,
        currency: priceSnapshot.currency,
        notes: input.notes || null,
      },
      include: {
        place: true,
        trip: true,
      },
    });
  });

  return mapBookingToDTO(createdBooking);
}

export async function getUserBookingsService(
  userId: string,
  statusFilter?: string
): Promise<BookingDTO[]> {
  const where: any = { userId };
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  const bookings = await db.booking.findMany({
    where,
    include: {
      place: true,
    },
    orderBy: {
      bookingDate: 'desc',
    },
  });

  return bookings.map((b) => mapBookingToDTO(b));
}

export async function getBookingByIdService(
  bookingId: string,
  userId: string
): Promise<BookingDTO> {
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
    include: {
      place: true,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  return mapBookingToDTO(booking);
}

export async function cancelBookingService(
  bookingId: string,
  userId: string
): Promise<BookingDTO> {
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
    include: {
      place: true,
      payments: true,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  const currentStatus = booking.status as BookingStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowed || (!allowed.includes('CANCELLED') && !allowed.includes('REFUNDED'))) {
    throw new Error(`INVALID_STATUS_TRANSITION: Cannot cancel a booking in status "${currentStatus}".`);
  }

  // Check if booking has a succeeded payment
  const succeededPayment = booking.payments.find((p) => p.status === 'SUCCEEDED');

  const updatedBooking = await db.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: succeededPayment ? 'REFUNDED' : 'CANCELLED' },
      include: { place: true },
    });

    if (succeededPayment) {
      const autoRefundKey = `cancel_auto_rfnd_${succeededPayment.id}_${Date.now()}`;
      await tx.refund.create({
        data: {
          paymentId: succeededPayment.id,
          bookingId: booking.id,
          amount: succeededPayment.amount,
          currency: succeededPayment.currency,
          status: 'SUCCEEDED',
          provider: succeededPayment.provider,
          providerRefundId: `auto_rfnd_${Date.now()}`,
          idempotencyKey: autoRefundKey,
          reason: 'Automatic refund upon user booking cancellation',
        },
      });

      await tx.paymentAuditLog.create({
        data: {
          provider: succeededPayment.provider,
          eventType: 'booking.cancelled_auto_refund',
          paymentId: succeededPayment.id,
          bookingId: booking.id,
          status: 'REFUNDED',
          payload: { refundAmount: Number(succeededPayment.amount) },
        },
      });
    }

    return updated;
  });

  return mapBookingToDTO(updatedBooking);
}


export async function updateBookingStatusService(
  bookingId: string,
  targetStatus: BookingStatus,
  userId: string
): Promise<BookingDTO> {
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      userId,
    },
    include: {
      place: true,
    },
  });

  if (!booking) {
    throw new Error('NOT_FOUND: Booking not found or access denied.');
  }

  const currentStatus = booking.status as BookingStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(targetStatus)) {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Invalid status transition from "${currentStatus}" to "${targetStatus}".`
    );
  }

  const updatedBooking = await db.$transaction(async (tx) => {
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: targetStatus },
      include: { place: true },
    });
  });

  return mapBookingToDTO(updatedBooking);
}
