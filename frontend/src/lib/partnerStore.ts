import { supabase } from './supabaseClient';
import { partnerApi } from '../services/api';

export interface PartnerCompany {
  id: string;
  position: number;
  name: string;
  role?: string;
  badge?: string;
  image_url?: string;
  public_id?: string;
  website_url?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'zenemoo_partners_db';

const getLocalPartners = (): PartnerCompany[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => Number(a.position) - Number(b.position));
      }
    }
  } catch (e) {}
  return [];
};

const saveLocalPartners = (list: PartnerCompany[]): PartnerCompany[] => {
  const sorted = list
    .map((item, idx) => ({ ...item, position: idx + 1 }))
    .sort((a, b) => Number(a.position) - Number(b.position));
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {}
  return sorted;
};

// Fetch partners ordered by position ASC directly from Supabase
export const getStoredPartners = async (): Promise<PartnerCompany[]> => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('position', { ascending: true });

    if (!error && Array.isArray(data)) {
      saveLocalPartners(data as PartnerCompany[]);
      return data as PartnerCompany[];
    }
  } catch (err: any) {
    console.warn('Direct Supabase partners error:', err.message);
  }

  try {
    const res = await partnerApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const live = res.data.data.sort((a: PartnerCompany, b: PartnerCompany) => Number(a.position) - Number(b.position));
      saveLocalPartners(live);
      return live;
    }
  } catch (err: any) {
    console.warn('Backend partners API unavailable (404/network). Using local storage fallback:', err.message);
  }
  return getLocalPartners();
};

// Create or update partner company directly in Supabase
export const savePartnerToApi = async (partner: Partial<PartnerCompany>): Promise<PartnerCompany[]> => {
  let localList = getLocalPartners();
  const isUUID = partner.id && partner.id.includes('-');

  const payloadToSave = {
    name: partner.name || 'New Partner',
    role: partner.role || 'Language Data & AI Partner',
    badge: partner.badge || 'AI Partner',
    image_url: partner.image_url || '',
    public_id: partner.public_id || '',
    website_url: partner.website_url || '',
    status: partner.status || 'active',
    position: partner.position || localList.length + 1,
    updated_at: new Date().toISOString(),
  };

  try {
    if (isUUID) {
      await supabase.from('partners').update(payloadToSave).eq('id', partner.id);
    } else {
      await supabase.from('partners').insert([{ ...payloadToSave, created_at: new Date().toISOString() }]);
    }
    return await getStoredPartners();
  } catch (err: any) {
    console.warn('Direct Supabase save partner error:', err.message);
  }

  try {
    if (isUUID) {
      await partnerApi.update(partner.id!, payloadToSave);
    } else {
      await partnerApi.create(payloadToSave);
    }
  } catch (e) {}

  if (partner.id && !partner.id.startsWith('temp_')) {
    localList = localList.map((p) => (p.id === partner.id ? ({ ...p, ...partner } as PartnerCompany) : p));
  } else {
    const newPartner: PartnerCompany = {
      id: `partner_${Date.now()}`,
      ...payloadToSave,
      created_at: new Date().toISOString(),
    } as PartnerCompany;
    localList.push(newPartner);
  }

  return saveLocalPartners(localList);
};

// Reorder partner position
export const reorderPartnerInApi = async (id: string, newPosition: number): Promise<PartnerCompany[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('partners').update({ position: newPosition }).eq('id', id);
    }
  } catch (e) {}

  let localList = getLocalPartners();
  const targetIndex = localList.findIndex((p) => p.id === id);
  if (targetIndex !== -1) {
    const clampedPos = Math.max(1, Math.min(newPosition, localList.length));
    const [moved] = localList.splice(targetIndex, 1);
    localList.splice(clampedPos - 1, 0, moved);
    localList = saveLocalPartners(localList);
  }

  return getStoredPartners();
};

// Delete partner company
export const deletePartnerFromApi = async (id: string): Promise<PartnerCompany[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('partners').delete().eq('id', id);
    }
  } catch (e) {}

  let localList = getLocalPartners().filter((p) => p.id !== id);
  localList = saveLocalPartners(localList);

  return getStoredPartners();
};
