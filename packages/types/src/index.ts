export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
}

export interface PlaceDTO {
  id: string;
  externalId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  rating: number | null;
  priceLevel: number | null;
  imageUrl: string | null;
  metadata?: Record<string, any> | null;
  provider?: string | null;
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
}

export interface PlaceSearchQuery {
  q?: string;
  category?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface PlaceSearchResult {
  places: PlaceDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityDTO {
  id: string;
  tripDayId: string;
  placeId: string | null;
  place?: PlaceDTO | null;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  estimatedCost: number | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AITripPlanRequest {
  prompt: string;
}

export interface AITripCommandRequest {
  command: string;
}

export interface AITripPlanResponse {
  tripId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  currency: string;
  summary: string;
  estimatedTotalCost: number;
  daysCount: number;
  activitiesCount: number;
  explanation?: string;
}

export interface AICopilotCommandResponse {
  tripId: string;
  appliedAction: string;
  explanation: string;
  activitiesUpdatedCount: number;
  trip: any;
}

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'REFUNDED'
  | 'NO_SHOW';

export type BookingType =
  | 'RESTAURANT'
  | 'ACTIVITY'
  | 'ATTRACTION'
  | 'ENTERTAINMENT'
  | 'RENTAL'
  | 'OTHER';

export interface BookingDTO {
  id: string;
  userId: string;
  tripId: string | null;
  placeId: string | null;
  listingId: string | null;
  bookingType: BookingType;
  status: BookingStatus;
  bookingDate: string;
  startTime: string | null;
  endTime: string | null;
  guestCount: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  place?: PlaceDTO | null;
  trip?: { id: string; title: string } | null;
}

export interface CreateBookingRequest {
  tripId?: string | null;
  placeId?: string | null;
  listingId?: string | null;
  bookingType?: BookingType;
  bookingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  guestCount?: number;
  notes?: string | null;
}

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type PaymentProviderType = 'MOCK' | 'STRIPE' | 'RAZORPAY';

export interface PaymentDTO {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProviderType;
  providerPaymentId: string | null;
  idempotencyKey: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentIntentRequest {
  idempotencyKey?: string;
}

export interface ProcessPaymentEventRequest {
  eventId?: string;
  providerPaymentId: string;
  eventType: 'payment.succeeded' | 'payment.failed' | 'payment.cancelled';
  failureReason?: string;
}

export interface VerifyRazorpayPaymentRequest {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export type RefundStatus =
  | 'CREATED'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface RefundDTO {
  id: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  provider: PaymentProviderType;
  providerRefundId: string | null;
  idempotencyKey: string;
  reason: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRefundRequest {
  paymentId?: string;
  amount?: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface ReconciliationResult {
  paymentId: string;
  bookingId: string;
  status: 'MATCHED' | 'DISCREPANCY_DETECTED' | 'SYNCED' | 'ERROR';
  dbPaymentStatus: PaymentStatus;
  providerPaymentStatus: string;
  dbBookingStatus: BookingStatus;
  discrepancyReason?: string;
  resolvedStatus?: PaymentStatus;
}

export interface AuditLogDTO {
  id: string;
  provider: PaymentProviderType;
  providerEventId: string | null;
  eventType: string;
  paymentId: string | null;
  refundId: string | null;
  bookingId: string | null;
  status: string;
  createdAt: string;
}




