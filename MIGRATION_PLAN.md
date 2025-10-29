# Architecture Migration Plan: Zero-Downtime Refactoring

## Executive Summary

This document outlines the strategy to migrate the MECA application from direct Supabase client usage to the proper 3-tier architecture (Frontend → Backend API → Database) **without breaking existing functionality**.

## Current State (Violations)

### Critical Issues:
1. ❌ Frontend directly uses Supabase client (`lib/supabase.ts`)
2. ❌ No backend NestJS API layer exists
3. ❌ Frontend organized by file type (pages/, components/, hooks/) instead of features
4. ❌ No API client abstraction layer

### Files Violating Architecture Rules:
- All files in `apps/frontend/src/pages/`
- All files in `apps/frontend/src/components/`
- All files in `apps/frontend/src/hooks/`
- `apps/frontend/src/lib/supabase.ts`
- `apps/frontend/src/contexts/AuthContext.tsx`

## Target State (Compliant)

### Architecture:
```
Browser → React Component → Hook (apiHooks.ts) → API Client (.api-client.ts) →
Backend NestJS → Service → Entity → PostgreSQL
```

### Frontend Structure:
```
apps/frontend/src/
├── api-client/              # HTTP request functions
│   ├── auth.api-client.ts
│   ├── events.api-client.ts
│   ├── profiles.api-client.ts
│   ├── rulebooks.api-client.ts
│   └── media.api-client.ts
│
├── auth/                    # Auth feature module
│   ├── apiHooks.ts
│   ├── LoginPage.tsx
│   ├── SignUpPage.tsx
│   └── AuthContext.tsx
│
├── events/                  # Events feature module
│   ├── apiHooks.ts
│   ├── EventsPage.tsx
│   ├── EventDetailPage.tsx
│   ├── EventCard.tsx
│   └── types.ts
│
├── profiles/                # Profiles/Members feature module
│   ├── apiHooks.ts
│   ├── MembersPage.tsx
│   ├── MemberDetailPage.tsx
│   └── types.ts
│
└── shared/                  # Only truly shared components
    ├── Navbar.tsx
    ├── Footer.tsx
    └── LoadingSpinner.tsx
```

### Backend Structure:
```
apps/backend/src/
├── main.ts                  # NestJS bootstrap
├── app.module.ts            # Root module
│
├── db/
│   ├── database.module.ts   # Global MikroORM config
│   └── mikro-orm.config.ts
│
├── auth/
│   ├── auth.entity.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
│
├── events/
│   ├── events.entity.ts
│   ├── events.service.ts
│   ├── events.controller.ts
│   └── events.module.ts
│
├── profiles/
│   ├── profiles.entity.ts
│   ├── profiles.service.ts
│   ├── profiles.controller.ts
│   └── profiles.module.ts
│
└── [other features...]
```

## Migration Strategy: Parallel Implementation

### Core Principle: **Coexistence**

We'll run BOTH old and new code simultaneously:
- Old code continues to work (direct Supabase calls)
- New code is built alongside (API-based)
- Features are migrated one at a time
- Old code is removed only after new code is proven stable

### Phase-by-Phase Migration

---

## Phase 1: Foundation (Week 1)

### Goal: Set up infrastructure without breaking anything

#### Step 1.1: Verify Backend is Running
```bash
# Check if backend exists and runs
cd apps/backend
npm run dev

# Expected: Backend starts on http://localhost:3001
# If not, we need to create it first
```

#### Step 1.2: Create API Client Infrastructure (Frontend)
- Create `apps/frontend/src/api-client/` directory
- Create base API client utility:

```typescript
// apps/frontend/src/api-client/base.api-client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}

export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}

// Similar for PUT, DELETE, PATCH
```

#### Step 1.3: Create Feature Directories (Empty)
```bash
cd apps/frontend/src
mkdir -p events auth profiles rulebooks admin memberships media shared
```

**Status**: Old code still working, new structure ready

---

## Phase 2: Reference Implementation - Events (Week 1-2)

### Goal: Migrate ONE feature completely as proof-of-concept

#### Step 2.1: Create Backend Events Module

