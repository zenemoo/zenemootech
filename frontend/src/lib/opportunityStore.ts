import { opportunityApi } from '../services/api';

export interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required: boolean;
}

export interface OpportunityContactDetails {
  email?: string;
  phone?: string;
  contact_person?: string;
}

export interface OpportunityProgram {
  id: string;
  position: number;
  title: string;
  partner_name: string;
  badge?: string;
  status: 'active' | 'stopped' | 'coming_soon';
  description: string;
  company_logo?: string;
  poster_url?: string;
  public_id?: string;
  features: string[];
  requirements: string[];
  language_skills?: string[];
  eligibility_criteria?: string[];
  linkedin_post_url?: string;
  pdf_link?: string;
  contact_details?: OpportunityContactDetails;
  custom_questions?: CustomQuestion[];
  action_url: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'zenemoo_opportunities_db';

const DEFAULT_INITIAL_OPPORTUNITIES: OpportunityProgram[] = [
  {
    id: 'op_desicrew',
    position: 1,
    title: 'ZENEMOO × DesiCrew',
    partner_name: 'DesiCrew Solutions',
    badge: 'ACTIVE',
    status: 'active',
    description: 'Professional enterprise transcription, annotation, and translation services. Direct integration with verified corporate BPO deliverables.',
    company_logo: '/assets/desicrew_logo.png',
    poster_url: '/assets/executive.png',
    features: [
      '1.5+ Years Verified Collaboration',
      'Advanced Audio Transcription Tasks',
      'Enterprise SLA Requirements',
      'Registration Open: Onboarding Active',
    ],
    requirements: [
      'Windows 10/11 or Mac PC',
      'Aegisub / Subtitle Edit Software',
      'Native Odia Speaker Proficiency',
      '180+ Minutes Audio Target per Day',
    ],
    language_skills: ['Odia (Native)', 'Indian English', 'Aegisub Tool', 'Subtitle Edit'],
    eligibility_criteria: ['PC/Laptop Hardware Required', 'Fast Internet Connection', 'Native Listening & Typing Accuracy'],
    linkedin_post_url: 'https://www.linkedin.com/company/desicrew-solutions',
    pdf_link: '',
    contact_details: {
      contact_person: 'Viji M.P. (Team Lead)',
      email: 'zenemootech@gmail.com',
      phone: '+91 98765 43210',
    },
    custom_questions: [
      { id: 'q1', label: 'What is your Odia typing speed (words per minute)?', type: 'text', required: true },
      { id: 'q2', label: 'How many hours daily can you dedicate to transcription work?', type: 'select', options: ['2-3 Hours', '4-5 Hours (Recommended)', '6+ Hours (Full-Time)'], required: true },
      { id: 'q3', label: 'Briefly mention any past speech annotation or audio editing experience:', type: 'textarea', required: false },
    ],
    action_url: '#desicrew-contributors',
  },
  {
    id: 'op_karya',
    position: 2,
    title: 'ZENEMOO × Karya',
    partner_name: 'Karya AI',
    badge: 'STOPPED',
    status: 'stopped',
    description: 'Regional AI training speech collection, transcription, and validation tasks designed directly for Indian regional languages and accents.',
    company_logo: '',
    poster_url: '',
    features: [
      'Priority: Odia & Regional Accents',
      '₹5 per Minute of Validated Speech',
      'Flexible Work From Home',
      'Onboarding Temporarily Stopped',
    ],
    requirements: [
      'Smartphone or Laptop',
      'Indian Regional Accents (Odia)',
      'Basic Audio Quality Standard',
    ],
    language_skills: ['Odia (Regional Accents)', 'Speech Dataset Recording'],
    eligibility_criteria: ['Android Smartphone or Laptop', 'Quiet Recording Space'],
    linkedin_post_url: '',
    pdf_link: '',
    contact_details: {
      contact_person: 'Operations Team',
      email: 'zenemootech@gmail.com',
    },
    custom_questions: [],
    action_url: '#language-contributors',
  },
];

const getLocalOpportunities = (): OpportunityProgram[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => Number(a.position) - Number(b.position));
      }
    }
  } catch (e) {}
  return DEFAULT_INITIAL_OPPORTUNITIES;
};

const saveLocalOpportunities = (list: OpportunityProgram[]): OpportunityProgram[] => {
  const sorted = list
    .map((item, idx) => ({ ...item, position: idx + 1 }))
    .sort((a, b) => Number(a.position) - Number(b.position));
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {}
  return sorted;
};

