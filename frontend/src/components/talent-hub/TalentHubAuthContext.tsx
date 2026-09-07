import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { talentHubApi } from '../../services/talentHubApi';
import type { Session, User } from '@supabase/supabase-js';

export interface TalentProfile {
  id: string;
  registration_code: string;
  full_name: string;
  gender: string;
  email: string;
  phone: string;
  country_code: string;
  state: string;
  city_district: string;
  preferred_contact: string;
  primary_role: string;
  role_details: Record<string, any>;
  has_previous_experience: boolean;
  work_capabilities: string[];
  availability: string;
  working_preference: string;
  equipment_resources: Record<string, any>;
  additional_info: Record<string, any>;
  consents: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TalentLanguage {
  id: string;
  language: string;
  proficiency: string;
  speaker_availability: string;
  capacity: number;
  created_at: string;
}

export interface TalentExperience {
  id: string;
  project_company_name: string;
  type_of_work: string;
  languages_used: string;
  work_volume: string;
  duration: string;
  description: string;
  created_at: string;
}

export interface OpportunityItem {
  id: string;
  title: string;
  partner_name?: string;
  badge?: string;
  status: string; // 'active' | 'open' | 'coming_soon' | 'closed'
  description?: string;
  features?: string[];
  requirements?: string[];
  language_skills?: string[];
  action_url?: string;
  poster_url?: string;
  pdf_link?: string;
  linkedin_post_url?: string;
  applicant_count?: number;
  custom_questions?: any[];
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApplicationItem {
  id: string;
  applicant_id: string;
  opportunity_id: string;
  opportunity_title: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  answers: Record<string, any>;
  status: string; // 'pending' | 'shortlisted' | 'accepted' | 'rejected'
  created_at: string;
  updated_at?: string;
}

export type TalentHubAuthState =
  | 'checkingSession'
  | 'unauthenticated'
  | 'loadingProfile'
  | 'profileLoaded'
  | 'profileError';

interface TalentHubAuthContextType {
  // Auth & Profile state
  session: Session | null;
  user: User | null;
  token: string | null;
  talentProfile: TalentProfile | null;
  languages: TalentLanguage[];
  experiences: TalentExperience[];
  isRegistered: boolean | null; // null = checking, true = found, false = not registered
  authState: TalentHubAuthState;
  isLoading: boolean;
  isProfileLoading: boolean;
  authError: string | null;

  // Cached Data State
  opportunities: OpportunityItem[];
  applications: ApplicationItem[];
  isDataLoading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;

  // Real Dashboard Statistics
  totalApplications: number;
  pendingCount: number;
  shortlistedCount: number;
  acceptedCount: number;
  activeOpportunitiesCount: number;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTalentHubData: (isManual?: boolean) => Promise<void>;
  mutateApplications: (newOrUpdatedApp: ApplicationItem) => void;
}

const TalentHubAuthContext = createContext<TalentHubAuthContextType | undefined>(undefined);

export const TalentHubAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [talentProfile, setTalentProfile] = useState<TalentProfile | null>(null);
  const [languages, setLanguages] = useState<TalentLanguage[]>([]);
  const [experiences, setExperiences] = useState<TalentExperience[]>([]);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [authState, setAuthState] = useState<TalentHubAuthState>('checkingSession');
  const [authError, setAuthError] = useState<string | null>(null);

