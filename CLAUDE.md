# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL - DATABASE PROTECTION (DO NOT IGNORE)

**NEVER RUN DESTRUCTIVE DATABASE COMMANDS. THIS IS AN ABSOLUTE RULE.**

The following commands are FORBIDDEN and must NEVER be executed:
- `npx supabase db reset` - DESTROYS ALL DATA
- `npx supabase db push --force` - CAN DESTROY DATA
- `DROP TABLE`, `DROP DATABASE`, `TRUNCATE` - DESTROYS DATA
- Any command that deletes, resets, or wipes database data

If a migration needs to be run, ONLY use:
- Direct `ALTER TABLE` statements via a Node.js script
- `rushx migration:up` from apps/backend (applies migrations without reset)

**ASK THE USER BEFORE running ANY database-related command.**

This rule exists because Claude has destroyed this database multiple times by running destructive commands without permission.

---

## Project Overview

NewMECA V2 is a full-stack application for MECA (Mobile Electronics Competition Association) car audio competitions. It's a Rush monorepo with three packages:
- **@newmeca/backend** - NestJS API server with MikroORM
- **@newmeca/frontend** - React + Vite SPA
- **@newmeca/shared** - Shared Zod schemas, TypeScript enums, and types

## Essential Commands

### Rush Commands

```bash
# Installation (required after cloning or package.json changes)
rush install
rush update                      # Install/update all dependencies

# Development
rush dev -t @newmeca/frontend    # Start frontend dev server (port 5173)
rush dev -t @newmeca/backend     # Start backend dev server (port 3001)

# Building
rush build                       # Build all projects (dependency order)
rush build -t @newmeca/frontend  # Build frontend + dependencies
rush build -t @newmeca/backend   # Build backend + dependencies
rush rebuild                     # Clean build all projects

# Validation
rush typecheck                   # Type check all projects
rush lint                        # Lint all projects

# Project-specific commands (from project directory)
rushx dev                        # Run dev in current project
rushx build                      # Run build in current project
rushx typecheck                  # Run typecheck in current project
```

### Database Commands

```bash
# Supabase (local PostgreSQL - run from root)
npx supabase start               # Start local database
npx supabase stop                # Stop database
npx supabase status              # Check database status

# MikroORM Migrations (run from apps/backend)
rushx migration:create           # Create new migration
rushx migration:up               # Apply pending migrations
rushx migration:down             # Rollback last migration
rushx migration:list             # List all migrations
```

## Rush Monorepo Structure

```
NewMECAV2/
├── apps/
│   ├── backend/                 # @newmeca/backend (NestJS API)
│   └── frontend/                # @newmeca/frontend (React + Vite)
├── packages/
│   └── shared/                  # @newmeca/shared (Zod schemas + enums)
├── common/
│   └── config/rush/
│       ├── command-line.json    # Custom Rush commands (build, dev, typecheck, lint, test)
│       └── common-versions.json # Enforced dependency versions
└── rush.json                    # Rush configuration
```

### Rush Commands

| Command | Description |
|---------|-------------|
| `rush update` | Install/update all dependencies |
| `rush build` | Build all projects (respects dependency order) |
| `rush rebuild` | Clean build all projects |
| `rush build -t <pkg>` | Build specific project + dependencies |
| `rush add -p <pkg>` | Add dependency to current project |
| `rush purge` | Remove all node_modules and temp files |
| `rushx <script>` | Run npm script in current project directory |

### Adding Dependencies

```bash
# Navigate to the project
cd apps/backend

# Add runtime dependency
rush add -p lodash

# Add dev dependency
rush add -p @types/lodash --dev

# Always run after adding
rush update
```

### Internal Package Dependencies

Use `workspace:*` protocol for monorepo packages:
```json
// apps/backend/package.json
{
  "dependencies": {
    "@newmeca/shared": "workspace:*"
  }
}
```

## Shared Package (@newmeca/shared)

The shared package contains TypeScript enums and Zod schemas used by both frontend and backend.

### Structure
```
packages/shared/src/
├── index.ts                     # Barrel export
├── types.ts                     # Legacy types (snake_case for compatibility)
└── schemas/
    ├── index.ts                 # Schema barrel export
    ├── enums.schema.ts          # TypeScript enums + Zod enum schemas
    ├── profiles.schema.ts       # Profile DTOs
    ├── events.schema.ts         # Event DTOs
    ├── memberships.schema.ts    # Membership DTOs
    ├── payments.schema.ts       # Payment DTOs
    └── [feature].schema.ts      # Other feature schemas
```

