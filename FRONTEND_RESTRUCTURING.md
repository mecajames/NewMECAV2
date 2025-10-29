# Frontend Restructuring Progress

## ✅ Completed Tasks

### 1. Backend Configuration
- ✅ Backend `.env` file verified with correct PORT=3001 configuration
- ✅ All 6 backend modules converted to NestJS (Profiles, Events, Memberships, Event Registrations, Rulebooks, Competition Results)
- ✅ Proper decorators and dependency injection in place
- ✅ Backend compiles successfully
- ✅ Backend tested and working on port 3002 (needs restart on 3001)

### 2. Frontend Configuration
- ✅ Updated `.env.development` to use `VITE_API_URL=http://localhost:3001`
- ✅ Removed Supabase credentials from frontend (per ONBOARDING.md rules)
- ✅ Frontend now configured to talk to backend API only

### 3. New Frontend Architecture (Foundation)
- ✅ Created `src/api-client/` directory for centralized API client functions
- ✅ Created `src/profiles/` feature directory
- ✅ Created `src/shared/` for shared components
- ✅ Created complete example: `api-client/profiles.api-client.ts`
- ✅ Created complete example: `profiles/apiHooks.ts` with all hooks

## 📋 Current Architecture

### New Structure (Partially Implemented)
```
src/
├── api-client/          ✅ CREATED
│   └── profiles.api-client.ts    ✅ Complete example
│
├── profiles/            ✅ CREATED
│   └── apiHooks.ts      ✅ Complete example with 5 hooks
│
├── shared/              ✅ CREATED (empty - ready for shared components)
│
├── components/          ❌ OLD - Needs migration
├── contexts/            ⚠️  Keep (auth context, etc.)
├── hooks/               ❌ OLD - Needs consolidation into feature modules
├── lib/                 ⚠️  Keep (utilities)
├── pages/               ❌ OLD - Needs migration
└── types/               ⚠️  Keep (shared types)
```

## 🚀 Next Steps Required

### Phase 1: Complete API Client Layer

Create API client files for all backend modules:

```bash
# Create these files in src/api-client/
src/api-client/
├── profiles.api-client.ts     ✅ DONE
├── events.api-client.ts        ❌ TODO
├── memberships.api-client.ts   ❌ TODO
├── event-registrations.api-client.ts  ❌ TODO
├── rulebooks.api-client.ts     ❌ TODO
└── competition-results.api-client.ts  ❌ TODO
```

**Template to use**: Copy `src/api-client/profiles.api-client.ts` and adapt for each feature.

### Phase 2: Create Feature Modules

Create feature directories with `apiHooks.ts` for each:

```bash
# Create these directories and files
src/
├── profiles/              ✅ DONE
│   ├── apiHooks.ts        ✅ DONE
│   ├── ProfileCard.tsx    ❌ Move from components/
│   ├── ProfileForm.tsx    ❌ Move from components/
│   └── ProfilePage.tsx    ❌ Move from pages/
│
├── events/                ❌ TODO - Create directory
│   ├── apiHooks.ts        ❌ TODO - Create (all event hooks in one file)
│   ├── EventCard.tsx      ❌ Move from components/
│   ├── EventList.tsx      ❌ Move from components/
│   ├── EventsPage.tsx     ❌ Move from pages/
│   └── EventDetailPage.tsx ❌ Move from pages/
│
├── memberships/           ❌ TODO - Create directory
│   ├── apiHooks.ts        ❌ TODO - Create
│   └── ...                ❌ Move related files
│
├── event-registrations/   ❌ TODO - Create directory
│   ├── apiHooks.ts        ❌ TODO - Create
│   └── ...                ❌ Move related files
│
├── rulebooks/             ❌ TODO - Create directory
│   ├── apiHooks.ts        ❌ TODO - Create
│   └── ...                ❌ Move related files
│
└── competition-results/   ❌ TODO - Create directory
    ├── apiHooks.ts        ❌ TODO - Create
    └── ...                ❌ Move related files
```

