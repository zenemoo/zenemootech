import fetch from 'node-fetch';

const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:5000/api';

console.log('====================================================');
console.log('🛡️  TESTING CLOUDFLARE TURNSTILE INTEGRATION SUITE');
console.log('====================================================\n');

async function testTurnstileValidation() {
  // Test 1: Submit without Turnstile Token (Should fail HTTP 400)
  console.log('📋 [Test 1] Submitting contact inquiry WITHOUT Turnstile token...');
  try {
    const res = await fetch(`${BACKEND_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bot Tester',
        email: 'bot.test@example.com',
        phone: '9999999999',
        message: 'Automated test message without Turnstile token',
      }),
    });
    const data = await res.json();
    console.log(`Response Status: ${res.status} | Data:`, data);

    if (res.status === 400 && data.success === false) {
      console.log('✅ PASS: Request without Turnstile token properly rejected with HTTP 400!\n');
    } else {
      console.error('❌ FAIL: Request without Turnstile token was not rejected properly.\n');
    }
  } catch (err) {
    console.warn('Backend server test note:', err.message);
  }

  // Test 2: Submit with INVALID Turnstile Token (Should fail HTTP 400 via Cloudflare Siteverify)
  console.log('📋 [Test 2] Submitting contact inquiry WITH INVALID Turnstile token...');
  try {
    const res = await fetch(`${BACKEND_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fake Token Tester',
        email: 'faketoken@example.com',
        phone: '9999999999',
        message: 'Automated test message with fake token',
        turnstileToken: 'XXXXX_INVALID_FAKE_TURNSTILE_TOKEN_12345',
      }),
    });
    const data = await res.json();
    console.log(`Response Status: ${res.status} | Data:`, data);

    if (res.status === 400 && data.success === false) {
      console.log('✅ PASS: Request with invalid Turnstile token properly rejected by Cloudflare Siteverify!\n');
    } else {
      console.error('❌ FAIL: Request with invalid token was not rejected.\n');
    }
  } catch (err) {
    console.warn('Backend server test note:', err.message);
  }
}

testTurnstileValidation();
