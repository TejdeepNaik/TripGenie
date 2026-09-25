'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Button } from '@tripgenie/ui';
import { api } from '../../lib/api-client';

interface AITripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_PROMPTS = [
  'Plan a 5-day Goa trip for 2 people under ₹30,000. I like beaches, cafes and nightlife.',
  'Plan a relaxed 3-day Jaipur trip focused on food, forts and heritage culture.',
  'Weekend beach getaway to North Goa with beach shacks and sunset views.',
  '4 days in Tokyo exploring food, culture and iconic sightseeing spots.',
];

const STAGES = [
  'Understanding your travel preferences...',
  'Searching real candidate places & destinations...',
  'Generating balanced daily itinerary timeline...',
  'Checking budget constraints & finalizing trip...',
];

export function AITripPlannerModal({ isOpen, onClose }: AITripPlannerModalProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSubmitting) {
      setCurrentStage(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, [isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.ai.planTrip(prompt.trim());
      if (res.success && res.data?.tripId) {
        onClose();
        router.push(`/app/trips/${res.data.tripId}`);
      } else {
        setError(res.error?.message || 'Failed to generate AI trip plan.');
        setIsSubmitting(false);
      }
    } catch {
      setError('An unexpected error occurred while planning your trip.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider flex items-center gap-1">
              <span>✨</span> TripGenie AI Copilot
            </span>
          </div>
          <span>Plan your next trip with AI</span>
        </div>
      }
      description="Describe your dream vacation in plain English. Our AI copilot will build an itinerary grounded in real places."
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Staged Loading State */}
        {isSubmitting ? (
          <div className="py-10 space-y-6 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto" />

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900 animate-pulse">
                {STAGES[currentStage]}
              </p>
              <div className="flex justify-center space-x-1.5 pt-2">
                {STAGES.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      idx <= currentStage ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-mono">
              Grounding place recommendations in real location database...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Prompt Textarea */}
            <div className="space-y-2">
              <label htmlFor="ai-prompt" className="text-xs font-semibold text-slate-700">Your Trip Idea:</label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Plan a 5-day Goa trip for 2 people under ₹30,000. I like beaches, cafes and nightlife."
                rows={4}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm"
              />
            </div>

            {/* Quick Suggestion Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(preset)}
                    className="text-left text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors line-clamp-1 max-w-full font-medium"
                  >
                    💡 {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} className="px-4 py-2 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!prompt.trim()}
                className="px-5 py-2.5 text-xs font-bold shadow-sm"
              >
                ✨ Generate Itinerary
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
