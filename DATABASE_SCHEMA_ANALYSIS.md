# Database Schema Analysis: Users → Memberships → Permissions

**Analysis Date:** October 25, 2025
**Analyzed By:** DB Expert Agent

---

## Executive Summary

**CRITICAL FINDING:** The permissions system is completely disconnected from the membership system. The extensible membership migration file exists but has NOT been applied to the database.

### Current State: **BROKEN** 🔴
- ❌ NO `permissions` table exists
- ❌ NO `role_permissions` table exists
- ❌ NO `user_permission_overrides` table exists
- ❌ NO `membership_types` table exists
- ✅ `profiles` table has `role` field (enum)
- ✅ `memberships` table exists but is EMPTY
- ✅ Migration file `20251025000001_extensible_membership_system.sql` exists but NOT APPLIED

---

## 1. Current Schema Structure

### `profiles` Table (EXISTS)
```sql
Key Columns:
- id UUID PRIMARY KEY
- email TEXT NOT NULL
- role user_role NOT NULL DEFAULT 'user'  -- ENUM: user, event_director, retailer, admin, system_admin
- membership_status membership_status NOT NULL DEFAULT 'none'  -- ENUM: none, active, expired
- membership_expiry TIMESTAMPTZ

Foreign Keys:
- id → auth.users(id) CASCADE
```

**Issue:** `role` is stored directly on profiles, but there's no connection between role and permissions. Admin status is hardcoded.

### `memberships` Table (EXISTS but EMPTY)
```sql
Columns:
- id UUID PRIMARY KEY
- user_id UUID NOT NULL → profiles(id) CASCADE
- membership_type membership_type NOT NULL  -- ENUM: annual, lifetime
- purchase_date TIMESTAMPTZ NOT NULL
- expiry_date TIMESTAMPTZ
- amount_paid NUMERIC(10,2)
- payment_method TEXT
- status membership_status NOT NULL DEFAULT 'active'

Data: 0 rows (EMPTY)
```

**Issue:** No actual membership records. The `membership_type` enum is too simplistic (annual/lifetime) and doesn't connect to roles or permissions.

### Missing Tables (DO NOT EXIST)
- ❌ `permissions` - Should store all system permissions
- ❌ `role_permissions` - Should link roles to permissions
- ❌ `user_permission_overrides` - Should allow user-specific permission grants/denials
- ❌ `membership_types` - Should define membership tiers with features/permissions

---

## 2. What Relationships SHOULD Exist

### Proper Architecture Flow:
```
User (auth.users)
  ↓
Profile (profiles)
  ├─→ Role (user_role enum) → Currently hardcoded
  └─→ Memberships (memberships table)
        ↓
      Membership Type (membership_types) → MISSING TABLE
        ├─→ Features (JSONB)
        ├─→ Directory Access
        ├─→ Banner Slots
        └─→ Role Assignment
              ↓
            Role Permissions (role_permissions) → MISSING TABLE
              ↓
            Permissions (permissions) → MISSING TABLE
              ├─→ User Overrides (user_permission_overrides) → MISSING TABLE
              └─→ Final Permission Check
```

---

## 3. Missing Components

