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

  if (payload.id && payload.id.length > 10) {
    try {
      const res = await teamApi.update(payload.id, payload);
      if (res.data && (res.data.team || res.data.data)) {
        const team = res.data.team || res.data.data;
        if (Array.isArray(team)) return team;
      }
    } catch (e) {
      console.warn('Update failed, creating new record:', e);
    }
  }

  delete payload.id;
  const res = await teamApi.create(payload);
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
