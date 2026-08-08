import { generateContactConfirmationHtml } from '../src/services/contactEmailTemplate.js';

const testData = {
  inquiry_code: 'ZNM-2026-0MPF',
  name: 'Siddheswar Sahu',
  email: 'siddheswarsahu1@gmail.com',
  phone: '+91 6372757463',
  company: 'DesiCrew Partner Org',
  service: 'Audio Transcription',
  language: 'Odia',
  message: 'Karya app transcription and voice recording',
  created_at: '2026-07-30T09:32:15.000Z',
};

const html = generateContactConfirmationHtml(testData);

console.log('Generated Contact Confirmation Email HTML snippet:');
console.log('Length:', html.length, 'bytes');
console.log('Includes Ticket Code:', html.includes('ZNM-2026-0MPF'));
console.log('Includes Name:', html.includes('Siddheswar Sahu'));
console.log('Includes Email:', html.includes('siddheswarsahu1@gmail.com'));
console.log('Includes Phone:', html.includes('+91 6372757463'));
console.log('Includes Message:', html.includes('Karya app transcription and voice recording'));
console.log('Includes Logo URL:', html.includes('https://www.zenemoo.in/assets/logo.png'));
console.log('\nSample HTML Header:\n', html.substring(0, 400));
