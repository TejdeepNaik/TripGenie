# TripGenie Production Release Gate & Verification Checklist

## 1. Application & Quality Assurance

- [x] **Workspace Build**: All workspace packages (`@tripgenie/config`, `@tripgenie/ui`, `@tripgenie/types`, `@tripgenie/api`, `@tripgenie/web`) compile cleanly (`pnpm build`).
- [x] **Typecheck**: 0 TypeScript compilation errors (`pnpm typecheck`).
- [x] **Linting**: 0 ESLint errors (`pnpm lint`).
- [x] **Automated Test Suite**: 119/119 tests passing across 34 suites (`pnpm test`).
- [x] **Staging Pipeline**: Full verification pipeline (`pnpm verify:staging`) passed with exit code 0.

---

## 2. Security & Access Control

- [x] **HTTPS / TLS**: Production documentation and container configurations specify HTTPS termination.
- [x] **CORS Whitelist**: Origin whitelisting active; wildcard `*` prohibited.
- [x] **Session Security**: Cookie attributes configured (`HttpOnly`, `SameSite=lax`, `Secure`); session secret strictness enforced in production mode.
- [x] **IDOR Protection**: User ownership checks active across all booking, payment, and trip routes (`GET`, `POST`, `PUT`, `DELETE`).
- [x] **Operational Endpoints**: Internal batch reconciliation (`/internal/payments/reconcile`) protected with `user.role === 'ADMIN'` role check.
- [x] **Log Redaction**: Sensitive keys (`authorization`, `cookie`, `password`, `secret`, `razorpaySignature`) redacted from structured logs.

---

## 3. Payment & Gateway Safety

- [x] **Server-Authoritative Pricing**: Total amounts calculated server-side in Fastify/PostgreSQL.
- [x] **HMAC Verification**: Razorpay Checkout and Webhook signatures verified using `crypto.timingSafeEqual` and raw request stream buffering.
- [x] **Idempotency**: `idempotencyKey` and `ProviderEventLog` prevent duplicate order or payment processing.
- [x] **Refund Safety**: Aggregate refund calculation prevents over-refunding.
- [x] **Razorpay Test Mode**: Verified in staging (`rzp_test_*`).
- [ ] **Controlled Live Payment Transaction**: `NOT EXECUTED` (live bank account transaction requires live production key provisioning and explicit go-live approval).

---

## 4. Infrastructure & Database

- [x] **PostgreSQL 16**: Supported with Prisma ORM; DDL migrations deployed strictly via `prisma migrate deploy`.
- [x] **Docker Specification**: Multi-stage Dockerfiles and `docker-compose.prod.yml` configured for non-root execution and health monitoring.
- [x] **Health Probes**: Liveness `/health` (200) and Readiness `/ready` (200/503) probes active.
- [x] **Graceful Shutdown**: 10-second timeout handler for `SIGTERM`/`SIGINT` signals.
- [ ] **Automated Cloud Backup Restore Execution**: `NOT VERIFIED` (procedures documented in `docs/BACKUP_RESTORE.md`, but remote execution requires live infrastructure).

---

## 5. Operations & Incident Readiness

- [x] **Runbook**: `docs/RUNBOOK.md` updated.
- [x] **Go-Live Runbook**: `docs/GO_LIVE_RUNBOOK.md` created.
- [x] **Rollback Plan**: `docs/ROLLBACK.md` created.
- [x] **Deployment Guide**: `docs/PRODUCTION_DEPLOYMENT.md` created.
