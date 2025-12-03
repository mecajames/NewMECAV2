const fs = require('fs');
const path = require('path');

console.log('🔧 Extracting only table definitions...\n');

// Read the backup
const backupPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'backup_clean.sql');
const sqlContent = fs.readFileSync(backupPath, 'utf8');

const lines = sqlContent.split('\n');
const output = [];

let inPublicTable = false;
let inPublicType = false;
let inPublicSequence = false;
let inCopyBlock = false;
let currentTableDef = [];
let currentTypeDef = [];
let currentSequenceDef = [];
let skipUntilSemicolon = false;

// Add basic setup
output.push('-- Import for Supabase Production');
output.push('-- Only public schema tables');
output.push('');
output.push('SET statement_timeout = 0;');
output.push('SET client_encoding = \'UTF8\';');
output.push('');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Start of a public sequence
  if (line.match(/^CREATE SEQUENCE public\./)) {
    inPublicSequence = true;
    currentSequenceDef = [line];
    continue;
  }

  // Continue building sequence definition
  if (inPublicSequence) {
    currentSequenceDef.push(line);

    // End of sequence definition (blank line or semicolon)
    if (trimmed === '' || trimmed.endsWith(';')) {
      inPublicSequence = false;
      output.push(...currentSequenceDef);
      output.push('');
      currentSequenceDef = [];
    }
    continue;
  }

  // Start of a public enum type
  if (line.match(/^CREATE TYPE public\./)) {
    inPublicType = true;
    currentTypeDef = [line];
    continue;
  }

  // Continue building type definition
  if (inPublicType) {
    currentTypeDef.push(line);

    // End of type definition
    if (trimmed === ');') {
      inPublicType = false;
      output.push(...currentTypeDef);
      output.push('');
      currentTypeDef = [];
    }
    continue;
  }

  // Start of a public table
  if (line.match(/^CREATE TABLE public\.\w+/)) {
    inPublicTable = true;
    currentTableDef = [line];
    continue;
  }

  // Continue building table definition
  if (inPublicTable) {
    currentTableDef.push(line);

    // End of table definition
    if (trimmed === ');') {
      inPublicTable = false;
      output.push(...currentTableDef);
      output.push('');
      currentTableDef = [];
    }
    continue;
  }

  // Handle indexes for public tables
  if (line.match(/^CREATE.*INDEX.*ON public\./)) {
    output.push(line);
    output.push('');
    continue;
  }

  // Handle foreign key constraints
  if (line.match(/^ALTER TABLE.*public\..*ADD CONSTRAINT.*FOREIGN KEY/)) {
    output.push(line);
    continue;
  }

  // Handle primary key constraints
  if (line.match(/^ALTER TABLE.*public\..*ADD CONSTRAINT.*PRIMARY KEY/)) {
    output.push(line);
    continue;
  }

  // Handle unique constraints
  if (line.match(/^ALTER TABLE.*public\..*ADD CONSTRAINT.*UNIQUE/)) {
    output.push(line);
    continue;
  }

  // Handle table ownership
  if (line.match(/^ALTER TABLE.*public\..*OWNER TO/)) {
    output.push(line);
    output.push('');
    continue;
  }

  // Handle sequence ownership (after sequence is created)
  if (line.match(/^ALTER SEQUENCE.*public\..*OWNED BY public\./)) {
    output.push(line);
    output.push('');
    continue;
  }

  // Skip everything else (functions, triggers, etc.)
}

// Write schema file
const schemaPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'schema_tables_only.sql');
fs.writeFileSync(schemaPath, output.join('\n'));

console.log(`✅ Created: schema_tables_only.sql`);
console.log(`   Size: ${Math.round(output.join('\n').length / 1024)}KB`);
console.log(`   Lines: ${output.length}`);
console.log('');
console.log('📋 This file contains:');
console.log('   - Only CREATE TABLE statements');
console.log('   - Table constraints');
console.log('   - Indexes');
console.log('   - No functions, triggers, or views');
console.log('');
console.log('🚀 Ready to import!');
