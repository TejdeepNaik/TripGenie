'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card } from '@tripgenie/ui';
import { api, TripDTO, TripDayDTO } from '../../../../lib/api-client';
import type { ActivityDTO, BookingDTO } from '@tripgenie/types';
import { SafeImage } from '../../../../components/ui/SafeImage';
import { SkeletonCard, SkeletonText } from '../../../../components/ui/Skeleton';
import { AddActivityModal } from '../../../../components/itinerary/AddActivityModal';
import { EditActivityModal } from '../../../../components/itinerary/EditActivityModal';
import { ConfirmDeleteModal } from '../../../../components/itinerary/ConfirmDeleteModal';
import { AICopilotBar } from '../../../../components/ai/AICopilotBar';

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params?.tripId as string;

  const [trip, setTrip] = useState<TripDTO | null>(null);
  const [tripBookings, setTripBookings] = useState<BookingDTO[]>([]);
  const [activeDayId, setActiveDayId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityDTO | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<{ id: string; title: string } | null>(null);

  const loadTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      const [tripRes, bookingsRes] = await Promise.all([
        api.trips.getById(tripId),
        api.bookings.list(),
      ]);

      if (tripRes.success && tripRes.data) {
        setTrip(tripRes.data);
        if (tripRes.data.days && tripRes.data.days.length > 0 && !activeDayId) {
          setActiveDayId(tripRes.data.days[0].id);
        }
      } else {
        setError(tripRes.error?.message || 'Trip not found.');
      }

      if (bookingsRes.success && bookingsRes.data) {
        setTripBookings(bookingsRes.data.filter((b) => b.tripId === tripId));
      }
    } catch {
      setError('Failed to fetch trip details.');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, activeDayId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <SkeletonText lines={2} />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <Card className="border-rose-200 bg-white p-8 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900">Trip Not Found</h2>
          <p className="text-xs text-slate-600">
            {error || 'The requested trip does not exist or you lack permission to view it.'}
          </p>
          <Link href="/app/trips">
            <Button variant="outline" className="text-xs px-4 py-2 mt-2">
              ← Return to My Trips
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const startDateFormatted = new Date(trip.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endDateFormatted = new Date(trip.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const activeDay = trip.days?.find((d) => d.id === activeDayId) || (trip.days ? trip.days[0] : null);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Link href="/app/trips" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to My Trips
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {trip.status}
              </span>
              <span className="text-xs text-slate-500">
                Created {new Date(trip.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">{trip.title}</h1>
            <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
              <span>📍</span> {trip.destination}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/app/explore">
              <Button variant="primary" className="text-xs px-4 py-2">
                + Explore Places to Add
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Banner & Stats Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <SafeImage
            alt={trip.destination}
            fallbackText={trip.destination}
            aspectRatio="aspect-video md:aspect-[21/9]"
            className="shadow-sm border border-slate-200"
          />
        </div>

        <Card className="flex flex-col justify-between bg-white border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Trip Overview</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Travel Dates:</span>
              <span className="font-semibold text-slate-900">
                {startDateFormatted} – {endDateFormatted}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Duration:</span>
              <span className="font-semibold text-slate-900">{trip.daysCount || 1} Days</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Travelers:</span>
              <span className="font-semibold text-slate-900">{trip.travelersCount || 1} Member(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Budget Limit:</span>
              <span className="font-mono text-indigo-600 font-bold">
                {trip.budget ? `$${trip.budget} ${trip.currency}` : 'Unspecified'}
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Ownership: Verified</span>
            <span className="text-emerald-600 font-semibold">● Active</span>
          </div>
        </Card>
      </div>

      {/* Compact Trip Bookings Section */}
      {tripBookings.length > 0 && (
        <Card className="bg-white border-slate-200 p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>🏨</span>
              <span>Trip Reservations ({tripBookings.length})</span>
            </h3>
            <Link href="/app/bookings" className="text-xs text-indigo-600 hover:underline font-medium">
              Manage All Bookings →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {tripBookings.map((b) => (
              <div
                key={b.id}
                className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-slate-800">{b.place?.name || 'Place Reservation'}</p>
                  <p className="text-[10px] text-slate-500">
                    {b.bookingDate} {b.startTime ? `@ ${b.startTime}` : ''} • {b.guestCount} Guest(s)
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Travel Copilot Command Bar */}
      <AICopilotBar tripId={trip.id} onTripUpdated={loadTrip} />

      {/* Interactive Day-by-Day Schedule Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Daily Itinerary Schedule</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize activities, timing, notes, and places for each day.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setIsAddActivityOpen(true)}
            className="text-xs px-4 py-2 self-start md:self-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            + Add Activity
          </Button>
        </div>

        {/* Day Navigation Tabs */}
        {trip.days && trip.days.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
            {trip.days.map((day, idx) => {
              const isActive = activeDayId === day.id;
              const formattedDate = new Date(day.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <button
                  key={day.id}
                  onClick={() => setActiveDayId(day.id)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border text-left ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className={isActive ? 'font-bold text-indigo-900' : 'font-semibold text-slate-800'}>Day {idx + 1}</div>
                  <div className="text-[10px] text-slate-500">{formattedDate}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Day Timeline Content */}
        {activeDay ? (
          <Card className="bg-white border-slate-200 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeDay.title || 'Scheduled Activities'}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(activeDay.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {activeDay.activities?.length || 0} activity(ies)
              </span>
            </div>

            {/* Activities List / Timeline */}
            {activeDay.activities && activeDay.activities.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 font-sans before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {activeDay.activities.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Timeline Node Bullet */}
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    </div>

                    {/* Activity Card */}
                    <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 p-4 rounded-xl space-y-3 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {act.startTime && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-indigo-700 border border-slate-200">
                                ⏰ {act.startTime} {act.endTime ? `– ${act.endTime}` : ''}
                              </span>
                            )}
                            {act.durationMinutes && (
                              <span className="text-[10px] text-slate-500">
                                ({act.durationMinutes} mins)
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-slate-900">{act.title}</h4>
                        </div>

                        {/* Cost & Action Buttons */}
                        <div className="flex items-center space-x-3 self-end sm:self-auto">
                          {act.estimatedCost !== null && act.estimatedCost > 0 && (
                            <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Est. ${act.estimatedCost}
                            </span>
                          )}

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setEditingActivity(act)}
                              className="px-2.5 py-1 text-xs rounded bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingActivity({ id: act.id, title: act.title })}
                              className="px-2.5 py-1 text-xs rounded bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-100 transition-colors font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Linked Place details if available */}
                      {act.place && (
                        <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center space-x-2.5">
                            <span>📍</span>
                            <div>
                              <Link
                                href={`/app/explore/${act.place.id}`}
                                className="font-bold text-indigo-600 hover:underline"
                              >
                                {act.place.name}
                              </Link>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {act.place.category} • {act.place.city || act.place.address}
                              </p>
                            </div>
                          </div>
                          <Link href={`/app/explore/${act.place.id}`}>
                            <span className="text-[11px] text-slate-500 hover:text-slate-900 underline font-medium">
                              View →
                            </span>
                          </Link>
                        </div>
                      )}

                      {act.description && (
                        <p className="text-xs text-slate-700 leading-relaxed">{act.description}</p>
                      )}

                      {act.notes && (
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded border border-slate-200 italic">
                          ✍️ {act.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <span className="text-3xl">🗓️</span>
                <h4 className="text-sm font-bold text-slate-900">No activities planned for this day</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Start building your itinerary by adding custom activities or browsing top places to visit.
                </p>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddActivityOpen(true)}
                    className="text-xs px-3.5 py-1.5"
                  >
                    + Custom Activity
                  </Button>
                  <Link href="/app/explore">
                    <Button variant="primary" className="text-xs px-3.5 py-1.5">
                      Explore Places
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="text-center py-8 text-xs text-slate-500 bg-white border-slate-200">
            No day selected.
          </Card>
        )}
      </div>

      {/* Modals */}
      <AddActivityModal
        tripId={trip.id}
        days={trip.days || []}
        initialDayId={activeDayId}
        isOpen={isAddActivityOpen}
        onClose={() => setIsAddActivityOpen(false)}
        onSuccess={loadTrip}
      />

      <EditActivityModal
        tripId={trip.id}
        activity={editingActivity}
        isOpen={!!editingActivity}
        onClose={() => setEditingActivity(null)}
        onSuccess={loadTrip}
      />

      <ConfirmDeleteModal
        tripId={trip.id}
        activityId={deletingActivity?.id || null}
        activityTitle={deletingActivity?.title}
        isOpen={!!deletingActivity}
        onClose={() => setDeletingActivity(null)}
        onSuccess={loadTrip}
      />
    </div>
  );
}
