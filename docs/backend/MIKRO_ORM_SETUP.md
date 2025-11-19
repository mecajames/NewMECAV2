# MikroORM Setup Guide

## ✅ Setup Complete

MikroORM is now configured to work with your existing Supabase database.

## Important Notes

### 🎯 **You DO NOT need to create database tables**
Your schema already exists in Supabase! The tables were created by your Supabase migrations:
- `profiles`
- `events`
- `event_registrations`
- `competition_results`
- `memberships`
- `rulebooks`

### 📊 **Migration Table**
MikroORM will automatically create a `mikro_orm_migrations` table to track which migrations have been applied. This is separate from Supabase's migration tracking.

## Configuration

### Database Connection
- **Local**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Configured in: `apps/backend/.env`

### Entity Discovery
- Entities are automatically discovered from: `src/**/entity.ts`
- Pattern matches: `profiles/entity.ts`, `events/entity.ts`, etc.

### Migration Settings
- **Storage**: `src/migrations/` (TypeScript source)
- **Table**: `mikro_orm_migrations` (auto-created)
- **Safe Mode**: Enabled (prevents accidental data loss)
- **Transactional**: All migrations run in transactions

## Available Commands

```bash
# Schema inspection (doesn't modify database)
npm run mikro-orm schema:update --run    # Sync entities to DB (use carefully!)
npm run mikro-orm schema:drop --run      # Drop all tables (DANGEROUS!)

# Migration commands
npm run migration:create                  # Create new migration from entity changes
npm run migration:up                      # Run pending migrations
npm run migration:down                    # Rollback last migration
npm run migration:list                    # List all migrations
npm run migration:pending                 # Show pending migrations

# Cache
npm run cache:clear                       # Clear metadata cache
```

## Initial Setup (First Time Only)

Since your database schema already exists from Supabase, you have two options:

### Option 1: Generate Initial Migration (Recommended)
This creates a baseline migration matching your current schema:

```bash
cd apps/backend
npm run migration:create -- --initial
```

This will:
1. Compare your entities with the existing database
2. Create a migration file (likely empty or minimal changes)
3. Track this as the starting point

### Option 2: Skip MikroORM Migrations
Just use the entities without MikroORM migrations. Your schema is managed by Supabase migrations, and MikroORM entities just map to existing tables.

**This is simpler and recommended for your setup!**

## Typical Workflow

### When You Add/Change Entities:

1. **Modify your entity** (e.g., add a field to `profiles/entity.ts`)

2. **Update Supabase schema first**:
   ```bash
   # Create Supabase migration
   supabase migration new add_profile_field
   
   # Edit the migration SQL file
   # Run it
   supabase migration up
   ```

3. **Then create MikroORM migration** (optional):
   ```bash
   npm run migration:create
   npm run migration:up
   ```

## Current Status

✅ MikroORM packages installed:
- `@mikro-orm/core`
- `@mikro-orm/postgresql`
- `@mikro-orm/reflection`
- `@mikro-orm/cli`
- `@mikro-orm/migrations`
- `@mikro-orm/seeder`

✅ Configuration file: `src/db/mikro-orm.config.ts`

✅ Entity directories created:
- `src/profiles/`
- `src/events/`
- `src/event-registrations/`
- `src/competition-results/`
- `src/memberships/`
- `src/rulebooks/`

✅ Migration directory: `src/migrations/` (ready for use)

## Recommendation

**For your use case, you probably DON'T need MikroORM migrations at all!**

Here's why:
- ✅ Your schema is managed by Supabase migrations (source of truth)
- ✅ Your entities just map to existing tables
- ✅ MikroORM works perfectly without its own migrations
- ✅ Less complexity, fewer things to manage

**Just use the entities for querying!** The MikroORM CLI and migration system is there if you need it later.

## Next Steps

1. **Initialize MikroORM in your app**:
   ```typescript
   // src/db/init.ts
   import { MikroORM } from '@mikro-orm/core';
   import config from './mikro-orm.config';
   
   export const initORM = async () => {
     const orm = await MikroORM.init(config);
     return orm;
   };
   ```

2. **Use entities in your services**:
   ```typescript
   // profiles/service.ts
   const em = orm.em.fork(); // Get entity manager
   const profile = await em.findOne(Profile, { id });
   ```

3. **Start your backend**:
   ```bash
   npm run dev
   ```

That's it! Your entities will work with the existing database schema.
