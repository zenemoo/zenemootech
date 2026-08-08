import fetch from 'node-fetch';

const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzjjY0ohFFz3quRjpw4rzociVtDzYwErxe9D_rgPknJg_L1Cwm1jijctpeMg1hgOviD3yO/exec';

const payload = {
  secret: 'zenemoo-secret-key-2026',
  action: 'sync_application',
  payload: {
    id: 'test_123',
    applicant_id: 'APP-2026-9999',
    opportunity_title: 'DesiCrew Test',
    applicant_name: 'Test Candidate',
    applicant_email: 'test@zenemoo.in',
    applicant_phone: '+91 9876543210',
    status: 'PENDING',
    created_at: new Date().toISOString(),
    answers: {
      'Which subtitle editing software have you used?': 'Aegisub',
      'What is your Odia typing speed (words per minute)?': '50 WPM',
    },
  },
};

async function test() {
  console.log('Sending test POST to Apps Script URL...');
  try {
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    console.log('HTTP Status:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
