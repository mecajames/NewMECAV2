// Script to add SQL and Show and Shine classes
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://localhost:3001';
const SEASON_2025_ID = '43b425bb-a5d1-4208-8ef4-cad26ea5e3fa';

// SQL Classes
const sqlClasses = [
  { name: 'TR', abbreviation: 'TR', format: 'SQL', display_order: 1 },
  { name: 'Extreme Install', abbreviation: 'XTRIN', format: 'SQL', display_order: 2 },
  { name: 'Master', abbreviation: 'MSTR', format: 'SQL', display_order: 3 },
  { name: 'Modified', abbreviation: 'MOD', format: 'SQL', display_order: 4 },
  { name: 'Modified Install', abbreviation: 'MOINS', format: 'SQL', display_order: 5 },
  { name: 'Modified Street', abbreviation: 'MS', format: 'SQL', display_order: 6 },
  { name: 'RTA', abbreviation: 'RTA', format: 'SQL', display_order: 7 },
  { name: 'SQ2', abbreviation: 'SQ2', format: 'SQL', display_order: 8 },
  { name: 'SQ2+', abbreviation: 'SQ2P', format: 'SQL', display_order: 9 },
  { name: 'Stock', abbreviation: 'STO', format: 'SQL', display_order: 10 },
  { name: 'Stock Install', abbreviation: 'STOIN', format: 'SQL', display_order: 11 },
  { name: 'Street', abbreviation: 'STR', format: 'SQL', display_order: 12 },
  { name: 'Street Install', abbreviation: 'STRIN', format: 'SQL', display_order: 13 },
  { name: 'Extreme', abbreviation: 'X', format: 'SQL', display_order: 14 },
];

// Show and Shine Classes
const showAndShineClasses = [
  { name: 'Bicycle', abbreviation: 'BICYC', format: 'Show and Shine', display_order: 1 },
  { name: 'Domestic Car Mild', abbreviation: 'SSDCM', format: 'Show and Shine', display_order: 2 },
  { name: 'Domestic Car Street', abbreviation: 'SSDCS', format: 'Show and Shine', display_order: 3 },
  { name: 'Domestic Car Wild', abbreviation: 'SSDCW', format: 'Show and Shine', display_order: 4 },
  { name: 'European Mild', abbreviation: 'SSEM', format: 'Show and Shine', display_order: 5 },
  { name: 'European Street', abbreviation: 'SSES', format: 'Show and Shine', display_order: 6 },
  { name: 'European Wild', abbreviation: 'SSEW', format: 'Show and Shine', display_order: 7 },
  { name: 'Import Car Mild', abbreviation: 'SSICM', format: 'Show and Shine', display_order: 8 },
  { name: 'Import Car Street', abbreviation: 'SSICS', format: 'Show and Shine', display_order: 9 },
  { name: 'Import Car Wild', abbreviation: 'SSICW', format: 'Show and Shine', display_order: 10 },
  { name: 'Motorcycle', abbreviation: 'MOTO', format: 'Show and Shine', display_order: 11 },
  { name: 'Open', abbreviation: 'SSO', format: 'Show and Shine', display_order: 12 },
  { name: 'Show and Shine MECA Kids', abbreviation: 'SSMK', format: 'Show and Shine', display_order: 13 },
  { name: 'SUV/Van Mild', abbreviation: 'SUVM', format: 'Show and Shine', display_order: 14 },
  { name: 'SUV/Van Street', abbreviation: 'SUVS', format: 'Show and Shine', display_order: 15 },
  { name: 'SUV/Van Wild', abbreviation: 'SUVW', format: 'Show and Shine', display_order: 16 },
  { name: 'Truck Mild', abbreviation: 'SSTM', format: 'Show and Shine', display_order: 17 },
  { name: 'Truck Street', abbreviation: 'SSTS', format: 'Show and Shine', display_order: 18 },
  { name: 'Truck Wild', abbreviation: 'SSTW', format: 'Show and Shine', display_order: 19 },
  { name: 'Vintage Car', abbreviation: 'SSVC', format: 'Show and Shine', display_order: 20 },
  { name: 'Vintage Truck', abbreviation: 'SSVT', format: 'Show and Shine', display_order: 21 },
];

async function addClasses() {
  console.log('Starting to add classes...\n');

  let successCount = 0;
  let errorCount = 0;

  // Add SQL classes
  console.log('=== Adding SQL Classes ===');
  for (const classData of sqlClasses) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/competition-classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: classData.name,
          abbreviation: classData.abbreviation,
          format: classData.format,
          season_id: SEASON_2025_ID,
          is_active: true,
          display_order: classData.display_order,
        }),
      });

      if (response.ok) {
        console.log(`✓ Added: ${classData.name} (${classData.abbreviation})`);
        successCount++;
      } else {
        const error = await response.text();
        console.error(`✗ Failed to add ${classData.name}: ${error}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`✗ Error adding ${classData.name}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=== Adding Show and Shine Classes ===');
  for (const classData of showAndShineClasses) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/competition-classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: classData.name,
          abbreviation: classData.abbreviation,
          format: classData.format,
          season_id: SEASON_2025_ID,
          is_active: true,
          display_order: classData.display_order,
        }),
      });

      if (response.ok) {
        console.log(`✓ Added: ${classData.name} (${classData.abbreviation})`);
        successCount++;
      } else {
        const error = await response.text();
        console.error(`✗ Failed to add ${classData.name}: ${error}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`✗ Error adding ${classData.name}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Successfully added: ${successCount} classes`);
  console.log(`Errors: ${errorCount} classes`);
  console.log(`Total processed: ${successCount + errorCount} classes`);
}

addClasses().catch(console.error);
