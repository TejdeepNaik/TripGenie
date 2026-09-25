import { db } from '../db/prisma.js';

export interface AvailabilityCheckInput {
  placeId?: string | null;
  bookingDate: Date;
  startTime?: string | null;
  guestCount?: number;
  tx?: any;
}

export interface BookingAvailabilityProvider {
  checkAvailability(input: AvailabilityCheckInput): Promise<{ isAvailable: boolean; reason?: string }>;
}

export class MockBookingAvailabilityProvider implements BookingAvailabilityProvider {
  private maxSlotCapacity: number;

  constructor(maxSlotCapacity: number = 5) {
    this.maxSlotCapacity = maxSlotCapacity;
  }

  async checkAvailability(input: AvailabilityCheckInput): Promise<{ isAvailable: boolean; reason?: string }> {
    if (!input.placeId) {
      return { isAvailable: true };
    }

    const startOfDay = new Date(input.bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(input.bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const prismaClient = input.tx || db;

    // Count existing active reservations for this place on the target date/time inside transaction context
    let existingCount = 0;
    try {
      existingCount = await prismaClient.booking.count({
        where: {
          placeId: input.placeId,
          bookingDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          startTime: input.startTime || undefined,
          status: {
            in: ['PENDING_PAYMENT', 'CONFIRMED'],
          },
        },
      });
    } catch {
      existingCount = 0;
    }

    if (existingCount >= this.maxSlotCapacity) {
      return {
        isAvailable: false,
        reason: `Selected time slot on ${startOfDay.toISOString().split('T')[0]} has reached maximum booking capacity (${this.maxSlotCapacity} reservations).`,
      };
    }

    return { isAvailable: true };
  }

  async reserveSlot(input: AvailabilityCheckInput): Promise<boolean> {
    const res = await this.checkAvailability(input);
    if (res.isAvailable) {
      this.maxSlotCapacity = Math.max(0, this.maxSlotCapacity - (input.guestCount || 1));
      return true;
    }
    return false;
  }
}

export const defaultMockBookingAvailabilityProvider = new MockBookingAvailabilityProvider();
