# Supabase Frontend Migration - Detailed Implementation Plan

**Date:** 2025-10-28
**Status:** CRITICAL - 17 files violating architecture
**Priority:** HIGH - Must fix before production

## Executive Summary

This document provides a complete, step-by-step plan to remove all direct Supabase usage from the frontend and migrate to the proper **API Client → Backend** pattern.

### Violations Found
- **7 files** with `supabase.from()` calls (CRITICAL)
- **10 files** importing `lib/supabase` (MEDIUM)
- **Total:** 17 files violating architecture rules

---

## Phase 1: Backend API Development

### 1.1 Media Files Module (NEW MODULE REQUIRED)

**Status:** Entity and Service created
**Remaining Work:** Controller, Module, Registration

**Files Created:**
- ✅ `apps/backend/src/media-files/media-file.entity.ts`
- ✅ `apps/backend/src/media-files/media-files.service.ts`

**TODO: Create Controller**

```typescript
// apps/backend/src/media-files/media-files.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MediaFilesService } from './media-files.service';
import { MediaType } from './media-file.entity';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('api/media-files')
@UseGuards(AuthGuard)
export class MediaFilesController {
  constructor(private readonly mediaFilesService: MediaFilesService) {}

  @Get()
  async listMediaFiles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('type') type?: MediaType,
    @Query('search') search?: string
  ) {
    return this.mediaFilesService.findAll(
      parseInt(page),
      parseInt(limit),
      type,
      search
    );
  }

  @Get(':id')
  async getMediaFile(@Param('id') id: string) {
    return this.mediaFilesService.findById(id);
  }

  @Get('by-tags')
  async getMediaFilesByTags(@Query('tags') tags: string) {
    const tagArray = tags.split(',').map(t => t.trim());
    return this.mediaFilesService.findByTags(tagArray);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions('upload_media')
  async createMediaFile(@Body() data: any) {
    return this.mediaFilesService.create(data);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('edit_media')
  async updateMediaFile(@Param('id') id: string, @Body() data: any) {
    return this.mediaFilesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('delete_media')
  async deleteMediaFile(@Param('id') id: string) {
    return this.mediaFilesService.delete(id);
  }
}
```

**TODO: Create Module**

```typescript
// apps/backend/src/media-files/media-files.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MediaFile } from './media-file.entity';
import { MediaFilesService } from './media-files.service';
import { MediaFilesController } from './media-files.controller';

@Module({
  imports: [MikroOrmModule.forFeature([MediaFile])],
  controllers: [MediaFilesController],
  providers: [MediaFilesService],
  exports: [MediaFilesService],
})
export class MediaFilesModule {}
```

**TODO: Register in AppModule**

```typescript
// apps/backend/src/app.module.ts
import { MediaFilesModule } from './media-files/media-files.module';

@Module({
  imports: [
    // ... existing imports
    MediaFilesModule,  // ADD THIS
  ],
})
```

---

### 1.2 Storage/Upload Endpoints

Multiple components need file upload capabilities. Create a dedicated **storage** module:

**TODO: Create Storage Module**

```typescript
// apps/backend/src/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL'),
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY'), // Use service role!
    );
  }

  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
    };
  }

  async deleteFile(bucket: string, path: string) {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { success: true };
  }

  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}
```

```typescript
// apps/backend/src/storage/storage.controller.ts
import { Controller, Post, Delete, Body, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('api/storage')
@UseGuards(AuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('bucket') bucket: string,
    @Body('path') path: string
  ) {
    return this.storageService.uploadFile(
      bucket,
      path,
      file.buffer,
      file.mimetype
    );
  }

  @Delete('delete')
  async deleteFile(
    @Body('bucket') bucket: string,
    @Body('path') path: string
  ) {
    return this.storageService.deleteFile(bucket, path);
  }
}
```

---

### 1.3 Statistics/Dashboard Endpoints

**AdminDashboard** needs aggregate statistics. Add to existing controllers:

**TODO: Add to ProfilesController**

```typescript
// apps/backend/src/profiles/profiles.controller.ts
@Get('stats/count')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions('view_users')
async getUserCount(
  @Query('membership_status') membershipStatus?: string
) {
  return this.profilesService.getCount(membershipStatus);
}
```

**TODO: Add to ProfilesService**

