---
description: Create a complete backup/restore point (database + files)
---

Create a complete backup with timestamp including BOTH database AND storage files. This will:

1. Run the script: bash scripts/complete-backup.sh
2. This creates a backup folder with:
   - database.sql (all database tables and data)
   - storage/ directory (all PDFs, images, and files from Supabase storage)
   - manifest.txt (backup information and restore instructions)
   - Compressed .tar.gz archive of everything
3. Verify the backup contains all critical data:
   - Your user account (james@mecacaraudio.com)
   - All rulebooks (database records AND PDF files)
   - All site settings
   - All events
   - All media files (database records AND actual image/PDF files)
   - All other tables
4. Show the backup archive name, size, and location
5. List all available complete backups

IMPORTANT: This backup includes the ACTUAL FILES (PDFs, images) stored locally in Supabase storage, not just the database URLs. This is a COMPLETE backup that can restore everything.

After creating the backup, provide the exact command the user can use to restore from this specific backup point.
