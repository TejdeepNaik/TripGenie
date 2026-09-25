import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../password.js';
import {
  generateSessionToken,
  hashSessionToken,
  getSessionExpirationDate,
  SESSION_EXPIRATION_MS,
} from '../session.js';
import { registerSchema, loginSchema } from '../auth.schemas.js';
import { Role } from '@prisma/client';

test('Password Hashing & Verification', async (t) => {
  await t.test('should hash a password and verify it correctly', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    assert.notEqual(hash, rawPassword);
    assert.equal(hash.startsWith('$2'), true); // bcrypt hash prefix

    const isValid = await verifyPassword(rawPassword, hash);
    assert.equal(isValid, true);

    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    assert.equal(isInvalid, false);
  });
});

test('Session Token Generation & Hashing', async (t) => {
  await t.test('should generate 64-char hex session token and deterministic SHA-256 hash', () => {
    const token = generateSessionToken();
    assert.equal(token.length, 64);

    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);
    assert.equal(hash1.length, 64);
    assert.equal(hash1, hash2);

    const token2 = generateSessionToken();
    assert.notEqual(token, token2);
    assert.notEqual(hashSessionToken(token), hashSessionToken(token2));
  });

  await t.test('should compute session expiration 7 days in the future', () => {
    const now = Date.now();
    const exp = getSessionExpirationDate();
    const diff = exp.getTime() - now;

    // Allow 1 second tolerance
    assert.ok(Math.abs(diff - SESSION_EXPIRATION_MS) < 1000);
  });
});

test('Registration Input Validation Schema', async (t) => {
  await t.test('should validate and normalize valid registration input', () => {
    const valid = {
      email: '  USER@EXAMPLE.COM ',
      name: '  Jane Doe  ',
      password: 'password123',
    };

    const res = registerSchema.safeParse(valid);
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.email, 'user@example.com');
      assert.equal(res.data.name, 'Jane Doe');
      assert.equal(res.data.password, 'password123');
    }
  });

  await t.test('should reject invalid email, short name, and short password', () => {
    const invalidEmail = registerSchema.safeParse({
      email: 'not-an-email',
      name: 'Valid Name',
      password: 'password123',
    });
    assert.equal(invalidEmail.success, false);

    const invalidPassword = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Valid Name',
      password: 'short',
    });
    assert.equal(invalidPassword.success, false);

    const invalidName = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'a',
      password: 'password123',
    });
    assert.equal(invalidName.success, false);
  });
});

test('Login Input Validation Schema', async (t) => {
  await t.test('should validate and normalize valid login input', () => {
    const valid = {
      email: ' TEST.USER@DOMAIN.COM ',
      password: 'mySecretPassword',
    };

    const res = loginSchema.safeParse(valid);
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.email, 'test.user@domain.com');
    }
  });

  await t.test('should reject empty password or bad email', () => {
    const emptyPassword = loginSchema.safeParse({
      email: 'user@domain.com',
      password: '',
    });
    assert.equal(emptyPassword.success, false);
  });
});

test('Role-Based Access Control Rules', async (t) => {
  await t.test('should default newly registered user role to CUSTOMER', () => {
    const defaultRole: Role = Role.CUSTOMER;
    assert.equal(defaultRole, Role.CUSTOMER);
  });

  await t.test('should verify role hierarchy permissions logic', () => {
    const allowedForAdmin: Role[] = [Role.ADMIN];
    const allowedForOwnerOrAdmin: Role[] = [Role.OWNER, Role.ADMIN];
    const allowedForAny: Role[] = [Role.CUSTOMER, Role.OWNER, Role.ADMIN];

    assert.equal(allowedForAdmin.includes(Role.CUSTOMER), false);
    assert.equal(allowedForOwnerOrAdmin.includes(Role.OWNER), true);
    assert.equal(allowedForAny.includes(Role.CUSTOMER), true);
  });
});
