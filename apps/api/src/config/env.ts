import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file if available
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL environment variable is required',
    })
    .min(1, 'DATABASE_URL cannot be empty'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3001'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  SESSION_SECRET: z
    .string()
    .default('tripgenie_super_secret_session_key_min_32_bytes_long_dev'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  GOOGLE_PLACES_ENABLED: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  AI_ENABLED: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  AI_PROVIDER: z.enum(['gemini', 'mock']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  APP_VERSION: z.string().default('0.1.0'),
}).superRefine((data, ctx) => {
  const isProductionLike = data.NODE_ENV === 'production' || data.NODE_ENV === 'staging';

  // Production/Staging Strictness Checks
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

  // Payment Provider Validation & Production Safeguards
  if (data.PAYMENT_PROVIDER === 'razorpay') {
    if (!data.RAZORPAY_KEY_ID || data.RAZORPAY_KEY_ID.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_KEY_ID is required when PAYMENT_PROVIDER is set to "razorpay"',
        path: ['RAZORPAY_KEY_ID'],
      });
    }
    if (!data.RAZORPAY_KEY_SECRET || data.RAZORPAY_KEY_SECRET.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_KEY_SECRET is required when PAYMENT_PROVIDER is set to "razorpay"',
        path: ['RAZORPAY_KEY_SECRET'],
      });
    }

    // Safety check: Prevent accidental live Razorpay credentials in development/staging environments
    if (data.RAZORPAY_KEY_ID && data.RAZORPAY_KEY_ID.startsWith('rzp_live_') && data.NODE_ENV !== 'production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SAFETY SAFEGUARD: Live production Razorpay credentials (rzp_live_*) cannot be used in non-production environments. Use test keys (rzp_test_*) for staging/development.',
        path: ['RAZORPAY_KEY_ID'],
      });
    }
  }
});

const _envResult = envSchema.safeParse(process.env);

if (!_envResult.success) {
  console.error('❌ Invalid Environment Variables Configuration:');
  console.error(JSON.stringify(_envResult.error.format(), null, 2));
  throw new Error('Environment configuration validation failed');
}

export const env = _envResult.data;
export type Env = typeof env;

