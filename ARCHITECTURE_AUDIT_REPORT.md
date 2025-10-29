# Architecture Audit Report
**Date:** 2025-10-28
**Auditor:** Claude Code
**Reference Document:** ONBOARDING.md

## Executive Summary

This audit verifies compliance with the architecture rules defined in `ONBOARDING.md`. The project follows a 3-tier architecture (Database ← NestJS Backend API ← Frontend) with specific requirements for both backend and frontend organization.

### Overall Status: ⚠️ **PARTIAL COMPLIANCE**

**Critical Issues Found:** 2
**Warnings:** 1
**Compliant Areas:** 6

---

## 🚨 CRITICAL VIOLATIONS

### 1. Frontend Uses `lib/supabase.ts` Directly
**Severity:** CRITICAL
**Rule Violated:** "Frontend NEVER uses `lib/supabase.ts` or imports Supabase client"

**Findings:**
- ❌ `apps/frontend/src/lib/supabase.ts` exists and creates a Supabase client
- ❌ **17 files** are importing from `lib/supabase`:
  ```
  apps/frontend/src/components/admin/SiteSettings.tsx
  apps/frontend/src/components/dashboards/AdminDashboard.tsx
  apps/frontend/src/pages/EventDetailPage.tsx
  apps/frontend/src/components/admin/MediaLibrary.tsx
  apps/frontend/src/components/admin/EventManagement.tsx
  apps/frontend/src/pages/EventsPage.tsx
  apps/frontend/src/pages/LeaderboardPage.tsx
  apps/frontend/src/pages/StandingsPage.tsx
  apps/frontend/src/pages/ResultsPage.tsx
  apps/frontend/src/pages/RulebookDetailPage.tsx
  apps/frontend/src/components/dashboards/EventDirectorDashboard.tsx
  apps/frontend/src/components/dashboards/UserDashboard.tsx
  apps/frontend/src/pages/RulebookArchivePage.tsx
  apps/frontend/src/pages/RulebooksPage.tsx
  apps/frontend/src/pages/HomePage.tsx
  apps/frontend/src/components/admin/RulebookManagement.tsx
  apps/frontend/src/components/admin/ResultsEntry.tsx
  ```

**Impact:** This violates the fundamental architecture principle that the frontend should NEVER communicate directly with the database.

**Recommendation:**
1. Remove all imports of `lib/supabase.ts` from frontend components
2. Replace direct Supabase calls with API client functions
3. Update all affected components to use API hooks instead
4. Delete `apps/frontend/src/lib/supabase.ts` after migration

---

### 2. Frontend Makes Direct Database Calls
**Severity:** CRITICAL
**Rule Violated:** "Frontend ONLY communicates via API hooks → API client → Backend"

**Findings:**
- ❌ **7 files** use `supabase.from()` for direct database access:
  ```
  apps/frontend/src/pages/admin/MemberDetailPage.tsx
  apps/frontend/src/components/dashboards/AdminDashboard.tsx
  apps/frontend/src/components/admin/MediaLibrary.tsx
  apps/frontend/src/components/admin/EventManagement.tsx
  apps/frontend/src/pages/LeaderboardPage.tsx
  apps/frontend/src/components/admin/RulebookManagement.tsx
  apps/frontend/src/components/admin/ResultsEntry.tsx
  ```

**Impact:** Direct database access bypasses the backend API layer, violating the 3-tier architecture and potentially exposing database credentials in the frontend.

**Recommendation:**
1. Create corresponding backend API endpoints for all database operations
2. Create API client functions in `api-client/` directory
3. Update affected components to use API hooks
4. Remove all `supabase.from()` calls from frontend code

**Example Migration Path:**
```typescript
// ❌ BEFORE (Direct Database Access)
const { data } = await supabase.from('events').select('*');

// ✅ AFTER (API Client → Backend)
// 1. Create backend endpoint in events.controller.ts
@Get()
async listEvents() {
  return this.eventsService.findAll();
}

// 2. Create API client function in api-client/events.api-client.ts
export const eventsApi = {
  getEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/api/events`);
    return response.json();
  }
};

