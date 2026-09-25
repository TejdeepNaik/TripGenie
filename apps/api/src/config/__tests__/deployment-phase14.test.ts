import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

// Duplicate environment validation schema logic for isolated test verification
const envSchemaTest = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3001'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  SESSION_SECRET: z.string().default('tripgenie_super_secret_session_key_min_32_bytes_long_dev'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  APP_VERSION: z.string().default('0.1.0'),
}).superRefine((data, ctx) => {
  const isProductionLike = data.NODE_ENV === 'production' || data.NODE_ENV === 'staging';

  if (isProductionLike) {
    if (
      !data.SESSION_SECRET ||
      data.SESSION_SECRET === 'tripgenie_super_secret_session_key_min_32_bytes_long_dev' ||
      data.SESSION_SECRET.length < 32
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'In production or staging, SESSION_SECRET must be explicitly provided and at least 32 characters long.',
        path: ['SESSION_SECRET'],
      });
    }

    if (data.FRONTEND_URL === 'http://localhost:3000' && data.NODE_ENV === 'production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'In production, FRONTEND_URL must be configured to the production domain rather than localhost.',
        path: ['FRONTEND_URL'],
      });
    }
  }

  if (data.PAYMENT_PROVIDER === 'razorpay') {
    if (!data.RAZORPAY_KEY_ID || data.RAZORPAY_KEY_ID.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_KEY_ID is required when PAYMENT_PROVIDER is set to "razorpay"',
        path: ['RAZORPAY_KEY_ID'],
      });
    }

    if (data.RAZORPAY_KEY_ID && data.RAZORPAY_KEY_ID.startsWith('rzp_live_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SAFETY SAFEGUARD: Live production Razorpay credentials are blocklisted during Phase 14.',
        path: ['RAZORPAY_KEY_ID'],
      });
    }
  }
});

describe('Phase 14 — Deployment, CI/CD & Environment Separation Validation', () => {
  test('Passes environment validation in development mode with default secret', () => {
    const input = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/tripgenie',
      NODE_ENV: 'development',
    };

    const res = envSchemaTest.safeParse(input);
    assert.equal(res.success, true);
  });

  test('Fails fast in production mode if SESSION_SECRET is dev default or < 32 chars', () => {
    const input = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/tripgenie',
      NODE_ENV: 'production',
      SESSION_SECRET: 'tripgenie_super_secret_session_key_min_32_bytes_long_dev',
    };

    const res = envSchemaTest.safeParse(input);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.ok(
        res.error.issues.some((i) => i.message.includes('SESSION_SECRET must be explicitly provided'))
      );
    }
  });

  test('Fails fast in production if FRONTEND_URL is localhost', () => {
    const input = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/tripgenie',
      NODE_ENV: 'production',
      SESSION_SECRET: 'a_very_long_valid_production_session_secret_key_32_chars_min',
      FRONTEND_URL: 'http://localhost:3000',
    };

    const res = envSchemaTest.safeParse(input);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.ok(
        res.error.issues.some((i) => i.message.includes('configured to the production domain'))
      );
    }
  });

  test('Rejects live Razorpay credentials with blocklist safeguard', () => {
    const input = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/tripgenie',
      NODE_ENV: 'staging',
      SESSION_SECRET: 'a_very_long_valid_production_session_secret_key_32_chars_min',
      FRONTEND_URL: 'https://staging.tripgenie.app',
      PAYMENT_PROVIDER: 'razorpay',
      RAZORPAY_KEY_ID: 'rzp_live_1234567890abcdef',
      RAZORPAY_KEY_SECRET: 'secret_live_key',
    };

    const res = envSchemaTest.safeParse(input);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.ok(
        res.error.issues.some((i) => i.message.includes('Live production Razorpay credentials are blocklisted'))
      );
    }
  });

  test('Accepts valid Razorpay Test Mode credentials in staging', () => {
    const input = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/tripgenie',
      NODE_ENV: 'staging',
      SESSION_SECRET: 'a_very_long_valid_production_session_secret_key_32_chars_min',
      FRONTEND_URL: 'https://staging.tripgenie.app',
      PAYMENT_PROVIDER: 'razorpay',
      RAZORPAY_KEY_ID: 'rzp_test_1234567890abcdef',
      RAZORPAY_KEY_SECRET: 'secret_test_key',
    };

    const res = envSchemaTest.safeParse(input);
    assert.equal(res.success, true);
  });
});
