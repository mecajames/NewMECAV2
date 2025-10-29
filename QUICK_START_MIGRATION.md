# Quick Start: Supabase Frontend Migration

**Time Required:** 25-32 hours total
**Difficulty:** Advanced
**Status:** Ready to begin

---

## Pre-Flight Checklist

- [ ] Read `SUPABASE_MIGRATION_DETAILED_PLAN.md` (15 minutes)
- [ ] Read `ARCHITECTURE_FIX_SUMMARY.md` (5 minutes)
- [ ] Create backup: `npm run backup`
- [ ] Verify backend is running: `cd apps/backend && npm run dev`
- [ ] Verify database connection works
- [ ] Install Postman or similar for API testing

---

## Phase 1: Backend Development (7-9 hours)

### Step 1.1: Complete Media Files Module (2 hours)

#### 1.1.1 Create Controller
```bash
code apps/backend/src/media-files/media-files.controller.ts
```

**Copy code from:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` Section 1.1

**Test:**
```bash
# After backend restart, test with Postman:
GET http://localhost:3000/api/media-files
```

#### 1.1.2 Create Module
```bash
code apps/backend/src/media-files/media-files.module.ts
```

**Copy code from:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` Section 1.1

#### 1.1.3 Register in AppModule
```bash
code apps/backend/src/app.module.ts
```

Add: `import { MediaFilesModule } from './media-files/media-files.module';`
Add to `imports: [MediaFilesModule]`

**Checkpoint:** ✅ Media files endpoints working

---

### Step 1.2: Create Storage Module (2-3 hours)

#### 1.2.1 Install Dependencies
```bash
cd apps/backend
npm install @nestjs/platform-express multer
npm install -D @types/multer
```

#### 1.2.2 Create Storage Service
```bash
mkdir -p apps/backend/src/storage
code apps/backend/src/storage/storage.service.ts
```

**Copy code from:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` Section 1.2

#### 1.2.3 Create Storage Controller
```bash
code apps/backend/src/storage/storage.controller.ts
```

**Copy code from:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` Section 1.2

#### 1.2.4 Create Storage Module
```bash
code apps/backend/src/storage/storage.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

#### 1.2.5 Register in AppModule
```bash
code apps/backend/src/app.module.ts
```

Add: `import { StorageModule } from './storage/storage.module';`
Add to `imports: [StorageModule]`

**Test:**
```bash
# Test file upload with Postman
POST http://localhost:3000/api/storage/upload
Body: form-data
  - file: (select a file)
  - bucket: test-bucket
  - path: test/test.jpg
```

**Checkpoint:** ✅ Storage upload/delete working

---

### Step 1.3: Add Statistics Endpoints (2 hours)

#### 1.3.1 Update ProfilesController
```bash
code apps/backend/src/profiles/profiles.controller.ts
```

Add:
```typescript
@Get('stats/count')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions('view_users')
async getUserCount(@Query('membership_status') membershipStatus?: string) {
  return this.profilesService.getCount(membershipStatus);
}

@Get('by-role/:role')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions('view_users')
async getProfilesByRole(@Param('role') role: string) {
  return this.profilesService.findByRole(role);
}
```

#### 1.3.2 Update ProfilesService
```bash
code apps/backend/src/profiles/profiles.service.ts
```

Add:
```typescript
async getCount(membershipStatus?: string) {
  const where: any = {};
  if (membershipStatus) {
    where.membershipStatus = membershipStatus;
  }
  return { count: await this.em.count(Profile, where) };
}

async findByRole(role: string) {
  return this.em.find(Profile, { role }, {
    orderBy: { firstName: 'ASC', lastName: 'ASC' }
  });
}
```

#### 1.3.3 Update Other Controllers
Repeat for:
- `apps/backend/src/events/events.controller.ts` - Add `GET /stats/count`
- `apps/backend/src/events/events.service.ts` - Add `getCount()`
- `apps/backend/src/event-registrations/event-registrations.controller.ts`
- `apps/backend/src/event-registrations/event-registrations.service.ts`

**Test:**
```bash
GET http://localhost:3000/api/profiles/stats/count
GET http://localhost:3000/api/profiles/by-role/admin
GET http://localhost:3000/api/events/stats/count
GET http://localhost:3000/api/event-registrations/stats/count
```

**Checkpoint:** ✅ Statistics endpoints working

---

### Step 1.4: Add Leaderboard Endpoint (1-2 hours)

#### 1.4.1 Update CompetitionResultsController
```bash
code apps/backend/src/competition-results/competition-results.controller.ts
```

Add:
```typescript
@Get('leaderboard')
async getLeaderboard(
  @Query('season_id') seasonId?: string,
  @Query('limit') limit: string = '10'
) {
  return this.resultsService.getLeaderboard(seasonId, parseInt(limit));
}
```

#### 1.4.2 Update CompetitionResultsService
```bash
code apps/backend/src/competition-results/competition-results.service.ts
```

**Copy leaderboard aggregation code from:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` Section 1.4

