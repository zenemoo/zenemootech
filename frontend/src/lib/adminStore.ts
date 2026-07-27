import { createClient } from '@supabase/supabase-js';
import { mediaApi, contactApi } from '../services/api';

export interface SiteConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  adminPasscode: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
}

export interface TelemetryConfig {
  dailyOutput: number;
  monthlyOutput: number;
  accuracyRate: number;
  activeSpecialists: number;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  language?: string;
  message: string;
  status: string;
  created_at: string;
}

export interface MediaRecord {
  id: string;
  title: string;
  folder: string;
  image_url: string;
  public_id: string;
  asset_id?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  created_at?: string;
}

const CONFIG_STORAGE_KEY = 'zenemoo_admin_config_v3';
const TELEMETRY_STORAGE_KEY = 'zenemoo_telemetry_config_v3';

export const DEFAULT_CONFIG: SiteConfig = {
  supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wkbkomwjuywdeaxgchxw.supabase.co',
  supabaseAnonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmtvbXdqdXl3ZGVheGdjaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjk2OTIsImV4cCI6MjEwMDc0NTY5Mn0.A9O0I0nzdWLrsULZEdL6GxUp4Ok3Y_QRbqCMJesXbM4',
  adminPasscode: 'zenemoo2026',
};

export const DEFAULT_TELEMETRY: TelemetryConfig = {
  dailyOutput: 180,
  monthlyOutput: 3600,
  accuracyRate: 99,
  activeSpecialists: 20,
};

export const getSiteConfig = (): SiteConfig => {
  const cached = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (cached) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
    } catch (e) {}
  }
  return DEFAULT_CONFIG;
};

export const saveSiteConfig = (config: SiteConfig): void => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};

export const getTelemetryConfig = (): TelemetryConfig => {
  const cached = localStorage.getItem(TELEMETRY_STORAGE_KEY);
  if (cached) {
    try {
      return { ...DEFAULT_TELEMETRY, ...JSON.parse(cached) };
    } catch (e) {}
  }
  return DEFAULT_TELEMETRY;
};

export const saveTelemetryConfig = (config: TelemetryConfig): void => {
  localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(config));
};

// Dynamic Supabase Client based on VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
export const getSupabaseClient = () => {
  const config = getSiteConfig();
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      return createClient(config.supabaseUrl, config.supabaseAnonKey);
    } catch (e) {
      console.warn('Invalid Supabase configuration:', e);
    }
  }
  return null;
};

// Fetch all contact inquiries from Backend API / Supabase DB
export const getContactInquiries = async (): Promise<ContactInquiry[]> => {
  try {
    const res = await contactApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      return res.data.data as ContactInquiry[];
    }
  } catch (err) {
    console.warn('Backend contact fetch warning:', err);
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as ContactInquiry[];
      }
    } catch (err) {}
  }
  return [];
};

// Submit a new contact inquiry to Backend API & Supabase DB
export const saveContactInquiry = async (inquiry: Omit<ContactInquiry, 'id' | 'created_at' | 'status'>): Promise<ContactInquiry> => {
  try {
    const res = await contactApi.submit(inquiry);
    if (res.data && res.data.data) {
      return res.data.data as ContactInquiry;
    }
  } catch (err) {
    console.warn('Backend contact submit warning:', err);
  }

  const newInquiry: ContactInquiry = {
    id: Date.now().toString(),
    ...inquiry,
    status: 'NEW',
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').insert([inquiry]).select();
      if (!error && data && data[0]) {
        return data[0] as ContactInquiry;
      }
    } catch (err) {}
  }

  return newInquiry;
};

// Production Media Uploader: Streams ONLY through Backend API to Cloudinary + Supabase
export const uploadImageToCloudinary = async (file: File, folder = 'zenemoo/team'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('title', file.name);

  try {
    const res = await mediaApi.upload(formData);
    if (res.data && res.data.media && res.data.media.image_url) {
      return res.data.media.image_url; // Always returns secure HTTPS Cloudinary URL from Supabase record
    }
    throw new Error(res.data?.message || 'Backend upload failed to return a valid Cloudinary HTTPS URL');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Image upload failed';
    console.error('Production Upload Error:', errorMsg);
    throw new Error(errorMsg);
  }
};
