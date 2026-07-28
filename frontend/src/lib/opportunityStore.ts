import { opportunityApi } from '../services/api';

export interface OpportunityProgram {
  id: string;
  position: number;
  title: string;
  partner_name: string;
  badge?: string;
  status: 'active' | 'stopped' | 'coming_soon';
  description: string;
  features: string[];
  requirements: string[];
  action_url: string;
  poster_url?: string;
  public_id?: string;
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
    action_url: '#desicrew-contributors',
    poster_url: '/assets/executive.png',
  },
  {
    id: 'op_karya',
    position: 2,
    title: 'ZENEMOO × Karya',
    partner_name: 'Karya AI',
    badge: 'STOPPED',
    status: 'stopped',
    description: 'Regional AI training speech collection, transcription, and validation tasks designed directly for Indian regional languages and accents.',
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
    action_url: '#language-contributors',
    poster_url: '',
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
      features: Array.isArray(opportunity.features) ? opportunity.features : [],
      requirements: Array.isArray(opportunity.requirements) ? opportunity.requirements : [],
      action_url: opportunity.action_url || '#desicrew-contributors',
      poster_url: opportunity.poster_url || '',
      public_id: opportunity.public_id || '',
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
