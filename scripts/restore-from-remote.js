const { createClient } = require('@supabase/supabase-js');

// Remote instance (where data still exists)
const remoteUrl = 'https://qykahrgwtktqycfgxqep.supabase.co';
const remoteKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

// Local instance (where we need to restore)
const localUrl = 'http://127.0.0.1:54321';
const localKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const remote = createClient(remoteUrl, remoteKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const local = createClient(localUrl, localKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function restoreData() {
  try {
    console.log('Starting data restoration from remote instance...\n');

    // Get all users from remote auth
    console.log('1. Fetching users from remote...');
    const { data: remoteUsers } = await remote.auth.admin.listUsers();
    console.log(`   Found ${remoteUsers.users.length} users`);

    // Get all profiles
    console.log('2. Fetching profiles from remote...');
    const { data: profiles, error: profilesError } = await remote
      .from('profiles')
      .select('*');
    if (profilesError) throw profilesError;
    console.log(`   Found ${profiles.length} profiles`);

    // Get all events
    console.log('3. Fetching events from remote...');
    const { data: events, error: eventsError } = await remote
      .from('events')
      .select('*');
    if (eventsError) throw eventsError;
    console.log(`   Found ${events.length} events`);

    // Get all media files
    console.log('4. Fetching media_files from remote...');
    const { data: mediaFiles, error: mediaError } = await remote
      .from('media_files')
      .select('*');
    if (mediaError) throw mediaError;
    console.log(`   Found ${mediaFiles.length} media files`);

    // Get all site settings
    console.log('5. Fetching site_settings from remote...');
    const { data: settings, error: settingsError } = await remote
      .from('site_settings')
      .select('*');
    if (settingsError) throw settingsError;
    console.log(`   Found ${settings.length} site settings`);

    // Get all rulebooks
    console.log('6. Fetching rulebooks from remote...');
    const { data: rulebooks, error: rulebooksError } = await remote
      .from('rulebooks')
      .select('*');
    if (rulebooksError) throw rulebooksError;
    console.log(`   Found ${rulebooks.length} rulebooks`);

    console.log('\nRestoring data to local instance...\n');

    // Restore users
    console.log('1. Restoring users...');
    for (const user of remoteUsers.users) {
      const { error } = await local.auth.admin.createUser({
        email: user.email,
        password: 'PhQqhWiZNe/Jkb8*', // Set password for all users
        email_confirm: true,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      });
      if (error && !error.message.includes('already registered')) {
        console.log(`   Error creating user ${user.email}:`, error.message);
      } else {
        console.log(`   ✓ User ${user.email}`);
      }
    }

    // Restore profiles
    console.log('2. Restoring profiles...');
    for (const profile of profiles) {
      const { error } = await local.from('profiles').upsert(profile);
      if (error) {
        console.log(`   Error restoring profile ${profile.id}:`, error.message);
      } else {
        console.log(`   ✓ Profile ${profile.email || profile.id}`);
      }
    }

    // Restore events
    console.log('3. Restoring events...');
    for (const event of events) {
      const { error } = await local.from('events').upsert(event);
      if (error) {
        console.log(`   Error restoring event ${event.id}:`, error.message);
      } else {
        console.log(`   ✓ Event ${event.title}`);
      }
    }

    // Restore media files
    console.log('4. Restoring media_files...');
    for (const file of mediaFiles) {
      const { error } = await local.from('media_files').upsert(file);
      if (error) {
        console.log(`   Error restoring media file ${file.id}:`, error.message);
      } else {
        console.log(`   ✓ Media file ${file.title}`);
      }
    }

    // Restore site settings
    console.log('5. Restoring site_settings...');
    for (const setting of settings) {
      const { error } = await local.from('site_settings').upsert(setting);
      if (error) {
        console.log(`   Error restoring setting ${setting.setting_key}:`, error.message);
      } else {
        console.log(`   ✓ Setting ${setting.setting_key}`);
      }
    }

    // Restore rulebooks
    console.log('6. Restoring rulebooks...');
    for (const rulebook of rulebooks) {
      const { error } = await local.from('rulebooks').upsert(rulebook);
      if (error) {
        console.log(`   Error restoring rulebook ${rulebook.id}:`, error.message);
      } else {
        console.log(`   ✓ Rulebook ${rulebook.title}`);
      }
    }

    console.log('\n✅ Data restoration complete!');
    console.log('\nSummary:');
    console.log(`  - ${remoteUsers.users.length} users`);
    console.log(`  - ${profiles.length} profiles`);
    console.log(`  - ${events.length} events`);
    console.log(`  - ${mediaFiles.length} media files`);
    console.log(`  - ${settings.length} site settings`);
    console.log(`  - ${rulebooks.length} rulebooks`);

  } catch (error) {
    console.error('\n❌ Error during restoration:', error);
    process.exit(1);
  }
}

restoreData();
