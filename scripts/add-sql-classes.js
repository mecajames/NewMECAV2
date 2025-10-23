const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sqlClasses = [
  { name: 'Street', abbreviation: 'STR', display_order: 1 },
  { name: 'Street Install', abbreviation: 'STRIN', display_order: 2 },
  { name: 'Stock', abbreviation: 'STO', display_order: 3 },
  { name: 'Stock Install', abbreviation: 'STOIN', display_order: 4 },
  { name: 'Modified', abbreviation: 'MOD', display_order: 5 },
  { name: 'Modified Install', abbreviation: 'MOINS', display_order: 6 },
  { name: 'Modified Street', abbreviation: 'MS', display_order: 7 },
  { name: 'SQ2', abbreviation: 'SQ2', display_order: 8 },
  { name: 'SQ2+', abbreviation: 'SQ2P', display_order: 9 },
  { name: 'Master', abbreviation: 'MSTR', display_order: 10 },
  { name: 'Extreme', abbreviation: 'X', display_order: 11 },
  { name: 'Extreme Install', abbreviation: 'XTRIN', display_order: 12 },
  { name: 'RTA', abbreviation: 'RTA', display_order: 13 },
];

async function addSQLClasses() {
  try {
    console.log('Fetching 2025 season...');

    // Get 2025 season
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', 2025)
      .single();

    if (seasonError) {
      console.error('Error fetching season:', seasonError);
      return;
    }

    console.log('Found season:', season.id);
    console.log('\nAdding SQL classes...');

    // Add each SQL class
    for (const cls of sqlClasses) {
      const { data, error } = await supabase
        .from('competition_classes')
        .insert({
          name: cls.name,
          abbreviation: cls.abbreviation,
          format: 'SQL',
          season_id: season.id,
          is_active: true,
          display_order: cls.display_order,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log(`⚠️  ${cls.name} (${cls.abbreviation}) already exists`);
        } else {
          console.error(`❌ Error adding ${cls.name}:`, error.message);
        }
      } else {
        console.log(`✅ Added ${cls.name} (${cls.abbreviation})`);
      }
    }

    console.log('\n✨ SQL classes added successfully!');

    // Show summary
    const { data: allClasses, error: countError } = await supabase
      .from('competition_classes')
      .select('id, name, abbreviation, format')
      .eq('season_id', season.id)
      .eq('format', 'SQL')
      .order('display_order');

    if (!countError && allClasses) {
      console.log(`\nTotal SQL classes for 2025: ${allClasses.length}`);
      console.log('\nSQL Classes:');
      allClasses.forEach((cls, idx) => {
        console.log(`  ${idx + 1}. ${cls.name} (${cls.abbreviation})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

addSQLClasses();
