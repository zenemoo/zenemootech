import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Sparkles,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { OpportunityProgram, getStoredOpportunities } from '../lib/opportunityStore';

interface OpportunityCenterViewProps {
  userRole?: string;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export const OpportunityCenterView: React.FC<OpportunityCenterViewProps> = ({
  userRole = 'team_member',
  showToast,
}) => {
  const [opportunities, setOpportunities] = useState<OpportunityProgram[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'coming_soon'>('all');
  const [selectedOp, setSelectedOp] = useState<OpportunityProgram | null>(null);

  const fetchOpportunities = async () => {
    setIsLoading(true);
    try {
      const ops = await getStoredOpportunities();
      setOpportunities(ops);
    } catch (err) {
      if (showToast) showToast('Failed to load opportunities data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const filteredOps = opportunities.filter((op) => {
    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'active' && op.status === 'active') ||
      (selectedFilter === 'coming_soon' && op.status === 'coming_soon');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      op.title.toLowerCase().includes(q) ||
      op.partner_name.toLowerCase().includes(q) ||
      op.description.toLowerCase().includes(q) ||
      (op.badge && op.badge.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-10">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-cyan-950/40 via-[#080d19] to-purple-950/40 border border-cyan-500/30 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Briefcase className="w-32 h-32 text-cyan-400" />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ZENEMOO OPPORTUNITY CENTER</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explore Zenemoo Opportunities
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Discover active projects, talent contributor programs, remote tasks, and strategic partner collaborations.
          </p>

          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-slate-400">Total Listings:</span>
              <span className="text-cyan-300 font-bold">{opportunities.length}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active: {opportunities.filter((o) => o.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opportunities by title, category, or partner..."
            className="w-full bg-[#080d19]/90 border border-white/10 focus:border-cyan-400 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#080d19] border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('active')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedFilter === 'active'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Only
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('coming_soon')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedFilter === 'coming_soon'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* Loading Spinner */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3 font-mono">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading Opportunity Center listings...</p>
        </div>
      ) : filteredOps.length === 0 ? (
        <div className="rounded-3xl bg-[#080d19]/80 border border-white/10 p-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-display">No Opportunities Found</h3>
            <p className="text-xs text-slate-400">
              No opportunity program matches your search filter query.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 text-xs font-mono font-bold border border-white/10"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Opportunity Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredOps.map((op) => {
            const isActive = op.status === 'active';
            return (
              <div
                key={op.id}
                className="rounded-3xl bg-[#080d19]/90 border border-white/10 hover:border-cyan-500/40 p-6 flex flex-col justify-between space-y-5 transition-all shadow-xl hover:shadow-[0_12px_30px_rgba(6,182,212,0.15)] group"
              >
                <div className="space-y-4">
                  {/* Top Badge & Status Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {op.company_logo ? (
                        <img
                          src={op.company_logo}
                          alt={op.partner_name}
                          className="w-11 h-11 rounded-2xl object-cover border border-white/10 bg-black/40 p-1"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-display font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                          {op.title}
                        </h4>
                        <p className="text-xs font-mono text-cyan-400">{op.partner_name}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Clock className="w-3 h-3 text-purple-400" />
                      )}
                      <span>{isActive ? 'Active' : 'Coming Soon'}</span>
                    </span>
                  </div>

                  {/* Badge & Tags */}
                  {op.badge && (
                    <div className="inline-block px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-mono font-medium">
                      {op.badge}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {op.description}
                  </p>

                  {/* Features List */}
                  {op.features && op.features.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-mono text-slate-400 font-bold block">
                        Program Highlights:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {op.features.slice(0, 3).map((f, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] text-slate-300"
                          >
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Working Hours & Duration info */}
                  {(op.working_hours || op.project_duration || op.work_mode) && (
                    <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                      {op.work_mode && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="capitalize">{op.work_mode}</span>
                        </div>
                      )}
                      {op.working_hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>{op.working_hours}</span>
                        </div>
                      )}
                      {op.project_duration && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{op.project_duration}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Row */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOp(op)}
                    className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Full Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {op.action_url && (
                    <a
                      href={op.action_url.startsWith('http') ? op.action_url : `https://www.zenemoo.in/opportunities`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Apply Now</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Opportunity Modal */}
      {selectedOp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#080d19] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                {selectedOp.company_logo ? (
                  <img
                    src={selectedOp.company_logo}
                    alt={selectedOp.partner_name}
                    className="w-12 h-12 rounded-2xl object-cover border border-white/10 bg-black/40 p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-display font-bold text-lg text-white">{selectedOp.title}</h3>
                  <p className="text-xs font-mono text-cyan-400">{selectedOp.partner_name}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOp(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              <div>
                <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-1">
                  About Opportunity
                </h5>
                <p>{selectedOp.description}</p>
              </div>

              {selectedOp.about_project && (
                <div>
                  <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-1">
                    About Project
                  </h5>
                  <p>{selectedOp.about_project}</p>
                </div>
              )}

              {selectedOp.requirements && selectedOp.requirements.length > 0 && (
                <div>
                  <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Requirements
                  </h5>
                  <ul className="space-y-1 pl-4 list-disc text-slate-300">
                    {selectedOp.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedOp.features && selectedOp.features.length > 0 && (
                <div>
                  <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Features & Perks
                  </h5>
                  <ul className="space-y-1 pl-4 list-disc text-slate-300">
                    {selectedOp.features.map((feat, i) => (
                      <li key={i}>{feat}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedOp(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs font-bold"
              >
                Close
              </button>
              {selectedOp.action_url && (
                <a
                  href={selectedOp.action_url.startsWith('http') ? selectedOp.action_url : `https://www.zenemoo.in/opportunities`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold font-mono text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityCenterView;
