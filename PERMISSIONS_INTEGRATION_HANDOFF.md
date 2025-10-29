# Permissions & Membership Integration Handoff

**Date:** October 25, 2025
**Phase:** Database Complete ✅ | Backend & Frontend Integration Pending ⏭️
**Context:** Users → Memberships → Permissions system integration

---

## What Was Completed ✅

### Database Schema (100% Complete)

**Tables Created:**
- ✅ `permissions` (26 permissions)
- ✅ `role_permissions` (53 role-permission mappings)
- ✅ `user_permission_overrides` (user-specific exceptions)
- ✅ `membership_types` (6 membership tiers with JSONB features)
- ✅ `memberships` (linked to membership_types)
- ✅ `banner_images`, `manufacturer_ads`, `directory_listings`
- ✅ `audit_log`, `feature_flags`

**Migrations Applied:**
1. `20251025000000_create_permissions_system.sql` ✅
2. `20251025000001_extensible_membership_system.sql` ✅
3. `20251025000002_link_memberships_to_types.sql` ✅

**Sample Data:**
- Admin user (james@mecacaraudio.com) has Manufacturer Gold membership
- All 5 roles have appropriate permissions assigned
- Helper functions created for permission checking

**Documentation Created:**
- `DATABASE_SCHEMA_ANALYSIS.md` - Problem analysis
- `DB_MIGRATION_COMPLETE_SUMMARY.md` - Complete documentation
- `RESTORE_POINT_INSTRUCTIONS.md` - Restore procedures

---

## What Needs to Be Done ⏭️

### Phase 2A: Backend Integration (Priority 1)

#### Task 1: Update/Create Permissions Module

**Location:** `apps/backend/src/permissions/`

**Files to Update/Create:**

1. **permission.entity.ts**
```typescript
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'permissions', schema: 'public' })
export class Permission {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text' })
  category!: string;

  @Property({ type: 'timestamp' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamp', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
```

2. **permissions.service.ts**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Permission } from './permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: EntityRepository<Permission>,
  ) {}

  async findAll() {
    return this.permissionRepo.findAll({
      orderBy: { category: 'ASC', name: 'ASC' },
    });
  }

  async findByCategory(category: string) {
    return this.permissionRepo.find({ category });
  }

  async findOne(id: string) {
    return this.permissionRepo.findOne({ id });
  }

  async create(data: any) {
    const permission = this.permissionRepo.create(data);
    await this.permissionRepo.persistAndFlush(permission);
    return permission;
  }

  async update(id: string, data: any) {
    const permission = await this.permissionRepo.findOne({ id });
    if (!permission) throw new Error('Permission not found');
    this.permissionRepo.assign(permission, data);
    await this.permissionRepo.flush();
    return permission;
  }

  async delete(id: string) {
    const permission = await this.permissionRepo.findOne({ id });
    if (!permission) throw new Error('Permission not found');
    await this.permissionRepo.removeAndFlush(permission);
  }

  // Get permissions for a role
  async getPermissionsForRole(role: string) {
    // Use raw query since role_permissions is a join table
    const em = this.permissionRepo.getEntityManager();
    return em.execute(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ?
      ORDER BY p.category, p.name
    `, [role]);
  }
}
```

3. **permissions.controller.ts**
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    if (category) {
      return this.permissionsService.findByCategory(category);
    }
    return this.permissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Get('role/:role')
  getPermissionsForRole(@Param('role') role: string) {
    return this.permissionsService.getPermissionsForRole(role);
  }

  @Post()
  create(@Body() data: any) {
    return this.permissionsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.permissionsService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }
}
```

4. **permissions.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { Permission } from './permission.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Permission])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
```

5. **Register in AppModule** (`apps/backend/src/app.module.ts`):
```typescript
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    // ... existing imports
    PermissionsModule,
  ],
})
```

---

#### Task 2: Update/Create Membership Types Module

**Location:** `apps/backend/src/membership-types/`

**Files to Update/Create:**

1. **membership-type.entity.ts**
```typescript
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'membership_types', schema: 'public' })
export class MembershipType {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Property({ type: 'integer' })
  durationMonths!: number;

  @Property({ type: 'boolean' })
  isActive: boolean = true;

  @Property({ type: 'integer' })
  displayOrder: number = 0;

  @Property({ type: 'boolean' })
  canOwnTeam: boolean = false;

  @Property({ type: 'boolean' })
  canJoinTeams: boolean = true;

  @Property({ type: 'boolean' })
  listedInDirectory: boolean = false;

  @Property({ type: 'text', nullable: true })
  directoryType?: 'retail' | 'manufacturer';

  @Property({ type: 'boolean' })
  hasBannerCarousel: boolean = false;

  @Property({ type: 'integer' })
  bannerAdSlots: number = 0;

  @Property({ type: 'integer', nullable: true })
  maxTeamMembers?: number;

  @Property({ type: 'jsonb' })
  features: any = {};

  @Property({ type: 'jsonb' })
  metadata: any = {};

  @Property({ type: 'timestamp' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamp', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
```

2. **membership-types.service.ts** - Similar CRUD pattern as permissions service

3. **membership-types.controller.ts** - Similar CRUD endpoints

4. **membership-types.module.ts** - Register entity, controller, service

5. **Register in AppModule**

---

#### Task 3: Update Permission Guards

**Location:** `apps/backend/src/auth/permission.guard.ts`

**Update to use database function:**
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/postgresql';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private em: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Use database function to check permission
    for (const permission of requiredPermissions) {
      const result = await this.em.execute(
        `SELECT check_user_permission(?, ?) as has_permission`,
        [user.id, permission],
      );

      if (!result[0]?.has_permission) {
        return false;
      }
    }

    return true;
  }
}
```

---

### Phase 2B: Frontend Integration (Priority 2)

#### Task 1: Update usePermissions Hook

**Location:** `apps/frontend/src/hooks/usePermissions.ts`

**Changes needed:**
```typescript
// KEEP the admin wildcard logic for now (lines 34-38)
// ADD: Fetch from database via API instead of role_permissions query