// 3. Use hook in component
const { events, loading } = useEvents();
```

---

## ⚠️ WARNINGS

### 3. Frontend Partially Feature-Based (Needs Restructuring)
**Severity:** WARNING
**Rule Violated:** "Frontend is organized by FEATURE, not by file type"

**Findings:**
- ⚠️ Feature directories exist but are incomplete:
  - `apps/frontend/src/profiles/` - Contains only `apiHooks.ts`
  - `apps/frontend/src/events/` - Contains only `apiHooks.ts`
  - `apps/frontend/src/memberships/` - Contains only `apiHooks.ts`
  - `apps/frontend/src/rulebooks/` - Contains only `apiHooks.ts`
  - `apps/frontend/src/competition-results/` - Contains only `apiHooks.ts`
  - `apps/frontend/src/event-registrations/` - Contains only `apiHooks.ts`

- ⚠️ Old monolithic structure still exists:
  - `apps/frontend/src/pages/` - 16 page files scattered
  - `apps/frontend/src/components/` - 14 component files scattered
  - `apps/frontend/src/hooks/` - Hooks directory (should be consolidated)

**Impact:** The codebase is in a transitional state. While API hooks are organized by feature, pages and components are not, making it harder to find related code.

**Current Structure:**
```
src/
├── api-client/          ✅ Centralized (GOOD!)
├── profiles/
│   └── apiHooks.ts      ✅ Has hooks (GOOD!)
│   ❌ Missing ProfilePage.tsx
│   ❌ Missing ProfileCard.tsx
├── pages/               ⚠️ Monolithic (BAD!)
│   ├── ProfilePage.tsx
│   ├── EventsPage.tsx
│   └── ...
└── components/          ⚠️ Monolithic (BAD!)
    ├── admin/
    └── dashboards/
```

**Target Structure:**
```
src/
├── api-client/          ✅ Centralized
│   ├── profiles.api-client.ts
│   ├── events.api-client.ts
│   └── ...
│
├── profiles/            ✅ Complete feature module
│   ├── apiHooks.ts
│   ├── ProfilePage.tsx
│   ├── ProfileCard.tsx
│   └── ProfileForm.tsx
│
├── events/              ✅ Complete feature module
│   ├── apiHooks.ts
│   ├── EventsPage.tsx
│   ├── EventDetailPage.tsx
│   ├── EventCard.tsx
│   └── EventList.tsx
│
└── shared/              ✅ Only truly shared components
    ├── Button.tsx
    ├── Modal.tsx
    ├── Navbar.tsx
    └── Footer.tsx
