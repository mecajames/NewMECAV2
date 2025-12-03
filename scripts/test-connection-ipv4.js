const { Client } = require('pg');
const dns = require('dns');

console.log('🔍 Testing connection with IPv4 forced\n');

// Try to resolve DNS first
dns.resolve4('db.qykahrgwtktqycfgxqep.supabase.co', (err, addresses) => {
  if (err) {
    console.log('❌ IPv4 DNS resolution failed:', err.message);
    console.log('Trying IPv6...\n');

    dns.resolve6('db.qykahrgwtktqycfgxqep.supabase.co', (err6, addresses6) => {
      if (err6) {
        console.log('❌ IPv6 DNS resolution also failed:', err6.message);
        console.log('\nTrying connection anyway...\n');
      } else {
        console.log('✅ IPv6 addresses found:', addresses6);
        console.log('\nBut we need IPv4. Trying connection anyway...\n');
      }

      tryConnection();
    });
  } else {
    console.log('✅ IPv4 addresses found:', addresses);
    tryConnection(addresses[0]);
  }
});

function tryConnection(host) {
  const configs = [
    {
      name: 'Direct port 5432',
      host: host || 'db.qykahrgwtktqycfgxqep.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '9CN@Z4@unTyd33SG',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    },
    {
      name: 'Pooler port 6543 with postgres user',
      host: host || 'db.qykahrgwtktqycfgxqep.supabase.co',
      port: 6543,
      database: 'postgres',
      user: 'postgres',
      password: '9CN@Z4@unTyd33SG',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    },
    {
      name: 'Pooler port 6543 with postgres.qykahrgwtktqycfgxqep user',
      host: host || 'db.qykahrgwtktqycfgxqep.supabase.co',
      port: 6543,
      database: 'postgres',
      user: 'postgres.qykahrgwtktqycfgxqep',
      password: '9CN@Z4@unTyd33SG',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    },
    {
      name: 'AWS hostname port 5432',
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.qykahrgwtktqycfgxqep',
      password: '9CN@Z4@unTyd33SG',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    },
    {
      name: 'AWS hostname port 6543',
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.qykahrgwtktqycfgxqep',
      password: '9CN@Z4@unTyd33SG',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    }
  ];

  testNextConfig(0);

  function testNextConfig(index) {
    if (index >= configs.length) {
      console.log('\n❌ All connection attempts failed.\n');
      process.exit(1);
    }

    const config = configs[index];
    console.log(`\n🔌 Attempt ${index + 1}/${configs.length}: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   User: ${config.user}`);

    const client = new Client(config);

    client.connect((err) => {
      if (err) {
        console.log(`   ❌ Failed: ${err.message}`);
        client.end();
        setTimeout(() => testNextConfig(index + 1), 500);
      } else {
        console.log(`   ✅ SUCCESS! Connected!`);

        // Test a query
        client.query('SELECT version()', (err, res) => {
          if (err) {
            console.log(`   ❌ Query failed: ${err.message}`);
          } else {
            console.log(`   ✅ Database version: ${res.rows[0].version.substring(0, 50)}...`);
          }

          client.end();
          console.log('\n🎉 Connection successful! Using this configuration.\n');
          console.log('Working config:', JSON.stringify(config, null, 2));
          process.exit(0);
        });
      }
    });
  }
}