  // Cached Portal Data State
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const inFlightProfileTokenRef = useRef<string | null>(null);
  const lastLoadedTokenRef = useRef<string | null>(null);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  /**
   * Loads both opportunities and applications data for the authenticated session.
   * Runs in parallel with error isolation.
   */
  const loadPortalData = useCallback(async (accessToken: string) => {
    if (!accessToken) return;
    setIsDataLoading(true);
    try {
      const [oppRes, appRes] = await Promise.allSettled([
        talentHubApi.getOpportunities(accessToken),
        talentHubApi.getApplications(accessToken),
      ]);

      if (oppRes.status === 'fulfilled' && oppRes.value?.success) {
        setOpportunities(oppRes.value.data || []);
      }
      if (appRes.status === 'fulfilled' && appRes.value?.success) {
        setApplications(appRes.value.data || []);
      }
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error('[TalentHub Portal Data Load Error]:', err.message);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  /**
   * Loads verified profile, languages, and experiences.
   */
  const loadTalentProfile = useCallback(
    async (accessToken: string, skipDataLoad = false) => {
      if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
        setAuthState('unauthenticated');
        return;
      }

      // Prevent duplicate in-flight requests for the same token
      if (inFlightProfileTokenRef.current === accessToken) {
        return;
      }

      inFlightProfileTokenRef.current = accessToken;
      setAuthState('loadingProfile');
      setAuthError(null);

      try {
        const res = await talentHubApi.getProfile(accessToken);
        if (res && res.success) {
          if (res.registered) {
            setTalentProfile(res.talent || null);
            setLanguages(res.languages || []);
            setExperiences(res.experiences || []);
            setIsRegistered(true);
            setAuthState('profileLoaded');

            // Once profile is loaded for a registered user, populate opportunities & applications cache
            if (!skipDataLoad) {
              loadPortalData(accessToken);
            }
          } else {
            setTalentProfile(null);
            setLanguages([]);
            setExperiences([]);
            setIsRegistered(false);
            setAuthState('profileLoaded');
          }
          lastLoadedTokenRef.current = accessToken;
        } else {
          setAuthError(res?.message || "We couldn't load your information right now. Please try again.");
          setIsRegistered(false);
          setAuthState('profileError');
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const errData = err?.response?.data;
        console.error('[TalentHub Profile Load Error]:', status || err.message, errData || '');

        if (status === 401 || status === 403) {
          // Expired or invalid session - treat cleanly as unauthenticated
          setSession(null);
          setUser(null);
          setTalentProfile(null);
          setLanguages([]);
          setExperiences([]);
          setOpportunities([]);
          setApplications([]);
          setIsRegistered(null);
          setAuthState('unauthenticated');
          setAuthError(null);
          lastLoadedTokenRef.current = null;
          lastLoadedUserIdRef.current = null;
        } else if (errData?.registered === false) {
          setTalentProfile(null);
          setLanguages([]);
          setExperiences([]);
          setIsRegistered(false);
          setAuthState('profileLoaded');
        } else {
          setAuthState('profileError');
          setAuthError("We couldn't load your information right now. Please try again.");
        }
      } finally {
        inFlightProfileTokenRef.current = null;
      }
    },
    [loadPortalData]
  );

  /**
   * Manual or program-level full refresh.
   * Fetches latest profile, opportunities, applications, and dashboard statistics in parallel.
   */
  const refreshTalentHubData = useCallback(
    async (isManual = false) => {
      const currentToken = session?.access_token;
      if (!currentToken || isRefreshingRef.current) return;

      isRefreshingRef.current = true;
      if (isManual) setIsRefreshing(true);

      try {
        const [profileRes, oppRes, appRes] = await Promise.allSettled([
          talentHubApi.getProfile(currentToken),
          talentHubApi.getOpportunities(currentToken),
          talentHubApi.getApplications(currentToken),
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value?.success) {
          if (profileRes.value.registered) {
            setTalentProfile(profileRes.value.talent || null);
            setLanguages(profileRes.value.languages || []);
            setExperiences(profileRes.value.experiences || []);
            setIsRegistered(true);
            setAuthState('profileLoaded');
          }
        }

        if (oppRes.status === 'fulfilled' && oppRes.value?.success) {
          setOpportunities(oppRes.value.data || []);
        }

        if (appRes.status === 'fulfilled' && appRes.value?.success) {
          setApplications(appRes.value.data || []);
        }

        setLastRefreshedAt(new Date());
      } catch (err: any) {
        console.error('[TalentHub Manual Refresh Error]:', err.message);
      } finally {
        isRefreshingRef.current = false;
        if (isManual) {
          setTimeout(() => setIsRefreshing(false), 400);
        }
      }
    },
    [session?.access_token]
  );

  /**
   * Optimistically appends or updates an application locally in the cache.
   */
  const mutateApplications = useCallback((newOrUpdatedApp: ApplicationItem) => {
    setApplications((prev) => {
      const idx = prev.findIndex(
        (a) => a.id === newOrUpdatedApp.id || (a.opportunity_id === newOrUpdatedApp.opportunity_id && a.opportunity_id)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newOrUpdatedApp };
        return copy;
      }
      return [newOrUpdatedApp, ...prev];
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 0. Detect OAuth errors in URL query/hash
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashClean = (window.location.hash || '').replace(/^#/, '');
      const hashParams = new URLSearchParams(hashClean);

      const errCode =
        searchParams.get('error_code') ||
        hashParams.get('error_code') ||
        searchParams.get('error') ||
        hashParams.get('error');
      const errDesc = searchParams.get('error_description') || hashParams.get('error_description');

      if (errCode || errDesc) {
        console.warn('[TalentHub OAuth Error Detected]:', errCode, errDesc);
        setAuthError("We couldn't sign you in with Google. Please try again.");
      }
    }

    // 1. Check current Supabase Auth session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error('[Supabase getSession Error]:', error.message);
          setSession(null);
          setUser(null);
          setAuthState('unauthenticated');
          return;
        }

        if (currentSession && currentSession.access_token) {
          setSession(currentSession);
          setUser(currentSession.user || null);
          lastLoadedUserIdRef.current = currentSession.user?.id || null;
          loadTalentProfile(currentSession.access_token);
        } else {
          setSession(null);
          setUser(null);
          setTalentProfile(null);
          setLanguages([]);
          setExperiences([]);
          setOpportunities([]);
          setApplications([]);
          setIsRegistered(null);
          setAuthState('unauthenticated');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[Supabase getSession Exception]:', err);
        setSession(null);
        setUser(null);
        setAuthState('unauthenticated');
      });

    // 2. Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession || !newSession.access_token) {
        setSession(null);
        setUser(null);
        setTalentProfile(null);
        setLanguages([]);
        setExperiences([]);
        setOpportunities([]);
        setApplications([]);
        setIsRegistered(null);
        setAuthState('unauthenticated');
        setAuthError(null);
        lastLoadedTokenRef.current = null;
        lastLoadedUserIdRef.current = null;
        return;
      }

      const isSameUser = lastLoadedUserIdRef.current && lastLoadedUserIdRef.current === newSession.user?.id;

      setSession(newSession);
      setUser(newSession.user || null);
      lastLoadedUserIdRef.current = newSession.user?.id || null;

      // When tab focus triggers TOKEN_REFRESHED, do NOT wipe or reload data if already loaded!
      if (event === 'TOKEN_REFRESHED' && isSameUser && lastLoadedTokenRef.current) {
        lastLoadedTokenRef.current = newSession.access_token;
        return;
      }

      // If new sign-in or different user, perform fresh load
      if (newSession.access_token !== lastLoadedTokenRef.current) {
        await loadTalentProfile(newSession.access_token);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadTalentProfile]);

  const getOAuthRedirectUrl = (): string => {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin.replace(/\/$/, '');
      return `${origin}/talent-hub`;
    }
    return 'https://www.zenemoo.in/talent-hub';
  };

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      const redirectUrl = getOAuthRedirectUrl();
      console.log('[Google OAuth] Initiating signInWithOAuth with redirectTo:', redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('[Google OAuth signIn Error]:', error.message);
        setAuthError("We couldn't sign you in with Google. Please try again.");
      }
    } catch (err: any) {
      console.error('[Google OAuth Trigger Error]:', err.message);
      setAuthError("We couldn't sign you in with Google. Please try again.");
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setTalentProfile(null);
      setLanguages([]);
      setExperiences([]);
      setOpportunities([]);
      setApplications([]);
      setIsRegistered(null);
      setAuthState('unauthenticated');
      setAuthError(null);
      lastLoadedTokenRef.current = null;
      lastLoadedUserIdRef.current = null;

      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/talent-hub');
        window.location.hash = 'talent-hub';
      }
    } catch (err: any) {
      console.error('[TalentHub SignOut Error]:', err.message);
    }
  };

