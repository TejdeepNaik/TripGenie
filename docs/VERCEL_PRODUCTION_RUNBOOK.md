# TripGenie — Vercel Production Deployment Runbook

## Overview

This runbook provides step-by-step instructions for linking, deploying, and operating **TripGenie** on Vercel.

---

## Step 1: Managed Database Provisioning & Migration

1. **Provision Managed PostgreSQL Instance**:
   - Create a database on Neon, Supabase, or Prisma Postgres.
   - Ensure SSL mode is enabled (`?sslmode=require`).
   - Copy the production connection URI: `DATABASE_URL`.

2. **Run DDL Schema Migrations**:
   Execute migrations against the production database from your deployment workstation:
   ```bash
   DATABASE_URL="postgresql://user:pass@production-host:5432/tripgenie?sslmode=require" npx pnpm db:migrate:deploy
   ```

   > **CRITICAL**: Never run `prisma migrate reset` against production.

---

## Step 2: Deploying TripGenie API on Vercel

1. **Link & Configure Vercel API Project**:
   ```bash
   cd apps/api
   vercel link
   ```
   - **Project Name**: `tripgenie-api`
   - **Root Directory**: `apps/api`
   - **Framework Preset**: `Other`

2. **Set Environment Variables on Vercel**:
   Configure environment settings in the Vercel Dashboard for **Production**:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `<production PostgreSQL URI>`
   - `SESSION_SECRET` = `<64+ character random string>`
   - `FRONTEND_URL` = `https://tripgenie.com`
   - `PAYMENT_PROVIDER` = `razorpay`
   - `RAZORPAY_KEY_ID` = `rzp_live_...`
   - `RAZORPAY_KEY_SECRET` = `<secret>`
   - `RAZORPAY_WEBHOOK_SECRET` = `<secret>`

   Configure environment settings for **Preview / Staging**:
   - `PAYMENT_PROVIDER` = `mock` (or `razorpay` with `rzp_test_*` credentials)

3. **Deploy API Project**:
   ```bash
   vercel --prod
   ```

4. **Assign Custom Domain**:
   - Add domain `api.tripgenie.com` to the Vercel API project.
   - Configure DNS CNAME / A records as specified by Vercel.

---

## Step 3: Deploying TripGenie Web on Vercel

1. **Link & Configure Vercel Web Project**:
   ```bash
   cd apps/web
   vercel link
   ```
   - **Project Name**: `tripgenie-web`
   - **Root Directory**: `apps/web`
   - **Framework Preset**: `Next.js`

2. **Set Environment Variables on Vercel**:
   - `NEXT_PUBLIC_API_URL` = `https://api.tripgenie.com`

3. **Deploy Web Project**:
   ```bash
   vercel --prod
   ```

4. **Assign Custom Domain**:
   - Add domain `tripgenie.com` to the Vercel Web project.
   - Configure DNS A / CNAME records as specified by Vercel.

---

## Step 4: Razorpay Webhook Registration

1. Log in to the Razorpay Merchant Dashboard.
2. Navigate to **Settings** -> **Webhooks**.
3. Add Webhook URL: `https://api.tripgenie.com/payments/webhooks/razorpay`.
4. Secret: Enter the exact value configured in `RAZORPAY_WEBHOOK_SECRET`.
5. Active Events:
   - `payment.captured`
   - `order.paid`
   - `payment.failed`

---

## Step 5: Production Verification Smoke Test

1. **Health Check**:
   ```bash
   curl -i https://api.tripgenie.com/health
   # Expected: HTTP 200 OK
   ```

2. **Readiness Probe**:
   ```bash
   curl -i https://api.tripgenie.com/ready
   # Expected: HTTP 200 OK (PostgreSQL connected + Provider valid)
   ```

3. **Cookie & Auth Test**:
   - Register a controlled test user on `https://tripgenie.com`.
   - Confirm login sets session cookie with `HttpOnly`, `Secure`, and `SameSite=lax`.

4. **IDOR Authorization Test**:
   - Confirm User A cannot view User B's bookings (`HTTP 404/403`).
   - Confirm non-admin user cannot access `POST /internal/payments/reconcile` (`HTTP 403`).

---

## Step 6: Rollback Procedure on Vercel

If an operational issue occurs:
1. Open the Vercel Dashboard for `tripgenie-web` or `tripgenie-api`.
2. Navigate to **Deployments**.
3. Select the previous successful deployment.
4. Click **Instant Rollback**.
5. Verify payment data integrity remains intact via `/internal/payments/reconcile`.
