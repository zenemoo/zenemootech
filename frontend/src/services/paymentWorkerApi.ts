import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

export interface PaymentRecord {
  id: string;
  talent_id?: string | null;
  email: string;
  project_name: string;
  amount: number;
  currency: string;
  status: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled';
  payment_date: string;
  reference_number?: string | null;
  reference_link?: string | null;
  source?: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PaymentSummary {
  total_records: number;
  total_paid: number;
  status_counts: {
    Pending: number;
    Processing: number;
    Paid: number;
    Failed: number;
    Cancelled: number;
  };
}

export interface TalentPaymentSummary {
  payment_count: number;
  total_paid: number;
  pending_count: number;
  user_rank?: number | null;
  user_grade?: string;
}

export interface PaymentListResponse {
  success: boolean;
  data: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TalentLeaderboardItem {
  rank: number;
  talent_id: string | null;
  name: string;
  email_masked: string;
  company: string;
  grade: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | string;
  total_paid: number;
  is_current_user: boolean;
}

export interface TalentLeaderboardResponse {
  success: boolean;
  data: TalentLeaderboardItem[];
  user_position: {
    rank: number | null;
    total_paid: number;
    grade: string;
    payment_count: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminLeaderboardItem {
  rank: number;
  talent_id: string | null;
  email: string;
  name: string;
  company: string;
  grade: string;
  total_paid: number;
  payment_count: number;
  last_payment_date: string | null;
}

export interface AdminLeaderboardResponse {
  success: boolean;
  data: AdminLeaderboardItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const getPaymentApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_PAYMENT_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://zenemoo-payment-api.zenemootech.workers.dev';
};

const getAdminAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('zenemoo_jwt_token') : null;
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const getTalentAuthHeaders = async (passedToken?: string) => {
  let token = passedToken;
  if (!token && typeof window !== 'undefined') {
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || undefined;
    } catch (_) {}
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

export const paymentWorkerApi = {
  // --- Admin Endpoints ---

  async getAdminPayments(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    project?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PaymentListResponse> {
    const baseUrl = getPaymentApiBaseUrl();
    const config = {
      ...getAdminAuthHeaders(),
      params,
    };
    const response = await axios.get(`${baseUrl}/admin/payments`, config);
    return response.data;
  },

  async getAdminSummary(): Promise<{ success: boolean; summary: PaymentSummary }> {
    const baseUrl = getPaymentApiBaseUrl();
    const response = await axios.get(`${baseUrl}/admin/payments/summary`, getAdminAuthHeaders());
    return response.data;
  },

  async getAdminLeaderboard(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<AdminLeaderboardResponse> {
    const baseUrl = getPaymentApiBaseUrl();
    const config = {
      ...getAdminAuthHeaders(),
      params,
    };
    const response = await axios.get(`${baseUrl}/admin/leaderboard`, config);
    return response.data;
  },

  async createPayment(data: {
    email: string;
    project_name: string;
    amount: number;
    currency?: string;
    status?: string;
    payment_date?: string;
    talent_id?: string;
    reference_number?: string;
    reference_link?: string;
    notes?: string;
    source?: string;
  }): Promise<{ success: boolean; message: string; data: PaymentRecord }> {
    const baseUrl = getPaymentApiBaseUrl();
    const response = await axios.post(`${baseUrl}/admin/payments`, data, getAdminAuthHeaders());
    return response.data;
  },

  async updatePayment(
    id: string,
    data: Partial<PaymentRecord>
  ): Promise<{ success: boolean; message: string; data: PaymentRecord }> {
    const baseUrl = getPaymentApiBaseUrl();
    const response = await axios.put(`${baseUrl}/admin/payments/${id}`, data, getAdminAuthHeaders());
    return response.data;
  },

  async deletePayment(id: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = getPaymentApiBaseUrl();
    const response = await axios.delete(`${baseUrl}/admin/payments/${id}`, getAdminAuthHeaders());
    return response.data;
  },

  async importPayments(
    records: Array<{
      email: string;
      project_name: string;
      amount: number;
      currency?: string;
      status?: string;
      payment_date?: string;
      talent_id?: string;
      reference_number?: string;
      reference_link?: string;
      notes?: string;
    }>
  ): Promise<{ success: boolean; count: number; message: string }> {
    const baseUrl = getPaymentApiBaseUrl();
    const response = await axios.post(`${baseUrl}/admin/payments/import`, { records }, getAdminAuthHeaders());
    return response.data;
  },

  // --- Talent Endpoints ---

  async getTalentPayments(
    token?: string,
    params?: { page?: number; limit?: number; search?: string; status?: string }
  ): Promise<PaymentListResponse> {
    const baseUrl = getPaymentApiBaseUrl();
    const headers = await getTalentAuthHeaders(token);
    const response = await axios.get(`${baseUrl}/talent/payments`, { ...headers, params });
    return response.data;
  },

  async getTalentSummary(token?: string): Promise<{ success: boolean; summary: TalentPaymentSummary }> {
    const baseUrl = getPaymentApiBaseUrl();
    const headers = await getTalentAuthHeaders(token);
    const response = await axios.get(`${baseUrl}/talent/payments/summary`, headers);
    return response.data;
  },

  async getTalentLeaderboard(
    token?: string,
    params?: { page?: number; limit?: number }
  ): Promise<TalentLeaderboardResponse> {
    const baseUrl = getPaymentApiBaseUrl();
    const headers = await getTalentAuthHeaders(token);
    const response = await axios.get(`${baseUrl}/talent/leaderboard`, { ...headers, params });
    return response.data;
  },
};
