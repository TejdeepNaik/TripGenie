'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@tripgenie/ui';
import { api } from '../../../../lib/api-client';

const PREFERENCE_OPTIONS = [
  'Relaxation',
  'Adventure',
  'Food & Dining',
  'Culture & History',
  'Nightlife',
  'Shopping',
  'Family Friendly',
  'Nature & Parks',
];

export default function CreateTripPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [travelers, setTravelers] = useState(1);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePreference = (pref: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !destination.trim() || !startDate || !endDate) {
      setError('Please fill in all required fields (title, destination, start date, end date).');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please enter valid dates.');
      return;
    }

    if (end < start) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    if (travelers < 1) {
      setError('Number of travelers must be at least 1.');
      return;
    }

    if (budget !== '' && Number(budget) < 0) {
      setError('Budget cannot be negative.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.trips.create({
        title: title.trim(),
        destination: destination.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        budget: budget !== '' ? Number(budget) : null,
        currency,
        travelers: Number(travelers),
        preferences: selectedPreferences,
      });

      if (res.success && res.data) {
        router.push(`/app/trips/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to create trip. Please try again.');
      }
    } catch {
      setError('Network error creating trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/trips" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to My Trips
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Plan a New Trip</h1>
        </div>
      </div>

      <Card title="Trip Specification" className="bg-white border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-xs font-semibold text-slate-700 mb-1">
              Trip Title *
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Japanese Alps & Kyoto Exploration"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="destination" className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Location *
            </label>
            <input
              id="destination"
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Kyoto & Tokyo, Japan"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-xs font-semibold text-slate-700 mb-1">
                End Date *
              </label>
              <input
                id="endDate"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="travelers" className="block text-xs font-semibold text-slate-700 mb-1">
                Travelers
              </label>
              <input
                id="travelers"
                type="number"
                min={1}
                max={100}
                value={travelers}
                onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="budget" className="block text-xs font-semibold text-slate-700 mb-1">
                Target Budget
              </label>
              <input
                id="budget"
                type="number"
                min={0}
                placeholder="3500"
                value={budget}
                onChange={(e) => setBudget(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="currency" className="block text-xs font-semibold text-slate-700 mb-1">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Trip Experience Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {PREFERENCE_OPTIONS.map((pref) => {
                const selected = selectedPreferences.includes(pref);
                return (
                  <button
                    type="button"
                    key={pref}
                    onClick={() => togglePreference(pref)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-indigo-600 text-white border border-indigo-500 shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {selected ? `✓ ${pref}` : `+ ${pref}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <Link href="/app/trips">
              <Button type="button" variant="outline" className="text-xs px-4 py-2">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              className="text-xs px-6 py-2 shadow-sm"
            >
              {isSubmitting ? 'Creating Trip...' : 'Create Trip'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
