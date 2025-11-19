const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// URLs for historical archives
const archiveUrls = {
  2021: 'https://mecacaraudio.com/2021/11/2021-spl-world-champions-2',
  2020: 'https://mecacaraudio.com/archives/2020-awards',
  2019: 'https://mecacaraudio.com/archives/2019-awards',
  2018: 'https://mecacaraudio.com/archives/2018-awards',
  2017: 'https://mecacaraudio.com/archives/2017-awards',
  2016: 'https://mecacaraudio.com/archives/2016-awards',
  2015: 'https://mecacaraudio.com/archives/2015-awards',
  2014: 'https://mecacaraudio.com/archives/2014-awards',
  2013: 'https://mecacaraudio.com/archives/2013-awards',
  2012: 'https://mecacaraudio.com/archives/2012-awards',
  2011: 'https://mecacaraudio.com/archives/2011-awards',
};

async function scrapeAndImportArchives() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    for (const [year, url] of Object.entries(archiveUrls)) {
      console.log(`\n📄 Processing ${year}...`);
      console.log(`   URL: ${url}`);

      try {
        // Check if archive already exists
        const existingArchive = await client.query(
          'SELECT id, published FROM championship_archives WHERE year = $1',
          [parseInt(year)]
        );

        if (existingArchive.rows.length > 0) {
          console.log(`   ⚠️  Archive for ${year} already exists (ID: ${existingArchive.rows[0].id})`);

          // If not published, we can update it
          if (!existingArchive.rows[0].published) {
            console.log(`   📝 Updating unpublished archive...`);

            // Fetch the HTML content
            const response = await fetch(url);
            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract the main content
            const articleContent = $('article').html() || $('.entry-content').html() || $('main').html() || '';

            // Update the archive with the HTML content
            await client.query(
              `UPDATE championship_archives
               SET additional_content = $1,
                   published = true,
                   updated_at = NOW()
               WHERE year = $2`,
              [JSON.stringify({ html: articleContent }), parseInt(year)]
            );

            console.log(`   ✅ Updated archive for ${year}`);
          } else {
            console.log(`   ⏭️  Skipping (already published)`);
          }
          continue;
        }

        // Fetch the page content
        console.log(`   🌐 Fetching from ${url}...`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract content
        const articleContent = $('article').html() || $('.entry-content').html() || $('main').html() || '';

        if (!articleContent) {
          console.log(`   ⚠️  No content found for ${year}`);
          continue;
        }

        // Find or create a season for this year
        console.log(`   🔍 Finding/creating season for ${year}...`);

        let seasonResult = await client.query(
          'SELECT id FROM seasons WHERE year = $1',
          [parseInt(year)]
        );

        let seasonId;
        if (seasonResult.rows.length > 0) {
          seasonId = seasonResult.rows[0].id;
          console.log(`   ✅ Found existing season: ${seasonId}`);
        } else {
          // Create a season for this year
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;

          const newSeasonResult = await client.query(
            `INSERT INTO seasons (name, start_date, end_date, year, is_current, is_next, created_at, updated_at)
             VALUES ($1, $2, $3, $4, false, false, NOW(), NOW())
             RETURNING id`,
            [`${year} Season (Historical)`, startDate, endDate, parseInt(year)]
          );

          seasonId = newSeasonResult.rows[0].id;
          console.log(`   ✅ Created new season: ${seasonId}`);
        }

        // Create the archive record
        console.log(`   💾 Creating archive record...`);
        const archiveResult = await client.query(
          `INSERT INTO championship_archives
           (season_id, year, title, published, additional_content, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [
            seasonId,
            parseInt(year),
            `${year} MECA World Champions`,
            true, // Publish historical archives by default
            JSON.stringify({ html: articleContent })
          ]
        );

        const archiveId = archiveResult.rows[0].id;
        console.log(`   ✅ Created archive: ${archiveId}`);
        console.log(`   📊 Stored ${articleContent.length} characters of HTML content`);

      } catch (error) {
        console.error(`   ❌ Error processing ${year}:`, error.message);
      }
    }

    console.log('\n\n🎉 ================================');
    console.log('   Archive Import Complete!');
    console.log('   ================================\n');

    // Show summary
    const summaryResult = await client.query(`
      SELECT year, title, published,
             CASE WHEN additional_content IS NOT NULL THEN 'Yes' ELSE 'No' END as has_content
      FROM championship_archives
      WHERE year >= 2011 AND year <= 2024
      ORDER BY year DESC
    `);

    console.log('📋 Archives Summary:');
    console.log('   Year | Published | Has Content | Title');
    console.log('   -----|-----------|-------------|------');
    summaryResult.rows.forEach(row => {
      const status = row.published ? '✅ Yes' : '❌ No ';
      const content = row.has_content === 'Yes' ? '✅' : '❌';
      console.log(`   ${row.year} | ${status}    | ${content}          | ${row.title}`);
    });

    await client.end();
    console.log('\n✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await client.end();
    process.exit(1);
  }
}

// Check if required packages are installed
try {
  require.resolve('node-fetch');
  require.resolve('cheerio');
} catch (e) {
  console.error('❌ Missing dependencies!');
  console.error('   Please run: npm install node-fetch@2 cheerio');
  process.exit(1);
}

// Run the script
console.log('🏆 MECA Championship Archives Scraper');
console.log('=====================================\n');
console.log('This script will scrape historical championship archives');
console.log('from mecacaraudio.com and import them into the database.\n');

scrapeAndImportArchives();
