import React, { useState, useEffect } from 'react';
import { Users, Github, Linkedin, Mail, Star } from 'lucide-react';
import { TeamMember, INITIAL_TEAM_MEMBERS, getStoredTeamMembers } from '../lib/teamStore';

export const Team: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);

  useEffect(() => {
    const loadTeam = async () => {
      const data = await getStoredTeamMembers();
      setMembers(data);
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
                    src={member.image || member.fallback || '/assets/executive.png'}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = member.fallback || '/assets/executive.png';
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
                  {member.skills?.map((sk, sIdx) => (
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
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all"
                      title="Email Member"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 border border-white/10 transition-all"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.github && (
                    <a
                      href={member.github}
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
