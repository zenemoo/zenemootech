import { opportunityApplicationApi } from '../services/api';

export interface CandidateApplication {
  id: string;
  opportunity_id: string;
  opportunity_title: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  answers: Record<string, any>;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
  admin_notes?: string;
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

// Fetch candidate applications (optionally filtered by opportunity_id)
export const getStoredCandidateApplications = async (opportunity_id?: string): Promise<CandidateApplication[]> => {
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

// Submit candidate application
export const submitCandidateApplication = async (
  appData: Omit<CandidateApplication, 'id' | 'status' | 'created_at'>
): Promise<CandidateApplication> => {
  let localList = getLocalApplications();

  const newApp: CandidateApplication = {
    ...appData,
    id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    status: 'pending',
    admin_notes: '',
    created_at: new Date().toISOString(),
  };

  try {
    const res = await opportunityApplicationApi.submit(appData);
    if (res.data && res.data.data) {
      const saved = res.data.data as CandidateApplication;
      localList.unshift(saved);
      saveLocalApplications(localList);
      return saved;
    }
  } catch (err: any) {
    console.warn('Backend submit application error. Saving locally:', err.message);
  }

  localList.unshift(newApp);
  saveLocalApplications(localList);
  return newApp;
};

// Update status or notes from Admin Dashboard
export const updateCandidateApplicationStatus = async (
  id: string,
  updates: { status?: 'pending' | 'shortlisted' | 'accepted' | 'rejected'; admin_notes?: string }
): Promise<CandidateApplication[]> => {
  let localList = getLocalApplications();
  localList = localList.map((app) => (app.id === id ? { ...app, ...updates } : app));
  saveLocalApplications(localList);

  try {
    await opportunityApplicationApi.update(id, updates);
  } catch (err: any) {
    console.warn('Backend update candidate status error:', err.message);
  }

  return localList;
};

// Delete application from Admin Dashboard
export const deleteCandidateApplication = async (id: string): Promise<CandidateApplication[]> => {
  let localList = getLocalApplications().filter((app) => app.id !== id);
  saveLocalApplications(localList);

  try {
    await opportunityApplicationApi.delete(id);
  } catch (err: any) {
    console.warn('Backend delete candidate application error:', err.message);
  }

  return localList;
};
