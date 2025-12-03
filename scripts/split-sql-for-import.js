const fs = require('fs');
const path = require('path');

// Read the backup file
const backupPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'backup_no_profiles_20251118.sql');
const sqlContent = fs.readFileSync(backupPath, 'utf8');

console.log('📖 Reading backup file...');
console.log(`File size: ${Math.round(sqlContent.length / 1024)}KB\n`);

// Split into major sections
const sections = [];
let currentSection = '';
let sectionName = 'schema';

const lines = sqlContent.split('\n');

for (const line of lines) {
  // Detect section changes
  if (line.includes('-- Data for Name:')) {
    if (currentSection.length > 0) {
      sections.push({ name: sectionName, content: currentSection });
      currentSection = '';
    }
    const match = line.match(/-- Data for Name: (\\w+);/);
    sectionName = match ? `data_${match[1]}` : 'data';
  }

  currentSection += line + '\n';

  // Split large sections (max 100KB per file)
  if (currentSection.length > 100000) {
    sections.push({ name: sectionName, content: currentSection });
    currentSection = '';
    sectionName += '_cont';
  }
}

// Add final section
if (currentSection.length > 0) {
  sections.push({ name: sectionName, content: currentSection });
}

// Create output directory
const outputDir = path.join(__dirname, '..', 'sql-import-chunks');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Write sections to separate files
console.log(`📝 Creating ${sections.length} import files...\n`);

sections.forEach((section, index) => {
  const filename = `${String(index + 1).padStart(2, '0')}_${section.name}.sql`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, section.content);
  console.log(`✅ Created: ${filename} (${Math.round(section.content.length / 1024)}KB)`);
});

console.log(`\n✅ Done! Import files are in: sql-import-chunks/`);
console.log('\n📋 To import to production:');
console.log('1. Go to: https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep/sql/new');
console.log('2. Copy and paste each file in order (01, 02, 03, etc.)');
console.log('3. Click "RUN" after pasting each file');
console.log('4. Wait for completion before moving to the next file\n');
