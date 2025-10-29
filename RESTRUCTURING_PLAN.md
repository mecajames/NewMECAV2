# Project Restructuring Plan
## Aligning with ONBOARDING.md Architecture Rules

**Date**: 2025-10-24
**Status**: 🔴 CRITICAL - Major architectural violations found

---

## Executive Summary

Your developer is correct. The project has **critical violations** of the architecture defined in ONBOARDING.md:

1. **Backend is NOT using NestJS** - Using plain Express instead (CRITICAL)
2. **Frontend directly accesses Supabase** - 27 files violate the API-only rule (CRITICAL)
3. **Frontend uses old scattered structure** - Not feature-based (HIGH)
4. **No API client layer** - Direct database calls instead of HTTP API (CRITICAL)

---

## Detailed Violations

### Backend Issues (SEVERE)

| Violation | Current State | Required State | Priority |
|-----------|---------------|----------------|----------|
| Framework | Plain Express.js | NestJS with decorators | 🔴 CRITICAL |
| File naming | `controller.ts` | `profiles.controller.ts` | 🔴 CRITICAL |
| Module system | No modules | `@Module()` decorator pattern | 🔴 CRITICAL |
| Dependency Injection | Manual instantiation | Constructor injection | 🔴 CRITICAL |
| Controllers | Plain classes | `@Controller()` decorator | 🔴 CRITICAL |
| Services | Plain classes | `@Injectable()` decorator | 🔴 CRITICAL |
| Routing | Manual Express routes | Decorator-based (`@Get()`, `@Post()`) | 🔴 CRITICAL |

**Evidence**:
- `apps/backend/src/profiles/controller.ts:4-8` - Manual service instantiation
- No `@Module`, `@Controller`, `@Injectable` decorators found in entire backend
- Missing `.module.ts` files

### Frontend Issues (SEVERE)

| Violation | Files Affected | Required Fix | Priority |
|-----------|----------------|--------------|----------|
| Direct Supabase usage | 27 files | Remove all, use API client | 🔴 CRITICAL |
| `lib/supabase.ts` exists | 1 file | DELETE this file | 🔴 CRITICAL |
| No api-client layer | Missing | Create API client functions | 🔴 CRITICAL |
| Scattered structure | All files | Migrate to feature-based | 🟡 HIGH |
| No apiHooks.ts | Missing | Create per-feature hooks | 🟡 HIGH |

**Files importing Supabase** (27 total):
- All pages in `pages/` directory
- All components in `components/admin/`
- Dashboard components
- Auth context
- And more...

---

## Phased Migration Plan

### Phase 1: Backend - Convert to NestJS (Week 1-2)

**Priority**: 🔴 CRITICAL - Must complete first

#### Step 1.1: Install NestJS Dependencies
```bash
cd apps/backend
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata
```

#### Step 1.2: Create NestJS Application Structure

For EACH feature module (profiles, events, memberships, etc.):

**1. Rename files with feature prefix:**
```
profiles/
  controller.ts → profiles.controller.ts
  service.ts → profiles.service.ts
  entity.ts → profiles.entity.ts
```

**2. Add NestJS decorators to entity:**
```typescript
// profiles.entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'profiles', schema: 'public' })
export class Profile {
  @PrimaryKey({ type: 'uuid' })
  id: string;

  @Property({ type: 'text' })
  full_name!: string;
}
```

**3. Convert service to @Injectable:**
```typescript
// profiles.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Profile } from './profiles.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Profile[]> {
    return this.em.find(Profile, {});
  }

  // ... other methods
}
```

**4. Convert controller to use decorators:**
```typescript
// profiles.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProfilesService } from './profiles.service';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async listProfiles() {
    return this.profilesService.findAll();
  }

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.profilesService.findById(id);
  }

  @Post()
  async createProfile(@Body() data: any) {
    return this.profilesService.create(data);
  }

  // ... other routes
}
```

