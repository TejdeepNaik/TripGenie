# TripGenie Incident Recovery Runbook

This runbook outlines diagnostic procedures, safe recovery actions, and verification steps for production operational incidents.

---

## 1. API Outage / Unresponsive Service

### Symptoms
- `GET /health` or `GET /ready` returns `503 Service Unavailable` or times out.
- High rate of HTTP 5xx errors reported by load balancer.

### Diagnostic Steps
1. Inspect container process logs:
   ```bash
   docker logs tripgenie_api --tail 100
   ```
2. Verify container resource usage (CPU/Memory exhaustion):
   ```bash
   docker stats tripgenie_api
   ```
3. Test network connectivity from API container to PostgreSQL container.

### Recovery Actions
- Restart API containers cleanly to trigger SIGTERM graceful shutdown:
  ```bash
  docker compose restart api
  ```
- If resource exhausted, scale up API memory/CPU allocation.

---

## 2. Database Connection Exhaustion / PostgreSQL Outage

### Symptoms
- `/ready` probe returns `checks: { database: "unreachable" }`.
- Logs show `PrismaClientInitializationError` or `Timed out fetching a connection from the pool`.

### Diagnostic Steps
1. Check PostgreSQL container health:
   ```bash
   docker exec -it tripgenie_postgres pg_isready -U postgres -d tripgenie
   ```
2. Check active PostgreSQL connections:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```

### Recovery Actions
- Scale down idle API instances or adjust `DATABASE_URL` pool size (`connection_limit=20`).
- If PostgreSQL is unresponsive, restart PostgreSQL:
  ```bash
  docker compose restart postgres
  ```

---

## 3. Webhook Outage or Stuck Payments (PENDING Status)

### Symptoms
- Payments remain stuck in `PENDING` state after user checkout.
- Webhook signature failures or missed Razorpay event deliveries.

### Diagnostic Steps
1. Check `ProviderEventLog` table for failed or unprocessed webhook deliveries:
   ```sql
   SELECT * FROM "ProviderEventLog" WHERE status = 'FAILED' ORDER BY "createdAt" DESC LIMIT 20;
   ```
2. Inspect payment audit logs in `Payment` table for raw provider events.

### Recovery Actions
- Trigger batch reconciliation job to automatically query Razorpay API and sync payment states:
  ```bash
  curl -X POST http://localhost:3001/internal/payments/reconcile \
    -H "Content-Type: application/json" \
    -d '{"limit": 50}'
  ```

---

## 4. Refund Failure or Processing Error

### Symptoms
- Refund status stuck in `PENDING` or user reports missing refund.

### Diagnostic Steps
1. Check payment history and refund logs:
   ```sql
   SELECT * FROM "Payment" WHERE status = 'REFUNDED' OR status = 'FAILED';
   ```
2. Verify provider reference ID (`providerPaymentId`).

### Recovery Actions
- Re-trigger refund endpoint using the identical idempotency key.
- Verify refund status directly with Razorpay dashboard using provider ID.

---

## 5. Failed Database Migration

### Symptoms
- `prisma migrate deploy` fails during deployment.

### Safe Checks
1. Check migration log output for foreign key or index syntax errors.
2. Verify current database migration status:
   ```bash
   pnpm --filter @tripgenie/api exec prisma migrate status
   ```

### Recovery Actions
- DO NOT execute `prisma migrate reset`.
- Author a forward-fix migration fixing the failed DDL statement.
- Apply fixed migration with `pnpm db:migrate:deploy`.

---

---

## 7. Application & Infrastructure Rollback Procedures

### Container & Image Rollback
1. To roll back an application release safely without downtime:
   ```bash
   # Re-tag previous release candidate container image
   docker tag tripgenie_api:previous tripgenie_api:latest
   docker tag tripgenie_web:previous tripgenie_web:latest

   # Perform rolling restart of services
   docker compose up -d --no-deps api web
   ```
2. Verify system liveness and readiness:
   ```bash
   curl -f http://localhost:3001/health
   curl -f http://localhost:3001/ready
   ```

### Database Forward-Fix Strategy
- **NEVER** run `prisma migrate reset` or destructive down-migrations in production.
- If a deployment must be rolled back after a schema migration was applied:
  1. Ensure old application code remains compatible with the added columns/tables (expand-contract pattern).
  2. If a migration broke schema constraints, author a new forward migration fixing the DDL statement and deploy via `pnpm db:migrate:deploy`.

---

## 8. Payment & Booking Inconsistency Response Protocol

If a discrepancy occurs between user booking state and provider payment state:

1. **Query Idempotent Audit Log**:
   ```sql
   SELECT * FROM "PaymentAuditLog" WHERE "bookingId" = '<BOOKING_ID>' ORDER BY "createdAt" DESC;
   ```
2. **Execute Single-Payment Reconciliation**:
   ```bash
   curl -X POST http://localhost:3001/payments/<PAYMENT_ID>/reconcile \
     -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>"
   ```
3. **Verify State Machine Alignment**:
   - If payment state is `SUCCEEDED`, booking state MUST be `CONFIRMED`.
   - If payment state is `FAILED` or `CANCELLED`, booking state MUST remain `PENDING_PAYMENT` or `CANCELLED`.
   - Reconciliation automatically aligns booking status with server-authoritative payment provider state without manual database edits.
