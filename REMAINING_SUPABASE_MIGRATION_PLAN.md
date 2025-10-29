# Detailed Migration Plan - Remaining 24 Files

**Created**: 2025-10-26
**Purpose**: Step-by-step guide for completing Supabase removal
**Estimated Time**: 8-12 hours total

---

## 🎯 Overview

**Completed**: 8 files (Critical infrastructure)
**Remaining**: 24 files (Data fetching)
**Strategy**: Batch processing by similarity

---

## 📋 Phase 1: Shared Components (PRIORITY 1)

**Impact**: Used on every page
**Est. Time**: 1-2 hours

### 1.1 Navbar.tsx
**File**: `apps/frontend/src/components/Navbar.tsx`
**Supabase Calls**:
- Line 51-60: `supabase.from('rulebooks')` → Use `rulebooksApi.getAll()`
- Line 66-76: `supabase.from('notifications')` → Create notifications API client
- Line 82-88: `supabase.from('team_members')` → Use `teamsApi.getUserTeams()`
- Line 92-93: `supabase.rpc('mark_notification_read')` → Need backend endpoint
- Line 97-98: `supabase.rpc('mark_all_notifications_read')` → Need backend endpoint

**Dependencies**:
- ❌ Notifications API client doesn't exist
- ❌ Backend notification endpoints don't exist

**Action**:
1. Create `notifications.api-client.ts`
2. Add notification endpoints to backend
3. Update Navbar to use API clients
4. Test notification functionality

### 1.2 SeasonSelector.tsx
**File**: `apps/frontend/src/components/SeasonSelector.tsx`
**Supabase Calls**:
- Likely fetches seasons from database

**Action**:
1. Check if seasons API client exists
2. Replace Supabase calls
3. Test season selection

---

## 📋 Phase 2: Admin Pages (PRIORITY 2)

**Impact**: Admin functionality
**Est. Time**: 2-3 hours

### 2.1 ClassesManagementPage.tsx
**File**: `apps/frontend/src/pages/admin/ClassesManagementPage.tsx`
**Expected Calls**: CRUD operations on classes
**API Client**: Already exists (check classes or competitions)

### 2.2 MemberDetailPage.tsx
**File**: `apps/frontend/src/pages/admin/MemberDetailPage.tsx`
**Expected Calls**: View single member, update member
**API Client**: `profilesApi` or `membershipsApi`

### 2.3 MembersPage.tsx
**File**: `apps/frontend/src/pages/admin/MembersPage.tsx`
**Expected Calls**: List all members, filter, search
**API Client**: `profilesApi`

### 2.4 SeasonManagementPage.tsx
**File**: `apps/frontend/src/pages/admin/SeasonManagementPage.tsx`
**Expected Calls**: CRUD operations on seasons
**API Client**: Need to create `seasons.api-client.ts`

**Batch Action Plan**:
1. Read each file to identify Supabase calls
2. Map to appropriate API client
3. Replace all calls in one pass
4. Create missing API clients if needed
5. Test each page

---

## 📋 Phase 3: Public Pages (PRIORITY 3)

**Impact**: End-user experience
**Est. Time**: 2-3 hours

### Events Pages (3 files)
- `pages/EventDetailPage.tsx` - `eventsApi.getById(id)`
- `pages/EventsPage.tsx` - `eventsApi.getAll()`

### Rulebook Pages (3 files)
- `pages/RulebookArchivePage.tsx` - `rulebooksApi.getAll()` with filters
- `pages/RulebookDetailPage.tsx` - `rulebooksApi.getById(id)`
- `pages/RulebooksPage.tsx` - `rulebooksApi.getAll()`

### Competition Pages (3 files)
- `pages/LeaderboardPage.tsx` - `competitionResultsApi.getLeaderboard()`
- `pages/ResultsPage.tsx` - `competitionResultsApi.getAll()`
- `pages/StandingsPage.tsx` - `competitionResultsApi.getStandings()`

### Home Page (1 file)
- `pages/HomePage.tsx` - Multiple fetches (events, news, etc.)

**Batch Action Plan**:
1. Group by API client (events, rulebooks, results)
2. Create search/replace patterns
3. Apply to all files in group
4. Test each group

---

## 📋 Phase 4: Admin Components (PRIORITY 4)

**Impact**: Admin tools
**Est. Time**: 2-3 hours

### 4.1 EventManagement.tsx
**File**: `components/admin/EventManagement.tsx`
**API Client**: `eventsApi`
**Operations**: Full CRUD

### 4.2 MediaLibrary.tsx
**File**: `components/admin/MediaLibrary.tsx`
**API Client**: Need `media.api-client.ts` or use storage endpoints
**Operations**: Upload, list, delete media

### 4.3 ResultsEntry.tsx
**File**: `components/admin/ResultsEntry.tsx`
**API Client**: `competitionResultsApi`
**Operations**: Create/update results

### 4.4 RulebookManagement.tsx
**File**: `components/admin/RulebookManagement.tsx`
**API Client**: `rulebooksApi`
**Operations**: Full CRUD

### 4.5 SiteSettings.tsx
**File**: `components/admin/SiteSettings.tsx`
**API Client**: Need `settings.api-client.ts`
**Operations**: Read/update settings

---

## 📋 Phase 5: Dashboard Components (PRIORITY 5)

**Impact**: Dashboard views
**Est. Time**: 1-2 hours

### 5.1 AdminDashboard.tsx
**File**: `components/dashboards/AdminDashboard.tsx`
**API Clients**: Multiple (stats, recent activity)
**Operations**: Aggregate data display

### 5.2 EventDirectorDashboard.tsx
**File**: `components/dashboards/EventDirectorDashboard.tsx`
**API Clients**: `eventsApi`, `eventRegistrationsApi`
**Operations**: Event management overview