### Enum Pattern

Enums are defined as TypeScript enums first, then wrapped with `z.nativeEnum()`:

```typescript
// packages/shared/src/schemas/enums.schema.ts

// 1. Define TypeScript enum (single source of truth)
export enum UserRole {
  USER = 'user',
  EVENT_DIRECTOR = 'event_director',
  RETAILER = 'retailer',
  ADMIN = 'admin',
}

// 2. Create Zod schema for validation
export const UserRoleSchema = z.nativeEnum(UserRole);
```

### Schema Pattern

Each feature has Create, Update, and Response schemas:

```typescript
// packages/shared/src/schemas/profiles.schema.ts
import { z } from 'zod';
import { UserRole, UserRoleSchema, MembershipStatusSchema } from './enums.schema';

// Create DTO
export const CreateProfileSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).optional(),
  role: UserRoleSchema.optional().default(UserRole.USER),
});
export type CreateProfileDto = z.infer<typeof CreateProfileSchema>;

// Response Schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  created_at: z.coerce.date(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// Update Schema (partial of create)
export const UpdateProfileSchema = CreateProfileSchema.partial();
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
```

### Usage in Backend

```typescript
// apps/backend/src/profiles/profiles.entity.ts
import { UserRole, MembershipStatus } from '@newmeca/shared';

@Entity({ tableName: 'profiles' })
export class Profile {
  @Enum(() => UserRole)
  role: UserRole = UserRole.USER;
}
```

```typescript
// apps/backend/src/profiles/profiles.service.ts
import { MembershipStatus, CreateProfileDto } from '@newmeca/shared';
```

## Architecture

### Three-Tier Data Flow
```
Frontend (React)  →  Backend (NestJS)  →  Database (PostgreSQL/Supabase)
     ↓                    ↓
API Client files    EntityManager (MikroORM)
```

### Backend Module Pattern (NestJS)

Each feature follows: `entity.ts` → `service.ts` → `controller.ts` → `module.ts`

```
src/profiles/
├── profiles.entity.ts      # MikroORM entity with decorators
├── profiles.service.ts     # Business logic with @Injectable()
├── profiles.controller.ts  # HTTP handlers with @Controller(), @Get(), @Post()
└── profiles.module.ts      # NestJS module with @Module()
```

All modules are registered in [app.module.ts](apps/backend/src/app.module.ts). NestJS automatically discovers routes from decorators - no manual route registration needed.

### Frontend API Pattern

Each feature has an API client file in [src/api-client/](apps/frontend/src/api-client/) that makes HTTP calls to the backend:

```
src/
├── api-client/
│   └── profiles.api-client.ts   # HTTP request functions
└── profiles/                    # Feature module
    ├── apiHooks.ts              # React hooks using api-client
    ├── ProfileCard.tsx          # Components
    └── ProfilePage.tsx          # Pages
```

## Critical Rules

**Frontend:**
- All API calls go through api-client files → backend API
- NEVER import Supabase client directly in frontend code
- Vite proxies `/api` routes to `localhost:3001`

**Backend:**
- Use NestJS decorators (`@Controller`, `@Injectable`, `@Get`, `@Post`)
- Database operations use `EntityManager` injection
- Import enums and DTOs from `@newmeca/shared`
- All request/response validation uses Zod schemas from shared package

**Shared Package:**
- Enums are the single source of truth for all status/type values
- Always use `z.nativeEnum()` to create Zod schemas from TypeScript enums
- Export both the enum and its Zod schema

**Database:**
- Schema changes require MikroORM migrations
- Run migrations from `apps/backend` directory using `rushx migration:*`

**Rush Monorepo:**
- NEVER use `npm install` or `npm run` - always use Rush commands
- Use `rush install` or `rush update` to install dependencies
- Use `rush add -p <package>` to add new dependencies
- Use `rushx <script>` to run package.json scripts from project directories

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
- [RUSH_MIGRATION_GUIDE.md](docs/rush/RUSH_MIGRATION_GUIDE.md) - Rush monorepo guide
- [MIKRO_ORM_SETUP.md](docs/backend/MIKRO_ORM_SETUP.md) - Database setup
