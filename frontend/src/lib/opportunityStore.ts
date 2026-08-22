import { supabase } from './supabaseClient';
import { opportunityApi } from '../services/api';

export interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'yesno' | 'email' | 'phone' | 'date' | 'checkbox';
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
  status: 'active' | 'stopped' | 'coming_soon' | 'draft';
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

  // Communication links
  whatsapp_group_url?: string;
  whatsapp_channel_url?: string;
  telegram_url?: string;
  contact_support_url?: string;

  // Social & Promotion links
  x_post_url?: string;
  facebook_post_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  other_social_url?: string;
  application_post_url?: string;

  // Project details & requirements
  about_project?: string;
  what_you_will_do?: string[];
  experience_requirements?: string;
  equipment_requirements?: string;
  internet_requirements?: string;
  working_hours?: string;
  project_duration?: string;
  payment_info?: string;
  payment_frequency?: string;
  work_mode?: 'remote' | 'hybrid' | 'onsite' | string;
  availability_requirement?: string;

  // Highlights & Benefits
  project_highlights?: string[];
  benefits?: string[];
  why_join?: string;
  important_notes?: string;

  created_at?: string;
  updated_at?: string;
}

// ----------------------------------------------------------------------
// CENTRALIZED DATA PARSING & NORMALIZATION UTILITIES
// ----------------------------------------------------------------------

/**
 * Safely parses options input into a clean string array.
 * Supports comma-separated strings ("Opt A, Opt B"), newline-separated strings, or arrays.
 */
export const parseQuestionOptions = (optionsInput: any): string[] => {
  if (!optionsInput) return [];
  if (Array.isArray(optionsInput)) {
    return optionsInput
      .flatMap((opt) => (typeof opt === 'string' ? opt.split(/[\n,]/) : [String(opt)]))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof optionsInput === 'string') {
    return optionsInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Normalizes custom question data structure ensuring stable IDs, valid question types,
 * required flags, and clean options arrays.
 */
export const normalizeQuestion = (q: any, idx: number): CustomQuestion => {
  const type = (q.type || 'text').toLowerCase();
  const rawOptions = q.options || q.choices || [];
  const parsedOptions = parseQuestionOptions(rawOptions);

  const validTypes = ['text', 'textarea', 'number', 'select', 'multiselect', 'yesno', 'email', 'phone', 'date', 'checkbox'];
  const finalType = validTypes.includes(type) ? (type as CustomQuestion['type']) : 'text';

  return {
    id: q.id || `q_${Date.now()}_${idx}`,
    label: (q.label || q.question || q.text || `Question ${idx + 1}`).trim(),
    type: finalType,
    options: parsedOptions,
    required: q.required === true || q.is_required === true,
  };
};

/**
 * Normalizes a complete OpportunityProgram object ensuring robust backward compatibility
 * for old and new records alike.
 */
export const normalizeOpportunity = (op: any): OpportunityProgram => {
  if (!op) return {} as OpportunityProgram;

  const rawQuestions = Array.isArray(op.custom_questions) ? op.custom_questions : [];
  const normalizedQuestions = rawQuestions.map((q: any, idx: number) => normalizeQuestion(q, idx));

  return {
    id: String(op.id || `op_${Date.now()}`),
    position: Number(op.position) || 1,
    title: String(op.title || '').trim(),
    partner_name: String(op.partner_name || '').trim(),
    badge: op.badge ? String(op.badge).trim() : undefined,
    status: op.status || 'active',
    description: String(op.description || '').trim(),
    company_logo: op.company_logo ? String(op.company_logo).trim() : undefined,
    poster_url: op.poster_url ? String(op.poster_url).trim() : undefined,
    public_id: op.public_id ? String(op.public_id).trim() : undefined,

    features: Array.isArray(op.features) ? op.features.map((item: any) => String(item).trim()).filter(Boolean) : [],
    requirements: Array.isArray(op.requirements) ? op.requirements.map((item: any) => String(item).trim()).filter(Boolean) : [],
    language_skills: Array.isArray(op.language_skills) ? op.language_skills.map((item: any) => String(item).trim()).filter(Boolean) : [],
    eligibility_criteria: Array.isArray(op.eligibility_criteria) ? op.eligibility_criteria.map((item: any) => String(item).trim()).filter(Boolean) : [],

    whatsapp_group_url: op.whatsapp_group_url ? String(op.whatsapp_group_url).trim() : undefined,
    whatsapp_channel_url: op.whatsapp_channel_url ? String(op.whatsapp_channel_url).trim() : undefined,
    telegram_url: op.telegram_url ? String(op.telegram_url).trim() : undefined,
    contact_support_url: op.contact_support_url ? String(op.contact_support_url).trim() : undefined,

    linkedin_post_url: op.linkedin_post_url ? String(op.linkedin_post_url).trim() : undefined,
    x_post_url: op.x_post_url || op.facebook_post_url ? String(op.x_post_url || op.facebook_post_url).trim() : undefined,
    facebook_post_url: op.facebook_post_url || op.x_post_url ? String(op.facebook_post_url || op.x_post_url).trim() : undefined,
    instagram_url: op.instagram_url ? String(op.instagram_url).trim() : undefined,
    youtube_url: op.youtube_url ? String(op.youtube_url).trim() : undefined,
    other_social_url: op.other_social_url ? String(op.other_social_url).trim() : undefined,
    application_post_url: op.application_post_url ? String(op.application_post_url).trim() : undefined,
    pdf_link: op.pdf_link ? String(op.pdf_link).trim() : undefined,

    contact_details: op.contact_details && typeof op.contact_details === 'object' ? op.contact_details : {},

    about_project: op.about_project ? String(op.about_project).trim() : undefined,
    what_you_will_do: Array.isArray(op.what_you_will_do) ? op.what_you_will_do.map((item: any) => String(item).trim()).filter(Boolean) : [],
    experience_requirements: op.experience_requirements ? String(op.experience_requirements).trim() : undefined,
    equipment_requirements: op.equipment_requirements ? String(op.equipment_requirements).trim() : undefined,
    internet_requirements: op.internet_requirements ? String(op.internet_requirements).trim() : undefined,
    working_hours: op.working_hours ? String(op.working_hours).trim() : undefined,
    project_duration: op.project_duration ? String(op.project_duration).trim() : undefined,
    payment_info: op.payment_info ? String(op.payment_info).trim() : undefined,
    payment_frequency: op.payment_frequency ? String(op.payment_frequency).trim() : undefined,
    work_mode: op.work_mode ? String(op.work_mode).trim() : 'remote',
    availability_requirement: op.availability_requirement ? String(op.availability_requirement).trim() : undefined,

    project_highlights: Array.isArray(op.project_highlights) ? op.project_highlights.map((item: any) => String(item).trim()).filter(Boolean) : [],
    benefits: Array.isArray(op.benefits) ? op.benefits.map((item: any) => String(item).trim()).filter(Boolean) : [],
    why_join: op.why_join ? String(op.why_join).trim() : undefined,
    important_notes: op.important_notes ? String(op.important_notes).trim() : undefined,

    custom_questions: normalizedQuestions,
    action_url: op.action_url || '#desicrew-contributors',
    created_at: op.created_at,
    updated_at: op.updated_at,
  };
};

const LOCAL_STORAGE_KEY = 'zenemoo_opportunities_db';

const getLocalOpportunities = (): OpportunityProgram[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map(normalizeOpportunity)
          .sort((a, b) => Number(a.position) - Number(b.position));
      }
    }
  } catch (e) {}
  return [];
};

