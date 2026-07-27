import { supabaseService } from '../services/supabaseService.js';

const INITIAL_TEAM = [
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
    bio: 'Works on transcription, data annotation, and file processing tasks. Contributes to daily production targets while maintaining quality standards.',
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
    bio: 'Supports transcription and data annotation projects with a focus on accuracy and consistency.',
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
    bio: 'Works on data annotation, transcription, and file processing tasks.',
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
    bio: 'Works on audio segmentation and transcription tasks.',
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
    bio: 'Handles transcription and data processing tasks.',
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
    bio: 'Works on audio transcription and segmentation tasks.',
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
    bio: 'Works on data annotation and transcription tasks.',
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
    bio: 'Works on complex audio transcription tasks.',
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
    bio: 'Handles file processing, formatting, and data preparation tasks.',
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
    bio: 'Supports annotation and data processing tasks.',
    skills: ['Data Processing', 'Annotation', 'Formatting', 'Team Work'],
    badge: 'Specialist',
    email: 'quantumcoderstechlab@gmail.com',
  },
];

let memoryTeam = [...INITIAL_TEAM];

export const getTeam = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('team');
    if (data && data.length > 0) {
      return res.json({ success: true, count: data.length, data });
    }
    return res.json({ success: true, count: memoryTeam.length, data: memoryTeam });
  } catch (err) {
    return res.json({ success: true, count: memoryTeam.length, data: memoryTeam });
  }
};

export const createTeamMember = async (req, res, next) => {
  try {
    const newMember = { id: Date.now().toString(), ...req.body };
    try {
      const created = await supabaseService.insert('team', newMember);
      if (created) return res.status(201).json({ success: true, data: created });
    } catch (e) {}

    memoryTeam.unshift(newMember);
    res.status(201).json({ success: true, data: newMember });
  } catch (err) {
    next(err);
  }
};

export const updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body };

    try {
      const updated = await supabaseService.update('team', id, updatedData);
      if (updated) return res.json({ success: true, data: updated });
    } catch (e) {}

    memoryTeam = memoryTeam.map((m) => (m.id === id ? { ...m, ...updatedData } : m));
    res.json({ success: true, data: { id, ...updatedData } });
  } catch (err) {
    next(err);
  }
};

export const deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('team', id);
    } catch (e) {}

    memoryTeam = memoryTeam.filter((m) => m.id !== id);
    res.json({ success: true, message: 'Team member deleted' });
  } catch (err) {
    next(err);
  }
};
