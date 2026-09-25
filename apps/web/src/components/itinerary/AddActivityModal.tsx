'use client';

import React, { useState } from 'react';
import { Modal, Button } from '@tripgenie/ui';
import type { TripDayDTO } from '../../lib/api-client';
import { api } from '../../lib/api-client';

interface AddActivityModalProps {
  tripId: string;
  days: TripDayDTO[];
  initialDayId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddActivityModal({
  tripId,
  days,
  initialDayId,
  isOpen,
  onClose,
  onSuccess,
}: AddActivityModalProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>(
    initialDayId || (days.length > 0 ? days[0].id : '')
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Activity title is required.');
      return;
    }
    if (!selectedDayId) {
      setError('Please select a valid itinerary day.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.trips.createActivity(tripId, {
        tripDayId: selectedDayId,
        title: title.trim(),
        description: description.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        durationMinutes: Number(durationMinutes) || 60,
        estimatedCost: Number(estimatedCost) || 0,
        notes: notes.trim() || null,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || 'Failed to create activity.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider block">
            Custom Itinerary Entry
          </span>
          <span>Add Custom Activity</span>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Day Selector */}
          <div className="space-y-1.5">
            <label htmlFor="select-itinerary-day" className="font-semibold text-slate-700">Select Itinerary Day:</label>
            <select
              id="select-itinerary-day"
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              aria-label="Select Itinerary Day"
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
            >
              {days.map((day, idx) => {
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

          {/* Activity Title */}
          <div className="space-y-1.5">
            <label htmlFor="activity-title" className="font-semibold text-slate-700">Activity Title *:</label>
            <input
              id="activity-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Breakfast at local cafe, Museum tour, Sunset cruise"
              aria-label="Activity Title"
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Timings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="activity-start-time" className="font-semibold text-slate-700">Start Time:</label>
              <input
                id="activity-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-label="Start Time"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="activity-end-time" className="font-semibold text-slate-700">End Time:</label>
              <input
                id="activity-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="End Time"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="activity-duration" className="font-semibold text-slate-700">Duration (min):</label>
              <input
                id="activity-duration"
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                aria-label="Duration in minutes"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Cost */}
          <div className="space-y-1.5">
            <label htmlFor="estimated-cost" className="font-semibold text-slate-700">Estimated Cost (USD/Local):</label>
            <input
              id="estimated-cost"
              type="number"
              min={0}
              step={0.01}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(Number(e.target.value))}
              aria-label="Estimated Cost"
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="activity-notes" className="font-semibold text-slate-700">Notes / Details:</label>
            <textarea
              id="activity-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add extra details, directions, or booking numbers..."
              aria-label="Notes / Details"
              rows={2}
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} className="px-4 py-2">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="px-5 py-2"
            >
              {isSubmitting ? 'Saving...' : 'Add Activity'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
