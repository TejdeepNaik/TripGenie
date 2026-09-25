# TripGenie Go-Live Operational Runbook

## 1. Pre-Flight Go-Live Gate

Before activating production traffic or enabling live payment gateway processing, complete all verification checks:

```text
[x] Automated tests (119/119 passing)
[x] TypeScript compilation (0 errors)
[x] ESLint validation (0 errors)
[x] Next.js production build succeeded
[x] Fastify API build succeeded
[x] Database schema migrations deployed (`pnpm db:migrate:deploy`)
[x] HTTPS certificates active
[x] Production CORS origin matching frontend domain
[x] SESSION_SECRET explicitly configured (>= 32 chars)
[x] Operational endpoint /internal/payments/reconcile protected (ADMIN only)
[x] Health / ready probes return 200 OK
[x] Rollback procedure documented
```

---

## 2. Webhook Setup & Registration Procedure

1. Log into Razorpay Merchant Dashboard.
2. Navigate to **Settings** → **Webhooks** → **Add New Webhook**.
3. Set Webhook URL:
   `https://api.tripgenie.example.com/payments/webhooks/razorpay`
4. Active Events Selection:
   - `order.paid`
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
   - `refund.failed`
5. Copy generated Webhook Secret and set as `RAZORPAY_WEBHOOK_SECRET` in production API environment secret manager.
6. Restart API service to apply new webhook secret.

---

## 3. Controlled Production Smoke Testing

1. **User Authentication**:
   - Register a dedicated QA customer account (`qa-test-user@tripgenie.example`).
   - Log in and verify session cookie issuance (`HttpOnly`, `SameSite=lax`, `Secure`).
2. **Discovery & Exploration**:
   - Navigate to `/app/explore`, apply category filters, and inspect place details.
3. **Booking Reservation**:
   - Reserve a test spot (`PENDING_PAYMENT` state created).
4. **Controlled Live Payment Verification**:
   - If performing a controlled live transaction, execute a small INR 1.00 or USD 1.00 test payment using a known test card.
   - Verify payment signature verification passes and payment transitions to `SUCCEEDED`.
   - Confirm booking transitions to `CONFIRMED`.
5. **Controlled Cancellation & Refund**:
   - Cancel the test reservation via `/app/bookings`.
   - Confirm refund request executes safely and payment transitions to `REFUNDED`.

---

## 4. Operational Maintenance & Monitoring

1. **Daily Operational Health Monitoring**:
   - Liveness Probe: `GET /health`
   - Readiness Probe: `GET /ready`
2. **Automated Batch Reconciliation**:
   - Run scheduled cron or triggered job for batch reconciliation:
     ```bash
     curl -X POST https://api.tripgenie.example.com/internal/payments/reconcile \
       -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"limit": 50}'
     ```
3. **Incident Recovery**:
   - Refer to `docs/RUNBOOK.md` for connection pool exhaustion, webhook delivery failures, and secret rotation procedures.
