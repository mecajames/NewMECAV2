# Agent Handoff Documentation
## Incremental Migration Guide for AI Agents

**Last Updated**: 2025-10-26 (Evening - Supabase Migration Session Complete)
**Current Phase**: Supabase Removal from Frontend - Auth Infrastructure Complete
**Migration Approach**: Hybrid (Centralize Supabase in Backend, Remove from Frontend)
**Current Task**: Complete remaining 24 file migrations (data queries)
**Previous Task**: ✅ Auth infrastructure migrated successfully

---

## ⚠️ CRITICAL: READ THIS FIRST

**MANDATORY RULE: SEE CRITICAL_RULES.md**

Before ANY conversation compaction or context clearing:
1. Update this AGENT_HANDOFF.md with current work status
2. Document all decisions, blockers, and in-progress work
3. Verify handoff is complete and comprehensive

**Breaking this rule results in lost context and wasted time.**

---

## 🎯 LATEST SESSION UPDATE (2025-10-26)

**CRITICAL MILESTONE ACHIEVED**: ✅ **Authentication Infrastructure is Supabase-Free!**

### What Was Completed This Session:

#### Backend (NEW):
- ✅ Created `auth/auth.service.ts` - Wraps all Supabase auth operations
- ✅ Created `auth/auth.controller.ts` - 7 REST API endpoints for authentication
- ✅ Updated `auth/auth.module.ts` - Registered new auth infrastructure
- ✅ Backend now provides API for: signin, signup, signout, session, password operations

#### Frontend (MAJOR REWRITE):
- ✅ Created `api-client/auth.api-client.ts` - Complete auth API client
- ✅ **REWROTE** `contexts/AuthContext.tsx` - NO MORE SUPABASE! Uses API only
- ✅ **REWROTE** `hooks/usePermissions.ts` - NO MORE SUPABASE! Uses API only
- ✅ Frontend authentication now 100% through backend API

#### Documentation (NEW):
- ✅ `SUPABASE_MIGRATION_PROGRESS.md` - 520+ lines, detailed progress
- ✅ `REMAINING_SUPABASE_MIGRATION_PLAN.md` - 550+ lines, step-by-step guide
- ✅ `SESSION_SUMMARY_2025-10-26.md` - Complete session report
- ✅ Updated `PROJECT_STATUS.md` - Overall progress now 62% (was 55%)

### What's Remaining:

**24 files with Supabase imports** (8-12 hours of work):
- 2 shared components (Navbar, SeasonSelector)
- 4 admin pages
- 9 public pages
- 5 admin components
- 3 dashboard components
- Cleanup: Delete `lib/supabase.ts` and `test-db.ts`

### Critical Files for Reference:
1. **START HERE**: `REMAINING_SUPABASE_MIGRATION_PLAN.md` - Complete guide
2. **SESSION DETAILS**: `SESSION_SUMMARY_2025-10-26.md` - What we did
3. **PROGRESS TRACKING**: `SUPABASE_MIGRATION_PROGRESS.md` - Statistics & status

### Next Steps:
1. **FIRST**: Test auth endpoints (signin/signup/signout)
2. **THEN**: Migrate remaining 24 files using patterns in migration plan
3. **FINALLY**: Delete lib/supabase.ts and test end-to-end

### Known Issues:
- ⚠️ Backend auth endpoints NOT YET TESTED (port conflicts during session)
- ⚠️ Multiple node processes may be running on port 3001
- ⚠️ Need clean restart to test

### Decisions Made:
- ✅ Using Hybrid Approach (Option C): Supabase in backend only
- ✅ Strategic checkpoint: Stopped after auth infrastructure to allow testing
- ✅ Pattern established for remaining files

---

## 🎯 Mission Overview

Migrate this project from its current architecture to align with **ONBOARDING.md** rules:
- **Backend**: Convert Express.js → NestJS with decorators and DI
- **Frontend**: Remove all Supabase usage, add API client layer, restructure to feature-based
- **Constraint**: **ZERO DOWNTIME** - System must remain functional throughout migration

