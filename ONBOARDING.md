# Developer Onboarding Checklist

Welcome! Follow these steps to get the project running on your machine.

## 🤖 Quick Start for AI Developers

**Architecture**: 3-tier (Database ← Backend API ← Frontend)

**Critical Rules**:
- ❌ Frontend NEVER uses `lib/supabase.ts` or imports Supabase client
- ✅ Frontend ONLY communicates via API hooks → API client → Backend (localhost:3001)
- ✅ Backend uses MikroORM entities → services → controllers → routes
- ✅ All database operations happen in backend services
- ✅ Frontend is organized by FEATURE, not by file type (no monolithic `pages/` or `components/` directories)

**Module Pattern** (Backend):
```
entity.ts → service.ts → controller.ts → routes.ts → index.ts
```

**Module Pattern** (Frontend - PREFERRED):
```
src/
  └── [feature-name]/
      ├── ProfileCard.tsx       # Components
      ├── ProfileForm.tsx
      ├── ProfilePage.tsx       # Pages
      ├── ProfileEditPage.tsx
      ├── useProfiles.ts        # Hooks
      ├── useProfileMutations.ts
      └── types.ts              # Feature-specific types (optional)
```

**Data Flow** (Frontend):
```
Page Component → Hook (profiles/useProfiles.ts) → API Client → Backend API
```

**Reference Implementation**: 
- Backend: `apps/backend/src/profiles/`
- Frontend (PREFERRED): `apps/frontend/src/profiles/` (needs restructuring)
- Frontend (OLD): `apps/frontend/src/pages/`, `hooks/`, `components/` (scattered, needs consolidation)

**⚠️ Current State**: Frontend needs restructuring from scattered `pages/`, `components/`, `hooks/` directories to feature-based modules.

---

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
The frontend only needs to know where the backend API is:
```env
# Backend API endpoint (local development)
VITE_API_URL=http://localhost:3001

# Optional: Environment indicator
VITE_ENV=development
```

**Note**: Frontend does NOT need Supabase credentials - it talks to the backend API only!

#### `apps/backend/.env`
The backend needs database and Supabase credentials:
```env
# Database connection (MikroORM)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Supabase (for Auth/Storage if needed)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# Server configuration
PORT=3001
NODE_ENV=development

# CORS (allow frontend origin)
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
# Full stack development (recommended)
npm run dev:all         # Start Supabase + Backend + Frontend

# Individual services
npm run dev             # Frontend only (requires backend running)
npm run dev:backend     # Backend only (requires Supabase running)

# Supabase (Database) commands
npm run supabase:start    # Start PostgreSQL + Auth + Storage
npm run supabase:stop     # Stop all Supabase containers
npm run supabase:status   # Check if Supabase is running
npm run supabase:restart  # Stop and start Supabase

# Backend-specific commands
cd apps/backend
npm run dev              # Start backend in watch mode
npm run build            # Build TypeScript to JavaScript
npm run migration:create # Create new database migration
npm run migration:up     # Apply pending migrations
npm run migration:down   # Rollback last migration
npm run migration:list   # List all migrations

# Frontend-specific commands
cd apps/frontend
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run typecheck        # Check TypeScript types

# Workspace commands (run from root)
npm run install:all      # Install all dependencies
npm run build            # Build all workspaces
npm run typecheck        # Type check all workspaces
npm run lint             # Lint all workspaces
```

## Tech Stack Overview

### Backend
- **Runtime**: Node.js (>= 18)
- **Framework**: Express.js (HTTP server)
- **ORM**: MikroORM (TypeScript-first ORM)
- **Database**: PostgreSQL (via Supabase local)
- **Language**: TypeScript
- **Key Packages**: 
  - `@mikro-orm/postgresql` - Database driver
  - `@mikro-orm/core` - ORM core
  - `express` - Web framework
  - `cors` - CORS middleware
  - `helmet` - Security headers

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **HTTP Client**: Fetch API (wrapped in `apiClient.ts`)
- **Key Packages**:
  - `react` - UI library
  - `react-router-dom` - Routing
  - `tailwindcss` - Utility-first CSS

