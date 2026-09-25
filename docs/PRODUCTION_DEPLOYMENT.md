# TripGenie Production Deployment Guide

## 1. Production Architecture Specification

TripGenie uses a provider-neutral microservices / container architecture:

```text
Internet
   │
HTTPS / TLS Certificate
   │
Frontend (Next.js 14 Standalone Container - Port 3000)
   │
HTTPS API (CORS Whitelisted Origin)
   │
Fastify API (Node.js Container - Port 3001)
   │
PostgreSQL 16 (Relational Database Engine)
   │
Payment Gateway (Razorpay API / Webhook Integration)
```

---

## 2. Infrastructure Requirements

- **API Engine**: Fastify API running on Node.js 20+ (standalone container image, non-root user).
- **Web Engine**: Next.js 14 App Router (standalone server output container).
- **Database Engine**: PostgreSQL 16 with SSL/TLS connection support.
- **Reverse Proxy / Load Balancer**: Nginx, Cloudflare, Traefik, or AWS ALB providing TLS termination (HTTPS) and routing.

---

## 3. Environment & Secret Provisioning

Deployments must configure environment variables using secret management rather than committed `.env` files:

```bash
# Required Production Settings
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://user:password@postgres_host:5432/tripgenie_prod?schema=public&sslmode=prefer
SESSION_SECRET=YOUR_64_CHAR_RANDOM_SESSION_SECRET_STRING
FRONTEND_URL=https://tripgenie.example.com
NEXT_PUBLIC_API_URL=https://api.tripgenie.example.com
CORS_ALLOWED_ORIGINS=https://tripgenie.example.com

# Payment Provider Credentials (Live Mode)
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_LIVE_WEBHOOK_SECRET
```

---

## 4. Database Migration Procedure

1. Verify production database connection strings:
   ```bash
   pnpm db:generate
   ```
2. Apply Prisma schema DDL migrations strictly via deploy:
   ```bash
   pnpm db:migrate:deploy
   ```
   *Note*: **NEVER** run `prisma migrate reset` in a production environment.

3. Verify migration status:
   ```bash
   pnpm --filter @tripgenie/api exec prisma migrate status
   ```

---

## 5. Containerized Deployment Steps

1. Build production Docker images:
   ```bash
   docker build -t tripgenie_api:latest -f apps/api/Dockerfile .
   docker build -t tripgenie_web:latest --build-arg NEXT_PUBLIC_API_URL=https://api.tripgenie.example.com -f apps/web/Dockerfile .
   ```
2. Start services via Docker Compose:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
3. Inspect container status and health:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

---

## 6. Post-Deployment Verification

1. Verify process liveness:
   ```bash
   curl -f https://api.tripgenie.example.com/health
   ```
2. Verify dependency readiness:
   ```bash
   curl -f https://api.tripgenie.example.com/ready
   ```
3. Perform web frontend verification across key routes (`/`, `/login`, `/app`, `/app/explore`, `/app/bookings`, `/app/trips`).
