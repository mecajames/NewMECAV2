# MECA Backup & Deployment Scripts

This directory contains scripts for backing up, restoring, and deploying your MECA application.

## Quick Reference

```bash
# Create a complete backup (code + database)
scripts\backup.bat

# Restore from a backup
scripts\restore.bat [BACKUP_ID]

# Deploy to production
scripts\deploy-to-production.bat
```

## Available Scripts

### 1. `backup.bat` - Complete Backup

Creates a complete backup of your application including:
- **Git commit** and **tag** for code versioning
- **Local database** dump (development)
- **Remote database** dump (production)
- **Manifest file** with backup details

**Usage:**
```bash
scripts\backup.bat
```

**What it creates:**
```
backups/
  backup-20251102-143022/
    local-database.sql       # Local dev database
    remote-database.sql      # Production database
    MANIFEST.txt            # Backup details
  latest-backup.txt         # Reference to most recent backup
```

**When to use:**
- Before making major changes
- Before deploying to production
- End of each work session
- Before testing risky features

---

### 2. `restore.bat` - Restore from Backup

Restores your application to a previous backup point.

**Usage:**
```bash
# Restore specific backup
scripts\restore.bat 20251102-143022

# Restore latest backup
scripts\restore.bat
```

**What it does:**
1. Checks out Git tag from backup
2. Restores local database (with confirmation)
3. Restores remote database (optional, with confirmation)
4. Reinstalls dependencies

**Safety features:**
- Requires confirmation before restoring
- Shows backup manifest before proceeding
- Allows skipping database restore
- Separate confirmations for local/remote databases

---

### 3. `deploy-to-production.bat` - Production Deployment

Complete deployment workflow that safely pushes code and data to production.

**Usage:**
```bash
scripts\deploy-to-production.bat
```

**What it does:**
1. **Creates backup** - Safety net before deployment
2. **Runs tests** - Ensures code quality (if configured)
3. **Builds application** - Verifies build succeeds
4. **Pushes to GitHub** - Deploys code
5. **Syncs database** - Optional production database sync

**Safety features:**
- Creates backup before starting
- Confirms before each major step
- Validates build before pushing
- Requires typing 'DEPLOY' for database sync
- Can skip database sync if needed

---

## Common Workflows

### Daily Development

```bash
# End of day backup
scripts\backup.bat
```

### Before Testing Risky Changes

```bash
# Create backup before changes
scripts\backup.bat

# Make your changes...
# Test...

# If something breaks, restore:
scripts\restore.bat
```

### Deploying to Production

```bash
# Full deployment with all safety checks
scripts\deploy-to-production.bat
```

### Recovering from Mistakes

```bash
# List available backups
dir /b backups\backup-*

# Restore specific backup
scripts\restore.bat 20251102-143022
```

---

## Backup Structure

Each backup creates:

```
backups/
├── backup-20251102-143022/
│   ├── local-database.sql      # Complete local DB dump
│   ├── remote-database.sql     # Complete production DB dump
│   └── MANIFEST.txt            # Backup metadata
│
└── latest-backup.txt           # Points to most recent backup
```

### Manifest File

Each backup includes a manifest with:
- Backup date/time
- Git tag and commit hash
- Current branch
- File locations
- Restore instructions

---

## Git Integration

### Backup Tags

Each backup creates a Git tag: `backup-YYYYMMDD-HHMMSS`

**View all backup tags:**
```bash
git tag -l "backup-*"
```

**Checkout specific backup:**
```bash
git checkout backup-20251102-143022
```

**Return to latest code:**
```bash
git checkout fix-branch  # or main/master
```

---

## Database Backups

### Local Database (Development)
- **Host:** 127.0.0.1:54322
- **Backed up:** Every backup
- **Restored:** With confirmation

### Remote Database (Production)
- **Host:** qykahrgwtktqycfgxqep.supabase.co
- **Backed up:** Every backup (if accessible)
- **Restored:** Optional, requires explicit confirmation

### Manual Database Operations

**Backup local database:**
```bash
npx supabase db dump -f my-backup.sql
```

**Restore local database:**
```bash
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f my-backup.sql
```

**Backup production database:**
```bash
npx supabase db dump --db-url "$DATABASE_URL" -f production-backup.sql
```

**Restore production database:**
```bash
psql -h db.qykahrgwtktqycfgxqep.supabase.co -p 5432 -U postgres -d postgres -f production-backup.sql
```

---

## Troubleshooting

### Backup fails with "Git tag already exists"

This happens if you try to create multiple backups in the same second.

**Solution:** Wait a second and run backup again, or delete the existing tag:
```bash
git tag -d backup-YYYYMMDD-HHMMSS
```

### Restore fails with "Tag not found"

The backup Git tag doesn't exist.

**Solution:** Check available tags:
```bash
git tag -l
```

### Database restore fails

Check that your database server is running:

**For local:**
```bash
npx supabase status
```

**If not running:**
```bash
npx supabase start
```

### Deploy fails on "npm run build"

Fix build errors before deploying:
```bash
npm run build
```

Check the error messages and fix TypeScript/build errors.

---

## Best Practices

1. **Backup before risky changes**
   ```bash
   scripts\backup.bat
   ```

2. **Commit frequently during development**
   - Backups work better with clean Git history

3. **Test before deploying**
   - Run `npm run build` to catch errors early

4. **Keep recent backups**
   - Don't delete backup folders from last 7 days

5. **Verify after restore**
   - Check application runs after restoring
   - Verify database data is correct

6. **Database sync carefully**
   - Think twice before syncing to production
   - Consider syncing production TO local instead

---

## Advanced Usage

### Automated Daily Backups

Create a Windows Scheduled Task to run `scripts\backup.bat` daily at 11 PM.

### Keep Only Recent Backups

Manually delete old backups from `backups/` directory, or create a cleanup script:
```bash
# Keep only backups from last 30 days
forfiles /p "backups" /d -30 /c "cmd /c if @isdir==TRUE rmdir /s /q @path"
```

### Sync Production to Local (Instead of Local to Production)

```bash
# Dump production database
npx supabase db dump --db-url "$DATABASE_URL" -f prod-sync.sql

# Import to local
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f prod-sync.sql
```

---

## Security Notes

- **Database credentials** are embedded in scripts
- **Do NOT commit** scripts to public repositories with credentials
- Consider using environment variables for production credentials
- Keep backup files secure (they contain all your data)

---

## Support

If you encounter issues:

1. Check error messages carefully
2. Verify databases are running (`npx supabase status`)
3. Check Git status (`git status`)
4. Review backup manifest files
5. Restore from most recent working backup

---

## Script Maintenance

These scripts are located in:
```
E:\MECA Oct 2025\NewMECAV2\scripts\
```

To modify:
- Edit the `.bat` files directly
- Test changes carefully before relying on them
- Keep backups before modifying backup scripts!
