# Quick Commands Guide

## 🎯 Three Essential Commands

### 1️⃣ Create a Backup/Restore Point
```
/backup
```
**What it does:**
- Creates a timestamped database backup
- Verifies all your data is saved
- Shows you the restore command to use later

**When to use:**
- Before making any schema changes
- Before major updates
- Anytime you want to save current state

---

### 2️⃣ Restore from a Backup
```
/restore
```

**Then tell me which backup to restore:**
- By date: "restore from 10-23-2025 at 11:44"
- By file: "restore from backup_20251023_114431.sql"
- Or I'll show you a list to choose from

**What it does:**
- Lists all available backups
- Asks for confirmation (so you don't accidentally restore)
- Restores the database
- Verifies all data is back

---

### 3️⃣ Deploy to Production
```
/deploy
```

**What it does:**
- Uploads all files (PDFs, images) to production Supabase storage
- Updates all URLs from local (127.0.0.1) to production URLs
- Exports and imports all data to production database
- Provides next steps for frontend deployment

**When to use:**
- When you're ready to launch to production
- After testing everything locally
- Before deploying, always run `/backup` first!

---

## 📋 Examples

**Creating a backup before changes:**
```
User: /backup
Claude: Creates backup_20251023_120530.sql (258KB)
        ✅ Verified: User account, 5 rulebooks, 1 event, 7 settings
        To restore: type "/restore from backup_20251023_120530.sql"
```

**Restoring from a specific date:**
```
User: /restore from 10-23-2025 at 11:44
Claude: Found backup_20251023_114431.sql
        This will restore your database to that point.
        Confirm? [yes/no]
User: yes
Claude: ✅ Restored! Login at http://localhost:5173
```

**Choosing from a list:**
```
User: /restore
Claude: Available backups:
        1. backup_20251023_120530.sql (10-23-2025 12:05 PM) - 258KB
        2. backup_20251023_114431.sql (10-23-2025 11:44 AM) - 255KB
        Which one?
User: 2
Claude: [Restores backup #2]
```

---

## 🚨 Emergency Restore

If something breaks:
```
/restore
```
Then choose the most recent working backup!

---

## 📁 Where Backups Are Stored

All backups are in: `./backups/`

File format: `backup_YYYYMMDD_HHMMSS.sql`
- YYYY = Year (2025)
- MM = Month (10)
- DD = Day (23)
- HH = Hour (11)
- MM = Minute (44)
- SS = Second (31)

---

## ✅ What Gets Backed Up

**Database (264KB):**
- ✅ User accounts (including james@mecacaraudio.com, MECA ID 202401)
- ✅ Rulebooks (with local storage URLs)
- ✅ Events
- ✅ Site settings
- ✅ Media library records
- ✅ All other tables
- ✅ All relationships and constraints

**Storage Files (11MB):**
- ✅ ALL PDF files (5 rulebooks)
- ✅ ALL image files (carousel, media library)
- ✅ Complete file structure

**Total Backup Size: ~11MB compressed**

## ❌ What Doesn't Get Backed Up

- ❌ Frontend code (tracked in git separately)
- ❌ Environment variables (in .env files, not in database)
- ❌ node_modules (can be reinstalled)

---

## 🔑 Login After Restore

- **Email**: james@mecacaraudio.com
- **Password**: Admin123!
- **URL**: http://localhost:5173

---

**Deploying to production:**
```
User: /backup
Claude: [Creates backup_20251023_125335.tar.gz]
User: /deploy
Claude: Will upload 5 PDFs, 11 images, and deploy all data to production.
        Production URL: https://qykahrgwtktqycfgxqep.supabase.co
        Proceed? [yes/no]
User: yes
Claude: ✅ Deployed! Next: Update frontend .env and deploy to Netlify
```

---

**That's it! Three commands: `/backup`, `/restore`, and `/deploy`**
