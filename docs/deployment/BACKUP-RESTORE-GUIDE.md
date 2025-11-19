# Database Backup and Restoration Guide

## Current Backup Status

✅ **Backup Created**: `backups/backup_20251023_114431.sql` (255KB)

### What's Included in This Backup:

- ✅ Your user account (james@mecacaraudio.com, MECA ID: 202401, Admin role)
- ✅ All billing and shipping address fields
- ✅ 5 Rulebooks with season and status fields
- ✅ 7 Site settings (including carousel images)
- ✅ 12 Media library files
- ✅ 1 Event (SPL Madness, October 11, 2025)
- ✅ All database tables: profiles, events, rulebooks, media_files, site_settings, orders, teams, team_members, notifications, event_registrations, competition_results, memberships, hero_carousel_items
- ✅ All indexes and foreign key constraints
- ✅ All Row Level Security (RLS) policies
- ✅ All database functions and triggers

### What's NOT Included:

- ❌ Actual uploaded files in Supabase Storage (images/PDFs). However, your media URLs point to the remote Supabase instance (qykahrgwtktqycfgxqep.supabase.co), so those files remain safe.
- ❌ Frontend code changes (but these are tracked in git)
- ❌ Environment variables (in .env files, not affected by database operations)

## Quick Commands (Recommended)

### Create a New Backup/Restore Point

Simply type in Claude Code:
```
/backup
```

This will:
- Create a timestamped backup file
- Verify all critical data is backed up
- Show you the exact restore command for this backup

### Restore from a Backup

Simply type in Claude Code:
```
/restore
```

Then specify which backup to restore from by:
- Date/time: "10-23-2025 at 11:44"
- File name: "backup_20251023_114431.sql"
- Or choose from a numbered list

Claude will confirm before restoring and verify all data after restoration.

## Manual Backup Creation

You can also create backups manually:

```bash
docker exec supabase_db_NewMECAV2 pg_dump -U postgres -d postgres > ./backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

This creates a timestamped backup file like: `backup_20251023_114431.sql`

## Manual Restoration

### Option 1: Using the Restore Script (Recommended)

**On Windows:**
```bash
restore-backup.bat backups\backup_20251023_114431.sql
```

**On Linux/Mac:**
```bash
chmod +x restore-backup.sh
./restore-backup.sh backups/backup_20251023_114431.sql
```

The script will:
1. Stop Supabase
2. Start fresh Supabase instance
3. Clean the database
4. Restore from backup
5. Verify all critical data

### Option 2: Manual Restoration

```bash
# Stop Supabase
npx supabase stop

# Start Supabase
npx supabase start

# Wait for it to be ready
sleep 5

# Clean database
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

# Restore from backup
cat ./backups/backup_20251023_114431.sql | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres
```

## Verification After Restore

After restoration, verify these key items:

1. **Your User Account:**
   ```bash
   docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT email, first_name, last_name, meca_id, role FROM profiles WHERE email='james@mecacaraudio.com';"
   ```
   Should show: James Ryan, MECA ID 202401, role: admin

2. **Rulebooks Count:**
   ```bash
   docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) FROM rulebooks;"
   ```
   Should show: 5

3. **Events Count:**
   ```bash
   docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) FROM events;"
   ```
   Should show: 1

4. **Site Settings Count:**
   ```bash
   docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) FROM site_settings;"
   ```
   Should show: 7

## Login Credentials

After restoration, you can log in with:
- **Email**: james@mecacaraudio.com
- **Password**: Admin123!
- **Frontend URL**: http://localhost:5173

## Best Practices

1. **Create a backup BEFORE any schema changes**
2. **Keep multiple backup versions** with timestamps
3. **Test restoration** on a clean database to verify it works
4. **Regular backups** before major changes

## Backup Storage

All backups are stored in: `./backups/`

List all available backups:
```bash
ls -lh ./backups/
```

## Emergency Restore

If something breaks and you need to restore immediately:

1. Find the most recent working backup: `ls -lt ./backups/`
2. Run the restore script: `restore-backup.bat backups\[filename].sql`
3. Verify your account and data
4. Test the frontend at http://localhost:5173

## Remote Data Source

Your remote Supabase instance contains the original data:
- **URL**: https://qykahrgwtktqycfgxqep.supabase.co
- **Service Key**: (in scripts/restore-all-data.js)

If local backups fail, you can use `scripts/restore-all-data.js` to pull fresh data from remote.
