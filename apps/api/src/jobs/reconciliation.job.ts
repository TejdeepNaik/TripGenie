import { db } from '../db/prisma.js';
import { reconcilePaymentService } from '../payments/payment.service.js';
import { PaymentProvider } from '../payments/payment-provider.interface.js';
import type { ReconciliationResult } from '@tripgenie/types';

export interface BatchReconciliationResult {
  totalScanned: number;
  matchedCount: number;
  syncedCount: number;
  discrepancyCount: number;
  errorCount: number;
  results: ReconciliationResult[];
}

/**
 * Scans for stale PENDING payments created > 5 minutes ago and reconciles state with provider.
 */
export async function runBatchReconciliationJob(
  limit: number = 50,
  providerOverride?: PaymentProvider
): Promise<BatchReconciliationResult> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // 1. Find stale pending payments
  const pendingPayments = await db.payment.findMany({
    where: {
      status: 'PENDING',
      createdAt: {
        lt: fiveMinutesAgo,
      },
    },
    take: Math.min(limit, 100), // Bound batch size
    orderBy: { createdAt: 'asc' },
  });

  const results: ReconciliationResult[] = [];
  let matchedCount = 0;
  let syncedCount = 0;
  let discrepancyCount = 0;
  let errorCount = 0;

  for (const payment of pendingPayments) {
    try {
      const res = await reconcilePaymentService(payment.id, providerOverride);
      results.push(res);

      if (res.status === 'MATCHED') matchedCount++;
      if (res.status === 'SYNCED') syncedCount++;
      if (res.status === 'DISCREPANCY_DETECTED') discrepancyCount++;
    } catch (err: any) {
      errorCount++;
      results.push({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        status: 'ERROR',
        dbPaymentStatus: payment.status as any,
        providerPaymentStatus: 'UNKNOWN',
        dbBookingStatus: 'PENDING_PAYMENT',
        discrepancyReason: err?.message || 'Reconciliation execution error',
      });
    }
  }

  return {
    totalScanned: pendingPayments.length,
    matchedCount,
    syncedCount,
    discrepancyCount,
    errorCount,
    results,
  };
}
