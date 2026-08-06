/**
 * Zenemoo Schema.org Organization Builder (Expanded Enterprise Specification)
 */

import { buildImageObjectSchema } from './imageObject';

export const buildOrganizationSchema = () => {
  const logoSchema = buildImageObjectSchema({
    url: 'https://www.zenemoo.in/assets/logo.png',
    name: 'Zenemoo Official Logo',
    description: 'Official Logo of Zenemoo (Formerly known as QuantumCoders Data Solution)',
    caption: 'Zenemoo Enterprise AI Language & Data Solutions Logo',
    representativeOfPage: true,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.zenemoo.in/#organization',
    'name': 'Zenemoo',
    'legalName': 'Zenemoo',
    'alternateName': 'Formerly known as QuantumCoders Data Solution',
    'url': 'https://www.zenemoo.in/',
    'logo': logoSchema,
    'image': 'https://www.zenemoo.in/assets/logo.png',
    'description':
      'Zenemoo is an enterprise AI language and data services provider specializing in verbatim transcription, speech data collection, data annotation, and regional speech corpus datasets.',
    'foundingDate': '2023',
    'founder': {
      '@type': 'Person',
      'name': 'Prem Prasad Pradhan',
      'jobTitle': 'Founder & Vendor Manager',
      'email': 'prem@zenemoo.in',
    },
    'identifier': 'UDYAM-OD-11-0124893',
    'hasCredential': {
      '@type': 'EducationalOccupationalCredential',
      'name': 'MSME Udyam Registration Certificate',
      'credentialCategory': 'Government Registration Certificate',
      'recognizedBy': {
        '@type': 'GovernmentOrganization',
        'name': 'Ministry of Micro, Small and Medium Enterprises, Government of India',
      },
    },
    'email': 'contact@zenemoo.in',
    'telephone': '+91 9827775230',
    'areaServed': ['IN', 'Global'],
    'sameAs': ['https://www.linkedin.com/company/desicrew-solutions'],
    'contactPoint': [
      {
        '@type': 'ContactPoint',
        'telephone': '+91 9827775230',
        'contactType': 'customer service',
        'email': 'support@zenemoo.in',
        'areaServed': 'IN',
        'availableLanguage': ['English', 'Odia', 'Hindi'],
      },
      {
        '@type': 'ContactPoint',
        'contactType': 'sales',
        'email': 'contact@zenemoo.in',
        'areaServed': 'Global',
        'availableLanguage': ['English', 'Odia', 'Hindi'],
      },
    ],
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'K. Barida, Main Road',
      'addressLocality': 'Ganjam',
      'addressRegion': 'Odisha',
      'postalCode': '761031',
      'addressCountry': 'IN',
    },
  };
};
