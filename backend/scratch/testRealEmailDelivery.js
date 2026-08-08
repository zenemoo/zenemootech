import dotenv from 'dotenv';
dotenv.config();

import { sendMailViaBrevo } from '../src/services/emailService.js';
import { generateApplicationConfirmationHtml } from '../src/services/applicationEmailTemplate.js';

const testAppRecord = {
  id: 'test-real-app-123',
  applicant_id: 'APP-2026-REALTEST',
  opportunity_title: 'Odia Audio Transcription',
  applicant_name: 'Prem Prasad Pradhan',
  applicant_email: 'mr.prem2006@gmail.com',
  applicant_phone: '+91 9827775230',
  company_name: 'DesiCrew (DesiCrew Solutions)',
  status: 'pending',
  created_at: new Date().toISOString(),
  answers: {
    languages: 'Odia',
    experience: 'Less than 1 Year',
    availability: '2-3 Hours/Day',
    expected_rate: '₹120 / Hour',
  },
};

const runRealDeliveryTest = async () => {
  console.log('====================================================');
  console.log('🚀 TESTING REAL PRODUCTION EMAIL DELIVERY VIA BREVO');
  console.log('====================================================');
  console.log('BREVO_API_KEY Present:', !!process.env.BREVO_API_KEY);
  console.log('BREVO_SMTP_KEY Present:', !!process.env.BREVO_SMTP_KEY);
  console.log('Sender:', process.env.EMAIL_FROM || 'Zenemoo <noreply@zenemoo.in>');
  console.log('Recipient (TO):', testAppRecord.applicant_email);
  console.log('CC:', process.env.EMAIL_CC || 'mr.prem2006@gmail.com');

  const html = generateApplicationConfirmationHtml(testAppRecord);
  const subject = `Application Received — ${testAppRecord.opportunity_title} | ${testAppRecord.applicant_id}`;

  try {
    const result = await sendMailViaBrevo({
      sender: process.env.EMAIL_FROM || 'Zenemoo <noreply@zenemoo.in>',
      recipients: testAppRecord.applicant_email,
      cc: process.env.EMAIL_CC || 'mr.prem2006@gmail.com',
      subject,
      html,
    });

    console.log('\n====================================================');
    console.log('✅ PRODUCTION EMAIL DISPATCH RESULT:');
    console.log(JSON.stringify(result, null, 2));
    console.log('====================================================');
  } catch (err) {
    console.error('\n====================================================');
    console.error('💥 PRODUCTION EMAIL DISPATCH FAILED:');
    console.error(err);
    console.error('====================================================');
  }
};

runRealDeliveryTest();
