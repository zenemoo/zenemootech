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

// Initial 12 Team Members
export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Prem Prasad Pradhan',
    role: 'Founder & Vendor Manager',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/Prem_Prasad_Pradhan.png',
    fallback: '/assets/executive.png',
    bio: 'Leads team operations, project execution, and multi-stage quality control for data and AI projects. Vendor manager for DesiCrew Solutions.',
    skills: ['Project Management', 'Team Leadership', 'Quality Control', 'DesiCrew Vendor'],
    badge: 'Founder',
    email: 'mr.prem2006@gmail.com',
    linkedin: 'https://www.linkedin.com/in/prem-prasad-pradhan-18472b295/',
    github: 'https://github.com/MRPREM31',
  },
  {
    id: '2',
    name: 'Chandan Biswal',
    role: 'Data Annotator & Transcription Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/chandan.jpeg',
    fallback: '/assets/face_restoration.png',
    bio: 'Works on transcription, data annotation, and file processing tasks. Contributes to daily production targets while maintaining quality and accuracy standards.',
    skills: ['Transcription', 'Data Annotation', 'Quality Focus', 'Productivity'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '3',
    name: 'Madhushmita Das',
    role: 'Senior Annotator & QC Support',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/madhusmita.jpeg',
    fallback: '/assets/hero_enhanced.png',
    bio: 'Supports transcription and data annotation projects with a focus on accuracy and consistency. Assists the quality review team.',
    skills: ['Annotation', 'QC Support', 'Hindi/English', 'Accuracy'],
    badge: 'Senior Annotator',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '4',
    name: 'Subhasish Sahu',
    role: 'Transcription Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/subhasish.jpeg',
    fallback: '/assets/executive.png',
    bio: 'Works on transcription projects with focus on accuracy, formatting, and maintaining project quality standards.',
    skills: ['Transcription', 'Formatting', 'Accuracy', 'Productivity'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '5',
    name: 'Samir Kumar Dash',
    role: 'Data Annotation & Transcription Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/images/Team%20Member/SamirKumarDash.jpg',
    fallback: '/assets/face_restoration.png',
    bio: 'Works on data annotation, transcription, and file processing tasks. Contributes to project workflows by maintaining accuracy.',
    skills: ['Data Annotation', 'Transcription', 'Formatting', 'Quality Focus'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '6',
    name: 'Sridhar Patro',
    role: 'Segmentation & Transcription Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/sridhar.jpeg',
    fallback: '/assets/hero_enhanced.png',
    bio: 'Works on audio segmentation and transcription tasks, ensuring proper speaker segmentation, timing accuracy, and quality standards.',
    skills: ['Segmentation', 'Transcription', 'Timing Accuracy', 'Quality Focus'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '7',
    name: 'Satya Narayan Padhi',
    role: 'Transcription & Data Processing Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/satya.jpeg',
    fallback: '/assets/executive.png',
    bio: 'Handles transcription and data processing tasks, ensuring proper formatting, accuracy, and timely completion of project files.',
    skills: ['Transcription', 'Data Processing', 'Formatting', 'Productivity'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '8',
    name: 'Ashis Gouda',
    role: 'Audio Transcription & Segmentation Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/ashish.jpeg',
    fallback: '/assets/face_restoration.png',
    bio: 'Works on audio transcription and segmentation tasks, focusing on speaker identification, accurate timing, and maintaining quality.',
    skills: ['Audio Transcription', 'Segmentation', 'Speaker Tagging', 'Quality Focus'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '9',
    name: 'Siddharth Khuntia',
    role: 'Data Annotator',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/Siddharth.jpg',
    fallback: '/assets/hero_enhanced.png',
    bio: 'Works on data annotation and transcription tasks, contributing to daily production targets and maintaining workflow efficiency.',
    skills: ['Annotation', 'Transcription', 'Productivity', 'Team Work'],
    badge: 'Annotator',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '10',
    name: 'Bikash Bisoyi',
    role: 'Audio Transcription Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/bikash.jpeg',
    fallback: '/assets/executive.png',
    bio: 'Works on complex audio transcription tasks, focusing on multi-speaker audio and maintaining transcription quality standards.',
    skills: ['Audio Transcription', 'Multi-speaker', 'Accuracy', 'Formatting'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '11',
    name: 'Sankar Prasad Acharya',
    role: 'Data Processing Specialist',
    image: 'https://www.quantumcoderstechlab.codes/assets/images/Team%20Member/Sankar.jpeg',
    fallback: '/assets/face_restoration.png',
    bio: 'Handles file processing, formatting, and data preparation tasks to support project workflows and production targets.',
    skills: ['Data Processing', 'Formatting', 'File Management', 'Productivity'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
  {
    id: '12',
    name: 'Amit Ranjan Sahu',
    role: 'Data Processing & Annotation',
    image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/Amit.jpeg',
    fallback: '/assets/hero_enhanced.png',
    bio: 'Supports annotation and data processing tasks, ensuring proper formatting and timely completion of assigned work.',
    skills: ['Data Processing', 'Annotation', 'Formatting', 'Team Work'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
];

const LOCAL_STORAGE_KEY = 'zenemoo_team_members_v1';

export const getStoredTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const res = await teamApi.getAll();
    if (res.data && res.data.data && res.data.data.length > 0) {
      return res.data.data as TeamMember[];
    }
  } catch (err) {
    console.warn('Backend API offline, using local storage fallback');
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_TEAM_MEMBERS));
  return INITIAL_TEAM_MEMBERS;
};

export const saveTeamMembers = async (members: TeamMember[]): Promise<void> => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(members));
};
