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
  answers?: Record<string, any>;
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

/**
 * Robust Referral Code Extraction & Normalization Helper
 * Scans URL query parameters (search), hash query parameters, full URL regex,
 * and falls back to persistent sessionStorage / localStorage.
 * Normalizes by trimming and uppercase.
 */
export const extractAndStoreReferralCode = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    let rawCode = '';

    // 1. Search params (?ref=... or ?referral=...)
    if (window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      rawCode = searchParams.get('ref') || searchParams.get('referral') || '';
    }

    // 2. Hash query params (e.g. #/opportunity/id?ref=... or #opportunity/id?ref=...)
    if (!rawCode && window.location.hash && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        rawCode = hashParams.get('ref') || hashParams.get('referral') || '';
      }
    }

    // 3. Fallback regex on full URL
    if (!rawCode && window.location.href) {
      const match = window.location.href.match(/[?&](?:ref|referral)=([^&#]+)/i);
      if (match && match[1]) {
        rawCode = decodeURIComponent(match[1]);
      }
    }

    // If found in URL, normalize and persist across sessions
    if (rawCode && rawCode.trim()) {
      const clean = rawCode.trim().toUpperCase();
      try {
        sessionStorage.setItem('zenemoo_active_ref', clean);
        localStorage.setItem('zenemoo_active_ref', clean);
      } catch (_) {}
      return clean;
    }

    // 4. Fallback to active stored referral
    try {
      const stored = sessionStorage.getItem('zenemoo_active_ref') || localStorage.getItem('zenemoo_active_ref') || '';
      if (stored && stored.trim()) {
        const clean = stored.trim().toUpperCase();
        return clean;
      }
    } catch (_) {}
  } catch (_) {}

  return '';
};

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
        const res = await opportunityApplicationApi.getAll({
          opportunity_id: opportunity_id || undefined,
          include_answers: false,
        });
        if (res.data && res.data.data && Array.isArray(res.data.data)) {
          const live = res.data.data as CandidateApplication[];
          saveLocalApplications(live);
          return live;
        }
      } catch (err: any) {
        console.warn('Backend opportunity applications fetch note. Using local cache:', err.message);
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
    console.warn('Backend single application fetch note, using local cache:', err.message);
  }

  const localList = getLocalApplications();
  return localList.find((a) => a.id === id) || null;
};

// Lookup existing application by opportunity_id and email authoritatively in Backend / Supabase
export const checkExistingApplication = async (
  opportunity_id: string,
  email: string
): Promise<CandidateApplication | null> => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!opportunity_id || !cleanEmail) return null;

  // 1. Primary Check: Express API Backend (server-authoritative with zero egress overhead)
  try {
    const res = await opportunityApplicationApi.checkDuplicate(opportunity_id, cleanEmail);
    if (res.data && res.data.success !== undefined) {
      if ((res.data.isDuplicate || res.data.exists) && (res.data.existingApplication || res.data.application)) {
        return (res.data.existingApplication || res.data.application) as CandidateApplication;
      } else {
        // Authoritative NO from server: Purge any stale ghost record from localStorage
        let localList = getLocalApplications();
        const filtered = localList.filter(
          (app) => !(app.opportunity_id === opportunity_id && (app.applicant_email || '').toLowerCase() === cleanEmail)
        );
        if (filtered.length !== localList.length) {
          saveLocalApplications(filtered);
        }
        return null;
      }
    }
  } catch (apiErr: any) {
    console.warn('[checkDuplicate API Note]:', apiErr.message);
  }

  return null;
};

// Submit candidate application via Backend API with Duplicate Protection
export const submitCandidateApplication = async (
  appData: Omit<CandidateApplication, 'id' | 'status' | 'created_at'>
): Promise<CandidateApplication> => {
  if (!appData.terms_accepted) {
    throw new Error('Please accept the Terms & Conditions before submitting your application.');
  }

  let localList = getLocalApplications();
  const cleanEmail = (appData.applicant_email || '').trim().toLowerCase();
  const cleanRefCode = typeof appData.referral_code === 'string' && appData.referral_code.trim()
    ? appData.referral_code.trim().toUpperCase()
    : undefined;
  const normalizedAppData = {
    ...appData,
    applicant_email: cleanEmail,
    referral_code: cleanRefCode,
    terms_accepted: true,
    terms_accepted_at: appData.terms_accepted_at || new Date().toISOString(),
    terms_version: appData.terms_version || '1.0',
  };

  // Submit via Express API Backend (Enforces server-side duplicate protection, Sheets sync & notifications)
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
    throw new Error(apiErr.message || 'Unable to submit application. Please try again.');
  }

  throw new Error('Unable to submit application. Please try again.');
};

// Update status via Backend API and return fresh application list with updated email status
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
  } catch (e: any) {
    console.warn('Backend update candidate application error:', e.message);
  }

  // Update local storage cache
  let localList = getLocalApplications();
  localList = localList.map((app) => (app.id === id ? { ...app, ...updates, ...(backendRecord || {}) } : app));
  saveLocalApplications(localList);

  // Fetch live applications directly from API to ensure acceptance_email_status is fresh
  return await getStoredCandidateApplications();
};

// Delete application via Backend API
export const deleteCandidateApplication = async (id: string): Promise<CandidateApplication[]> => {
  try {
    await opportunityApplicationApi.delete(id);
  } catch (e: any) {
    console.warn('Backend delete candidate application error:', e.message);
  }

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
