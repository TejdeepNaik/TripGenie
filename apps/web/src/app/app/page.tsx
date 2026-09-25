'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, EmptyState } from '@tripgenie/ui';
import { useAuth } from '../../context/auth-context';
import { api, TripDTO } from '../../lib/api-client';
import { SafeImage } from '../../components/ui/SafeImage';
import { SkeletonCard } from '../../components/ui/Skeleton';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTrips() {
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
    loadTrips();
  }, []);

  const upcomingTrip = trips.find(
    (t) => t.status === 'PLANNING' || t.status === 'CONFIRMED'
  );

  return (
    <div className="space-y-8">
      {/* Header Greeting & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Good day 👋 {user?.name?.split(' ')[0] || 'Traveler'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ready for your next adventure? Manage your trips and reservations below.
          </p>
        </div>
        <div>
          <Link href="/app/trips/new">
            <Button variant="primary" size="md">
              ✨ Plan New Trip
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/app/trips/new"
          className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-md transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            🗺️
          </div>
          <p className="text-sm font-bold text-slate-900">Plan a Trip</p>
          <p className="text-xs text-slate-500 mt-0.5">AI itinerary generator</p>
        </Link>

        <Link
          href="/app/explore"
          className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-md transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            🧭
          </div>
          <p className="text-sm font-bold text-slate-900">Explore Places</p>
          <p className="text-xs text-slate-500 mt-0.5">Stays & attractions</p>
        </Link>

        <Link
          href="/app/bookings"
          className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-md transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            🏨
          </div>
          <p className="text-sm font-bold text-slate-900">My Bookings</p>
          <p className="text-xs text-slate-500 mt-0.5">Manage reservations</p>
        </Link>

        <Link
          href="/app/trips"
          className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-md transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            ✈️
          </div>
          <p className="text-sm font-bold text-slate-900">My Trips</p>
          <p className="text-xs text-slate-500 mt-0.5">Trip history</p>
        </Link>
      </div>

      {/* Main Grid: Upcoming Trip + Architecture Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🚀 Active Upcoming Trip</span>
          </h2>

          {isLoading ? (
            <SkeletonCard />
          ) : upcomingTrip ? (
            <Card className="border-slate-200 bg-white">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <SafeImage
                  alt={upcomingTrip.destination}
                  fallbackText={upcomingTrip.destination}
                  aspectRatio="aspect-video md:aspect-square"
                />
                <div className="space-y-4">
                  <div>
                    <Badge variant={upcomingTrip.status === 'CONFIRMED' ? 'success' : 'purple'} size="sm">
                      {upcomingTrip.status}
                    </Badge>
                    <h3 className="text-xl font-bold text-slate-900 leading-snug mt-2">
                      {upcomingTrip.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>📍</span> {upcomingTrip.destination}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-mono font-bold">Start Date</p>
                      <p className="font-semibold text-slate-700 mt-0.5">
                        {new Date(upcomingTrip.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-mono font-bold">Duration</p>
                      <p className="font-semibold text-slate-700 mt-0.5">
                        {upcomingTrip.daysCount || 1} Days
                      </p>
                    </div>
                  </div>

                  <Link href={`/app/trips/${upcomingTrip.id}`}>
                    <Button variant="primary" className="w-full text-xs py-2 mt-2">
                      View Full Itinerary →
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon="🏝️"
              title="No active trip scheduled"
              description="You haven't scheduled an upcoming trip yet. Let our AI generator craft your ideal itinerary!"
              actionLabel="Plan New Trip ✨"
              onAction={() => window.location.href = '/app/trips/new'}
            />
          )}
        </div>

        {/* Platform Integrity Card */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>✨ Platform Features</span>
          </h2>

          <Card className="border-brand-200 bg-white">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-brand-600 uppercase tracking-wider">
                  PostgreSQL 16 Engine
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900">Transactional Safety</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                TripGenie uses PostgreSQL row-level locks and idempotency protection to keep your reservations and payments 100% accurate.
              </p>

              <div className="space-y-2 pt-2 text-[11px] text-slate-600">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <span>Booking Guard</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <span>Durable Audit Logs</span>
                  <Badge variant="purple" size="sm">Active</Badge>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <span>Razorpay Test Mode</span>
                  <Badge variant="info" size="sm">Ready</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
