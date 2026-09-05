import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Loader2,
  Calendar,
  Sparkles,
  User,
  Phone,
  Mail,
  X,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { talentHubApi } from '../../services/talentHubApi';

interface TalentHubApplicationsProps {
  onNavigateOpportunities?: () => void;
}

export const TalentHubApplications: React.FC<TalentHubApplicationsProps> = ({
  onNavigateOpportunities,
}) => {
  const { token } = useTalentHubAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadApplications = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await talentHubApi.getApplications(token);
        if (isMounted && res?.success) {
          setApplications(res.data || []);
        }
      } catch (err: any) {
        console.error('[TalentHub Load Applications Error]:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadApplications();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
        return {
          label: 'Accepted',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: CheckCircle2,
          description: 'Your application has been accepted.',
        };
      case 'shortlisted':
        return {
          label: 'Shortlisted',
          badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: Sparkles,
          description: 'Your application has been shortlisted.',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: XCircle,
          description: 'Your application was not selected for this opportunity.',
        };
      case 'pending':
      default:
        return {
          label: 'Pending',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: Clock,
          description: 'Your application is currently under review.',
        };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <FileCheck className="w-3.5 h-3.5" />
            Candidate Submissions
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Applications
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your submissions and status in real-time.
          </p>
        </div>

        {applications.length > 0 && (
          <div className="text-xs text-slate-400">
            Total Submissions: <span className="text-white font-bold font-mono">{applications.length}</span>
          </div>
        )}
      </div>

      {/* ── Applications Content ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
          <p className="text-sm">Loading your applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="py-16 text-center bg-[#0c0c10] border border-white/10 rounded-2xl p-8 max-w-lg mx-auto">
          <FileCheck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No applications yet</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            You haven&apos;t applied to any opportunities yet. Browse our active programs and apply to get started.
          </p>
          {onNavigateOpportunities && (
            <button
              onClick={onNavigateOpportunities}
              className="mt-5 inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20"
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
                className="p-5 sm:p-6 rounded-2xl bg-[#0c0c10] border border-white/10 hover:border-cyan-500/30 shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {app.applicant_id || app.id?.substring(0, 8)}
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Applied: {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {app.opportunity_title || 'Opportunity Program'}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${statusConfig.badgeClass}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    <span className="hidden sm:inline text-slate-600">&bull;</span>
                    <span className="hidden sm:inline text-slate-400">{statusConfig.description}</span>
                  </div>
                </div>

                {/* Right button */}
                <div className="shrink-0 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedApplication(app)}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white border border-white/10 transition-colors"
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

      {/* ── Modal: Application Details Modal ── */}
      <AnimatePresence>
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedApplication(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-[#0c0c10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0c0c10]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex items-center justify-between z-20">
                <div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Application Details
                  </span>
                  <p className="text-xs font-mono text-slate-400">
                    ID: {selectedApplication.applicant_id || selectedApplication.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                {/* Status Callout Banner */}
                {(() => {
                  const statusConfig = getStatusBadge(selectedApplication.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${statusConfig.badgeClass}`}>
                      <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wider text-xs block">
                          Current Status: {statusConfig.label}
                        </span>
                        <p className="text-xs mt-0.5 opacity-90">{statusConfig.description}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Opportunity Info */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Opportunity</span>
                  <h3 className="text-base font-bold text-white">{selectedApplication.opportunity_title}</h3>
                  <div className="flex items-center gap-4 text-slate-400 text-[11px] pt-1">
                    <span>Applied: {new Date(selectedApplication.created_at).toLocaleString()}</span>
                    {selectedApplication.updated_at && (
                      <span>Updated: {new Date(selectedApplication.updated_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Applicant Identity (Read-Only) */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Applicant Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Name</span>
                      <span className="font-medium text-slate-200">{selectedApplication.applicant_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Email</span>
                      <span className="font-medium text-cyan-400">{selectedApplication.applicant_email}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-500 block">Phone</span>
                      <span className="font-medium text-slate-200">{selectedApplication.applicant_phone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Submitted Answers */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Submitted Responses
                  </span>
                  {selectedApplication.answers && Object.keys(selectedApplication.answers).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(selectedApplication.answers).map(([q, ans], i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                          <p className="text-[11px] font-semibold text-slate-300">{q}</p>
                          <p className="text-xs text-white font-medium whitespace-pre-wrap">
                            {typeof ans === 'object' ? JSON.stringify(ans, null, 2) : String(ans)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No additional questions submitted with this application.</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-[#0c0c10]/95 backdrop-blur-md p-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Read-Only Submission Record</span>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
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
