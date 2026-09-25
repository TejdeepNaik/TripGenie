'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, EmptyState } from '@tripgenie/ui';
import { api, TripDTO } from '../../../lib/api-client';
import { SafeImage } from '../../../components/ui/SafeImage';
import { SkeletonCard } from '../../../components/ui/Skeleton';
import { AITripPlannerModal } from '../../../components/ai/AITripPlannerModal';

export default function TripsListPage() {
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'PAST' | 'DRAFT'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    async function fetchTrips() {
      try {
        const res = await api.trips.list();
        if (res.success && res.data) {
          setTrips(res.data);
        }
      } catch {
        setTrips([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrips();
  }, []);

  const filteredTrips = trips.filter((t) => {
    const now = new Date();
    const endDate = new Date(t.endDate);

    if (filter === 'UPCOMING') return t.status === 'PLANNING' || t.status === 'CONFIRMED';
    if (filter === 'PAST') return t.status === 'COMPLETED' || endDate < now;
    if (filter === 'DRAFT') return t.status === 'DRAFT';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Trips</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your past journeys, upcoming vacations, and trip drafts.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAIModalOpen(true)}
            className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
          >
            ✨ Plan with AI
          </Button>
          <Link href="/app/trips/new">
            <Button variant="primary" size="sm">
              + Create Trip
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200/80 pb-3">
        {(['ALL', 'UPCOMING', 'PAST', 'DRAFT'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab
                ? 'bg-brand-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab === 'ALL' ? 'All Trips' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Trips Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredTrips.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => (
            <Card
              key={trip.id}
              className="flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group p-4"
            >
              <div className="space-y-4">
                <SafeImage
                  alt={trip.destination}
                  fallbackText={trip.destination}
                  aspectRatio="aspect-video"
                  className="rounded-xl overflow-hidden"
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant={trip.status === 'CONFIRMED' ? 'success' : 'purple'} size="sm">
                      {trip.status}
                    </Badge>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      {trip.daysCount || 1} Days
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                    {trip.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span>📍</span> {trip.destination}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">Dates</p>
                    <p className="font-semibold text-slate-700 text-[11px] mt-0.5">
                      {new Date(trip.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">Travelers</p>
                    <p className="font-semibold text-slate-700 text-[11px] mt-0.5">
                      {trip.travelersCount || 1} Member(s)
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <Link href={`/app/trips/${trip.id}`}>
                  <Button variant="secondary" size="sm" className="w-full">
                    View Details →
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="✈️"
          title="No trips found"
          description={
            filter === 'ALL'
              ? "You haven't created any trips yet. Start planning your next dream journey!"
              : `No ${filter.toLowerCase()} trips match your active filter.`
          }
          actionLabel="+ Plan a New Trip"
          onAction={() => window.location.href = '/app/trips/new'}
        />
      )}

      {/* AI Trip Planner Modal */}
      <AITripPlannerModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />
    </div>
  );
}