**File: `apps/backend/src/events/events.entity.ts`**
```typescript
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'events', schema: 'public' })
export class Event {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'timestamp' })
  event_date!: Date;

  @Property({ type: 'text' })
  venue_name!: string;

  @Property({ type: 'text' })
  venue_address!: string;

  @Property({ type: 'text', nullable: true })
  flyer_url?: string;

  @Property({ type: 'text', nullable: true })
  header_image_url?: string;

  @Property({ type: 'decimal', nullable: true })
  registration_fee?: number;

  @Property({ type: 'text' })
  status!: string; // 'upcoming' | 'ongoing' | 'completed'

  @Property({ type: 'uuid', nullable: true })
  event_director_id?: string;

  @Property({ type: 'decimal', nullable: true })
  latitude?: number;

  @Property({ type: 'decimal', nullable: true })
  longitude?: number;

  @Property({ type: 'timestamp', defaultRaw: 'now()' })
  created_at: Date = new Date();

  @Property({ type: 'timestamp', defaultRaw: 'now()', onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
```

**File: `apps/backend/src/events/events.service.ts`**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Event } from './events.entity';

@Injectable()
export class EventsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Event[]> {
    return this.em.find(Event, {}, {
      orderBy: { event_date: 'DESC' }
    });
  }

  async findById(id: string): Promise<Event | null> {
    return this.em.findOne(Event, { id });
  }

  async findUpcoming(): Promise<Event[]> {
    return this.em.find(Event, {
      status: 'upcoming'
    }, {
      orderBy: { event_date: 'ASC' }
    });
  }

  async create(data: Partial<Event>): Promise<Event> {
    const event = this.em.create(Event, data);
    await this.em.persistAndFlush(event);
    return event;
  }

  async update(id: string, data: Partial<Event>): Promise<Event | null> {
    const event = await this.em.findOne(Event, { id });
    if (!event) return null;
    this.em.assign(event, data);
    await this.em.flush();
    return event;
  }

  async delete(id: string): Promise<boolean> {
    const event = await this.em.findOne(Event, { id });
    if (!event) return false;
    await this.em.removeAndFlush(event);
    return true;
  }
}
```

**File: `apps/backend/src/events/events.controller.ts`**
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './events.entity';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async listEvents() {
    return this.eventsService.findAll();
  }

  @Get('upcoming')
  async upcomingEvents() {
    return this.eventsService.findUpcoming();
  }

  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() data: Partial<Event>) {
    return this.eventsService.create(data);
  }

  @Put(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() data: Partial<Event>,
  ) {
    return this.eventsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id') id: string) {
    await this.eventsService.delete(id);
  }
}
```

**File: `apps/backend/src/events/events.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
```

**Update: `apps/backend/src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { EventsModule } from './events/events.module';
// ... other imports

@Module({
  imports: [
    DatabaseModule,
    EventsModule,  // Add this
    // ... other modules
  ],
})
export class AppModule {}
```

#### Step 2.2: Create Frontend Events API Client

**File: `apps/frontend/src/api-client/events.api-client.ts`**
```typescript
import { apiGet, apiPost, apiPut, apiDelete } from './base.api-client';

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  venue_name: string;
  venue_address: string;
  flyer_url?: string;
  header_image_url?: string;
  registration_fee?: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  event_director_id?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export const eventsApi = {
  getEvents: () => apiGet<Event[]>('/api/events'),

  getEvent: (id: string) => apiGet<Event>(`/api/events/${id}`),

  getUpcomingEvents: () => apiGet<Event[]>('/api/events/upcoming'),

  createEvent: (data: Partial<Event>) => apiPost<Event>('/api/events', data),

  updateEvent: (id: string, data: Partial<Event>) =>
    apiPut<Event>(`/api/events/${id}`, data),

  deleteEvent: (id: string) => apiDelete(`/api/events/${id}`),
};
```

#### Step 2.3: Create Events Feature Module (Frontend)

**File: `apps/frontend/src/events/apiHooks.ts`**
```typescript
import { useState, useEffect } from 'react';
import { eventsApi, Event } from '../api-client/events.api-client';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi.getEvents()
      .then(setEvents)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}

export function useEvent(id: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    eventsApi.getEvent(id)
      .then(setEvent)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { event, loading, error };
}

export function useUpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi.getUpcomingEvents()
      .then(setEvents)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}
```

#### Step 2.4: Move and Refactor Event Pages

**Move files:**
```bash
# Copy (not move yet) to preserve old code
cp apps/frontend/src/pages/EventsPage.tsx apps/frontend/src/events/
cp apps/frontend/src/pages/EventDetailPage.tsx apps/frontend/src/events/
```

**Refactor: `apps/frontend/src/events/EventsPage.tsx`**
- Replace all `supabase.from('events')` calls with `useEvents()` hook
- Import from `./apiHooks` instead of `../lib/supabase`

**Refactor: `apps/frontend/src/events/EventDetailPage.tsx`**
- Replace Supabase calls with `useEvent(eventId)` hook

