'use client';

import React from 'react';

const CATEGORIES = [
  'Everything',
  'Stays',
  'Food',
  'Beaches',
  'Things to do',
  'Nightlife',
  'Shopping',
  'Culture',
  'Entertainment',
];

interface PlaceSearchFiltersProps {
  query: string;
  selectedCategory: string;
  selectedCity: string;
  onQueryChange: (q: string) => void;
  onCategoryChange: (cat: string) => void;
  onCityChange: (city: string) => void;
}

export function PlaceSearchFilters({
  query,
  selectedCategory,
  selectedCity,
  onQueryChange,
  onCategoryChange,
  onCityChange,
}: PlaceSearchFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search places, restaurants, beaches, activities..."
            aria-label="Search places, restaurants, beaches, activities"
            className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search text"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Destination Filter */}
        <select
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
          aria-label="Filter by destination city"
          className="w-full bg-white border border-slate-300 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold"
        >
          <option value="">All Destinations</option>
          <option value="Goa">Goa</option>
          <option value="Jaipur">Jaipur</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Udaipur">Udaipur</option>
          <option value="Manali">Manali</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Tokyo">Tokyo</option>
        </select>
      </div>

      {/* Category Navigation Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