const saveLocalOpportunities = (list: OpportunityProgram[]): OpportunityProgram[] => {
  const sorted = list
    .map(normalizeOpportunity)
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
      const formatted = data.map(normalizeOpportunity);
      saveLocalOpportunities(formatted);
      return formatted;
    } else if (error) {
      console.warn('Supabase fetch opportunities error:', error.message);
    }
  } catch (err: any) {
    console.warn('Direct Supabase fetch opportunities error. Trying API fallback:', err.message);
  }

  try {
    const res = await opportunityApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const live = res.data.data
        .map(normalizeOpportunity)
        .sort((a: OpportunityProgram, b: OpportunityProgram) => Number(a.position) - Number(b.position));
      saveLocalOpportunities(live);
      return live;
    }
  } catch (err: any) {
    console.warn('Backend API fallback unavailable. Using local storage:', err.message);
  }

  return getLocalOpportunities();
};

// Fetch public opportunities excluding drafts
export const getPublicOpportunities = async (): Promise<OpportunityProgram[]> => {
  const list = await getStoredOpportunities();
  return list.filter((op) => op.status !== 'draft');
};

// Helper to check if an ID is a temporary frontend ID
export const isTempId = (id?: string | null): boolean => {
  if (!id) return true;
  const str = String(id).trim().toLowerCase();
  return str.startsWith('temp_') || str.startsWith('new_') || str.includes('temp');
};

