import { mediaApi, contactApi } from '../services/api';

export interface SiteConfig {
  supabaseUrl: string;
  supabaseAnonKey?: string;
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
  lang?: string;
  inquiry_code?: string;
  inquiry_id?: string;
  notes?: string;
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

export const DEFAULT_CONFIG: SiteConfig = {
  supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wkbkomwjuywdeaxgchxw.supabase.co',
  adminPasscode: 'zenemoo2026',
};

export const DEFAULT_TELEMETRY: TelemetryConfig = {
  dailyOutput: 180,
  monthlyOutput: 3600,
  accuracyRate: 99,
  activeSpecialists: 20,
};

export const getSiteConfig = (): SiteConfig => {
  return DEFAULT_CONFIG;
};

export const saveSiteConfig = (_config: SiteConfig): void => {
  // Config saved on server backend
};

export const getTelemetryConfig = (): TelemetryConfig => {
  return DEFAULT_TELEMETRY;
};

export const saveTelemetryConfig = (_config: TelemetryConfig): void => {
  // Telemetry saved on server backend
};

// Fetch all contact inquiries directly from Backend API (Supabase DB)
export const getContactInquiries = async (): Promise<ContactInquiry[]> => {
  try {
    const res = await contactApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      return res.data.data as ContactInquiry[];
    }
  } catch (err) {
    console.error('Backend contact fetch error:', err);
  }
  return [];
};

// Submit a new contact inquiry to Express Backend API -> Supabase DB
export const saveContactInquiry = async (
  inquiry: Omit<ContactInquiry, 'id' | 'created_at' | 'status'>
): Promise<ContactInquiry | null> => {
  try {
    const res = await contactApi.submit(inquiry);
    if (res.data && res.data.data) {
      return res.data.data as ContactInquiry;
    }
  } catch (err) {
    console.error('Backend contact submit error:', err);
    throw err;
  }
  return null;
};

// Update contact inquiry status ('read' / 'unread') or internal notes
export const updateContactInquiry = async (
  id: string,
  updates: { status?: string; notes?: string }
): Promise<ContactInquiry | null> => {
  try {
    const res = await contactApi.update(id, updates);
    if (res.data && res.data.data) {
      return res.data.data as ContactInquiry;
    }
  } catch (err) {
    console.error('Backend contact update error:', err);
  }
  return null;
};

// Production Media Uploader: Streams through Backend API to Cloudinary + Supabase
export const uploadImageToCloudinary = async (file: File, folder = 'zenemoo/team'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('title', file.name);

  try {
    const res = await mediaApi.upload(formData);
    if (res.data && res.data.media && res.data.media.image_url) {
      return res.data.media.image_url; // Returns secure HTTPS Cloudinary URL from Supabase record
    }
    throw new Error(res.data?.message || 'Backend upload failed to return a valid Cloudinary HTTPS URL');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Image upload failed';
    console.error('Production Upload Error:', errorMsg);
    throw new Error(errorMsg);
  }
};
