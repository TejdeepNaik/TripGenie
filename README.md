# TripGenie — AI-Powered Travel & Experience Platform

Production-grade full-stack travel platform for AI trip planning, destination discovery, bookings, rentals, group trips, and recommendations.

## Monorepo Structure

```
tripgenie/
├── apps/
│   ├── web/           # Next.js 14+ (React, TypeScript, Tailwind CSS, App Router)
│   └── api/           # Fastify (Node.js, TypeScript, REST API & Prisma ORM)
├── packages/
│   ├── types/         # Shared TypeScript interfaces and DTOs
│   ├── ui/            # Shared React UI component library
│   └── config/        # Shared TypeScript and project configuration
├── docker-compose.yml # Infrastructure service definitions (PostgreSQL 16)
├── package.json       # Monorepo root scripts
└── pnpm-workspace.yaml# pnpm workspace config
```

## Getting Started

### Requirements
- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16 (via Docker Compose or local instance)

### Installation

```bash
pnpm install
```

### Database Operations

```bash
docker-compose up -d postgres # Start PostgreSQL container
pnpm db:generate             # Generate Prisma Client bindings
pnpm db:migrate              # Run database migrations
pnpm db:seed                 # Run development seed script
pnpm db:studio               # Open Prisma Studio GUI
```

### Development

Run all applications concurrently:
```bash
pnpm dev
```

Run frontend independently:
```bash
cd apps/web && pnpm dev
```

Run backend API independently:
```bash
cd apps/api && pnpm dev
```

### Google Places & Google Maps Configuration (Phase 6)

TripGenie supports dual-mode place discovery:

1. **Database / Demo Fallback Mode** (`GOOGLE_PLACES_ENABLED=false`): Uses internal database places and native SVG canvas map fallback view. Requires zero external credentials.
2. **Google Places & Maps Mode** (`GOOGLE_PLACES_ENABLED=true`): Uses Google Places REST API (server-side) and Google Maps JavaScript API (client-side).

#### Environment Variables

- **Server-Side API (`apps/api/.env`)**:
  - `GOOGLE_PLACES_ENABLED=true` (Set to `false` to disable external requests and use DatabasePlaceProvider fallback).
  - `GOOGLE_PLACES_API_KEY=your_server_google_places_key` (Server-only secret key, never exposed to client).
- **Client-Side Web (`apps/web/.env.local`)**:
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_restricted_maps_key` (Public browser key restricted by HTTP referrer).

---

### AI Travel Copilot & Intelligent Planning (Phase 7)

TripGenie features a production-style AI Travel Copilot that translates natural language prompts into complete, structured trip itineraries and allows users to modify existing trips via natural language commands.

#### Architecture & Real-Place Grounding
- **Real-Place Grounding**: The LLM evaluates user intent and selects exclusively from real candidate places returned by TripGenie's `PlaceProvider` (`DatabasePlaceProvider` or `GooglePlacesProvider`).
- **Server Authority**: The server validates all candidate place IDs, enforces date bounds, calculates activity costs, and executes database changes inside atomic Prisma `$transaction` blocks.
- **Provider Abstraction**: Isolated `AIProvider` interface supporting `GeminiAIProvider` and `MockAIProvider` fallback.

#### Environment Variables
- **Server-Side API (`apps/api/.env`)**:
  - `AI_ENABLED=true` (Set to `false` to use `MockAIProvider` fallback).
  - `AI_PROVIDER=gemini` (Options: `gemini` | `mock`).
  - `GEMINI_API_KEY=your_server_gemini_api_key` (Server-only secret key, never exposed to client).

---

### Verification & Quality Commands

```bash
pnpm build      # Build all apps and packages
pnpm typecheck  # Run TypeScript type check across workspace
pnpm lint       # Run lint check across workspace
```
