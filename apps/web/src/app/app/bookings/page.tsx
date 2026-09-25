'use client';

import React, { useEffect, useState } from 'react';
import { BookingDTO, BookingStatus } from '@tripgenie/types';
import { api } from '../../../lib/api-client';
import Link from 'next/link';
import { Button, Card, Badge, Alert, EmptyState, Modal } from '@tripgenie/ui';

import { MockPaymentModal } from '../../../components/payments/MockPaymentModal';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Cancellation Modal State
  const [targetCancelBooking, setTargetCancelBooking] = useState<BookingDTO | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [paymentBooking, setPaymentBooking] = useState<BookingDTO | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.bookings.list();
      if (!res.success) {
        setError(res.error?.message || 'Failed to load bookings.');
        return;
      }
      setBookings(res.data || []);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleConfirmCancellation = async () => {
    if (!targetCancelBooking) return;

    setCancelling(true);
    setCancelError(null);
    try {
      const res = await api.bookings.cancel(targetCancelBooking.id);
      if (!res.success) {
        setCancelError(res.error?.message || 'Failed to cancel reservation.');
        setCancelling(false);
        return;
      }
      setTargetCancelBooking(null);
      fetchBookings();
    } catch (err: any) {
      setCancelError(err.message || 'Cancellation request failed.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadgeVariant = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING_PAYMENT':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      case 'COMPLETED':
        return 'purple';
      case 'REFUNDED':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'UPCOMING') return ['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status);
    if (filterStatus === 'PAST') return ['COMPLETED', 'NO_SHOW'].includes(b.status);
    if (filterStatus === 'CANCELLED') return ['CANCELLED', 'REFUNDED'].includes(b.status);
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Bookings & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your place reservations, activities, and experience bookings.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 border border-slate-200 rounded-xl text-xs">
          {['ALL', 'UPCOMING', 'PAST', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-xs">Loading reservations...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="danger">
          <div className="flex justify-between items-center w-full">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchBookings}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && filteredBookings.length === 0 && (
        <EmptyState
          icon="📅"
          title="No Bookings Found"
          description="You haven't placed any reservations in this category yet. Explore places to start booking activities!"
          actionLabel="Explore Places"
          onAction={() => window.location.href = '/app/explore'}
        />
      )}

      {/* Bookings List */}
      {!loading && !error && filteredBookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const canCancel = ['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status);

            return (
              <Card
                key={b.id}
                className="hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Badge variant="purple" size="sm" className="mb-1">
                        {b.bookingType}
                      </Badge>
                      <h3 className="text-base font-bold text-slate-900">
                        {b.place?.name || 'Place Reservation'}
                      </h3>
                      {b.place?.city && (
                        <p className="text-xs text-slate-500 mt-0.5">📍 {b.place.city}</p>
                      )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(b.status)} size="md" dot>
                      {b.status}
                    </Badge>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                    <div>
                      <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block">Date & Time</span>
                      <span className="font-semibold text-slate-900">
                        {b.bookingDate} {b.startTime ? `@ ${b.startTime}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block">Guests</span>
                      <span className="font-semibold text-slate-900">{b.guestCount} Guest(s)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block">Unit Snapshot</span>
                      <span className="font-mono text-slate-900">${b.unitPrice} {b.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block">Total Amount</span>
                      <span className="font-extrabold text-emerald-600">
                        ${b.totalAmount} {b.currency}
                      </span>
                    </div>
                  </div>

                  {b.trip && (
                    <div className="text-xs text-slate-500 flex items-center space-x-1">
                      <span>🎒 Trip:</span>
                      <Link
                        href={`/app/trips/${b.trip.id}`}
                        className="text-brand-600 hover:underline font-semibold"
                      >
                        {b.trip.title}
                      </Link>
                    </div>
                  )}

                  {b.notes && (
                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600 italic">
                      &quot;{b.notes}&quot;
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-mono text-[10px] text-slate-400">ID: {b.id.slice(0, 8)}...</span>

                  <div className="flex items-center space-x-2">
                    {b.status === 'PENDING_PAYMENT' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setPaymentBooking(b);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        💳 Pay Now
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setTargetCancelBooking(b)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {targetCancelBooking && (
        <Modal
          isOpen={!!targetCancelBooking}
          onClose={() => setTargetCancelBooking(null)}
          title="Cancel Reservation?"
          description={`Reference: ${targetCancelBooking.id}`}
        >
          <div className="space-y-4 text-xs">
            {cancelError && (
              <Alert variant="danger" onClose={() => setCancelError(null)}>
                {cancelError}
              </Alert>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
              <h4 className="font-bold text-sm">Please Note Before Cancelling:</h4>
              <p className="leading-relaxed">
                Cancelling this reservation for <strong className="font-bold">{targetCancelBooking.place?.name}</strong> will release the reserved time slot.
              </p>
              {targetCancelBooking.status === 'CONFIRMED' ? (
                <p className="font-semibold text-emerald-800">
                  ✓ Since payment was completed, server refund reconciliation will automatically process a refund for ${targetCancelBooking.totalAmount} {targetCancelBooking.currency}.
                </p>
              ) : (
                <p className="text-slate-600">
                  No charge was processed for this pending reservation.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetCancelBooking(null)}
                disabled={cancelling}
              >
                Keep Reservation
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={cancelling}
                onClick={handleConfirmCancellation}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mock Payment Gateway Modal */}
      {paymentBooking && (
        <MockPaymentModal
          booking={paymentBooking}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentBooking(null);
          }}
          onPaymentSuccess={fetchBookings}
        />
      )}
    </div>
  );
}
