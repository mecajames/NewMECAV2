// Quick test script for authentication flow
// Uses native fetch (Node.js 18+)

async function testAuth() {
  try {
    console.log('1. Testing signin...');
    const signinResponse = await fetch('http://localhost:3001/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@mecacaraudio.com',
        password: 'Admin123!'
      })
    });

    const signinData = await signinResponse.json();
    console.log('   Signin response:', signinResponse.status, JSON.stringify(signinData, null, 2));

    if (!signinData.session?.access_token) {
      console.log('❌ No access token received');
      return;
    }

    const token = signinData.session.access_token;
    const userId = signinData.user.id;
    console.log('\n✅ Got access token for user:', userId);

    console.log('\n2. Testing profile endpoint with token...');
    const profileResponse = await fetch(`http://localhost:3001/api/profiles/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const profileData = await profileResponse.json();
    console.log('   Profile response:', profileResponse.status, JSON.stringify(profileData, null, 2));

    if (profileResponse.ok) {
      console.log('\n✅ Authentication working! User can access their profile');
    } else {
      console.log('\n❌ Authentication failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAuth();
