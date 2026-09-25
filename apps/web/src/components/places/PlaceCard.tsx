'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, Button } from '@tripgenie/ui';
import type { PlaceDTO } from '@tripgenie/types';
import { SafeImage } from '../ui/SafeImage';
import { api } from '../../lib/api-client';

interface PlaceCardProps {
  place: PlaceDTO;
  onAddToTrip?: (place: PlaceDTO) => void;
  onBookPlace?: (place: PlaceDTO) => void;
}

export function PlaceCard({ place, onAddToTrip, onBookPlace }: PlaceCardProps) {
  const [isSaved, setIsSaved] = useState(place.isSaved || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsSaving(true);
    try {
      if (isSaved) {
        const res = await api.places.unsave(place.id);
        if (res.success) setIsSaved(false);
      } else {
        const res = await api.places.save(place.id);
        if (res.success) setIsSaved(true);
      }
    } catch {
      // Ignore transient errors
    } finally {
      setIsSaving(false);
    }
  };

  const priceFormatted = place.priceLevel ? '₹'.repeat(place.priceLevel) : null;

  return (
    <Card className="group flex flex-col justify-between overflow-hidden bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200 p-0">
      <div>
        {/* Top Image Banner */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <SafeImage
            src={place.imageUrl || undefined}
            alt={place.name}
            fallbackText={place.name}
            aspectRatio="aspect-[16/10]"
            className="group-hover:scale-105 transition-transform duration-300"
          />

          {/* Category Badge */}
          {place.category && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/90 text-slate-800 border border-slate-200 backdrop-blur-md shadow-xs">
              {place.category}
            </div>
          )}

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={isSaving}
            aria-label={isSaved ? 'Remove from saved places' : 'Save place'}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
              isSaved
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white shadow-xs'
            }`}
          >
            {isSaved ? '★' : '☆'}
          </button>
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
              {place.name}
            </h3>
            {place.rating && (
              <span className="flex items-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shrink-0">
                ★ {place.rating.toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 line-clamp-1">
              📍 {place.city ? `${place.city}, ${place.country || ''}` : place.address || 'Destination'}
            </span>
            {priceFormatted && <span className="font-mono text-emerald-600 font-semibold">{priceFormatted}</span>}
          </div>

          {place.description && (
            <p className="text-xs text-slate-500 line-clamp-2 pt-1 leading-relaxed">
              {place.description}
            </p>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="p-4 pt-0 flex flex-col gap-2 mt-2">
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/app/explore/${place.id}`} className="w-full">
            <Button variant="outline" size="sm" className="w-full text-xs py-2">
              View Details
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onAddToTrip && onAddToTrip(place)}
            className="w-full text-xs py-2"
          >
            + Add to Trip
          </Button>
        </div>

        {onBookPlace && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBookPlace(place)}
            className="w-full text-xs py-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            🏨 Reserve / Book Spot
          </Button>
        )}
      </div>
    </Card>
  );
}
