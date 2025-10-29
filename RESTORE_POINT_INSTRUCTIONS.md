# System Restore Point Instructions

**Created:** October 25, 2025 at 6:30 PM
**Commit Hash:** `8fc0655`
**Git Tag:** `stable-restore-point-2025-10-25`
**Database Backup:** `backups/complete_20251025_181809/`

---

## What This Restore Point Includes

### ✅ Complete Working System

**Frontend Pages:**
- Season Management (create/edit seasons)
- Classes Management (80 classes across 4 formats)
- Permissions Management (fixed theme + back button)
- Memberships Management (fixed permission checks + back button)
- Admin Dashboard with all navigation
- Banner Carousel
- Directory pages

**Backend Modules:**
- Auth module
- Banners module
- Directories module
- Membership types module
- Permissions module
- Teams module

**Database:**
- 2 Seasons (2025 current, 2026 next)
- 80 Competition Classes
  - SPL: 44 classes
  - SQL: 13 classes
  - Show and Shine: 21 classes
  - Ride the Light: 2 classes
- 1 Admin profile
- 5 Rulebooks
- 12 Media files

---

## How to Restore CODE ONLY (if agents mess up frontend/backend)

### Option 1: Restore Using Git Tag (RECOMMENDED)

This restores your code to the exact state when the restore point was created:

```bash
# Save any work you want to keep first (optional)
git stash

# Restore to the tagged restore point
git checkout stable-restore-point-2025-10-25

# If you want to continue working from this point, create a new branch
git checkout -b mick-branch-restored

# Or if you want to hard reset your current branch to this point
git checkout mick-branch
git reset --hard stable-restore-point-2025-10-25
```

### Option 2: Restore Using Commit Hash

```bash
# Restore to specific commit
git checkout 8fc0655

# To reset current branch to this commit
git reset --hard 8fc0655
```

### Option 3: Restore Specific Files Only

If only certain files were messed up:

```bash
# Restore a specific file
git checkout stable-restore-point-2025-10-25 -- apps/frontend/src/pages/admin/ManagePermissionsPage.tsx

# Restore entire directory
git checkout stable-restore-point-2025-10-25 -- apps/frontend/src/

# Restore all frontend
git checkout stable-restore-point-2025-10-25 -- apps/frontend/

# Restore all backend
git checkout stable-restore-point-2025-10-25 -- apps/backend/
```

---

## How to Restore DATABASE (if database gets corrupted)

### Full Database Restore

```bash
# 1. Stop Supabase
npx supabase stop

# 2. Start fresh
npx supabase start

# 3. Restore database from backup
cat backups/complete_20251025_181809/database.sql | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres

# 4. Restore storage files
docker cp backups/complete_20251025_181809/storage/. supabase_storage_NewMECAV2:/var/lib/storage/

# 5. Restart storage container
docker restart supabase_storage_NewMECAV2
```

### Verify Database Restoration

```bash
# Check seasons
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) FROM seasons;"
# Expected: 2

# Check classes
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT format, COUNT(*) FROM competition_classes GROUP BY format;"
# Expected: SPL (44), SQL (13), Show and Shine (21), Ride the Light (2)

# Check profile
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT email, role FROM profiles;"
# Expected: james@mecacaraudio.com, admin
```

---

## How to Restore EVERYTHING (Code + Database)

### Complete System Restore

```bash
# 1. Restore code
git checkout stable-restore-point-2025-10-25

# 2. Stop Supabase
npx supabase stop

# 3. Start fresh
npx supabase start

# 4. Restore database
cat backups/complete_20251025_181809/database.sql | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres

# 5. Restore storage
docker cp backups/complete_20251025_181809/storage/. supabase_storage_NewMECAV2:/var/lib/storage/

# 6. Restart storage
docker restart supabase_storage_NewMECAV2

# 7. Reinstall dependencies (if needed)
npm install

# 8. Start services
npm run dev:frontend    # Terminal 1
npm run dev:backend     # Terminal 2
```

---

## Quick Recovery Scenarios

### Scenario 1: "Agent broke the Permissions page"
```bash
git checkout stable-restore-point-2025-10-25 -- apps/frontend/src/pages/admin/ManagePermissionsPage.tsx
```

### Scenario 2: "Agent broke the backend auth module"
```bash
git checkout stable-restore-point-2025-10-25 -- apps/backend/src/auth/
```

### Scenario 3: "Agent deleted all my classes from database"
```bash
# Run the class creation scripts
node scripts/add-sql-classes.js
node scripts/add-rtl-classes.js
node scripts/add-show-and-shine-classes.js
```

### Scenario 4: "Everything is broken, start over"
```bash
# Hard reset to restore point
git reset --hard stable-restore-point-2025-10-25

# Restore database
npx supabase stop
npx supabase start
cat backups/complete_20251025_181809/database.sql | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres
docker cp backups/complete_20251025_181809/storage/. supabase_storage_NewMECAV2:/var/lib/storage/
docker restart supabase_storage_NewMECAV2
```

---

## Checking What Changed Since Restore Point

```bash
# See all changes since restore point
git diff stable-restore-point-2025-10-25

# See what files changed
git diff --name-only stable-restore-point-2025-10-25

# See commit history since restore point
git log stable-restore-point-2025-10-25..HEAD --oneline
```

---

## Creating Additional Restore Points

If you want to create another restore point in the future:

```bash
# 1. Commit all changes
git add apps/ supabase/migrations/ scripts/
git commit -m "Your commit message here"

# 2. Create a tag
git tag -a stable-restore-point-YYYY-MM-DD -m "Description of this restore point"

# 3. Create database backup
mkdir -p backups/complete_$(date +%Y%m%d_%H%M%S)
docker exec supabase_db_NewMECAV2 pg_dump -U postgres -d postgres --clean --if-exists > backups/complete_TIMESTAMP/database.sql
docker cp supabase_storage_NewMECAV2:/var/lib/storage/ backups/complete_TIMESTAMP/storage
```

---

## View All Restore Points

```bash
# List all tagged restore points
git tag -l "stable-*"

# See details of a specific tag
git show stable-restore-point-2025-10-25
```

---

## Important Notes

1. **Always check git status** before restoring to see what you'll lose
2. **Use `git stash`** to save uncommitted work before restoring
3. **Database and code are separate** - restore them independently if needed
4. **Test after restoring** - verify pages load and functionality works
5. **Don't delete the backup folder** - keep `backups/complete_20251025_181809/` safe

---

## Emergency Contact

If something goes wrong during restore:

1. **DON'T PANIC** - Git keeps everything
2. Check `git reflog` to see all recent actions
3. Use `git reflog` to find the commit you want
4. Use `git reset --hard HEAD@{n}` to go back to any point

---

## System State Summary

**This restore point captures:**
- ✅ All frontend pages working and styled correctly
- ✅ All backend modules implemented
- ✅ Database with 2 seasons and 80 classes
- ✅ Permissions pages fixed (theme + back buttons)
- ✅ Memberships pages fixed (permission checks + back button)
- ✅ Admin account working: james@mecacaraudio.com
- ✅ 5 rulebooks with PDFs
- ✅ 12 media files
- ✅ All migrations applied

**No known issues at this restore point** ✨