### Phase 3: Migrate Existing Components

For each feature:

1. **Identify feature-specific files** in old directories:
   ```bash
   # Example for Events:
   pages/EventsPage.tsx → events/EventsPage.tsx
   pages/EventDetailPage.tsx → events/EventDetailPage.tsx
   components/EventCard.tsx → events/EventCard.tsx
   components/EventList.tsx → events/EventList.tsx
   hooks/useEvents.ts → DELETE (replaced by events/apiHooks.ts)
   hooks/useEvent.ts → DELETE (replaced by events/apiHooks.ts)
   ```

2. **Update imports in moved files**:
   ```typescript
   // OLD
   import { useEvents } from '../hooks/useEvents';

   // NEW
   import { useEvents } from './apiHooks';
   ```

3. **Update hooks to use API client**:
   ```typescript
   // In events/apiHooks.ts
   import { eventsApi } from '../api-client/events.api-client';

   export function useEvents() {
     // Use eventsApi.getEvents() instead of direct Supabase
   }
   ```

4. **Test each moved feature** before moving to the next

### Phase 4: Identify Shared Components

Move only truly generic/shared components to `src/shared/`:

```bash
src/shared/
├── Button.tsx           # Generic button component
├── Input.tsx            # Generic input component
├── Modal.tsx            # Generic modal component
├── Spinner.tsx          # Loading spinner
├── Header.tsx           # App header/nav
└── Footer.tsx           # App footer
```

**Rule**: If a component is used by multiple features AND is generic enough, it goes in `shared/`. Feature-specific components stay in their feature directory.

### Phase 5: Clean Up Old Directories

After all files are migrated:

1. **Verify old directories are empty** (except what should remain):
   ```bash
   # Should be empty or nearly empty
   components/
   pages/
   hooks/

   # Should remain
   contexts/      # Auth context, theme context, etc.
   lib/           # Utilities, helpers
   types/         # Shared TypeScript types
   ```

2. **Delete empty old directories**:
   ```bash
   # Only after everything is migrated and tested!
   rm -rf src/components
   rm -rf src/pages
   rm -rf src/hooks
   ```

## 🎯 Migration Checklist

Use this checklist for each feature:

### Events Feature
- [ ] Create `api-client/events.api-client.ts`
- [ ] Create `events/` directory
- [ ] Create `events/apiHooks.ts` with all event hooks
- [ ] Move `pages/EventsPage.tsx` → `events/EventsPage.tsx`
- [ ] Move `pages/EventDetailPage.tsx` → `events/EventDetailPage.tsx`
- [ ] Move `components/EventCard.tsx` → `events/EventCard.tsx`
- [ ] Move `components/EventList.tsx` → `events/EventList.tsx`
- [ ] Update all imports in moved files
- [ ] Test event features work
- [ ] Delete old `hooks/useEvents.ts` and `hooks/useEvent.ts`

### Memberships Feature
- [ ] Create `api-client/memberships.api-client.ts`
- [ ] Create `memberships/` directory
- [ ] Create `memberships/apiHooks.ts`
- [ ] Move related pages/components
- [ ] Update imports
- [ ] Test
- [ ] Delete old hooks

### Event Registrations Feature
- [ ] Create `api-client/event-registrations.api-client.ts`
- [ ] Create `event-registrations/` directory
- [ ] Create `event-registrations/apiHooks.ts`
- [ ] Move related files
- [ ] Update imports
- [ ] Test
- [ ] Delete old hooks

### Rulebooks Feature
- [ ] Create `api-client/rulebooks.api-client.ts`
- [ ] Create `rulebooks/` directory
- [ ] Create `rulebooks/apiHooks.ts`
- [ ] Move related files
- [ ] Update imports
- [ ] Test
- [ ] Delete old hooks

### Competition Results Feature
- [ ] Create `api-client/competition-results.api-client.ts`
- [ ] Create `competition-results/` directory
- [ ] Create `competition-results/apiHooks.ts`
- [ ] Move related files
- [ ] Update imports
- [ ] Test
- [ ] Delete old hooks

