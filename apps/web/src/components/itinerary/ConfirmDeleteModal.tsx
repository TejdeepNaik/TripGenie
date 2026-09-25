'use client';

import React, { useState } from 'react';
import { Modal, Button } from '@tripgenie/ui';
import { api } from '../../lib/api-client';

interface ConfirmDeleteModalProps {
  tripId: string;
  activityId: string | null;
  activityTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmDeleteModal({
  tripId,
  activityId,
  activityTitle,
  isOpen,
  onClose,
  onSuccess,
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activityId) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await api.trips.deleteActivity(tripId, activityId);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || 'Failed to delete activity.');
      }
    } catch {
      setError('An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center text-sm font-bold">
            🗑️
          </div>
          <span>Delete Activity</span>
        </div>
      }
      description={
        <span>
          Are you sure you want to remove <strong className="text-slate-900">&quot;{activityTitle || 'this activity'}&quot;</strong> from your itinerary? This action cannot be undone.
        </span>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 text-xs">
          <Button variant="outline" onClick={onClose} className="px-4 py-2">
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={isDeleting}
            onClick={handleDelete}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white border-transparent"
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
