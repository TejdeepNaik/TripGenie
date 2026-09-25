# TripGenie Deployment & Strategy Guide

## Overview
TripGenie is designed to be **deployable, reproducible, rollback-safe, and production-infrastructure ready**. This document defines the deployment sequence, zero/low-downtime considerations, multi-instance API safety, CORS configuration, and rollback procedures.

---

## 1. Environment Separation Model

TripGenie supports four explicit environments:
- `development`: Local dev environment with hot reloading (`tsx`, `next dev`).
- `test`: CI/CD automated test suite execution against PostgreSQL 16.
- `staging`: Production-like environment using mock payment provider or Razorpay Test Mode keys (`rzp_test_*`).
- `production`: Fully hardened production deployment. Live real payment credentials remain blocklisted during Phase 14.

---

## 2. Standard Deployment Pipeline

```text
[ Git Push / PR ]
       │
       ▼
[ GitHub Actions CI ] ──(Runs lint, typecheck, unit/integration tests, migration check, build)
       │
       ▼
[ Container Image Build ] ──(Builds multi-stage Docker images for API and Web)
       │
       ▼
[ Database Migration ] ──(Execute: prisma migrate deploy)
       │
       ▼
[ Application Deployment ] ──(Rolling update of API and Web container pods)
       │
       ▼
[ Health & Readiness Verification ] ──(Poll GET /health and GET /ready)
```

---

## 3. Step-by-Step Deployment Protocol

1. **Build Container Images**:
   Build Docker images using the multi-stage `apps/api/Dockerfile` and `apps/web/Dockerfile`.
   ```bash
   docker build -f apps/api/Dockerfile -t tripgenie-api:latest .
   docker build -f apps/web/Dockerfile -t tripgenie-web:latest .
   ```

2. **Apply Database Migrations**:
   Run non-destructive production database migrations using Prisma migrate deploy:
   ```bash
   pnpm db:migrate:deploy
   ```
   > ⚠️ **CRITICAL**: Never execute `prisma migrate reset` in staging or production.

3. **Deploy Container Workloads**:
   Deploy the updated container images to the container orchestrator (e.g. Kubernetes, AWS ECS, Docker Compose).

4. **Verify Liveness and Readiness**:
   - `GET http://<api-host>:3001/health` -> Expect `200 OK` with `status: "ok"`
   - `GET http://<api-host>:3001/ready` -> Expect `200 OK` with `status: "ready"` and `database: "ok"`

---

## 4. Multi-Instance API & Concurrency Safety

TripGenie API instances are **stateless and multi-instance safe**:
- **PostgreSQL Source of Truth**: All booking availability, payment intents, and refund operations rely on PostgreSQL transaction isolation level and `SELECT ... FOR UPDATE` row-level locks.
- **Idempotency Locks**: Duplicate payment creation or refund requests with identical `idempotencyKey` values are protected by `@unique([idempotencyKey])` database constraints.
- **Webhook Safety**: Razorpay webhook processing is idempotent and uses `ProviderEventLog` to prevent double-processing across concurrent API nodes.
- **Reconciliation Jobs**: Batch reconciliation uses bounded `findMany` queries with transaction status checks, safe to run across multiple background processes or cron jobs.

---

## 5. Rollback Strategy

### Application Rollback
If an application error occurs post-deployment:
1. Revert container deployment image tags to the previous stable release.
2. Verify readiness probes (`GET /ready`).

### Database Migration Rollback Limitations
- Schema migrations in TripGenie are strictly additive and backward-compatible.
- If a forward migration added a new column or table, the previous version of the application will safely ignore it.
- Destructive column removals are strictly forbidden without a 2-phase migration process.

---

## 6. CORS & Reverse Proxy Hardening

- **CORS Configuration**: Wildcard origins (`*`) are disabled in production. Set `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` to explicit production domain names.
- **Reverse Proxy**: NGINX / Cloudflare must forward:
  - `Host`
  - `X-Real-IP`
  - `X-Forwarded-For`
  - `X-Forwarded-Proto`
  - `X-Request-Id` (propagates request correlation ID through Fastify logs)
