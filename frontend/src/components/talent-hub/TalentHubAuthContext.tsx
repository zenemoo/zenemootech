import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { talentHubApi } from '../../services/talentHubApi';
import type { Session, User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

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
  company_logo?: string;
  features?: string[];
  requirements?: string[];
  language_skills?: string[];
  eligibility_criteria?: string[];
  action_url?: string;
  poster_url?: string;
  pdf_link?: string;
  whatsapp_group_url?: string;
  whatsapp_channel_url?: string;
  telegram_url?: string;
  contact_support_url?: string;
  linkedin_post_url?: string;
  x_post_url?: string;
  facebook_post_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  other_social_url?: string;
  application_post_url?: string;
  about_project?: string;
  what_you_will_do?: string[];
  experience_requirements?: string;
  equipment_requirements?: string;
  internet_requirements?: string;
  working_hours?: string;
  project_duration?: string;
  payment_info?: string;
  payment_frequency?: string;
  work_mode?: string;
  availability_requirement?: string;
  project_highlights?: string[];
  benefits?: string[];
  why_join?: string;
  important_notes?: string;
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
  terms_accepted?: boolean;
  terms_accepted_at?: string;
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
  isSigningIn: boolean;
  isOpeningGoogle: boolean;
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
  sendEmailOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshTalentHubData: (isManual?: boolean) => Promise<void>;
  mutateApplications: (newOrUpdatedApp: ApplicationItem) => void;
}

export const TalentHubAuthContext = createContext<TalentHubAuthContextType | undefined>(undefined);