---

## 📊 Progress Tracking (UPDATED 2025-10-26)

**ALWAYS check and update these files:**
1. **PROJECT_STATUS.md** - ⭐ UPDATED! Overall project status (62% complete)
2. **SUPABASE_MIGRATION_PROGRESS.md** - ⭐ NEW! Detailed Supabase migration tracking
3. **REMAINING_SUPABASE_MIGRATION_PLAN.md** - ⭐ NEW! Step-by-step guide for next 24 files
4. **SESSION_SUMMARY_2025-10-26.md** - ⭐ NEW! Today's session complete report
5. **MIGRATION_STATUS.md** - Original backend migration status (Phase 1 mostly done)
6. **RESTRUCTURING_PLAN.md** - Master plan with all phases
7. **This file (AGENT_HANDOFF.md)** - Instructions for agents

**Before starting work:**
```bash
# 1. Read the current status
cat MIGRATION_STATUS.md

# 2. Find your module assignment
# Look for "STATUS: 🔴 TODO" or "STATUS: 🟡 IN PROGRESS"

# 3. Update status to IN PROGRESS
# Edit MIGRATION_STATUS.md and mark your module

# 4. Start work following the patterns below
```

**After completing work:**
```bash
# 1. Update MIGRATION_STATUS.md - mark as DONE
# 2. Test your module thoroughly
# 3. Document any issues in MIGRATION_STATUS.md
# 4. Commit your changes with clear message
```

---

## 🏗️ Phase 1: Backend NestJS Migration (CURRENT PHASE)

### Zero-Downtime Strategy

We're using a **hybrid approach**:
1. Install NestJS alongside existing Express code
2. Convert one module at a time
3. Test each module independently
4. Keep old code until all modules are converted
5. Switch main entry point last

### Module Migration Priority Order

**Convert in this order** (dependencies matter):
1. ✅ **Database Module** (Foundation - needed by all) - COMPLETED
2. ⏳ **Profiles Module** (Simple, no dependencies) - IN PROGRESS
3. 🔴 **Events Module** (Moderate complexity)
4. 🔴 **Memberships Module** (Moderate complexity)
5. 🔴 **Event Registrations Module** (Depends on Events)
6. 🔴 **Rulebooks Module** (Simple)
7. 🔴 **Competition Results Module** (Depends on Events)
8. 🔴 **App Module** (Final integration)
9. 🔴 **Main.ts Switch** (Cutover to NestJS)

### Module Conversion Pattern (FOLLOW THIS EXACTLY)

For EACH module, follow these steps:

#### Step 1: Rename Files
```bash
cd apps/backend/src/[module-name]

# Rename with feature prefix
mv entity.ts [module-name].entity.ts
mv service.ts [module-name].service.ts
mv controller.ts [module-name].controller.ts

# Update index.ts exports
```

#### Step 2: Update Entity (if needed)
```typescript
// [module-name].entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: '[table_name]', schema: 'public' })
export class [ModuleName] {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // Add other properties with @Property() decorator
  @Property({ type: 'text' })
  name!: string;

  // ... rest of properties
}
```

#### Step 3: Convert Service to @Injectable
```typescript
// [module-name].service.ts
import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { [ModuleName] } from './[module-name].entity';

@Injectable()
export class [ModuleName]sService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<[ModuleName][]> {
    return this.em.find([ModuleName], {});
  }

  async findById(id: string): Promise<[ModuleName] | null> {
    return this.em.findOne([ModuleName], { id });
  }

  async create(data: Partial<[ModuleName]>): Promise<[ModuleName]> {
    const entity = this.em.create([ModuleName], data);
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async update(id: string, data: Partial<[ModuleName]>): Promise<[ModuleName] | null> {
    const entity = await this.em.findOne([ModuleName], { id });
    if (!entity) return null;
    this.em.assign(entity, data);
    await this.em.flush();
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    const entity = await this.em.findOne([ModuleName], { id });
    if (!entity) return false;
    await this.em.removeAndFlush(entity);
    return true;
  }
}
```

