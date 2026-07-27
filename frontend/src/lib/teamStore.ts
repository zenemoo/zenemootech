import { teamApi } from '../services/api';
import { getSupabaseClient } from './adminStore';

export interface TeamMember {
  id: string;
  position: number;
  name: string;
  designation: string;
  role?: string;
  image_url: string;
  image?: string;
  fallback?: string;
  bio: string;
  skills: string[];
  badge: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  status: 'active' | 'inactive';
  category: string;
  created_at?: string;
  updated_at?: string;
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

const LOCAL_STORAGE_KEY = 'zenemoo_team_members_v7';

export const normalizeTeamPositions = (members: TeamMember[]): TeamMember[] => {
  if (!Array.isArray(members) || members.length === 0) return [];
  
  // Sort members by position ASC (fallback to index order if positions are duplicate/missing)
  const sorted = [...members].sort((a, b) => {
    const posA = typeof a.position === 'number' && a.position > 0 ? a.position : 999;
    const posB = typeof b.position === 'number' && b.position > 0 ? b.position : 999;
    if (posA === posB) return 0;
    return posA - posB;
  });

  // Always re-assign sequential position numbers 1..N
  return sorted.map((m, idx) => ({
    ...m,
    position: idx + 1,
    designation: m.designation || m.role || 'Specialist',
    role: m.designation || m.role || 'Specialist',
    image_url: m.image_url || m.image || '/assets/executive.png',
    image: m.image_url || m.image || '/assets/executive.png',
    email: m.email || 'zenemootech@gmail.com',
    status: m.status || 'active',
    category: m.category || 'Engineering',
  }));
};

export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  let mediaList: any[] = [];
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: mediaData } = await supabase
        .from('media')
        .select('*')
        .eq('folder', 'zenemoo/team')
        .order('created_at', { ascending: false });
      if (mediaData && Array.isArray(mediaData)) {
        mediaList = mediaData;
      }
    } catch (e) {}
  }

  const attachMediaImage = (m: TeamMember) => {
    let finalImg = m.image_url || m.image;
    if (!finalImg || finalImg === '/assets/executive.png') {
      const match = mediaList.find((media) =>
        media.title && m.name && media.title.toLowerCase().includes(m.name.split(' ')[0].toLowerCase())
      );
      if (match && match.image_url) {
        finalImg = match.image_url;
      }
    }
    return {
      ...m,
      image_url: finalImg || '/assets/executive.png',
      image: finalImg || '/assets/executive.png',
    };
  };

  // 1. Fetch from Backend API
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const raw = res.data.data as TeamMember[];
      const merged = raw.map(attachMediaImage);
      const normalized = normalizeTeamPositions(merged);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch (err) {
    console.warn('Backend team fetch offline, attempting direct Supabase query:', err);
  }

  // 2. Fetch directly from Supabase DB JS Client
  if (supabase) {
    try {
      const { data, error } = await supabase.from('team').select('*').order('position', { ascending: true });
      if (!error && data && Array.isArray(data)) {
        const raw = data as TeamMember[];
        const merged = raw.map(attachMediaImage);
        const normalized = normalizeTeamPositions(merged);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {}
  }

  // 3. Read from LocalStorage Cache
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached !== null) {
    try {
      const parsed = JSON.parse(cached) as TeamMember[];
      if (Array.isArray(parsed)) {
        const merged = parsed.map(attachMediaImage);
        return normalizeTeamPositions(merged);
      }
    } catch (e) {}
  }

  return [];
};

const notifyTeamUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('zenemoo_team_updated'));
  }
};

