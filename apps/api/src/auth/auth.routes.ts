import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { Role } from '@prisma/client';
import { db } from '../db/prisma.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  generateSessionToken,
  hashSessionToken,
  getSessionExpirationDate,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRATION_MS,
} from './session.js';
import {
  registerSchema,
  loginSchema,
  SafeUserDTO,
} from './auth.schemas.js';
import { authenticate } from './auth.middleware.js';

export async function authRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_EXPIRATION_MS / 1000,
  };

  /**
   * POST /auth/register - Brute-force & spam protected (15 req/min)
   */
  fastify.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parseResult = registerSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration details',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      const { email, name, password } = parseResult.data;

      // Check for existing account
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        reply.status(409).send({
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'An account with this email address already exists.',
          },
        });
        return;
      }

      // Hash password & create user
      const passwordHash = await hashPassword(password);
      const user = await db.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: Role.CUSTOMER,
        },
      });

      // Create session
      const token = generateSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = getSessionExpirationDate();

      await db.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Set HTTP-only cookie
      reply.setCookie(SESSION_COOKIE_NAME, token, cookieOptions);

      const safeUser: SafeUserDTO = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      };

      reply.status(201).send({
        success: true,
        data: safeUser,
      });
    }
  );

  /**
   * POST /auth/login - Brute-force protected (15 req/min)
   */
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parseResult = loginSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login input',
            details: parseResult.error.format(),
          },
        });
        return;
      }

      const { email, password } = parseResult.data;

      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user) {
        reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email or password is incorrect.',
          },
        });
        return;
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email or password is incorrect.',
          },
        });
        return;
      }

      // Create session
      const token = generateSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = getSessionExpirationDate();

      await db.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Set HTTP-only cookie
      reply.setCookie(SESSION_COOKIE_NAME, token, cookieOptions);

      const safeUser: SafeUserDTO = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      };

      reply.send({
        success: true,
        data: safeUser,
      });
    }
  );

  /**
   * POST /auth/logout
   */
  fastify.post(
    '/logout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      if (request.sessionId) {
        try {
          await db.session.delete({
            where: { id: request.sessionId },
          });
        } catch {
          // Ignore if already removed
        }
      }

      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

      reply.send({
        success: true,
        message: 'Logged out successfully.',
      });
    }
  );

  /**
   * GET /auth/me
   */
  fastify.get(
    '/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      reply.send({
        success: true,
        data: request.user,
      });
    }
  );
}