**5. Create module file:**
```typescript
// profiles.module.ts
import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
```

**6. Create app.module.ts:**
```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { ProfilesModule } from './profiles/profiles.module';
import { EventsModule } from './events/events.module';
// ... import all feature modules

@Module({
  imports: [
    DatabaseModule,  // Global DB connection
    ProfilesModule,
    EventsModule,
    // ... all feature modules
  ],
})
export class AppModule {}
```

**7. Create main.ts (NestJS entry point):**
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}

bootstrap();
```

#### Step 1.3: Repeat for All Modules
- ✅ Profiles module
- ✅ Events module
- ✅ Memberships module
- ✅ Event Registrations module
- ✅ Rulebooks module
- ✅ Competition Results module

#### Step 1.4: Test Backend
```bash
npm run dev:backend
curl http://localhost:3001/api/profiles
```

**Expected Result**: NestJS automatically discovers all routes from decorators

---

### Phase 2: Frontend - Remove Supabase & Add API Client (Week 2-3)

**Priority**: 🔴 CRITICAL - Blocks production deployment

#### Step 2.1: Create API Client Structure

**Create centralized API client directory:**
```bash
mkdir -p apps/frontend/src/api-client
```

**Create API client for each feature:**

```typescript
// api-client/profiles.api-client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const profilesApi = {
  getProfiles: async () => {
    const response = await fetch(`${API_BASE_URL}/api/profiles`);
    return response.json();
  },

  getProfile: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`);
    return response.json();
  },

  createProfile: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateProfile: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteProfile: async (id: string) => {
    await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'DELETE',
    });
  },
};
```

#### Step 2.2: Replace Supabase Calls

**For EACH of the 27 files using Supabase:**

**Before (WRONG):**
```typescript
// pages/ProfilePage.tsx
import { supabase } from '../lib/supabase';

function ProfilePage() {
  useEffect(() => {
    supabase.from('profiles').select('*').then(setProfiles);
  }, []);
}
```

**After (CORRECT):**
```typescript
// profiles/ProfilePage.tsx (moved to feature folder)
import { profilesApi } from '../api-client/profiles.api-client';

function ProfilePage() {
  useEffect(() => {
    profilesApi.getProfiles().then(setProfiles);
  }, []);
}
```

#### Step 2.3: Create API Hooks (Optional but Recommended)

Create `apiHooks.ts` per feature for reusable data fetching:

```typescript
// profiles/apiHooks.ts
import { useState, useEffect } from 'react';
import { profilesApi } from '../api-client/profiles.api-client';

export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profilesApi.getProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  return { profiles, loading };
}

export function useProfile(id: string) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profilesApi.getProfile(id)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [id]);

  return { profile, loading };
}
```

Then components use hooks:
```typescript
// profiles/ProfilePage.tsx
import { useProfiles } from './apiHooks';

function ProfilePage() {
  const { profiles, loading } = useProfiles();

  if (loading) return <div>Loading...</div>;
  return <div>{/* render profiles */}</div>;
}
```

#### Step 2.4: Delete Forbidden File
```bash
rm apps/frontend/src/lib/supabase.ts
```

#### Step 2.5: Update .env.development
```env
# Remove Supabase keys
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# Add only backend API URL
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

---

### Phase 3: Frontend - Restructure to Feature-Based (Week 3-4)

**Priority**: 🟡 HIGH - Improves maintainability

#### Current Structure (WRONG):
```
src/
├── pages/              ❌ All pages mixed together
│   ├── ProfilePage.tsx
│   ├── EventsPage.tsx
│   ├── EventDetailPage.tsx
│   └── MembershipsPage.tsx
├── components/         ❌ All components mixed
│   ├── ProfileCard.tsx
│   ├── EventCard.tsx
│   └── admin/
└── hooks/              ❌ All hooks scattered
    ├── useProfiles.ts
    └── useEvents.ts