// Save or update opportunity directly in Supabase (with column fallback safety)
export const saveOpportunityToApi = async (opportunity: Partial<OpportunityProgram>): Promise<OpportunityProgram[]> => {
  let localList = getLocalOpportunities();

  const isExistingRecord = Boolean(opportunity.id && !isTempId(opportunity.id));

  // Normalize questions & array fields before constructing payload
  const rawQuestions = Array.isArray(opportunity.custom_questions) ? opportunity.custom_questions : [];
  const normalizedQuestions = rawQuestions.map((q, idx) => normalizeQuestion(q, idx));

  const fullPayload: Record<string, any> = {
    title: (opportunity.title || 'New Opportunity Program').trim(),
    partner_name: (opportunity.partner_name || 'Partner Company').trim(),
    badge: (opportunity.badge || 'ACTIVE').trim(),
    status: opportunity.status || 'active',
    description: (opportunity.description || '').trim(),
    company_logo: (opportunity.company_logo || '').trim(),
    poster_url: (opportunity.poster_url || '').trim(),
    public_id: (opportunity.public_id || '').trim(),
    features: Array.isArray(opportunity.features) ? opportunity.features.map((item: any) => String(item).trim()).filter(Boolean) : [],
    requirements: Array.isArray(opportunity.requirements) ? opportunity.requirements.map((item: any) => String(item).trim()).filter(Boolean) : [],
    language_skills: Array.isArray(opportunity.language_skills) ? opportunity.language_skills.map((item: any) => String(item).trim()).filter(Boolean) : [],
    eligibility_criteria: Array.isArray(opportunity.eligibility_criteria) ? opportunity.eligibility_criteria.map((item: any) => String(item).trim()).filter(Boolean) : [],
    linkedin_post_url: (opportunity.linkedin_post_url || '').trim(),
    pdf_link: (opportunity.pdf_link || '').trim(),
    contact_details: opportunity.contact_details || {},
    custom_questions: normalizedQuestions,
    action_url: (opportunity.action_url || '#desicrew-contributors').trim(),
    position: opportunity.position || localList.length + 1,
    updated_at: new Date().toISOString(),

    // Extended fields
    whatsapp_group_url: (opportunity.whatsapp_group_url || '').trim(),
    whatsapp_channel_url: (opportunity.whatsapp_channel_url || '').trim(),
    telegram_url: (opportunity.telegram_url || '').trim(),
    contact_support_url: (opportunity.contact_support_url || '').trim(),
    x_post_url: (opportunity.x_post_url || opportunity.facebook_post_url || '').trim(),
    facebook_post_url: (opportunity.facebook_post_url || opportunity.x_post_url || '').trim(),
    instagram_url: (opportunity.instagram_url || '').trim(),
    youtube_url: (opportunity.youtube_url || '').trim(),
    other_social_url: (opportunity.other_social_url || '').trim(),
    application_post_url: (opportunity.application_post_url || '').trim(),
    about_project: (opportunity.about_project || '').trim(),
    what_you_will_do: Array.isArray(opportunity.what_you_will_do) ? opportunity.what_you_will_do.map((item: any) => String(item).trim()).filter(Boolean) : [],
    experience_requirements: (opportunity.experience_requirements || '').trim(),
    equipment_requirements: (opportunity.equipment_requirements || '').trim(),
    internet_requirements: (opportunity.internet_requirements || '').trim(),
    working_hours: (opportunity.working_hours || '').trim(),
    project_duration: (opportunity.project_duration || '').trim(),
    payment_info: (opportunity.payment_info || '').trim(),
    payment_frequency: (opportunity.payment_frequency || '').trim(),
    work_mode: opportunity.work_mode || 'remote',
    availability_requirement: (opportunity.availability_requirement || '').trim(),
    project_highlights: Array.isArray(opportunity.project_highlights) ? opportunity.project_highlights.map((item: any) => String(item).trim()).filter(Boolean) : [],
    benefits: Array.isArray(opportunity.benefits) ? opportunity.benefits.map((item: any) => String(item).trim()).filter(Boolean) : [],
    why_join: (opportunity.why_join || '').trim(),
    important_notes: (opportunity.important_notes || '').trim(),
  };

  const corePayload = {
    title: fullPayload.title,
    partner_name: fullPayload.partner_name,
    badge: fullPayload.badge,
    status: fullPayload.status,
    description: fullPayload.description,
    features: fullPayload.features,
    requirements: fullPayload.requirements,
    poster_url: fullPayload.poster_url,
    public_id: fullPayload.public_id,
    action_url: fullPayload.action_url,
    position: fullPayload.position,
    updated_at: fullPayload.updated_at,
  };

  try {
    let resError;
    if (isExistingRecord) {
      const { error } = await supabase
        .from('opportunities')
        .update(fullPayload)
        .eq('id', opportunity.id);
      resError = error;
    } else {
      const insertPayload: Record<string, any> = { ...fullPayload, created_at: new Date().toISOString() };
      delete insertPayload.id;
      const { error } = await supabase
        .from('opportunities')
        .insert([insertPayload]);
      resError = error;
    }

    if (resError) {
      console.warn('Primary Supabase save failed, attempting core payload update/insert:', resError.message);
      if (isExistingRecord) {
        await supabase.from('opportunities').update(corePayload).eq('id', opportunity.id);
      } else {
        const coreInsertPayload: Record<string, any> = { ...corePayload, created_at: new Date().toISOString() };
        delete coreInsertPayload.id;
        await supabase.from('opportunities').insert([coreInsertPayload]);
      }
    }

    const updatedList = await getStoredOpportunities();
    if (updatedList.length > 0) return updatedList;
  } catch (err: any) {
    console.warn('Direct Supabase save error. Trying local fallback:', err.message);
  }

  // Fallback LocalStorage update
  if (isExistingRecord) {
    localList = localList.map((op) => (op.id === opportunity.id ? normalizeOpportunity({ ...op, ...fullPayload, id: opportunity.id }) : op));
  } else {
    const newRecord: OpportunityProgram = normalizeOpportunity({
      id: `op_${Date.now()}`,
      ...fullPayload,
      created_at: new Date().toISOString(),
    });
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
