const { Client } = require('pg');

console.log('🔍 Testing Supabase Pooler Authentication Formats\n');

// According to Supabase docs, pooler uses different formats
const configs = [
  {
    name: 'Session mode - default pooler',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.qykahrgwtktqycfgxqep',
    password: '9CN@Z4@unTyd33SG',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
  {
    name: 'Transaction mode - port 6543',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.qykahrgwtktqycfgxqep',
    password: '9CN@Z4@unTyd33SG',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
  {
    name: 'Try with [password]@[ref] format',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres',
    password: '[9CN@Z4@unTyd33SG]@[qykahrgwtktqycfgxqep]',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
  {
    name: 'Prisma Accelerate format',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres',
    password: '9CN@Z4@unTyd33SG',
    options: '-c search_path=public,extensions -c statement_timeout=15s',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  },
  {
    name: 'Session mode with pgbouncer_prepare=false',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.qykahrgwtktqycfgxqep',
    password: '9CN@Z4@unTyd33SG',
    options: '-c pgbouncer_prepare=false',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  }
];

let successCount = 0;

function testConfig(index) {
  if (index >= configs.length) {
    if (successCount === 0) {
      console.log('\n❌ All authentication formats failed.\n');
      console.log('Trying direct REST API approach for schema...\n');
    }
    process.exit(successCount > 0 ? 0 : 1);
  }

  const config = configs[index];
  console.log(`\n🔌 Test ${index + 1}/${configs.length}: ${config.name}`);
  console.log(`   ${config.host}:${config.port}`);
  console.log(`   User: ${config.user}`);

  const client = new Client(config);

  client.connect((err) => {
    if (err) {
      console.log(`   ❌ ${err.message}`);
      client.end();
      setTimeout(() => testConfig(index + 1), 300);
    } else {
      console.log(`   ✅ Connected!`);

      // Try a simple query
      client.query('SELECT current_database(), current_user, version()', (err, res) => {
        if (err) {
          console.log(`   ❌ Query error: ${err.message}`);
        } else {
          console.log(`   ✅ Database: ${res.rows[0].current_database}`);
          console.log(`   ✅ User: ${res.rows[0].current_user}`);
          console.log(`   ✅ Version: ${res.rows[0].version.substring(0, 40)}...`);

          // Try to create a test table
          client.query('CREATE TABLE IF NOT EXISTS _connection_test (id serial PRIMARY KEY, created_at timestamptz DEFAULT now())', (err, res) => {
            if (err) {
              console.log(`   ❌ Cannot create tables: ${err.message}`);
            } else {
              console.log(`   ✅ Can create tables!`);

              // Drop test table
              client.query('DROP TABLE IF EXISTS _connection_test', () => {
                console.log(`   ✅ Can drop tables!`);
              });
            }

            client.end();
            successCount++;

            console.log('\n🎉 WORKING CONNECTION FOUND!\n');
            console.log('Configuration:');
            console.log(JSON.stringify(config, null, 2));
            console.log('\n');

            // Continue testing to see if others work too
            setTimeout(() => testConfig(index + 1), 300);
          });
        }
      });
    }
  });
}

testConfig(0);
