/**
 * Run this script to set up the Supabase database schema
 * Usage: node setup-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qykahrgwtktqycfgxqep.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Get your service role key from: https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep/settings/api');
  console.error('\nUsage: SUPABASE_SERVICE_ROLE_KEY=your_key_here node setup-supabase.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const schema = fs.readFileSync('./supabase-schema.sql', 'utf8');

async function setupDatabase() {
  console.log('Setting up Supabase database...\n');

  try {
    // Execute the SQL schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema });

    if (error) {
      // If rpc doesn't exist, try using the SQL directly via HTTP
      console.log('Attempting to execute SQL schema...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: schema })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    console.log('✓ Database schema created successfully');

    // Create storage bucket
    console.log('\nCreating storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✓ Storage bucket already exists');
      } else {
        console.error('✗ Error creating storage bucket:', bucketError.message);
      }
    } else {
      console.log('✓ Storage bucket created successfully');
    }

    console.log('\n✓ Supabase setup complete!');
    console.log('\nNext steps:');
    console.log('1. Verify tables in Supabase dashboard: https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep/editor');
    console.log('2. Check storage bucket: https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep/storage/buckets');
    console.log('3. Set up storage policies using the SQL in SUPABASE_SETUP.md');

  } catch (error) {
    console.error('\n✗ Error setting up database:', error.message);
    console.error('\nPlease run the SQL manually:');
    console.error('1. Go to https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep/sql');
    console.error('2. Copy and paste the contents of supabase-schema.sql');
    console.error('3. Click Run');
    console.error('\nThen create the storage bucket manually as described in SUPABASE_SETUP.md');
  }
}

setupDatabase();