  // Derived real dashboard statistics
  const totalApplications = applications.length;
  const pendingCount = applications.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  const shortlistedCount = applications.filter((a) => (a.status || '').toLowerCase() === 'shortlisted').length;
  const acceptedCount = applications.filter((a) => (a.status || '').toLowerCase() === 'accepted').length;
  const activeOpportunitiesCount = opportunities.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s === 'active' || s === 'open';
  }).length;

  const token = session?.access_token || null;
  const isLoading = authState === 'checkingSession';
  const isProfileLoading = authState === 'loadingProfile';

  return (
    <TalentHubAuthContext.Provider
      value={{
        session,
        user,
        token,
        talentProfile,
        languages,
        experiences,
        isRegistered,
        authState,
        isLoading,
        isProfileLoading,
        authError,
        opportunities,
        applications,
        isDataLoading,
        isRefreshing,
        lastRefreshedAt,
        totalApplications,
        pendingCount,
        shortlistedCount,
        acceptedCount,
        activeOpportunitiesCount,
        signInWithGoogle,
        signOut,
        refreshTalentHubData,
        mutateApplications,
      }}
    >
      {children}
    </TalentHubAuthContext.Provider>
  );
};

export const useTalentHubAuth = () => {
  const context = useContext(TalentHubAuthContext);
  if (!context) {
    throw new Error('useTalentHubAuth must be used within a TalentHubAuthProvider');
  }
  return context;
};