## 📚 Reference Examples

### API Client Example
See: `src/api-client/profiles.api-client.ts`

Key points:
- One file per feature
- Exports an object with all HTTP request functions
- Uses `VITE_API_URL` from environment
- Clean function names: `getProfiles()`, `createProfile()`, etc.
- Proper error handling with `throw new Error()`

### API Hooks Example
See: `src/profiles/apiHooks.ts`

Key points:
- ONE file contains ALL hooks for the feature
- Each hook uses the API client functions
- Hooks manage loading and error states
- Clear naming: `useProfiles()`, `useProfile()`, `useCreateProfile()`
- All hooks exported from same file

### Data Flow
```
Component
    ↓ calls hook
apiHooks.ts (e.g., useProfiles)
    ↓ calls API client function
api-client/[feature].api-client.ts (e.g., profilesApi.getProfiles)
    ↓ makes HTTP request
Backend API (e.g., GET /api/profiles)
    ↓ returns data
Component receives data
```

## ⚠️ Important Rules

1. **NEVER import Supabase client** in frontend code
   ```typescript
   // ❌ NEVER DO THIS
   import { supabase } from '../lib/supabase';

   // ✅ ALWAYS DO THIS
   import { profilesApi } from '../api-client/profiles.api-client';
   ```

2. **All hooks in ONE file** per feature
   ```typescript
   // ❌ WRONG - Multiple hook files
   hooks/useProfile.ts
   hooks/useProfiles.ts
   hooks/useCreateProfile.ts

   // ✅ CORRECT - One apiHooks.ts file
   profiles/apiHooks.ts  // Contains useProfile, useProfiles, useCreateProfile, etc.
   ```

3. **Feature files stay flat** - No subdirectories
   ```bash
   # ❌ WRONG - Nested structure
   profiles/
   ├── components/
   │   └── ProfileCard.tsx
   ├── pages/
   │   └── ProfilePage.tsx
   └── hooks/
       └── apiHooks.ts

   # ✅ CORRECT - Flat structure
   profiles/
   ├── apiHooks.ts
   ├── ProfileCard.tsx
   ├── ProfileForm.tsx
   ├── ProfilePage.tsx
   └── ProfileEditPage.tsx
   ```

4. **Imports within a feature are simple**
   ```typescript
   // All in profiles/ directory
   import { useProfile } from './apiHooks';  // Simple relative import
   import { ProfileCard } from './ProfileCard';
   ```

## 🔧 How to Restart Services

After restructuring, restart with proper ports:

```bash
# Kill all node processes
taskkill /F /IM node.exe

# Start backend on port 3001
cd apps/backend
npm run build
PORT=3001 node dist/main.js

# In another terminal, start frontend
cd apps/frontend
npm run dev
```

Frontend will be at: http://localhost:5173
Backend will be at: http://localhost:3001

## 📊 Progress Summary

**Backend**: ✅ 100% Complete (All 6 modules converted to NestJS)

**Frontend Architecture**:
- ✅ Configuration updated (no more Supabase direct access)
- ✅ Directory structure created (api-client, shared, first feature)
- ✅ Complete example created (profiles module)
- ⚠️  **~15% Complete** - Still need to migrate remaining 5 features

**Estimated Remaining Work**:
- Create 5 more API client files (~2 hours)
- Create 5 more feature directories with apiHooks.ts (~3 hours)
- Move all existing components/pages to feature directories (~4 hours)
- Update all imports (~2 hours)
- Test each migrated feature (~3 hours)
- **Total: ~14 hours of work**

## 🎓 For Next Developer

The foundation is in place! Use the `profiles` module as your template:

1. Copy `api-client/profiles.api-client.ts` → adapt for your feature
2. Copy `profiles/apiHooks.ts` → adapt for your feature
3. Move related components/pages into the feature directory
4. Update imports
5. Test
6. Move on to next feature

The pattern is established - just rinse and repeat for each feature!
