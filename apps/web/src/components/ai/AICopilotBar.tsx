'use client';

import React, { useState } from 'react';
import { Button } from '@tripgenie/ui';
import { api } from '../../lib/api-client';

interface AICopilotBarProps {
  tripId: string;
  onTripUpdated?: () => void;
}

const COMMAND_SUGGESTIONS = [
  'Make tomorrow cheaper',
  'Add nightlife spot to Day 1',
  'Remove museums',
  'Find something fun near my hotel',
  'Change budget to ₹20,000',
];

export function AICopilotBar({ tripId, onTripUpdated }: AICopilotBarProps) {
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async (commandText: string) => {
    if (!commandText.trim()) return;

    setIsExecuting(true);
    setError(null);
    setLastExplanation(null);

    try {
      const res = await api.ai.executeCommand(tripId, commandText.trim());
      if (res.success && res.data) {
        setLastExplanation(res.data.explanation || 'Itinerary updated!');
        setCommand('');
        onTripUpdated?.();
      } else {
        setError(res.error?.message || 'Could not apply AI command.');
      }
    } catch {
      setError('Failed to connect to AI copilot service.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 space-y-3 shadow-sm relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
            ✨ AI Travel Copilot
          </span>
        </div>
        <span className="text-[11px] text-slate-600 font-mono">Grounded Itinerary Editor</span>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {lastExplanation && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
          <span>✓ {lastExplanation}</span>
          <button onClick={() => setLastExplanation(null)} className="text-slate-500 hover:text-slate-900 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Input Row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleExecute(command);
        }}
        className="flex items-center space-x-2"
      >
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Ask AI Copilot to modify your trip (e.g. Make tomorrow cheaper, Add nightlife)..."
          disabled={isExecuting}
          className="flex-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={isExecuting || !command.trim()}
          className="px-4 py-2.5 text-xs font-bold disabled:opacity-40"
        >
          {isExecuting ? 'Updating...' : 'Execute ✨'}
        </Button>
      </form>

      {/* Suggestion Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pt-1">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          Quick Commands:
        </span>
        {COMMAND_SUGGESTIONS.map((sug, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCommand(sug);
              handleExecute(sug);
            }}
            disabled={isExecuting}
            className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 transition-colors shrink-0 disabled:opacity-40 font-medium"
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
}
