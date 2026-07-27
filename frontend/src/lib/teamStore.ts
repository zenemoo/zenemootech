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

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Prem Prasad Pradhan',
    role: 'Founder & Vendor Manager',
    image: '/assets/executive.png',
    fallback: '/assets/executive.png',
    bio: 'Leads team operations, project execution, and multi-stage quality control for data and AI projects.',
    skills: ['Project Management', 'Team Leadership', 'Quality Control', 'DesiCrew Vendor'],
    badge: 'Founder',
    email: 'contact@mrprem.in',
  },
  {
    id: '2',
    name: 'Chandan Biswal',
    role: 'Data Annotator & Transcription Specialist',
    image: '/assets/face_restoration.png',
    fallback: '/assets/face_restoration.png',
    bio: 'Works on transcription, data annotation, and file processing tasks.',
    skills: ['Transcription', 'Data Annotation', 'Quality Focus', 'Productivity'],
    badge: 'Specialist',
    email: 'zenemootech@gmail.com',
  },
];

const LOCAL_STORAGE_KEY = 'zenemoo_team_members_v4';

export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  // 1. Fetch live team data from Backend API / Supabase
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      const liveMembers = res.data.data as TeamMember[];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(liveMembers));
      return liveMembers;
    }
  } catch (err) {
    console.warn('Backend API fetch offline, checking local storage...');
  }

  // 2. Local storage cache
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  return INITIAL_TEAM_MEMBERS;
};

export const saveTeamMembers = async (members: TeamMember[]): Promise<void> => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(members));

  // Sync each new or updated team member with backend API / Supabase
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