```

**Recommendation:**
1. Move pages from `pages/` to their respective feature directories
2. Move feature-specific components from `components/` to feature directories
3. Keep only truly shared/generic components in `shared/`
4. Update all import paths after moving files
5. Remove empty `pages/`, `components/`, and `hooks/` directories

**Priority:** MEDIUM (Improves maintainability but doesn't break functionality)

---

## ✅ COMPLIANT AREAS

### 4. API Client Files Properly Centralized
**Status:** ✅ COMPLIANT
**Rule:** "API client functions centralized in api-client/ directory"

**Findings:**
- ✅ All 16 API client files are in `apps/frontend/src/api-client/`:
  ```
  api-helpers.ts
  auth.api-client.ts
  banners.api-client.ts
  classes.api-client.ts
  competition-results.api-client.ts
  directories.api-client.ts
  event-registrations.api-client.ts
  events.api-client.ts
  memberships.api-client.ts
  membership-types.api-client.ts
  notifications.api-client.ts
  permissions.api-client.ts
  profiles.api-client.ts
  rulebooks.api-client.ts
  seasons.api-client.ts
  teams.api-client.ts
  ```
- ✅ No API client files scattered in other directories

---

### 5. Backend Follows NestJS Decorator Pattern
**Status:** ✅ COMPLIANT
**Rule:** "Backend uses NestJS with decorator-based routing (@Controller, @Get, @Post)"

**Findings:**
- ✅ All controllers use `@Controller()` decorator
- ✅ All route handlers use method decorators (`@Get()`, `@Post()`, `@Put()`, `@Delete()`)
- ✅ No manual route registration files
- ✅ NestJS automatically discovers and registers routes

**Example (from profiles.controller.ts):**
```typescript
@Controller('api/profiles')
@UseGuards(AuthGuard, PermissionGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @RequirePermissions('view_users')
  async listProfiles(@Query('page') page: string = '1') {
    return this.profilesService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.profilesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() data: Partial<Profile>) {
    return this.profilesService.create(data);
  }
}
```

---

### 6. Backend Services Use @Injectable and EntityManager
**Status:** ✅ COMPLIANT
**Rule:** "Backend uses MikroORM entities → services (DI via @Injectable())"

**Findings:**
- ✅ All services use `@Injectable()` decorator
- ✅ All services inject `EntityManager` via constructor
- ✅ Dependency injection properly configured

**Example (from profiles.service.ts):**
```typescript
@Injectable()
export class ProfilesService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Profile[]> {
    return this.em.find(Profile, {}, { limit, offset });
  }
}
```

---

### 7. Backend Modules Follow 4-File Pattern
**Status:** ✅ COMPLIANT
**Rule:** "[feature].entity → [feature].service → [feature].controller → [feature].module"

**Findings:**
- ✅ All feature modules have the required 4 files:
  - `profiles/` - ✅ Complete (entity, service, controller, module)
  - `events/` - ✅ Complete
  - `memberships/` - ✅ Complete
  - `rulebooks/` - ✅ Complete
  - `competition-results/` - ✅ Complete
  - `event-registrations/` - ✅ Complete
  - `banners/` - ✅ Complete
  - `directories/` - ✅ Complete
  - `teams/` - ✅ Complete
  - `membership-types/` - ✅ Complete
  - `seasons/` - ✅ Complete
  - `notifications/` - ✅ Complete
  - `classes/` - ✅ Complete
  - `permissions/` - ✅ Complete

**Exception:**
- `auth/` - Has controller and service but no entity (expected, as auth handles authentication logic)

---

### 8. Controllers Are Thin (HTTP Handling Only)
**Status:** ✅ COMPLIANT
**Rule:** "Controllers thin - just HTTP handling with decorators"

**Findings:**
- ✅ Controllers delegate all business logic to services
- ✅ Controllers only handle HTTP request/response mapping
- ✅ Controllers use NestJS parameter decorators (`@Param()`, `@Body()`, `@Query()`)
- ✅ No database operations in controllers

---

### 9. No Direct fetch() Calls in Components
**Status:** ✅ COMPLIANT
**Rule:** "No direct fetch() calls in components"

**Findings:**
- ✅ No `fetch()` calls found in `apps/frontend/src/pages/`
- ✅ No `fetch()` calls found in `apps/frontend/src/components/`
- ✅ All HTTP requests properly go through API client functions

**Note:** While this is compliant, it's overshadowed by the critical violation of direct Supabase usage.

---

## Summary of Violations by File

### Files with Direct Supabase Usage (Must Fix):

1. **apps/frontend/src/components/admin/SiteSettings.tsx**
   - Imports: `lib/supabase`

2. **apps/frontend/src/components/dashboards/AdminDashboard.tsx**
   - Imports: `lib/supabase`
   - Uses: `supabase.from()`

3. **apps/frontend/src/pages/EventDetailPage.tsx**
   - Imports: `lib/supabase`

4. **apps/frontend/src/components/admin/MediaLibrary.tsx**
   - Imports: `lib/supabase`
   - Uses: `supabase.from()`

5. **apps/frontend/src/components/admin/EventManagement.tsx**
   - Imports: `lib/supabase`
   - Uses: `supabase.from()`

6. **apps/frontend/src/pages/EventsPage.tsx**
   - Imports: `lib/supabase`

7. **apps/frontend/src/pages/LeaderboardPage.tsx**
   - Imports: `lib/supabase`
   - Uses: `supabase.from()`

8. **apps/frontend/src/pages/StandingsPage.tsx**
   - Imports: `lib/supabase`

9. **apps/frontend/src/pages/ResultsPage.tsx**
   - Imports: `lib/supabase`

10. **apps/frontend/src/pages/RulebookDetailPage.tsx**
    - Imports: `lib/supabase`

11. **apps/frontend/src/components/dashboards/EventDirectorDashboard.tsx**
    - Imports: `lib/supabase`

12. **apps/frontend/src/components/dashboards/UserDashboard.tsx**
    - Imports: `lib/supabase`

13. **apps/frontend/src/pages/RulebookArchivePage.tsx**
    - Imports: `lib/supabase`

14. **apps/frontend/src/pages/RulebooksPage.tsx**
    - Imports: `lib/supabase`

15. **apps/frontend/src/pages/HomePage.tsx**
    - Imports: `lib/supabase`

16. **apps/frontend/src/components/admin/RulebookManagement.tsx**
    - Imports: `lib/supabase`
    - Uses: `supabase.from()`

17. **apps/frontend/src/components/admin/ResultsEntry.tsx**
    - Imports: `lib/supabase`
    - Uses: `supabase.from()`

18. **apps/frontend/src/pages/admin/MemberDetailPage.tsx**
    - Uses: `supabase.from()`

---

## Recommended Action Plan

### Phase 1: Fix Critical Violations (HIGH PRIORITY)
**Estimated Effort:** 2-3 days

1. **Audit each file with Supabase usage**
   - Document what database operations each file performs
   - Identify which backend endpoints already exist
   - Identify which endpoints need to be created

2. **Create missing backend endpoints**
   - Add routes to existing controllers or create new controllers as needed
   - Ensure all database operations have corresponding backend endpoints

3. **Update frontend files one by one**
   - Replace `supabase.from()` calls with API client functions
   - Update components to use API hooks
   - Test each file after migration

4. **Remove Supabase from frontend**
   - Delete `apps/frontend/src/lib/supabase.ts`
   - Remove Supabase environment variables from frontend `.env.development`
   - Remove `@supabase/supabase-js` from frontend dependencies

### Phase 2: Restructure Frontend (MEDIUM PRIORITY)
**Estimated Effort:** 1-2 days

1. **Move pages to feature directories**
   - Move `ProfilePage.tsx` → `profiles/ProfilePage.tsx`
   - Move `EventsPage.tsx`, `EventDetailPage.tsx` → `events/`
   - Etc.

2. **Move components to feature directories**
   - Move feature-specific components from `components/` to their features
   - Keep only shared components in `shared/`

3. **Update import paths**
   - Use find-and-replace to update imports
   - Test the application after restructuring

4. **Clean up empty directories**
   - Remove `pages/`, `components/`, `hooks/` if empty

### Phase 3: Verification (ONGOING)
**Estimated Effort:** 1 day

1. **Run automated checks**
   - `grep -r "supabase.from" apps/frontend/src` → should return 0 results
   - `grep -r "lib/supabase" apps/frontend/src` → should return 0 results

2. **Manual testing**
   - Test all affected pages/components
   - Verify all data operations work through backend

3. **Update documentation**
   - Update README if needed
   - Add notes about migration

---

## Conclusion

The project demonstrates **good architectural practices in the backend** with proper NestJS patterns, dependency injection, and modular structure. The **API client layer is well-organized** and centralized.

However, there are **critical violations in the frontend** where direct database access bypasses the backend API layer. This must be addressed immediately as it:
- Violates the fundamental 3-tier architecture
- Exposes database credentials in the frontend
- Creates security vulnerabilities
- Makes the codebase inconsistent and harder to maintain

**Priority Actions:**
1. 🚨 **CRITICAL:** Remove all direct Supabase usage from frontend (17 files)
2. 🚨 **CRITICAL:** Migrate all `supabase.from()` calls to API client pattern (7 files)
3. ⚠️ **MEDIUM:** Restructure frontend to fully feature-based organization

Once these violations are addressed, the project will be fully compliant with the architectural rules defined in `ONBOARDING.md`.
