import axios from 'axios';

const getPoolApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_POOL_API_URL || (import.meta as any).env?.VITE_POOLS_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.replace(/\/+$/, '');
  }
  // If running locally or on custom domain, prefer unified /api/pools proxy or direct worker
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api';
  }
  return 'https://zenemoo-pool-api.zenemootech.workers.dev/api';
};

export interface PoolOptionItem {
  id: string;
  option_text: string;
  sort_order: number;
  response_count?: number;
}

export interface PoolItem {
  id: string;
  public_id: string;
  title: string;
  description?: string | null;
  category?: string;
  allow_multiple: boolean;
  status: 'draft' | 'published' | 'paused' | 'closed' | 'archived';
  start_time?: string;
  end_time?: string | null;
  total_responses_count: number;
  options: PoolOptionItem[];
  is_closed?: boolean;
  is_paused?: boolean;
  is_draft?: boolean;
  is_open?: boolean;
  my_selected_option_ids?: string[];
  has_responded?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PoolResponseItem {
  id: string;
  name: string;
  email: string;
  participant_type: string;
  option_id: string;
  option_text: string;
  selected_choice: string;
  option_ids?: string[];
  custom_text?: string | null;
  source: string;
  created_at: string;
  submitted_at?: string;
}

export interface PoolHistoryItem {
  pool_id: string;
  public_id?: string;
  pool_title: string;
  category: string;
  pool_status: string;
  submitted_at: string;
  updated_at?: string;
  selected_options: Array<{
    option_id: string;
    option_text: string;
    custom_text?: string | null;
  }>;
}

const getAdminHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('zenemoo_jwt_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const poolApi = {
  // Public APIs
  async getActivePools(): Promise<{ success: boolean; pools: PoolItem[] }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/pools/public/active`);
    return res.data;
  },

  async getPoolByPublicId(publicId: string): Promise<{ success: boolean; pool: PoolItem }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/pools/public/${publicId}`);
    return res.data;
  },

  async submitPublicResponse(payload: {
    publicId: string;
    email: string;
    name: string;
    participantType: string;
    selectedOptionIds: string[];
    customText?: string;
  }): Promise<{ success: boolean; message: string; updated?: boolean }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.post(`${baseUrl}/pools/public/${payload.publicId}/submit`, payload);
    return res.data;
  },

  async getAuthenticatedHistory(token: string): Promise<{ success: boolean; history: PoolHistoryItem[]; email: string; name?: string }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/pools/public/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // Talent Hub APIs
  async getTalentHubPools(supabaseToken: string): Promise<{ success: boolean; pools: PoolItem[]; email: string }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/pools/talent-hub/list`, {
      headers: { Authorization: `Bearer ${supabaseToken}` },
    });
    return res.data;
  },

  async getTalentHubHistory(supabaseToken: string): Promise<{ success: boolean; history: PoolHistoryItem[]; email: string }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/pools/talent-hub/history`, {
      headers: { Authorization: `Bearer ${supabaseToken}` },
    });
    return res.data;
  },

  async submitTalentHubResponse(
    publicId: string,
    payload: {
      email: string;
      name: string;
      participantType: string;
      selectedOptionIds: string[];
      customText?: string;
    },
    supabaseToken: string
  ): Promise<{ success: boolean; message: string }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.post(
      `${baseUrl}/pools/talent-hub/${publicId}/submit`,
      { ...payload, source: 'talent_hub' },
      { headers: { Authorization: `Bearer ${supabaseToken}` } }
    );
    return res.data;
  },

  // Admin APIs
  async getAdminPools(params?: { status?: string; search?: string }): Promise<{
    success: boolean;
    summary: {
      total_pools: number;
      active_pools: number;
      draft_pools: number;
      paused_pools: number;
      closed_pools: number;
      total_responses: number;
    };
    pools: PoolItem[];
  }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/admin/pools`, {
      headers: getAdminHeaders(),
      params,
    });
    return res.data;
  },

  async createPool(payload: {
    title: string;
    description?: string;
    category?: string;
    allowMultiple?: boolean;
    status?: string;
    startTime?: string;
    endTime?: string | null;
    options: string[] | Array<{ text: string }>;
  }): Promise<{ success: boolean; message: string; pool: PoolItem }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.post(`${baseUrl}/admin/pools`, payload, {
      headers: getAdminHeaders(),
    });
    return res.data;
  },

  async updatePool(
    id: string,
    payload: Partial<{
      title: string;
      description: string | null;
      category: string;
      allowMultiple: boolean;
      status: string;
      startTime: string;
      endTime: string | null;
      options: Array<{ id?: string; option_text?: string; text?: string; sort_order?: number }>;
    }>
  ): Promise<{ success: boolean; message: string; pool: PoolItem }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.put(`${baseUrl}/admin/pools/${id}`, payload, {
      headers: getAdminHeaders(),
    });
    return res.data;
  },

  async updatePoolStatus(id: string, status: string, isArchived?: boolean): Promise<{ success: boolean; message: string }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.patch(
      `${baseUrl}/admin/pools/${id}/status`,
      { status, isArchived },
      { headers: getAdminHeaders() }
    );
    return res.data;
  },

  async duplicatePool(id: string): Promise<{ success: boolean; message: string; pool: PoolItem }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.post(`${baseUrl}/admin/pools/${id}/duplicate`, {}, {
      headers: getAdminHeaders(),
    });
    return res.data;
  },

  async deletePool(id: string, force: boolean = false): Promise<{ success: boolean; message: string }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.delete(`${baseUrl}/admin/pools/${id}`, {
      headers: getAdminHeaders(),
      params: { force },
    });
    return res.data;
  },

  async getPoolResponses(
    id: string,
    params?: { optionId?: string; participantType?: string; search?: string; page?: number; limit?: number }
  ): Promise<{
    success: boolean;
    pool: { id: string; public_id: string; title: string; category?: string; total_responses_count: number };
    options: Array<{ id: string; option_text: string; count: number }>;
    total_count: number;
    page: number;
    limit: number;
    responses: PoolResponseItem[];
  }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/admin/pools/${id}/responses`, {
      headers: getAdminHeaders(),
      params,
    });
    return res.data;
  },

  async exportPoolResponses(id: string): Promise<{
    success: boolean;
    pool_id: string;
    title: string;
    total_rows: number;
    data: any[];
  }> {
    const baseUrl = getPoolApiBaseUrl();
    const res = await axios.get(`${baseUrl}/admin/pools/${id}/export`, {
      headers: getAdminHeaders(),
    });
    return res.data;
  },
};
