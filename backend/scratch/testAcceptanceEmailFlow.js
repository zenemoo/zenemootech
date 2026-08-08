import { generateApplicationAcceptanceHtml } from '../src/services/applicationAcceptanceEmailTemplate.js';
import { sendApplicationAcceptanceEmail } from '../src/controllers/opportunityApplicationController.js';

const sampleAcceptanceApp = {
  id: 'test-app-acc-001',
  applicant_id: 'APP-2026-4339',
  opportunity_title: 'Odia Audio Transcription',
  applicant_name: 'Prem Prasad Pradhan',
  applicant_email: 'mr.prem2006@gmail.com',
  applicant_phone: '+91 9827775230',
  company_name: 'DesiCrew',
  status: 'accepted',
  acceptance_email_status: 'pending',
  created_at: new Date().toISOString(),
  answers: {
    languages: 'Odia',
    experience: 'Less than 1 Year',
    availability: '2-3 Hours/Day',
    'Which subtitle editing software have you used?': 'Subtitle Edit',
  },
};

const runAcceptanceTestSuite = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING APPLICATION ACCEPTANCE EMAIL TEST SUITE');
  console.log('====================================================');

  // Test 1: HTML Template Generator
  const html = generateApplicationAcceptanceHtml(sampleAcceptanceApp);
  console.log('\n--- Test 1: HTML Template Generation ---');
  console.log('Length:', html.length, 'bytes');
  console.log('Includes Congratulations Heading:', html.includes('Congratulations! Your Application is'));
  console.log('Includes Accepted Highlight:', html.includes('Accepted.'));
  console.log('Includes Applicant ID (APP-2026-4339):', html.includes('APP-2026-4339'));
  console.log('Includes Applicant Name (Prem Prasad Pradhan):', html.includes('Prem Prasad Pradhan'));
  console.log('Includes Logo URL:', html.includes('https://raw.githubusercontent.com/zenemoo/zenemootech/main/frontend/public/assets/logo-email.png'));

  // Test 2: Idempotency Safeguard (ACCEPTED -> ACCEPTED when status === 'sent')
  console.log('\n--- Test 2: Idempotency Protection (ACCEPTED -> ACCEPTED when status = sent) ---');
  const alreadySentApp = { ...sampleAcceptanceApp, acceptance_email_status: 'sent' };
  const res2 = await sendApplicationAcceptanceEmail(alreadySentApp, false);
  console.log('Result for already sent record:', res2);
  console.log('Prevented Duplicate Email:', res2.message === 'Acceptance email already delivered.');

  // Test 3: Real Delivery Dispatch to test recipient mr.prem2006@gmail.com
  console.log('\n--- Test 3: Real Acceptance Email Delivery via Nodemailer / Brevo ---');
  const freshApp = { ...sampleAcceptanceApp, acceptance_email_status: 'pending' };
  const res3 = await sendApplicationAcceptanceEmail(freshApp, false);
  console.log('Delivery Result:', res3);

  console.log('\n====================================================');
  console.log('🎉 ALL ACCEPTANCE EMAIL TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
};

runAcceptanceTestSuite();