```

#### Target Structure (CORRECT):
```
src/
├── api-client/                    ✅ Centralized API functions
│   ├── profiles.api-client.ts
│   ├── events.api-client.ts
│   ├── memberships.api-client.ts
│   ├── rulebooks.api-client.ts
│   └── auth.api-client.ts
│
├── profiles/                      ✅ Profile feature module
│   ├── apiHooks.ts                   # ALL profile hooks
│   ├── ProfileCard.tsx               # Components
│   ├── ProfileForm.tsx
│   └── ProfilePage.tsx               # Pages
│
├── events/                        ✅ Event feature module
│   ├── apiHooks.ts                   # ALL event hooks
│   ├── EventCard.tsx
│   ├── EventList.tsx
│   ├── EventsPage.tsx
│   └── EventDetailPage.tsx
│
├── memberships/                   ✅ Membership feature module
│   ├── apiHooks.ts
│   ├── MembershipCard.tsx
│   └── MembershipsPage.tsx
│
├── auth/                          ✅ Auth feature module
│   ├── apiHooks.ts
│   ├── LoginForm.tsx
│   ├── LoginPage.tsx
│   └── AuthContext.tsx
│
├── admin/                         ✅ Admin feature module
│   ├── apiHooks.ts
│   ├── AdminDashboard.tsx
│   ├── SeasonManagementPage.tsx
│   ├── ClassesManagementPage.tsx
│   ├── MembersPage.tsx
│   ├── MemberDetailPage.tsx
│   ├── EventManagement.tsx
│   ├── MediaLibrary.tsx
│   ├── SiteSettings.tsx
│   ├── RulebookManagement.tsx
│   └── ResultsEntry.tsx
│
├── rulebooks/                     ✅ Rulebook feature module
│   ├── apiHooks.ts
│   ├── RulebooksPage.tsx
│   ├── RulebookDetailPage.tsx
│   └── RulebookArchivePage.tsx
│
├── results/                       ✅ Results/Competition feature
│   ├── apiHooks.ts
│   ├── ResultsPage.tsx
│   ├── StandingsPage.tsx
│   └── LeaderboardPage.tsx
│
├── shared/                        ✅ ONLY truly shared components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── SeasonSelector.tsx
│
└── lib/
    └── env.ts                     ✅ Environment config only
```

#### Migration Steps:

**For each feature:**

1. **Create feature directory**
```bash
mkdir -p src/profiles
```

2. **Create API client** (if not done in Phase 2)
```bash
touch src/api-client/profiles.api-client.ts
```

3. **Create apiHooks.ts**
```bash
touch src/profiles/apiHooks.ts
```

4. **Move existing hooks into apiHooks.ts**
```bash
# Consolidate:
# hooks/useProfiles.ts → profiles/apiHooks.ts (export useProfiles)
# hooks/useProfile.ts → profiles/apiHooks.ts (export useProfile)
```

5. **Move pages**
```bash
mv pages/ProfilePage.tsx profiles/ProfilePage.tsx
```

6. **Move components**
```bash
mv components/ProfileCard.tsx profiles/ProfileCard.tsx
```

7. **Update all imports**
```typescript
// Old:
import { useProfiles } from '../hooks/useProfiles';