```typescript
// apps/backend/src/profiles/profiles.service.ts
async getCount(membershipStatus?: string) {
  const where: any = {};
  if (membershipStatus) {
    where.membershipStatus = membershipStatus;
  }
  return this.em.count(Profile, where);
}
```

**TODO: Add to EventsController**

```typescript
// apps/backend/src/events/events.controller.ts
@Get('stats/count')
async getEventCount() {
  return this.eventsService.getCount();
}
```

**TODO: Add to EventRegistrationsController**

```typescript
// apps/backend/src/event-registrations/event-registrations.controller.ts
@Get('stats/count')
async getRegistrationCount() {
  return this.registrationsService.getCount();
}
```

---

### 1.4 Leaderboard Endpoint

**LeaderboardPage** needs aggregated competition results.

**TODO: Add to CompetitionResultsController**

```typescript
// apps/backend/src/competition-results/competition-results.controller.ts
@Get('leaderboard')
async getLeaderboard(
  @Query('season_id') seasonId?: string,
  @Query('limit') limit: string = '10'
) {
  return this.resultsService.getLeaderboard(seasonId, parseInt(limit));
}
```

**TODO: Add to CompetitionResultsService**

```typescript
// apps/backend/src/competition-results/competition-results.service.ts
async getLeaderboard(seasonId?: string, limit: number = 10) {
  const where: any = {};
  if (seasonId) {
    where.season = seasonId;
  }

  const results = await this.em.find(CompetitionResult, where);

  // Aggregate by competitor
  const aggregated: any = {};

  results.forEach((result) => {
    const key = result.competitorId || result.competitorName;
    if (!aggregated[key]) {
      aggregated[key] = {
        competitor_id: result.competitorId || '',
        competitor_name: result.competitorName,
        total_points: 0,
        events_participated: 0,
        first_place: 0,
        second_place: 0,
        third_place: 0,
      };
    }

    aggregated[key].total_points += result.pointsEarned;
    aggregated[key].events_participated += 1;

    if (result.placement === 1) aggregated[key].first_place += 1;
    if (result.placement === 2) aggregated[key].second_place += 1;
    if (result.placement === 3) aggregated[key].third_place += 1;
  });

  // Convert to array and sort by total points
  const leaderboard = Object.values(aggregated)
    .sort((a: any, b: any) => b.total_points - a.total_points)
    .slice(0, limit);

  return leaderboard;
}
```

---

### 1.5 Additional Event Endpoints

**EventManagement** needs to:
- Fetch event directors
- Upload flyers and headers

**TODO: Add to ProfilesController**

```typescript
// apps/backend/src/profiles/profiles.controller.ts
@Get('by-role/:role')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions('view_users')
async getProfilesByRole(@Param('role') role: string) {
  return this.profilesService.findByRole(role);
}
```

**TODO: Add to ProfilesService**

```typescript
// apps/backend/src/profiles/profiles.service.ts
async findByRole(role: string) {
  return this.em.find(Profile, { role }, {
    orderBy: { firstName: 'ASC', lastName: 'ASC' }
  });
}
```

---

## Phase 2: Frontend API Clients

### 2.1 Create Media Files API Client

**TODO: Create `apps/frontend/src/api-client/media-files.api-client.ts`**

```typescript
import { API_BASE_URL } from './api-helpers';

export const mediaFilesApi = {
  getMediaFiles: async (page: number = 1, limit: number = 50, type?: string, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE_URL}/api/media-files?${params}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch media files');
    return response.json();
  },

  getMediaFile: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/media-files/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch media file');
    return response.json();
  },

  createMediaFile: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/api/media-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create media file');
    return response.json();
  },

  updateMediaFile: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/api/media-files/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update media file');
    return response.json();
  },

  deleteMediaFile: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/media-files/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete media file');
    return response.json();
  },
};
```

### 2.2 Create Storage API Client

**TODO: Create `apps/frontend/src/api-client/storage.api-client.ts`**

