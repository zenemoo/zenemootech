import { createClient } from '@supabase/supabase-js';
import { TeamMember, INITIAL_TEAM_MEMBERS } from './teamStore';

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

const CONFIG_STORAGE_KEY = 'zenemoo_admin_config_v1';
const TELEMETRY_STORAGE_KEY = 'zenemoo_telemetry_config_v1';

export const DEFAULT_CONFIG: SiteConfig = {
  supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || '',
  supabaseAnonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
  cloudinaryCloudName: (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'zenemoo',
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

// Dynamic Cloudinary Image Upload
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const config = getSiteConfig();
  const cloudName = config.cloudinaryCloudName || 'zenemoo';
  const uploadPreset = config.cloudinaryUploadPreset || 'zenemoo_preset';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    }
    if (data.error?.message) {
      throw new Error(data.error.message);
    }
  } catch (err: any) {
    console.warn('Cloudinary upload warning:', err);
  }

  // Fallback to Data URL if Cloudinary upload preset is not set
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};
