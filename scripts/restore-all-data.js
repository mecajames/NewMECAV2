import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Client } = pkg;

const REMOTE_URL = 'https://qykahrgwtktqycfgxqep.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

const remote = createClient(REMOTE_URL, REMOTE_KEY);

const localDb = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

async function main() {
  await localDb.connect();
  console.log('🚀 Restoring all data from remote to local...\n');

  // 1. Restore rulebooks
  console.log('📚 Restoring rulebooks...');
  const { data: rulebooks } = await remote.from('rulebooks').select('*');
  if (rulebooks && rulebooks.length > 0) {
    for (const rb of rulebooks) {
      const year = parseInt(rb.season) || 2025;
      const isActive = rb.status === 'active';
      await localDb.query(
        `INSERT INTO rulebooks (id, title, category, year, pdf_url, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           year = EXCLUDED.year,
           pdf_url = EXCLUDED.pdf_url,
           is_active = EXCLUDED.is_active`,
        [rb.id, rb.title, rb.category, year, rb.pdf_url, isActive, rb.created_at, rb.updated_at]
      );
    }
    console.log(`   ✅ Restored ${rulebooks.length} rulebooks`);
  }

  // 2. Restore site_settings
  console.log('\n⚙️  Restoring site settings...');
  const { data: settings } = await remote.from('site_settings').select('*');
  if (settings && settings.length > 0) {
    for (const setting of settings) {
      await localDb.query(
        `INSERT INTO site_settings (id, setting_key, setting_value, description, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (setting_key) DO UPDATE SET
           setting_value = EXCLUDED.setting_value,
           description = EXCLUDED.description,
           updated_at = EXCLUDED.updated_at`,
        [setting.id, setting.setting_key, setting.setting_value, setting.description, setting.updated_at, setting.updated_by]
      );
    }
    console.log(`   ✅ Restored ${settings.length} site settings`);
  }

  // 3. Restore media_library (if table name differs, try media_files)
  console.log('\n🖼️  Restoring media library...');
  const { data: media } = await remote.from('media_library').select('*');
  if (media && media.length > 0) {
    // Check if local has media_files table
    const tableCheck = await localDb.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('media_library', 'media_files')`
    );
    const tableName = tableCheck.rows.find(r => r.table_name === 'media_library') ? 'media_library' :
                      tableCheck.rows.find(r => r.table_name === 'media_files') ? 'media_files' : null;

    if (tableName) {
      for (const m of media) {
        await localDb.query(
          `INSERT INTO ${tableName} (id, file_name, file_url, file_type, file_size, uploaded_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             file_name = EXCLUDED.file_name,
             file_url = EXCLUDED.file_url`,
          [m.id, m.file_name, m.file_url, m.file_type, m.file_size, m.uploaded_by, m.created_at]
        );
      }
      console.log(`   ✅ Restored ${media.length} media files`);
    } else {
      console.log(`   ⚠️  No media table found in local database`);
    }
  }

  // 4. Restore hero_carousel_items
  console.log('\n🎠 Restoring hero carousel items...');
  const { data: carousel } = await remote.from('hero_carousel_items').select('*');
  if (carousel && carousel.length > 0) {
    // Check if table exists
    const tableCheck = await localDb.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='hero_carousel_items'`
    );

    if (tableCheck.rows.length > 0) {
      for (const item of carousel) {
        await localDb.query(
          `INSERT INTO hero_carousel_items (id, title, subtitle, image_url, link_url, display_order, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             subtitle = EXCLUDED.subtitle,
             image_url = EXCLUDED.image_url,
             link_url = EXCLUDED.link_url,
             display_order = EXCLUDED.display_order,
             is_active = EXCLUDED.is_active`,
          [item.id, item.title, item.subtitle, item.image_url, item.link_url, item.display_order, item.is_active, item.created_at, item.updated_at]
        );
      }
      console.log(`   ✅ Restored ${carousel.length} carousel items`);
    } else {
      console.log(`   ⚠️  hero_carousel_items table not found in local database`);
    }
  }

  await localDb.end();
  console.log('\n✅ All data restored successfully!');
}

main().catch(console.error);
