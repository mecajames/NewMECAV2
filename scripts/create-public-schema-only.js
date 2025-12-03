const fs = require('fs');
const path = require('path');

console.log('🔧 Creating public schema only SQL file...\n');

// Read the clean backup
const backupPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'backup_clean.sql');
const sqlContent = fs.readFileSync(backupPath, 'utf8');

const lines = sqlContent.split('\n');
const output = [];

let inPublicSchema = false;
let inCopyBlock = false;
let currentTable = '';
let copyColumns = [];
let skipLine = false;

// Schemas to skip (Supabase-managed)
const skipSchemas = [
  'CREATE SCHEMA _realtime',
  'CREATE SCHEMA auth',
  'CREATE SCHEMA extensions',
  'CREATE SCHEMA graphql',
  'CREATE SCHEMA graphql_public',
  'CREATE SCHEMA pgbouncer',
  'CREATE SCHEMA realtime',
  'CREATE SCHEMA storage',
  'CREATE SCHEMA pgsodium',
  'CREATE SCHEMA vault',
  'CREATE SCHEMA supabase_functions',
  'ALTER SCHEMA _realtime',
  'ALTER SCHEMA auth',
  'ALTER SCHEMA extensions',
  'ALTER SCHEMA graphql',
  'ALTER SCHEMA graphql_public',
  'ALTER SCHEMA pgbouncer',
  'ALTER SCHEMA realtime',
  'ALTER SCHEMA storage',
  'ALTER SCHEMA pgsodium',
  'ALTER SCHEMA vault',
  'ALTER SCHEMA supabase_functions'
];

// Extensions to skip
const skipExtensions = [
  'CREATE EXTENSION',
  'COMMENT ON EXTENSION'
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Skip Supabase-managed schemas
  if (skipSchemas.some(schema => line.includes(schema))) {
    skipLine = true;
    continue;
  }

  // Skip extensions
  if (skipExtensions.some(ext => line.includes(ext))) {
    skipLine = true;
    continue;
  }

  // Skip auth, storage, realtime schema operations
  if (line.match(/^(CREATE|ALTER|DROP|GRANT|REVOKE).*(auth\.|storage\.|realtime\.|_realtime\.|extensions\.|graphql\.|pgbouncer\.|pgsodium\.|vault\.|supabase_functions\.)/)) {
    skipLine = true;
    continue;
  }

  // Skip COPY commands for non-public schemas
  if (line.match(/^COPY (auth\.|storage\.|realtime\.|_realtime\.|extensions\.|graphql\.|pgbouncer\.)/)) {
    inCopyBlock = true;
    skipLine = true;
    continue;
  }

  // Detect COPY command for public schema
  const copyMatch = line.match(/^COPY public\.(\w+) \((.*)\) FROM stdin;$/);
  if (copyMatch) {
    inCopyBlock = true;
    currentTable = copyMatch[1];
    copyColumns = copyMatch[2].split(', ').map(col => col.trim());
    skipLine = false;
    continue; // Don't output the COPY line
  }

  // End of COPY block
  if (line === '\\.') {
    inCopyBlock = false;
    currentTable = '';
    copyColumns = [];
    skipLine = false;
    continue;
  }

  // Convert COPY data to INSERT statements
  if (inCopyBlock && !skipLine && currentTable && line.trim()) {
    // Parse tab-separated values
    const values = line.split('\t');

    // Convert \\N to NULL and escape single quotes
    const formattedValues = values.map(val => {
      if (val === '\\N') return 'NULL';
      // Escape single quotes and wrap in quotes
      const escaped = val.replace(/'/g, "''");
      return `'${escaped}'`;
    });

    const insertStmt = `INSERT INTO public.${currentTable} (${copyColumns.join(', ')}) VALUES (${formattedValues.join(', ')});`;
    output.push(insertStmt);
    continue;
  }

  // Reset skip flag if we hit a new statement
  if (trimmed.startsWith('--') || trimmed.startsWith('CREATE') || trimmed.startsWith('ALTER') || trimmed.startsWith('SET')) {
    skipLine = false;
  }

  // Add line if not skipping and not in a skip block
  if (!skipLine && !inCopyBlock) {
    output.push(line);
  }
}

// Write the output
const outputPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'public_schema_only.sql');
const outputContent = output.join('\n');

fs.writeFileSync(outputPath, outputContent);

console.log(`✅ Created: public_schema_only.sql`);
console.log(`   Size: ${Math.round(outputContent.length / 1024)}KB`);
console.log(`   Lines: ${output.length}`);
console.log('');
console.log('📋 This file contains:');
console.log('   - Only public schema objects');
console.log('   - INSERT statements instead of COPY');
console.log('   - No Supabase system schemas');
console.log('');
console.log('🚀 Ready to import to Supabase SQL Editor!');
