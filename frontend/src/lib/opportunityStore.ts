import { supabase } from './supabaseClient';
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

const getLocalOpportunities = (): OpportunityProgram[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => Number(a.position) - Number(b.position));
      }
    }
  } catch (e) {}
  return [];
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

// Fetch opportunities ordered by position ASC directly from Supabase (with fallback)
export const getStoredOpportunities = async (): Promise<OpportunityProgram[]> => {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('position', { ascending: true });

    if (!error && Array.isArray(data)) {
      saveLocalOpportunities(data as OpportunityProgram[]);
      return data as OpportunityProgram[];
    }
  } catch (err: any) {
    console.warn('Direct Supabase fetch opportunities error. Trying API fallback:', err.message);
  }

  try {
    const res = await opportunityApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const live = res.data.data.sort((a: OpportunityProgram, b: OpportunityProgram) => Number(a.position) - Number(b.position));
      saveLocalOpportunities(live);
      return live;
    }
  } catch (err: any) {
    console.warn('Backend API fallback unavailable. Using local storage:', err.message);
  }

  return getLocalOpportunities();
};

// Save or update opportunity directly in Supabase
export const saveOpportunityToApi = async (opportunity: Partial<OpportunityProgram>): Promise<OpportunityProgram[]> => {
  let localList = getLocalOpportunities();

  const isUUID = opportunity.id && opportunity.id.includes('-');
  const payloadToSave = {
    title: opportunity.title || 'New Opportunity Program',
    partner_name: opportunity.partner_name || 'Partner Company',
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
    position: opportunity.position || localList.length + 1,
    updated_at: new Date().toISOString(),
  };

  try {
    if (isUUID) {
      const { error } = await supabase
        .from('opportunities')
        .update(payloadToSave)
        .eq('id', opportunity.id);
      if (error) console.error('Supabase update opportunity error:', error.message);
    } else {
      const { error } = await supabase
        .from('opportunities')
        .insert([{ ...payloadToSave, created_at: new Date().toISOString() }]);
      if (error) console.error('Supabase insert opportunity error:', error.message);
    }

    return await getStoredOpportunities();
  } catch (err: any) {
    console.warn('Direct Supabase save error. Trying backend API or local fallback:', err.message);
  }

  // Fallback API / LocalStorage
  try {
    if (isUUID) {
      await opportunityApi.update(opportunity.id!, payloadToSave);
    } else {
      await opportunityApi.create(payloadToSave);
    }
  } catch (e) {}

  if (opportunity.id && (opportunity.id.startsWith('op_') || localList.some((op) => op.id === opportunity.id))) {
    localList = localList.map((op) => (op.id === opportunity.id ? ({ ...op, ...opportunity } as OpportunityProgram) : op));
  } else {
    const newRecord: OpportunityProgram = {
      id: `op_${Date.now()}`,
      ...payloadToSave,
      created_at: new Date().toISOString(),
    } as OpportunityProgram;
    localList.push(newRecord);
  }

  return saveLocalOpportunities(localList);
};

// Reorder position directly in Supabase
export const reorderOpportunityInApi = async (id: string, newPosition: number): Promise<OpportunityProgram[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('opportunities').update({ position: newPosition }).eq('id', id);
    }
  } catch (e) {}

  let localList = getLocalOpportunities();
  const targetIndex = localList.findIndex((p) => p.id === id);
  if (targetIndex !== -1) {
    const clampedPos = Math.max(1, Math.min(newPosition, localList.length));
    const [moved] = localList.splice(targetIndex, 1);
    localList.splice(clampedPos - 1, 0, moved);
    localList = saveLocalOpportunities(localList);
  }

  return getStoredOpportunities();
};

// Delete opportunity directly from Supabase
export const deleteOpportunityFromApi = async (id: string): Promise<OpportunityProgram[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('opportunities').delete().eq('id', id);
    }
  } catch (e) {}

  let localList = getLocalOpportunities().filter((p) => p.id !== id);
  localList = saveLocalOpportunities(localList);

  return getStoredOpportunities();
};
