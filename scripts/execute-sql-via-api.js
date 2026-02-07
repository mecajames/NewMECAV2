const https = require('https');

console.log('🔌 Executing SQL via Supabase HTTP API\n');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

// All the SQL we need to run
const SQL_STATEMENTS = `
CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS competition_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text NOT NULL,
  format text NOT NULL,
  season_id uuid,
  is_active boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS season_id uuid;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'standard';
ALTER TABLE events ADD COLUMN IF NOT EXISTS points_multiplier numeric(3,2) DEFAULT 1.0;

ALTER TABLE competition_results ADD COLUMN IF NOT EXISTS class_id uuid;
ALTER TABLE competition_results ADD COLUMN IF NOT EXISTS format_id uuid;
ALTER TABLE competition_results ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE TABLE IF NOT EXISTS rulebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  year integer NOT NULL,
  category text,
  description text,
  file_url text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  display_order integer,
  summary_points jsonb,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS event_hosting_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  organization_name text,
  event_name text NOT NULL,
  preferred_date date,
  venue_name text,
  venue_address text,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text,
  country text DEFAULT 'US',
  expected_participants integer,
  event_description text,
  additional_info text,
  status text DEFAULT 'pending',
  admin_notes text,
  recaptcha_token text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS mikro_orm_migrations (
  id integer PRIMARY KEY,
  name varchar(255),
  executed_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  uploaded_by uuid,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);
`;

// Try multiple API endpoints
const endpoints = [
  '/rest/v1/rpc/exec',
  '/rest/v1/rpc/exec_sql',
  '/rest/v1/rpc/execute_sql',
  '/database/sql',
  '/sql'
];

let attemptIndex = 0;

function tryExecuteSQL() {
  if (attemptIndex >= endpoints.length) {
    console.log('\n❌ All API endpoints failed.\n');
    console.log('📋 The SQL needs to be run manually in Supabase SQL Editor.\n');
    console.log('File: CRITICAL_SQL_RUN_THIS.sql\n');
    process.exit(1);
  }

  const endpoint = endpoints[attemptIndex];
  console.log(`\n🔌 Attempt ${attemptIndex + 1}/${endpoints.length}: POST ${endpoint}`);

  const postData = JSON.stringify({
    query: SQL_STATEMENTS,
    sql: SQL_STATEMENTS,
    sql_query: SQL_STATEMENTS
  });

  const options = {
    hostname: 'qykahrgwtktqycfgxqep.supabase.co',
    port: 443,
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);

      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log(`   ✅ Success!`);
        console.log(`   Response:`, data.substring(0, 200));
        console.log('\n🎉 Schema created successfully!\n');
        process.exit(0);
      } else if (res.statusCode === 404) {
        console.log(`   ❌ Endpoint not found`);
        attemptIndex++;
        setTimeout(tryExecuteSQL, 300);
      } else {
        console.log(`   ❌ Failed: ${data.substring(0, 200)}`);
        attemptIndex++;
        setTimeout(tryExecuteSQL, 300);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`   ❌ Error: ${error.message}`);
    attemptIndex++;
    setTimeout(tryExecuteSQL, 300);
  });

  req.write(postData);
  req.end();
}

tryExecuteSQL();
