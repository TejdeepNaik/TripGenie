import crypto from 'node:crypto';

export const SESSION_COOKIE_NAME = 'tg_session';
export const SESSION_EXPIRATION_DAYS = 7;
export const SESSION_EXPIRATION_MS = SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Generates a high-entropy random session token (hex string).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a deterministic SHA-256 hash of a session token.
 * Only the hash is stored in the database to protect session tokens against DB leaks.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Computes the expiration date for new sessions.
 */
export function getSessionExpirationDate(): Date {
  return new Date(Date.now() + SESSION_EXPIRATION_MS);
}
