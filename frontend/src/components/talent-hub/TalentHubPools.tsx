import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  Check,
  ChevronRight,
  Info,
  Calendar,
  Share2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { poolApi, PoolItem, PoolHistoryItem } from '../../services/poolApi';

export const TalentHubPools: React.FC = () => {
  const { session, user, talentProfile } = useTalentHubAuth();
  const token = session?.access_token || '';

  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [history, setHistory] = useState<PoolHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [customTextMap, setCustomTextMap] = useState<Record<string, string>>({});
  const [submittingPoolId, setSubmittingPoolId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ poolId: string; msg: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [poolRes, histRes] = await Promise.all([
        poolApi.getTalentHubPools(token),
        poolApi.getTalentHubHistory(token),
      ]);

      if (poolRes.success) {
        setPools(poolRes.pools || []);
        // Prepopulate existing choices
        const initMap: Record<string, string[]> = {};
        (poolRes.pools || []).forEach((p) => {
          if (p.my_selected_option_ids && p.my_selected_option_ids.length > 0) {
            initMap[p.id] = p.my_selected_option_ids;
          }
        });
        setSelectedOptionsMap(initMap);
      }

      if (histRes.success) {
        setHistory(histRes.history || []);
      }
    } catch (err) {
      console.warn('[Talent Hub Pools Fetch Warning]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleOptionToggle = (pool: PoolItem, optionId: string) => {
    const currentList = selectedOptionsMap[pool.id] || [];

    if (!pool.allow_multiple) {
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [pool.id]: [optionId],
      }));
    } else {
      const exists = currentList.includes(optionId);
      const updated = exists ? currentList.filter((id) => id !== optionId) : [...currentList, optionId];
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [pool.id]: updated,
      }));
    }
  };

  const handleSubmit = async (pool: PoolItem) => {
    const selectedIds = selectedOptionsMap[pool.id] || [];
    if (selectedIds.length === 0) {
      setStatusFeedback({ poolId: pool.id, msg: 'Please select at least one option.', isError: true });
      return;
    }

    setSubmittingPoolId(pool.id);
    setStatusFeedback(null);

    const email = user?.email || talentProfile?.email || '';
    const name = talentProfile?.full_name || user?.user_metadata?.full_name || 'Zenemoo Contributor';
    const participantType = talentProfile?.primary_role || 'Individual';

    try {
      const res = await poolApi.submitTalentHubResponse(
        pool.public_id,
        {
          email,
          name,
          participantType,
          selectedOptionIds: selectedIds,
          customText: customTextMap[pool.id] || '',
        },
        token
      );

      if (res.success) {
        setStatusFeedback({ poolId: pool.id, msg: 'Interest recorded in your verified profile!' });
        loadData();
      }
    } catch (err: any) {
      setStatusFeedback({
        poolId: pool.id,
        msg: err?.response?.data?.message || 'Failed to submit response.',
        isError: true,
      });
    } finally {
      setSubmittingPoolId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-[#0d1025] to-blue-950/30 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Vote className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Talent Interest Pools</h2>
          </div>
          <p className="text-xs text-slate-400">
            1-click expression of interest for upcoming project pipelines matching your verified account.
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'open'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Polls ({pools.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My History ({history.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
          <span>Syncing talent interest pools...</span>
        </div>
      ) : activeTab === 'open' ? (
        pools.length === 0 ? (
          <div className="py-16 text-center border border-white/10 rounded-2xl bg-[#0d1022]/40">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No Open Interest Polls</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Zenemoo is not currently running open talent pools. Check back soon for new project inquiries.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pools.map((pool) => {
              const selectedIds = selectedOptionsMap[pool.id] || [];
              const hasResponded = pool.has_responded || (pool.my_selected_option_ids && pool.my_selected_option_ids.length > 0);
              const feedback = statusFeedback?.poolId === pool.id ? statusFeedback : null;
              const isOtherSelected = pool.options.some((o) => o.option_text.toLowerCase().includes('other') && selectedIds.includes(o.id));

              return (
                <div
                  key={pool.id}
                  className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                    hasResponded
                      ? 'bg-[#0a1820]/80 border-emerald-500/30'
                      : 'bg-[#0d1022] border-white/10 hover:border-cyan-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {pool.category || 'General'}
                      </span>
                      {hasResponded && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Submitted</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug mb-1.5">{pool.title}</h3>
                    {pool.description && (
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{pool.description}</p>
                    )}

                    {/* Options */}
                    <div className="space-y-2 mt-4">
                      {pool.options.map((opt) => {
                        const isSelected = selectedIds.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleOptionToggle(pool, opt.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400 text-white'
                                : 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-${pool.allow_multiple ? 'md' : 'full'} border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'
                                }`}
                              >
                                {isSelected && (
                                  pool.allow_multiple ? (
                                    <Check className="w-3 h-3 text-black stroke-[3]" />
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-black" />
                                  )
                                )}
                              </div>
                              <span className="text-xs font-medium">{opt.option_text}</span>
                            </div>
                          </div>
                        );
                      })}

                      {isOtherSelected && (
                        <input
                          type="text"
                          placeholder="Please specify..."
                          value={customTextMap[pool.id] || ''}
                          onChange={(e) =>
                            setCustomTextMap((prev) => ({
                              ...prev,
                              [pool.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-400 mt-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-5 mt-4 border-t border-white/10">
                    {feedback && (
                      <p
                        className={`text-xs px-3 py-2 rounded-lg mb-2.5 ${
                          feedback.isError
                            ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                            : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        }`}
                      >
                        {feedback.msg}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={submittingPoolId === pool.id || selectedIds.length === 0}
                      onClick={() => handleSubmit(pool)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                        selectedIds.length > 0 && submittingPoolId !== pool.id
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-md shadow-cyan-500/20 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {submittingPoolId === pool.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{hasResponded ? 'Update Preference' : 'Submit Interest'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* History Tab */
        history.length === 0 ? (
          <div className="py-16 text-center border border-white/10 rounded-2xl bg-[#0d1022]/40">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No Pool History Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You have not submitted responses to any talent interest pools yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-white/10 bg-[#0d1022] space-y-2 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {item.category || 'General'}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.submitted_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{item.pool_title}</h3>

                <div className="pt-1 flex flex-wrap gap-2">
                  {item.selected_options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{opt.option_text}</span>
                      {opt.custom_text && <span className="text-slate-400 text-[10px]">({opt.custom_text})</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
