import React, { useState, useEffect } from 'react';
import { Users, Star, Mail, Search, ArrowLeft, Sparkles, UserCheck } from 'lucide-react';
import { TeamMember, getStoredTeamMembers } from '../lib/teamStore';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';

interface TeamDirectoryPageProps {
  onBack: () => void;
}

export const TeamDirectoryPage: React.FC<TeamDirectoryPageProps> = ({ onBack }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const loadTeam = async () => {
      try {
        const data = await getStoredTeamMembers();
        // Filter active members and sort by position ASC
        const activeMembers = data
          .filter((m) => m.status !== 'inactive')
          .sort((a, b) => a.position - b.position);
        setMembers(activeMembers);
      } finally {
        setLoading(false);
      }
    };
    loadTeam();
  }, []);

  // Filtered members by search query and category
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.designation || m.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.bio || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.skills || []).some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept =
      selectedDepartment === 'All'
        ? true
        : (m.department || m.category || '').toLowerCase() === selectedDepartment.toLowerCase();

    return matchesSearch && matchesDept;
  });

  return (
    <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300 font-sans">
      {/* Interactive Mouse Spotlight */}
      <CursorSpotlight />

      {/* 3D WebGL Neural Background Canvas */}
      <ThreeNeuralBackground />

      {/* Top Navbar */}
      <Navbar />

      <main className="relative z-10 pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Top Bar: Back to Home & Breadcrumb */}
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 text-xs font-mono transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
              Return to Zenemoo Home
            </button>

            <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Live URL Route: <code className="text-white bg-white/10 px-2 py-0.5 rounded">/#team-directory</code>
            </div>
          </div>

          {/* Hero Header for Team Directory Page */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              ZENEMOO DATA SOLUTIONS DIRECTORY
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display text-white tracking-tight">
              Full Data &amp; AI Team Directory
            </h1>

            <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
              Explore our complete roster of specialized transcribers, annotators, and quality control leads delivering enterprise accuracy for global AI partners.
            </p>
          </div>

          {/* Filter Bar: Live Search & Category Chips */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-black/40">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search team members by name, designation, skill or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
              {['All', 'Leadership', 'Engineering', 'Quality'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-4 py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    selectedDepartment.toLowerCase() === dept.toLowerCase()
                      ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Full Team Cards Grid */}
          {loading ? (
            <div className="py-24 text-center space-y-3 font-mono text-xs text-cyan-400">
              <span className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
              <div>Loading Full Zenemoo Team Directory...</div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="glass-panel p-16 text-center rounded-3xl border border-white/10 max-w-md mx-auto space-y-3">
              <UserCheck className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold font-display text-white">No Team Members Found</h3>
              <p className="text-xs font-mono text-slate-400">
                No team members match your current search query or filter selection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="glass-panel glass-panel-interactive rounded-3xl p-6 border border-white/10 relative group overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Profile Image */}
                    <div className="relative h-52 rounded-2xl overflow-hidden mb-4 border border-white/10 group-hover:border-cyan-500/40 transition-colors bg-slate-900">
                      <img
                        src={member.image_url || member.image || member.fallback || '/assets/executive.png'}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = member.fallback || '/assets/executive.png';
                        }}
                        alt={member.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090b12] via-transparent to-transparent opacity-70"></div>
                      <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                        {member.badge === 'Founder' && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        {member.badge || 'Specialist'}
                      </span>
                      {/* Position Number Pill */}
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 font-bold">
                        #{member.position}
                      </span>
                    </div>

                    {/* Name & Designation */}
                    <h3 className="text-lg font-bold font-display text-white mb-0.5 group-hover:text-cyan-300 transition-colors">
                      {member.name}
                    </h3>
                    <div className="text-xs font-mono text-purple-400 mb-3">{member.designation || member.role}</div>

                    {/* Bio */}
                    <p className="text-xs text-slate-400 mb-4 line-clamp-3 leading-relaxed font-sans">
                      {member.bio}
                    </p>

                    {/* Skills tags */}
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {member.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] font-mono text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer status */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-[10px]">{member.department || member.category || 'Specialist'}</span>
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all flex items-center justify-center group/mail"
                        title={`Send email to ${member.name} (${member.email})`}
                      >
                        <Mail className="w-4 h-4 text-cyan-400 group-hover/mail:scale-110 transition-transform" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Mega Footer */}
      <Footer />
    </div>
  );
};
