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
  email_status?: 'sent' | 'pending' | 'failed' | string;
  acceptance_email_status?: 'sent' | 'pending' | 'sending' | 'failed' | string;
  acceptance_email_sent_at?: string;
  acceptance_email_message_id?: string;
  acceptance_email_error?: string;
  referral_code?: string | null;
  referrer_name?: string | null;
  referrer_email?: string | null;
  referred_by_id?: string | null;
  referral_source?: string | null;
  terms_accepted?: boolean;
  terms_accepted_at?: string;
  terms_version?: string;
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

// In-flight request deduplication map to prevent multiple parallel network cycles
const inFlightFetches: Map<string, Promise<CandidateApplication[]>> = new Map();

// Fetch candidate applications via backend API first with explicit columns (and local fallback)
export const getStoredCandidateApplications = async (opportunity_id?: string, forceRefresh = false): Promise<CandidateApplication[]> => {
  const cacheKey = opportunity_id || 'all';

  if (!forceRefresh && inFlightFetches.has(cacheKey)) {
    return inFlightFetches.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      // 1. Primary: Use Express Backend API (pruned explicit fields, low bandwidth)
      try {
        const res = await opportunityApplicationApi.getAll(opportunity_id);
        if (res.data && res.data.data && Array.isArray(res.data.data)) {
          const live = res.data.data as CandidateApplication[];
          saveLocalApplications(live);
          return live;
        }
      } catch (err: any) {
        console.warn('Backend opportunity applications fetch note. Trying fallback:', err.message);
      }

      // 2. Fallback: Direct Supabase client query with explicit columns (Zero select('*'))
      if (supabase) {
        try {
          const explicitCols = 'id, applicant_id, opportunity_id, opportunity_title, applicant_name, applicant_email, applicant_phone, answers, status, admin_notes, sync_status, sync_error, last_synced_at, terms_accepted, terms_accepted_at, terms_version, referral_code, referrer_name, referrer_email, referred_by_id, referral_source, created_at, updated_at';
          let query = supabase.from('opportunity_applications').select(explicitCols).order('created_at', { ascending: false });
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
      }

      const localList = getLocalApplications();
      if (opportunity_id) {
        return localList.filter((app) => app.opportunity_id === opportunity_id);
      }
      return localList;
    } finally {
      inFlightFetches.delete(cacheKey);
    }
  })();

  inFlightFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
};

// Fetch complete details for a single application on demand (e.g., when opening details modal)
export const getSingleCandidateApplicationById = async (id: string): Promise<CandidateApplication | null> => {
  if (!id) return null;
  try {
    const res = await opportunityApplicationApi.getById(id);
    if (res.data && res.data.data) {
      const detailed = res.data.data as CandidateApplication;
      // Merge into local cache
      const localList = getLocalApplications();
      const idx = localList.findIndex((a) => a.id === id);
      if (idx !== -1) {
        localList[idx] = { ...localList[idx], ...detailed };
        saveLocalApplications(localList);
      }
      return detailed;
    }
  } catch (err: any) {
    console.warn('Backend single application fetch note, trying Supabase direct:', err.message);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('opportunity_applications').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return data as CandidateApplication;
      }
    } catch (_) {}
  }

  const localList = getLocalApplications();
  return localList.find((a) => a.id === id) || null;
};

// Lookup existing application by opportunity_id and email in Supabase / LocalStorage
export const checkExistingApplication = async (
  opportunity_id: string,
  email: string
): Promise<CandidateApplication | null> => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!opportunity_id || !cleanEmail) return null;

  // 1. Check direct Supabase database
  try {
    const { data } = await supabase
      .from('opportunity_applications')
      .select('*')
      .eq('opportunity_id', opportunity_id)
      .ilike('applicant_email', cleanEmail)
      .limit(1);

    if (data && data.length > 0) {
      return data[0] as CandidateApplication;
    }
  } catch (_) {}

  // 2. Check LocalStorage fallback
  const localList = getLocalApplications();
  const found = localList.find(
    (app) => app.opportunity_id === opportunity_id && (app.applicant_email || '').toLowerCase() === cleanEmail
  );
  return found || null;
};

