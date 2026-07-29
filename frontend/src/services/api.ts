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
  timeout: 6000, // 6-second timeout
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
      localStorage.removeItem('zenemoo_jwt_token');
      localStorage.removeItem('zenemoo_jwt_expiry');
      if (typeof window !== 'undefined' && window.location.hash.includes('portal')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

// Core Allowed Emails Fallback List
const DEFAULT_ALLOWED_EMAILS = [
  'mr.prem2006@gmail.com',
  'contact@mrprem.in',
  'zenemootech@gmail.com',
  'contact@zenemoo.in',
  'support@zenemoo.in',
  'info@zenemoo.in',
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
  create: (data: any) => api.post('/team', data),
  reorder: (id: string, newPosition: number) => api.put('/team/reorder', { id, newPosition }),
  update: (id: string, data: any) => api.put(`/team/${id}`, data),
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
