import { supabase } from './supabaseClient';
import { opportunityApplicationApi } from '../services/api';

export interface CandidateApplication {
  id: string;
  applicant_id?: string;
  opportunity_id: string;
  opportunity_title: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  answers: Record<string, any>;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
  admin_notes?: string;
  sync_status?: 'synced' | 'pending' | 'failed' | string;
  sync_error?: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'zenemoo_opp_applications_db';

const getLocalApplications = (): CandidateApplication[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}
  return [];
};

const saveLocalApplications = (list: CandidateApplication[]): CandidateApplication[] => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
  return list;
};

// Fetch candidate applications directly from Supabase (with fallback)
export const getStoredCandidateApplications = async (opportunity_id?: string): Promise<CandidateApplication[]> => {
  try {
    let query = supabase.from('opportunity_applications').select('*').order('created_at', { ascending: false });
    if (opportunity_id) {
      query = query.eq('opportunity_id', opportunity_id);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      saveLocalApplications(data as CandidateApplication[]);
      return data as CandidateApplication[];
    }
  } catch (err: any) {
    console.warn('Direct Supabase fetch candidate applications error:', err.message);
  }

  try {
    const res = await opportunityApplicationApi.getAll(opportunity_id);
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const live = res.data.data as CandidateApplication[];
      saveLocalApplications(live);
      return live;
    }
  } catch (err: any) {
    console.warn('Backend opportunity applications fetch error. Using local fallback:', err.message);
  }

  const localList = getLocalApplications();
  if (opportunity_id) {
    return localList.filter((app) => app.opportunity_id === opportunity_id);
  }
  return localList;
};

// Submit candidate application directly to Supabase
export const submitCandidateApplication = async (
  appData: Omit<CandidateApplication, 'id' | 'status' | 'created_at'>
): Promise<CandidateApplication> => {
  let localList = getLocalApplications();
  const generatedId = `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const dbRecord = {
    applicant_id: appData.applicant_id || generatedId,
    opportunity_id: appData.opportunity_id,
    opportunity_title: appData.opportunity_title || 'General Opportunity',
    applicant_name: appData.applicant_name,
    applicant_email: appData.applicant_email,
    applicant_phone: appData.applicant_phone,
    answers: appData.answers || {},
    status: 'pending',
    admin_notes: '',
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('opportunity_applications').insert([dbRecord]).select();
    if (!error && data && data.length > 0) {
      const saved = data[0] as CandidateApplication;
      localList.unshift(saved);
      saveLocalApplications(localList);

      // Trigger backend submission to ensure async Google Sheets sync is executed
      try {
        await opportunityApplicationApi.submit(appData);
      } catch (_) {}

      return saved;
    } else if (error) {
      console.error('Supabase insert application error:', error.message);
    }
  } catch (err: any) {
    console.warn('Direct Supabase submit application error:', err.message);
  }

  // Fallback submit via Express API
  try {
    const res = await opportunityApplicationApi.submit(appData);
    if (res.data && res.data.data) {
      const saved = res.data.data as CandidateApplication;
      localList.unshift(saved);
      saveLocalApplications(localList);
      return saved;
    }
  } catch (apiErr: any) {
    console.warn('Express submit application note:', apiErr.message);
  }

  const fallbackApp: CandidateApplication = {
    id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...dbRecord,
    status: 'pending',
  };

  localList.unshift(fallbackApp);
  saveLocalApplications(localList);
  return fallbackApp;
};

// Update status directly in Supabase and trigger Sheets sync
export const updateCandidateApplicationStatus = async (
  id: string,
  updates: { status?: 'pending' | 'shortlisted' | 'accepted' | 'rejected'; admin_notes?: string }
): Promise<CandidateApplication[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('opportunity_applications').update(updates).eq('id', id);
    }
  } catch (e) {}

  try {
    await opportunityApplicationApi.update(id, updates);
  } catch (e) {}

  let localList = getLocalApplications();
  localList = localList.map((app) => (app.id === id ? { ...app, ...updates } : app));
  saveLocalApplications(localList);

  return getStoredCandidateApplications();
};

// Delete application directly from Supabase
export const deleteCandidateApplication = async (id: string): Promise<CandidateApplication[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('opportunity_applications').delete().eq('id', id);
    }
  } catch (e) {}

  try {
    await opportunityApplicationApi.delete(id);
  } catch (e) {}

  let localList = getLocalApplications().filter((app) => app.id !== id);
  saveLocalApplications(localList);

  return getStoredCandidateApplications();
};

// Manually resync single application to Google Sheets
export const resyncSingleCandidateApplication = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await opportunityApplicationApi.resyncSingle(id);
    return {
      success: res.data?.status === 'success',
      message: res.data?.message || 'Resynced to Google Sheets',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.error || err.message || 'Resync failed',
    };
  }
};

// Manually resync all applications for an opportunity to Google Sheets
export const resyncOpportunityApplicationsBulk = async (opportunityId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await opportunityApplicationApi.resyncAll(opportunityId);
    return {
      success: res.data?.status === 'success',
      message: res.data?.message || `Resynced applications to Google Sheets`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.error || err.message || 'Bulk resync failed',
    };
  }
};
