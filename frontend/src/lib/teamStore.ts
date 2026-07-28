import { teamApi } from '../services/api';

export interface TeamMember {
  id: string;
  position: number;
  name: string;
  designation: string;
  department?: string;
  role?: string;
  image_url: string;
  image?: string;
  public_id?: string;
  fallback?: string;
  bio: string;
  skills?: string[];
  badge?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  status: 'active' | 'inactive';
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

// Fetch live team members directly from Backend API (Supabase database as source of truth)
export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const liveMembers = (res.data.data as TeamMember[]).map((m, idx) => ({
        ...m,
        position: Number(m.position || idx + 1),
        designation: m.designation || m.role || 'Specialist',
        image_url: m.image_url || m.image || '/assets/executive.png',
        status: m.status || 'active',
        department: m.department || m.category || 'Engineering',
        category: m.department || m.category || 'Engineering',
      }));
      // Always sort by position ASC
      return liveMembers.sort((a, b) => a.position - b.position);
    }
  } catch (err) {
    console.error('Backend team fetch error:', err);
  }
  return [];
};

export const saveTeamMemberToApi = async (member: Partial<TeamMember>): Promise<TeamMember[]> => {
  if (member.id && !member.id.startsWith('temp_') && member.id.length > 10) {
    try {
      const res = await teamApi.update(member.id, member);
      if (res.data && (res.data.team || res.data.data)) {
        const team = res.data.team || res.data.data;
        if (Array.isArray(team)) return team;
      }
    } catch (e) {
      console.warn('Update failed, creating new record:', e);
    }
  }

  const res = await teamApi.create(member);
  if (res.data && (res.data.team || res.data.data)) {
    const team = res.data.team || res.data.data;
    if (Array.isArray(team)) return team;
  }
  return await getStoredTeamMembers();
};

export const reorderTeamMemberInApi = async (id: string, newPosition: number): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.reorder(id, newPosition);
    if (res.data && (res.data.data || res.data.team)) {
      const team = res.data.data || res.data.team;
      if (Array.isArray(team)) return team as TeamMember[];
    }
  } catch (e) {
    console.error('Reorder API error:', e);
  }
  return await getStoredTeamMembers();
};

export const deleteTeamMemberFromApi = async (id: string): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.delete(id);
    if (res.data && (res.data.team || res.data.data)) {
      const team = res.data.team || res.data.data;
      if (Array.isArray(team)) return team;
    }
  } catch (e) {
    console.error('Team delete error:', e);
  }
  return await getStoredTeamMembers();
};