// Fetch opportunities ordered by position ASC
export const getStoredOpportunities = async (): Promise<OpportunityProgram[]> => {
  try {
    const res = await opportunityApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      const live = res.data.data.sort((a: OpportunityProgram, b: OpportunityProgram) => Number(a.position) - Number(b.position));
      saveLocalOpportunities(live);
      return live;
    }
  } catch (err: any) {
    console.warn('Backend opportunities API unavailable (404/network). Using local storage fallback:', err.message);
  }
  return getLocalOpportunities();
};

// Save or update opportunity
export const saveOpportunityToApi = async (opportunity: Partial<OpportunityProgram>): Promise<OpportunityProgram[]> => {
  let localList = getLocalOpportunities();

  try {
    let res;
    if (opportunity.id && !opportunity.id.startsWith('op_') && !opportunity.id.startsWith('temp_')) {
      res = await opportunityApi.update(opportunity.id, opportunity);
    } else {
      const { id, ...newPayload } = opportunity;
      res = await opportunityApi.create(newPayload);
    }
    if (res.data && res.data.opportunities && Array.isArray(res.data.opportunities)) {
      saveLocalOpportunities(res.data.opportunities);
      return res.data.opportunities;
    }
  } catch (err: any) {
    console.warn('Backend opportunity save API error. Saving to local storage:', err.message);
  }

  // Fallback LocalStorage
  if (opportunity.id && (opportunity.id.startsWith('op_') || localList.some((op) => op.id === opportunity.id))) {
    localList = localList.map((op) => (op.id === opportunity.id ? ({ ...op, ...opportunity } as OpportunityProgram) : op));
  } else {
    const newRecord: OpportunityProgram = {
      id: `op_${Date.now()}`,
      position: localList.length + 1,
      title: opportunity.title || 'New Program Opportunity',
      partner_name: opportunity.partner_name || 'DesiCrew Solutions',
      badge: opportunity.badge || 'ACTIVE',
      status: opportunity.status || 'active',
      description: opportunity.description || '',
      company_logo: opportunity.company_logo || '',
      poster_url: opportunity.poster_url || '',
      public_id: opportunity.public_id || '',
      features: Array.isArray(opportunity.features) ? opportunity.features : [],
      requirements: Array.isArray(opportunity.requirements) ? opportunity.requirements : [],
      language_skills: Array.isArray(opportunity.language_skills) ? opportunity.language_skills : [],
      eligibility_criteria: Array.isArray(opportunity.eligibility_criteria) ? opportunity.eligibility_criteria : [],
      linkedin_post_url: opportunity.linkedin_post_url || '',
      pdf_link: opportunity.pdf_link || '',
      contact_details: opportunity.contact_details || {},
      custom_questions: Array.isArray(opportunity.custom_questions) ? opportunity.custom_questions : [],
      action_url: opportunity.action_url || '#desicrew-contributors',
      created_at: new Date().toISOString(),
    };
    localList.push(newRecord);
  }

  return saveLocalOpportunities(localList);
};

// Reorder position
export const reorderOpportunityInApi = async (id: string, newPosition: number): Promise<OpportunityProgram[]> => {
  let localList = getLocalOpportunities();
  const targetIndex = localList.findIndex((p) => p.id === id);
  if (targetIndex !== -1) {
    const clampedPos = Math.max(1, Math.min(newPosition, localList.length));
    const [moved] = localList.splice(targetIndex, 1);
    localList.splice(clampedPos - 1, 0, moved);
    localList = saveLocalOpportunities(localList);
  }

  try {
    const res = await opportunityApi.reorder(id, newPosition);
    if (res.data && res.data.opportunities && Array.isArray(res.data.opportunities)) {
      saveLocalOpportunities(res.data.opportunities);
      return res.data.opportunities;
    }
  } catch (err: any) {
    console.warn('Backend opportunity reorder API error:', err.message);
  }

  return localList;
};

// Delete opportunity
export const deleteOpportunityFromApi = async (id: string): Promise<OpportunityProgram[]> => {
  let localList = getLocalOpportunities().filter((p) => p.id !== id);
  localList = saveLocalOpportunities(localList);

  try {
    const res = await opportunityApi.delete(id);
    if (res.data && res.data.opportunities && Array.isArray(res.data.opportunities)) {
      saveLocalOpportunities(res.data.opportunities);
      return res.data.opportunities;
    }
  } catch (err: any) {
    console.warn('Backend opportunity delete API error:', err.message);
  }

  return localList;
};
