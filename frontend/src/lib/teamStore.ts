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

// Zero hardcoded dummy team members - only members added in Admin Control Center will be displayed
export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

const LOCAL_STORAGE_KEY = 'zenemoo_team_members_v5';

export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  // 1. Fetch live team data from Backend API / Supabase PostgreSQL database
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const liveMembers = res.data.data as TeamMember[];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(liveMembers));
      return liveMembers;
    }
  } catch (err) {
    console.warn('Backend API fetch offline, checking local storage cache...');
  }

  // 2. Local storage cache fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  return [];
};

export const saveTeamMembers = async (members: TeamMember[]): Promise<void> => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(members));

  // Sync with backend API / Supabase PostgreSQL database
  try {
    for (const member of members) {
      if (member.id && !member.id.startsWith('temp_')) {
        try {
          await teamApi.update(member.id, member);
        } catch (e) {
          await teamApi.create(member);
        }
      } else {
        await teamApi.create(member);
      }
    }
  } catch (err) {
    console.warn('Backend team sync warning:', err);
  }
};
