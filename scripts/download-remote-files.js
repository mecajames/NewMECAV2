import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import https from 'https';

const REMOTE_URL = 'https://qykahrgwtktqycfgxqep.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const remote = createClient(REMOTE_URL, REMOTE_KEY);
const local = createClient(LOCAL_URL, LOCAL_KEY);

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function syncBucket(bucketName) {
  console.log(`\n📦 Syncing bucket: ${bucketName}`);

  const { data: files, error } = await remote.storage.from(bucketName).list('', {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (error) {
    console.error(`❌ Error listing ${bucketName}:`, error.message);
    return;
  }

  if (!files || files.length === 0) {
    console.log(`   No files in ${bucketName}`);
    return;
  }

  console.log(`   Found ${files.length} file(s)`);

  for (const file of files) {
    if (file.name === '.emptyFolderPlaceholder') continue;

    try {
      console.log(`   Downloading: ${file.name}`);

      // Get public URL from remote
      const { data: { publicUrl } } = remote.storage.from(bucketName).getPublicUrl(file.name);

      // Download file to temp
      const tempDir = 'E:/MECA Oct 2025/NewMECAV2/temp_downloads';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, file.name.replace(/\//g, '_'));
      await downloadFile(publicUrl, tempPath);

      // Upload to local
      const fileBuffer = fs.readFileSync(tempPath);
      const { error: uploadError } = await local.storage
        .from(bucketName)
        .upload(file.name, fileBuffer, {
          upsert: true,
          contentType: file.metadata?.mimetype || 'application/octet-stream'
        });

      if (uploadError) {
        console.error(`   ❌ Upload error for ${file.name}:`, uploadError.message);
      } else {
        console.log(`   ✅ ${file.name}`);
      }

      // Clean up temp file
      fs.unlinkSync(tempPath);

    } catch (err) {
      console.error(`   ❌ Error with ${file.name}:`, err.message);
    }
  }
}

async function syncBucketRecursive(bucketName, folder = '') {
  console.log(`\n📦 Syncing bucket: ${bucketName}${folder ? '/' + folder : ''}`);

  const { data: files, error } = await remote.storage.from(bucketName).list(folder, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (error) {
    console.error(`❌ Error listing ${bucketName}/${folder}:`, error.message);
    return;
  }

  if (!files || files.length === 0) {
    console.log(`   No files in ${bucketName}/${folder}`);
    return;
  }

  console.log(`   Found ${files.length} item(s)`);

  for (const file of files) {
    if (file.name === '.emptyFolderPlaceholder') continue;

    const fullPath = folder ? `${folder}/${file.name}` : file.name;

    // If it's a folder, recurse
    if (file.id === null) {
      await syncBucketRecursive(bucketName, fullPath);
      continue;
    }

    try {
      console.log(`   Downloading: ${fullPath}`);

      // Download from remote
      const { data: fileData, error: downloadError } = await remote.storage
        .from(bucketName)
        .download(fullPath);

      if (downloadError) {
        console.error(`   ❌ Download error: ${downloadError.message}`);
        continue;
      }

      // Upload to local
      const { error: uploadError } = await local.storage
        .from(bucketName)
        .upload(fullPath, fileData, {
          upsert: true
        });

      if (uploadError) {
        console.error(`   ❌ Upload error: ${uploadError.message}`);
      } else {
        console.log(`   ✅ ${fullPath}`);
      }

    } catch (err) {
      console.error(`   ❌ Error with ${fullPath}:`, err.message);
    }
  }
}

async function main() {
  console.log('🚀 Downloading files from remote Supabase...\n');

  // Sync each bucket
  await syncBucketRecursive('documents');
  await syncBucketRecursive('media');
  await syncBucketRecursive('event-images');

  console.log('\n✅ File sync complete!');
}

main().catch(console.error);