// New:
import { useProfiles } from './apiHooks';
```

8. **Update router**
```typescript
// App.tsx or router config
import { ProfilePage } from './profiles/ProfilePage';
import { EventsPage } from './events/EventsPage';
```

**Repeat for all features:**
- ✅ profiles
- ✅ events
- ✅ memberships
- ✅ auth
- ✅ admin
- ✅ rulebooks
- ✅ results

---

## Migration Checklist

### Backend (CRITICAL - Must Do First)

- [ ] Install NestJS dependencies
- [ ] Create `main.ts` with NestJS bootstrap
- [ ] Create `app.module.ts` root module
- [ ] Create `database.module.ts` (@Global) for MikroORM
- [ ] Convert profiles module:
  - [ ] Rename files: `profiles.entity.ts`, `profiles.service.ts`, `profiles.controller.ts`
  - [ ] Add `@Injectable()` to service
  - [ ] Add `@Controller('api/profiles')` to controller
  - [ ] Add `@Get()`, `@Post()`, `@Put()`, `@Delete()` decorators to routes
  - [ ] Create `profiles.module.ts` with `@Module()` decorator
- [ ] Convert events module (same pattern)
- [ ] Convert memberships module (same pattern)
- [ ] Convert event-registrations module (same pattern)
- [ ] Convert rulebooks module (same pattern)
- [ ] Convert competition-results module (same pattern)
- [ ] Test all endpoints with `curl` or Postman
- [ ] Verify NestJS auto-discovery of routes

### Frontend API Client (CRITICAL)

- [ ] Create `api-client/` directory
- [ ] Create `api-client/profiles.api-client.ts`
- [ ] Create `api-client/events.api-client.ts`
- [ ] Create `api-client/memberships.api-client.ts`
- [ ] Create `api-client/event-registrations.api-client.ts`
- [ ] Create `api-client/rulebooks.api-client.ts`
- [ ] Create `api-client/competition-results.api-client.ts`
- [ ] Create `api-client/auth.api-client.ts`
- [ ] Update `.env.development` to only have `VITE_API_URL`

### Frontend Remove Supabase (CRITICAL)

**27 files to update:**
- [ ] `pages/admin/MemberDetailPage.tsx`
- [ ] `pages/EventDetailPage.tsx`
- [ ] `components/admin/MediaLibrary.tsx`
- [ ] `components/admin/EventManagement.tsx`
- [ ] `pages/EventsPage.tsx`
- [ ] `pages/admin/MembersPage.tsx`
- [ ] `components/Navbar.tsx`
- [ ] `pages/admin/ClassesManagementPage.tsx`
- [ ] `pages/admin/SeasonManagementPage.tsx`
- [ ] `components/dashboards/AdminDashboard.tsx`
- [ ] `pages/LeaderboardPage.tsx`
- [ ] `pages/StandingsPage.tsx`
- [ ] `pages/ResultsPage.tsx`
- [ ] `components/SeasonSelector.tsx`
- [ ] `components/admin/SiteSettings.tsx`
- [ ] `pages/RulebookDetailPage.tsx`
- [ ] `components/dashboards/EventDirectorDashboard.tsx`
- [ ] `components/dashboards/UserDashboard.tsx`
- [ ] `contexts/AuthContext.tsx`
- [ ] `hooks/usePermissions.ts`
- [ ] `pages/RulebookArchivePage.tsx`
- [ ] `pages/RulebooksPage.tsx`
- [ ] `pages/HomePage.tsx`
- [ ] `test-db.ts` (can delete)
- [ ] `components/admin/RulebookManagement.tsx`
- [ ] `components/admin/ResultsEntry.tsx`
- [ ] **DELETE**: `lib/supabase.ts`

### Frontend Restructure (HIGH PRIORITY)

- [ ] Create feature directories: profiles/, events/, memberships/, auth/, admin/, rulebooks/, results/
- [ ] Move and consolidate hooks into `[feature]/apiHooks.ts`
- [ ] Move pages into feature directories
- [ ] Move components into feature directories
- [ ] Keep only truly shared components in `shared/`
- [ ] Update all imports
- [ ] Update router configuration
- [ ] Test all pages still render correctly

---

## Testing Plan

### Backend Testing

```bash
# Start backend
npm run dev:backend

# Test each endpoint
curl http://localhost:3001/api/profiles
curl http://localhost:3001/api/events
curl http://localhost:3001/api/memberships
curl http://localhost:3001/api/rulebooks
curl http://localhost:3001/api/competition-results

# Test POST
curl -X POST http://localhost:3001/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Test User", "email": "test@example.com"}'
```

### Frontend Testing

```bash
# Start frontend (with backend running)
npm run dev

