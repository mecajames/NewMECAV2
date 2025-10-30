import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://qykahrgwtktqycfgxqep.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setup() {
  console.log('Setting up Supabase...\n');

  // Read SQL file
  const sql = fs.readFileSync('./supabase-schema.sql', 'utf8');

  try {
    // Execute SQL using PostgREST
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    console.log('SQL execution response status:', response.status);

    // Try creating storage bucket
    console.log('\nCreating storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 52428800
    });

    if (bucketError) {
      if (bucketError.message?.includes('already exists')) {
        console.log('✓ Storage bucket already exists');
      } else {
        console.log('Bucket error:', bucketError);
      }
    } else {
      console.log('✓ Storage bucket created');
    }

    // List existing buckets
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log('\nExisting buckets:', buckets?.map(b => b.name).join(', '));

  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n⚠️  SQL execution via API may not work.');
  console.log('Please manually run the SQL:');
  console.log('1. Go to: https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep/sql');
  console.log('2. Create new query');
  console.log('3. Paste contents of supabase-schema.sql');
  console.log('4. Click Run');
}

setup();
