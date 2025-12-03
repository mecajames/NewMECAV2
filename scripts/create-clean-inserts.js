const fs = require('fs');
const path = require('path');

console.log('🔧 Creating clean INSERT statements from backup...\n');

// Read the clean backup
const backupPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'backup_clean.sql');
const sqlContent = fs.readFileSync(backupPath, 'utf8');

const lines = sqlContent.split('\n');
const output = [];

let inCopyBlock = false;
let currentTable = '';
let currentColumns = [];
let copyBuffer = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect COPY command for public schema
  const copyMatch = line.match(/^COPY public\.(\w+) \((.*)\) FROM stdin;$/);
  if (copyMatch) {
    inCopyBlock = true;
    currentTable = copyMatch[1];
    currentColumns = copyMatch[2].split(', ').map(col => col.trim());
    copyBuffer = [];
    continue;
  }

  // End of COPY block
  if (line === '\\.') {
    // Process accumulated COPY data
    console.log(`Processing ${currentTable}: ${copyBuffer.length} rows`);

    for (const row of copyBuffer) {
      // Split by tabs (COPY uses tab-separated values)
      const values = row.split('\t');

      if (values.length !== currentColumns.length) {
        console.warn(`  Warning: Row has ${values.length} values but expected ${currentColumns.length}`);
        continue;
      }

      // Convert each value
      const formattedValues = values.map((val, idx) => {
        // Handle NULL
        if (val === '\\N' || val === '') {
          return 'NULL';
        }

        // Handle boolean values
        if (val === 't') return 'true';
        if (val === 'f') return 'false';

        // Check if this column is JSONB (don't double-escape backslashes)
        const columnName = currentColumns[idx];
        const isJsonColumn = columnName && (
          columnName.includes('content') ||
          columnName.includes('data') ||
          columnName.includes('metadata') ||
          columnName.includes('summary_points')
        );

        // For JSON columns, only escape single quotes (PostgreSQL handles the rest)
        if (isJsonColumn) {
          let escaped = val.replace(/'/g, "''");
          return `'${escaped}'`;
        }

        // For regular columns, escape backslashes and single quotes
        let escaped = val
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "''");

        return `'${escaped}'`;
      });

      const insertStmt = `INSERT INTO public.${currentTable} (${currentColumns.join(', ')}) VALUES (${formattedValues.join(', ')});`;
      output.push(insertStmt);
    }

    inCopyBlock = false;
    currentTable = '';
    currentColumns = [];
    copyBuffer = [];
    continue;
  }

  // Accumulate COPY data
  if (inCopyBlock) {
    copyBuffer.push(line);
    continue;
  }
}

// Write the output
const outputPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'data_inserts_clean.sql');
const outputContent = output.join('\n');

fs.writeFileSync(outputPath, outputContent);

console.log(`\n✅ Created: data_inserts_clean.sql`);
console.log(`   Size: ${Math.round(outputContent.length / 1024)}KB`);
console.log(`   Statements: ${output.length}`);
console.log('');
console.log('🚀 Ready to import!');
