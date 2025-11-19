const { Client } = require('pg');
const fetch = require('node-fetch');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function autoFetchYoutubeVideo() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('[YouTube Auto-Fetch] Connected to database');

    // Fetch settings
    const settingsResult = await client.query(`
      SELECT setting_key, setting_value
      FROM site_settings
      WHERE setting_key IN (
        'youtube_auto_fetch_enabled',
        'youtube_api_key',
        'youtube_channel_id',
        'youtube_auto_fetch_frequency',
        'youtube_auto_fetch_time',
        'youtube_last_fetch'
      )
    `);

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    // Check if auto-fetch is enabled
    if (settings.youtube_auto_fetch_enabled !== 'true') {
      console.log('[YouTube Auto-Fetch] Auto-fetch is disabled. Skipping.');
      await client.end();
      return;
    }

    // Check if API key is configured
    if (!settings.youtube_api_key) {
      console.log('[YouTube Auto-Fetch] No API key configured. Skipping.');
      await client.end();
      return;
    }

    // Check if it's time to fetch based on frequency
    const now = new Date();
    const lastFetch = settings.youtube_last_fetch ? new Date(settings.youtube_last_fetch) : null;

    let shouldFetch = false;

    if (!lastFetch) {
      shouldFetch = true;
      console.log('[YouTube Auto-Fetch] First time fetch');
    } else {
      const frequency = settings.youtube_auto_fetch_frequency || 'daily';
      const hoursSinceLastFetch = (now - lastFetch) / (1000 * 60 * 60);

      if (frequency === 'hourly' && hoursSinceLastFetch >= 1) {
        shouldFetch = true;
      } else if (frequency === 'every6hours' && hoursSinceLastFetch >= 6) {
        shouldFetch = true;
      } else if (frequency === 'daily') {
        // Check if it's the right time for daily fetch
        const fetchTime = settings.youtube_auto_fetch_time || '03:00';
        const [targetHour, targetMinute] = fetchTime.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Check if we've crossed the target time since last fetch
        const lastFetchDate = lastFetch.toDateString();
        const nowDate = now.toDateString();

        if (lastFetchDate !== nowDate) {
          // Different day - check if current time is past the target time
          if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
            shouldFetch = true;
          }
        }
      }
    }

    if (!shouldFetch) {
      console.log('[YouTube Auto-Fetch] Not time to fetch yet. Last fetch:', lastFetch);
      await client.end();
      return;
    }

    console.log('[YouTube Auto-Fetch] Fetching latest video...');

    // Fetch latest video from YouTube API
    const channelId = settings.youtube_channel_id || 'UCMmKGkg6d_1WEgvVahLvC_Q';
    const apiKey = settings.youtube_api_key;

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=completed&type=video&order=date&maxResults=1&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      const videoId = video.id.videoId;
      const videoTitle = video.snippet.title;
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;

      console.log(`[YouTube Auto-Fetch] Found video: ${videoTitle}`);

      // Update Video 1 in database
      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
        VALUES ('youtube_video_1_url', $1, 'text', 'YouTube Video 1 Embed URL')
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value
      `, [embedUrl]);

      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
        VALUES ('youtube_video_1_title', $1, 'text', 'YouTube Video 1 Title')
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value
      `, [videoTitle]);

      // Update last fetch time
      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
        VALUES ('youtube_last_fetch', $1, 'text', 'Last time video was auto-fetched')
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value
      `, [now.toISOString()]);

      console.log('[YouTube Auto-Fetch] ✅ Successfully updated Video 1');
      console.log(`[YouTube Auto-Fetch] Video: ${videoTitle}`);
      console.log(`[YouTube Auto-Fetch] URL: ${embedUrl}`);
    } else {
      console.log('[YouTube Auto-Fetch] No videos found');
    }

    await client.end();
  } catch (error) {
    console.error('[YouTube Auto-Fetch] ❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

// Run the auto-fetch
autoFetchYoutubeVideo();
