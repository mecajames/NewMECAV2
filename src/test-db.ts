import { supabase } from './lib/supabase';

// Test database connection and tables
async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test if we can connect and check tables
    const { data: tables, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      if (error.message.includes('relation "profiles" does not exist')) {
        console.log('📋 The "profiles" table does not exist. You need to run the database migrations.');
      }
    } else {
      console.log('✅ Database connection successful!');
      console.log('✅ "profiles" table exists');
      
      // Check if there are any users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .limit(5);
        
      if (!usersError) {
        console.log(`👥 Found ${users?.length || 0} users in database`);
        if (users && users.length > 0) {
          console.log('Users:', users);
        }
      }
    }
  } catch (err) {
    console.error('❌ Database test failed:', err);
  }
}

// Run the test
testDatabase();