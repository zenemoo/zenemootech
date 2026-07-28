import axios from 'axios';

let rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'https://zenemootech-api.onrender.com/api';
rawApiUrl = rawApiUrl.replace(/\/+$/, '');
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl = `${rawApiUrl}/api`;
}

export const api = axios.create({
  baseURL: rawApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for JWT authentication header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zenemoo_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authApi = {
  login: (passcode: string) => api.post('/auth/login', { passcode }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
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