### Database & Infrastructure
- **Database**: PostgreSQL 15
- **Local Development**: Supabase CLI (provides PostgreSQL + Auth + Storage locally)
- **Migrations**: SQL migrations in `supabase/migrations/`
- **Schema Management**: MikroORM entities + SQL migrations

## Project Structure

### Architecture Overview

This project follows a **3-tier architecture**:
1. **Database Layer**: PostgreSQL (via Supabase local)
2. **Backend API Layer**: Node.js + Express + MikroORM
3. **Frontend Layer**: React + Vite

**CRITICAL**: The frontend **NEVER** talks directly to the database. All database operations go through the backend API.

### Frontend Organization (Feature-Based)

The frontend is organized by **features/modules**, mirroring the backend structure. Each feature is self-contained in its own directory:

```
src/
├── profiles/          # Everything profile-related
│   ├── ProfileCard.tsx      # Components
│   ├── ProfileForm.tsx
│   ├── ProfilePage.tsx      # Pages
│   ├── ProfileEditPage.tsx
│   ├── useProfiles.ts       # Hooks
│   ├── useProfileMutations.ts
│   └── types.ts             # Optional: feature-specific types
│
├── events/            # Everything event-related
│   ├── EventCard.tsx
│   ├── EventList.tsx
│   ├── EventsPage.tsx
│   ├── EventDetailPage.tsx
│   ├── useEvents.ts
│   └── types.ts
│
├── memberships/       # Everything membership-related
│   ├── MembershipCard.tsx
│   ├── MembershipsPage.tsx
│   ├── useMemberships.ts
│   └── types.ts
│
└── auth/              # Everything auth-related
    ├── LoginForm.tsx
    ├── RegisterForm.tsx
    ├── LoginPage.tsx
    ├── useAuth.ts
    └── AuthContext.tsx
```

**Benefits**:
- 🎯 Easy to find all code related to a feature
- 🔄 Mirrors backend structure for consistency
- 📦 Self-contained modules - all related files together
- 🚀 Easier to refactor or extract to separate packages
- 💡 No nested directories - flat and simple

**⚠️ Current State**: The codebase needs restructuring from the old pattern (`pages/`, `components/`, `hooks/` at root) to this feature-based structure.

### Migration Plan: Old Structure → Feature-Based

**Current (OLD) Structure** ❌:
```
apps/frontend/src/
├── pages/              # All pages mixed together
│   ├── ProfilePage.tsx
│   ├── EventsPage.tsx
│   ├── EventDetailPage.tsx
│   └── MembershipsPage.tsx
├── components/         # All components mixed together
│   ├── ProfileCard.tsx
│   ├── EventCard.tsx
│   ├── MembershipCard.tsx
│   └── admin/
│       └── AdminDashboard.tsx
└── hooks/              # All hooks mixed together
    ├── useProfiles.ts
    ├── useEvents.ts
    └── useMemberships.ts
```

**Target (NEW) Structure** ✅:
```
apps/frontend/src/
├── profiles/           # Profile feature module
│   ├── useProfiles.ts       # Hooks
│   ├── ProfileCard.tsx      # Components
│   ├── ProfileForm.tsx
│   └── ProfilePage.tsx      # Pages
│
├── events/             # Event feature module
│   ├── useEvents.ts
│   ├── EventCard.tsx
│   ├── EventList.tsx
│   ├── EventsPage.tsx
│   └── EventDetailPage.tsx
│
├── memberships/        # Membership feature module
│   ├── useMemberships.ts
│   ├── MembershipCard.tsx
│   └── MembershipsPage.tsx
│
├── admin/              # Admin feature module
│   ├── useAdminData.ts
│   ├── AdminDashboard.tsx
│   └── AdminPage.tsx
│
├── shared/             # ONLY shared/generic components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Header.tsx
│   └── Footer.tsx
│
└── lib/                # Shared utilities
    └── apiClient.ts    # HTTP client (shared across all features)
```

