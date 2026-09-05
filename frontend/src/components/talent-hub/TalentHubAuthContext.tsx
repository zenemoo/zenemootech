import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

interface TalentHubAuthContextType {
  session: Session | null;
  user: User | null;
  token: string | null;
  talentProfile: TalentProfile | null;
  languages: TalentLanguage[];
  experiences: TalentExperience[];
  isRegistered: boolean | null; // null = checking, true = found in DB, false = not registered
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadTalentProfile = useCallback(async (accessToken: string) => {
    setIsProfileLoading(true);
    setAuthError(null);
    try {
      const res = await talentHubApi.getProfile(accessToken);
      if (res && res.success) {
        if (res.registered) {
          setTalentProfile(res.talent || null);
          setLanguages(res.languages || []);
          setExperiences(res.experiences || []);
          setIsRegistered(true);
        } else {
          setTalentProfile(null);
          setLanguages([]);
          setExperiences([]);
          setIsRegistered(false);
        }
      } else {
        setAuthError(res?.message || "We couldn't load your information right now. Please try again.");
        setIsRegistered(false);
      }
    } catch (err: any) {
      console.error('[TalentHub Profile Load Error]:', err?.response?.data || err.message);
      // If endpoint returned 401/403 or network issue
      if (err?.response?.data?.registered === false) {
        setIsRegistered(false);
      } else {
        setAuthError("We couldn't load your information right now. Please try again.");
      }
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Check current Supabase Auth session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error('[Supabase getSession Error]:', error.message);
        setAuthError("We couldn't sign you in with Google. Please try again.");
        setIsLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.access_token) {
        loadTalentProfile(currentSession.access_token).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
        setIsRegistered(null);
      }
    });

    // 2. Subscribe to auth state changes (OAuth redirect, sign-in, token refresh, sign-out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.access_token) {
        await loadTalentProfile(newSession.access_token);
      } else {
        setTalentProfile(null);
        setLanguages([]);
        setExperiences([]);
        setIsRegistered(null);
      }
      setIsLoading(false);
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
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
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
      setAuthError(null);

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
      await loadTalentProfile(session.access_token);
    }
  };

  const token = session?.access_token || null;

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
