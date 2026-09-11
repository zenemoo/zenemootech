import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Calendar,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';
import { useTalentHubAuth, ApplicationItem } from './TalentHubAuthContext';

interface TalentHubApplicationsProps {
  onNavigateOpportunities?: () => void;
}

export const TalentHubApplications: React.FC<TalentHubApplicationsProps> = ({
  onNavigateOpportunities,
}) => {
  const { applications, isDataLoading } = useTalentHubAuth();
  const [selectedApplication, setSelectedApplication] = useState<ApplicationItem | null>(null);

  // Keyboard accessibility: Close modal on Escape
  useEffect(() => {
    if (!selectedApplication) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedApplication(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedApplication]);

  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
        return {
          label: 'Accepted',
          badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          icon: CheckCircle2,
          description: 'Your application has been accepted for this program.',
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted',
          badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
          icon: Sparkles,
          description: 'Your application has been shortlisted for onboarding.',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          icon: XCircle,
          description: 'Your application was not selected for this opportunity.',
        };
      case 'pending':
      default:
        return {
          label: 'Pending Review',
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          icon: Clock,
          description: 'Your application is currently under evaluation.',
        };
    }
  };

  /**
   * Helper to format submitted answer values cleanly.
   * Converts arrays into chip tags rather than raw JSON strings.
   */
  const renderFormattedAnswer = (ans: any) => {
    if (ans === null || ans === undefined || ans === '') {
      return <span className="text-slate-500 italic">Not provided</span>;
    }

    if (Array.isArray(ans)) {
      if (ans.length === 0) return <span className="text-slate-500 italic">None</span>;
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {ans.map((item, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono text-cyan-200"
            >
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </span>
          ))}
        </div>
      );
    }

    if (typeof ans === 'object') {
      return (
        <div className="space-y-1 mt-1 font-mono text-xs">
          {Object.entries(ans).map(([k, v]) => (
            <div key={k} className="text-slate-300">
              <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
              <span className="text-white">{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (typeof ans === 'boolean') {
      return <span className="font-semibold text-white">{ans ? 'Yes' : 'No'}</span>;
    }

    return <span className="text-slate-200 whitespace-pre-wrap leading-relaxed">{String(ans)}</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0 overflow-hidden">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Contributor Applications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            My Applications
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your submissions, real-time review statuses, and verified records.
          </p>
        </div>

        {applications.length > 0 && (
          <div className="text-xs font-mono text-slate-400">
            Total Submissions: <span className="text-white font-bold">{applications.length}</span>
          </div>
        )}
      </div>

      {/* ── Applications Content ── */}
      {isDataLoading && applications.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
          <p className="text-sm font-mono">Loading your applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="py-16 text-center bg-[#080d19]/90 border border-white/10 rounded-3xl p-8 max-w-lg mx-auto shadow-xl">
          <FileCheck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white font-display">No applications yet</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            You have not applied to any opportunities yet. Browse our active programs and apply to start contributing.
          </p>
          {onNavigateOpportunities && (
            <button
              onClick={onNavigateOpportunities}
              className="mt-5 inline-flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <span>Explore Opportunities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const statusConfig = getStatusBadge(app.status);
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={app.id}
                whileHover={{ y: -2 }}
                className="p-5 sm:p-6 rounded-3xl bg-[#080d19]/90 border border-white/10 hover:border-cyan-500/30 shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {app.applicant_id || app.id?.substring(0, 8)}
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Applied: {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-display">
                    {app.opportunity_title || 'Opportunity Program'}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold uppercase tracking-wider ${statusConfig.badgeClass}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    <span className="hidden sm:inline text-slate-600">&bull;</span>
                    <span className="hidden sm:inline text-slate-400">{statusConfig.description}</span>
                  </div>
                </div>

                {/* Right Action */}
                <div className="shrink-0 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedApplication(app)}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-mono font-semibold text-slate-200 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Application</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Redesigned Application Detail Modal ── */}
      <AnimatePresence>
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedApplication(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-[#080d19]/98 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10 my-6 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#080d19]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex items-center justify-between z-20">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    Application Record
                  </span>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    ID: <span className="text-white font-bold">{selectedApplication.applicant_id || selectedApplication.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                {/* Status Callout Banner */}
                {(() => {
                  const statusConfig = getStatusBadge(selectedApplication.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-lg ${statusConfig.badgeClass}`}>
                      <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-mono font-bold uppercase tracking-wider text-xs block">
                          Current Status: {statusConfig.label}
                        </span>
                        <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{statusConfig.description}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Opportunity Info */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Opportunity</span>
                  <h3 className="text-base font-bold text-white font-display">{selectedApplication.opportunity_title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px] font-mono pt-1">
                    <span>Applied: {new Date(selectedApplication.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Applicant Identity (Read-Only) */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                    Applicant Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block">Name</span>
                      <span className="font-semibold text-slate-200">{selectedApplication.applicant_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block">Email</span>
                      <span className="font-mono text-cyan-400">{selectedApplication.applicant_email}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-mono text-slate-500 block">Contact Phone</span>
                      <span className="font-mono text-slate-200">{selectedApplication.applicant_phone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Submitted Answers - Formatted cleanly with Chips/Tags */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                    Submitted Responses
                  </span>
                  {selectedApplication.answers && Object.keys(selectedApplication.answers).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(selectedApplication.answers).map(([q, ans], i) => (
                        <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                          <p className="text-[11px] font-mono font-bold text-slate-400">{q}</p>
                          <div className="text-xs">{renderFormattedAnswer(ans)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No additional questions submitted with this application.</p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-[#080d19]/95 backdrop-blur-md p-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">Read-Only Candidate Record</span>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono font-bold text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
