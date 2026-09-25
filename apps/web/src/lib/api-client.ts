import type {
  HealthResponse,
  ApiResponse,
  PlaceDTO,
  PlaceSearchQuery,
  PlaceSearchResult,
  ActivityDTO,
  BookingDTO,
  CreateBookingRequest,
  PaymentDTO,
  ProcessPaymentEventRequest,
} from '@tripgenie/types';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN';
  avatarUrl: string | null;
  createdAt: string;
}

export interface TripDayDTO {
  id: string;
  date: string;
  title: string | null;
  note: string | null;
  activities?: ActivityDTO[];
}

export interface TripDTO {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  currency: string;
  status: 'DRAFT' | 'PLANNING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  travelersCount?: number;
  daysCount?: number;
  days?: TripDayDTO[];
}

export interface CreateTripInput {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number | null;
  currency?: string;
  travelers?: number;
  preferences?: string[];
}

export interface CreateActivityInput {
  tripDayId: string;
  placeId?: string | null;
  title: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  estimatedCost?: number | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface UpdateActivityInput {
  title?: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  estimatedCost?: number | null;
  notes?: string | null;
  sortOrder?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Ensure HTTP-only cookies are included
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Failed to connect to backend server.',
      },
    };
  }
}

export const api = {
  getHealth: () => fetchApi<HealthResponse>('/health'),

  auth: {
    me: () => fetchApi<UserDTO>('/auth/me'),
    register: (data: { email: string; name: string; password: string }) =>
      fetchApi<UserDTO>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      fetchApi<UserDTO>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () =>
      fetchApi<{ message: string }>('/auth/logout', {
        method: 'POST',
      }),
  },

  trips: {
    list: () => fetchApi<TripDTO[]>('/trips'),
    create: (data: CreateTripInput) =>
      fetchApi<TripDTO>('/trips', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getById: (tripId: string) => fetchApi<TripDTO>(`/trips/${tripId}`),

    // Activities
    getActivities: (tripId: string) => fetchApi<ActivityDTO[]>(`/trips/${tripId}/activities`),
    createActivity: (tripId: string, data: CreateActivityInput) =>
      fetchApi<ActivityDTO>(`/trips/${tripId}/activities`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateActivity: (tripId: string, activityId: string, data: UpdateActivityInput) =>
      fetchApi<ActivityDTO>(`/trips/${tripId}/activities/${activityId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteActivity: (tripId: string, activityId: string) =>
      fetchApi<{ message: string }>(`/trips/${tripId}/activities/${activityId}`, {
        method: 'DELETE',
      }),
  },

  places: {
    search: (query: PlaceSearchQuery) => {
      const params = new URLSearchParams();
      if (query.q) params.set('q', query.q);
      if (query.category) params.set('category', query.category);
      if (query.city) params.set('city', query.city);
      if (query.minRating !== undefined) params.set('minRating', query.minRating.toString());
      if (query.maxPrice !== undefined) params.set('maxPrice', query.maxPrice.toString());
      if (query.page) params.set('page', query.page.toString());
      if (query.limit) params.set('limit', query.limit.toString());

      const qs = params.toString();
      return fetchApi<PlaceSearchResult>(`/places${qs ? `?${qs}` : ''}`);
    },
    getById: (placeId: string) => fetchApi<PlaceDTO>(`/places/${placeId}`),
    save: (placeId: string) =>
      fetchApi<{ isSaved: boolean }>(`/places/${placeId}/save`, {
        method: 'POST',
      }),
    unsave: (placeId: string) =>
      fetchApi<{ isSaved: boolean }>(`/places/${placeId}/save`, {
        method: 'DELETE',
      }),
    getSaved: () => fetchApi<PlaceDTO[]>('/places/saved'),
  },

  ai: {
    planTrip: (prompt: string) =>
      fetchApi<any>('/ai/trips/plan', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
    executeCommand: (tripId: string, command: string) =>
      fetchApi<any>(`/ai/trips/${tripId}/commands`, {
        method: 'POST',
        body: JSON.stringify({ command }),
      }),
  },

  bookings: {
    list: (status?: string) => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      return fetchApi<BookingDTO[]>(`/bookings${qs}`);
    },
    create: (data: CreateBookingRequest) =>
      fetchApi<BookingDTO>('/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getById: (bookingId: string) => fetchApi<BookingDTO>(`/bookings/${bookingId}`),
    cancel: (bookingId: string) =>
      fetchApi<BookingDTO>(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
      }),
    confirm: (bookingId: string) =>
      fetchApi<BookingDTO>(`/bookings/${bookingId}/confirm`, {
        method: 'POST',
      }),
  },

  payments: {
    createIntent: (bookingId: string, idempotencyKey?: string) =>
      fetchApi<PaymentDTO & { clientSecret?: string; razorpayKeyId?: string }>(
        `/bookings/${bookingId}/payments`,
        {
          method: 'POST',
          body: JSON.stringify({ idempotencyKey }),
        }
      ),
    listByBooking: (bookingId: string) =>
      fetchApi<PaymentDTO[]>(`/bookings/${bookingId}/payments`),
    verifyRazorpay: (data: {
      bookingId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) =>
      fetchApi<PaymentDTO>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    processEvent: (data: ProcessPaymentEventRequest) =>
      fetchApi<PaymentDTO>('/payments/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

};
