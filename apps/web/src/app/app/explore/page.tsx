'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PlaceCard } from '../../../components/places/PlaceCard';
import { PlaceSearchFilters } from '../../../components/places/PlaceSearchFilters';
import { AddToTripModal } from '../../../components/places/AddToTripModal';
import { BookingModal } from '../../../components/bookings/BookingModal';
import { MapView } from '../../../components/maps/MapView';
import { SkeletonCard } from '../../../components/ui/Skeleton';
import { Card, Button, Badge, Alert, EmptyState } from '@tripgenie/ui';
import { api } from '../../../lib/api-client';
import type { PlaceDTO, PlaceSearchResult } from '@tripgenie/types';

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Everything');
  const [selectedCity, setSelectedCity] = useState('');
  const [page, setPage] = useState(1);

  const [searchResult, setSearchResult] = useState<PlaceSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<PlaceDTO | null>(null);
  const [targetPlaceForTrip, setTargetPlaceForTrip] = useState<PlaceDTO | null>(null);
  const [isAddToTripOpen, setIsAddToTripOpen] = useState(false);

  const [targetPlaceForBooking, setTargetPlaceForBooking] = useState<PlaceDTO | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Mobile View Toggle ('list' | 'map')
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  const loadPlaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.places.search({
        q: query || undefined,
        category: selectedCategory !== 'Everything' ? selectedCategory : undefined,
        city: selectedCity || undefined,
        page,
        limit: 12,
      });

      if (res.success && res.data) {
        setSearchResult(res.data);
        setSelectedPlace((prev) => {
          if (!prev) return null;
          const exists = res.data?.places.some((p) => p.id === prev.id);
          return exists ? prev : null;
        });
      } else {
        setError(res.error?.message || 'Failed to fetch places.');
      }
    } catch {
      setError('An error occurred while fetching places.');
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedCategory, selectedCity, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlaces();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadPlaces]);

  const handleAddToTrip = (place: PlaceDTO) => {
    setTargetPlaceForTrip(place);
    setIsAddToTripOpen(true);
  };

  const handleBookPlace = (place: PlaceDTO) => {
    setTargetPlaceForBooking(place);
    setIsBookingModalOpen(true);
  };

  const handleSelectPlaceOnMap = (place: PlaceDTO) => {
    setSelectedPlace(place);
    const element = document.getElementById(`place-card-${place.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="purple" size="sm" dot>
              Destination Discovery & Maps
            </Badge>
            <span className="text-xs text-slate-500">• Google Places Synchronized</span>
          </div>

          {/* Mobile View Switcher Toggle */}
          <div className="flex md:hidden bg-slate-100 border border-slate-200 rounded-xl p-1 space-x-1 text-xs">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                mobileView === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              📋 List
            </button>
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                mobileView === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              🗺️ Map
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Explore your next adventure</h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          Discover places, beach shacks, historic forts, adventure spots, and authentic local experiences synchronized with interactive map location tags.
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <PlaceSearchFilters
        query={query}
        selectedCategory={selectedCategory}
        selectedCity={selectedCity}
        onQueryChange={(q) => {
          setQuery(q);
          setPage(1);
        }}
        onCategoryChange={(cat) => {
          setSelectedCategory(cat);
          setPage(1);
        }}
        onCityChange={(city) => {
          setSelectedCity(city);
          setPage(1);
        }}
      />

      {/* Main Content Area: Split View (List + Map) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Place Cards List */}
        <div
          className={`lg:col-span-7 space-y-6 ${
            mobileView === 'map' ? 'hidden md:block' : 'block'
          }`}
        >
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <Alert variant="danger">
              <div className="flex justify-between items-center w-full">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={loadPlaces}>
                  Retry
                </Button>
              </div>
            </Alert>
          ) : searchResult && searchResult.places.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {searchResult.places.map((place) => {
                  const isSelected = selectedPlace?.id === place.id;
                  return (
                    <div
                      key={place.id}
                      id={`place-card-${place.id}`}
                      className={`transition-all rounded-2xl ${
                        isSelected ? 'ring-2 ring-brand-500 scale-[1.01]' : ''
                      }`}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <PlaceCard
                        place={place}
                        onAddToTrip={handleAddToTrip}
                        onBookPlace={handleBookPlace}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {searchResult.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-6 text-xs text-slate-500">
                  <span>
                    Page <strong className="text-slate-900">{searchResult.page}</strong> of{' '}
                    <strong className="text-slate-900">{searchResult.totalPages}</strong> ({searchResult.total} total)
                  </span>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= searchResult.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="🔍"
              title="No places found"
              description="We couldn't find any places matching your search criteria. Try adjusting your search query or category filter."
            />
          )}
        </div>

        {/* Right Column: Sticky Interactive Map */}
        <div
          className={`lg:col-span-5 lg:sticky lg:top-24 h-[550px] ${
            mobileView === 'list' ? 'hidden md:block' : 'block'
          }`}
        >
          <MapView
            places={searchResult?.places || []}
            selectedPlaceId={selectedPlace?.id || null}
            onSelectPlace={handleSelectPlaceOnMap}
            className="h-full"
          />
        </div>
      </div>

      {/* Add To Trip Modal */}
      <AddToTripModal
        place={targetPlaceForTrip}
        isOpen={isAddToTripOpen}
        onClose={() => setIsAddToTripOpen(false)}
      />

      {/* Booking / Reservation Modal */}
      {targetPlaceForBooking && (
        <BookingModal
          place={targetPlaceForBooking}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setTargetPlaceForBooking(null);
          }}
        />
      )}
    </div>
  );
}