export const TalentHubAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [talentProfile, setTalentProfile] = useState<TalentProfile | null>(null);
  const [languages, setLanguages] = useState<TalentLanguage[]>([]);
  const [experiences, setExperiences] = useState<TalentExperience[]>([]);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [authState, setAuthState] = useState<TalentHubAuthState>('checkingSession');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isOpeningGoogle, setIsOpeningGoogle] = useState<boolean>(false);

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
  const processedCallbackUrlRef = useRef<string | null>(null);

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

      // Android Web Custom Tab Bridge: If opened on Android browser with OAuth tokens/code, forward immediately to native scheme
      if (!Capacitor.isNativePlatform()) {
        const isMobileAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
        const code = searchParams.get('code') || hashParams.get('code');
        const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
        if (isMobileAndroid && (code || accessToken)) {
          const deepLink = 'zenemoo://auth/callback' + window.location.search + window.location.hash;
          window.location.href = deepLink;
        }
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

    // 3. Listen for Capacitor deep-link OAuth callbacks on native platform
    let appUrlListenerHandle: any = null;
    if (Capacitor.isNativePlatform()) {
      const handleMobileAuthCallback = async (rawUrl: string) => {
        if (!rawUrl || (!rawUrl.startsWith('zenemoo://auth/callback') && !rawUrl.includes('auth/callback'))) {
          return;
        }

        if (processedCallbackUrlRef.current === rawUrl) {
          console.log('[TalentHub Auth Mobile] Callback already processed, skipping duplicate.');
          return;
        }
        processedCallbackUrlRef.current = rawUrl;

        console.log('[TalentHub Auth Mobile] Processing OAuth callback...');

        // Always close external browser/Custom Tab
        try {
          await Browser.close();
        } catch (_) {}

        setIsSigningIn(true);
        setAuthState('loadingProfile');
        setAuthError(null);

        // Always close external browser/Custom Tab
        try {
          await Browser.close();
        } catch (_) {}

        try {
          let code: string | null = null;
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          let errorDesc: string | null = null;

          try {
            const urlObj = new URL(rawUrl);
            code = urlObj.searchParams.get('code');
            errorDesc = urlObj.searchParams.get('error_description') || urlObj.searchParams.get('error');

            if (urlObj.hash) {
              const hashClean = urlObj.hash.replace(/^#/, '');
              const hashParams = new URLSearchParams(hashClean);
              if (!code) code = hashParams.get('code');
              if (!accessToken) accessToken = hashParams.get('access_token');
              if (!refreshToken) refreshToken = hashParams.get('refresh_token');
              if (!errorDesc) errorDesc = hashParams.get('error_description') || hashParams.get('error');
            }
            if (!accessToken) accessToken = urlObj.searchParams.get('access_token');
            if (!refreshToken) refreshToken = urlObj.searchParams.get('refresh_token');
          } catch (_) {
            const codeMatch = rawUrl.match(/[?&]code=([^&#]+)/);
            if (codeMatch) code = decodeURIComponent(codeMatch[1]);
            const tokenMatch = rawUrl.match(/[?&#]access_token=([^&#]+)/);
            if (tokenMatch) accessToken = decodeURIComponent(tokenMatch[1]);
            const refreshMatch = rawUrl.match(/[?&#]refresh_token=([^&#]+)/);
            if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
            const errMatch = rawUrl.match(/[?&#](?:error_description|error)=([^&#]+)/);
            if (errMatch) errorDesc = decodeURIComponent(errMatch[1]);
          }

          if (errorDesc) {
            console.warn('[TalentHub Auth Mobile] OAuth error in callback:', errorDesc);
            setAuthError('Google sign-in could not be completed. Please try again.');
            setAuthState('unauthenticated');
            return;
          }

          if (code) {
            console.log('[TalentHub Auth Mobile] Exchanging code for session with PKCE...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[TalentHub Auth Mobile] exchangeCodeForSession error:', error.message);
              setAuthError('Google sign-in could not be completed. Please try again.');
              setAuthState('unauthenticated');
              return;
            }
            if (data?.session) {
              setSession(data.session);
              setUser(data.session.user || null);
              lastLoadedUserIdRef.current = data.session.user?.id || null;
              await loadTalentProfile(data.session.access_token);
            }
          } else if (accessToken) {
            console.log('[TalentHub Auth Mobile] Setting session from access token...');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            if (error) {
              console.error('[TalentHub Auth Mobile] setSession error:', error.message);
              setAuthError('Google sign-in could not be completed. Please try again.');
              setAuthState('unauthenticated');
              return;
            }
            if (data?.session) {
              setSession(data.session);
              setUser(data.session.user || null);
              lastLoadedUserIdRef.current = data.session.user?.id || null;
              await loadTalentProfile(data.session.access_token);
            }
          } else {
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession?.access_token) {
              setSession(existingSession);
              setUser(existingSession.user || null);
              lastLoadedUserIdRef.current = existingSession.user?.id || null;
              await loadTalentProfile(existingSession.access_token);
            } else {
              setAuthError('Google sign-in could not be completed. Please try again.');
              setAuthState('unauthenticated');
            }
          }
        } catch (err: any) {
          console.error('[TalentHub Auth Mobile] Callback handler exception:', err.message);
          setAuthError('Google sign-in could not be completed. Please try again.');
          setAuthState('unauthenticated');
        } finally {
          setIsSigningIn(false);
        }
      };

      CapApp.addListener('appUrlOpen', ({ url }) => {
        handleMobileAuthCallback(url);
      }).then((handle) => {
        appUrlListenerHandle = handle;
      });

      CapApp.getLaunchUrl().then((launch) => {
        if (launch?.url) {
          handleMobileAuthCallback(launch.url);
        }
      });
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (appUrlListenerHandle && typeof appUrlListenerHandle.remove === 'function') {
        appUrlListenerHandle.remove();
      }
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

      // PART 5: NEVER call signInWithOAuth if a valid session already exists!
      if (session?.access_token) {
        console.log('[Google OAuth] Existing active session detected in context. Restoring profile...');
        await loadTalentProfile(session.access_token);
        return;
      }

      const { data: currentAuth } = await supabase.auth.getSession();
      if (currentAuth?.session?.access_token) {
        console.log('[Google OAuth] Existing active session restored from storage. Skipping OAuth...');
        setSession(currentAuth.session);
        setUser(currentAuth.session.user || null);
        lastLoadedUserIdRef.current = currentAuth.session.user?.id || null;
        await loadTalentProfile(currentAuth.session.access_token);
        return;
      }

      const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

      if (isAndroid) {
        setIsOpeningGoogle(true);
        setIsSigningIn(true);
        setAuthError(null);
        console.log('[Google OAuth Mobile] Initiating in-app Google Sign-In with callback: zenemoo://auth/callback');

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'zenemoo://auth/callback',
            skipBrowserRedirect: true,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline',
            },
          },
        });

        if (error) {
          setIsOpeningGoogle(false);
          setIsSigningIn(false);
          console.error('[Google OAuth Mobile Error]:', error.message);
          setAuthError('Google sign-in could not be completed. Please try again.');
          return;
        }

        if (data?.url) {
          // Listen for user closing the in-app browser overlay manually
          const browserFinishedHandle = await Browser.addListener('browserFinished', () => {
            console.log('[Google OAuth Mobile] In-app browser dismissed by user.');
            setIsOpeningGoogle(false);
            setIsSigningIn(false);
            browserFinishedHandle.remove();
          });

          // Open In-App Custom Tab overlay (not external _system Chrome!)
          await Browser.open({
            url: data.url,
            windowName: '_blank',
            presentationStyle: 'popover',
            toolbarColor: '#080d19',
          });

          setTimeout(() => setIsOpeningGoogle(false), 2000);
        } else {
          setIsOpeningGoogle(false);
          setIsSigningIn(false);
          setAuthError('Unable to open Google sign-in. Please try again.');
        }
      } else {
        // Website browser flow remains 100% untouched
        const redirectUrl = getOAuthRedirectUrl();
        console.log('[Google OAuth Web] Initiating web signInWithOAuth with redirectTo:', redirectUrl);

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline',
            },
          },
        });

        if (error) {
          console.error('[Google OAuth signIn Error]:', error.message);
          setAuthError("We couldn't sign you in with Google. Please try again.");
        }
      }
    } catch (err: any) {
      setIsOpeningGoogle(false);
      setIsSigningIn(false);
      console.error('[Google OAuth Trigger Error]:', err.message);
      setAuthError("We couldn't sign you in with Google. Please try again.");
    }
  };

  const sendEmailOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
      const redirectUrl = isAndroid ? 'zenemoo://auth/callback' : `${window.location.origin}/talent-hub`;

      console.log('[TalentHub OTP] Sending 6-digit code to email with redirectUrl:', redirectUrl);
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        console.warn('[TalentHub OTP Send Error]:', error.message);
        return { success: false, error: error.message || 'Could not send verification code. Please try again.' };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'An unexpected error occurred. Please try again.' };
    }
  };

  const verifyEmailOtp = async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      setIsSigningIn(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      if (!cleanToken || cleanToken.length < 6) {
        setIsSigningIn(false);
        return { success: false, error: 'Please enter the complete 6-digit code.' };
      }

      console.log('[TalentHub OTP] Verifying 6-digit OTP code...');
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });

      if (error) {
        setIsSigningIn(false);
        console.warn('[TalentHub OTP Verify Error]:', error.message);
        return { success: false, error: 'Invalid or expired verification code. Please try again.' };
      }

      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user || null);
        lastLoadedUserIdRef.current = data.session.user?.id || null;
        await loadTalentProfile(data.session.access_token);
        setIsSigningIn(false);
        return { success: true };
      }

      setIsSigningIn(false);
      return { success: false, error: 'Unable to establish session. Please try again.' };
    } catch (e: any) {
      setIsSigningIn(false);
      return { success: false, error: e?.message || 'Verification failed. Please try again.' };
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

      const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
      if (typeof window !== 'undefined') {
        if (isAndroid) {
          // Inside Android app, logout directs cleanly to Home
          window.history.replaceState(null, '', '/');
          window.location.hash = '';
        } else {
          window.history.pushState(null, '', '/talent-hub');
          window.location.hash = 'talent-hub';
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
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
        isSigningIn,
        isOpeningGoogle,
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
        sendEmailOtp,
        verifyEmailOtp,
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
