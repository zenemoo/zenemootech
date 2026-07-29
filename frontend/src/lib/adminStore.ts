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
  name?: string;
  profile_photo_url?: string;
  department?: string;
  phone?: string;
  telegram_chat_id?: string;
  notes?: string;
  status?: 'active' | 'disabled';
  last_login?: string;
  last_password_reset?: string;
  added_by: string;
  added_at: string;
}

export interface MessageHistoryRecord {
  id: string;
  message_id: string;
  sender: string;
  recipient: string;
  subject: string;
  snippet?: string;
  body?: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  delivery_time_ms?: number;
  folder: 'inbox' | 'sent' | 'drafts' | 'templates';
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
  { id: 'auth_1', email: 'mr.prem2006@gmail.com', name: 'Prem Prasad', role: 'Super Admin', department: 'Executive AI Engineering', phone: '+91 9827775230', status: 'active', added_by: 'System Owner', added_at: '2026-07-28' },
  { id: 'auth_2', email: 'contact@mrprem.in', name: 'Prem Prasad', role: 'Super Admin', department: 'Enterprise Operations', phone: '+91 9827775230', status: 'active', added_by: 'System Owner', added_at: '2026-07-28' },
  { id: 'auth_3', email: 'zenemootech@gmail.com', name: 'Zenemoo Tech Ops', role: 'Administrator', department: 'AI Speech & Data Ops', phone: '+91 9827775230', status: 'active', added_by: 'Super Admin', added_at: '2026-07-28' },
  { id: 'auth_4', email: 'contact@zenemoo.in', name: 'Client Support Lead', role: 'Administrator', department: 'Customer Success', phone: '+91 9827775230', status: 'active', added_by: 'Super Admin', added_at: '2026-07-28' },
  { id: 'auth_5', email: 'support@zenemoo.in', name: 'Technical Support', role: 'Manager', department: 'Quality Control (Super QC)', status: 'active', added_by: 'Super Admin', added_at: '2026-07-28' },
  { id: 'auth_6', email: 'info@zenemoo.in', name: 'General Inquiries', role: 'Manager', department: 'Partnerships & Growth', status: 'active', added_by: 'Super Admin', added_at: '2026-07-28' },
];

export const DEFAULT_MESSAGE_HISTORY: MessageHistoryRecord[] = [
  {
    id: 'msg_1',
    message_id: 'MSG-2026-8812',
    sender: 'contact@zenemoo.in',
    recipient: 'john.smith@enterprise.com',
    subject: 'Zenemoo AI Data Annotation Services Proposal',
    snippet: 'Thank you for reaching out regarding native Odia transcription & dataset annotation...',
    body: 'Hi John,\n\nThank you for reaching out to Zenemoo AI Solutions. Our specialized dataset annotation teams are ready to handle your high-volume audio transcription project with 99%+ accuracy SLAs.\n\nBest regards,\nZenemoo Enterprise Team',
    sent_at: '2026-07-29T11:20:00Z',
    status: 'opened',
    delivery_time_ms: 1240,
    folder: 'sent',
  },
  {
    id: 'msg_2',
    message_id: 'MSG-2026-8813',
    sender: 'support@zenemoo.in',
    recipient: 'priya.sharma@techcorp.io',
    subject: 'Opportunity Application Status Update - AI Data Annotator',
    snippet: 'Your application for AI Data Annotator at DesiCrew Solutions has been shortlisted...',
    body: 'Dear Priya,\n\nWe are pleased to inform you that your candidate application for the AI Data Annotator program has been shortlisted for the next evaluation round.\n\nRegards,\nZenemoo Recruitment Ops',
    sent_at: '2026-07-29T10:45:00Z',
    status: 'clicked',
    delivery_time_ms: 980,
    folder: 'sent',
  },
  {
    id: 'msg_3',
    message_id: 'MSG-2026-8814',
    sender: 'info@zenemoo.in',
    recipient: 'newsletter-subscribers@zenemoo.in',
    subject: 'Zenemoo AI Monthly Intelligence Newsletter - July 2026',
    snippet: 'Discover how multi-stage Super QC audits are scaling LLM training datasets...',
    body: 'Hello Subscribers,\n\nWelcome to the July edition of the Zenemoo AI Platform update featuring full dataset reordering engine metrics and platform security protocols.',
    sent_at: '2026-07-28T16:00:00Z',
    status: 'delivered',
    delivery_time_ms: 1540,
    folder: 'sent',
  },
  {
    id: 'msg_4',
    message_id: 'MSG-2026-8815',
    sender: 'zenemootech@gmail.com',
    recipient: 'security-alerts@zenemoo.in',
    subject: 'Security Alert: Administrator Login from New Device',
    snippet: 'New login detected for mr.prem2006@gmail.com from Windows Chrome...',
    body: 'Automated Security Alert:\nAn administrator login occurred for mr.prem2006@gmail.com at 2026-07-29 19:19 IST.',
    sent_at: '2026-07-29T13:49:00Z',
    status: 'opened',
    delivery_time_ms: 450,
    folder: 'sent',
  },
];