### 5.3 UserDashboard.tsx
**File**: `components/dashboards/UserDashboard.tsx`
**API Clients**: `profilesApi`, `eventsApi`, `membershipsApi`
**Operations**: User-specific data display

---

## 🔧 Common Migration Patterns

### Pattern 1: Simple List
```typescript
// Before
const { data } = await supabase.from('events').select('*');

// After
const { data } = await eventsApi.getAll();
```

### Pattern 2: Single Item
```typescript
// Before
const { data } = await supabase.from('events').select('*').eq('id', id).single();

// After
const data = await eventsApi.getById(id);
```

### Pattern 3: Filtered List
```typescript
// Before
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('status', 'active')
  .order('date');

// After
// Option A: If backend has filter endpoint
const { data } = await eventsApi.getByStatus('active');

// Option B: Filter client-side
const { data: allEvents } = await eventsApi.getAll();
const activeEvents = allEvents.filter(e => e.status === 'active');
```

### Pattern 4: Create
```typescript
// Before
const { data, error } = await supabase.from('events').insert(newEvent);

// After
try {
  const data = await eventsApi.create(newEvent);
} catch (error) {
  // Handle error
}
```

### Pattern 5: Update
```typescript
// Before
const { data } = await supabase
  .from('events')
  .update(updates)
  .eq('id', id);

// After
const data = await eventsApi.update(id, updates);
```

### Pattern 6: Delete
```typescript
// Before
const { error } = await supabase.from('events').delete().eq('id', id);

// After
await eventsApi.delete(id);
```

### Pattern 7: RPC Function
```typescript
// Before
const { data } = await supabase.rpc('custom_function', { param: value });

// After
// Need to create specific backend endpoint
const { data } = await customApi.customFunction(value);
```

---

## 🆕 Missing API Clients to Create

Based on file analysis, these API clients may be needed:

1. **notifications.api-client.ts**
   - getNotifications(userId)
   - markAsRead(notificationId)
   - markAllAsRead(userId)

2. **seasons.api-client.ts** (if not already exist)
   - getAll()
   - getById(id)
   - create(data)
   - update(id, data)
   - delete(id)

3. **classes.api-client.ts** (if not already exists)
   - getAll()
   - getById(id)
   - create(data)
   - update(id, data)
   - delete(id)

4. **settings.api-client.ts**
   - getAll()
   - update(key, value)

5. **media.api-client.ts** (if storage needed)
   - upload(file)
   - list()
   - delete(id)

---

## ✅ Quality Checklist (Per File)

Before marking a file as complete:

- [ ] All `import { supabase }` statements removed
- [ ] All `supabase.from()` calls replaced
- [ ] All `supabase.rpc()` calls replaced or have backend endpoints
- [ ] All `supabase.storage` calls replaced (if any)
- [ ] Error handling implemented
- [ ] Loading states preserved
- [ ] TypeScript types updated
- [ ] File compiles without errors
- [ ] Manual testing completed
- [ ] No console errors in browser

---

## 🧪 Testing Strategy

### Per File:
1. **Smoke Test**: Page loads without errors
2. **Read Test**: Data displays correctly
3. **Create Test**: Can add new items
4. **Update Test**: Can modify items
5. **Delete Test**: Can remove items
6. **Error Test**: Handles API failures gracefully

### Integration Tests:
1. **Auth Flow**: Login → Access page → See data
2. **Permission Flow**: Different roles see different data
3. **Navigation**: Moving between pages works
4. **State Management**: Data persists correctly

---

## 📊 Progress Tracking

Create a checklist in this file and update as you go:

### Phase 1: Shared Components
- [ ] Navbar.tsx
- [ ] SeasonSelector.tsx

### Phase 2: Admin Pages
- [ ] ClassesManagementPage.tsx
- [ ] MemberDetailPage.tsx
- [ ] MembersPage.tsx
- [ ] SeasonManagementPage.tsx

### Phase 3: Public Pages
- [ ] EventDetailPage.tsx
- [ ] EventsPage.tsx
- [ ] HomePage.tsx
- [ ] LeaderboardPage.tsx
- [ ] ResultsPage.tsx
- [ ] RulebookArchivePage.tsx
- [ ] RulebookDetailPage.tsx
- [ ] RulebooksPage.tsx
- [ ] StandingsPage.tsx

### Phase 4: Admin Components
- [ ] EventManagement.tsx
- [ ] MediaLibrary.tsx
- [ ] ResultsEntry.tsx
- [ ] RulebookManagement.tsx
- [ ] SiteSettings.tsx

### Phase 5: Dashboard Components
- [ ] AdminDashboard.tsx
- [ ] EventDirectorDashboard.tsx
- [ ] UserDashboard.tsx

### Cleanup
- [ ] Delete lib/supabase.ts
- [ ] Delete test-db.ts
- [ ] Update package.json (remove @supabase/supabase-js if unused)

---

## 🚀 Getting Started

1. **Read this entire document** first
2. **Start with Phase 1** (Navbar & SeasonSelector)
3. **Test thoroughly** before moving to next phase
4. **Update progress** in this document
5. **Create missing API clients** as needed
6. **Ask for help** if stuck

---

## 📞 Need Help?

If you encounter:
- **Missing backend endpoints**: Check with backend-dev agent
- **Complex queries**: May need custom backend endpoint
- **Performance issues**: Consider caching or pagination
- **Type mismatches**: Update TypeScript interfaces
- **Unknown patterns**: Refer to completed files (AuthContext, usePermissions)

---

**Status**: 📋 **Ready to Execute**

**Next Session**: Start with Phase 1 - Shared Components

---

*Created by Frontend Development Expert on 2025-10-26*
