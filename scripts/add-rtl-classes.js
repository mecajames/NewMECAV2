const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rtlClasses = [
  { name: 'Exterior', abbreviation: 'RTLEX', display_order: 1 },
  { name: 'Interior', abbreviation: 'RTLIN', display_order: 2 },
];

async function addRTLClasses() {
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
    console.log('\nAdding Ride the Light classes...');

    // Add each RTL class
    for (const cls of rtlClasses) {
      const { data, error } = await supabase
        .from('competition_classes')
        .insert({
          name: cls.name,
          abbreviation: cls.abbreviation,
          format: 'Ride the Light',
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

    console.log('\n✨ Ride the Light classes added successfully!');

    // Show summary
    const { data: allClasses, error: countError } = await supabase
      .from('competition_classes')
      .select('id, name, abbreviation, format')
      .eq('season_id', season.id)
      .eq('format', 'Ride the Light')
      .order('display_order');

    if (!countError && allClasses) {
      console.log(`\nTotal Ride the Light classes for 2025: ${allClasses.length}`);
      console.log('\nRide the Light Classes:');
      allClasses.forEach((cls, idx) => {
        console.log(`  ${idx + 1}. ${cls.name} (${cls.abbreviation})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

addRTLClasses();