const fetchPermissions = async () => {
  if (!user) return;

  try {
    // If user is admin, they have all permissions
    if (profile?.role === 'admin' || profile?.role === 'system_admin') {
      setPermissions(new Set(['*']));
      setLoading(false);
      return;
    }

    // Fetch permissions from backend API
    const response = await fetch(`http://localhost:3000/api/permissions/role/${profile?.role}`);
    const rolePermissions = await response.json();

    const permSet = new Set<string>();
    rolePermissions.forEach((p: any) => {
      permSet.add(p.name);
    });

    setPermissions(permSet);
    setLoading(false);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    setLoading(false);
  }
};
```

---

#### Task 2: Update Permissions Page

**Location:** `apps/frontend/src/pages/admin/ManagePermissionsPage.tsx`

**Changes needed:**

1. **Update API calls** from `permissionsApi` to use new backend:
```typescript
const loadPermissions = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/permissions');
    const data = await response.json();
    setPermissions(data);
  } catch (error) {
    console.error('Failed to load permissions:', error);
  } finally {
    setLoading(false);
  }
};
```

2. **Add role-permission display:**
```typescript
// Add new state
const [rolePermissions, setRolePermissions] = useState<any>({});

// Fetch role permissions
const loadRolePermissions = async () => {
  const roles = ['user', 'event_director', 'retailer', 'admin', 'system_admin'];
  const rolePermsData: any = {};

  for (const role of roles) {
    const response = await fetch(`http://localhost:3000/api/permissions/role/${role}`);
    const perms = await response.json();
    rolePermsData[role] = perms.map((p: any) => p.name);
  }

  setRolePermissions(rolePermsData);
};

