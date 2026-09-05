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

export type TalentHubAuthState =
  | 'checkingSession'
  | 'unauthenticated'
  | 'loadingProfile'
  | 'profileLoaded'
  | 'profileError';

interface TalentHubAuthContextType {
  session: Session | null;
  user: User | null;
  token: string | null;
  talentProfile: TalentProfile | null;
  languages: TalentLanguage[];
  experiences: TalentExperience[];
  isRegistered: boolean | null; // null = checking/unauthenticated, true = found in DB, false = not registered
  authState: TalentHubAuthState;
  isLoading: boolean;
  isProfileLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  const inFlightTokenRef = useRef<string | null>(null);
  const lastLoadedTokenRef = useRef<string | null>(null);

  const loadTalentProfile = useCallback(async (accessToken: string) => {
    if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
      setAuthState('unauthenticated');
      return;
    }

    // Prevent racing / duplicate concurrent requests for the same token
    if (inFlightTokenRef.current === accessToken) {
      return;
    }

    inFlightTokenRef.current = accessToken;
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
        setIsRegistered(null);
        setAuthState('unauthenticated');
        setAuthError(null);
        lastLoadedTokenRef.current = null;
      } else if (errData?.registered === false) {
        setTalentProfile(null);
        setLanguages([]);
        setExperiences([]);
        setIsRegistered(false);
        setAuthState('profileLoaded');
      } else {
        // Genuine 500 or network error after authenticated session
        setAuthState('profileError');
        setAuthError("We couldn't load your information right now. Please try again.");
      }
    } finally {
      inFlightTokenRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 0. Detect OAuth errors in URL query/hash if redirected from Supabase
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
          loadTalentProfile(currentSession.access_token);
        } else {
          setSession(null);
          setUser(null);
          setTalentProfile(null);
          setLanguages([]);
          setExperiences([]);
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

    // 2. Subscribe to auth state changes (OAuth redirect, sign-in, token refresh, sign-out)
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
        setIsRegistered(null);
        setAuthState('unauthenticated');
        setAuthError(null);
        lastLoadedTokenRef.current = null;
        return;
      }

      setSession(newSession);
      setUser(newSession.user || null);

      if (newSession.access_token !== lastLoadedTokenRef.current) {
        await loadTalentProfile(newSession.access_token);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadTalentProfile]);

  /**
   * Resolves the OAuth redirect URL dynamically based on the current browser origin.
   * - Local development: http://localhost:3000/talent-hub (or current host/port)
   * - Production: https://www.zenemoo.in/talent-hub
   */
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
      setIsRegistered(null);
      setAuthState('unauthenticated');
      setAuthError(null);
      lastLoadedTokenRef.current = null;

      // Redirect to /talent-hub
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/talent-hub');
        window.location.hash = 'talent-hub';
      }
    } catch (err: any) {
      console.error('[TalentHub SignOut Error]:', err.message);
    }
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      lastLoadedTokenRef.current = null;
      await loadTalentProfile(session.access_token);
    }
  };

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
        signInWithGoogle,
        signOut,
        refreshProfile,
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
