import axios from 'axios';

let rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'https://zenemootech-api.onrender.com/api';
rawApiUrl = rawApiUrl.replace(/\/+$/, '');
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl = `${rawApiUrl}/api`;
}

export const api = axios.create({
  baseURL: rawApiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for fallback bearer token
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('zenemoo_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enterprise Auth APIs
export const authApi = {
  login: (payload: { email?: string; password?: string; passcode?: string; turnstileToken?: string }) =>
    api.post('/auth/login', payload),

  verifyEmailOTP: (payload: { tempToken: string; otp: string }) =>
    api.post('/auth/verify-email-otp', payload),

  verifyTOTP: (payload: { tempToken: string; totpCode?: string; recoveryCode?: string }) =>
    api.post('/auth/verify-totp', payload),

  setup2FA: () => api.post('/auth/setup-2fa'),

  confirm2FA: (totpCode: string) => api.post('/auth/confirm-2fa', { totpCode }),

  getProfile: () => api.get('/auth/me'),

  getSessions: () => api.get('/auth/sessions'),

  revokeSession: (sessionId: string) => api.delete(`/auth/session/${sessionId}`),

  getAuditLogs: () => api.get('/auth/audit-logs'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  logout: () => api.post('/auth/logout'),
};

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
