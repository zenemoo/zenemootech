import React, { useState, useEffect } from 'react';
import { Users, Search, Star, UserCheck, ArrowLeft, ShieldCheck, Mail, Sparkles, Filter, ArrowRight } from 'lucide-react';
import { TeamMember, getStoredTeamMembers, getSlugFromName } from '../lib/teamStore';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { TeamDirectorySkeleton } from './SkeletonComponents';

interface TeamDirectoryPageProps {
  onBack: () => void;
  onOpenAiDrawer?: () => void;
}

export const TeamDirectoryPage: React.FC<TeamDirectoryPageProps> = ({ onBack, onOpenAiDrawer }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadTeam = async () => {
      try {
        const data = await getStoredTeamMembers();
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

  const handleMemberClick = (member: TeamMember) => {
    const slug = member.slug || getSlugFromName(member.name);
    window.history.pushState(null, '', `/team/${slug}`);
    window.dispatchEvent(new Event('popstate'));
  };

  const roleCategories = ['All', 'Leadership', 'AI Trainer', 'Linguist', 'Annotation', 'Operations'];

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.role || member.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.skills && member.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));

    if (selectedRoleFilter === 'All') return matchesSearch;
    const memberRole = member.role || member.designation || '';
    return matchesSearch && ((member.badge?.toLowerCase().includes(selectedRoleFilter.toLowerCase()) || false) || memberRole.toLowerCase().includes(selectedRoleFilter.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      <Navbar showBackButton onBack={onBack} onOpenAiDrawer={onOpenAiDrawer} />

      <main className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            <Users className="w-3.5 h-3.5" />
            <span>ZENEMOO ENTERPRISE DIRECTORY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-white">
            Zenemoo Specialist Roster
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Verified team roster of AI data collection specialists, audio annotators, and multilingual linguists driving enterprise accuracy.
          </p>
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 mb-12 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, role, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {roleCategories.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                  selectedRoleFilter === role
                    ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TeamDirectorySkeleton count={12} />
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
                onClick={() => handleMemberClick(member)}
                className="glass-panel glass-panel-interactive rounded-3xl p-6 border border-white/10 relative group overflow-hidden flex flex-col justify-between cursor-pointer hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300"
              >
                <div>
                  <div className="relative h-52 rounded-2xl overflow-hidden mb-4 border border-white/10 group-hover:border-cyan-500/40 transition-colors bg-slate-900">
                    <ImageWithSkeleton
                      src={member.image_url || member.image || member.fallback || '/assets/executive.png'}
                      fallbackSrc={member.fallback || '/assets/executive.png'}
                      fallbackType="avatar"
                      alt={member.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      containerClassName="w-full h-full"
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
                    <h3 className="text-lg font-bold font-display text-white mb-0.5 group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                      <span>{member.name}</span>
                      <ArrowRight className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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
                    <span className="text-[10px] text-cyan-400/80 group-hover:text-cyan-300 font-bold">View Staff Profile →</span>
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        onClick={(e) => e.stopPropagation()}
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
      </main>

      {/* Mega Footer */}
      <Footer />
    </div>
  );
};

