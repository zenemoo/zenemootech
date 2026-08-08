import { generateContactConfirmationHtml } from '../src/services/contactEmailTemplate.js';

const testData = {
  inquiry_code: 'ZEN-2026-8EKY',
  name: 'Prem Prasad Pradhan',
  email: 'royalprem2006@gmail.com',
  phone: '+91 9827775230',
  company: 'QCDS',
  service: 'Voice Over',
  language: 'Odia',
  message: 'hii team we need work',
  created_at: '2026-08-08T13:55:00.000Z',
};

const html = generateContactConfirmationHtml(testData);

console.log('--- Contact Email Verification Test ---');
console.log('Length:', html.length, 'bytes');
console.log('Includes Exact Logo URL (https://www.zenemoo.in/assets/logo.png):', html.includes('https://www.zenemoo.in/assets/logo.png'));
console.log('Includes Dynamic Ticket (#ZEN-2026-8EKY):', html.includes('#ZEN-2026-8EKY'));
console.log('Includes Dynamic Name (Prem Prasad Pradhan):', html.includes('Prem Prasad Pradhan'));
console.log('Includes Dynamic Email (royalprem2006@gmail.com):', html.includes('royalprem2006@gmail.com'));
console.log('Includes Dynamic Phone (+91 9827775230):', html.includes('+91 9827775230'));
console.log('Includes Dynamic Company (QCDS):', html.includes('QCDS'));
console.log('Includes Dynamic Service (Voice Over):', html.includes('Voice Over'));
console.log('Includes Dynamic Language (Odia):', html.includes('Odia'));
console.log('Includes Dynamic Message (hii team we need work):', html.includes('hii team we need work'));
console.log('Includes Clean Slate Outer Background (#f1f5f9):', html.includes('background-color:#f1f5f9'));
console.log('Includes Real Footer Links (https://www.linkedin.com/company/zenemoo/):', html.includes('https://www.linkedin.com/company/zenemoo/'));
