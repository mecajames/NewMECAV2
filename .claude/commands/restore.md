---
description: Restore database from a backup point
---

Restore the database from a specific backup file. The user can specify either:
- A date/time like "10-23-2025 at 11:44" or "2025-10-23 11:44"
- A backup file number from the list
- The exact filename like "backup_20251023_114431.sql"

Steps to perform:
1. List all available backups with numbers, dates, and sizes
2. If user didn't specify which backup, ask them to choose
3. Confirm with the user before restoring (show what will be restored)
4. Stop Supabase
5. Start Supabase fresh
6. Clean the database schema
7. Restore from the selected backup file
8. Verify restoration by checking:
   - User account (james@mecacaraudio.com, MECA ID 202401)
   - Rulebooks count
   - Events count
   - Site settings count
   - Media files count
9. Show login credentials and frontend URL

IMPORTANT: Always confirm with user before proceeding with restoration, as this will overwrite current database.
