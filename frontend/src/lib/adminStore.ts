import { mediaApi, contactApi } from '../services/api';
import { supabase } from './supabaseClient';

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

export interface AuthorizedEmailAccount {
  id: string;
  email: string;
  role: 'Super Admin' | 'Administrator' | 'Manager';
  added_by: string;
  added_at: string;
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

export const DEFAULT_AUTHORIZED_EMAILS: AuthorizedEmailAccount[] = [
  { id: 'auth_1', email: 'mr.prem2006@gmail.com', role: 'Super Admin', added_by: 'System Owner', added_at: '2026-07-28' },
  { id: 'auth_2', email: 'contact@mrprem.in', role: 'Super Admin', added_by: 'System Owner', added_at: '2026-07-28' },
  { id: 'auth_3', email: 'zenemootech@gmail.com', role: 'Administrator', added_by: 'Super Admin', added_at: '2026-07-28' },
  { id: 'auth_4', email: 'contact@zenemoo.in', role: 'Administrator', added_by: 'Super Admin', added_at: '2026-07-28' },
  { id: 'auth_5', email: 'support@zenemoo.in', role: 'Manager', added_by: 'Super Admin', added_at: '2026-07-28' },
  { id: 'auth_6', email: 'info@zenemoo.in', role: 'Manager', added_by: 'Super Admin', added_at: '2026-07-28' },
];

// Query Supabase directly for Authorized Admin Emails
export const getStoredAuthorizedEmails = async (): Promise<AuthorizedEmailAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('authorized_admin_emails')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const formatted: AuthorizedEmailAccount[] = data.map((item: any) => ({
        id: item.id || `auth_${Date.now()}`,
        email: item.email,
        role: item.role || 'Administrator',
        added_by: item.added_by || 'Super Admin',
        added_at: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : '2026-07-28',
      }));
      localStorage.setItem('zenemoo_authorized_admin_emails', JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('Supabase authorized_admin_emails fetch fallback:', err);
  }

  const local = localStorage.getItem('zenemoo_authorized_admin_emails');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {}
  }
  return DEFAULT_AUTHORIZED_EMAILS;
};

// Add new Authorized Email directly into Supabase PostgreSQL DB
export const saveAuthorizedEmailToSupabase = async (
  account: Omit<AuthorizedEmailAccount, 'id' | 'added_at'>
): Promise<AuthorizedEmailAccount[]> => {
  const emailClean = account.email.trim().toLowerCase();
  try {
    const { error } = await supabase.from('authorized_admin_emails').insert([
      {
        email: emailClean,
        role: account.role,
        added_by: account.added_by,
      },
    ]);

    if (error) {
      console.warn('Supabase insert authorized_admin_emails warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase insert authorized_admin_emails error:', err);
  }

  // Update local storage backup
  const current = await getStoredAuthorizedEmails();
  if (!current.some((a) => a.email.toLowerCase() === emailClean)) {
    const updated = [
      ...current,
      {
        id: `auth_${Date.now()}`,
        email: emailClean,
        role: account.role,
        added_by: account.added_by,
        added_at: new Date().toISOString().split('T')[0],
      },
    ];
    localStorage.setItem('zenemoo_authorized_admin_emails', JSON.stringify(updated));
    return updated;
  }

  return current;
};

// Delete Authorized Email directly from Supabase PostgreSQL DB
export const deleteAuthorizedEmailFromSupabase = async (idOrEmail: string): Promise<AuthorizedEmailAccount[]> => {
  try {
    await supabase.from('authorized_admin_emails').delete().or(`id.eq.${idOrEmail},email.eq.${idOrEmail}`);
  } catch (err) {
    console.warn('Supabase delete authorized_admin_emails error:', err);
  }

  const current = await getStoredAuthorizedEmails();
  const updated = current.filter((a) => a.id !== idOrEmail && a.email.toLowerCase() !== idOrEmail.toLowerCase());
  localStorage.setItem('zenemoo_authorized_admin_emails', JSON.stringify(updated));
  return updated;
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
