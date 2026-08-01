import { teamApi } from '../services/api';

export interface TimelineItem {
  year?: string;
  date?: string;
  title: string;
  description: string;
}

export interface AchievementItem {
  title: string;
  category?: string;
  description?: string;
  badge?: string;
}

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
  slug?: string;
  employee_id?: string;
  joining_date?: string;
  experience?: string;
  location?: string;
  languages?: string[];
  availability?: string;
  portfolio?: string;
  long_bio?: string;
  ai_summary?: string;
  projects_completed?: string | number;
  accuracy?: string;
  datasets_processed?: string | number;
  hours_worked?: string | number;
  completion_rate?: string;
  quality_score?: string;
  timeline?: TimelineItem[];
  achievements?: (string | AchievementItem)[];
  created_at?: string;
  updated_at?: string;
}

export const getSlugFromName = (name: string): string => {
  if (!name) return 'team-member';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

// Fetch live team members directly from Backend API (Supabase database as source of truth)
export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const liveMembers = (res.data.data as any[]).map((m, idx) => {
        let parsedSkills: string[] = [];
        if (Array.isArray(m.skills)) {
          parsedSkills = m.skills;
        } else if (typeof m.skills === 'string') {
          try {
            parsedSkills = JSON.parse(m.skills);
          } catch (e) {
            parsedSkills = m.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          }
        }

        let parsedLanguages: string[] = [];
        if (Array.isArray(m.languages)) {
          parsedLanguages = m.languages;
        } else if (typeof m.languages === 'string') {
          try {
            parsedLanguages = JSON.parse(m.languages);
          } catch (e) {
            parsedLanguages = m.languages.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          }
        }

        let parsedTimeline: TimelineItem[] = [];
        if (Array.isArray(m.timeline)) {
          parsedTimeline = m.timeline;
        } else if (typeof m.timeline === 'string') {
          try {
            parsedTimeline = JSON.parse(m.timeline);
          } catch (e) {}
        }

        const generatedSlug = m.slug || getSlugFromName(m.name);

        return {
          ...m,
          slug: generatedSlug,
          position: Number(m.position || idx + 1),
          designation: m.designation || m.role || 'Specialist',
          badge: m.badge || 'Specialist',
          skills: parsedSkills,
          languages: parsedLanguages,
          timeline: parsedTimeline,
          image_url: m.image_url || m.image || '/assets/executive.png',
          status: m.status || 'active',
          department: m.department || m.category || 'Engineering',
          category: m.department || m.category || 'Engineering',
        } as TeamMember;
      });
      // Always sort by position ASC
      return liveMembers.sort((a, b) => a.position - b.position);
    }
  } catch (err) {
    console.error('Backend team fetch error:', err);
  }
  return [];
};


export const saveTeamMemberToApi = async (member: Partial<TeamMember>): Promise<TeamMember[]> => {
  const payload = { ...member };
  if (!payload.id || payload.id.trim() === '' || payload.id.startsWith('temp_')) {
    delete payload.id;
  }

  let serverResult: any = null;

  if (payload.id && payload.id.length > 10) {
    try {
      const res = await teamApi.update(payload.id, payload);
      if (res.data) {
        if (Array.isArray(res.data.team) && res.data.team.length > 0) return res.data.team;
        if (Array.isArray(res.data.data) && res.data.data.length > 0) return res.data.data;
        serverResult = res.data.data || res.data.team;
      }
    } catch (e) {
      console.warn('Update failed, creating new record:', e);
    }
  }

  if (!serverResult) {
    delete payload.id;
    const res = await teamApi.create(payload);
    if (res.data) {
      if (Array.isArray(res.data.team) && res.data.team.length > 0) return res.data.team;
      if (Array.isArray(res.data.data) && res.data.data.length > 0) return res.data.data;
      serverResult = res.data.data || res.data.team;
    }
  }

  const freshList = await getStoredTeamMembers();
  if (serverResult && typeof serverResult === 'object' && serverResult.name) {
    const targetId = serverResult.id || member.id;
    const exists = targetId ? freshList.some((m) => m.id === targetId || m.name.toLowerCase() === serverResult.name.toLowerCase()) : false;
    if (!exists) {
      let parsedSkills: string[] = [];
      if (Array.isArray(serverResult.skills)) {
        parsedSkills = serverResult.skills;
      } else if (typeof serverResult.skills === 'string') {
        parsedSkills = serverResult.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      }
      if (parsedSkills.length === 0) parsedSkills = ['Specialist'];

      const mergedMember: TeamMember = {
        id: serverResult.id || `member_${Date.now()}`,
        position: Number(serverResult.position || freshList.length + 1),
        name: serverResult.name || member.name || 'New Team Member',
        designation: serverResult.designation || member.designation || member.role || 'Specialist',
        badge: serverResult.badge || member.badge || 'Specialist',
        skills: parsedSkills,
        image_url: serverResult.image_url || serverResult.image || member.image_url || member.image || '/assets/executive.png',
        bio: serverResult.bio || member.bio || '',
        email: serverResult.email || member.email || '',
        status: serverResult.status || member.status || 'active',
        department: serverResult.department || serverResult.category || member.category || 'Engineering',
        category: serverResult.department || serverResult.category || member.category || 'Engineering',
        slug: serverResult.slug || getSlugFromName(serverResult.name || member.name || 'Team Member'),
      };

      freshList.push(mergedMember);
      freshList.sort((a, b) => a.position - b.position);
    }
  }
  return freshList;
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
