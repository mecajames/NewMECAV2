const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function seedYoutubeAutoFetchSettings() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const settings = [
      { key: 'youtube_auto_fetch_enabled', value: 'false', type: 'boolean', description: 'Enable automatic fetching of latest video' },
      { key: 'youtube_auto_fetch_frequency', value: 'daily', type: 'text', description: 'Auto-fetch frequency: hourly, every6hours, daily' },
      { key: 'youtube_auto_fetch_time', value: '03:00', type: 'text', description: 'Time to run daily auto-fetch (24-hour format HH:MM)' },
      { key: 'youtube_last_fetch', value: '', type: 'text', description: 'Last time video was auto-fetched' },
    ];

    for (const setting of settings) {
      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_type = EXCLUDED.setting_type,
            description = EXCLUDED.description
      `, [setting.key, setting.value, setting.type, setting.description]);

      console.log(`✅ Seeded ${setting.key}`);
    }

    await client.end();
    console.log('\n✅ YouTube auto-fetch settings seeded successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

seedYoutubeAutoFetchSettings();
