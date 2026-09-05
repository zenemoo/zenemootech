import React, { useState, useEffect } from 'react';
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
import { talentHubApi } from '../../services/talentHubApi';

interface TalentHubDashboardProps {
  onNavigate: (tab: 'dashboard' | 'profile' | 'opportunities' | 'applications') => void;
}

export const TalentHubDashboard: React.FC<TalentHubDashboardProps> = ({ onNavigate }) => {
  const { user, talentProfile, token } = useTalentHubAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const firstName = talentProfile?.full_name
    ? talentProfile.full_name.trim().split(' ')[0]
    : user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'Talent';

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      if (!token) return;
      setLoadingData(true);
      try {
        const [appsRes, oppsRes] = await Promise.all([
          talentHubApi.getApplications(token),
          talentHubApi.getOpportunities(token),
        ]);

        if (isMounted) {
          if (appsRes?.success) {
            setApplications(appsRes.data || []);
          }
          if (oppsRes?.success) {
            setOpportunities(oppsRes.data || []);
          }
        }
      } catch (err: any) {
        console.error('[TalentHub Dashboard Data Load Error]:', err.message);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Real statistics calculated strictly from loaded applications data
  const totalApplications = applications.length;
  const pendingCount = applications.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  const shortlistedCount = applications.filter((a) => (a.status || '').toLowerCase() === 'shortlisted').length;
  const acceptedCount = applications.filter((a) => (a.status || '').toLowerCase() === 'accepted').length;

  const activeOpportunitiesCount = opportunities.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Welcome Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0c0c10] border border-cyan-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Zenemoo Contributor Network
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Welcome, {firstName}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 font-normal">
              Your Zenemoo Talent Hub — Manage your profile, discover active programs, and track submissions.
            </p>
          </div>

          {talentProfile?.registration_code && (
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Registration Code</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-sm font-bold text-cyan-300">{talentProfile.registration_code}</span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium capitalize">
                Status: {talentProfile.status || 'Active'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Real Statistics Metric Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Applications</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : totalApplications}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Submitted submissions</p>
          </div>
        </div>

        {/* Pending Review */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-amber-300 font-mono">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : pendingCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Under evaluation</p>
          </div>
        </div>

        {/* Shortlisted */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Shortlisted</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-blue-300 font-mono">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : shortlistedCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Selected for next step</p>
          </div>
        </div>

        {/* Accepted */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Accepted</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-emerald-300 font-mono">
              {loadingData ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : acceptedCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Confirmed programs</p>
          </div>
        </div>
      </div>

      {/* ── 3 Major Quick Access Cards ── */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight mb-4">Talent Hub Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: My Profile */}
          <motion.div
            whileHover={{ y: -4 }}
            onClick={() => onNavigate('profile')}
            className="group cursor-pointer p-6 rounded-2xl bg-[#0c0c10] hover:bg-[#111116] border border-white/10 hover:border-cyan-500/40 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-all duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform duration-300">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                My Profile
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                View your registered information, verified languages, capabilities, and experience.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
              <span>View Profile</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 2: Opportunities */}
          <motion.div
            whileHover={{ y: -4 }}
            onClick={() => onNavigate('opportunities')}
            className="group cursor-pointer p-6 rounded-2xl bg-[#0c0c10] hover:bg-[#111116] border border-white/10 hover:border-blue-500/40 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform duration-300">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  Opportunities
                </h3>
                {activeOpportunitiesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                    {activeOpportunitiesCount} Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Explore available opportunities in multilingual AI annotation, speech, and data tasks.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <span>Explore Opportunities</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 3: My Applications */}
          <motion.div
            whileHover={{ y: -4 }}
            onClick={() => onNavigate('applications')}
            className="group cursor-pointer p-6 rounded-2xl bg-[#0c0c10] hover:bg-[#111116] border border-white/10 hover:border-emerald-500/40 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform duration-300">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                  My Applications
                </h3>
                {totalApplications > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                    {totalApplications} Total
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Track your applications and review real-time evaluation statuses.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span>Track Applications</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Recent Applications & Live Opportunities Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications Preview */}
        <div className="p-6 rounded-2xl bg-[#0c0c10] border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                Recent Applications
              </h3>
              <button
                onClick={() => onNavigate('applications')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingData ? (
              <div className="py-8 flex justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : applications.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-xl">
                <p className="text-xs text-slate-400">No applications submitted yet.</p>
                <button
                  onClick={() => onNavigate('opportunities')}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20"
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
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : status === 'shortlisted'
                      ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                      : status === 'rejected'
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                  return (
                    <div
                      key={app.id}
                      onClick={() => onNavigate('applications')}
                      className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="max-w-[70%] truncate">
                        <p className="text-xs font-semibold text-white truncate">{app.opportunity_title || 'Opportunity'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          ID: {app.applicant_id || app.id?.substring(0, 8)} &bull; {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
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
        <div className="p-6 rounded-2xl bg-[#0c0c10] border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                Active Opportunities
              </h3>
              <button
                onClick={() => onNavigate('opportunities')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingData ? (
              <div className="py-8 flex justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-xl">
                <p className="text-xs text-slate-400">No active opportunity listings at this moment.</p>
                <p className="text-[11px] text-slate-500 mt-1">Check back soon for new project postings.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {opportunities.slice(0, 3).map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => onNavigate('opportunities')}
                    className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="max-w-[70%] truncate">
                      <p className="text-xs font-semibold text-white truncate">{opp.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{opp.partner_name || 'Zenemoo AI'}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                      {opp.badge || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Help / Contact Support Banner ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Need to update your registered information or ask about an opportunity?</span>
        </div>
        <a
          href="mailto:info@zenemoo.in"
          className="shrink-0 text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 flex items-center gap-1"
        >
          <span>Contact Zenemoo Support</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
