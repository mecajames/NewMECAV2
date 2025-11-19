const { Client } = require('pg');

async function backfillClassIds() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all competition classes
    const classesResult = await client.query(
      'SELECT id, name, format FROM competition_classes'
    );
    const classes = classesResult.rows;
    console.log(`Found ${classes.length} competition classes`);

    // Get all results that don't have a class_id
    const resultsResult = await client.query(
      `SELECT id, competition_class, format
       FROM competition_results
       WHERE class_id IS NULL`
    );
    const results = resultsResult.rows;
    console.log(`Found ${results.length} results without class_id`);

    let updated = 0;
    let notFound = 0;

    // Class name mappings for known differences
    const nameMap = {
      'Radical X': 'Extreme',
      'Radical X Modified 1': 'X Modified 1',
      'Radical X Modified 2': 'X Modified 2',
      'Radical X Mod Street': 'X Modified Street',
      'Radical X Street/Trunk 1': 'X Street 1',
      'Radical X Street/Trunk 2': 'X Street 2',
    };

    // Update each result
    for (const result of results) {
      let className = result.competition_class;

      // Apply name mapping if exists
      if (nameMap[className]) {
        className = nameMap[className];
      }

      // Find matching class by name and format (case-insensitive)
      const matchingClass = classes.find(
        c => c.name.toLowerCase() === className.toLowerCase() && c.format === result.format
      );

      if (matchingClass) {
        await client.query(
          'UPDATE competition_results SET class_id = $1 WHERE id = $2',
          [matchingClass.id, result.id]
        );
        updated++;
        console.log(`✓ Updated ${result.competition_class} → ${matchingClass.name} (${result.format})`);
      } else {
        notFound++;
        console.log(`✗ No match found for ${result.competition_class} (${result.format})`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total results processed: ${results.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`No match found: ${notFound}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

backfillClassIds();
