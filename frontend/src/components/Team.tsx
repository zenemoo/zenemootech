import React, { useState, useEffect } from 'react';
import { Users, Star, UserCheck, Mail } from 'lucide-react';
import { TeamMember, getStoredTeamMembers } from '../lib/teamStore';

export const Team: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const data = await getStoredTeamMembers();
        // Filter only active status members for public website and sort by position ASC
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

  return (
    <section id="team" className="py-24 relative z-10 bg-noise">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
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
        )}
      </div>
    </section>
  );
};
