const https = require('https');

// You need to get your Netlify access token from: https://app.netlify.com/user/applications/personal
// Or we can use the netlify CLI after linking

const SITE_ID = 'effortless-fenglisu-3c2d8d'; // From your Netlify URL

const envVars = {
  'VITE_SUPABASE_URL': 'https://qykahrgwtktqycfgxqep.supabase.co',
  'VITE_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTEzNzIsImV4cCI6MjA3NDgyNzM3Mn0.Us_keU5fImeM6NSGTo_CMgVBiA62W2uomXrew5_EDRE'
};

console.log('To set environment variables on Netlify:\n');
console.log('1. Go to: https://app.netlify.com/sites/' + SITE_ID + '/settings/env');
console.log('2. Add these variables:\n');

for (const [key, value] of Object.entries(envVars)) {
  console.log(`   ${key} = ${value}\n`);
}

console.log('3. Redeploy the site to apply changes\n');
console.log('OR run: netlify deploy --prod');