```typescript
import { API_BASE_URL } from './api-helpers';

export const storageApi = {
  uploadFile: async (file: File, bucket: string, path: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', path);

    const response = await fetch(`${API_BASE_URL}/api/storage/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload file');
    return response.json();
  },

  deleteFile: async (bucket: string, path: string) => {
    const response = await fetch(`${API_BASE_URL}/api/storage/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bucket, path }),
    });
    if (!response.ok) throw new Error('Failed to delete file');
    return response.json();
  },
};
```

### 2.3 Update Existing API Clients

**TODO: Update `apps/frontend/src/api-client/profiles.api-client.ts`**

```typescript
// Add these methods:
getUserCount: async (membershipStatus?: string) => {
  const params = new URLSearchParams();
  if (membershipStatus) params.append('membership_status', membershipStatus);

  const response = await fetch(`${API_BASE_URL}/api/profiles/stats/count?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to get user count');
  return response.json();
},

getProfilesByRole: async (role: string) => {
  const response = await fetch(`${API_BASE_URL}/api/profiles/by-role/${role}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to get profiles by role');
  return response.json();
},
```

**TODO: Update `apps/frontend/src/api-client/events.api-client.ts`**

```typescript
// Add these methods:
getEventCount: async () => {
  const response = await fetch(`${API_BASE_URL}/api/events/stats/count`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to get event count');
  return response.json();
},
```

**TODO: Update `apps/frontend/src/api-client/event-registrations.api-client.ts`**

```typescript
// Add these methods:
getRegistrationCount: async () => {
  const response = await fetch(`${API_BASE_URL}/api/event-registrations/stats/count`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to get registration count');
  return response.json();
},
```

**TODO: Update `apps/frontend/src/api-client/competition-results.api-client.ts`**

```typescript
// Add these methods:
getLeaderboard: async (seasonId?: string, limit: number = 10) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (seasonId) params.append('season_id', seasonId);

  const response = await fetch(`${API_BASE_URL}/api/competition-results/leaderboard?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to get leaderboard');
  return response.json();
},
```

---

## Phase 3: Component Migration

### File 1: AdminDashboard.tsx

**Supabase Operations:**
```typescript
// Lines 30-36: Direct Supabase queries for stats
const [users, events, registrations, members] = await Promise.all([
  supabase.from('profiles').select('id', { count: 'exact', head: true }),
  supabase.from('events').select('id', { count: 'exact', head: true }),
  supabase.from('event_registrations').select('id', { count: 'exact', head: true }),
  supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('membership_status', 'active'),
]);
```

**Migration:**
1. Remove `import { supabase } from '../../lib/supabase';`
2. Add API client imports
3. Replace `fetchStats()`:

```typescript
import { profilesApi } from '../../api-client/profiles.api-client';
import { eventsApi } from '../../api-client/events.api-client';
import { eventRegistrationsApi } from '../../api-client/event-registrations.api-client';

const fetchStats = async () => {
  try {
    const [users, events, registrations, members] = await Promise.all([
      profilesApi.getUserCount(),
      eventsApi.getEventCount(),
      eventRegistrationsApi.getRegistrationCount(),
      profilesApi.getUserCount('active'),
    ]);

    setStats({
      totalUsers: users.count || 0,
      totalEvents: events.count || 0,
      totalRegistrations: registrations.count || 0,
      totalMembers: members.count || 0,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  } finally {
    setLoading(false);
  }
};
```

---

### File 2: MediaLibrary.tsx

**Supabase Operations:**
- Lines 41-44: Fetch media files
- Lines 95-103: Storage upload
- Lines 131: Database insert
- Lines 163: Database insert (external)
- Lines 182-187: Storage and database delete

**Migration:**
1. Remove `import { supabase, MediaFile, MediaType } from '../../lib/supabase';`
2. Add API imports
3. Replace all operations:

```typescript
import { mediaFilesApi } from '../../api-client/media-files.api-client';
import { storageApi } from '../../api-client/storage.api-client';

// Replace fetchMediaFiles
const fetchMediaFiles = async () => {
  try {
    const data = await mediaFilesApi.getMediaFiles(1, 1000); // Get all
    setMediaFiles(data.data || []);
  } catch (error) {
    console.error('Failed to fetch media files:', error);
  } finally {
    setLoading(false);
  }
};

// Replace uploadFile
const uploadFile = async () => {
  if (!user || !uploadData.file) return;
  setUploading(true);

  try {
    const fileName = `${Date.now()}-${uploadData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `media/${fileName}`;

    // Upload to storage
    const { publicUrl } = await storageApi.uploadFile(uploadData.file, 'media', filePath);

    // Get dimensions if image
    let dimensions = undefined;
    if (uploadData.file.type.startsWith('image/')) {
      const img = new Image();
      img.src = URL.createObjectURL(uploadData.file);
      await new Promise((resolve) => {
        img.onload = () => {
          dimensions = `${img.width}x${img.height}`;
          resolve(null);
        };
      });
    }

    // Save to database
    await mediaFilesApi.createMediaFile({
      title: uploadData.title,
      description: uploadData.description || null,
      file_url: publicUrl,
      file_type: getFileType(uploadData.file.type),
      file_size: uploadData.file.size,
      mime_type: uploadData.file.type,
      dimensions,
      is_external: false,
      tags: uploadData.tags ? uploadData.tags.split(',').map((t) => t.trim()) : null,
      created_by: user.id,
    });

    setShowUploadModal(false);
    setUploadData({ title: '', description: '', tags: '', file: null });
    fetchMediaFiles();
  } catch (error: any) {
    alert('Error uploading file: ' + error.message);
  } finally {
    setUploading(false);
  }
};

// Similar pattern for addExternalMedia, deleteMedia
```

---

### File 3: EventManagement.tsx

**Key Changes:**
- Use `profilesApi.getProfilesByRole(['event_director', 'admin'])` for fetching directors
- Use `storageApi.uploadFile()` for flyer/header uploads
- Use `eventsApi` for CRUD operations
- Add `mediaFilesApi.createMediaFile()` after storage uploads

---

### File 4: LeaderboardPage.tsx

**Migration:**
```typescript
import { competitionResultsApi } from '../api-client/competition-results.api-client';

const fetchLeaderboard = async () => {
  try {
    const data = await competitionResultsApi.getLeaderboard(selectedSeasonId, 10);
    setLeaderboard(data);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  } finally {
    setLoading(false);
  }
};
```

---

### Files 5-7: RulebookManagement, ResultsEntry, MemberDetailPage

Follow similar patterns:
- Replace `supabase.from()` with appropriate API client calls
- Replace `supabase.storage` with `storageApi`
- Replace `supabase.auth.getUser()` with `useAuth()` hook

---

## Phase 4: Cleanup & Verification

### 4.1 Delete Supabase Client

**TODO:**
```bash
rm apps/frontend/src/lib/supabase.ts
```

### 4.2 Verification Commands

**Run these to ensure migration is complete:**

```bash
# Should return 0 results
grep -r "supabase.from" apps/frontend/src
grep -r "lib/supabase" apps/frontend/src
grep -r "from '@supabase/supabase-js'" apps/frontend/src

# Should only find backend usage
grep -r "@supabase/supabase-js" apps/backend/src
```

### 4.3 Update Package.json

**Remove from frontend dependencies:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "REMOVE THIS"
  }
}
```

---

## Implementation Order

1. ✅ **Backend Module - Media Files** (entity, service created)
2. **Backend Module - Storage** (upload/delete endpoints)
3. **Backend Endpoints - Statistics** (counts for dashboard)
4. **Backend Endpoints - Leaderboard** (aggregated results)
5. **Backend Endpoints - Extended APIs** (by-role queries, etc.)
6. **Frontend API Clients** (media-files, storage, updates)
7. **Component Migration** (7 critical files)
8. **Additional Components** (10 files with imports)
9. **Verification** (grep checks)
10. **Cleanup** (delete lib/supabase.ts)

---

## Estimated Effort

- **Backend Development:** 4-6 hours
- **Frontend API Clients:** 2-3 hours
- **Component Migration:** 8-10 hours
- **Testing & Verification:** 2-3 hours
- **Total:** 16-22 hours

---

## Risk Mitigation

1. **Create backup before starting:**
   ```bash
   npm run backup
   ```

2. **Test each module independently:**
   - Test backend endpoints with Postman/curl
   - Test API clients in browser console
   - Test components one by one

3. **Use feature flags if needed:**
   - Keep old code commented during migration
   - Remove after successful testing

4. **Monitor for errors:**
   - Check browser console
   - Check backend logs
   - Test all user flows

---

## Success Criteria

- ✅ All 17 files no longer import `lib/supabase`
- ✅ No `supabase.from()` calls in frontend
- ✅ All features work through backend API
- ✅ Storage operations work through backend
- ✅ `lib/supabase.ts` deleted
- ✅ All tests pass
- ✅ No console errors in production

---

## Notes

- Keep MemberDetailPage TODOs for password reset (needs additional admin auth endpoints)
- Consider rate limiting for statistics endpoints
- Add caching for frequently accessed data (leaderboard, stats)
- Document all new API endpoints in API docs

---

**Next Steps:** Start with Phase 1 backend development, then move systematically through each phase.
