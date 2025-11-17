const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function seedYoutubeApiSettings() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    const settings = [
      { key: 'youtube_api_key', value: '', type: 'text', description: 'YouTube Data API v3 Key for auto-fetching videos' },
      { key: 'youtube_channel_id', value: 'UCMmKGkg6d_1WEgvVahLvC_Q', type: 'text', description: 'MECA Official YouTube Channel ID' },
      { key: 'youtube_auto_fetch_live', value: 'false', type: 'boolean', description: 'Auto-fetch latest live video for Video 1' },
    ];

    for (const setting of settings) {
      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value,
            setting_type = EXCLUDED.setting_type,
            description = EXCLUDED.description
      `, [setting.key, setting.value, setting.type, setting.description]);

      console.log(`✅ Seeded ${setting.key}`);
    }

    await client.end();
    console.log('\n✅ YouTube API settings seeded successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

seedYoutubeApiSettings();