**Test:**
```bash
GET http://localhost:3000/api/competition-results/leaderboard?limit=10
```

**Checkpoint:** ✅ Leaderboard endpoint working
**Phase 1 Complete:** ✅ All backend endpoints functional

---

## Phase 2: Frontend API Clients (2-3 hours)

### Step 2.1: Create Media Files API Client (1 hour)
```bash
code apps/frontend/src/api-client/media-files.api-client.ts
```

**Copy code from:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` Section 2.1

**Test in browser console:**
```javascript
const { mediaFilesApi } = await import('./api-client/media-files.api-client');
const files = await mediaFilesApi.getMediaFiles(1, 10);
console.log(files);
```

---

### Step 2.2: Create Storage API Client (1 hour)
```bash
code apps/frontend/src/api-client/storage.api-client.ts
```

**Copy code from:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` Section 2.2

---

### Step 2.3: Update Existing API Clients (1 hour)

Update these files with new methods:
- [ ] `apps/frontend/src/api-client/profiles.api-client.ts`
- [ ] `apps/frontend/src/api-client/events.api-client.ts`
- [ ] `apps/frontend/src/api-client/event-registrations.api-client.ts`
- [ ] `apps/frontend/src/api-client/competition-results.api-client.ts`

**Checkpoint:** ✅ All API clients created and tested
**Phase 2 Complete:** ✅ Frontend API layer ready

---

## Phase 3: Component Migration (13-16 hours)

### Migration Pattern (repeat for each component):

1. **Open component:**
   ```bash
   code apps/frontend/src/[path]/[ComponentName].tsx
   ```

2. **Remove Supabase import:**
   ```typescript
   // DELETE THIS:
   import { supabase } from '../../lib/supabase';
   ```

3. **Add API client imports:**
   ```typescript
   // ADD THESE:
   import { profilesApi } from '../../api-client/profiles.api-client';
   // ... other imports as needed
   ```

4. **Replace all `supabase.from()` calls** with API client calls

5. **Replace all `supabase.storage` calls** with `storageApi` calls

6. **Test the component** thoroughly

7. **Move to next component**

---

### Step 3.1: AdminDashboard.tsx (1 hour)

**File:** `apps/frontend/src/components/dashboards/AdminDashboard.tsx`

**Operations to replace:**
- [ ] Lines 30-36: Replace 4 count queries

