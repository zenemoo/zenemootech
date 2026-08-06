/**
 * Zenemoo Schema.org Organization Builder
 * Generates official Organization schema with logo ImageObject & credentials.
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
      'Zenemoo is an enterprise AI language and data services company specializing in verbatim transcription, speech data collection, data annotation, and regional speech corpus datasets.',
    'foundingDate': '2023',
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
    'sameAs': ['https://www.linkedin.com/company/desicrew-solutions'],
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