#### Step 4: Convert Controller to Use Decorators
```typescript
// [module-name].controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { [ModuleName]sService } from './[module-name].service';
import { [ModuleName] } from './[module-name].entity';

@Controller('api/[module-name]s')
export class [ModuleName]sController {
  constructor(private readonly [moduleName]sService: [ModuleName]sService) {}

  @Get()
  async list(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.[moduleName]sService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.[moduleName]sService.findById(id);
    if (!entity) {
      return { error: 'Not found' }; // Or throw NotFoundException
    }
    return entity;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: Partial<[ModuleName]>) {
    return this.[moduleName]sService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<[ModuleName]>,
  ) {
    return this.[moduleName]sService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.[moduleName]sService.delete(id);
  }
}
```

#### Step 5: Create Module File
```typescript
// [module-name].module.ts
import { Module } from '@nestjs/common';
import { [ModuleName]sController } from './[module-name].controller';
import { [ModuleName]sService } from './[module-name].service';

@Module({
  controllers: [[ModuleName]sController],
  providers: [[ModuleName]sService],
  exports: [[ModuleName]sService], // Export if other modules need it
})
export class [ModuleName]sModule {}
```

#### Step 6: Update index.ts
```typescript
// index.ts
export * from './[module-name].entity';
export * from './[module-name].service';
export * from './[module-name].controller';
export * from './[module-name].module';
```

#### Step 7: Add to AppModule
```typescript
// apps/backend/src/app.module.ts
import { [ModuleName]sModule } from './[module-name]/[module-name].module';

@Module({
  imports: [
    DatabaseModule,
    // ... other modules
    [ModuleName]sModule, // ← ADD HERE
  ],
})
export class AppModule {}
```

#### Step 8: Test Module
```bash
# Start NestJS server (once main.ts is set up)
npm run dev:backend

# Test endpoints
curl http://localhost:3001/api/[module-name]s
curl http://localhost:3001/api/[module-name]s/[some-id]

# Test POST
curl -X POST http://localhost:3001/api/[module-name]s \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# Test PUT
curl -X PUT http://localhost:3001/api/[module-name]s/[id] \
  -H "Content-Type: application/json" \
  -d '{"field": "new-value"}'

# Test DELETE
curl -X DELETE http://localhost:3001/api/[module-name]s/[id]
```

#### Step 9: Update MIGRATION_STATUS.md
```markdown
### [ModuleName] Module
- **Status**: ✅ DONE
- **Completed By**: [Your Agent Name/Date]
- **Routes Verified**:
  - ✅ GET /api/[module-name]s
  - ✅ GET /api/[module-name]s/:id
  - ✅ POST /api/[module-name]s
  - ✅ PUT /api/[module-name]s/:id
  - ✅ DELETE /api/[module-name]s/:id
- **Issues**: None / [List any issues]
- **Notes**: [Any important notes]
```

---

## 🔍 How to Pick Up Work

### If You're a New Agent Starting Work:

1. **Read Current Status**
```bash
cat MIGRATION_STATUS.md
```

2. **Find Next Module to Convert**
Look for the first module marked "🔴 TODO" in order:
- Profiles (priority 1)
- Events (priority 2)
- Memberships (priority 3)
- etc.

3. **Check Dependencies**
Make sure the Database Module is completed before starting any feature module.

4. **Update Status to IN PROGRESS**
Edit MIGRATION_STATUS.md:
```markdown
### [Module] Module
- **Status**: 🟡 IN PROGRESS
- **Started By**: Agent [timestamp]
```

5. **Follow the Module Conversion Pattern Above**
Step-by-step, from renaming files to testing.

6. **Test Thoroughly**
Don't mark as done until ALL endpoints work.

