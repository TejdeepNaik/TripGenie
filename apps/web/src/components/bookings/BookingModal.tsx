'use client';

import React, { useState } from 'react';
import { PlaceDTO, BookingType, BookingDTO } from '@tripgenie/types';
import { Modal, Button, Alert } from '@tripgenie/ui';
import { api } from '../../lib/api-client';

interface BookingModalProps {
  place: PlaceDTO;
  tripId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (booking: BookingDTO) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  place,
  tripId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [bookingType, setBookingType] = useState<BookingType>('ACTIVITY');
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState<string>(tomorrowStr);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<BookingDTO | null>(null);

  if (!isOpen) return null;

  // Derive estimated snapshot unit price server side, but show instant preview locally
  const unitPrice = (place.priceLevel || 1) * 25;
  const estimatedTotal = unitPrice * guestCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.bookings.create({
        placeId: place.id,
        tripId: tripId || undefined,
        bookingType,
        bookingDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        guestCount,
        notes: notes.trim() || undefined,
      });

      if (!res.success || !res.data) {
        if (res.error?.code === 'BOOKING_UNAVAILABLE') {
          setError('Selected date/time slot is unavailable. Please try another time.');
        } else {
          setError(res.error?.message || 'Failed to create reservation.');
        }
        setLoading(false);
        return;
      }

      setSuccessBooking(res.data);
      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reserve Spot"
      description={`📍 ${place.name}`}
      maxWidth="lg"
    >
      {successBooking ? (
        <div className="text-center space-y-4 py-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h4 className="text-lg font-bold text-slate-900">Reservation Placed!</h4>
          <p className="text-xs sm:text-sm text-slate-600">
            Your reservation request for <span className="font-semibold text-slate-900">{place.name}</span> has
            been received and is currently <span className="text-amber-700 font-semibold">{successBooking.status}</span>.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 text-xs space-y-2 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Booking Reference:</span>
              <span className="font-mono text-brand-700 font-bold">{successBooking.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span>{successBooking.bookingDate} {successBooking.startTime ? `@ ${successBooking.startTime}` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Guests:</span>
              <span>{successBooking.guestCount} Guest(s)</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
              <span className="text-slate-700">Total Price:</span>
              <span className="text-emerald-700">${successBooking.totalAmount} {successBooking.currency}</span>
            </div>
          </div>

          <Button variant="primary" size="md" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <Alert variant="danger" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="booking-type-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reservation Type
              </label>
              <select
                id="booking-type-select"
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value as BookingType)}
                className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-medium"
              >
                <option value="ACTIVITY">Activity</option>
                <option value="RESTAURANT">Restaurant</option>
                <option value="ATTRACTION">Attraction</option>
                <option value="ENTERTAINMENT">Entertainment</option>
                <option value="RENTAL">Rental</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="guest-count-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guest Count
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setGuestCount((g) => Math.max(1, g - 1))}
                  aria-label="Decrease guest count"
                  className="w-9 h-9 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center min-h-[44px] min-w-[44px]"
                >
                  -
                </button>
                <input
                  id="guest-count-input"
                  type="number"
                  min={1}
                  max={50}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3 py-2 text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setGuestCount((g) => Math.min(50, g + 1))}
                  aria-label="Increase guest count"
                  className="w-9 h-9 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center min-h-[44px] min-w-[44px]"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="booking-date-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reservation Date
            </label>
            <input
              id="booking-date-input"
              type="date"
              min={todayStr}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-time-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                id="start-time-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label htmlFor="end-time-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                id="end-time-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes-textarea" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Special Requests
            </label>
            <textarea
              id="notes-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dietary requirements, seating preference, etc."
              rows={2}
              className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl p-3 text-slate-900 text-xs placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Price Snapshot Summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Base Unit Price (snapshot):</span>
              <span className="font-mono">${unitPrice.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Quantity / Guests:</span>
              <span className="font-mono">× {guestCount}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 text-sm">
              <span>Estimated Total:</span>
              <span className="text-emerald-600">${estimatedTotal.toFixed(2)} USD</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
            >
              Confirm Reservation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
