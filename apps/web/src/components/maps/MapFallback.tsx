'use client';

import React from 'react';
import type { PlaceDTO } from '@tripgenie/types';

interface MapFallbackProps {
  places: PlaceDTO[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: PlaceDTO) => void;
  reason?: string;
}

export function MapFallback({
  places,
  selectedPlaceId,
  onSelectPlace,
  reason = 'Google Maps JS API key is unconfigured in development environment.',
}: MapFallbackProps) {
  const validPlaces = places.filter((p) => p.latitude !== null && p.longitude !== null);

  return (
    <div className="w-full h-full min-h-[350px] bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-sm">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-brand-600 uppercase tracking-wider">
              Interactive Map Mode
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900">Destination Overview</h3>
          <p className="text-xs text-slate-500 max-w-xs">{reason}</p>
        </div>

        <span className="text-xs font-mono font-bold bg-white text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
          {validPlaces.length} Pinned Location(s)
        </span>
      </div>

      {/* Center Visual Canvas with Pin Indicators */}
      <div className="relative z-10 my-6 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[260px] overflow-y-auto scrollbar-none pr-1">
        {validPlaces.length > 0 ? (
          validPlaces.map((place) => {
            const isSelected = selectedPlaceId === place.id;
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => onSelectPlace && onSelectPlace(place)}
                className={`p-3 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-brand-50 border-brand-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="text-xs">📍</span>
                  <span className="text-xs font-bold text-slate-900 truncate">{place.name}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  {place.latitude?.toFixed(4)}, {place.longitude?.toFixed(4)}
                </div>
                {place.city && (
                  <span className="inline-block text-[9px] text-brand-600 font-semibold mt-1">
                    {place.city}
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-xs text-slate-500">
            No geographic coordinates available for current place results.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 pt-4 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Fallback Renderer: Native Canvas</span>
        <span className="text-emerald-600 font-semibold">● Status Active</span>
      </div>
    </div>
  );
}