**When working on the codebase**:
1. **New features**: Always use the feature-based structure
2. **Modifying existing code**: Consider moving it to the proper feature folder
3. **Finding code**: Check both old and new locations during transition
4. **Imports**: Update import paths when moving files

```
NewMECAV2/
├── apps/
│   ├── frontend/                    # React + Vite frontend
│   │   ├── src/
│   │   │   ├── profiles/            # ⭐ Profile feature module
│   │   │   │   ├── ProfileCard.tsx      # Components
│   │   │   │   ├── ProfileForm.tsx
│   │   │   │   ├── ProfilePage.tsx      # Pages
│   │   │   │   ├── ProfileEditPage.tsx
│   │   │   │   ├── useProfiles.ts       # Hooks
│   │   │   │   └── types.ts             # Optional types
│   │   │   │
│   │   │   ├── events/              # ⭐ Event feature module
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── EventList.tsx
│   │   │   │   ├── EventsPage.tsx
│   │   │   │   ├── EventDetailPage.tsx
│   │   │   │   ├── useEvents.ts
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── memberships/         # ⭐ Membership feature module
│   │   │   │   ├── MembershipCard.tsx
│   │   │   │   ├── MembershipsPage.tsx
│   │   │   │   ├── useMemberships.ts
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── auth/                # ⭐ Authentication feature module
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── AuthContext.tsx
│   │   │   │
│   │   │   ├── shared/              # ⚠️ Shared/common components only
│   │   │   │   ├── Button.tsx       # Generic UI components
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Header.tsx       # Layout components
│   │   │   │   └── Footer.tsx
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── apiClient.ts     # ⭐ Central HTTP client
│   │   │   │   └── env.ts           # Environment variable validation
│   │   │   │
│   │   │   └── types/               # Shared TypeScript types only
│   │   └── .env.development         # Frontend environment variables
│   │
│   └── backend/                     # Node.js + Express + MikroORM backend
│       ├── src/
│       │   ├── index.ts             # ⭐ Express app entry point & route registration
│       │   ├── db/
│       │   │   ├── init.ts          # Database initialization
│       │   │   └── mikro-orm.config.ts # MikroORM configuration
│       │   │
│       │   ├── profiles/            # Profile module (entity-first design)
│       │   │   ├── entity.ts        # ⭐ MikroORM entity definition
│       │   │   ├── service.ts       # ⭐ Business logic & database operations
│       │   │   ├── controller.ts    # ⭐ HTTP request handlers
│       │   │   └── routes.ts        # ⭐ Express router (GET/POST/PUT/DELETE)
│       │   │
│       │   ├── events/              # Event module
│       │   │   ├── entity.ts
│       │   │   ├── service.ts
│       │   │   ├── controller.ts
│       │   │   └── routes.ts
│       │   │
│       │   ├── memberships/         # Membership module
│       │   │   ├── entity.ts
│       │   │   ├── service.ts
│       │   │   ├── controller.ts
│       │   │   └── routes.ts
│       │   │
│       │   └── types/               # Shared TypeScript types & enums
│       │       └── enums.ts         # UserRole, MembershipStatus, etc.
│       │
│       └── .env                     # Backend environment variables
│
├── supabase/                        # Database (PostgreSQL + migrations)
│   ├── migrations/                  # SQL migration files
│   └── config.toml                  # Supabase configuration
│
└── package.json                     # Root workspace config
```

### Data Flow (How everything connects)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User clicks button
       ▼
┌─────────────────────────────────────────────┐
│  Frontend (React Component)                 │
│  e.g., ProfilePage.tsx                      │
└──────┬──────────────────────────────────────┘
       │
       │ 2. Calls custom hook
       ▼
┌─────────────────────────────────────────────┐
│  API Hook (useProfiles.ts)                  │
│  const { profile, loading } = useProfile()  │
└──────┬──────────────────────────────────────┘
       │
       │ 3. Makes HTTP request
       ▼
