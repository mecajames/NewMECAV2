#!/usr/bin/env node

const API_BASE_URL = 'http://localhost:3001';

const formats = [
  {
    name: 'SPL',
    description: 'Sound Pressure League - Competition focused on maximum sound pressure levels',
    is_active: true,
    display_order: 1,
  },
  {
    name: 'SQL',
    description: 'Sound Quality League - Competition focused on sound quality and installation',
    is_active: true,
    display_order: 2,
  },
  {
    name: 'Show and Shine',
    description: 'Vehicle appearance competition across multiple categories',
    is_active: true,
    display_order: 3,
  },
  {
    name: 'Ride the Light',
    description: 'Lighting installation competition for exterior and interior installations',
    is_active: true,
    display_order: 4,
  },
];

async function seedFormats() {
  console.log('Seeding competition formats...\n');

  for (const format of formats) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/competition-formats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(format),
      });

      if (response.ok) {
        const created = await response.json();
        console.log(`✓ Added: ${created.name} (ID: ${created.id})`);
      } else {
        const error = await response.json();
        if (error.message?.includes('already exists')) {
          console.log(`⊘ Skipped: ${format.name} (already exists)`);
        } else {
          console.error(`✗ Failed to add ${format.name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`✗ Error adding ${format.name}:`, error.message);
    }
  }

  console.log('\nFormat seeding complete!');
}

seedFormats().catch(console.error);
