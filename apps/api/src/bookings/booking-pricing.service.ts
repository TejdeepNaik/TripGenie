import type { Place } from '@prisma/client';

export interface BookingPriceSnapshot {
  unitPrice: number;
  totalAmount: number;
  currency: string;
}

export function calculateBookingPricing(
  place: Place | null,
  guestCount: number = 1
): BookingPriceSnapshot {
  const count = Math.max(1, guestCount);

  // Server-authoritative base unit price calculation derived from place data
  let baseUnitPrice = 25.0; // Default base price
  if (place?.priceLevel) {
    baseUnitPrice = place.priceLevel * 25.0;
  }

  const totalAmount = Number((baseUnitPrice * count).toFixed(2));

  return {
    unitPrice: baseUnitPrice,
    totalAmount,
    currency: 'USD',
  };
}
