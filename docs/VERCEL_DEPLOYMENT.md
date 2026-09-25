# TripGenie — Vercel Production Deployment Architecture & Specification

## Executive Summary

This document specifies the architectural adaptation of the **TripGenie** monorepo (`apps/web`, `apps/api`, `packages/*`) for serverless deployment on **Vercel**. 

The adaptation preserves 100% of existing application behavior, business logic, payment state machines, booking concurrency protections, IDOR checks, session cookies, and Razorpay webhook HMAC signature verification without introducing any changes to the UI/UX or API endpoints.

---

## 1. Vercel Architecture Overview

```text
                                Internet
                                   │
                                   ▼
                            Vercel Edge / TLS
                                   │
             ┌─────────────────────┴─────────────────────┐
             │                                           │
             ▼                                           ▼
      TripGenie Web                               TripGenie API
     (Vercel Project)                            (Vercel Project)
     Root: apps/web                              Root: apps/api
     Framework: Next.js 14                       Framework: Serverless Function
     Route: https://tripgenie.com                Route: https://api.tripgenie.com
             │                                           │
             └─────────────────────┬─────────────────────┘
                                   │
                                   ▼
                      Managed PostgreSQL Serverless
                    (Neon / Supabase / Prisma Postgres)
                                   │
                                   ▼
                      Razorpay Payment Gateway API
```

---

## 2. Fastify Serverless Adaptation Strategy

To run Fastify as a serverless function on Vercel without altering route definitions or middleware, the application entrypoint was refactored into a clean modular pattern:

### A. Modular Application Factory (`apps/api/src/app.ts`)
- Exports `buildApp(): Promise<FastifyInstance>`.
- Registers request correlation logging, centralized error handler, environment-scoped CORS, cookie parsing, rate limiting, and all API routes (`/auth`, `/trips`, `/places`, `/ai`, `/bookings`, `/payments`, `/internal`, `/health`, `/ready`).
- Preserves the `preParsing` raw request body stream hook on `/payments/webhooks/razorpay` to capture untampered bytes for HMAC-SHA256 signature verification.

### B. Traditional Local Server Entrypoint (`apps/api/src/index.ts`)
- Calls `buildApp()`.
- Registers graceful shutdown hooks (`SIGTERM`, `SIGINT`).
- Binds to `0.0.0.0:3001` for local development (`pnpm dev`) and Docker container deployments.

### C. Vercel Serverless Function Handler (`apps/api/api/index.ts`)
- Exports a Vercel serverless function `default async function handler(req, res)`.
- Implements container warm-start caching (`appInstance` singleton) to avoid re-registering plugins on warm invocations.
- Dispatches HTTP requests directly to Fastify via `app.server.emit('request', req, res)`.

### D. Vercel Route Specification (`apps/api/vercel.json`)
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ]
}
```

---

## 3. Database Strategy: Managed PostgreSQL

Vercel functions operate as ephemerally scaled serverless lambdas. Persistent containerized PostgreSQL is not used in production serverless environments.

### Supported Managed PostgreSQL Providers:
1. **Neon Serverless PostgreSQL** (Recommended for Vercel integration & connection pooling via WebSocket / PgBouncer).
2. **Supabase PostgreSQL** (Direct SSL connection or transaction pooling via Supavisor).
3. **Prisma Postgres** (Native Prisma serverless cache & query engine integration).
4. **AWS Aurora Serverless v2 PostgreSQL**.

### Prisma Connection Pooling & Warm Starts (`apps/api/src/db/prisma.ts`):
To prevent connection exhaustion when serverless lambdas scale out, Prisma Client is instantiated as a global singleton:

```typescript
declare global {
  var globalPrisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.globalPrisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (!globalThis.globalPrisma) {
  globalThis.globalPrisma = db;
}
```

---

## 4. Environment Variables & Secret Separation

### API Project (`apps/api`) Settings on Vercel:
```text
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@ep-cool-pool.neon.tech/tripgenie?sslmode=require
SESSION_SECRET=<64+ random characters>
FRONTEND_URL=https://tripgenie.com
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=<secret>
RAZORPAY_WEBHOOK_SECRET=<secret>
```

### Web Project (`apps/web`) Settings on Vercel:
```text
NEXT_PUBLIC_API_URL=https://api.tripgenie.com
```

> **Security Rule**: Secrets (`DATABASE_URL`, `SESSION_SECRET`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) must NEVER be prefixed with `NEXT_PUBLIC_` and must NEVER be accessible by browser code.

---

## 5. Webhook Signature Verification Safety

Razorpay webhooks (`POST /payments/webhooks/razorpay`) require raw unparsed HTTP body bytes to calculate the HMAC-SHA256 signature (`crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`).

The Fastify adapter retains its `preParsing` hook:
```typescript
fastify.addHook('preParsing', async (request, _reply, payload) => {
  if (request.url.startsWith('/payments/webhooks/razorpay')) {
    const chunks: Buffer[] = [];
    for await (const chunk of payload) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBuffer = Buffer.concat(chunks);
    (request as any).rawBody = rawBuffer;

    const { Readable } = await import('stream');
    return Readable.from(rawBuffer);
  }
  return payload;
});
```
This guarantees that signature verification operates on exact raw request bytes before JSON body parsing occurs.
