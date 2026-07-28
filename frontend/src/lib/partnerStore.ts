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

// Fetch partners ordered by position ASC
export const getStoredPartners = async (): Promise<PartnerCompany[]> => {
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

// Create or update partner company in Supabase DB with LocalStorage fallback
export const savePartnerToApi = async (partner: Partial<PartnerCompany>): Promise<PartnerCompany[]> => {
  let localList = getLocalPartners();

  try {
    let res;
    if (partner.id && !partner.id.startsWith('temp_') && !partner.id.startsWith('partner_')) {
      res = await partnerApi.update(partner.id, partner);
    } else {
      const { id, ...newPayload } = partner;
      res = await partnerApi.create(newPayload);
    }
    if (res.data && res.data.partners && Array.isArray(res.data.partners)) {
      saveLocalPartners(res.data.partners);
      return res.data.partners;
    }
  } catch (err: any) {
    console.warn('Backend partner save API error. Saving to local storage:', err.message);
  }

  // Fallback to LocalStorage
  if (partner.id && !partner.id.startsWith('temp_')) {
    localList = localList.map((p) => (p.id === partner.id ? ({ ...p, ...partner } as PartnerCompany) : p));
  } else {
    const newPartner: PartnerCompany = {
      id: `partner_${Date.now()}`,
      position: localList.length + 1,
      name: partner.name || 'New Partner',
      role: partner.role || 'Language Data & AI Partner',
      badge: partner.badge || 'AI Partner',
      image_url: partner.image_url || '',
      public_id: partner.public_id || '',
      website_url: partner.website_url || '',
      status: partner.status || 'active',
      created_at: new Date().toISOString(),
    };
    localList.push(newPartner);
  }

  return saveLocalPartners(localList);
};

// Reorder partner position
export const reorderPartnerInApi = async (id: string, newPosition: number): Promise<PartnerCompany[]> => {
  let localList = getLocalPartners();
  const targetIndex = localList.findIndex((p) => p.id === id);
  if (targetIndex !== -1) {
    const clampedPos = Math.max(1, Math.min(newPosition, localList.length));
    const [moved] = localList.splice(targetIndex, 1);
    localList.splice(clampedPos - 1, 0, moved);
    localList = saveLocalPartners(localList);
  }

  try {
    const res = await partnerApi.reorder(id, newPosition);
    if (res.data && res.data.partners && Array.isArray(res.data.partners)) {
      saveLocalPartners(res.data.partners);
      return res.data.partners;
    }
  } catch (err: any) {
    console.warn('Backend partner reorder API error:', err.message);
  }

  return localList;
};

// Delete partner company
export const deletePartnerFromApi = async (id: string): Promise<PartnerCompany[]> => {
  let localList = getLocalPartners().filter((p) => p.id !== id);
  localList = saveLocalPartners(localList);

  try {
    const res = await partnerApi.delete(id);
    if (res.data && res.data.partners && Array.isArray(res.data.partners)) {
      saveLocalPartners(res.data.partners);
      return res.data.partners;
    }
  } catch (err: any) {
    console.warn('Backend partner delete API error:', err.message);
  }

  return localList;
};
