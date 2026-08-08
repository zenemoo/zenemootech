import { generateApplicationConfirmationHtml } from '../src/services/applicationEmailTemplate.js';

const sampleAppData = {
  applicant_id: 'APP-2026-4339',
  opportunity_title: 'Odia Audio Transcription',
  applicant_name: 'Prem Prasad Pradhan',
  applicant_email: 'mr.prem2006@gmail.com',
  applicant_phone: '+91 9827775230',
  company_name: 'DesiCrew (DesiCrew Solutions)',
  status: 'pending',
  created_at: '2026-08-08T01:55:00.000Z',
  answers: {
    languages: 'Odia',
    experience: 'Less than 1 Year',
    availability: '2-3 Hours/Day',
    expected_rate: '₹120 / Hour',
    'Which subtitle editing software have you used?': 'Subtitle Edit',
    'What is your Odia typing speed (words per minute)?': '20',
    'Briefly describe your previous transcription, subtitle editing, or AI annotation experience.': 'hii',
  },
};

const html = generateApplicationConfirmationHtml(sampleAppData);

console.log('--- Candidate Application Confirmation Email Verification ---');
console.log('Length:', html.length, 'bytes');
console.log('Includes Applicant ID (APP-2026-4339):', html.includes('APP-2026-4339'));
console.log('Includes Opportunity Title (Odia Audio Transcription):', html.includes('Odia Audio Transcription'));
console.log('Includes Name (Prem Prasad Pradhan):', html.includes('Prem Prasad Pradhan'));
console.log('Includes Email (mr.prem2006@gmail.com):', html.includes('mr.prem2006@gmail.com'));
console.log('Includes Phone (+91 9827775230):', html.includes('+91 9827775230'));
console.log('Includes Status (PENDING):', html.includes('PENDING'));
console.log('Includes Custom Answer (Subtitle Edit):', html.includes('Subtitle Edit'));
console.log('Includes Custom Answer (typing speed 20):', html.includes('20'));
console.log('Includes Logo URL (https://raw.githubusercontent.com/...):', html.includes('https://raw.githubusercontent.com/zenemoo/zenemootech/main/frontend/public/assets/logo-email.png'));
