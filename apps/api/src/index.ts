import { buildApp } from './app.js';
import { env } from './config/env.js';
import { db } from './db/prisma.js';

export const server = await buildApp();

const port = env.PORT;
const host = env.HOST;

// Graceful Shutdown Sequence Handler
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown sequence...`);

  // Bounded shutdown timer (10s timeout)
  const timer = setTimeout(() => {
    console.error('⚠️ Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);

  try {
    console.log('1. Stopping Fastify server from accepting new connections...');
    await server.close();

    console.log('2. Disconnecting Prisma database connections...');
    await db.$disconnect();

    clearTimeout(timer);
    console.log('✨ Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err);
    clearTimeout(timer);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start API Server
try {
  await server.listen({ port, host });

  // Print Safe Operational Summary (NEVER output credentials/secrets)
  console.log(`
=====================================================
🚀 TripGenie Production-Ready API Server Initialized
=====================================================
Environment         : ${env.NODE_ENV}
Listening Address   : http://${host}:${port}
Active Payment Mode : ${env.PAYMENT_PROVIDER}
Database Engine     : PostgreSQL 16 (Prisma ORM)
CORS Allowed Origins: ${env.FRONTEND_URL}
Health Liveness     : http://${host}:${port}/health
Readiness Probe     : http://${host}:${port}/ready
=====================================================
  `);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