7. **Update Status to DONE**
Edit MIGRATION_STATUS.md:
```markdown
### [Module] Module
- **Status**: ✅ DONE
- **Completed**: [timestamp]
- **Routes Verified**: [list all routes tested]
```

8. **Commit Your Work**
```bash
git add .
git commit -m "feat(backend): Convert [module] to NestJS

- Add @Injectable decorator to service
- Add @Controller and route decorators
- Create [module].module.ts
- Add to AppModule imports
- All routes tested and working

Refs: MIGRATION_STATUS.md"
git push
```

---

## 🚨 Critical Rules for Agents

### DO:
✅ Follow the exact pattern for each module conversion
✅ Test EVERY endpoint before marking as done
✅ Update MIGRATION_STATUS.md before AND after your work
✅ Keep the system running (don't break existing functionality)
✅ Use TypeScript strictly (no `any` types unless necessary)
✅ Add proper error handling in controllers
✅ Document any deviations or issues

### DON'T:
❌ Skip steps in the conversion pattern
❌ Mark modules as done without testing
❌ Delete old Express code yet (keep until all modules converted)
❌ Make breaking changes to database schema
❌ Work on multiple modules simultaneously (one at a time!)
❌ Forget to update status files

---

## 🧪 Testing Guidelines

### For Each Module:

**1. Manual API Testing:**
```bash
# GET all
curl http://localhost:3001/api/[module]s

# GET one
curl http://localhost:3001/api/[module]s/[existing-id]

# POST create
curl -X POST http://localhost:3001/api/[module]s \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# PUT update
curl -X PUT http://localhost:3001/api/[module]s/[id] \
  -H "Content-Type: application/json" \
  -d '{"field": "updated"}'

# DELETE
curl -X DELETE http://localhost:3001/api/[module]s/[id]
```

**2. Verify Response Format:**
- Status codes correct? (200, 201, 204, 404, 500)
- JSON properly formatted?
- Error messages clear?

**3. Check Database:**
```bash
# Open Supabase Studio
open http://localhost:54323

# Verify data was actually created/updated/deleted
```

**4. Test from Frontend (if time permits):**
```bash
# Start frontend
npm run dev

# Navigate to pages that use this module
# Verify data loads correctly
```

---

## 📦 Module Reference Guide

### Existing Modules Structure

```
apps/backend/src/
├── profiles/              # User profiles
│   ├── entity.ts         → profiles.entity.ts
│   ├── service.ts        → profiles.service.ts
│   ├── controller.ts     → profiles.controller.ts
│   └── index.ts          → update exports
│
├── events/               # Events/Shows
│   ├── entity.ts         → events.entity.ts
│   ├── service.ts        → events.service.ts
│   ├── controller.ts     → events.controller.ts
│   └── index.ts          → update exports
│
├── memberships/          # Membership management
│   ├── entity.ts         → memberships.entity.ts
│   ├── service.ts        → memberships.service.ts
│   ├── controller.ts     → memberships.controller.ts
│   └── index.ts          → update exports
│
├── event-registrations/  # Event sign-ups
│   ├── entity.ts         → event-registrations.entity.ts
│   ├── service.ts        → event-registrations.service.ts
│   ├── controller.ts     → event-registrations.controller.ts
│   └── index.ts          → update exports
│
├── rulebooks/            # Rulebook management
│   ├── entity.ts         → rulebooks.entity.ts
│   ├── service.ts        → rulebooks.service.ts
│   ├── controller.ts     → rulebooks.controller.ts
│   └── index.ts          → update exports
│
└── competition-results/  # Competition results
    ├── entity.ts         → competition-results.entity.ts
    ├── service.ts        → competition-results.service.ts
    ├── controller.ts     → competition-results.controller.ts
    └── index.ts          → update exports
```

### API Endpoints (Keep These Same!)

**Profiles:**
- GET    /api/profiles
- GET    /api/profiles/:id
- POST   /api/profiles
- PUT    /api/profiles/:id
- DELETE /api/profiles/:id

**Events:**
- GET    /api/events
- GET    /api/events/:id
- POST   /api/events
- PUT    /api/events/:id
- DELETE /api/events/:id

**Memberships:**
- GET    /api/memberships
- GET    /api/memberships/:id
- POST   /api/memberships
- PUT    /api/memberships/:id
- DELETE /api/memberships/:id

**Event Registrations:**
- GET    /api/event-registrations
- GET    /api/event-registrations/:id
- POST   /api/event-registrations
- PUT    /api/event-registrations/:id
- DELETE /api/event-registrations/:id

**Rulebooks:**
- GET    /api/rulebooks
- GET    /api/rulebooks/:id
- POST   /api/rulebooks
- PUT    /api/rulebooks/:id
- DELETE /api/rulebooks/:id

**Competition Results:**
- GET    /api/competition-results
- GET    /api/competition-results/:id
- POST   /api/competition-results
- PUT    /api/competition-results/:id
- DELETE /api/competition-results/:id

---

## 🐛 Troubleshooting

### Common Issues:

**Issue: "Cannot find module '@nestjs/common'"**
```bash
cd apps/backend
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata
```

**Issue: "EntityManager not found"**
Check that DatabaseModule is marked as @Global() and exports 'EntityManager'

**Issue: "Routes not found (404)"**
- Verify @Controller decorator has correct path
- Check module is imported in AppModule
- Verify main.ts is using NestJS bootstrap
- Check if old Express server is still running instead

**Issue: "Service not injectable"**
- Add @Injectable() decorator to service class
- Add service to module's providers array
- Make sure DatabaseModule is imported

**Issue: "Cannot read property 'em' of undefined"**
- Verify EntityManager is injected in constructor
- Check @Inject('EntityManager') decorator is present
- Ensure DatabaseModule is @Global()

**Issue: "CORS error from frontend"**
```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});
```

---

## 📞 Getting Help

If you're stuck:

1. **Check these files:**
   - ONBOARDING.md (architecture rules)
   - RESTRUCTURING_PLAN.md (master plan)
   - MIGRATION_STATUS.md (current status)
   - This file (agent instructions)

2. **Look at completed modules:**
   - Once Profiles is done, use it as reference
   - Copy the pattern exactly

3. **Common commands:**
   ```bash
   # Check what's running
   npm run supabase:status

   # Restart backend
   npm run dev:backend

   # Check database
   open http://localhost:54323

   # Test API
   curl http://localhost:3001/api/profiles
   ```

4. **Document the issue:**
   - Add to MIGRATION_STATUS.md under "Issues"
   - Include error messages
   - Note what you tried

---

## 🎯 Success Criteria for Phase 1

Phase 1 is complete when:

✅ All 6 modules converted to NestJS pattern
✅ All endpoints tested and working
✅ NestJS main.ts running as primary entry point
✅ Old Express code can be safely removed
✅ Zero breaking changes to API contracts
✅ Frontend still works without modifications
✅ All routes use decorator-based routing
✅ All services use dependency injection
✅ MIGRATION_STATUS.md shows all modules as DONE

---

## 📋 Quick Checklist for Agents

Before starting a module:
- [ ] Read MIGRATION_STATUS.md
- [ ] Verify Database Module is complete
- [ ] Update status to IN PROGRESS
- [ ] Read this handoff document thoroughly

While working:
- [ ] Follow the exact conversion pattern
- [ ] Use proper TypeScript types
- [ ] Add error handling
- [ ] Keep existing API contracts
- [ ] Test each endpoint manually

After completing:
- [ ] All 5 CRUD endpoints work (GET, GET/:id, POST, PUT, DELETE)
- [ ] Status codes correct
- [ ] Database operations verified
- [ ] MIGRATION_STATUS.md updated to DONE
- [ ] Changes committed with clear message

---

## 🚀 Let's Go!

You have everything you need to continue the migration. Follow the pattern, test thoroughly, and update the status files. Good luck!

**Remember**: Slow and steady wins the race. One module at a time, fully tested before moving on.