#### Step 2.5: Test New Events Feature

1. Keep old pages working in `pages/` directory
2. Create new routes pointing to new feature directory
3. Test both old and new routes work
4. Verify data flows correctly through API

**Test Checklist:**
- [ ] Can view events list
- [ ] Can view event details
- [ ] Can create new event (if applicable)
- [ ] Can update event (if applicable)
- [ ] Can delete event (if applicable)
- [ ] Event registration works
- [ ] Images upload correctly

**Status**: Events feature now has BOTH old (Supabase) and new (API) implementations working

---

## Phase 3: Authentication Migration (Week 2)

Similar pattern to Events:
1. Create backend `auth/` module
2. Create `api-client/auth.api-client.ts`
3. Create `auth/` feature directory
4. Move and refactor auth pages
5. Update AuthContext to use API instead of Supabase

**Key Challenge**: Auth is used everywhere, so we need to be extra careful

---

## Phase 4: Profiles/Members Migration (Week 3)

1. Create backend `profiles/` module
2. Create `api-client/profiles.api-client.ts`
3. Create `profiles/` feature directory
4. Move admin member management pages
5. Test member CRUD operations

---

## Phase 5: Remaining Features (Week 3-4)

Migrate in this order:
1. Rulebooks
2. Memberships
3. Competition Results
4. Media Library
5. Admin features
6. Site Settings

---

## Phase 6: Cleanup (Week 4)

### Step 6.1: Remove Old Code
Once ALL features are migrated and tested:
1. Delete `apps/frontend/src/pages/` directory
2. Delete `apps/frontend/src/components/` directory (move shared ones to `shared/`)
3. Delete `apps/frontend/src/hooks/` directory
4. Delete `apps/frontend/src/lib/supabase.ts`

### Step 6.2: Update Imports
1. Search for any remaining imports of old paths
2. Update to new feature-based paths

### Step 6.3: Update Routes
1. Update all route definitions to point to new feature directories

---

## Testing Strategy

### For Each Feature Migration:

1. **Unit Tests**: Test API endpoints work
   ```bash
   curl http://localhost:3001/api/events
   ```

2. **Integration Tests**: Test frontend → backend flow
   - Open DevTools Network tab
   - Verify requests go to `localhost:3001/api/*`
   - Verify responses are correct

3. **Manual Testing**: Test all user workflows
   - Create, read, update, delete
   - Edge cases (missing data, errors, etc.)

4. **Parallel Testing**: Test both old and new implementations
   - Old route still works
   - New route works identically

---

## Risk Mitigation

### Rollback Plan:
- Keep old code in place until new code is 100% verified
- Use feature flags to toggle between old/new implementations
- Git branches for each feature migration

### Communication:
- Document which features are migrated
- Update team on progress weekly
- Alert users if any downtime is needed (should be zero)

---

## Success Criteria

### Per Feature:
- [ ] Backend NestJS module created (entity, service, controller, module)
- [ ] Frontend API client created
- [ ] Frontend hooks created
- [ ] Pages refactored to use hooks
- [ ] All functionality works identically to old implementation
- [ ] No direct Supabase calls in feature code

### Overall:
- [ ] Zero application downtime during migration
- [ ] All features working through API
- [ ] No `lib/supabase.ts` imports in frontend
- [ ] Frontend organized by feature
- [ ] Backend follows NestJS patterns
- [ ] Documentation updated

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1 | Foundation + Events | Infrastructure set up, Events feature migrated |
| 2 | Auth + Profiles | Auth and member management migrated |
| 3 | Remaining Features | All features migrated |
| 4 | Cleanup + Testing | Old code removed, full system tested |

**Total Estimated Time**: 4 weeks with careful testing

---

## Next Immediate Steps

1. Verify backend exists and runs
2. Create `api-client/base.api-client.ts`
3. Create backend `events/` module
4. Create frontend `events.api-client.ts`
5. Create `events/apiHooks.ts`
6. Test Events API end-to-end

---

## Notes

- This plan prioritizes **safety over speed**
- Old code stays until new code is proven
- Each feature is migrated independently
- No "big bang" deployment
- Continuous testing throughout

---

## Questions / Decisions Needed

1. Do we have a staging environment to test migrations?
2. Should we use feature flags for gradual rollout?
3. Who will test each migrated feature?
4. What's the go/no-go criteria for removing old code?

---

## References

- ONBOARDING.md (architecture rules)
- apps/backend/src/profiles/ (reference NestJS module)
- apps/frontend/src/api-client/ (once created, reference implementation)
