import React from 'react';
import { Users, Github, Linkedin, Mail, Star, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Team: React.FC = () => {
  const members = [
    {
      name: 'Prem Prasad Pradhan',
      role: 'Founder & Vendor Manager',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/Prem_Prasad_Pradhan.png',
      fallback: '/assets/executive.png',
      bio: 'Leads team operations, project execution, and multi-stage quality control for data and AI projects. Vendor manager for DesiCrew Solutions.',
      skills: ['Project Management', 'Team Leadership', 'Quality Control', 'DesiCrew Vendor'],
      badge: 'Founder',
      links: {
        email: 'mailto:mr.prem2006@gmail.com',
        linkedin: 'https://www.linkedin.com/in/prem-prasad-pradhan-18472b295/',
        github: 'https://github.com/MRPREM31',
      },
    },
    {
      name: 'Chandan Biswal',
      role: 'Data Annotator & Transcription Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/chandan.jpeg',
      fallback: '/assets/face_restoration.png',
      bio: 'Works on transcription, data annotation, and file processing tasks. Contributes to daily production targets while maintaining quality and accuracy standards.',
      skills: ['Transcription', 'Data Annotation', 'Quality Focus', 'Productivity'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Madhushmita Das',
      role: 'Senior Annotator & QC Support',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/madhusmita.jpeg',
      fallback: '/assets/hero_enhanced.png',
      bio: 'Supports transcription and data annotation projects with a focus on accuracy and consistency. Assists the quality review team.',
      skills: ['Annotation', 'QC Support', 'Hindi/English', 'Accuracy'],
      badge: 'Senior Annotator',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Subhasish Sahu',
      role: 'Transcription Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/subhasish.jpeg',
      fallback: '/assets/executive.png',
      bio: 'Works on transcription projects with focus on accuracy, formatting, and maintaining project quality standards.',
      skills: ['Transcription', 'Formatting', 'Accuracy', 'Productivity'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Samir Kumar Dash',
      role: 'Data Annotation & Transcription Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/images/Team%20Member/SamirKumarDash.jpg',
      fallback: '/assets/face_restoration.png',
      bio: 'Works on data annotation, transcription, and file processing tasks. Contributes to project workflows by maintaining accuracy.',
      skills: ['Data Annotation', 'Transcription', 'Formatting', 'Quality Focus'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Sridhar Patro',
      role: 'Segmentation & Transcription Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/sridhar.jpeg',
      fallback: '/assets/hero_enhanced.png',
      bio: 'Works on audio segmentation and transcription tasks, ensuring proper speaker segmentation, timing accuracy, and quality standards.',
      skills: ['Segmentation', 'Transcription', 'Timing Accuracy', 'Quality Focus'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Satya Narayan Padhi',
      role: 'Transcription & Data Processing Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/satya.jpeg',
      fallback: '/assets/executive.png',
      bio: 'Handles transcription and data processing tasks, ensuring proper formatting, accuracy, and timely completion of project files.',
      skills: ['Transcription', 'Data Processing', 'Formatting', 'Productivity'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Ashis Gouda',
      role: 'Audio Transcription & Segmentation Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/ashish.jpeg',
      fallback: '/assets/face_restoration.png',
      bio: 'Works on audio transcription and segmentation tasks, focusing on speaker identification, accurate timing, and maintaining quality.',
      skills: ['Audio Transcription', 'Segmentation', 'Speaker Tagging', 'Quality Focus'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Siddharth Khuntia',
      role: 'Data Annotator',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/Siddharth.jpg',
      fallback: '/assets/hero_enhanced.png',
      bio: 'Works on data annotation and transcription tasks, contributing to daily production targets and maintaining workflow efficiency.',
      skills: ['Annotation', 'Transcription', 'Productivity', 'Team Work'],
      badge: 'Annotator',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Bikash Bisoyi',
      role: 'Audio Transcription Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/bikash.jpeg',
      fallback: '/assets/executive.png',
      bio: 'Works on complex audio transcription tasks, focusing on multi-speaker audio and maintaining transcription quality standards.',
      skills: ['Audio Transcription', 'Multi-speaker', 'Accuracy', 'Formatting'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Sankar Prasad Acharya',
      role: 'Data Processing Specialist',
      image: 'https://www.quantumcoderstechlab.codes/assets/images/Team%20Member/Sankar.jpeg',
      fallback: '/assets/face_restoration.png',
      bio: 'Handles file processing, formatting, and data preparation tasks to support project workflows and production targets.',
      skills: ['Data Processing', 'Formatting', 'File Management', 'Productivity'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
    {
      name: 'Amit Ranjan Sahu',
      role: 'Data Processing & Annotation',
      image: 'https://www.quantumcoderstechlab.codes/assets/Data%20Solutions/Team_Member/Amit.jpeg',
      fallback: '/assets/hero_enhanced.png',
      bio: 'Supports annotation and data processing tasks, ensuring proper formatting and timely completion of assigned work.',
      skills: ['Data Processing', 'Annotation', 'Formatting', 'Team Work'],
      badge: 'Specialist',
      links: { email: 'mailto:quantumcoderstechlab@gmail.com' },
    },
  ];

  return (
    <section id="team" className="py-24 relative z-10 bg-noise">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <Users className="w-3.5 h-3.5" />
            THE ZENEMO TECH TEAM
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Meet Our Data Solutions Team
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Our specialized team of transcribers, annotators, and quality control leads delivering enterprise accuracy for DesiCrew Solutions and AI tech companies.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((member, idx) => (
            <div
              key={idx}
              className="glass-panel glass-panel-interactive rounded-3xl p-6 border border-white/10 relative group overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Profile Image */}
                <div className="relative h-48 rounded-2xl overflow-hidden mb-4 border border-white/10 group-hover:border-cyan-500/40 transition-colors bg-slate-900">
                  <img
                    src={member.image}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = member.fallback;
                    }}
                    alt={member.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090b12] via-transparent to-transparent opacity-70"></div>
                  <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                    {member.badge === 'Founder' && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    {member.badge}
                  </span>
                </div>

                {/* Name & Role */}
                <h3 className="text-lg font-bold font-display text-white mb-0.5 group-hover:text-cyan-300 transition-colors">
                  {member.name}
                </h3>
                <div className="text-xs font-mono text-purple-400 font-semibold mb-3 leading-snug">{member.role}</div>

                {/* Bio */}
                <p className="text-xs text-slate-400 leading-relaxed font-normal mb-4">
                  {member.bio}
                </p>

                {/* Skills Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {member.skills.map((sk, sIdx) => (
                    <span key={sIdx} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] font-mono text-slate-300">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">Zenemo Tech Specialist</span>
                <div className="flex items-center gap-2">
                  {member.links.email && (
                    <a
                      href={member.links.email}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all"
                      title="Email Member"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.links.linkedin && (
                    <a
                      href={member.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 border border-white/10 transition-all"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.links.github && (
                    <a
                      href={member.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border border-white/10 transition-all"
                      title="GitHub"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
