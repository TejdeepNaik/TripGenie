import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';
import { db } from '../db/prisma.js';
import { hashSessionToken, SESSION_COOKIE_NAME } from './session.js';
import type { SafeUserDTO } from './auth.schemas.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SafeUserDTO;
    sessionId?: string;
  }
}

/**
 * Reusable preHandler for Fastify routes requiring authentication.
 * Reads HTTP-only session cookie, validates against session database, and attaches user info to request.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = request.cookies[SESSION_COOKIE_NAME];

  if (!token) {
    reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in.',
      },
    });
    return;
  }

  const tokenHash = hashSessionToken(token);

  try {
    const session = await db.session.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      // Clear invalid / expired session cookie
      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

      reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session has expired or is invalid. Please sign in again.',
        },
      });
      return;
    }

    const { user } = session;

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
    request.sessionId = session.id;
  } catch (err) {
    request.log.error(err);
    reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unable to authenticate session.',
      },
    });
  }
}

/**
 * Reusable preHandler for Fastify routes requiring specific RBAC roles.
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }
  };
}
