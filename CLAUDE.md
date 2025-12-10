# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NewMECA V2 is a full-stack application for MECA (Mobile Electronics Competition Association) car audio competitions. It's a Rush monorepo with three packages:
- **@newmeca/backend** - NestJS API server with MikroORM
- **@newmeca/frontend** - React + Vite SPA
- **@newmeca/shared** - Shared Zod schemas and TypeScript types

## Essential Commands

```bash
# Installation
npm run install:all              # Rush update (required after cloning)

# Development
npm run dev                      # Frontend only (Vite on port 5173)
npm run dev:backend              # Backend only (NestJS on port 3001)
npm run dev:all                  # Frontend + Backend + Supabase

# Building
npm run build                    # Build all projects via Rush
rush build                       # Direct Rush build

# Validation
npm run typecheck                # Type check all projects
npm run lint                     # Lint all projects

# Database (Supabase local)
npm run supabase:start           # Start local PostgreSQL
npm run supabase:stop            # Stop database

# Database Migrations (run from apps/backend)
npm run migration:create         # Create new migration
npm run migration:up             # Apply migrations
npm run migration:down           # Rollback migration
```

## Architecture

### Three-Tier Data Flow
```
Frontend (React)  →  Backend (NestJS)  →  Database (PostgreSQL/Supabase)
     ↓                    ↓
API Client files    EntityManager (MikroORM)
```

### Backend Module Pattern
Each feature follows: `entity.ts` → `service.ts` → `controller.ts` → `module.ts`

All modules are registered in [app.module.ts](apps/backend/src/app.module.ts).

### Frontend API Pattern
Each feature has an API client file in [src/api-client/](apps/frontend/src/api-client/) that makes HTTP calls to the backend. Pages and components use these clients via hooks.

### Shared Package
Zod schemas in [packages/shared/src/schemas/](packages/shared/src/schemas/) are used by both frontend and backend for validation.

## Critical Rules

**Frontend:**
- All API calls go through api-client files → backend API
- NEVER import Supabase client directly in frontend code
- Vite proxies `/api` routes to `localhost:3001`

**Backend:**
- Use NestJS decorators (`@Controller`, `@Injectable`, `@Get`, `@Post`)
- Database operations use `EntityManager` injection
- All request/response validation uses Zod schemas from shared package

**Database:**
- Schema changes require MikroORM migrations
- Run migrations from `apps/backend` directory

## Key Integrations

- **Stripe** - Payment processing (webhooks in [stripe/](apps/backend/src/stripe/))
- **QuickBooks** - Accounting sync ([quickbooks/](apps/backend/src/quickbooks/))
- **Twilio** - SMS notifications
- **reCAPTCHA v3** - Form protection

## Environment Setup

Backend requires `.env` in `apps/backend/`:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

Frontend requires `.env.development` in `apps/frontend/`:
- `VITE_API_URL` - Backend URL (default: http://localhost:3001)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Documentation

Detailed docs are in [docs/](docs/):
- [ONBOARDING.md](docs/getting-started/ONBOARDING.md) - Architecture deep dive
- [QUICK-COMMANDS.md](docs/getting-started/QUICK-COMMANDS.md) - Command reference
- [MIKRO_ORM_SETUP.md](docs/backend/MIKRO_ORM_SETUP.md) - Database setup
