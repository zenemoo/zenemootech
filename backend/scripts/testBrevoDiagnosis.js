import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.BREVO_API_KEY || '';
const senderName = process.env.BREVO_SENDER_NAME || 'Zenemoo';
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@zenemoo.in';
const testRecipient = 'zenemootech@gmail.com';

console.log('=====================================================');
console.log('🔍 BREVO END-TO-END DIAGNOSTIC INVESTIGATION');
console.log('=====================================================');
console.log('1. ENVIRONMENT VARIABLES VERIFICATION:');
console.log('   - BREVO_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 6)}` : '❌ MISSING');
console.log('   - BREVO_SENDER_NAME:', senderName);
console.log('   - BREVO_SENDER_EMAIL:', senderEmail);
console.log('   - TEST RECIPIENT:', testRecipient);
console.log('=====================================================\n');

async function runDiagnosis() {
  // Step 1: Verify API Key status via Brevo Account Endpoint
  console.log('2. TESTING BREVO API KEY VALIDITY (GET /v3/account):');
  try {
    const accRes = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
      },
    });

    const accData = await accRes.json();
    console.log('   - HTTP Status Code:', accRes.status);
    console.log('   - Response Body:', JSON.stringify(accData, null, 2));

    if (!accRes.ok) {
      console.log('\n❌ API KEY DIAGNOSIS: The API key provided is rejected by Brevo Account API.');
    } else {
      console.log('\n✅ API KEY DIAGNOSIS: API key is valid!');
      console.log('   - Account Email:', accData.email);
      console.log('   - Plan Type:', accData.plan?.[0]?.type);
    }
  } catch (err) {
    console.error('❌ Account check exception:', err.message);
  }

  console.log('\n=====================================================');
  console.log('3. TESTING BREVO SENDER VERIFICATION (GET /v3/senders):');
  try {
    const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
      },
    });

    const sendersData = await sendersRes.json();
    console.log('   - HTTP Status Code:', sendersRes.status);
    console.log('   - Senders List:', JSON.stringify(sendersData, null, 2));
  } catch (err) {
    console.error('❌ Senders check exception:', err.message);
  }

  console.log('\n=====================================================');
  console.log('4. TESTING TRANSACTIONAL EMAIL DISPATCH (POST /v3/smtp/email):');
  try {
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: testRecipient }],
        subject: 'Zenemoo Test OTP Diagnosis Email',
        htmlContent: '<h1>Zenemoo Security Test</h1><p>Your OTP Code is: <b>999888</b></p>',
      }),
    });

    const emailData = await emailRes.json();
    console.log('   - HTTP Status Code:', emailRes.status);
    console.log('   - Response Body:', JSON.stringify(emailData, null, 2));

    if (emailRes.ok) {
      console.log('\n🎉 SUCCESS! Brevo accepted the transactional email!');
      console.log('   - Message ID:', emailData.messageId);
    } else {
      console.log('\n❌ EMAIL DISPATCH FAILED!');
      console.log('   - Error Code:', emailData.code);
      console.log('   - Error Message:', emailData.message);
    }
  } catch (err) {
    console.error('❌ Email dispatch exception:', err.message);
  }
  console.log('=====================================================');
}

runDiagnosis();
