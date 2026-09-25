'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, Button } from '@tripgenie/ui';
import type { PlaceDTO } from '@tripgenie/types';
import { SafeImage } from '../../../../components/ui/SafeImage';
import { AddToTripModal } from '../../../../components/places/AddToTripModal';
import { SkeletonCard, SkeletonText } from '../../../../components/ui/Skeleton';
import { api } from '../../../../lib/api-client';
import { MapView } from '../../../../components/maps/MapView';

export default function PlaceDetailPage() {
  const params = useParams();
  const placeId = params?.placeId as string;

  const [place, setPlace] = useState<PlaceDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddToTripOpen, setIsAddToTripOpen] = useState(false);

  useEffect(() => {
    async function loadPlaceDetails() {
      if (!placeId) return;
      try {
        const res = await api.places.getById(placeId);
        if (res.success && res.data) {
          setPlace(res.data);
          setIsSaved(res.data.isSaved || false);
        } else {
          setError(res.error?.message || 'Place not found.');
        }
      } catch {
        setError('Failed to fetch place details.');
      } finally {
        setIsLoading(false);
      }
    }

    loadPlaceDetails();
  }, [placeId]);

  const handleToggleSave = async () => {
    if (!place) return;
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

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <SkeletonText lines={2} />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <Card className="border-rose-200 bg-white p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900">Place Not Found</h2>
          <p className="text-xs text-slate-500">
            {error || 'The requested place does not exist in our discovery database.'}
          </p>
          <Link href="/app/explore">
            <Button variant="outline" size="sm" className="mt-2">
              ← Return to Explore
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const priceFormatted = place.priceLevel ? '₹'.repeat(place.priceLevel) : 'Standard';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Navigation */}
      <div>
        <Link href="/app/explore" className="text-xs text-brand-600 hover:text-brand-700 font-semibold">
          ← Back to Explore
        </Link>
      </div>

      {/* Hero Visual Section */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-md">
        <SafeImage
          src={place.imageUrl || undefined}
          alt={place.name}
          fallbackText={place.name}
          aspectRatio="aspect-video md:aspect-[21/9]"
          className="w-full"
        />

        {/* Category Pill Overlay */}
        {place.category && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-800 border border-slate-200 backdrop-blur-md shadow-xs">
            {place.category}
          </div>
        )}
      </div>

      {/* Header Info & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{place.name}</h1>
            {place.rating && (
              <span className="flex items-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                ★ {place.rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            📍 {place.city ? `${place.city}, ${place.country || ''}` : place.address || 'Destination'}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleSave}
            disabled={isSaving}
          >
            <span>{isSaved ? '★ Saved' : '☆ Save Place'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddToTripOpen(true)}
          >
            + Add to Trip Itinerary
          </Button>
        </div>
      </div>

      {/* Content Details Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Description & Disclaimer */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white border-slate-200/80 p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900">About this Place</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {place.description || 'No detailed description available for this place.'}
            </p>
          </Card>

          {/* Location Map View */}
          <div className="h-64 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
            <MapView places={[place]} selectedPlaceId={place.id} className="h-full" />
          </div>

          {/* Provider Disclaimer Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <span>ℹ️ Active Data Provider: {place.provider || 'database'}</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              This place profile is served by the normalized TripGenie Place API abstraction layer ({place.provider || 'database'} provider).
            </p>
          </div>
        </div>

        {/* Right Column: Metadata Details */}
        <Card className="bg-white border-slate-200/80 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">Location & Details</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-900">{place.category || 'General'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">City / Country:</span>
                <span className="font-semibold text-slate-900">
                  {place.city ? `${place.city}, ${place.country || ''}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Price Tier:</span>
                <span className="font-mono text-emerald-600 font-bold">{priceFormatted}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Rating:</span>
                <span className="font-semibold text-amber-700">{place.rating ? `★ ${place.rating}` : 'Unrated'}</span>
              </div>
              {place.address && (
                <div className="pt-1 space-y-1">
                  <span className="text-slate-500 block">Full Address:</span>
                  <p className="text-slate-800 text-[11px] font-mono leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {place.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
            <span>Provider: SeedDB</span>
            <span className="text-brand-600 font-mono font-semibold">ID: {place.id.slice(0, 8)}</span>
          </div>
        </Card>
      </div>

      {/* Add To Trip Modal */}
      <AddToTripModal
        place={place}
        isOpen={isAddToTripOpen}
        onClose={() => setIsAddToTripOpen(false)}
      />
    </div>
  );
}
