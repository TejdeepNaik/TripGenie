'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal, Card, Button } from '@tripgenie/ui';
import type { PlaceDTO } from '@tripgenie/types';
import { api, TripDTO } from '../../lib/api-client';

interface AddToTripModalProps {
  place: PlaceDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddToTripModal({ place, isOpen, onClose, onSuccess }: AddToTripModalProps) {
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedTripDetails, setSelectedTripDetails] = useState<TripDTO | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const [startTime, setStartTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadUserTrips() {
      setIsLoadingTrips(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const res = await api.trips.list();
        if (res.success && res.data) {
          setTrips(res.data);
          if (res.data.length > 0) {
            setSelectedTripId(res.data[0].id);
          }
        }
      } catch {
        setError('Failed to load trips.');
      } finally {
        setIsLoadingTrips(false);
      }
    }

    loadUserTrips();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedTripId) {
      setSelectedTripDetails(null);
      setSelectedDayId('');
      return;
    }

    async function loadSelectedTripDetails() {
      try {
        const res = await api.trips.getById(selectedTripId);
        if (res.success && res.data) {
          setSelectedTripDetails(res.data);
          if (res.data.days && res.data.days.length > 0) {
            setSelectedDayId(res.data.days[0].id);
          }
        }
      } catch {
        // Fallback
      }
    }

    loadSelectedTripDetails();
  }, [selectedTripId]);

  if (!isOpen || !place) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !selectedDayId) {
      setError('Please select a valid trip and day.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(place.id);
      const res = await api.trips.createActivity(selectedTripId, {
        tripDayId: selectedDayId,
        placeId: isUuid ? place.id : null,
        title: place.name,
        description: place.description ? place.description.slice(0, 200) : null,
        startTime: startTime || null,
        durationMinutes: 120,
        estimatedCost: place.priceLevel ? place.priceLevel * 200 : 0,
        notes: notes || null,
      });

      if (res.success) {
        setSuccessMessage(`Successfully added "${place.name}" to your trip!`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError(res.error?.message || 'Failed to add place to trip.');
      }
    } catch {
      setError('An error occurred while adding to trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <span className="text-xs font-mono font-bold text-brand-600 uppercase tracking-wider block">
            Add to Itinerary
          </span>
          <span className="text-xl font-extrabold text-slate-900">{place.name}</span>
        </div>
      }
      description={`📍 ${place.city ? `${place.city}, ${place.country || ''}` : place.address || 'Destination'}`}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
            ✓ {successMessage}
          </div>
        )}

        {isLoadingTrips ? (
          <div className="text-center py-8 text-xs text-slate-500">Loading your trips...</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-xs text-slate-500">You don&apos;t have any trips created yet.</p>
            <Link href="/app/trips/new" onClick={onClose}>
              <Button variant="primary" size="sm">
                + Create a Trip First
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Trip Selector */}
            <div className="space-y-1.5">
              <label htmlFor="select-trip" className="font-semibold text-slate-700 uppercase tracking-wider block">Select Trip:</label>
              <select
                id="select-trip"
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                aria-label="Select Trip"
                className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.destination})
                  </option>
                ))}
              </select>
            </div>

            {/* Day Selector */}
            {selectedTripDetails && selectedTripDetails.days && selectedTripDetails.days.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="select-day" className="font-semibold text-slate-700 uppercase tracking-wider block">Select Itinerary Day:</label>
                <select
                  id="select-day"
                  value={selectedDayId}
                  onChange={(e) => setSelectedDayId(e.target.value)}
                  aria-label="Select Itinerary Day"
                  className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {selectedTripDetails.days.map((day, idx) => {
                    const formattedDate = new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <option key={day.id} value={day.id}>
                        Day {idx + 1}: {day.title || formattedDate} ({formattedDate})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Scheduled Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="start-time" className="font-semibold text-slate-700 uppercase tracking-wider block">Start Time:</label>
                <input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  aria-label="Planned Start Time"
                  className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="est-cost" className="font-semibold text-slate-700 uppercase tracking-wider block">Est. Cost:</label>
                <input
                  id="est-cost"
                  type="text"
                  readOnly
                  value={place.priceLevel ? `Level ${place.priceLevel} (${'₹'.repeat(place.priceLevel)})` : 'Standard'}
                  aria-label="Est. Cost Level"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="trip-notes" className="font-semibold text-slate-700 uppercase tracking-wider block">Personal Notes:</label>
              <textarea
                id="trip-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Remember to buy tickets in advance..."
                aria-label="Personal Notes / Reminders"
                rows={2}
                className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !!successMessage}
              >
                {isSubmitting ? 'Adding...' : 'Confirm & Add'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
