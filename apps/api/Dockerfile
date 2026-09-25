# =========================================================
# Multi-Stage Dockerfile for TripGenie Fastify API Server
# =========================================================

# Stage 1: Build Dependencies and Compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy workspace source code
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma Client and Compile TypeScript API
RUN pnpm --filter @tripgenie/api db:generate
RUN pnpm --filter @tripgenie/api build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Install openssl and curl for Prisma runtime compatibility and health check
RUN apk add --no-cache openssl curl

# Enable pnpm in runtime container for running node scripts cleanly
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace dependencies and compiled output from builder
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

# Security: Run as non-root node user
USER node

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
