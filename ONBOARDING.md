# Developer Onboarding Checklist

Welcome! Follow these steps to get the project running on your machine.

## Prerequisites Setup

- [ ] Install Node.js >= 18.0.0 ([Download](https://nodejs.org/))
- [ ] Install Docker Desktop ([Download](https://www.docker.com/products/docker-desktop/))
- [ ] Install Supabase CLI:
  ```bash
  # macOS
  brew install supabase/tap/supabase
  
  # Windows
  scoop install supabase
  
  # Linux
  brew install supabase/tap/supabase
  ```
- [ ] Verify installations:
  ```bash
  node --version    # Should be >= 18
  npm --version     # Should be >= 9
  docker --version  # Should show version
  supabase --version # Should show version
  ```

## Project Setup

### 1. Clone & Install
```bash
# Clone the repository
git clone <repo-url>
cd NewMECAV2

# Install all dependencies
npm run install:all
```

### 2. Environment Files

You'll need these environment files from the team:

#### `apps/frontend/.env.development`
Ask a team member for this file, or create it:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
VITE_ENV=development
```

#### `apps/backend/.env`
Ask a team member for this file, or create it:
```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Note:** The keys above are for **local development only**. Production keys are different and kept secret.

### 3. Start Everything

```bash
npm run dev:all
```

This single command:
- ✅ Starts Supabase (PostgreSQL, Auth, Storage, etc.)
- ✅ Starts backend API server
- ✅ Starts frontend dev server

Wait for all services to start (takes ~30 seconds first time).

### 4. Verify Everything Works

- [ ] Open http://localhost:5173 - Frontend should load
- [ ] Open http://localhost:54323 - Supabase Studio should open
- [ ] Check backend: `curl http://localhost:3001/health` (or visit in browser)

## Development Workflow

### Daily Workflow
```bash
# Start development
npm run dev:all

# When done for the day
npm run supabase:stop   # Optional: stops Supabase containers
```

### Useful Commands
```bash
# Frontend only
npm run dev

# Backend only
npm run dev:backend

# Supabase commands
npm run supabase:start
npm run supabase:stop
npm run supabase:status
npm run supabase:restart

# Database migrations (backend)
cd apps/backend
npm run migration:create   # Create new migration
npm run migration:up       # Apply migrations
npm run migration:list     # List all migrations
```

## Project Structure
```
NewMECAV2/
├── apps/
│   ├── frontend/              # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── pages/         # Page components
│   │   │   ├── contexts/      # React contexts (auth, etc.)
│   │   │   └── lib/           # Utilities (Supabase client)
│   │   └── .env.development   # Frontend environment variables
│   │
│   └── backend/               # Node.js + Express backend
│       ├── src/
│       │   ├── profiles/      # Profile entity, service, controller
│       │   ├── events/        # Event entity, service, controller
│       │   ├── memberships/   # Membership entity, service, controller
│       │   ├── types/         # Shared TypeScript types
│       │   └── db/            # MikroORM config
│       └── .env               # Backend environment variables
│
├── supabase/                  # Database migrations
│   ├── migrations/            # SQL migration files
│   └── config.toml            # Supabase configuration
│
└── package.json               # Root workspace config
```

## Common Issues & Solutions

### "Supabase not found"
```bash
# Install Supabase CLI
brew install supabase/tap/supabase
```

### "Port already in use"
```bash
# Check what's using the port
lsof -i :5173   # Frontend
lsof -i :3001   # Backend
lsof -i :54322  # Database

# Kill the process or stop Supabase
npm run supabase:stop
```

### "Cannot connect to database"
```bash
# Check if Supabase is running
npm run supabase:status

# Restart it
npm run supabase:restart
```

### "Module not found" errors
```bash
# Reinstall dependencies
npm run install:all

# Build backend
cd apps/backend
npm run build
```

### Frontend shows blank page
- Check browser console for errors
- Verify `.env.development` has correct values
- Make sure Supabase is running

## Next Steps

Once everything is running:

1. **Explore the database**: http://localhost:54323 (Supabase Studio)
   - View tables: profiles, events, memberships, etc.
   - Run SQL queries
   - See your local data

2. **Review the code**:
   - Start with `apps/frontend/src/App.tsx`
   - Check `apps/backend/src/index.ts`
   - Look at entity definitions in `apps/backend/src/*/entity.ts`

3. **Make a test change**:
   - Edit a component in `apps/frontend/src/components/`
   - Save and see hot reload in action
   - Try adding a console.log to verify changes work

4. **Join team communication**:
   - Get added to team chat/Slack
   - Ask questions in team channels
   - Review open issues/PRs

## Getting Help

- **README**: `/README.md` - Full project documentation
- **MikroORM Setup**: `/apps/backend/MIKRO_ORM_SETUP.md`
- **Docker Guide**: `/DOCKER.md`
- **Team Member**: Ask in team chat or tag someone in PR

## You're Ready! 🎉

If you've completed all the checkboxes above, you're ready to start developing!

Common first tasks:
- Fix a bug from the issue tracker
- Add a new component
- Write a new API endpoint
- Improve documentation

Welcome to the team! 🚀