// Show which roles have each permission
{perms.map((perm: any) => (
  <div key={perm.id} className="...">
    <div className="flex-1">
      <span className="...">{perm.name}</span>
      <p className="...">{perm.description}</p>
      <div className="mt-2 flex gap-2">
        {Object.entries(rolePermissions).map(([role, perms]: any) => (
          perms.includes(perm.name) && (
            <span key={role} className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
              {role}
            </span>
          )
        ))}
      </div>
    </div>
    {/* Edit/Delete buttons */}
  </div>
))}
```

---

#### Task 3: Update Memberships Page

**Location:** `apps/frontend/src/pages/admin/MembershipsPage.tsx` and `ManageMembershipTypesPage.tsx`

**Changes needed:**

1. **Update ManageMembershipTypesPage to load from database:**
```typescript
const loadMembershipTypes = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/membership-types');
    const data = await response.json();
    setMembershipTypes(data);
  } catch (error) {
    console.error('Failed to load membership types:', error);
  } finally {
    setLoading(false);
  }
};
```

2. **Show actual membership features:**
```typescript
{membershipTypes.map((type: any) => (
  <div key={type.id} className="bg-slate-700 p-6 rounded-lg">
    <h3 className="text-xl font-bold text-white">{type.name}</h3>
    <p className="text-gray-400">{type.description}</p>
    <div className="mt-4 space-y-2">
      <p className="text-white">Price: ${type.price}/{type.durationMonths} months</p>
      {type.canOwnTeam && <span className="badge">Can Own Team</span>}
      {type.listedInDirectory && <span className="badge">Directory Listing ({type.directoryType})</span>}
      {type.hasBannerCarousel && <span className="badge">{type.bannerAdSlots} Banner Slots</span>}
    </div>
  </div>
))}
```

3. **Add Member Subscriptions tab** to show actual user memberships:
```typescript
// Fetch actual memberships from database
const loadMemberships = async () => {
  const response = await fetch('http://localhost:3000/api/memberships');
  const data = await response.json();
  setMemberships(data);
};

// Display with membership type info
{memberships.map((membership: any) => (
  <div key={membership.id} className="...">
    <p>User: {membership.profile.email}</p>
    <p>Type: {membership.membershipType.name}</p>
    <p>Status: {membership.status}</p>
    <p>Expires: {membership.expiryDate}</p>
  </div>
))}
```

---

#### Task 4: Update User Profile Display

**Location:** `apps/frontend/src/pages/ProfilePage.tsx` or dashboard

**Add membership display:**
```typescript
// Fetch user's active membership
const fetchMembership = async () => {
  const response = await fetch(`http://localhost:3000/api/memberships/user/${user.id}/active`);
  const data = await response.json();
  setMembership(data);
};

// Display membership info
<div className="bg-slate-800 p-6 rounded-lg">
  <h3 className="text-lg font-bold text-white mb-4">Your Membership</h3>
  {membership ? (
    <>
      <p className="text-white">Type: {membership.membershipType.name}</p>
      <p className="text-gray-400">Status: {membership.status}</p>
      <p className="text-gray-400">Expires: {new Date(membership.expiryDate).toLocaleDateString()}</p>
      {membership.membershipType.canOwnTeam && <p className="text-green-400">✓ Can own team</p>}
      {membership.membershipType.listedInDirectory && <p className="text-green-400">✓ Directory listing</p>}
    </>
  ) : (
    <p className="text-gray-400">No active membership</p>
  )}
</div>
```

---

## Testing Checklist

### Backend Tests:
- [ ] GET /api/permissions returns all 26 permissions
- [ ] GET /api/permissions?category=system returns system permissions
- [ ] GET /api/permissions/role/admin returns 19 permissions
- [ ] GET /api/permissions/role/system_admin returns 26 permissions
- [ ] GET /api/membership-types returns 6 membership types
- [ ] Permission guard blocks unauthorized users
- [ ] Permission guard allows authorized users

### Frontend Tests:
- [ ] Permissions page loads and displays all permissions
- [ ] Permissions page shows which roles have each permission
- [ ] Permissions page allows admins to create/edit/delete permissions
- [ ] Memberships page shows 6 membership types with features
- [ ] Memberships page shows actual user memberships
- [ ] User profile displays current membership
- [ ] usePermissions hook works correctly for all roles

### Integration Tests:
- [ ] Admin user can access all admin pages
- [ ] Event director can access event management
- [ ] Regular user cannot access admin pages
- [ ] Membership features display correctly
- [ ] Permission checks work across frontend and backend

---

## Database Query Reference

### Useful queries for testing:

```sql
-- Get all permissions
SELECT * FROM permissions ORDER BY category, name;

