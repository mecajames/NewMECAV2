# Docker Setup for NewMECA V2

## You're Already Using Docker! ✅

You have **Supabase running via Docker** (`supabase start`). That's perfect!

This setup adds **one optional tool**: a database analyzer.

## The One Dockerfile

Everything is in `Dockerfile` with multi-stage builds:
- `backend` - Node.js API (optional, can run with `npm run dev:backend`)
- `frontend` - React app (optional, can run with `npm run dev`)  
- `analyzer` - **The useful one!** Compares your production and local databases

## Quick Start

### Analyze Your Database
```bash
make analyze
make report
```

That's it! The analyzer will:
1. Connect to your production Supabase
2. Connect to your local Supabase (localhost:54322)
3. Generate comparison reports in `docker/analysis-output/`

### Reports Generated
- `supabase-analysis.json` - Production database structure
- `local-db-analysis.json` - Local database structure
- `comparison-report.json` - Differences
- `analysis-report.md` - Human-readable report
- `local-schema.sql` - Schema export

## Supabase Commands

```bash
make up         # Start Supabase (supabase start)
make down       # Stop Supabase (supabase stop)
make status     # Check status
make reset      # Reset database with migrations
make shell      # Open database shell
make studio     # Open Supabase Studio
make backup     # Backup database
```

## Optional: Run Backend/Frontend in Docker

If you want (but you don't need to):

```bash
# Backend in Docker
docker compose --profile backend up -d

# Frontend in Docker  
docker compose --profile frontend up -d

# Or both
docker compose --profile backend --profile frontend up -d
```

But honestly, just run them locally:
```bash
npm run dev              # Frontend
npm run dev:backend      # Backend
```

## Your Current Stack

```
Supabase (Docker):
  ├─ PostgreSQL (port 54322)
  ├─ Studio (port 54323) - http://localhost:54323
  ├─ API Gateway (port 54321)
  └─ Auth, Storage, etc.

Your Code (Local):
  ├─ Frontend (npm run dev) - port 5173
  └─ Backend (npm run dev:backend) - port 3001

Optional (Docker):
  ├─ DB Analyzer (make analyze)
  ├─ Redis (docker compose up redis -d)
  └─ Containerized apps if you want
```

## What's Different From Other Projects

- **One Dockerfile** with multi-stage builds (not separate files)
- **No dev/prod split** - use ENV vars instead
- **Minimal setup** - only adds what you need
- **Works with Supabase CLI** - doesn't try to replace it

## Environment Variables

Just use your existing `.env.development`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
```

## Production

Set `NODE_ENV=production` and the Dockerfile automatically builds optimized versions.

```bash
NODE_ENV=production docker compose --profile backend --profile frontend up -d
```

But for deployment, you probably want to use Netlify/Vercel for frontend and something like Railway/Fly for backend anyway.

---

**TL;DR**: Run `make analyze` to see what's in your databases. That's the main value here! Everything else is optional.
