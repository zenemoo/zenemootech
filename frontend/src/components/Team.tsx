import React, { useState, useEffect } from 'react';
import { Users, Star, UserCheck, Mail, Search, X, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { TeamMember, getStoredTeamMembers } from '../lib/teamStore';

export const Team: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullModal, setShowFullModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
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

  // Display Limit: 6 for mobile/small devices, 8 for desktop/large screens
  const displayLimit = isMobile ? 6 : 8;
  const initialMembers = members.slice(0, displayLimit);

  // Filtered members inside the Full Directory Modal
  const modalMembers = members.filter((m) => {
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
    <section id="team" className="py-24 relative z-10 bg-noise">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <Users className="w-3.5 h-3.5" />
            THE ZENEMOO TECH TEAM
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Meet Our Data Solutions Team
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Our specialized team of transcribers, annotators, and quality control leads delivering enterprise accuracy for DesiCrew Solutions and AI tech companies.
          </p>
        </div>

        {/* Dynamic Team Grid */}
        {loading ? (
          <div className="py-16 text-center space-y-3 font-mono text-xs text-cyan-400">
            <span className="inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
            <div>Loading Zenemoo Team Directory...</div>
          </div>
        ) : members.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 max-w-md mx-auto space-y-3">
            <UserCheck className="w-10 h-10 text-cyan-400 mx-auto" />
            <h3 className="text-lg font-bold font-display text-white">Team Directory Updating</h3>
            <p className="text-xs font-mono text-slate-400">
              Team members added in the Admin Control Center will appear here live.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Initial Grid: 4-6 on mobile, 8 on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {initialMembers.map((member) => (
                <div
                  key={member.id}
                  className="glass-panel glass-panel-interactive rounded-3xl p-6 border border-white/10 relative group overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Profile Image */}
                    <div className="relative h-48 rounded-2xl overflow-hidden mb-4 border border-white/10 group-hover:border-cyan-500/40 transition-colors bg-slate-900">
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

            {/* View All Team Members Action Button */}
            {members.length > 0 && (
              <div className="text-center pt-6">
                <button
                  onClick={() => setShowFullModal(true)}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold font-display text-sm tracking-wide transition-all shadow-xl shadow-cyan-500/20 hover:scale-105 cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
                  View All Team Members ({members.length})
                  <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL TEAM MEMBERS DIRECTORY MODAL */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl">
          <div className="glass-panel w-full max-w-6xl max-h-[92vh] rounded-3xl border border-white/20 flex flex-col overflow-hidden shadow-2xl bg-[#090a10]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[1px]">
                  <div className="w-full h-full bg-[#0a0b12] rounded-[15px] flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-white">Full Team Directory</h3>
                  <p className="text-xs font-mono text-cyan-400">
                    Displaying all {members.length} active data &amp; AI specialists
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFullModal(false)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-6 border-b border-white/10 bg-black/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, role, bio or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                />
              </div>

              {/* Department category chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
                {['All', 'Leadership', 'Engineering', 'Quality'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                      selectedDepartment === dept
                        ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body Grid */}
            <div className="p-6 overflow-y-auto flex-1 font-sans">
              {modalMembers.length === 0 ? (
                <div className="py-16 text-center space-y-3 font-mono text-xs text-slate-400">
                  <Users className="w-8 h-8 text-slate-500 mx-auto" />
                  <div>No team members match your search criteria.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {modalMembers.map((member) => (
                    <div
                      key={member.id}
                      className="glass-panel rounded-3xl p-6 border border-white/10 relative group overflow-hidden flex flex-col justify-between bg-black/40 hover:border-cyan-500/40 transition-all"
                    >
                      <div>
                        {/* Profile Image */}
                        <div className="relative h-48 rounded-2xl overflow-hidden mb-4 border border-white/10 group-hover:border-cyan-500/40 transition-colors bg-slate-900">
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
          </div>
        </div>
      )}
    </section>
  );
};
