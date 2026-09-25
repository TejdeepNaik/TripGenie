'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@tripgenie/ui';
import type { ActivityDTO } from '@tripgenie/types';
import { api } from '../../lib/api-client';

interface EditActivityModalProps {
  tripId: string;
  activity: ActivityDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditActivityModal({
  tripId,
  activity,
  isOpen,
  onClose,
  onSuccess,
}: EditActivityModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title || '');
      setDescription(activity.description || '');
      setStartTime(activity.startTime || '09:00');
      setEndTime(activity.endTime || '10:00');
      setDurationMinutes(activity.durationMinutes || 60);
      setEstimatedCost(activity.estimatedCost || 0);
      setNotes(activity.notes || '');
    }
  }, [activity]);

  if (!activity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Activity title is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.trips.updateActivity(tripId, activity.id, {
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
        setError(res.error?.message || 'Failed to update activity.');
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
            Edit Activity
          </span>
          <span>Modify Itinerary Entry</span>
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
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="edit-activity-title" className="font-semibold text-slate-700">Activity Title *:</label>
            <input
              id="edit-activity-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Activity Title"
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
            />
          </div>

          {/* Timings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="edit-activity-start-time" className="font-semibold text-slate-700">Start Time:</label>
              <input
                id="edit-activity-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-label="Start Time"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-activity-end-time" className="font-semibold text-slate-700">End Time:</label>
              <input
                id="edit-activity-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="End Time"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-activity-duration" className="font-semibold text-slate-700">Duration (min):</label>
              <input
                id="edit-activity-duration"
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
            <label htmlFor="edit-estimated-cost" className="font-semibold text-slate-700">Estimated Cost:</label>
            <input
              id="edit-estimated-cost"
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
            <label htmlFor="edit-activity-notes" className="font-semibold text-slate-700">Notes / Details:</label>
            <textarea
              id="edit-activity-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
