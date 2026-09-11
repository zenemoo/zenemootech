import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Briefcase,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';

interface TalentHubDashboardProps {
  onNavigate: (tab: 'dashboard' | 'profile' | 'opportunities' | 'applications') => void;
}

export const TalentHubDashboard: React.FC<TalentHubDashboardProps> = ({ onNavigate }) => {
  const {
    user,
    talentProfile,
    applications,
    opportunities,
    isDataLoading,
    totalApplications,
    pendingCount,
    shortlistedCount,
    acceptedCount,
    activeOpportunitiesCount,
  } = useTalentHubAuth();

  const firstName = talentProfile?.full_name
    ? talentProfile.full_name.trim().split(' ')[0]
    : user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'Contributor';

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* ── App Welcome Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#080d19] via-[#0f172a]/60 to-[#080d19] border border-cyan-500/20 p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider mb-2 sm:mb-3 shadow-sm">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
              <span>Zenemoo Contributor Network</span>
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-display">
              Hello, {firstName} 👋
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 font-normal max-w-2xl leading-relaxed">
              Welcome back to your Zenemoo Talent Hub. Manage your contributor profile, discover new opportunities, and track your applications — all in one place.
            </p>
          </div>

          {talentProfile?.registration_code && (
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg">
                <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Registration Code</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-sm font-bold text-cyan-300">{talentProfile.registration_code}</span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-semibold capitalize flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Status: {talentProfile.status || 'Active'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Real Statistics Metric Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Applications */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400">Total Applications</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {isDataLoading && totalApplications === 0 ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              ) : (
                totalApplications
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Submitted records</p>
          </div>
        </div>

        {/* Pending Review */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-amber-300 font-mono">
              {isDataLoading && totalApplications === 0 ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              ) : (
                pendingCount
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Under evaluation</p>
          </div>
        </div>

        {/* Shortlisted */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400">Shortlisted</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-blue-300 font-mono">
              {isDataLoading && totalApplications === 0 ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              ) : (
                shortlistedCount
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Selected for next step</p>
          </div>
        </div>

        {/* Accepted */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400">Accepted</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-emerald-300 font-mono">
              {isDataLoading && totalApplications === 0 ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              ) : (
                acceptedCount
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Confirmed programs</p>
          </div>
        </div>
      </div>

      {/* ── 3 Major Quick Access Cards ── */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight font-display mb-4">Talent Hub Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: My Profile */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => onNavigate('profile')}
            className="group cursor-pointer p-6 rounded-2xl bg-[#080d19]/90 hover:bg-[#0c1426] border border-white/10 hover:border-cyan-500/40 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-all duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform duration-300">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                My Profile
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                View your registered profile, verified languages, capabilities, and past experience records.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 group-hover:text-cyan-300">
              <span>View Profile</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 2: Opportunities */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => onNavigate('opportunities')}
            className="group cursor-pointer p-6 rounded-2xl bg-[#080d19]/90 hover:bg-[#0c1426] border border-white/10 hover:border-blue-500/40 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform duration-300">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                  Opportunities
                </h3>
                {activeOpportunitiesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[10px] font-mono font-semibold border border-blue-500/30">
                    {activeOpportunitiesCount} Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Explore available opportunities in multilingual AI annotation, speech collection, and dataset curation.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400 group-hover:text-blue-300">
              <span>Explore Opportunities</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 3: My Applications */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => onNavigate('applications')}
            className="group cursor-pointer p-6 rounded-2xl bg-[#080d19]/90 hover:bg-[#0c1426] border border-white/10 hover:border-emerald-500/40 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform duration-300">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  My Applications
                </h3>
                {totalApplications > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono font-semibold border border-emerald-500/30">
                    {totalApplications} Total
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Track your applications and review real-time review statuses and submission responses.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
              <span>Track Applications</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Recent Applications & Live Opportunities Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications Preview */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Recent Applications</span>
              </h3>
              <button
                onClick={() => onNavigate('applications')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono font-medium cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isDataLoading && applications.length === 0 ? (
              <div className="py-8 flex justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              </div>
            ) : applications.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-xl">
                <p className="text-xs text-slate-400">No applications submitted yet.</p>
                <button
                  onClick={() => onNavigate('opportunities')}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-mono font-medium hover:bg-cyan-500/20"
                >
                  Browse Available Opportunities
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {applications.slice(0, 3).map((app) => {
                  const status = (app.status || 'pending').toLowerCase();
                  const statusColor =
                    status === 'accepted'
                      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                      : status === 'shortlisted'
                      ? 'text-blue-300 bg-blue-500/10 border-blue-500/30'
                      : status === 'rejected'
                      ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                      : 'text-amber-300 bg-amber-500/10 border-amber-500/30';

                  return (
                    <div
                      key={app.id}
                      onClick={() => onNavigate('applications')}
                      className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-cyan-500/20 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="max-w-[70%] truncate">
                        <p className="text-xs font-semibold text-white truncate">{app.opportunity_title || 'Opportunity'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          ID: {app.applicant_id || app.id?.substring(0, 8)} &bull; {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Featured Opportunities Preview */}
        <div className="p-6 rounded-2xl bg-[#080d19]/90 border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span>Featured Programs</span>
              </h3>
              <button
                onClick={() => onNavigate('opportunities')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono font-medium cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isDataLoading && opportunities.length === 0 ? (
              <div className="py-8 flex justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-xl">
                <p className="text-xs text-slate-400">No active opportunity listings at this moment.</p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">Check back soon for new postings.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {opportunities.slice(0, 3).map((opp) => {
                  const s = (opp.status || 'active').toLowerCase();
                  const isClosed = s === 'closed';
                  const isComingSoon = s === 'coming_soon';

                  return (
                    <div
                      key={opp.id}
                      onClick={() => onNavigate('opportunities')}
                      className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-blue-500/20 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="max-w-[70%] truncate">
                        <p className="text-xs font-semibold text-white truncate">{opp.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{opp.partner_name || 'Zenemoo AI'}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isClosed
                            ? 'text-slate-400 bg-slate-800/40 border-slate-700/50'
                            : isComingSoon
                            ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                            : 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30'
                        }`}
                      >
                        {isClosed ? 'Closed' : isComingSoon ? 'Coming Soon' : opp.badge || 'Active'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Support & Help Contact Banner ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Need to update your registered information or ask about an opportunity?</span>
        </div>
        <a
          href="mailto:info@zenemoo.in"
          className="shrink-0 text-cyan-400 hover:text-cyan-300 font-mono font-bold underline underline-offset-2 flex items-center gap-1"
        >
          <span>Contact Zenemoo Support</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
