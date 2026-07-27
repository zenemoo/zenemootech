import { teamApi } from '../services/api';

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

export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const liveMembers = (res.data.data as TeamMember[]).map((m, idx) => ({
        ...m,
        position: m.position || idx + 1,
        designation: m.designation || m.role || 'Specialist',
        image_url: m.image_url || m.image || '/assets/executive.png',
        status: m.status || 'active',
        category: m.category || 'Engineering',
      }));
      // Always sort by position ASC
      liveMembers.sort((a, b) => a.position - b.position);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(liveMembers));
      return liveMembers;
    }
  } catch (err) {
    console.warn('Backend team fetch offline, using cache:', err);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as TeamMember[];
      return parsed.sort((a, b) => (a.position || 1) - (b.position || 1));
    } catch (e) {}
  }

  return [];
};

export const saveTeamMemberToApi = async (member: Partial<TeamMember>): Promise<TeamMember[]> => {
  if (member.id && !member.id.startsWith('temp_') && member.id.length > 10) {
    try {
      const res = await teamApi.update(member.id, member);
      if (res.data && res.data.team) {
        return res.data.team;
      }
    } catch (e) {
      console.warn('Update failed, creating new record:', e);
    }
  }

  const res = await teamApi.create(member);
  if (res.data && res.data.team) {
    return res.data.team;
  }
  return await getStoredTeamMembers();
};

export const reorderTeamMemberInApi = async (id: string, newPosition: number): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.reorder(id, newPosition);
    if (res.data && res.data.data) {
      return res.data.data as TeamMember[];
    }
  } catch (e) {
    console.warn('Reorder API failed:', e);
  }
  return await getStoredTeamMembers();
};

export const deleteTeamMemberFromApi = async (id: string): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.delete(id);
    if (res.data && res.data.team) {
      return res.data.team;
    }
  } catch (e) {
    console.warn('Team delete warning:', e);
  }
  return await getStoredTeamMembers();
};
