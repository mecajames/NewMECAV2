const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function seedYoutubeSettings() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // YouTube video settings to insert
    const settings = [
      { key: 'youtube_video_1_url', value: '', type: 'text', description: 'YouTube Video 1 Embed URL' },
      { key: 'youtube_video_1_title', value: '', type: 'text', description: 'YouTube Video 1 Title' },
      { key: 'youtube_video_2_url', value: '', type: 'text', description: 'YouTube Video 2 Embed URL' },
      { key: 'youtube_video_2_title', value: '', type: 'text', description: 'YouTube Video 2 Title' },
      { key: 'youtube_video_3_url', value: '', type: 'text', description: 'YouTube Video 3 Embed URL' },
      { key: 'youtube_video_3_title', value: '', type: 'text', description: 'YouTube Video 3 Title' },
      { key: 'youtube_video_4_url', value: '', type: 'text', description: 'YouTube Video 4 Embed URL' },
      { key: 'youtube_video_4_title', value: '', type: 'text', description: 'YouTube Video 4 Title' },
      { key: 'youtube_section_active', value: 'true', type: 'boolean', description: 'Show YouTube section on homepage' },
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
    console.log('\n✅ YouTube video settings seeded successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

seedYoutubeSettings();
