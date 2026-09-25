import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../db/prisma.js';
import { sanitizeLogData } from '../../logging/logger.js';
import { runBatchReconciliationJob } from '../../jobs/reconciliation.job.js';
import { MockPaymentProvider } from '../mock-payment.provider.js';

describe('Phase 13 — Production Readiness & Observability Verification', () => {
  let adminUser: any;
  let customerUser: any;

  before(async () => {
    adminUser = await db.user.create({
      data: {
        email: `prod_admin_${Date.now()}@example.com`,
        name: 'Production Admin',
        passwordHash: 'hashed_pw',
        role: 'ADMIN',
      },
    });

    customerUser = await db.user.create({
      data: {
        email: `prod_cust_${Date.now()}@example.com`,
        name: 'Production Customer',
        passwordHash: 'hashed_pw',
        role: 'CUSTOMER',
      },
    });
  });

  after(async () => {
    await db.user.deleteMany({
      where: { id: { in: [adminUser.id, customerUser.id] } },
    });
  });

  describe('1. Log Redaction & Security Audit', () => {
    test('Sanitizes sensitive credentials and secrets from log metadata', () => {
      const sensitiveData = {
        userId: 'usr_123',
        password: 'super_secret_password',
        razorpaySignature: 'hmac_sha256_sig_123',
        authorization: 'Bearer token_abc',
        nested: {
          secretKey: 'key_xyz',
          safeField: 'normal_data',
        },
      };

      const sanitized = sanitizeLogData(sensitiveData);

      assert.equal(sanitized.userId, 'usr_123');
      assert.equal(sanitized.password, '[REDACTED]');
      assert.equal(sanitized.razorpaySignature, '[REDACTED]');
      assert.equal(sanitized.authorization, '[REDACTED]');
      assert.equal(sanitized.nested.secretKey, '[REDACTED]');
      assert.equal(sanitized.nested.safeField, 'normal_data');
    });
  });

  describe('2. Health & Dependency Readiness Evaluation', () => {
    test('Ready check succeeds against active PostgreSQL database', async () => {
      const result = await db.$queryRaw`SELECT 1 as result`;
      assert.ok(result);
    });
  });

  describe('3. Operational Batch Reconciliation Job', () => {
    test('Batch reconciliation job scans stale pending payments safely without errors', async () => {
      const mockProvider = new MockPaymentProvider();
      const batchResult = await runBatchReconciliationJob(10, mockProvider);

      assert.ok(batchResult);
      assert.equal(typeof batchResult.totalScanned, 'number');
      assert.equal(typeof batchResult.matchedCount, 'number');
      assert.equal(typeof batchResult.syncedCount, 'number');
      assert.equal(typeof batchResult.discrepancyCount, 'number');
      assert.equal(typeof batchResult.errorCount, 'number');
    });
  });
});
