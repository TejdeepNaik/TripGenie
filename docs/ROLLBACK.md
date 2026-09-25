# TripGenie Emergency Production Rollback Procedure

## 1. Overview & Rollback Principles

When a deployment-blocking defect or critical outage is detected post-release, follow this procedure to restore system operational health while preserving financial and database state integrity.

### Critical Rules:
1. **NEVER** attempt a database state rollback (e.g. `prisma migrate reset`) against a live production database.
2. **NEVER** roll back payment state records blindly in PostgreSQL without verifying authoritative payment gateway status.
3. If money has been processed by Razorpay, application state must be aligned via reconciliation (`reconcilePaymentService`), not raw database deletion.

---

## 2. Container & Image Rollback Steps

1. Identify previous known-good Docker image tags:
   ```bash
   docker images | grep tripgenie
   ```
2. Re-tag previous release image as target deployment:
   ```bash
   docker tag tripgenie_api:v0.1.0-previous tripgenie_api:latest
   docker tag tripgenie_web:v0.1.0-previous tripgenie_web:latest
   ```
3. Restart production container services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps api web
   ```
4. Verify liveness and readiness:
   ```bash
   curl -f http://localhost:3001/health
   curl -f http://localhost:3001/ready
   ```

---

## 3. Schema & Database Rollback Strategy (Expand-Contract Pattern)

If a new migration was deployed before rolling back application code:

1. **Non-Destructive Expand Phase**:
   - New database columns or tables added by migrations remain intact in PostgreSQL.
   - Rolled-back application code ignores added optional fields and continues reading base schema.
2. **Forward-Fix Migration Procedure**:
   - If a schema constraint causes errors on rolled-back code, author a new forward migration fixing the DDL constraint:
     ```bash
     pnpm db:migrate
     pnpm db:migrate:deploy
     ```

---

## 4. Payment Reconciliation Post-Rollback

Following an application container rollback, run state reconciliation to ensure all in-flight webhooks or payments captured during the incident are accurately recorded:

```bash
curl -X POST https://api.tripgenie.example.com/internal/payments/reconcile \
  -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```