# Test each page:
# - Login page
# - Dashboard
# - Events page
# - Profile page
# - Admin pages
# - Verify no Supabase imports in browser console
# - Verify all API calls go to localhost:3001
```

### Integration Testing

```bash
# Start full stack
npm run start:all

# Verify:
# 1. Frontend loads without errors
# 2. All pages render data from backend
# 3. Create/Update/Delete operations work
# 4. No direct database calls
# 5. No Supabase errors in console
```

---

## Risk Assessment

### High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing features during migration | 🔴 HIGH | Migrate one module at a time, test thoroughly |
| Data loss during restructure | 🔴 HIGH | Backup database before starting |
| Authentication breaks | 🔴 HIGH | Test auth flow after each phase |
| Frontend can't reach backend | 🟡 MEDIUM | Keep both ports consistent, update CORS |

### Rollback Plan

If issues occur:
1. Keep old code in Git branches
2. Use feature flags for gradual rollout
3. Backend: Can run both Express and NestJS temporarily
4. Frontend: Gradual migration, test one feature at a time

---

## Timeline Estimate

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Backend to NestJS | 1-2 weeks | 🔴 CRITICAL |
| Phase 2: Remove Supabase, add API client | 1-2 weeks | 🔴 CRITICAL |
| Phase 3: Feature-based restructure | 1-2 weeks | 🟡 HIGH |
| Testing & Bug fixes | 1 week | 🔴 CRITICAL |
| **Total** | **4-7 weeks** | |

---

## Success Criteria

### Backend Success:
✅ All routes use NestJS decorators (`@Controller`, `@Get`, etc.)
✅ All services use `@Injectable()` with constructor DI
✅ All modules have `.module.ts` files
✅ No manual route registration
✅ App runs via `NestJS.create(AppModule)`

### Frontend Success:
✅ Zero Supabase imports
✅ `lib/supabase.ts` deleted
✅ All API calls go through `api-client/[feature].api-client.ts`
✅ All features organized in feature directories
✅ All hooks in `[feature]/apiHooks.ts`
✅ Only shared components in `shared/`

### Data Flow Success:
✅ Component → Hook → API Client → Backend API → Database
✅ No direct database access from frontend
✅ All communication via HTTP to localhost:3001

---

## Recommended Approach

### Option A: Complete Rewrite (Fastest but Risky)
- Create new NestJS backend from scratch
- Migrate database/entities
- Rewrite frontend with proper structure
- **Time**: 3-4 weeks
- **Risk**: High (everything changes at once)

### Option B: Incremental Migration (Slower but Safer) ⭐ RECOMMENDED
- Phase 1: Backend to NestJS (1-2 weeks)
- Phase 2: Remove Supabase (1-2 weeks)
- Phase 3: Restructure frontend (1-2 weeks)
- **Time**: 4-7 weeks
- **Risk**: Low (test after each phase)

### Option C: Hybrid Approach
- Run NestJS alongside Express temporarily
- Migrate one feature at a time
- Switch over when ready
- **Time**: 5-8 weeks
- **Risk**: Medium (added complexity)

---

## Next Steps

1. **Review this plan** with your development team
2. **Choose migration approach** (Option B recommended)
3. **Set up Git branch** for restructuring work
4. **Backup database** before starting
5. **Start with Phase 1** - Backend to NestJS
6. **Test thoroughly** after each phase
7. **Document changes** as you go

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [MikroORM with NestJS](https://mikro-orm.io/docs/usage-with-nestjs)
- [NestJS Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- ONBOARDING.md (this project's architecture guide)

---

## Questions?

If you need clarification on any part of this plan, refer to:
- **ONBOARDING.md** - Architecture rules and patterns
- **Your developer** - For project-specific context
- **This document** - Step-by-step migration guide

**Good luck with the restructuring!** 🚀
