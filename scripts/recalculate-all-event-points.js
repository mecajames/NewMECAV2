/**
 * Script to recalculate points for all events
 *
 * This script updates the points for all competition results based on the correct point structure:
 * - 1X Single Point Event: 1st=5, 2nd=4, 3rd=3, 4th=2, 5th=1 (6th+ = 0)
 * - 2X Double Points Event: 1st=10, 2nd=8, 3rd=6, 4th=4, 5th=2 (6th+ = 0)
 * - 3X Triple Points Event (SOUNDFEST): 1st=15, 2nd=12, 3rd=9, 4th=6, 5th=3 (6th+ = 0)
 * - 4X SQL Points Event: Everyone gets 15 pts minimum, Top 5 get: 1st=20, 2nd=19, 3rd=18, 4th=17, 5th=16
 *
 * Run with: node scripts/recalculate-all-event-points.js [local|production]
 */

const API_URLS = {
  local: 'http://localhost:3001/api',
  production: 'https://qykahrgwtktqycfgxqep.supabase.co'
};

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTEzNzIsImV4cCI6MjA3NDgyNzM3Mn0.Us_keU5fImeM6NSGTo_CMgVBiA62W2uomXrew5_EDRE';

async function fetchAllEvents(apiUrl) {
  console.log('Fetching all events...');

  const response = await fetch(`${apiUrl}/events`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
  }

  const events = await response.json();
  console.log(`Found ${events.length} events`);
  return events;
}

async function recalculateEventPoints(apiUrl, eventId, eventName) {
  console.log(`  Recalculating points for event: ${eventName} (${eventId})`);

  const response = await fetch(`${apiUrl}/competition-results/recalculate-points/${eventId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to recalculate points for event ${eventId}: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result;
}

async function main() {
  const env = process.argv[2] || 'local';

  if (!['local', 'production'].includes(env)) {
    console.error('Usage: node scripts/recalculate-all-event-points.js [local|production]');
    process.exit(1);
  }

  const apiUrl = API_URLS[env];
  console.log(`\n========================================`);
  console.log(`Recalculating Points for All Events`);
  console.log(`Environment: ${env}`);
  console.log(`API URL: ${apiUrl}`);
  console.log(`========================================\n`);

  try {
    // Fetch all events
    const events = await fetchAllEvents(apiUrl);

    if (events.length === 0) {
      console.log('No events found. Nothing to recalculate.');
      return;
    }

    console.log(`\nRecalculating points for ${events.length} events...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const event of events) {
      try {
        await recalculateEventPoints(apiUrl, event.id, event.name || event.title || 'Unknown');
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ event: event.name || event.id, error: error.message });
        console.error(`    ERROR: ${error.message}`);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n========================================`);
    console.log(`Recalculation Complete!`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`========================================\n`);

    if (errors.length > 0) {
      console.log('Events with errors:');
      errors.forEach(e => console.log(`  - ${e.event}: ${e.error}`));
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
