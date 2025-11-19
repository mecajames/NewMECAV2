# MECA Application - Development & Deployment

## 📋 Quick Reference

### Development Commands
- **Start Dev Server**: `npm run dev`
- **Start Supabase**: `npx supabase start`
- **Create Backup**: `/backup`
- **Restore Backup**: `/restore`

### Production Commands
- **Deploy to Production**: `/deploy`
- **Manual Deploy**: `node scripts/deploy-to-production.js`

---

## 🏗️ Development Workflow

### Local Development
All development happens locally with:
- **Database**: Local Supabase (http://127.0.0.1:54321)
- **Storage**: Local Supabase storage
- **Frontend**: http://localhost:5173

**File Storage**:
- All PDFs and images are stored **locally** in Supabase storage
- URLs in database: `http://127.0.0.1:54321/storage/v1/object/public/documents/...`

### Creating Backups

Before making any major changes:

```bash
/backup
```

This creates a **complete backup** including:
- Database (264KB) - All tables and data
- Storage files (11MB) - All PDFs and images
- Total: ~11MB compressed

Backups are saved to: `backups/complete_[timestamp].tar.gz`

### Restoring from Backup

If something breaks:

```bash
/restore from backup_20251023_125335.tar.gz
```

Or just:
```bash
/restore
```
Then choose from a list.

---

## 🚀 Production Deployment

When you're ready to deploy to production:

### Step 1: Create Final Backup
```bash
/backup
```

### Step 2: Deploy to Production
```bash
/deploy
```

This will:
1. ✅ Upload all PDFs (5 rulebooks) to production Supabase storage
2. ✅ Upload all images (11 media files + 6 carousel images) to production storage
3. ✅ Update all URLs from `127.0.0.1` to production URLs
4. ✅ Export all database data
5. ✅ Import data into production database

### Step 3: Deploy Frontend

Update `apps/frontend/.env.production`:
```env
VITE_SUPABASE_URL=https://qykahrgwtktqycfgxqep.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Deploy to Netlify:
```bash
cd apps/frontend
netlify deploy --prod
```

---

## 📁 Project Structure

```
NewMECAV2/
├── apps/
│   ├── frontend/          # React/Vite frontend
│   └── backend/           # (if needed)
├── supabase/
│   └── migrations/        # Database migrations
├── scripts/
│   ├── complete-backup.sh          # Backup database + files
│   ├── deploy-to-production.js    # Deploy to production
│   └── migrate-files-to-local.js  # Migrate remote files to local
├── backups/               # All backups stored here
│   └── complete_[timestamp]/
│       ├── database.sql
│       └── storage/       # All files
├── .claude/
│   └── commands/
│       ├── backup.md      # /backup command
│       ├── restore.md     # /restore command
│       └── deploy.md      # /deploy command
└── docs/
    ├── QUICK-COMMANDS.md         # Quick reference
    ├── BACKUP-RESTORE-GUIDE.md   # Detailed backup guide
    └── DEPLOYMENT-GUIDE.md       # Detailed deployment guide
```

---

## 🔐 Credentials

### Local Development
- **URL**: http://127.0.0.1:54321
- **Service Key**: (in local Supabase)
- **Admin Login**: james@mecacaraudio.com / Admin123!

### Production
- **URL**: https://qykahrgwtktqycfgxqep.supabase.co
- **Service Key**: (from Supabase dashboard)
- **Admin Login**: Same as local (after deployment)

---

## 🔄 Workflow Summary

### Making Changes Locally
1. Make changes to code/data
2. Test locally at http://localhost:5173
3. Create backup: `/backup`
4. Continue development

### Deploying to Production
1. Test everything locally
2. Create backup: `/backup`
3. Deploy: `/deploy`
4. Update frontend .env.production
5. Deploy frontend to Netlify
6. Verify production site

### If Something Breaks
1. Restore locally: `/restore`
2. Fix the issue
3. Test again
4. Deploy again when ready

---

## 📊 Current State

### Database
- **Tables**: 13 (profiles, events, rulebooks, media_files, site_settings, etc.)
- **Users**: 1 admin (james@mecacaraudio.com, MECA ID 202401)
- **Rulebooks**: 5 PDFs
- **Media Files**: 11 images
- **Carousel Images**: 6 images
- **Events**: 1 (SPL Madness - Oct 11, 2025)

### Storage
- **Total Files**: 22 (5 PDFs + 17 images)
- **Total Size**: ~11MB
- **Location (Dev)**: Local Supabase storage
- **Location (Prod)**: After `/deploy` - Production Supabase storage

### Backups
- **Latest**: `backups/complete_20251023_125335.tar.gz` (11MB)
- **Contains**: Complete database + all files
- **Restore Command**: `/restore from complete_20251023_125335.tar.gz`

---

## 🆘 Troubleshooting

### Files Not Loading Locally
- Check Supabase is running: `npx supabase status`
- Check URLs in database point to `127.0.0.1:54321`

### Files Not Loading in Production
- Run `/deploy` again to upload files
- Check Supabase dashboard > Storage > documents bucket
- Verify URLs in production database

### Can't Login
- **Local**: Password is `Admin123!`
- **Production**: After deployment, same password
- Reset if needed: `node scripts/reset-admin-password.js`

### Need to Start Over
- Restore from backup: `/restore`
- Choose the most recent working backup

---

## 📚 Documentation

- **Quick Commands**: [QUICK-COMMANDS.md](QUICK-COMMANDS.md)
- **Backup & Restore Guide**: [BACKUP-RESTORE-GUIDE.md](BACKUP-RESTORE-GUIDE.md)
- **Deployment Guide**: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

## ✅ Key Points

1. **Everything is local during development**
   - Database: Local Supabase
   - Files: Local Supabase storage
   - URLs: Point to 127.0.0.1

2. **Backups include everything**
   - Database + actual files
   - Can restore complete state

3. **Deployment is automatic**
   - `/deploy` handles everything
   - Files uploaded to production
   - URLs updated automatically

4. **Frontend uses environment variables**
   - `.env.development` for local
   - `.env.production` for production
   - Automatically uses correct Supabase URL

---

**Ready to develop!** 🚀

Use `/backup` before changes, `/restore` if needed, and `/deploy` when ready for production.
