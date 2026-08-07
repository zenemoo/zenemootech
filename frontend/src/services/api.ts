import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

let rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'https://zenemootech-api.onrender.com/api';

// On localhost, default to local backend if running
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  rawApiUrl = 'http://localhost:5000/api';
}

rawApiUrl = rawApiUrl.replace(/\/+$/, '');
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl = `${rawApiUrl}/api`;
}

export const api = axios.create({
  baseURL: rawApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30-second timeout to accommodate cloud database & cold start latencies
});

// Request interceptor for JWT authentication header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zenemoo_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to parse renewed sliding tokens and handle automatic logouts
api.interceptors.response.use(
  (response) => {
    const newToken = response.headers['x-new-token'] || response.headers['X-New-Token'];
    if (newToken) {
      localStorage.setItem('zenemoo_jwt_token', newToken);
      const expiry = Date.now() + 30 * 60 * 1000;
      localStorage.setItem('zenemoo_jwt_expiry', expiry.toString());
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const reqUrl = error.config?.url || '';
      if (!reqUrl.includes('/auth/login') && !reqUrl.includes('/auth/check-email')) {
        console.warn('🔑 401 Unauthorized API response received. Session invalidated.');
        localStorage.removeItem('zenemoo_jwt_token');
        localStorage.removeItem('zenemoo_jwt_expiry');
      }
    }
    return Promise.reject(error);
  }
);

// Core Allowed Emails Fallback List
const DEFAULT_ALLOWED_EMAILS = [
  'prem@zenemoo.in',
  'contact@zenemoo.in',
  'support@zenemoo.in',
  'info@zenemoo.in',
  'noreply@zenemoo.in',
  'zenemootech@gmail.com',
  'mr.prem2006@gmail.com',
];

export const authApi = {
  login: (passcode: string, email?: string) => api.post('/auth/login', { passcode, email }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  getAuditLogs: () => api.get('/auth/audit-logs'),

  checkEmail: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      return await api.post('/auth/check-email', { email: cleanEmail });
    } catch (err: any) {
      if (err.response && err.response.status !== 404) {
        throw err;
      }
      // Fallback to Supabase & local validation on connection refused or 404
      try {
        const { data } = await supabase
          .from('authorized_admin_emails')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (data) {
          return { data: { success: true, exists: true, message: '✅ Administrator account found.' } };
        }
      } catch (dbErr) {}

      const isAllowed = DEFAULT_ALLOWED_EMAILS.includes(cleanEmail) || cleanEmail.endsWith('@zenemoo.in');
      if (isAllowed) {
        return { data: { success: true, exists: true, message: '✅ Administrator account found.' } };
      }
      return { data: { success: false, exists: false, message: '❌ You are not an authorized administrator.' } };
    }
  },

  forgotPassword: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    return await api.post('/auth/forgot-password', { email: cleanEmail });
  },

  verifyOtp: async (email: string, otp: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    return await api.post('/auth/verify-otp', { email: cleanEmail, otp: cleanOtp });
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    return await api.post('/auth/reset-password', { email: cleanEmail, otp, newPassword });
  },};

// Team APIs
export const teamApi = {
  getAll: () => api.get('/team'),
  // create/update/reorder use 30s timeout: AI summary generation (Groq) + DB insert +
  // two-phase position normalisation can easily exceed the global 6s default.
  create: (data: any) => api.post('/team', data, { timeout: 30000 }),
  reorder: (id: string, newPosition: number) => api.put('/team/reorder', { id, newPosition }, { timeout: 30000 }),
  generateSummary: (id: string) => api.post(`/team/${id}/generate-summary`, {}, { timeout: 30000 }),
  update: (id: string, data: any) => api.put(`/team/${id}`, data, { timeout: 30000 }),
  delete: (id: string) => api.delete(`/team/${id}`),
};