┌─────────────────────────────────────────────┐
│  API Client (apiClient.ts)                  │
│  fetch('http://localhost:3001/api/profiles')│
└──────┬──────────────────────────────────────┘
       │
       │ 4. HTTP Request
       ▼
┌─────────────────────────────────────────────┐
│  Backend (Express Router)                   │
│  GET /api/profiles/:id                      │
└──────┬──────────────────────────────────────┘
       │
       │ 5. Route handler
       ▼
┌─────────────────────────────────────────────┐
│  Controller (ProfileController.ts)          │
│  async getProfile(req, res) { ... }         │
└──────┬──────────────────────────────────────┘
       │
       │ 6. Calls business logic
       ▼
┌─────────────────────────────────────────────┐
│  Service (ProfileService.ts)                │
│  async findById(id) { ... }                 │
└──────┬──────────────────────────────────────┘
       │
       │ 7. Database query (MikroORM)
       ▼
┌─────────────────────────────────────────────┐
│  Entity (Profile.ts)                        │
│  @Entity({ tableName: 'profiles' })         │
└──────┬──────────────────────────────────────┘
       │
       │ 8. SQL query
       ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL Database                        │
│  SELECT * FROM profiles WHERE id = $1       │
└─────────────────────────────────────────────┘

Data flows back up through the same layers
```

### Key Files to Understand

#### Backend Files (Entity → Service → Controller → Route)

1. **Entity** (`entity.ts`): Defines the database table structure
   ```typescript
   @Entity({ tableName: 'profiles', schema: 'public' })
   export class Profile {
     @PrimaryKey({ type: 'uuid' })
     id!: string;
     
     @Property({ type: 'text' })
     email!: string;
   }
   ```

2. **Service** (`service.ts`): Business logic & database operations
   ```typescript
   export class ProfileService {
     async findById(id: string): Promise<Profile | null> {
       // Uses MikroORM to query database
     }
   }
   ```

3. **Controller** (`controller.ts`): HTTP request/response handling
   ```typescript
   export class ProfileController {
     async getProfile(req: Request, res: Response) {
       const profile = await this.service.findById(req.params.id);
       res.json(profile);
     }
   }
   ```

4. **Routes** (`routes.ts`): Express route definitions
   ```typescript
   router.get('/api/profiles/:id', controller.getProfile);
   router.post('/api/profiles', controller.createProfile);
   ```

#### Frontend Files (API Client → Hook → Component)

Frontend code is organized by **feature** - each feature contains its own hooks, components, and pages.

1. **API Client** (`lib/apiClient.ts`): Centralized HTTP client (shared across all features)
   ```typescript
   export const apiClient = {
     get: (url) => fetch(`${BASE_URL}${url}`).then(r => r.json()),
     post: (url, data) => fetch(`${BASE_URL}${url}`, { 
       method: 'POST', 
       body: JSON.stringify(data) 
     })
   };
   ```

2. **API Hooks** (`profiles/useProfiles.ts`): Feature-specific hooks
   ```typescript
   // Located in: profiles/useProfiles.ts
   import { apiClient } from '@/lib/apiClient';
   
   export function useProfile(id: string) {
     const [profile, setProfile] = useState(null);
     const [loading, setLoading] = useState(true);
     
     useEffect(() => {
       apiClient.get(`/api/profiles/${id}`)
         .then(setProfile)
         .finally(() => setLoading(false));
     }, [id]);
     
     return { profile, loading };
   }
   ```

3. **Pages** (`profiles/ProfilePage.tsx`): Feature pages
   ```typescript
   // Located in: profiles/ProfilePage.tsx
   import { useProfile } from './useProfiles';
   import { ProfileCard } from './ProfileCard';
   
   function ProfilePage() {
     const { profile, loading } = useProfile(userId);
     
     if (loading) return <div>Loading...</div>;
     return <ProfileCard profile={profile} />;
   }
   ```

4. **Components** (`profiles/ProfileCard.tsx`): Feature-specific components
   ```typescript
   // Located in: profiles/ProfileCard.tsx
   export function ProfileCard({ profile }) {
     return <div>{profile.name}</div>;
   }
   ```

### 🚨 IMPORTANT: What NOT to Do

❌ **DO NOT** use `lib/supabase.ts` directly in components  
❌ **DO NOT** import Supabase client in the frontend  
❌ **DO NOT** make direct database calls from frontend  
❌ **DO NOT** use `supabase.from('profiles').select()` anywhere  

✅ **INSTEAD**: Always use API hooks (`useProfiles`, `useEvents`, etc.)  
✅ **INSTEAD**: All database operations go through backend services  
✅ **INSTEAD**: Frontend only communicates via HTTP to `localhost:3001`

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

2. **Review the backend code** (Start here!):
   - **Entry point**: `apps/backend/src/index.ts` - Express server setup
   - **Example module**: `apps/backend/src/profiles/`
     - `entity.ts` - Database table definition
     - `service.ts` - Business logic methods
     - `controller.ts` - HTTP request handlers
     - `routes.ts` - API endpoint definitions
   - **Database config**: `apps/backend/src/db/mikro-orm.config.ts`

3. **Review the frontend code**:
   - **Entry point**: `apps/frontend/src/main.tsx`
   - **Feature modules** (PREFERRED):
     - `profiles/` - All profile-related code in one directory
       - `useProfiles.ts` - Profile API hooks
       - `ProfileCard.tsx` - Profile components
       - `ProfilePage.tsx` - Profile pages
     - `events/` - All event-related code
     - `memberships/` - All membership-related code
   - **⚠️ Old structure** (needs refactoring):
     - `pages/` - Mixed pages (should be moved to feature directories)
     - `components/` - Mixed components (should be moved to feature directories)
     - `hooks/` - Mixed hooks (should be moved to feature directories)
   - **Shared code**:
     - `lib/apiClient.ts` - HTTP client (shared across features)
     - `shared/` - Generic UI and layout components only

4. **Test the data flow**:
   - Open DevTools → Network tab
   - Navigate to a page (e.g., Profile page)
   - Watch HTTP requests to `http://localhost:3001/api/*`
   - See the backend responding with data

