import { teamApi } from '../services/api';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  fallback?: string;
  bio: string;
  skills: string[];
  badge: string;
  email?: string;
  linkedin?: string;
  github?: string;
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

const LOCAL_STORAGE_KEY = 'zenemoo_team_members_v6';

export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const liveMembers = res.data.data as TeamMember[];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(liveMembers));
      return liveMembers;
    }
  } catch (err) {
    console.warn('Backend team fetch offline, using cache:', err);
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  return [];
};

export const saveTeamMemberToApi = async (member: Omit<TeamMember, 'id'> & { id?: string }): Promise<TeamMember> => {
  if (member.id && !member.id.startsWith('temp_') && member.id.length > 10) {
    try {
      const res = await teamApi.update(member.id, member);
      if (res.data && res.data.data) {
        return res.data.data as TeamMember;
      }
    } catch (e) {
      console.warn('Update failed, creating new record:', e);
    }
  }

  const res = await teamApi.create(member);
  if (res.data && res.data.data) {
    return res.data.data as TeamMember;
  }
  return { id: Date.now().toString(), ...member } as TeamMember;
};

export const deleteTeamMemberFromApi = async (id: string): Promise<void> => {
  try {
    await teamApi.delete(id);
  } catch (e) {
    console.warn('Team delete warning:', e);
  }
};
