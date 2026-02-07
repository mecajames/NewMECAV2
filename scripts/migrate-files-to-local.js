import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
import https from 'https';
import fs from 'fs';
import path from 'path';
const { Client } = pkg;

const REMOTE_URL = 'https://qykahrgwtktqycfgxqep.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const remote = createClient(REMOTE_URL, REMOTE_KEY);
const local = createClient(LOCAL_URL, LOCAL_KEY);

const localDb = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

// Download file from URL
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Upload file to local Supabase storage
async function uploadToLocal(filepath, storagePath, bucket) {
  const fileBuffer = fs.readFileSync(filepath);
  const fileName = path.basename(storagePath);

  const { data, error } = await local.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: getContentType(fileName),
      upsert: true
    });

  if (error) {
    console.error(`Error uploading ${fileName}:`, error);
    return null;
  }

  return `${LOCAL_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const types = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };
  return types[ext] || 'application/octet-stream';
}

async function main() {
  await localDb.connect();
  console.log('🔄 Migrating files from remote to local storage...\n');

  // Create temp directory for downloads
  const tempDir = './temp_downloads';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // 1. Migrate rulebook PDFs
  console.log('📚 Migrating rulebook PDFs...');
  const { rows: rulebooks } = await localDb.query('SELECT id, pdf_url FROM rulebooks WHERE pdf_url LIKE $1', [`${REMOTE_URL}%`]);

  for (const rb of rulebooks) {
    try {
      console.log(`  Downloading: ${path.basename(rb.pdf_url)}`);
      const fileName = path.basename(rb.pdf_url);
      const tempPath = path.join(tempDir, fileName);

      await downloadFile(rb.pdf_url, tempPath);

      const storagePath = `rulebooks/${fileName}`;
      const localUrl = await uploadToLocal(tempPath, storagePath, 'documents');

      if (localUrl) {
        await localDb.query('UPDATE rulebooks SET pdf_url = $1 WHERE id = $2', [localUrl, rb.id]);
        console.log(`  ✅ Migrated: ${fileName}`);
      }

      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error(`  ❌ Failed to migrate ${rb.pdf_url}:`, err.message);
    }
  }

  // 2. Migrate media files
  console.log('\n🖼️  Migrating media files...');
  const { rows: mediaFiles } = await localDb.query('SELECT id, file_url, title FROM media_files WHERE file_url LIKE $1', [`${REMOTE_URL}%`]);

  for (const media of mediaFiles) {
    try {
      console.log(`  Downloading: ${media.title}`);
      const fileName = path.basename(media.file_url);
      const tempPath = path.join(tempDir, fileName);

      await downloadFile(media.file_url, tempPath);

      const storagePath = `media/${fileName}`;
      const localUrl = await uploadToLocal(tempPath, storagePath, 'documents');

      if (localUrl) {
        await localDb.query('UPDATE media_files SET file_url = $1 WHERE id = $2', [localUrl, media.id]);
        console.log(`  ✅ Migrated: ${media.title}`);
      }

      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error(`  ❌ Failed to migrate ${media.title}:`, err.message);
    }
  }

  // 3. Migrate carousel images
  console.log('\n🎠 Migrating carousel images...');
  const { rows: settings } = await localDb.query("SELECT setting_value FROM site_settings WHERE setting_key = 'hero_image_urls'");

  if (settings.length > 0) {
    const urls = JSON.parse(settings[0].setting_value);
    const newUrls = [];

    for (const url of urls) {
      if (url.includes(REMOTE_URL)) {
        try {
          console.log(`  Downloading: ${path.basename(url)}`);
          const fileName = path.basename(url);
          const tempPath = path.join(tempDir, fileName);

          await downloadFile(url, tempPath);

          const storagePath = `media/${fileName}`;
          const localUrl = await uploadToLocal(tempPath, storagePath, 'documents');

          if (localUrl) {
            newUrls.push(localUrl);
            console.log(`  ✅ Migrated: ${fileName}`);
          } else {
            newUrls.push(url);
          }

          fs.unlinkSync(tempPath);
        } catch (err) {
          console.error(`  ❌ Failed to migrate ${url}:`, err.message);
          newUrls.push(url); // Keep original URL if migration fails
        }
      } else {
        newUrls.push(url); // Keep external URLs (like pexels.com)
      }
    }

    await localDb.query("UPDATE site_settings SET setting_value = $1 WHERE setting_key = 'hero_image_urls'", [JSON.stringify(newUrls)]);
  }

  // Cleanup
  fs.rmdirSync(tempDir, { recursive: true });

  await localDb.end();
  console.log('\n✅ All files migrated to local storage!');
  console.log('\n📋 Summary:');
  console.log(`   - Rulebooks: ${rulebooks.length} PDFs`);
  console.log(`   - Media files: ${mediaFiles.length} files`);
  console.log(`   - All URLs updated to point to local storage`);
}

main().catch(console.error);
