import { createClient } from '@supabase/supabase-js';
import { uploadApi } from '../services/api';

export interface SiteConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  adminPasscode: string;
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

const CONFIG_STORAGE_KEY = 'zenemoo_admin_config_v2';
const TELEMETRY_STORAGE_KEY = 'zenemoo_telemetry_config_v2';
const CONTACTS_STORAGE_KEY = 'zenemoo_contacts_inquiries_v2';

export const DEFAULT_CONFIG: SiteConfig = {
  supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wkbkomwjuywdeaxgchxw.supabase.co',
  supabaseAnonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmtvbXdqdXl3ZGVheGdjaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjk2OTIsImV4cCI6MjEwMDc0NTY5Mn0.A9O0I0nzdWLrsULZEdL6GxUp4Ok3Y_QRbqCMJesXbM4',
  cloudinaryCloudName: (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'rwoe0mm9',
  cloudinaryUploadPreset: (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'zenemoo_preset',
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

// Dynamic Supabase Client based on config
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

// Fetch all contact inquiries from Supabase DB or LocalStorage
export const getContactInquiries = async (): Promise<ContactInquiry[]> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as ContactInquiry[];
      }
    } catch (err) {}
  }

  const cached = localStorage.getItem(CONTACTS_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  return [];
};

// Submit a new contact inquiry to Supabase DB & LocalStorage
export const saveContactInquiry = async (inquiry: Omit<ContactInquiry, 'id' | 'created_at' | 'status'>): Promise<ContactInquiry> => {
  const newInquiry: ContactInquiry = {
    id: Date.now().toString(),
    ...inquiry,
    status: 'NEW',
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').insert([newInquiry]).select();
      if (!error && data && data[0]) {
        return data[0] as ContactInquiry;
      }
    } catch (err) {}
  }

  const cached = await getContactInquiries();
  const updated = [newInquiry, ...cached];
  localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
  return newInquiry;
};

// Cloudinary Image Upload (Tries Backend API endpoint first, then Cloudinary API, then fallback)
export const uploadImageToCloudinary = async (file: File, folder = 'zenemoo/team'): Promise<string> => {
  // 1. Try Backend API POST /api/upload (Uses backend Cloudinary API key & secret)
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await uploadApi.uploadMedia(formData);
    if (res.data && res.data.data && res.data.data.url) {
      return res.data.data.url; // Returns https://res.cloudinary.com/...
    }
  } catch (err) {
    console.warn('Backend Cloudinary upload endpoint offline, trying client upload...');
  }

  // 2. Direct Cloudinary Client API
  const config = getSiteConfig();
  const cloudName = config.cloudinaryCloudName || 'rwoe0mm9';
  const uploadPreset = config.cloudinaryUploadPreset || 'zenemoo_preset';

  try {
    const formData2 = new FormData();
    formData2.append('file', file);
    formData2.append('upload_preset', uploadPreset);
    formData2.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData2,
    });
    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    }
  } catch (err: any) {
    console.warn('Cloudinary direct upload fallback:', err);
  }

  // 3. Fallback to Data URL preview
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};