-- Get permissions for a role
SELECT p.* FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role = 'admin';

-- Get user's active membership
SELECT * FROM get_user_active_membership('3ae12d0d-e446-470b-9683-0546a85bed93');

-- Check if user has permission
SELECT check_user_permission('3ae12d0d-e446-470b-9683-0546a85bed93', 'manage_events');

-- Get all membership types
SELECT * FROM membership_types ORDER BY display_order;

-- Get user with membership details
SELECT
  p.email,
  p.role,
  mt.name as membership_type,
  m.status,
  m.expiry_date
FROM profiles p
LEFT JOIN memberships m ON p.id = m.member_id AND m.status = 'active'
LEFT JOIN membership_types mt ON m.membership_type_id = mt.id;
```

---

## API Endpoints to Create

### Permissions:
- GET `/api/permissions` - Get all permissions
- GET `/api/permissions/:id` - Get one permission
- GET `/api/permissions/role/:role` - Get permissions for role
- POST `/api/permissions` - Create permission (admin only)
- PUT `/api/permissions/:id` - Update permission (admin only)
- DELETE `/api/permissions/:id` - Delete permission (admin only)

### Membership Types:
- GET `/api/membership-types` - Get all membership types
- GET `/api/membership-types/:id` - Get one membership type
- POST `/api/membership-types` - Create type (admin only)
- PUT `/api/membership-types/:id` - Update type (admin only)
- DELETE `/api/membership-types/:id` - Delete type (admin only)

### Memberships:
- GET `/api/memberships` - Get all memberships (admin only)
- GET `/api/memberships/user/:userId/active` - Get user's active membership
- POST `/api/memberships` - Create membership (admin only)
- PUT `/api/memberships/:id` - Update membership (admin only)

---

## Important Notes

1. **Don't break existing functionality** - Admin permissions work via wildcard `*`, keep that logic
2. **Test incrementally** - Backend first, then frontend
3. **Use Supabase directly if needed** - Frontend can query Supabase directly for read operations
4. **RLS is active** - All tables have Row Level Security, make sure queries work
5. **Admin user has data** - james@mecacaraudio.com has Manufacturer Gold membership for testing

---

## Files Reference

**Database Docs:**
- `DB_MIGRATION_COMPLETE_SUMMARY.md` - Complete database documentation
- `DATABASE_SCHEMA_ANALYSIS.md` - Original problem analysis

**Migrations:**
- `supabase/migrations/20251025000000_create_permissions_system.sql`
- `supabase/migrations/20251025000001_extensible_membership_system.sql`
- `supabase/migrations/20251025000002_link_memberships_to_types.sql`

**Existing Backend Structure:**
- `apps/backend/src/permissions/` - May already exist
- `apps/backend/src/membership-types/` - May already exist
- `apps/backend/src/auth/permission.guard.ts` - Needs update

**Existing Frontend Files:**
- `apps/frontend/src/pages/admin/ManagePermissionsPage.tsx` - Needs update
- `apps/frontend/src/pages/admin/ManageMembershipTypesPage.tsx` - Needs update
- `apps/frontend/src/pages/admin/MembershipsPage.tsx` - Wrapper, minimal changes
- `apps/frontend/src/hooks/usePermissions.ts` - May need update

---

## Success Criteria

When complete, the system should:
1. ✅ Display all 26 permissions in Permissions page grouped by category
2. ✅ Show which roles have which permissions
3. ✅ Display all 6 membership types with pricing and features
4. ✅ Show actual user memberships (at least admin's Manufacturer Gold)
5. ✅ User profile shows current membership
6. ✅ Permission guards work correctly in backend
7. ✅ Admin can create/edit permissions and membership types

---

**Next Agent: Start with backend (Task 1 & 2), then frontend (Task 3 & 4), then test everything.**