// Helper dictionary for persistent per-email profile photos
export const getStoredPhotoMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const local = localStorage.getItem('zenemoo_admin_photos_map');
    return local ? JSON.parse(local) : {};
  } catch (e) {
    return {};
  }
};

export const getStoredAdminPhoto = (email: string): string => {
  if (!email) return '';
  const map = getStoredPhotoMap();
  return map[email.trim().toLowerCase()] || '';
};

export const setStoredAdminPhoto = (email: string, photoUrl: string) => {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const map = getStoredPhotoMap();
  if (photoUrl) {
    map[cleanEmail] = photoUrl;
  } else {
    delete map[cleanEmail];
  }
  localStorage.setItem('zenemoo_admin_photos_map', JSON.stringify(map));
};

// Query Supabase directly for Authorized Admin Emails
export const getStoredAuthorizedEmails = async (): Promise<AuthorizedEmailAccount[]> => {
  const photoMap = getStoredPhotoMap();
  try {
    const { data, error } = await supabase
      .from('authorized_admin_emails')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const formatted: AuthorizedEmailAccount[] = data.map((item: any) => {
        const cleanEmail = item.email.trim().toLowerCase();
        const photo = photoMap[cleanEmail] || item.profile_photo_url || item.avatar_url || '';
        if (photo) photoMap[cleanEmail] = photo;
        return {
          id: item.id || `auth_${Date.now()}`,
          email: item.email,
          name: item.name || item.email.split('@')[0],
          role: item.role || 'Administrator',
          profile_photo_url: photo,
          department: item.department || 'Operations',
          phone: item.phone || '',
          telegram_chat_id: item.telegram_chat_id || '',
          notes: item.notes || '',
          status: item.status || 'active',
          last_login: item.last_login || '',
          last_password_reset: item.last_password_reset || '',
          added_by: item.added_by || 'Super Admin',
          added_at: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : '2026-07-28',
        };
      });
      localStorage.setItem('zenemoo_admin_photos_map', JSON.stringify(photoMap));
      localStorage.setItem('zenemoo_authorized_admin_emails', JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('Supabase authorized_admin_emails fetch fallback:', err);
  }

  const local = localStorage.getItem('zenemoo_authorized_admin_emails');
  if (local) {
    try {
      const parsed: AuthorizedEmailAccount[] = JSON.parse(local);
      return parsed.map(item => ({
        ...item,
        profile_photo_url: photoMap[item.email.trim().toLowerCase()] || item.profile_photo_url || ''
      }));
    } catch (e) {}
  }
  return DEFAULT_AUTHORIZED_EMAILS.map(item => ({
    ...item,
    profile_photo_url: photoMap[item.email.trim().toLowerCase()] || item.profile_photo_url || ''
  }));
};

// Add or Update Authorized Email directly into Supabase PostgreSQL DB
export const saveAuthorizedEmailToSupabase = async (
  account: Omit<AuthorizedEmailAccount, 'id' | 'added_at'>
): Promise<AuthorizedEmailAccount[]> => {
  const emailClean = account.email.trim().toLowerCase();
  if (account.profile_photo_url) {
    setStoredAdminPhoto(emailClean, account.profile_photo_url);
  }
  const insertPayload: any = {
    email: emailClean,
    role: account.role,
    added_by: account.added_by,
  };
  if (account.name) insertPayload.name = account.name;
  if (account.profile_photo_url) insertPayload.profile_photo_url = account.profile_photo_url;
  if (account.department) insertPayload.department = account.department;
  if (account.phone) insertPayload.phone = account.phone;
  if (account.telegram_chat_id) insertPayload.telegram_chat_id = account.telegram_chat_id;
  if (account.notes) insertPayload.notes = account.notes;
  if (account.status) insertPayload.status = account.status;

  try {
    const { error } = await supabase.from('authorized_admin_emails').upsert([insertPayload], { onConflict: 'email' });
    if (error) {
      console.warn('Supabase upsert authorized_admin_emails warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase upsert authorized_admin_emails error:', err);
  }

  // Update local storage backup
  const local = localStorage.getItem('zenemoo_authorized_admin_emails');
  let current: AuthorizedEmailAccount[] = [];
  if (local) {
    try {
      current = JSON.parse(local);
    } catch (e) {}
  }
  if (current.length === 0) {
    current = DEFAULT_AUTHORIZED_EMAILS;
  }

  const existingIdx = current.findIndex((a) => a.email.toLowerCase() === emailClean);
  const photo = account.profile_photo_url || getStoredAdminPhoto(emailClean) || (existingIdx >= 0 ? current[existingIdx].profile_photo_url : '');
  
  const newAccount: AuthorizedEmailAccount = {
    id: existingIdx >= 0 ? current[existingIdx].id : `auth_${Date.now()}`,
    email: emailClean,
    role: account.role,
    name: account.name || (existingIdx >= 0 ? current[existingIdx].name : emailClean.split('@')[0]),
    profile_photo_url: photo || '',
    department: account.department || (existingIdx >= 0 ? current[existingIdx].department : 'Operations'),
    phone: account.phone || (existingIdx >= 0 ? current[existingIdx].phone : ''),
    telegram_chat_id: account.telegram_chat_id || (existingIdx >= 0 ? current[existingIdx].telegram_chat_id : ''),
    notes: account.notes || (existingIdx >= 0 ? current[existingIdx].notes : ''),
    status: account.status || (existingIdx >= 0 ? current[existingIdx].status : 'active'),
    added_by: account.added_by,
    added_at: existingIdx >= 0 ? current[existingIdx].added_at : new Date().toISOString().split('T')[0],
  };

  let updated: AuthorizedEmailAccount[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = newAccount;
  } else {
    updated = [...current, newAccount];
  }
  localStorage.setItem('zenemoo_authorized_admin_emails', JSON.stringify(updated));
  return updated;
};

// Update an existing Authorized Email account fields in Supabase & LocalStorage
export const updateAuthorizedEmailInSupabase = async (
  idOrEmail: string,
  updates: Partial<AuthorizedEmailAccount>
): Promise<AuthorizedEmailAccount[]> => {
  const cleanKey = idOrEmail.trim().toLowerCase();
  if (updates.profile_photo_url !== undefined) {
    setStoredAdminPhoto(cleanKey, updates.profile_photo_url || '');
  }

  try {
    const { error } = await supabase
      .from('authorized_admin_emails')
      .update(updates)
      .or(`id.eq.${idOrEmail},email.eq.${idOrEmail}`);

    if (error) {
      console.warn('Supabase update authorized_admin_emails warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase update authorized_admin_emails error:', err);
  }

  const local = localStorage.getItem('zenemoo_authorized_admin_emails');
  let current: AuthorizedEmailAccount[] = [];
  if (local) {
    try {
      current = JSON.parse(local);
    } catch (e) {}
  }
  if (current.length === 0) {
    current = DEFAULT_AUTHORIZED_EMAILS;
  }

  const updated = current.map((item) => {
    if (item.id === idOrEmail || item.email.toLowerCase() === cleanKey) {
      const mergedPhoto = updates.profile_photo_url !== undefined ? updates.profile_photo_url : (item.profile_photo_url || getStoredAdminPhoto(item.email));
      return { ...item, ...updates, profile_photo_url: mergedPhoto || '' };
    }
    return item;
  });

  localStorage.setItem('zenemoo_authorized_admin_emails', JSON.stringify(updated));
  return updated;
};

// Helper for Message History Records
export const getStoredMessageHistoryRecords = async (): Promise<MessageHistoryRecord[]> => {
  const local = localStorage.getItem('zenemoo_message_history');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {}
  }
  localStorage.setItem('zenemoo_message_history', JSON.stringify(DEFAULT_MESSAGE_HISTORY));
  return DEFAULT_MESSAGE_HISTORY;
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
