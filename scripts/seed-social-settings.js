const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function seedSocialSettings() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // Social media settings to insert
    const settings = [
      { key: 'social_facebook_url', value: '', type: 'text', description: 'Facebook page URL' },
      { key: 'social_facebook_active', value: 'false', type: 'boolean', description: 'Show Facebook link in footer' },
      { key: 'social_instagram_url', value: '', type: 'text', description: 'Instagram profile URL' },
      { key: 'social_instagram_active', value: 'false', type: 'boolean', description: 'Show Instagram link in footer' },
      { key: 'social_youtube_url', value: '', type: 'text', description: 'YouTube channel URL' },
      { key: 'social_youtube_active', value: 'false', type: 'boolean', description: 'Show YouTube link in footer' },
      { key: 'social_x_url', value: '', type: 'text', description: 'X (Twitter) profile URL' },
      { key: 'social_x_active', value: 'false', type: 'boolean', description: 'Show X link in footer' },
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
    console.log('\n✅ Social media settings seeded successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

seedSocialSettings();