// Services APIs
export const serviceApi = {
  getAll: () => api.get('/services'),
  create: (data: any) => api.post('/services', data),
  update: (id: string, data: any) => api.put(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

// Partner Companies APIs
export const partnerApi = {
  getAll: () => api.get('/partners'),
  create: (data: any) => api.post('/partners', data),
  reorder: (id: string, newPosition: number) => api.put('/partners/reorder', { id, newPosition }),
  update: (id: string, data: any) => api.put(`/partners/${id}`, data),
  delete: (id: string) => api.delete(`/partners/${id}`),
};

// Program Opportunities APIs
export const opportunityApi = {
  getAll: () => api.get('/opportunities'),
  create: (data: any) => api.post('/opportunities', data),
  reorder: (id: string, newPosition: number) => api.put(`/opportunities/${id}/reorder`, { newPosition }),
  update: (id: string, data: any) => api.put(`/opportunities/${id}`, data),
  delete: (id: string) => api.delete(`/opportunities/${id}`),
};

// Candidate Opportunity Applications APIs
export const opportunityApplicationApi = {
  getAll: (opportunity_id?: string) => api.get('/opportunity-applications', { params: { opportunity_id } }),
  submit: (data: any) => api.post('/opportunity-applications', data),
  update: (id: string, data: any) => api.put(`/opportunity-applications/${id}`, data),
  delete: (id: string) => api.delete(`/opportunity-applications/${id}`),
};

// Contact APIs
export const contactApi = {
  getAll: () => api.get('/contact'),
  submit: (data: any) => api.post('/contact', data),
  update: (id: string, data: any) => api.put(`/contact/${id}`, data),
  delete: (id: string) => api.delete(`/contact/${id}`),
};

// Newsletter Subscriber APIs
export const subscriberApi = {
  getAll: () => api.get('/subscribers'),
  subscribe: (email: string) => api.post('/subscribers', { email }),
  update: (id: string, email: string) => api.put(`/subscribers/${id}`, { email }),
  delete: (id: string) => api.delete(`/subscribers/${id}`),
};

// Settings APIs
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
};

// Cloudinary + Supabase Media APIs
export const mediaApi = {
  getAll: () => api.get('/media'),
  upload: (formData: FormData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: string, formData: FormData) =>
    api.put(`/media/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/media/${encodeURIComponent(id)}`),
};

export const uploadApi = mediaApi;

// Zenemoo AI Assistant APIs
export const aiApi = {
  chat: (messages: { role: string; content: string }[], language: 'en' | 'hi' | 'or' = 'en') =>
    api.post('/ai/chat', { messages, language }),
  getAnalytics: () => api.get('/ai/analytics'),
};

// Zenemoo Brevo Email Engine APIs
export const emailApi = {
  send: (data: any) => api.post('/email/send', data, { timeout: 30000 }),
  getHistory: () => api.get('/email/history', { timeout: 15000 }),
  deleteHistory: (id: string) => api.delete(`/email/history/${encodeURIComponent(id)}`),
  getDrafts: () => api.get('/email/drafts', { timeout: 15000 }),
  saveDraft: (data: any) => api.post('/email/drafts', data, { timeout: 15000 }),
  deleteDraft: (id: string) => api.delete(`/email/drafts/${encodeURIComponent(id)}`),
};

// Zenemoo Support Portal APIs
export const supportApi = {
  createTicket: (data: { category: string; subject: string; message: string; user_email?: string; user_name?: string }) =>
    api.post('/support/ticket', data),
  getTickets: () => api.get('/support/tickets'),
  updateStatus: (id: string, status: string) => api.put(`/support/ticket/${encodeURIComponent(id)}/status`, { status }),
};

// Unified Portal Authentication APIs (Team Member, HR, Admin)
export const portalAuthApi = {
  portalLogin: (email: string, password: string, expectedRole?: string) =>
    api.post('/auth/portal-login', { email, password, expectedRole }),
  getMeProfile: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword?: string; newPassword?: string } | string, newPass?: string) => {
    if (typeof data === 'object') {
      return api.post('/auth/change-password', data);
    }
    return api.post('/auth/change-password', { currentPassword: data, newPassword: newPass });
  },
};

// User Management & RBAC APIs (Admin Only)
export const userManagementApi = {
  searchRoster: (query: string) => api.get('/users/search-roster', { params: { q: query } }),
  grantAccess: (data: {
    team_member_id: string;
    role: string;
    password?: string;
    status?: string;
    email_access?: boolean;
    notification_access?: boolean;
  }) => api.post('/users/grant-access', data),
  getUsers: () => api.get('/users'),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  resetPassword: (id: string, newPassword?: string) => api.post(`/users/${id}/reset-password`, { newPassword }),
  deleteAccess: (id: string) => api.delete(`/users/${id}`),
};

// Notification System APIs
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  adminCreate: (data: {
    title: string;
    message: string;
    type?: string;
    target_type?: string;
    target_user_id?: string;
    target_role?: string;
  }) => api.post('/notifications', data),
  adminDelete: (id: string) => api.delete(`/notifications/admin/${id}`),
};

// Team Member & HR Self-Service Profile APIs
export const selfProfileApi = {
  updateProfile: (data: any) => api.put('/team/profile/me', data),
  uploadImage: (payload: string | { image_url: string; phone_number?: string; link_type?: string; notes?: string }) =>
    api.post('/team/profile/upload-image', typeof payload === 'string' ? { image_url: payload } : payload),
};

// Enterprise Secure Self-Service Private Profile System
export const privateProfileApi = {
  getPrivateProfile: () => api.get('/team/private-profile/me'),
  updatePrivateProfile: (data: any) => api.put('/team/private-profile/me', data),
};

// Admin Profile Updates Approval APIs
export const pendingProfileUpdatesApi = {
  getPending: () => api.get('/team/profile-updates/pending'),
  approve: (id: string) => api.post(`/team/profile-updates/${id}/approve`),
  reject: (id: string, notes?: string) => api.post(`/team/profile-updates/${id}/reject`, { admin_notes: notes }),
};

// Enterprise Team Directory API
export const directoryApi = {
  getMembers: () => api.get('/directory/members'),
};