5. **Make a test change**:
   - **Backend**: Add a new endpoint in `apps/backend/src/profiles/routes.ts`
   - **Frontend**: Create a new hook in `apps/frontend/src/hooks/`
   - Save and test the integration

## Common Development Patterns

### Adding a New Feature (Full Stack)

Example: Add a "Featured Events" feature

#### 1. Backend (Database → Service → Controller → Route)

```bash
cd apps/backend/src/events
```

**Step 1**: Update entity if needed (`entity.ts`)
```typescript
@Property({ type: 'boolean' })
featured: boolean = false;
```

**Step 2**: Add service method (`service.ts`)
```typescript
async findFeatured(): Promise<Event[]> {
  const em = await getEntityManager();
  return em.find(Event, { featured: true });
}
```

**Step 3**: Add controller method (`controller.ts`)
```typescript
async getFeaturedEvents(req: Request, res: Response) {
  const events = await this.eventService.findFeatured();
  res.json(events);
}
```

**Step 4**: Add route (`routes.ts`)
```typescript
router.get('/api/events/featured', controller.getFeaturedEvents);
```

**Step 5**: Register route in `apps/backend/src/index.ts`
```typescript
import { eventRoutes } from './events/routes.js';
app.use(eventRoutes);
```

#### 2. Frontend (API Client → Hook → Component)

```bash
cd apps/frontend/src
```

**Step 1**: Create feature directory if needed
```bash
mkdir -p src/events
```

**Step 2**: Add API hook (`events/useEvents.ts`)
```typescript
import { apiClient } from '@/lib/apiClient';

export function useFeaturedEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    apiClient.get('/api/events/featured')
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);
  
  return { events, loading };
}
```

**Step 3**: Create component (`events/FeaturedEvents.tsx`)
```typescript
import { useFeaturedEvents } from './useEvents';
import { EventCard } from './EventCard';

export function FeaturedEvents() {
  const { events, loading } = useFeaturedEvents();
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      {events.map(event => <EventCard key={event.id} event={event} />)}
    </div>
  );
}
```

