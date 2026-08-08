import dotenv from 'dotenv';
dotenv.config();
import { sendMailViaBrevo } from '../src/services/emailService.js';

const testSenders = [
  'Zenemoo <noreply@zenemoo.in>',
  'Zenemoo <contact@zenemoo.in>',
  'Zenemoo <support@zenemoo.in>',
  'Zenemoo <zenemootech@gmail.com>',
];

const runTest = async () => {
  for (const sender of testSenders) {
    console.log(`\n----------------------------------------------------`);
    console.log(`Testing Sender: ${sender}`);
    try {
      const res = await sendMailViaBrevo({
        sender,
        recipients: 'mr.prem2006@gmail.com',
        cc: 'mr.prem2006@gmail.com',
        subject: `Test Delivery from ${sender.split('<')[1].replace('>', '')}`,
        html: `<p>Test message sent from ${sender} at ${new Date().toISOString()}</p>`,
      });
      console.log('Result:', res);
    } catch (err) {
      console.error('Failed:', err.message);
    }
  }
};

runTest();
