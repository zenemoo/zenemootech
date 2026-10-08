import React, { useState, useEffect, useMemo } from 'react';
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
  Edit3,
  X,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { poolApi, PoolItem, PoolHistoryItem } from '../../services/poolApi';

export const TalentHubPools: React.FC = () => {
  const { session, user, talentProfile } = useTalentHubAuth();
  const token = session?.access_token || '';

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [filterType, setFilterType] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [history, setHistory] = useState<PoolHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [customTextMap, setCustomTextMap] = useState<Record<string, string>>({});
  const [editingPoolIds, setEditingPoolIds] = useState<Record<string, boolean>>({});
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

      const fetchedPools = poolRes.success && poolRes.pools ? poolRes.pools : [];
      const fetchedHistory = histRes.success && histRes.history ? histRes.history : [];

      setPools(fetchedPools);
      setHistory(fetchedHistory);

      // Build initial selected options map by cross-referencing pools with history & API metadata
      const initMap: Record<string, string[]> = {};
      const initCustomText: Record<string, string> = {};

      const historyMap = new Map<string, PoolHistoryItem>();
      fetchedHistory.forEach((h) => {
        if (h.pool_id) historyMap.set(h.pool_id, h);
        if (h.public_id) historyMap.set(h.public_id, h);
        if (h.pool_title) historyMap.set(h.pool_title.trim().toLowerCase(), h);
      });

      fetchedPools.forEach((p) => {
        const histEntry =
          historyMap.get(p.id) ||
          historyMap.get(p.public_id) ||
          historyMap.get(p.title.trim().toLowerCase());

        if (histEntry && histEntry.selected_options && histEntry.selected_options.length > 0) {
          const optIds: string[] = [];
          histEntry.selected_options.forEach((so) => {
            if (so.option_id) {
              optIds.push(so.option_id);
            } else if (so.option_text) {
              // Match text to pool options
              const matched = p.options.find(
                (o) => o.option_text.trim().toLowerCase() === so.option_text.trim().toLowerCase()
              );
              if (matched) optIds.push(matched.id);
            }
            if (so.custom_text) {
              initCustomText[p.id] = so.custom_text;
            }
          });
          if (optIds.length > 0) {
            initMap[p.id] = optIds;
          }
        } else if (p.my_selected_option_ids && p.my_selected_option_ids.length > 0) {
          initMap[p.id] = p.my_selected_option_ids;
        }
      });

      setSelectedOptionsMap(initMap);
      setCustomTextMap(initCustomText);
    } catch (err) {
      console.warn('[Talent Hub Pools Fetch Warning]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Map history quick lookup
  const historyLookup = useMemo(() => {
    const map = new Map<string, PoolHistoryItem>();
    history.forEach((h) => {
      if (h.pool_id) map.set(h.pool_id, h);
      if (h.public_id) map.set(h.public_id, h);
      if (h.pool_title) map.set(h.pool_title.trim().toLowerCase(), h);
    });
    return map;
  }, [history]);

  // Categorized pool lists
  const poolStateList = useMemo(() => {
    return pools.map((pool) => {
      const histEntry =
        historyLookup.get(pool.id) ||
        historyLookup.get(pool.public_id) ||
        historyLookup.get(pool.title.trim().toLowerCase());

      const selectedIds = selectedOptionsMap[pool.id] || [];
      const hasResponded = Boolean(
        pool.has_responded ||
        histEntry ||
        (pool.my_selected_option_ids && pool.my_selected_option_ids.length > 0) ||
        selectedIds.length > 0
      );

      // Find submitted labels
      const submittedLabels: string[] = [];
      if (histEntry?.selected_options && histEntry.selected_options.length > 0) {
        histEntry.selected_options.forEach((so) => {
          if (so.option_text) submittedLabels.push(so.option_text);
        });
      }
      if (submittedLabels.length === 0 && selectedIds.length > 0) {
        selectedIds.forEach((sid) => {
          const matchOpt = pool.options.find((o) => o.id === sid);
          if (matchOpt) submittedLabels.push(matchOpt.option_text);
        });
      }

      return {
        pool,
        histEntry,
        hasResponded,
        submittedLabels,
        submissionDate: histEntry?.submitted_at || pool.updated_at || pool.created_at,
        isEditing: Boolean(editingPoolIds[pool.id]),
      };
    });
  }, [pools, historyLookup, selectedOptionsMap, editingPoolIds]);

  const answeredCount = poolStateList.filter((p) => p.hasResponded).length;
  const unansweredCount = poolStateList.filter((p) => !p.hasResponded).length;

  const filteredPools = useMemo(() => {
    if (filterType === 'unanswered') return poolStateList.filter((p) => !p.hasResponded);
    if (filterType === 'answered') return poolStateList.filter((p) => p.hasResponded);
    return poolStateList;
  }, [poolStateList, filterType]);

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

  const toggleEditing = (poolId: string) => {
    setEditingPoolIds((prev) => ({
      ...prev,
      [poolId]: !prev[poolId],
    }));
  };

  const handleSubmit = async (pool: PoolItem) => {
    const selectedIds = selectedOptionsMap[pool.id] || [];
    if (selectedIds.length === 0) {
      setStatusFeedback({ poolId: pool.id, msg: 'Please select at least one option before saving.', isError: true });
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
        setStatusFeedback({ poolId: pool.id, msg: res.message || 'Interest response recorded successfully!' });
        setEditingPoolIds((prev) => ({ ...prev, [pool.id]: false }));
        await loadData();
      }
    } catch (err: any) {
      setStatusFeedback({
        poolId: pool.id,
        msg: err?.response?.data?.message || 'Failed to submit response. Please try again.',
        isError: true,
      });
    } finally {
      setSubmittingPoolId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Polished Talent Hub Header Banner ── */}
      <div className="p-6 sm:p-7 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-[#0a0f24] to-blue-950/30 backdrop-blur-xl shadow-xl shadow-black/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <Vote className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
              Talent Interest Pools
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block">
              Pipelines
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-2xl leading-relaxed">
            Quickly tell Zenemoo what you&apos;re interested in. Your responses help us match you with relevant upcoming projects.
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 shrink-0 relative z-10 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Pools ({pools.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <span className="font-mono">Syncing talent interest pools...</span>
        </div>
      ) : activeTab === 'active' ? (
        <div className="space-y-5">
          {/* Filter Bar (All / Unanswered / Submitted) */}
          {pools.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit text-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({pools.length})
                </button>
                <button
                  onClick={() => setFilterType('unanswered')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterType === 'unanswered'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending ({unansweredCount})
                </button>
                <button
                  onClick={() => setFilterType('answered')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterType === 'answered'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Submitted ({answeredCount})
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {answeredCount} Answered
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {unansweredCount} Available
                </span>
              </div>
            </div>
          )}

          {/* Pools Grid */}
          {filteredPools.length === 0 ? (
            <div className="py-16 text-center border border-white/10 rounded-2xl bg-[#090d1a]/80 p-8 space-y-3">
              <Clock className="w-9 h-9 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white font-display">
                {filterType === 'unanswered'
                  ? 'All Caught Up!'
                  : filterType === 'answered'
                  ? 'No Responses Submitted Yet'
                  : 'No Active Interest Pools'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {filterType === 'unanswered'
                  ? 'You have answered all currently available talent interest pools. New project inquiries will appear here.'
                  : filterType === 'answered'
                  ? 'Select an active pool above to submit your interests and capabilities.'
                  : 'Zenemoo does not have any open talent pools right now. Check back soon for new project inquiries.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPools.map(({ pool, hasResponded, submittedLabels, submissionDate, isEditing }) => {
                const selectedIds = selectedOptionsMap[pool.id] || [];
                const feedback = statusFeedback?.poolId === pool.id ? statusFeedback : null;
                const isOtherSelected = pool.options.some(
                  (o) => o.option_text.toLowerCase().includes('other') && selectedIds.includes(o.id)
                );

                return (
                  <div
                    key={pool.id}
                    className={`rounded-2xl border transition-all duration-300 p-6 flex flex-col justify-between gap-5 relative overflow-hidden shadow-xl ${
                      hasResponded && !isEditing
                        ? 'bg-gradient-to-b from-[#09151c]/95 to-[#060e14]/95 border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-950/20'
                        : 'bg-gradient-to-b from-[#090e1f]/95 to-[#060914]/95 border-white/10 hover:border-cyan-500/40 shadow-black/40'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Header: Category & Submission Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {pool.category || 'AI DATA SOLUTIONS'}
                        </span>

                        {hasResponded ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1 shadow-sm shadow-emerald-500/10">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Response Submitted</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Unanswered</span>
                          </span>
                        )}
                      </div>

                      {/* Question Title & Description */}
                      <div className="space-y-1.5">
                        <h3 className="text-base sm:text-lg font-bold text-white font-display leading-snug">
                          {pool.title}
                        </h3>
                        {pool.description && (
                          <p className="text-xs text-slate-400 leading-relaxed font-sans">
                            {pool.description}
                          </p>
                        )}
                      </div>

                      {/* ── Case 1: Already Answered (View Mode) ── */}
                      {hasResponded && !isEditing ? (
                        <div className="space-y-3 pt-2">
                          <div className="space-y-2">
                            {pool.options.map((opt) => {
                              const isSelected =
                                selectedIds.includes(opt.id) ||
                                submittedLabels.includes(opt.option_text);

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-md shadow-emerald-950/20'
                                      : 'bg-white/[0.02] border-white/5 text-slate-500 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-4 h-4 rounded-${
                                        pool.allow_multiple ? 'md' : 'full'
                                      } border flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? 'border-emerald-400 bg-emerald-400'
                                          : 'border-slate-700'
                                      }`}
                                    >
                                      {isSelected && (
                                        <Check className="w-3 h-3 text-black stroke-[3]" />
                                      )}
                                    </div>
                                    <span
                                      className={`text-xs ${
                                        isSelected ? 'font-bold text-emerald-200' : 'font-medium text-slate-500'
                                      }`}
                                    >
                                      {opt.option_text}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                                      Your Choice
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {customTextMap[pool.id] && (
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-slate-300 font-sans">
                              <span className="text-slate-500 font-mono block text-[10px] uppercase">Additional Note:</span>
                              {customTextMap[pool.id]}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── Case 2: Unanswered or Active Editing Mode ── */
                        <div className="space-y-2 pt-2">
                          <p className="text-[11px] font-mono text-slate-400 pb-1">
                            {pool.allow_multiple ? 'Select all that apply:' : 'Select one option:'}
                          </p>
                          {pool.options.map((opt) => {
                            const isSelected = selectedIds.includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                onClick={() => handleOptionToggle(pool, opt.id)}
                                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/15'
                                    : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-4 h-4 rounded-${
                                      pool.allow_multiple ? 'md' : 'full'
                                    } border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'border-cyan-400 bg-cyan-400'
                                        : 'border-slate-500'
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
                              placeholder="Please specify details..."
                              value={customTextMap[pool.id] || ''}
                              onChange={(e) =>
                                setCustomTextMap((prev) => ({
                                  ...prev,
                                  [pool.id]: e.target.value,
                                }))
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-400 mt-2 font-sans"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions & Status Footer */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      {feedback && (
                        <p
                          className={`text-xs px-3.5 py-2 rounded-xl ${
                            feedback.isError
                              ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                              : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          }`}
                        >
                          {feedback.msg}
                        </p>
                      )}

                      {hasResponded && !isEditing ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Response recorded</span>
                            {submissionDate && (
                              <span className="text-slate-500">
                                •{' '}
                                {new Date(submissionDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleEditing(pool.id)}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Update Response</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled={submittingPoolId === pool.id || selectedIds.length === 0}
                            onClick={() => handleSubmit(pool)}
                            className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                              selectedIds.length > 0 && submittingPoolId !== pool.id
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/25 cursor-pointer active:scale-[0.99]'
                                : 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed'
                            }`}
                          >
                            {submittingPoolId === pool.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Recording Response...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{hasResponded ? 'Save Updated Response' : 'Submit Interest'}</span>
                              </>
                            )}
                          </button>

                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => toggleEditing(pool.id)}
                              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
                            >
                              Cancel Editing
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Polished My History Tab ── */
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>My Pool History</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Your verified recorded responses to Zenemoo Talent Pools
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              {history.length} {history.length === 1 ? 'Submission' : 'Submissions'}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="py-16 text-center border border-white/10 rounded-2xl bg-[#090d1a]/80 p-8 space-y-3">
              <Clock className="w-9 h-9 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white font-display">No History Recorded Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                You haven&apos;t submitted responses to any talent interest pools yet. Switch to Active Pools above to participate.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all inline-flex items-center gap-2 cursor-pointer mt-2"
              >
                <span>Browse Active Pools</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-[#090f22]/90 via-[#070b19]/90 to-[#050814]/90 space-y-4 shadow-xl shadow-black/30 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {item.category || 'General'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Recorded</span>
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(item.submitted_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white font-display">{item.pool_title}</h3>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">
                        Your Submitted Response:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {item.selected_options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="flex items-center gap-2 text-xs text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl font-medium shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{opt.option_text}</span>
                            {opt.custom_text && (
                              <span className="text-slate-300 text-[11px] font-normal">
                                ({opt.custom_text})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
