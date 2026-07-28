import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.BREVO_API_KEY || '';
const senderName = process.env.BREVO_SENDER_NAME || 'Zenemoo';
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@zenemoo.in';
const testRecipient = 'zenemootech@gmail.com';

console.log('=====================================================');
console.log('🔍 BREVO SMTP RELAY DIAGNOSIS (smtp-relay.brevo.com:587)');
console.log('=====================================================');

async function testSmtp() {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: senderEmail,
      pass: apiKey,
    },
  });

  try {
    console.log('1. Verifying SMTP connection credentials...');
    await transporter.verify();
    console.log('✅ SMTP Connection verified successfully!');

    console.log('2. Sending test email via Brevo SMTP Relay...');
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: testRecipient,
      subject: 'Zenemoo Test OTP via Brevo SMTP Relay',
      html: '<h1>Zenemoo Security Test</h1><p>Your OTP Code is: <b>555777</b></p>',
    });

    console.log('🎉 SMTP EMAIL SENT SUCCESSFULLY!');
    console.log('   - Message ID:', info.messageId);
    console.log('   - Response:', info.response);
  } catch (err) {
    console.log('❌ SMTP DISPATCH FAILED!');
    console.log('   - Error Name:', err.name);
    console.log('   - Error Message:', err.message);
    console.log('   - Error Code:', err.code);
    if (err.response) console.log('   - SMTP Server Response:', err.response);
  }
  console.log('=====================================================');
}

testSmtp();