**Step 4**: Use in page (`events/EventsPage.tsx`)
```typescript
import { FeaturedEvents } from './FeaturedEvents';

export function EventsPage() {
  return (
    <div>
      <h1>Events</h1>
      <FeaturedEvents />
    </div>
  );
}
```

### Creating a New Module

When adding a completely new feature (e.g., "Sponsors"):

#### Backend Module Structure
```bash
mkdir apps/backend/src/sponsors
cd apps/backend/src/sponsors
```

Create these files (in order):
1. `entity.ts` - MikroORM entity
2. `service.ts` - Business logic
3. `controller.ts` - HTTP handlers
4. `routes.ts` - Express routes
5. `index.ts` - Barrel export

Then register routes in `apps/backend/src/index.ts`

#### Frontend Module Structure
```bash
mkdir -p apps/frontend/src/sponsors
cd apps/frontend/src/sponsors
```

Create these files in the same directory:
1. **Hooks**:
   - `useSponsors.ts` - API hooks (useSponsors, useSponsor, etc.)
   - `useSponsorMutations.ts` - Mutation hooks (create, update, delete)

2. **Components**:
   - `SponsorCard.tsx` - Individual sponsor display
   - `SponsorList.tsx` - List of sponsors
   - `SponsorForm.tsx` - Create/edit form

3. **Pages**:
   - `SponsorsPage.tsx` - Main sponsors page
   - `SponsorDetailPage.tsx` - Individual sponsor detail
   - `SponsorEditPage.tsx` - Edit sponsor page

4. **Optional**:
   - `types.ts` - Feature-specific types
   - `index.ts` - Barrel export for the feature

Then add routes to your router configuration.

### Restructuring Old Code to Feature-Based

If you encounter code in the old structure:

**Old** ❌:
```
src/
├── pages/
│   ├── ProfilePage.tsx
│   └── EventsPage.tsx
├── components/
│   ├── ProfileCard.tsx
│   └── EventCard.tsx
└── hooks/
    ├── useProfiles.ts
    └── useEvents.ts
```

**New** ✅:
```
src/
├── profiles/
│   ├── ProfilePage.tsx
│   ├── ProfileCard.tsx
│   └── useProfiles.ts
│
├── events/
│   ├── EventsPage.tsx
│   ├── EventCard.tsx
│   └── useEvents.ts
│
└── shared/          # Only shared/generic components
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    └── Header.tsx
```

**Migration Steps**:
1. Create feature directory: `mkdir -p src/profiles`
2. Move related files together into the same directory
3. Update imports in moved files (e.g., `import { useProfile } from './useProfiles'`)
4. Update imports in files that use the moved code
5. Test that everything still works

### Database Migrations (Backend Only)

When you change an entity, you may need a migration:

```bash
cd apps/backend

# Create a new migration
npm run migration:create

# Apply migrations
npm run migration:up

# Rollback last migration
npm run migration:down
```

**Note**: Migrations modify the database schema. The database runs in Supabase local.

## Getting Help

- **Architecture Guide**: This document (ONBOARDING.md)
- **Backend Setup**: `/apps/backend/MIKRO_ORM_SETUP.md`
- **Docker Guide**: `/DOCKER.md`
- **Full Docs**: `/README.md`
- **Team Member**: Ask in team chat or tag someone in PR

## For AI Developers / Code Assistants

### Critical Architecture Rules

1. **NEVER import or use `lib/supabase.ts` in frontend code**
   - All database access MUST go through backend API
   - Frontend only uses `lib/apiClient.ts` and hooks

2. **Follow the entity → service → controller → route pattern**
   - Backend modules MUST have all 4 files
   - Don't skip layers or create "shortcut" patterns

3. **Frontend components use hooks, hooks use API client**
   - Components → Hooks → API Client → Backend
   - No direct fetch() calls in components
   - All API calls centralized in feature-specific hooks
   - Hooks live in the same directory as their related components and pages

