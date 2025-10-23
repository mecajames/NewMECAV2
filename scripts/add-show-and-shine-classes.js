const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const showAndShineClasses = [
  { name: 'Bicycle', abbreviation: 'BICYC', display_order: 1 },
  { name: 'Motorcycle', abbreviation: 'MOTO', display_order: 2 },
  { name: 'Domestic Car Mild', abbreviation: 'SSDCM', display_order: 3 },
  { name: 'Domestic Car Street', abbreviation: 'SSDCS', display_order: 4 },
  { name: 'Domestic Car Wild', abbreviation: 'SSDCW', display_order: 5 },
  { name: 'European Mild', abbreviation: 'SSEM', display_order: 6 },
  { name: 'European Street', abbreviation: 'SSES', display_order: 7 },
  { name: 'European Wild', abbreviation: 'SSEW', display_order: 8 },
  { name: 'Import Car Mild', abbreviation: 'SSICM', display_order: 9 },
  { name: 'Import Car Street', abbreviation: 'SSICS', display_order: 10 },
  { name: 'Import Car Wild', abbreviation: 'SSICW', display_order: 11 },
  { name: 'SUV/Van Mild', abbreviation: 'SUVM', display_order: 12 },
  { name: 'SUV/Van Street', abbreviation: 'SUVS', display_order: 13 },
  { name: 'SUV/Van Wild', abbreviation: 'SUVW', display_order: 14 },
  { name: 'Truck Mild', abbreviation: 'SSTM', display_order: 15 },
  { name: 'Truck Street', abbreviation: 'SSTS', display_order: 16 },
  { name: 'Truck Wild', abbreviation: 'SSTW', display_order: 17 },
  { name: 'Vintage Car', abbreviation: 'SSVC', display_order: 18 },
  { name: 'Vintage Truck', abbreviation: 'SSVT', display_order: 19 },
  { name: 'Show MECA Kids', abbreviation: 'SSMK', display_order: 20 },
  { name: 'Open', abbreviation: 'SSO', display_order: 21 },
];

async function addShowAndShineClasses() {
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
    console.log('\nAdding Show and Shine classes...');

    // Add each Show and Shine class
    for (const cls of showAndShineClasses) {
      const { data, error } = await supabase
        .from('competition_classes')
        .insert({
          name: cls.name,
          abbreviation: cls.abbreviation,
          format: 'Show and Shine',
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

    console.log('\n✨ Show and Shine classes added successfully!');

    // Show summary
    const { data: allClasses, error: countError } = await supabase
      .from('competition_classes')
      .select('id, name, abbreviation, format')
      .eq('season_id', season.id)
      .eq('format', 'Show and Shine')
      .order('display_order');

    if (!countError && allClasses) {
      console.log(`\nTotal Show and Shine classes for 2025: ${allClasses.length}`);
      console.log('\nShow and Shine Classes:');
      allClasses.forEach((cls, idx) => {
        console.log(`  ${idx + 1}. ${cls.name} (${cls.abbreviation})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

addShowAndShineClasses();
