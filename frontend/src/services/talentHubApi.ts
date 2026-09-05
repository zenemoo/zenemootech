import axios from 'axios';

let rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'https://zenemootech-api.onrender.com/api';

// On localhost, default to local backend if running
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  rawApiUrl = 'http://localhost:5000/api';
}

rawApiUrl = rawApiUrl.replace(/\/+$/, '');
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl = `${rawApiUrl}/api`;
}

const API_BASE_URL = rawApiUrl;

const createAuthHeaders = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

export const talentHubApi = {
  /**
   * Fetch authenticated talent profile, registered languages, and experiences.
   */
  async getProfile(token: string) {
    const response = await axios.get(`${API_BASE_URL}/talent-hub/me`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch all active opportunities.
   */
  async getOpportunities(token: string) {
    const response = await axios.get(`${API_BASE_URL}/talent-hub/opportunities`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch details of a specific active opportunity.
   */
  async getOpportunityById(id: string, token: string) {
    const response = await axios.get(`${API_BASE_URL}/talent-hub/opportunities/${id}`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch applications submitted by the authenticated talent.
   */
  async getApplications(token: string) {
    const response = await axios.get(`${API_BASE_URL}/talent-hub/applications`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Fetch a single application by ID (IDOR-protected on backend).
   */
  async getApplicationById(id: string, token: string) {
    const response = await axios.get(`${API_BASE_URL}/talent-hub/applications/${id}`, createAuthHeaders(token));
    return response.data;
  },

  /**
   * Submit an application for an active opportunity.
   */
  async submitApplication(opportunityId: string, payload: { answers: Record<string, any>; applicant_phone?: string }, token: string) {
    const response = await axios.post(
      `${API_BASE_URL}/talent-hub/opportunities/${opportunityId}/apply`,
      payload,
      createAuthHeaders(token)
    );
    return response.data;
  },
};