### A. Permissions Table (MISSING)
**Should contain:**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,        -- e.g., 'manage_events', 'view_analytics'
  description TEXT,
  category TEXT                      -- e.g., 'users', 'events', 'system'
);
```

**Current Permissions Defined in Migration (NOT APPLIED):**
- System: `access_system_settings`, `access_system_configuration`, `manage_membership_types`, `manage_database`
- Events: `request_event`, `manage_event_results`
- Content: `manage_directory_listings`, `manage_banner_ads`
- Users: `manage_teams`
- Competition: `manage_seasons`, `manage_classes`
- Other: `access_api`, `view_analytics`

### B. Role Permissions Table (MISSING)
**Should link roles to permissions:**
```sql
CREATE TABLE role_permissions (
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (role, permission_id)
);
```

### C. User Permission Overrides (MISSING)
**Should allow user-specific exceptions:**
```sql
CREATE TABLE user_permission_overrides (
  user_id UUID REFERENCES profiles(id),
  permission_id UUID REFERENCES permissions(id),
  granted BOOLEAN NOT NULL,         -- true = grant, false = deny
  PRIMARY KEY (user_id, permission_id)
);
```

### D. Membership Types Table (MISSING)
**Should define membership tiers:**
```sql
CREATE TABLE membership_types (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  duration_months INTEGER,
  features JSONB DEFAULT '{}',      -- Extensible features
  can_own_team BOOLEAN,
  listed_in_directory BOOLEAN,
  has_banner_carousel BOOLEAN,
  banner_ad_slots INTEGER
);
```

---

## 4. Current Admin Role Implementation

### How It Currently Works:
```typescript
// Frontend: usePermissions.ts (lines 34-38)
if (profile?.role === 'admin') {
  setPermissions(new Set(['*']));  // Wildcard = all permissions
  return;
}
```

**Issue:** Admin permissions are HARDCODED in frontend logic, not stored in database.

### How It SHOULD Work:
```sql
-- Permission check function (from migration, NOT APPLIED)
CREATE FUNCTION check_user_permission(p_user_id UUID, p_permission_name TEXT)
RETURNS BOOLEAN AS $$
  -- system_admin: ALL permissions (including system-level)
  -- admin: All permissions EXCEPT system-level ones
  -- other roles: Check role_permissions + user_permission_overrides
$$;
```

---

## 5. Why Current System is Broken

### Problem 1: Disconnected Systems
- **Profiles have roles** → But roles don't define permissions
- **Memberships table exists** → But it's empty and doesn't connect to roles
- **Permissions system coded** → But no database tables to support it
- **Frontend expects permissions** → But backend can't provide them

### Problem 2: No Membership Types
- Current `membership_type` enum: `annual`, `lifetime` (too generic)
- Should be: `Competitor`, `Team`, `Retailer`, `Manufacturer Bronze`, `Manufacturer Silver`, `Manufacturer Gold`
- Each type should have: features, role assignment, permission sets

### Problem 3: No Permission Management
- Permissions page exists but can't load data (no `permissions` table)
- Admin permissions work via hardcoded frontend logic
- No way to assign/revoke permissions via UI
- No audit trail of permission changes

---

## 6. Data Currently in Database

### Profiles Table:
```sql
SELECT id, email, role, membership_status FROM profiles;
```
Result: 1 row
- james@mecacaraudio.com | admin | active

### Memberships Table:
```sql
SELECT * FROM memberships;
```
Result: 0 rows (EMPTY)

**Critical:** The admin user has `role = 'admin'` but NO membership record. This violates the intended design where membership type → role → permissions.

---

## 7. Gaps to Connect Users → Memberships → Permissions

### Gap 1: Missing Database Tables
Need to apply migration `20251025000001_extensible_membership_system.sql` to create:
- `permissions`
- `role_permissions`
- `user_permission_overrides`
- `membership_types`
- `audit_log`
- `feature_flags`

### Gap 2: Missing Membership Type Records
After migration, need to populate `membership_types`:
```sql
INSERT INTO membership_types (name, price, duration_months, features) VALUES
  ('Competitor', 50.00, 12, '{"meca_id": true, "event_registration": true}'),
  ('Team', 100.00, 12, '{"team_ownership": true, "max_members": 10}'),
  ('Retailer', 250.00, 12, '{"directory_listing": true, "banner_slots": 1}'),
  ('Manufacturer Bronze', 500.00, 12, '{"directory_listing": true}'),
  ('Manufacturer Silver', 1000.00, 12, '{"directory_listing": true, "banner_slots": 1}'),
  ('Manufacturer Gold', 2000.00, 12, '{"directory_listing": true, "banner_slots": 3}');
