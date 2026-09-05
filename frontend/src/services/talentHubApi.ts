import axios from 'axios';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '') {
      return 'http://localhost:5000/api';
    }
  }
  let envUrl = (import.meta as any).env?.VITE_API_URL || 'https://zenemootech-api.onrender.com/api';
  envUrl = envUrl.replace(/\/+$/, '');
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const createAuthHeaders = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const isInvalidToken = (token: any): boolean => {
  return !token || typeof token !== 'string' || !token.trim();
};

export const talentHubApi = {
  /**
   * Fetch authenticated talent profile, registered languages, and experiences.
   */
  async getProfile(token: string) {
    if (isInvalidToken(token)) {
      return { success: false, message: 'Missing or empty auth token' };
    }
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/me`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch all active opportunities.
   */
  async getOpportunities(token: string) {
    if (isInvalidToken(token)) {
      return { success: false, message: 'Missing or empty auth token', opportunities: [] };
    }
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/opportunities`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch details of a specific active opportunity.
   */
  async getOpportunityById(id: string, token: string) {
    if (isInvalidToken(token)) {
      return { success: false, message: 'Missing or empty auth token' };
    }
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/opportunities/${id}`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch applications submitted by the authenticated talent.
   */
  async getApplications(token: string) {
    if (isInvalidToken(token)) {
      return { success: false, message: 'Missing or empty auth token', applications: [] };
    }
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/applications`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch a single application by ID (IDOR-protected on backend).
   */
  async getApplicationById(id: string, token: string) {
    if (isInvalidToken(token)) {
      return { success: false, message: 'Missing or empty auth token' };
    }
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/applications/${id}`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Submit an application for an active opportunity.
   */
  async submitApplication(opportunityId: string, payload: { answers: Record<string, any>; applicant_phone?: string }, token: string) {
    if (isInvalidToken(token)) {
      return { success: false, message: 'Missing or empty auth token' };
    }
    const baseUrl = getApiBaseUrl();
    const response = await axios.post(
      `${baseUrl}/talent-hub/opportunities/${opportunityId}/apply`,
      payload,
      createAuthHeaders(token)
    );
    return response.data;
  },
};

