# Continue Restoration After Restart

## Current Status
- **Issue Found**: Your profile was missing from the database, causing login issues. Rulebooks and images are also missing.
- **Backup Selected**: `complete_20251023_125335` (Oct 23, 2025 at 12:53 PM)
- **Backup Location**: `E:\MECA Oct 2025\NewMECAV2\backups\complete_20251023_125335\`

## What Will Be Restored
✅ **5 Rulebooks:**
- 2025 SPL Rulebook
- 2025 SQL Rulebook
- 2025 MECA Kids Rulebook
- 2025 Dueling Demos Rulebook
- 2025 Ride the Light Rulebook

✅ **11 Media Files** (images and PDFs)

✅ **Your Admin Account:**
- Email: james@mecacaraudio.com
- MECA ID: 202401
- Role: admin
- Password: (your existing password)

---

## Step-by-Step Restoration Process

### 1. Verify Docker is Running
```bash
docker ps
```
Should show running containers. If not, start Docker Desktop first.

### 2. Check Supabase Status
```bash
npx supabase status
```
Should show Supabase is running on port 54321 (API) and 54322 (Database).

### 3. Stop Supabase (Clean Shutdown)
```bash
npx supabase stop
```

### 4. Start Supabase Fresh
```bash
npx supabase start
```
Wait for it to fully start (may take 30-60 seconds).

### 5. Restore Database from Backup
```bash
cat backups/complete_20251023_125335/database.sql | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres
```

### 6. Restore Storage Files from Backup
```bash
docker cp backups/complete_20251023_125335/storage/. supabase_storage_NewMECAV2:/var/lib/storage/
```

### 7. Restart Storage Container (to recognize new files)
```bash
docker restart supabase_storage_NewMECAV2
```

---

## Verification Steps

### Check User Account
```bash
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT id, email, role, meca_id FROM profiles;"
```
**Expected Result**: Should show james@mecacaraudio.com with role 'admin' and meca_id '202401'

### Check Rulebooks
```bash
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) as rulebook_count FROM rulebooks;"
```
**Expected Result**: Should show 5 rulebooks

### Check Media Files
```bash
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) as media_count FROM media_files;"
```
**Expected Result**: Should show 11 media files

### Check Events
```bash
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) as event_count FROM events;"
```

### Check Site Settings
```bash
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) as settings_count FROM site_settings;"
```

---

## Access Information

### Frontend URL
```
http://localhost:5173
```

### Backend API URL
```
http://localhost:3000/api
```

### Supabase Studio (Database Admin)
```
http://localhost:54323
```

### Login Credentials
- **Email**: james@mecacaraudio.com
- **Password**: (your existing password - should still work)
- **Role**: Admin

---

## If You Encounter Issues

### Issue: Docker containers not found
**Solution**: Supabase needs to be started first
```bash
npx supabase start
```

### Issue: Profile still missing after restore
**Solution**: Manually create the profile
```bash
docker exec supabase_db_NewMECAV2 psql -U postgres -c "INSERT INTO public.profiles (id, email, full_name, first_name, last_name, role, membership_status, meca_id, billing_street, billing_city, billing_state, billing_zip, billing_country, shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country, use_billing_for_shipping) VALUES ('3ae12d0d-e446-470b-9683-0546a85bed93', 'james@mecacaraudio.com', 'James Ryan', 'James', 'Ryan', 'admin', 'active', '202401', '202 E. Maurice Linton Rd.', 'Perry', 'Florida', '32347', 'USA', '202 E. Maurice Linton Rd.', 'Perry', 'Florida', '32347', 'USA', false);"
```

### Issue: Storage files not accessible
**Solution**: Check storage permissions and restart storage container
```bash
docker exec supabase_storage_NewMECAV2 ls -la /var/lib/storage/mnt/stub/stub/documents/
docker restart supabase_storage_NewMECAV2
```

### Issue: Rulebooks showing but PDFs not loading
**Solution**: Storage bucket paths may need to be updated. Check storage status:
```bash
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT * FROM storage.buckets;"
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT name, bucket_id FROM storage.objects LIMIT 20;"
```

---

## Quick Command Reference

### Start Backend (NestJS)
```bash
npm run dev:backend
```

### Start Frontend (React + Vite)
```bash
npm run dev:frontend
```

### View All Supabase Containers
```bash
docker ps --filter "label=com.supabase.cli.project=NewMECAV2"
```

### View Database Logs
```bash
docker logs supabase_db_NewMECAV2 --tail 50
```

### View Storage Logs
```bash
docker logs supabase_storage_NewMECAV2 --tail 50
```

---

## Complete Restoration Script (All-in-One)

If you want to run everything at once after restart:

```bash
# Stop Supabase
npx supabase stop

# Start fresh
npx supabase start

# Wait for startup
sleep 10

# Restore database
cat backups/complete_20251023_125335/database.sql | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres

# Restore storage
docker cp backups/complete_20251023_125335/storage/. supabase_storage_NewMECAV2:/var/lib/storage/

# Restart storage
docker restart supabase_storage_NewMECAV2

# Verify restoration
echo "=== Checking User Account ==="
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT id, email, role, meca_id FROM profiles;"

echo "=== Checking Rulebooks ==="
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) as rulebook_count FROM rulebooks;"

echo "=== Checking Media Files ==="
docker exec supabase_db_NewMECAV2 psql -U postgres -c "SELECT COUNT(*) as media_count FROM media_files;"

echo "=== Restoration Complete ==="
echo "Frontend: http://localhost:5173"
echo "Login: james@mecacaraudio.com"
```

---

## Notes
- Database backup size: 264K
- Storage backup size: 11MB
- Total restoration time: ~2-3 minutes
- Your password remains unchanged from the backup
- All data from Oct 23, 2025 at 12:53 PM will be restored
