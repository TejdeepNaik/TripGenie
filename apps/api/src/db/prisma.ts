import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

declare global {
  // Allow global var declarations across dev hot reloads and serverless container reuses
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.globalPrisma ||
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (!globalThis.globalPrisma) {
  globalThis.globalPrisma = db;
}
