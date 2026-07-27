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

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'team_1',
    position: 1,
    name: 'Prem Prasad Pradhan',
    designation: 'Founder & Data Operations Director',
    role: 'Founder & Data Operations Director',
    image_url: '/assets/executive.png',
    image: '/assets/executive.png',
    fallback: '/assets/executive.png',
    bio: 'Leads team operations, project execution, and quality control for data and AI projects across DesiCrew partner ecosystem.',
    skills: ['Team Leadership', 'Project Management', 'Quality Control', 'Data Solutions'],
    badge: 'Founder',
    email: 'zenemootech@gmail.com',
    status: 'active',
    category: 'Leadership',
  },
  {
    id: 'team_2',
    position: 2,
    name: 'Madhushmita Das',
    designation: 'Audio Transcription Specialist',
    role: 'Audio Transcription Specialist',
    image_url: '/assets/executive.png',
    image: '/assets/executive.png',
    fallback: '/assets/executive.png',
    bio: 'Supports transcription and data annotation projects with a focus on accuracy, consistency, and multi-dialect language verification.',
    skills: ['Audio Transcription', 'Data Annotation', 'Odia/Hindi Accuracy', 'QC Support'],
    badge: 'Senior Annotator',
    email: 'zenemootech@gmail.com',
    status: 'active',
    category: 'Engineering',
  },
  {
    id: 'team_3',
    position: 3,
    name: 'Chandan Biswal',
    designation: 'Audio Transcription Specialist',
    role: 'Audio Transcription Specialist',
    image_url: '/assets/executive.png',
    image: '/assets/executive.png',
    fallback: '/assets/executive.png',
    bio: 'Works on transcription, data annotation, and file processing tasks. Contributes to daily production targets with high quality standards.',
    skills: ['Transcription', 'Data Annotation', 'Quality Focus', 'Speed Accuracy'],
    badge: 'Specialist',
    email: 'zenemootech@gmail.com',
    status: 'active',
    category: 'Engineering',
  },
];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = DEFAULT_TEAM_MEMBERS;

const LOCAL_STORAGE_KEY = 'zenemoo_team_members_v7';

export const normalizeTeamPositions = (members: TeamMember[]): TeamMember[] => {
  const target = Array.isArray(members) && members.length > 0 ? members : DEFAULT_TEAM_MEMBERS;
  
  // Sort members by position ASC (fallback to index order if positions are duplicate/missing)
  const sorted = [...target].sort((a, b) => {
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
    status: m.status || 'active',
    category: m.category || 'Engineering',
  }));
};

export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  // 1. Fetch from Backend API
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      const normalized = normalizeTeamPositions(res.data.data as TeamMember[]);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch (err) {
    console.warn('Backend team fetch offline, attempting direct Supabase query:', err);
  }

  // 2. Fetch directly from Supabase DB JS Client
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('team').select('*').order('position', { ascending: true });
      if (!error && data && data.length > 0) {
        const normalized = normalizeTeamPositions(data as TeamMember[]);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {}
  }

  // 3. Read from LocalStorage Cache
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as TeamMember[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeTeamPositions(parsed);
      }
    } catch (e) {}
  }

  // 4. Guaranteed Default Team Seed Fallback
  const defaultNormalized = normalizeTeamPositions(DEFAULT_TEAM_MEMBERS);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultNormalized));
  return defaultNormalized;
};

export const saveTeamMemberToApi = async (member: Partial<TeamMember>): Promise<TeamMember[]> => {
  try {
    if (member.id && !member.id.startsWith('temp_') && member.id.length > 10) {
      const res = await teamApi.update(member.id, member);
      if (res.data && res.data.team) {
        const normalized = normalizeTeamPositions(res.data.team);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } else {
      const res = await teamApi.create(member);
      if (res.data && res.data.team) {
        const normalized = normalizeTeamPositions(res.data.team);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch (e) {
    console.warn('Save API call failed, saving locally:', e);
  }

  // Local fallback
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
      designation: member.designation || member.role || 'Specialist',
      role: member.designation || member.role || 'Specialist',
      image_url: member.image_url || member.image || '/assets/executive.png',
      image: member.image_url || member.image || '/assets/executive.png',
      bio: member.bio || '',
      skills: member.skills || ['Specialist'],
      badge: member.badge || 'Specialist',
      status: member.status || 'active',
      category: member.category || 'Engineering',
    };
    updatedList = [...cached, newMember];
  }
  const normalized = normalizeTeamPositions(updatedList);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const reorderTeamMemberInApi = async (id: string, newPosition: number): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.reorder(id, newPosition);
    if (res.data && res.data.data) {
      const normalized = normalizeTeamPositions(res.data.data as TeamMember[]);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
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
    return updatedList;
  }

  return currentList;
};

export const deleteTeamMemberFromApi = async (id: string): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.delete(id);
    if (res.data && res.data.team) {
      const normalized = normalizeTeamPositions(res.data.team);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch (e) {
    console.warn('Team delete API failed, performing local deletion:', e);
  }

  const cached = await getStoredTeamMembers();
  const filtered = cached.filter((m) => m.id !== id);
  const normalized = normalizeTeamPositions(filtered);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};
