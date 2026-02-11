# Production Deployment Guide

This guide explains how to deploy your MECA application from local development to production.

## Overview

Your development workflow:
1. **Local Development**: All data and files stored locally (127.0.0.1:54321)
2. **Production Deployment**: Migrate everything to production Supabase
3. **Frontend Deployment**: Deploy frontend to Netlify/Vercel

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All features are tested locally
- [ ] Database has all required data (users, events, rulebooks, etc.)
- [ ] All files are uploaded and accessible locally
- [ ] You have production Supabase credentials
- [ ] You have created a backup: `/backup`

---

## Step 1: Prepare Production Supabase

### 1.1 Create Production Supabase Project (if not already done)

1. Go to https://supabase.com/dashboard
2. Create a new project or use existing: `qykahrgwtktqycfgxqep`
3. Note your production credentials:
   - **Project URL**: `https://qykahrgwtktqycfgxqep.supabase.co`
   - **Service Role Key**: (from Settings > API)

### 1.2 Run Database Migrations

Apply all your local migrations to production:

```bash
# Set production connection string
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.qykahrgwtktqycfgxqep.supabase.co:5432/postgres"

# Or use Supabase CLI
npx supabase link --project-ref qykahrgwtktqycfgxqep
npx supabase db push
```

This will create all tables, indexes, RLS policies, and functions in production.

---

## Step 2: Deploy Data and Files to Production

### 2.1 Set Environment Variables

Create a `.env.production` file or export these variables:

```bash
export PROD_SUPABASE_URL="https://qykahrgwtktqycfgxqep.supabase.co"
export PROD_SUPABASE_SERVICE_KEY="your-service-role-key-here"
```

### 2.2 Run Deployment Script

```bash
node scripts/deploy-to-production.js
```

**What this script does:**

1. ✅ Creates storage bucket in production
2. ✅ Uploads all rulebook PDFs to production storage
3. ✅ Uploads all media files (images) to production storage
4. ✅ Uploads all carousel images to production storage
5. ✅ Updates all URLs from local (127.0.0.1) to production URLs
6. ✅ Exports all database data with updated URLs
7. ✅ Imports data into production database

**Output:**
- Files uploaded to production Supabase storage
- Data exported to: `backups/production-export/production-data-[timestamp].json`
- Data imported to production database

### 2.3 Verify Production Data

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep
2. Check **Storage** > `documents` bucket - should see all PDFs and images
3. Check **Table Editor** - verify data in all tables:
   - profiles (your admin account)
   - rulebooks (5 rulebooks with production URLs)
   - media_files (11 files with production URLs)
   - site_settings (carousel images with production URLs)
   - events

---

## Step 3: Deploy Frontend to Production

### 3.1 Update Frontend Environment Variables

Create `apps/frontend/.env.production`:

```env
VITE_SUPABASE_URL=https://qykahrgwtktqycfgxqep.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get the anon key from: Supabase Dashboard > Settings > API > anon/public key

### 3.2 Build Frontend

```bash
cd apps/frontend
npm run build
```

This creates a production build in `apps/frontend/dist/`

### 3.3 Deploy to Netlify (Recommended)

**Option A: Using Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
cd apps/frontend
netlify deploy --prod
```

**Option B: Using Netlify Dashboard**

1. Go to https://app.netlify.com
2. Click "Add new site" > "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - **Base directory**: `apps/frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `apps/frontend/dist`
5. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`: `https://qykahrgwtktqycfgxqep.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: (your anon key)
6. Click "Deploy site"

### 3.4 Deploy to Vercel (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd apps/frontend
vercel --prod
```

Add environment variables in Vercel dashboard.

---

## Step 4: Post-Deployment Verification

### 4.1 Test Production Site

Visit your production URL (e.g., `https://your-site.netlify.app`) and verify:

- [ ] Homepage loads correctly
- [ ] Carousel images display
- [ ] Login works (admin credentials from environment)
- [ ] Rulebooks page shows all 5 rulebooks
- [ ] Rulebook PDFs download correctly
- [ ] Media library shows all images
- [ ] Events page displays correctly
- [ ] Admin dashboard is accessible

### 4.2 Check Production URLs

Open browser developer tools > Network tab and verify:
- All image URLs point to: `https://qykahrgwtktqycfgxqep.supabase.co/storage/...`
- All PDF URLs point to: `https://qykahrgwtktqycfgxqep.supabase.co/storage/...`
- NOT: `http://127.0.0.1:54321/...`

---

## Troubleshooting

### Files Not Loading in Production

**Problem**: Images or PDFs show 404 errors

**Solution**:
1. Check Supabase Storage dashboard - verify files are uploaded
2. Check bucket permissions - ensure `documents` bucket is public
3. Check URLs in database - run in Supabase SQL editor:
   ```sql
   SELECT pdf_url FROM rulebooks LIMIT 5;
   SELECT file_url FROM media_files LIMIT 5;
   ```
   Should see production URLs, not `127.0.0.1`

### Database Migration Errors

**Problem**: Tables don't exist in production

**Solution**:
```bash
npx supabase link --project-ref qykahrgwtktqycfgxqep
npx supabase db push --include-all
```

### Authentication Issues

**Problem**: Can't log in to production

**Solution**:
1. Check if user exists in production: Supabase Dashboard > Authentication > Users
2. If not, create admin user:
   - Go to Supabase Dashboard > Authentication > Users
   - Click "Add user"
   - Email: james@mecacaraudio.com
   - Password: (use a strong password, do not commit to git)
   - Then insert profile in SQL editor:
   ```sql
   INSERT INTO profiles (id, email, first_name, last_name, meca_id, role)
   VALUES (
     'user-id-from-auth-users',
     'james@mecacaraudio.com',
     'James',
     'Ryan',
     202401,
     'admin'
   );
   ```

---

## Rollback Procedure

If something goes wrong in production:

### Option 1: Restore from Backup

1. Download production database backup from Supabase dashboard
2. Apply fixes locally
3. Re-run deployment script

### Option 2: Quick Fix

1. Fix issue locally
2. Re-run deployment script - it will update production

---

## Environment Summary

| Environment | Database URL | Storage URL | Frontend URL |
|-------------|-------------|-------------|--------------|
| **Local Dev** | http://127.0.0.1:54321 | http://127.0.0.1:54321/storage | http://localhost:5173 |
| **Production** | https://qykahrgwtktqycfgxqep.supabase.co | https://qykahrgwtktqycfgxqep.supabase.co/storage | https://your-site.netlify.app |

---

## Deployment Checklist

- [ ] Create backup: `/backup`
- [ ] Set production environment variables
- [ ] Run database migrations: `npx supabase db push`
- [ ] Run deployment script: `node scripts/deploy-to-production.js`
- [ ] Verify files in production Supabase storage
- [ ] Verify data in production database
- [ ] Update frontend `.env.production`
- [ ] Build frontend: `npm run build`
- [ ] Deploy frontend to Netlify/Vercel
- [ ] Test production site
- [ ] Verify all URLs point to production

---

## Continuous Deployment

For future updates:

1. **Make changes locally** and test thoroughly
2. **Create backup**: `/backup`
3. **Run deployment script**: Updates production with new data/files
4. **Push to Git**: Triggers automatic frontend deployment (if configured)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs: Dashboard > Logs
3. Check browser console for errors
4. Review Network tab for failed requests
