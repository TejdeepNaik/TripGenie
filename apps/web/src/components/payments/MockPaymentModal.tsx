import React, { useState } from 'react';
import { BookingDTO, PaymentDTO } from '@tripgenie/types';
import { Modal, Button, Alert, Badge } from '@tripgenie/ui';
import { api } from '../../lib/api-client';

interface MockPaymentModalProps {
  booking: BookingDTO;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export const MockPaymentModal: React.FC<MockPaymentModalProps> = ({
  booking,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const [payment, setPayment] = useState<(PaymentDTO & { clientSecret?: string; razorpayKeyId?: string }) | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [processingEvent, setProcessingEvent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const launchRazorpayCheckout = async (
    paymentIntent: PaymentDTO & { clientSecret?: string; razorpayKeyId?: string }
  ) => {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      setError('Failed to load Razorpay Checkout SDK. Please check your network connection.');
      return;
    }

    const keyId = paymentIntent.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    const options = {
      key: keyId,
      amount: Math.round(Number(booking.totalAmount) * 100),
      currency: booking.currency,
      name: 'TripGenie Travel',
      description: `Payment for ${booking.place?.name || 'Booking Reservation'}`,
      order_id: paymentIntent.providerPaymentId,
      handler: async function (response: any) {
        setProcessingEvent(true);
        setError(null);
        try {
          const verifyRes = await api.payments.verifyRazorpay({
            bookingId: booking.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          if (!verifyRes.success || !verifyRes.data) {
            setError(verifyRes.error?.message || 'Server-side payment signature verification failed.');
            return;
          }

          setPayment(verifyRes.data);
          if (verifyRes.data.status === 'SUCCEEDED' && onPaymentSuccess) {
            onPaymentSuccess();
          }
        } catch (err: any) {
          setError(err.message || 'Payment verification failed.');
        } finally {
          setProcessingEvent(false);
        }
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
        },
      },
      prefill: {
        name: 'TripGenie Customer',
      },
      theme: {
        color: '#2563eb',
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleInitiatePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.payments.createIntent(booking.id);
      if (!res.success || !res.data) {
        setError(res.error?.message || 'Failed to create payment intent.');
        return;
      }

      setPayment(res.data);

      if (res.data.provider === 'RAZORPAY') {
        await launchRazorpayCheckout(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateOutcome = async (outcome: 'payment.succeeded' | 'payment.failed') => {
    if (!payment) return;

    setProcessingEvent(true);
    setError(null);

    try {
      const res = await api.payments.processEvent({
        providerPaymentId: payment.providerPaymentId!,
        eventType: outcome,
        failureReason: outcome === 'payment.failed' ? 'Mock payment failure simulated' : undefined,
      });

      if (!res.success || !res.data) {
        setError(res.error?.message || 'Event processing failed.');
        return;
      }

      setPayment(res.data);
      if (res.data.status === 'SUCCEEDED' && onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Outcome simulation failed.');
    } finally {
      setProcessingEvent(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <Badge variant="purple" size="sm" className="mb-1">
            {payment?.provider === 'RAZORPAY' ? 'Razorpay Test Gateway' : 'Provider-Agnostic Gateway'}
          </Badge>
          <span className="block text-xl font-extrabold text-slate-900">Payment Checkout</span>
        </div>
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="danger" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Booking Summary Snapshot */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Booking Reference:</span>
            <span className="font-mono font-bold text-brand-700">{booking.id.slice(0, 13)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Reserved Place:</span>
            <span className="font-semibold text-slate-900">{booking.place?.name || 'Place Reservation'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Guest Count:</span>
            <span>{booking.guestCount} Guest(s)</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
            <span>Authoritative Total:</span>
            <span className="text-emerald-700">${booking.totalAmount} {booking.currency}</span>
          </div>
        </div>

        {!payment ? (
          /* Step 1: Initiate Payment */
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Click below to create an idempotent payment intent with server-authoritative pricing.
            </p>
            <Button
              variant="primary"
              size="lg"
              isLoading={loading}
              onClick={handleInitiatePayment}
              className="w-full"
            >
              Initiate Payment Checkout
            </Button>
          </div>
        ) : (
          /* Step 2: Payment Intent Created & Status Display */
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Provider:</span>
                <span className="font-mono text-xs font-bold text-brand-700">{payment.provider}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Provider Reference:</span>
                <span className="font-mono text-xs text-slate-800">{payment.providerPaymentId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Status:</span>
                <Badge
                  variant={
                    payment.status === 'SUCCEEDED'
                      ? 'success'
                      : payment.status === 'FAILED'
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                >
                  {payment.status}
                </Badge>
              </div>
              {payment.failureReason && (
                <div className="text-rose-600 text-[11px] pt-1">
                  Reason: {payment.failureReason}
                </div>
              )}
            </div>

            {payment.status === 'PENDING' && payment.provider === 'RAZORPAY' && (
              <div className="space-y-2 border-t border-slate-100 pt-3 text-center">
                <p className="text-xs text-slate-500">
                  Razorpay Checkout window launched. Complete the test payment or click below to retry checkout.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  isLoading={processingEvent || loading}
                  onClick={() => launchRazorpayCheckout(payment)}
                  className="w-full"
                >
                  Re-open Razorpay Checkout
                </Button>
              </div>
            )}

            {payment.status === 'PENDING' && payment.provider === 'MOCK' && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-600 block font-semibold">
                  Simulate Webhook / Provider Event:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="success"
                    size="sm"
                    isLoading={processingEvent}
                    onClick={() => handleSimulateOutcome('payment.succeeded')}
                    className="w-full"
                  >
                    Simulate Success
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={processingEvent}
                    onClick={() => handleSimulateOutcome('payment.failed')}
                    className="w-full"
                  >
                    Simulate Failure
                  </Button>
                </div>
              </div>
            )}

            {payment.status === 'SUCCEEDED' && (
              <Alert variant="success">
                🎉 Payment Succeeded! Booking has been automatically confirmed on the server.
              </Alert>
            )}

            <Button variant="secondary" size="md" onClick={onClose} className="w-full mt-2">
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
