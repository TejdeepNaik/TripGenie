# TripGenie Release Candidate Checklist

This checklist documents release readiness for TripGenie across Application, Database, Security, Payments, Infrastructure, and Operations.

---

## 1. Application

- [x] **Frontend Build**: Next.js production build (`pnpm --filter @tripgenie/web build`) passes without errors.
- [x] **API Build**: Fastify API build (`pnpm --filter @tripgenie/api build`) passes with 0 TypeScript compilation errors.
- [x] **Typecheck**: Workspace typecheck (`pnpm typecheck`) passes with 0 errors across all 6 packages.
- [x] **Linting**: ESLint (`pnpm lint`) passes with 0 lint errors across workspace.
- [x] **Automated Tests**: 119/119 unit and integration tests passing across 34 test suites.

---

## 2. Database

- [x] **Prisma Schema & Migrations**: Prisma migrations deployed cleanly (`pnpm prisma migrate deploy`); schema validated.
- [x] **Foreign Keys & Indexes**: Indexes created for `bookingId`, `paymentId`, `status`, `idempotencyKey`, `providerPaymentId`, `providerEventId`, `createdAt`.
- [x] **Decimal Field Precision**: All monetary values (`amount`, `unitPrice`, `totalAmount`, `budget`) strictly typed as `@db.Decimal(12, 2)`.
- [x] **Backup Strategy**: Documented in `docs/BACKUP_RESTORE.md` (pg_dump / pg_restore scripts).
- [x] **Restore Capability**: Backup/restore procedures documented (`docs/BACKUP_RESTORE.md`). Live restore in staging environment marked `NOT VERIFIED` due to environment constraints.

---

## 3. Security

- [x] **Authentication**: Session token hashing, cookie options (`HttpOnly`, `Secure` in production, `SameSite=lax`), session expiration, explicit logout session deletion verified.
- [x] **Authorization & IDOR Protection**: User ownership checks enforced on all booking, payment, and trip endpoints (`GET`, `POST`, `PUT`, `DELETE`).
- [x] **Internal Endpoints**: `/internal/payments/reconcile` protected with authentication and explicit `role === 'ADMIN'` requirement.
- [x] **Secret Audit**: Zero committed credentials or raw secret keys in client bundles or public git history.
- [x] **CORS Configuration**: Explicit origin whitelist (`env.FRONTEND_URL`, `http://localhost:3000`, `http://127.0.0.1:3000`); no wildcard `*`.
- [x] **Error Response Sanitization**: Production error handler redacts stack traces, database internals, and sensitive field names (`password`, `secret`, `razorpaySignature`).

---

## 4. Payments

- [x] **Server-Authoritative Pricing**: Total amounts calculated server-side in Fastify/PostgreSQL. Client cannot modify totals or force status transitions.
- [x] **Razorpay Integration**: Test mode active (`rzp_test_*`). Order creation and signature verification performed server-side.
- [x] **Webhook Signature & Idempotency**: HMAC-SHA256 signature verification over raw request body (`x-razorpay-signature`); `ProviderEventLog` enforces idempotency.
- [x] **Refund Protection**: Concurrency-safe aggregate refund calculation; total refunds capped at payment amount.
- [x] **Reconciliation**: Batch and single-payment reconciliation endpoints sync database states with provider authoritative state without manual database edits.
- [x] **Explicit Production Activation**: Live Razorpay keys (`rzp_live_*`) blocklisted during staging validation; production activation requires explicit environment configuration.

---

## 5. Infrastructure

- [x] **Docker Multi-Stage Builds**: Dockerfiles provided for API (`apps/api/Dockerfile`) and Web (`apps/web/Dockerfile`); non-root user execution configured.
- [x] **Docker Compose**: `docker-compose.yml` configures PostgreSQL 16, API service, Web frontend, and network isolation.
- [x] **Health Liveness Probe**: `GET /health` returns process liveness status (`200 OK`).
- [x] **Readiness Probe**: `GET /ready` evaluates PostgreSQL connectivity and payment configuration (`200 OK` or `503 Service Unavailable`).
- [x] **Graceful Shutdown**: `SIGTERM` / `SIGINT` handler stops connection acceptance, closes Fastify server, and disconnects Prisma DB pool cleanly within 10 seconds.
- [x] **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and production builds with PostgreSQL service containers.

---

## 6. Operations

- [x] **Structured Logging**: JSON logging powered by Fastify logger with automatic redaction of sensitive fields.
- [x] **Request Correlation**: `X-Request-Id` injected into every incoming HTTP request header and included in error responses.
- [x] **Runbook Documentation**: `docs/RUNBOOK.md` updated with incident recovery, container rollback procedures, forward-fix migration strategies, and secret rotation steps.
- [x] **Staging Verification**: Executed full `pnpm verify:staging` pipeline with exit code 0.
