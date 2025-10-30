/**
 * Deploy to Production Script
 *
 * This script migrates everything from local development to production:
 * 1. Uploads all local storage files to production Supabase storage
 * 2. Exports local database data
 * 3. Updates all URLs from local (127.0.0.1) to production URLs
 * 4. Imports data into production database
 *
 * Usage: node scripts/deploy-to-production.js
 */

import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local Supabase (development)
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Production Supabase (you'll need to update these)
const PROD_URL = process.env.PROD_SUPABASE_URL || 'https://qykahrgwtktqycfgxqep.supabase.co';
const PROD_KEY = process.env.PROD_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

const local = createClient(LOCAL_URL, LOCAL_KEY);
const prod = createClient(PROD_URL, PROD_KEY);

const localDb = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

// Helper function to download file from local storage
async function downloadFromLocal(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

// Helper function to get content type
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const types = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return types[ext] || 'application/octet-stream';
}

// Helper function to extract storage path from URL
function extractStoragePath(url) {
  // Extract path after /storage/v1/object/public/bucket-name/
  const match = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
  if (match) {
    return {
      bucket: match[1],
      path: match[2]
    };
  }
  return null;
}

async function main() {
  console.log('🚀 Starting Production Deployment...\n');
  console.log('📍 Local:      ' + LOCAL_URL);
  console.log('📍 Production: ' + PROD_URL);
  console.log('');

  await localDb.connect();

  // Step 1: Create storage bucket in production if it doesn't exist
  console.log('📦 Step 1: Ensuring storage bucket exists in production...');
  const { data: buckets, error: bucketsError } = await prod.storage.listBuckets();

  if (!buckets?.find(b => b.name === 'documents')) {
    console.log('   Creating "documents" bucket...');
    const { error } = await prod.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    if (error) {
      console.error('   ❌ Error creating bucket:', error);
    } else {
      console.log('   ✅ Bucket created');
    }
  } else {
    console.log('   ✅ Bucket already exists');
  }

  // Step 2: Migrate rulebook PDFs
  console.log('\n📚 Step 2: Migrating rulebook PDFs to production...');
  const { rows: rulebooks } = await localDb.query(
    'SELECT id, pdf_url FROM rulebooks WHERE pdf_url LIKE $1',
    [`${LOCAL_URL}%`]
  );

  const urlMappings = {}; // Track old URL -> new URL mappings

  for (const rb of rulebooks) {
    try {
      const storageInfo = extractStoragePath(rb.pdf_url);
      if (!storageInfo) {
        console.log(`   ⚠️  Skipping invalid URL: ${rb.pdf_url}`);
        continue;
      }

      console.log(`   Uploading: ${path.basename(storageInfo.path)}`);

      // Download from local
      const fileBuffer = await downloadFromLocal(rb.pdf_url);

      // Upload to production
      const { data, error } = await prod.storage
        .from(storageInfo.bucket)
        .upload(storageInfo.path, fileBuffer, {
          contentType: getContentType(storageInfo.path),
          upsert: true
        });

      if (error) {
        console.error(`   ❌ Error uploading ${path.basename(storageInfo.path)}:`, error);
      } else {
        const prodUrl = `${PROD_URL}/storage/v1/object/public/${storageInfo.bucket}/${storageInfo.path}`;
        urlMappings[rb.pdf_url] = prodUrl;
        console.log(`   ✅ Uploaded: ${path.basename(storageInfo.path)}`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to migrate ${rb.pdf_url}:`, err.message);
    }
  }

  // Step 3: Migrate media files
  console.log('\n🖼️  Step 3: Migrating media files to production...');
  const { rows: mediaFiles } = await localDb.query(
    'SELECT id, file_url, title FROM media_files WHERE file_url LIKE $1',
    [`${LOCAL_URL}%`]
  );

  for (const media of mediaFiles) {
    try {
      const storageInfo = extractStoragePath(media.file_url);
      if (!storageInfo) {
        console.log(`   ⚠️  Skipping invalid URL: ${media.file_url}`);
        continue;
      }

      console.log(`   Uploading: ${media.title}`);

      // Download from local
      const fileBuffer = await downloadFromLocal(media.file_url);

      // Upload to production
      const { data, error } = await prod.storage
        .from(storageInfo.bucket)
        .upload(storageInfo.path, fileBuffer, {
          contentType: getContentType(storageInfo.path),
          upsert: true
        });

      if (error) {
        console.error(`   ❌ Error uploading ${media.title}:`, error);
      } else {
        const prodUrl = `${PROD_URL}/storage/v1/object/public/${storageInfo.bucket}/${storageInfo.path}`;
        urlMappings[media.file_url] = prodUrl;
        console.log(`   ✅ Uploaded: ${media.title}`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to migrate ${media.title}:`, err.message);
    }
  }

  // Step 4: Migrate carousel images
  console.log('\n🎠 Step 4: Migrating carousel images to production...');
  const { rows: settings } = await localDb.query(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'hero_image_urls'"
  );

  if (settings.length > 0) {
    const urls = JSON.parse(settings[0].setting_value);
    const newUrls = [];

    for (const url of urls) {
      if (url.includes(LOCAL_URL)) {
        try {
          const storageInfo = extractStoragePath(url);
          if (!storageInfo) {
            console.log(`   ⚠️  Skipping invalid URL: ${url}`);
            newUrls.push(url);
            continue;
          }

          console.log(`   Uploading: ${path.basename(storageInfo.path)}`);

          // Download from local
          const fileBuffer = await downloadFromLocal(url);

          // Upload to production
          const { data, error } = await prod.storage
            .from(storageInfo.bucket)
            .upload(storageInfo.path, fileBuffer, {
              contentType: getContentType(storageInfo.path),
              upsert: true
            });

          if (error) {
            console.error(`   ❌ Error uploading ${path.basename(storageInfo.path)}:`, error);
            newUrls.push(url); // Keep old URL if upload fails
          } else {
            const prodUrl = `${PROD_URL}/storage/v1/object/public/${storageInfo.bucket}/${storageInfo.path}`;
            urlMappings[url] = prodUrl;
            newUrls.push(prodUrl);
            console.log(`   ✅ Uploaded: ${path.basename(storageInfo.path)}`);
          }
        } catch (err) {
          console.error(`   ❌ Failed to migrate ${url}:`, err.message);
          newUrls.push(url);
        }
      } else {
        // Keep external URLs (like pexels.com)
        newUrls.push(url);
      }
    }
  }

  // Step 5: Export database data with updated URLs
  console.log('\n💾 Step 5: Exporting data with production URLs...');

  const tables = [
    'profiles',
    'rulebooks',
    'media_files',
    'site_settings',
    'events',
    'event_registrations',
    'competition_results',
    'hero_carousel_items',
    'orders',
    'teams',
    'team_members',
    'notifications',
    'memberships'
  ];

  const exportData = {};

  for (const table of tables) {
    try {
      const { rows } = await localDb.query(`SELECT * FROM ${table}`);

      // Update URLs in the data
      const updatedRows = rows.map(row => {
        const newRow = { ...row };

        // Update any field that contains a local URL
        Object.keys(newRow).forEach(key => {
          if (typeof newRow[key] === 'string' && newRow[key].includes(LOCAL_URL)) {
            // Replace local URL with production URL
            Object.entries(urlMappings).forEach(([localUrl, prodUrl]) => {
              if (newRow[key] === localUrl) {
                newRow[key] = prodUrl;
              }
            });
          }

          // Handle JSON fields with URLs (like hero_image_urls)
          if (key === 'setting_value' && table === 'site_settings') {
            try {
              const parsed = JSON.parse(newRow[key]);
              if (Array.isArray(parsed)) {
                const updated = parsed.map(item => {
                  if (typeof item === 'string' && item.includes(LOCAL_URL)) {
                    return urlMappings[item] || item.replace(LOCAL_URL, PROD_URL);
                  }
                  return item;
                });
                newRow[key] = JSON.stringify(updated);
              }
            } catch (e) {
              // Not JSON, skip
            }
          }
        });

        return newRow;
      });

      exportData[table] = updatedRows;
      console.log(`   ✅ Exported ${updatedRows.length} rows from ${table}`);
    } catch (err) {
      console.log(`   ⚠️  Skipping ${table}:`, err.message);
    }
  }

  // Step 6: Save export data to file
  const exportDir = './backups/production-export';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportFile = path.join(exportDir, `production-data-${timestamp}.json`);

  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  console.log(`\n📄 Data export saved to: ${exportFile}`);

  // Step 7: Import data to production (using Supabase client)
  console.log('\n📤 Step 6: Importing data to production database...');

  for (const [table, rows] of Object.entries(exportData)) {
    if (rows.length === 0) continue;

    try {
      // Skip auth.users table - handle separately
      if (table === 'profiles') {
        console.log(`   Importing ${rows.length} rows into ${table}...`);

        for (const row of rows) {
          const { error } = await prod.from(table).upsert(row, {
            onConflict: 'id'
          });

          if (error) {
            console.error(`   ❌ Error importing row to ${table}:`, error);
          }
        }
        console.log(`   ✅ Imported ${rows.length} rows to ${table}`);
      } else {
        const { error } = await prod.from(table).upsert(rows, {
          onConflict: 'id'
        });

        if (error) {
          console.error(`   ❌ Error importing to ${table}:`, error);
        } else {
          console.log(`   ✅ Imported ${rows.length} rows to ${table}`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Failed to import ${table}:`, err.message);
    }
  }

  await localDb.end();

  console.log('\n✅ Production deployment complete!\n');
  console.log('📋 Summary:');
  console.log(`   - Files uploaded to production storage`);
  console.log(`   - URLs updated from local to production`);
  console.log(`   - Data exported to: ${exportFile}`);
  console.log(`   - Data imported to production database`);
  console.log('\n📍 Next Steps:');
  console.log('   1. Verify data in production Supabase dashboard');
  console.log('   2. Test production URLs for files');
  console.log('   3. Update frontend .env.production with production Supabase URL');
  console.log('   4. Deploy frontend to production (Netlify/Vercel)');
  console.log('\n🌐 Production URL: ' + PROD_URL);
}

main().catch(console.error);