**See:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` File 1 for exact code

**Test:** Open admin dashboard, verify stats load correctly

---

### Step 3.2: MediaLibrary.tsx (2-3 hours)

**File:** `apps/frontend/src/components/admin/MediaLibrary.tsx`

**Operations to replace:**
- [ ] Line 41-44: Fetch media files
- [ ] Line 95-103: Storage upload
- [ ] Line 131: Database insert
- [ ] Line 163: Database insert (external)
- [ ] Line 182-187: Storage and database delete

**See:** `SUPABASE_MIGRATION_DETAILED_PLAN.md` File 2 for exact code

**Test:**
- Upload new file
- Add external URL
- Delete file
- Filter by type
- Search

---

### Step 3.3: EventManagement.tsx (2-3 hours)

**File:** `apps/frontend/src/components/admin/EventManagement.tsx`

**Operations to replace:**
- [ ] Fetch events
- [ ] Fetch event directors
- [ ] Upload flyer
- [ ] Upload header image
- [ ] Create event
- [ ] Update event
- [ ] Delete event

**Test:** Full event CRUD cycle

---

### Step 3.4: LeaderboardPage.tsx (1 hour)

**File:** `apps/frontend/src/pages/LeaderboardPage.tsx`

**Operations to replace:**
- [ ] Fetch leaderboard

**Test:** Leaderboard displays, season filter works

---

### Step 3.5: RulebookManagement.tsx (1-2 hours)

**File:** `apps/frontend/src/components/admin/RulebookManagement.tsx`

**Operations to replace:**
- [ ] Fetch rulebooks
- [ ] Upload PDF
- [ ] Create/update/delete rulebook

**Test:** Full rulebook CRUD cycle

---

### Step 3.6: ResultsEntry.tsx (1 hour)

**File:** `apps/frontend/src/components/admin/ResultsEntry.tsx`

**Operations to replace:**
- [ ] Fetch events
- [ ] Fetch competitors
- [ ] Fetch existing results
- [ ] Save results

**Test:** Enter competition results

---

### Step 3.7: MemberDetailPage.tsx (0.5 hour)

**File:** `apps/frontend/src/pages/admin/MemberDetailPage.tsx`

**Note:** Already partially migrated, just has TODOs

**Test:** View member details

---

### Step 3.8: Additional Components (5 hours)

For each of these 10 files, simply remove the import:
- [ ] SiteSettings.tsx
- [ ] EventDetailPage.tsx
- [ ] EventsPage.tsx
- [ ] StandingsPage.tsx
- [ ] ResultsPage.tsx
- [ ] RulebookDetailPage.tsx
- [ ] EventDirectorDashboard.tsx
- [ ] UserDashboard.tsx
- [ ] RulebookArchivePage.tsx
- [ ] HomePage.tsx

**Checkpoint:** ✅ All components migrated
**Phase 3 Complete:** ✅ No Supabase usage in frontend

---

## Phase 4: Cleanup & Verification (2.5-3.5 hours)

### Step 4.1: Delete Supabase Client (5 minutes)

```bash
rm apps/frontend/src/lib/supabase.ts
```

---

### Step 4.2: Update Package.json (5 minutes)

```bash
code apps/frontend/package.json
```

Remove `@supabase/supabase-js` from dependencies

```bash
cd apps/frontend
npm install
```

---

### Step 4.3: Run Verification Script (1 minute)

```bash
cd "E:\MECA Oct 2025\NewMECAV2"
scripts\verify-architecture.bat
```

**Expected output:**
```
✅ ARCHITECTURE COMPLIANT
   No violations found. Frontend properly uses API clients.
```

---

### Step 4.4: Full Application Testing (2-3 hours)

Test all features systematically:

**Admin Features:**
- [ ] Dashboard statistics
- [ ] Media library (upload, delete, filter)
- [ ] Event management (create, edit, delete)
- [ ] Rulebook management (upload, edit, delete)
- [ ] Results entry
- [ ] Member management

**Public Features:**
- [ ] Homepage
- [ ] Events list
- [ ] Event details
- [ ] Leaderboard
- [ ] Standings
- [ ] Results
- [ ] Rulebooks

**Cross-cutting:**
- [ ] No console errors
- [ ] Backend logs clean
- [ ] All images load
- [ ] All PDFs load
- [ ] File uploads work
- [ ] Authentication works
- [ ] Permissions work

---

## Success Checklist

- [ ] All backend endpoints created and tested
- [ ] All API clients created
- [ ] All 17 components migrated
- [ ] lib/supabase.ts deleted
- [ ] Verification script passes (0 violations)
- [ ] All features work correctly
- [ ] No console errors
- [ ] No backend errors
- [ ] Frontend builds successfully
- [ ] Backend builds successfully

---

## If Something Goes Wrong

### Restore from Backup
```bash
npm run restore
```

### Check Logs
```bash
# Frontend console
# Backend terminal
# Browser DevTools Network tab
```

### Common Issues

**Issue:** Backend endpoint returns 404
**Fix:** Check controller route, restart backend

**Issue:** Frontend can't reach backend
**Fix:** Check VITE_API_BASE_URL in .env

**Issue:** File upload fails
**Fix:** Check Supabase storage permissions, check bucket exists

**Issue:** Verification script still shows violations
**Fix:** Re-check component, ensure all imports removed

---

## Time Tracking

Use this to track your progress:

| Phase | Started | Completed | Actual Time |
|-------|---------|-----------|-------------|
| Phase 1 | _______ | ________ | __________ |
| Phase 2 | _______ | ________ | __________ |
| Phase 3 | _______ | ________ | __________ |
| Phase 4 | _______ | ________ | __________ |

---

## Resources

- 📄 **Detailed Plan:** `SUPABASE_MIGRATION_DETAILED_PLAN.md`
- 📄 **Summary:** `ARCHITECTURE_FIX_SUMMARY.md`
- 📄 **Status:** `ARCHITECTURE_FIX_STATUS.md`
- 📄 **Audit:** `ARCHITECTURE_AUDIT_REPORT.md`
- 🔧 **Verify:** `scripts/verify-architecture.bat`

---

**Ready to start?** Begin with Phase 1, Step 1.1!
