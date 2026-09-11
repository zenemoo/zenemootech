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

export interface TeamMember {
  id: string;
  vendor_registration_id: string;
  member_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  country_code: string;
  gender: string;
  state: string | null;
  city_district: string | null;
  languages: string[];
  preferred_contact: string;
  availability: string;
  skills_notes: string | null;
  status: 'active' | 'inactive' | 'removed';
  source: 'manual' | 'share_link';
  created_at: string;
  updated_at: string;
}

export interface TeamStatusResponse {
  success: boolean;
  isVendor: boolean;
  vendor?: {
    id: string;
    fullName: string;
    registrationCode: string;
    primaryRole: string;
  };
  stats?: {
    totalMembers: number;
    activeMembers: number;
    recentlyAdded: number;
  };
  invite?: {
    token: string;
    isActive: boolean;
  };
  message?: string;
}

export interface TeamMembersResponse {
  success: boolean;
  members: TeamMember[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const talentTeamApi = {
  // ── VENDOR ENDPOINTS (Authenticated Supabase Talent) ──

  async getStatus(token: string): Promise<TeamStatusResponse> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/team/status`, createAuthHeaders(token));
    return response.data;
  },

  async getMembers(
    token: string,
    params: { page?: number; limit?: number; q?: string; status?: string } = {}
  ): Promise<TeamMembersResponse> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/team/members`, {
      ...createAuthHeaders(token),
      params,
    });
    return response.data;
  },

  async addMemberManual(token: string, payload: Partial<TeamMember>): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.post(`${baseUrl}/talent-hub/team/members`, payload, createAuthHeaders(token));
    return response.data;
  },

  async updateMember(token: string, id: string, payload: Partial<TeamMember>): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.put(`${baseUrl}/talent-hub/team/members/${id}`, payload, createAuthHeaders(token));
    return response.data;
  },

  async deleteMember(token: string, id: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.delete(`${baseUrl}/talent-hub/team/members/${id}`, createAuthHeaders(token));
    return response.data;
  },

  async generateInviteToken(token: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.post(`${baseUrl}/talent-hub/team/invite-token`, {}, createAuthHeaders(token));
    return response.data;
  },

  async getExportData(token: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/talent-hub/team/export`, createAuthHeaders(token));
    return response.data;
  },

  // ── PUBLIC SHARE-LINK ENDPOINTS (NO AUTH REQUIRED) ──

  async getPublicInviteInfo(token: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/public/team-invite/${token}`);
    return response.data;
  },

  async submitPublicMember(token: string, payload: any): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.post(`${baseUrl}/public/team-invite/${token}/submit`, payload);
    return response.data;
  },

  // ── ADMIN TALENT TEAMS ENDPOINTS (JWT Token with Admin/HR role) ──

  async getAdminTeamsOverview(adminToken: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/admin/talent-teams`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.data;
  },

  async getAdminVendorMembers(
    adminToken: string,
    vendorId: string,
    params: { page?: number; limit?: number; q?: string } = {}
  ): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/admin/talent-teams/${vendorId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params,
    });
    return response.data;
  },

  async getAdminMasterExport(adminToken: string, vendorId?: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/admin/talent-teams/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: vendorId ? { vendorId } : {},
    });
    return response.data;
  },
};