4. **Type definitions come from backend**
   - Entity definitions are the source of truth
   - Frontend types should match backend entities
   - Avoid duplicate type definitions

### When Making Changes

**Adding Backend Endpoint:**
1. Update/create entity if needed
2. Add method to service
3. Add method to controller
4. Add route to router
5. Ensure router is registered in `index.ts`

**Adding Frontend Feature:**
1. Create feature directory: `src/[feature-name]/`
2. Create hook file: `use[Feature].ts` in the same directory
3. Create component files: `[Feature]Card.tsx`, `[Feature]Form.tsx`, etc.
4. Create page files: `[Feature]Page.tsx`, `[Feature]DetailPage.tsx`, etc.
5. All files for the feature live together in the same flat directory
6. Never bypass the hook layer - hooks are the ONLY way to fetch data

**Modifying Data Flow:**
- Trace the full path: Component → Hook → API Client → Backend Route → Controller → Service → Entity → Database
- Update each layer as needed
- Don't skip layers

### Common Mistakes to Avoid

❌ Importing `@supabase/supabase-js` in frontend components  
❌ Using `supabase.from()` anywhere in the frontend  
❌ Making fetch calls directly in components  
❌ Creating controllers without services  
❌ Putting business logic in controllers (belongs in services)  
❌ Accessing the database outside of services  
❌ Scattering hooks across root-level `hooks/` directory  
❌ Creating monolithic `pages/` or `components/` directories  
❌ Nesting subdirectories within feature modules (no `profiles/components/`, just `profiles/`)  

✅ Use API hooks for all data fetching  
✅ Keep controllers thin (just req/res handling)  
✅ Put business logic in services  
✅ Use MikroORM entities for database operations  
✅ Follow the established module pattern  
✅ Organize frontend code by feature (profiles, events, etc.)  
✅ Keep all feature files together in a flat directory structure  
✅ Only put truly shared components in `shared/` directory  

### File Template Locations

When creating new modules, use these as templates:
- **Backend Module**: `apps/backend/src/profiles/` (complete example with all 4 files)
- **Frontend Feature** (PREFERRED): `apps/frontend/src/profiles/` (when restructured - all files in one directory)
- **Frontend Hook** (OLD): `apps/frontend/src/hooks/useProfiles.ts` (needs to move to `profiles/`)
- **API Client**: `apps/frontend/src/lib/apiClient.ts` (shared singleton)

**Frontend Feature Structure**:
```
src/profiles/
├── useProfiles.ts          # Hooks
├── useProfileMutations.ts
├── ProfileCard.tsx         # Components
├── ProfileForm.tsx
├── ProfilePage.tsx         # Pages
├── ProfileEditPage.tsx
└── types.ts                # Optional types
```

All related files live together - no nested subdirectories!

### Environment Context

- **Local Development**: 
  - Backend: `http://localhost:3001`
  - Frontend: `http://localhost:5173`
  - Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
  - Supabase Studio: `http://localhost:54323`

- **All frontend API calls go to**: `http://localhost:3001/api/*`
- **Backend connects to database via**: MikroORM → PostgreSQL (port 54322)

### Quick Reference: Request Flow

```
User Action (Browser)
    ↓
React Component calls hook
    ↓
Hook (useProfiles.ts) calls apiClient
    ↓
apiClient.ts makes fetch to localhost:3001
    ↓
Express Route matches request
    ↓
Controller handles req/res
    ↓
Service executes business logic
    ↓
MikroORM Entity queries database
    ↓
PostgreSQL returns data
    ↓
Response flows back up the chain
```

## You're Ready! 🎉

If you've completed all the checkboxes above, you're ready to start developing!

Common first tasks:
- Add a new API endpoint following the entity → service → controller → route pattern
- Create a new hook in the frontend to consume an existing API
- Add a new field to an entity and update the full stack
- Build a new component that uses existing API hooks
- Fix a bug from the issue tracker

**Remember**: Always follow the established patterns. When in doubt, look at the `profiles` module as a reference implementation.

Welcome to the team! 🚀
