/**
 * Zenemoo Schema.org Person Builder
 * Generates structured data JSON-LD for Team Members with complete ImageObject context.
 */

import { buildImageObjectSchema } from './imageObject';

export interface PersonMemberInput {
  name: string;
  role: string;
  photoUrl: string;
  email?: string;
  languages?: string[];
  sameAs?: string[];
}

export const buildPersonSchema = (member: PersonMemberInput) => {
  const photoSchema = buildImageObjectSchema({
    url: member.photoUrl,
    name: `${member.name} — ${member.role}`,
    description: `${member.name} is a ${member.role} at Zenemoo specializing in ${
      member.languages?.join(', ') || 'multilingual AI language technology'
    }.`,
    caption: `${member.name} — ${member.role} at Zenemoo`,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': member.name,
    'jobTitle': member.role,
    'worksFor': {
      '@type': 'Organization',
      'name': 'Zenemoo',
      'url': 'https://www.zenemoo.in/',
      'sameAs': 'https://www.zenemoo.in/',
    },
    'image': photoSchema,
    'email': member.email || undefined,
    'knowsLanguage': member.languages || ['English', 'Odia', 'Hindi'],
    'sameAs': member.sameAs || [
      'https://www.zenemoo.in/team-directory',
    ],
  };
};