```

### Gap 3: Linking Membership Types to Roles
Need to modify `memberships` table:
```sql
ALTER TABLE memberships
  DROP COLUMN membership_type,
  ADD COLUMN membership_type_id UUID REFERENCES membership_types(id);
```

### Gap 4: Auto-Assign Role from Membership
Need trigger or application logic:
```sql
-- When user gets membership, update their role on profiles table
CREATE TRIGGER assign_role_from_membership
  AFTER INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_user_role_from_membership();
```

### Gap 5: Permission Assignment
Need to populate `role_permissions`:
```sql
-- Admin gets all non-system permissions
-- Event Directors get event permissions
-- Retailers get directory + banner permissions
-- etc.
```

### Gap 6: Frontend Integration
Need to update frontend to:
- Display actual membership types (not hardcoded annual/lifetime)
- Show which permissions each membership/role has
- Allow admins to modify role permissions
- Display user's current membership on profile

---

## 8. Recommended Fix Strategy

### Phase 1: Database Schema (CRITICAL)
1. ✅ **Apply the migration** `20251025000001_extensible_membership_system.sql`
2. ✅ **Verify tables created**: permissions, role_permissions, user_permission_overrides, membership_types
3. ✅ **Check function created**: `check_user_permission()`

### Phase 2: Seed Permission Data
1. ✅ **Verify permissions inserted** (should be in migration)
2. ✅ **Assign permissions to roles** via `role_permissions`
3. ✅ **Create membership types** records

### Phase 3: Fix Memberships Table
1. ✅ **Migrate `memberships.membership_type` enum to `membership_type_id` FK**
2. ✅ **Create sample membership** for james@mecacaraudio.com
3. ✅ **Add trigger** to auto-update role when membership changes

### Phase 4: Frontend Integration
1. ✅ **Update Permissions page** to load from `permissions` table
2. ✅ **Update Memberships page** to show actual membership types
3. ✅ **Show role-permission mapping** in Permissions page
4. ✅ **Display user's current membership** on profile/dashboard

### Phase 5: Backend API
1. ✅ **Create permissions CRUD** endpoints
2. ✅ **Create membership types CRUD** endpoints
3. ✅ **Create role-permissions assignment** endpoints
4. ✅ **Update auth guards** to use `check_user_permission()` function

---

## 9. Critical Next Steps

### IMMEDIATE (Do First):
```bash
# 1. Apply the extensible membership migration
cat supabase/migrations/20251025000001_extensible_membership_system.sql | \
  docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres

# 2. Verify tables created
docker exec supabase_db_NewMECAV2 psql -U postgres -c "\dt public.permissions"
docker exec supabase_db_NewMECAV2 psql -U postgres -c "\dt public.membership_types"

# 3. Check permissions data
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) FROM permissions;"
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) FROM membership_types;"
```

### AFTER MIGRATION:
1. Create additional migration to link memberships → membership_types
2. Seed membership_types with actual products
3. Create sample membership for admin user
4. Test permission checking function
5. Update frontend to consume new schema

---

## 10. Summary

**Current State:**
- ❌ Permissions system: NOT IMPLEMENTED (tables don't exist)
- ❌ Membership types: NOT IMPLEMENTED (table doesn't exist)
- ❌ Role-permission links: NOT IMPLEMENTED (table doesn't exist)
- ⚠️ Memberships: Exists but EMPTY and uses wrong enum
- ⚠️ Roles: Exist on profiles but not connected to permissions
- ✅ Frontend: Coded for permissions but can't load data

**Root Cause:**
Migration file `20251025000001_extensible_membership_system.sql` was created but NEVER applied to the database.

**Fix:**
Apply the migration, then create linking migration for memberships table.

---

**Recommendation:** Apply migration IMMEDIATELY before any other work. Everything else depends on this foundation.