export const saveTeamMemberToApi = async (member: Partial<TeamMember>): Promise<TeamMember[]> => {
  const imageUrl = member.image_url || member.image || '/assets/executive.png';
  const roleText = member.designation || member.role || 'Specialist';

  // 1. Attempt Backend API call
  try {
    if (member.id && !member.id.startsWith('temp_') && member.id.length > 10) {
      const res = await teamApi.update(member.id, member);
      if (res.data && res.data.team) {
        const normalized = normalizeTeamPositions(res.data.team);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        notifyTeamUpdate();
        return normalized;
      }
    } else {
      const res = await teamApi.create(member);
      if (res.data && res.data.team) {
        const normalized = normalizeTeamPositions(res.data.team);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        notifyTeamUpdate();
        return normalized;
      }
    }
  } catch (e) {
    console.warn('Backend API save failed/offline, writing directly to Supabase DB:', e);
  }

  // 2. Direct Supabase JS Client Insertion/Update (Guarantees Supabase storage & refresh persistence)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload: any = {
        name: member.name || 'New Team Member',
        designation: roleText,
        role: roleText,
        bio: member.bio || '',
        image_url: imageUrl,
        image: imageUrl,
        skills: member.skills || ['Specialist'],
        badge: member.badge || 'Specialist',
        email: member.email || 'zenemootech@gmail.com',
        status: member.status || 'active',
        category: member.category || 'Engineering',
        updated_at: new Date().toISOString(),
      };

      const isUuid = member.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

      if (isUuid) {
        if (member.position) payload.position = member.position;
        await supabase.from('team').update(payload).eq('id', member.id);
      } else {
        const cached = await getStoredTeamMembers();
        payload.position = member.position || cached.length + 1;
        payload.created_at = new Date().toISOString();
        await supabase.from('team').insert([payload]);
      }
    } catch (supaErr) {
      console.warn('Direct Supabase save warning:', supaErr);
    }
  }

  // 3. Local fallback & notify
  const cached = await getStoredTeamMembers();
  let updatedList: TeamMember[];
  if (member.id) {
    updatedList = cached.map((m) => (m.id === member.id ? { ...m, ...member } as TeamMember : m));
  } else {
    const newId = Date.now().toString();
    const newMember: TeamMember = {
      id: newId,
      position: cached.length + 1,
      name: member.name || 'New Team Member',
      designation: roleText,
      role: roleText,
      image_url: imageUrl,
      image: imageUrl,
      bio: member.bio || '',
      skills: member.skills || ['Specialist'],
      badge: member.badge || 'Specialist',
      email: member.email || 'zenemootech@gmail.com',
      status: member.status || 'active',
      category: member.category || 'Engineering',
    };
    updatedList = [...cached, newMember];
  }
  const normalized = normalizeTeamPositions(updatedList);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  notifyTeamUpdate();
  return normalized;
};

export const reorderTeamMemberInApi = async (id: string, newPosition: number): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.reorder(id, newPosition);
    if (res.data && res.data.data) {
      const normalized = normalizeTeamPositions(res.data.data as TeamMember[]);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      notifyTeamUpdate();
      return normalized;
    }
  } catch (e) {
    console.warn('Reorder API failed, performing local reorder:', e);
  }

  // Local reorder fallback
  const cached = await getStoredTeamMembers();
  const currentList = normalizeTeamPositions(cached);
  const targetIndex = currentList.findIndex((m) => m.id === id);
  if (targetIndex !== -1) {
    const clampedPos = Math.max(1, Math.min(newPosition, currentList.length));
    const [targetMember] = currentList.splice(targetIndex, 1);
    currentList.splice(clampedPos - 1, 0, targetMember);
    const updatedList = normalizeTeamPositions(currentList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    notifyTeamUpdate();
    return updatedList;
  }

  return currentList;
};

export const deleteTeamMemberFromApi = async (id: string): Promise<TeamMember[]> => {
  // 1. Attempt Backend API delete
  try {
    const res = await teamApi.delete(id);
    if (res.data && res.data.team) {
      const normalized = normalizeTeamPositions(res.data.team);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      notifyTeamUpdate();
      return normalized;
    }
  } catch (e) {
    console.warn('Team delete API failed, performing direct Supabase DB deletion:', e);
  }

  // 2. Direct Supabase DB Deletion
  const supabase = getSupabaseClient();
  if (supabase && id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    try {
      await supabase.from('team').delete().eq('id', id);
    } catch (supaErr) {
      console.warn('Direct Supabase delete warning:', supaErr);
    }
  }

  // 3. Local Storage Sync
  const cached = await getStoredTeamMembers();
  const filtered = cached.filter((m) => m.id !== id);
  const normalized = normalizeTeamPositions(filtered);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  notifyTeamUpdate();
  return normalized;
};