// Submit candidate application directly to Supabase / Backend API with Duplicate Protection
export const submitCandidateApplication = async (
  appData: Omit<CandidateApplication, 'id' | 'status' | 'created_at'>
): Promise<CandidateApplication> => {
  if (!appData.terms_accepted) {
    throw new Error('Please accept the Terms & Conditions before submitting your application.');
  }

  let localList = getLocalApplications();
  const cleanEmail = (appData.applicant_email || '').trim().toLowerCase();
  const normalizedAppData = {
    ...appData,
    applicant_email: cleanEmail,
    terms_accepted: true,
    terms_accepted_at: appData.terms_accepted_at || new Date().toISOString(),
    terms_version: appData.terms_version || '1.0',
  };

  // Primary Method: Submit via Express API Backend (Enforces server-side duplicate protection & notifications)
  try {
    const res = await opportunityApplicationApi.submit(normalizedAppData);
    if (res.data && res.data.data) {
      const saved = res.data.data as CandidateApplication;
      localList.unshift(saved);
      saveLocalApplications(localList);
      return saved;
    }
  } catch (apiErr: any) {
    const responseData = apiErr.response?.data;
    if (responseData?.code === 'DUPLICATE_APPLICATION' || apiErr.response?.status === 409) {
      const dupError = new Error(responseData?.message || 'You have already applied for this opportunity using this email address.') as any;
      dupError.code = 'DUPLICATE_APPLICATION';
      dupError.isDuplicate = true;
      throw dupError;
    }
    if (responseData?.error) {
      throw new Error(responseData.error);
    }
    console.warn('Express submit application note, trying direct Supabase fallback:', apiErr.message);
  }

  // Fallback Method: Direct Supabase client insert (When backend API is unreachable)
  // MUST perform client-side pre-check for duplicates before inserting
  try {
    const { data: existingApps } = await supabase
      .from('opportunity_applications')
      .select('id, applicant_id')
      .eq('opportunity_id', normalizedAppData.opportunity_id)
      .ilike('applicant_email', cleanEmail)
      .limit(1);

    if (existingApps && existingApps.length > 0) {
      const dupError = new Error('You have already applied for this opportunity using this email address.') as any;
      dupError.code = 'DUPLICATE_APPLICATION';
      dupError.isDuplicate = true;
      throw dupError;
    }

    const generatedId = `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const dbRecord = {
      applicant_id: normalizedAppData.applicant_id || generatedId,
      opportunity_id: normalizedAppData.opportunity_id,
      opportunity_title: normalizedAppData.opportunity_title || 'General Opportunity',
      applicant_name: normalizedAppData.applicant_name,
      applicant_email: cleanEmail,
      applicant_phone: normalizedAppData.applicant_phone,
      answers: normalizedAppData.answers || {},
      status: 'pending',
      terms_accepted: true,
      terms_accepted_at: normalizedAppData.terms_accepted_at,
      terms_version: normalizedAppData.terms_version,
      admin_notes: '',
      sync_status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('opportunity_applications').insert([dbRecord]).select();
    if (!error && data && data.length > 0) {
      const saved = data[0] as CandidateApplication;
      localList.unshift(saved);
      saveLocalApplications(localList);

      // Asynchronously trigger backend confirmation email dispatch, Telegram alert, and Google Sheets sync
      try {
        opportunityApplicationApi.sendConfirmation(saved).catch((err) => {
          console.warn('[Post-insert confirmation trigger note]:', err.message);
        });
      } catch (_) {}

      return saved;
    } else if (error) {
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
        const dupError = new Error('You have already applied for this opportunity using this email address.') as any;
        dupError.code = 'DUPLICATE_APPLICATION';
        dupError.isDuplicate = true;
        throw dupError;
      }
      console.error('Supabase insert application error:', error.message);
    }
  } catch (err: any) {
    if (err.code === 'DUPLICATE_APPLICATION' || err.isDuplicate) {
      throw err;
    }
    console.warn('Direct Supabase submit application error:', err.message);
  }

  const generatedId = `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const fallbackApp: CandidateApplication = {
    id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    applicant_id: normalizedAppData.applicant_id || generatedId,
    opportunity_id: normalizedAppData.opportunity_id,
    opportunity_title: normalizedAppData.opportunity_title || 'General Opportunity',
    applicant_name: normalizedAppData.applicant_name,
    applicant_email: cleanEmail,
    applicant_phone: normalizedAppData.applicant_phone,
    answers: normalizedAppData.answers || {},
    status: 'pending',
  };

  localList.unshift(fallbackApp);
  saveLocalApplications(localList);
  return fallbackApp;
};

// Update status directly via API / Supabase and return fresh application list with updated email status
export const updateCandidateApplicationStatus = async (
  id: string,
  updates: { status?: 'pending' | 'shortlisted' | 'accepted' | 'rejected'; admin_notes?: string }
): Promise<CandidateApplication[]> => {
  let backendRecord: CandidateApplication | null = null;

  try {
    const res = await opportunityApplicationApi.update(id, updates);
    if (res.data && res.data.data) {
      backendRecord = res.data.data;
    }
  } catch (e) {}

  if (!backendRecord) {
    try {
      if (id && id.includes('-')) {
        await supabase.from('opportunity_applications').update(updates).eq('id', id);
      }
    } catch (e) {}
  }

  // Update local storage cache
  let localList = getLocalApplications();
  localList = localList.map((app) => (app.id === id ? { ...app, ...updates, ...(backendRecord || {}) } : app));
  saveLocalApplications(localList);

  // Fetch live applications directly from Supabase / API to ensure acceptance_email_status is fresh
  return await getStoredCandidateApplications();
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

// Manually resend acceptance email for an application (Explicit Admin Retry)
export const resendCandidateAcceptanceEmail = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await opportunityApplicationApi.resendAcceptance(id);
    return {
      success: res.data?.status === 'success',
      message: res.data?.message || 'Acceptance email resent successfully',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.error || err.message || 'Resend failed',
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
