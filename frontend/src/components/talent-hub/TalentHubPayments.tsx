import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Layers,
  Award,
  Trophy,
  Crown,
  Medal,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Sparkles,
  Shield,
  Zap,
  Info,
  User,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useTalentHubAuth } from './TalentHubAuthContext';
import { ContributorJourneyModal } from './ContributorJourneyModal';
import {
  paymentWorkerApi,
  PaymentRecord,
  TalentPaymentSummary,
  TalentLeaderboardItem,
} from '../../services/paymentWorkerApi';

export const TalentHubPayments: React.FC = () => {
  const { session, talentProfile, user } = useTalentHubAuth();

  // Active view: 'history' or 'leaderboard'
  const [activeTab, setActiveTab] = useState<'history' | 'leaderboard'>('history');

  // Journey 3D Modal state
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState<boolean>(false);

  // Transactions State
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<TalentPaymentSummary>({
    payment_count: 0,
    total_paid: 0,
    pending_count: 0,
    user_rank: null,
    user_grade: 'Bronze',
  });
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters & Pagination for Transactions
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotalCount, setHistoryTotalCount] = useState<number>(0);

  // Leaderboard State (Top 10 + User Neighborhood)
  const [leaderboard, setLeaderboard] = useState<TalentLeaderboardItem[]>([]);
  const [userNeighborhood, setUserNeighborhood] = useState<TalentLeaderboardItem[]>([]);
  const [leaderboardPosition, setLeaderboardPosition] = useState<{
    rank: number | null;
    total_paid: number;
    grade: string;
    payment_count: number;
  }>({
    rank: null,
    total_paid: 0,
    grade: 'Bronze',
    payment_count: 0,
  });
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
  const [leaderboardPage, setLeaderboardPage] = useState<number>(1);
  const [leaderboardTotalPages, setLeaderboardTotalPages] = useState<number>(1);
  const [leaderboardTotalCount, setLeaderboardTotalCount] = useState<number>(0);

  // Load Transactions & Summary
  const loadTalentData = useCallback(
    async (showLoading = true) => {
      let token = session?.access_token;
      if (!token) {
        try {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token;
        } catch {}
      }
      if (!token) return;

      if (showLoading) setIsTransactionsLoading(true);
      setIsRefreshing(true);

      try {
        const [listRes, summaryRes] = await Promise.allSettled([
          paymentWorkerApi.getTalentPayments(token, {
            page: historyPage,
            limit: 15,
            search: searchQuery.trim() || undefined,
            status: selectedStatus !== 'All' ? selectedStatus : undefined,
          }),
          paymentWorkerApi.getTalentSummary(token),
        ]);

        if (listRes.status === 'fulfilled' && listRes.value?.success) {
          setPayments(listRes.value.data || []);
          setHistoryTotalPages(listRes.value.pagination?.totalPages || 1);
          setHistoryTotalCount(listRes.value.pagination?.total || 0);
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value?.success) {
          setSummary(summaryRes.value.summary);
        }
      } catch (err: any) {
        console.error('[TalentHubPayments Load Error]:', err.message);
      } finally {
        setIsTransactionsLoading(false);
        setIsRefreshing(false);
      }
    },
    [session?.access_token, historyPage, searchQuery, selectedStatus]
  );

  // Load Leaderboard
  const loadLeaderboardData = useCallback(
    async (showLoading = true) => {
      let token = session?.access_token;
      if (!token) {
        try {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token;
        } catch {}
      }
      if (!token) return;

      if (showLoading) setIsLeaderboardLoading(true);

      try {
        const res = await paymentWorkerApi.getTalentLeaderboard(token, {
          page: leaderboardPage,
          limit: 10,
        });

        if (res?.success) {
          setLeaderboard(res.data || []);
          setUserNeighborhood(res.user_neighborhood || []);
          setLeaderboardPosition(res.user_position);
          setLeaderboardTotalPages(res.pagination?.totalPages || 1);
          setLeaderboardTotalCount(res.pagination?.total || 0);
        }
      } catch (err: any) {
        console.error('[Leaderboard Load Error]:', err.message);
      } finally {
        setIsLeaderboardLoading(false);
      }
    },
    [session?.access_token, leaderboardPage]
  );

  useEffect(() => {
    loadTalentData();
  }, [loadTalentData]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboardData();
    }
  }, [activeTab, loadLeaderboardData]);

  // ── Unified Contributor Tier Design Token System ──
  interface TierConfig {
    id: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    name: string;
    badgeLabel: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    primaryColor: string;
    secondaryColor: string;
    glowColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    badgeGlow: string;
    heroBorder: string;
    heroAmbientGlow: string;
    progressGradient: string;
    minThreshold: number;
    nextThreshold: number;
    nextMilestone: string | null;
  }

  const TIER_CONFIG: Record<string, TierConfig> = {
    Bronze: {
      id: 'Bronze',
      name: 'Bronze Contributor',
      badgeLabel: 'BRONZE CONTRIBUTOR',
      icon: Shield,
      primaryColor: '#CD7F32',
      secondaryColor: '#A0522D',
      glowColor: 'rgba(205, 127, 50, 0.35)',
      badgeBg: 'rgba(205, 127, 50, 0.12)',
      badgeBorder: 'rgba(205, 127, 50, 0.35)',
      badgeText: '#E69A53',
      badgeGlow: '0 0 16px rgba(205, 127, 50, 0.22)',
      heroBorder: 'rgba(205, 127, 50, 0.20)',
      heroAmbientGlow: 'radial-gradient(circle at top right, rgba(205, 127, 50, 0.12), transparent 70%)',
      progressGradient: 'linear-gradient(90deg, #CD7F32 0%, #E69A53 100%)',
      minThreshold: 0,
      nextThreshold: 5000,
      nextMilestone: 'Silver',
    },
    Silver: {
      id: 'Silver',
      name: 'Silver Contributor',
      badgeLabel: 'SILVER CONTRIBUTOR',
      icon: Medal,
      primaryColor: '#C0C7D1',
      secondaryColor: '#94A3B8',
      glowColor: 'rgba(192, 199, 209, 0.35)',
      badgeBg: 'rgba(192, 199, 209, 0.12)',
      badgeBorder: 'rgba(192, 199, 209, 0.35)',
      badgeText: '#E2E8F0',
      badgeGlow: '0 0 16px rgba(192, 199, 209, 0.22)',
      heroBorder: 'rgba(192, 199, 209, 0.20)',
      heroAmbientGlow: 'radial-gradient(circle at top right, rgba(192, 199, 209, 0.12), transparent 70%)',
      progressGradient: 'linear-gradient(90deg, #94A3B8 0%, #E2E8F0 100%)',
      minThreshold: 5000,
      nextThreshold: 10000,
      nextMilestone: 'Gold',
    },
    Gold: {
      id: 'Gold',
      name: 'Gold Contributor',
      badgeLabel: 'GOLD CONTRIBUTOR',
      icon: Trophy,
      primaryColor: '#F5C542',
      secondaryColor: '#EAB308',
      glowColor: 'rgba(245, 197, 66, 0.38)',
      badgeBg: 'rgba(245, 197, 66, 0.12)',
      badgeBorder: 'rgba(245, 197, 66, 0.40)',
      badgeText: '#FDE047',
      badgeGlow: '0 0 18px rgba(245, 197, 66, 0.25)',
      heroBorder: 'rgba(245, 197, 66, 0.22)',
      heroAmbientGlow: 'radial-gradient(circle at top right, rgba(245, 197, 66, 0.14), transparent 70%)',
      progressGradient: 'linear-gradient(90deg, #EAB308 0%, #FDE047 100%)',
      minThreshold: 10000,
      nextThreshold: 25000,
      nextMilestone: 'Platinum',
    },
    Platinum: {
      id: 'Platinum',
      name: 'Platinum Contributor',
      badgeLabel: 'PLATINUM CONTRIBUTOR',
      icon: Crown,
      primaryColor: '#67E8F9',
      secondaryColor: '#38BDF8',
      glowColor: 'rgba(103, 232, 249, 0.38)',
      badgeBg: 'rgba(103, 232, 249, 0.12)',
      badgeBorder: 'rgba(103, 232, 249, 0.40)',
      badgeText: '#A5F3FC',
      badgeGlow: '0 0 18px rgba(103, 232, 249, 0.25)',
      heroBorder: 'rgba(103, 232, 249, 0.22)',
      heroAmbientGlow: 'radial-gradient(circle at top right, rgba(103, 232, 249, 0.14), transparent 70%)',
      progressGradient: 'linear-gradient(90deg, #38BDF8 0%, #A5F3FC 100%)',
      minThreshold: 25000,
      nextThreshold: 50000,
      nextMilestone: 'Diamond',
    },
    Diamond: {
      id: 'Diamond',
      name: 'Diamond Contributor',
      badgeLabel: 'DIAMOND CONTRIBUTOR',
      icon: Sparkles,
      primaryColor: '#7DD3FC',
      secondaryColor: '#C084FC',
      glowColor: 'rgba(125, 211, 252, 0.42)',
      badgeBg: 'rgba(125, 211, 252, 0.14)',
      badgeBorder: 'rgba(125, 211, 252, 0.42)',
      badgeText: '#BAE6FD',
      badgeGlow: '0 0 20px rgba(125, 211, 252, 0.30), 0 0 35px rgba(192, 132, 252, 0.15)',
      heroBorder: 'rgba(125, 211, 252, 0.25)',
      heroAmbientGlow: 'radial-gradient(circle at top right, rgba(125, 211, 252, 0.14), rgba(192, 132, 252, 0.08), transparent 70%)',
      progressGradient: 'linear-gradient(90deg, #7DD3FC 0%, #C084FC 100%)',
      minThreshold: 50000,
      nextThreshold: 50000,
      nextMilestone: null,
    },
  };

  const resolveUserTier = (totalPaid: number, userGrade?: string): TierConfig => {
    if (totalPaid >= 50000 || userGrade === 'Diamond') return TIER_CONFIG.Diamond;
    if (totalPaid >= 25000 || userGrade === 'Platinum') return TIER_CONFIG.Platinum;
    if (totalPaid >= 10000 || userGrade === 'Gold') return TIER_CONFIG.Gold;
    if (totalPaid >= 5000 || userGrade === 'Silver') return TIER_CONFIG.Silver;
    return TIER_CONFIG.Bronze;
  };

  const currentTier = resolveUserTier(summary.total_paid, summary.user_grade);
  const TierIcon = currentTier.icon;
  const userRank = summary.user_rank;

  // Ordinal Presentation Helper (1st, 2nd, 3rd, 4th...)
  const formatOrdinal = (n: number | null | undefined) => {
    if (!n || n <= 0) return 'Unranked';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Top 3 Podium Extraction
  const top3 = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  // Helper for small grade badge rendering in tables
  const renderGradeBadge = (gradeStr: string = 'Bronze') => {
    const tier = TIER_CONFIG[gradeStr] || TIER_CONFIG.Bronze;
    const IconComponent = tier.icon;
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: tier.badgeBg,
          border: `1px solid ${tier.badgeBorder}`,
          color: tier.badgeText,
        }}
      >
        <IconComponent className="w-3 h-3" style={{ color: tier.primaryColor }} />
        <span>{tier.id}</span>
      </span>
    );
  };

  // Tier design tokens as CSS Variables on hero card
  const tierCssVars = {
    '--tier-color': currentTier.primaryColor,
    '--tier-secondary': currentTier.secondaryColor,
    '--tier-glow': currentTier.glowColor,
    '--tier-badge-bg': currentTier.badgeBg,
    '--tier-badge-border': currentTier.badgeBorder,
    '--tier-badge-text': currentTier.badgeText,
    '--tier-badge-glow': currentTier.badgeGlow,
    '--tier-card-border': currentTier.heroBorder,
    '--tier-progress-gradient': currentTier.progressGradient,
  } as React.CSSProperties;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 selection:bg-emerald-500/30">
      {/* ── Top Hero Card (Financial & Dynamic Contributor Tier Status) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ ...tierCssVars, borderColor: currentTier.heroBorder }}
        className="bg-gradient-to-r from-[#0B0D1B] via-[#0E1326] to-[#0B0D1B] border rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden transition-all duration-300"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Column: Earnings & Dynamic Tier Badge */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm select-none">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                Verified Compensation
              </span>

              {/* Dynamic Contributor Tier Badge */}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border shadow-sm transition-all duration-300 select-none"
                style={{
                  backgroundColor: currentTier.badgeBg,
                  borderColor: currentTier.badgeBorder,
                  color: currentTier.badgeText,
                  boxShadow: currentTier.badgeGlow,
                }}
              >
                <TierIcon className="w-3.5 h-3.5 shrink-0" style={{ color: currentTier.primaryColor }} />
                <span>{currentTier.badgeLabel}</span>
              </span>

              {/* ✦ Contributor Journey Button */}
              <button
                onClick={() => setIsJourneyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold font-mono uppercase tracking-wider bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-purple-500/25 text-cyan-300 hover:text-white border border-cyan-400/35 hover:border-cyan-400/60 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition-all duration-300 cursor-pointer active:scale-95 group select-none"
                title="View your 3D Contributor Journey & Tier Progression"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
                <span>Contributor Journey</span>
                <ChevronRight className="w-3 h-3 text-cyan-400/70 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Paid Earnings
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mt-1">
                ₹{summary.total_paid.toLocaleString('en-IN')}
                <span className="text-sm font-normal text-slate-400 ml-2">INR</span>
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {summary.payment_count} successful payouts completed for {talentProfile?.full_name || 'you'}.
            </p>
          </div>

          {/* Right Column: Leaderboard Standings Badge & Dynamic Tier Progress */}
          <div
            className="bg-white/[0.03] border rounded-2xl p-4 sm:p-5 lg:min-w-[290px] space-y-3.5 backdrop-blur-md transition-all duration-300"
            style={{ borderColor: currentTier.badgeBorder }}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Leaderboard Standings</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                {userRank ? `#${userRank}` : 'Unranked'}
              </span>
              <span className="text-xs text-slate-400">
                {userRank ? `(${formatOrdinal(userRank)} Position)` : 'Complete project to rank'}
              </span>
            </div>

            {/* Next Milestone Progress with Dynamic Tier Gradient */}
            {currentTier.nextMilestone ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Next: <strong style={{ color: currentTier.primaryColor }}>{currentTier.nextMilestone}</strong>
                  </span>
                  <span className="font-mono">
                    ₹{Math.max(0, currentTier.nextThreshold - summary.total_paid).toLocaleString('en-IN')} needed
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full transition-all duration-700 shadow-sm"
                    style={{
                      background: currentTier.progressGradient,
                      width: `${Math.min(100, Math.max(5, (summary.total_paid / currentTier.nextThreshold) * 100))}%`,
                      boxShadow: `0 0 10px ${currentTier.glowColor}`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold flex items-center gap-1" style={{ color: currentTier.primaryColor }}>
                    <Sparkles className="w-3 h-3" />
                    Pinnacle Tier Unlocked
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">Top Tier</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full w-full shadow-sm"
                    style={{
                      background: currentTier.progressGradient,
                      boxShadow: `0 0 12px ${currentTier.glowColor}`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Tier Ambient Background Glow */}
        <div
          className="absolute right-0 top-0 w-88 h-88 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-80"
          style={{ background: currentTier.heroAmbientGlow }}
        />
      </motion.div>

      {/* ── Sub-Tab Navigation Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0B0D1B] border border-white/10 rounded-2xl p-2 sm:p-2.5 shadow-lg">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Transaction History ({summary.payment_count})
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            Contributor Leaderboard
          </button>
        </div>

        <div className="flex items-center justify-end px-2">
          <button
            onClick={() => {
              if (activeTab === 'history') loadTalentData(false);
              else loadLeaderboardData(false);
            }}
            disabled={isRefreshing || isLeaderboardLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing || isLeaderboardLoading ? 'animate-spin text-emerald-400' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: TRANSACTION HISTORY ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#0B0D1B] border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search project or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="bg-transparent text-xs sm:text-sm text-slate-200 focus:outline-none cursor-pointer w-full"
                >
                  <option value="All" className="bg-slate-900 text-white">All Statuses</option>
                  <option value="Paid" className="bg-slate-900 text-white">Paid</option>
                  <option value="Pending" className="bg-slate-900 text-white">Pending</option>
                  <option value="Processing" className="bg-slate-900 text-white">Processing</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table & Mobile Cards */}
          <div className="bg-[#0B0D1B] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {/* Desktop Table View (sm+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">Project & Work Type</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment Date</th>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4 text-right">Proof / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isTransactionsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
                        <p className="text-sm">Loading your verified compensation records...</p>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <Receipt className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                        <p className="text-base font-semibold text-white">No payment records found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {searchQuery || selectedStatus !== 'All'
                            ? 'No transactions match your current search filters.'
                            : 'Once project payouts or milestone rewards are disbursed, your records and transaction references will appear here.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{p.project_name}</div>
                          {p.work_type && (
                            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {p.work_type}
                            </span>
                          )}
                          {p.notes && (
                            <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate" title={p.notes}>
                              {p.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap text-base">
                          ₹{p.amount.toLocaleString('en-IN')}
                          <span className="text-[10px] text-slate-500 font-normal ml-1">{p.currency}</span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(p.status)}</td>

                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {p.payment_date || '-'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                          {p.reference_number || '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-xs">
                          {p.reference_link ? (
                            <a
                              href={p.reference_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-all font-medium"
                              title="Open proof link in new tab"
                            >
                              View Proof
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="md:hidden divide-y divide-white/5">
              {isTransactionsLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-400 mb-2" />
                  <p className="text-xs">Loading records...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 px-4">
                  <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-white">No payment records</p>
                  <p className="text-xs text-slate-500 mt-1">No transactions match your active filters.</p>
                </div>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-white text-sm leading-tight">{p.project_name}</p>
                        {p.work_type && (
                          <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            {p.work_type}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {p.payment_date || '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-extrabold text-emerald-400">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </p>
                        <div className="mt-1">{getStatusBadge(p.status)}</div>
                      </div>
                    </div>

                    {(p.reference_number || p.reference_link) && (
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">
                          Ref: {p.reference_number || '-'}
                        </span>
                        {p.reference_link && (
                          <a
                            href={p.reference_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-1 font-medium text-[11px]"
                          >
                            View Proof <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pagination Footer */}
            {!isTransactionsLoading && payments.length > 0 && historyTotalPages > 1 && (
              <div className="bg-white/[0.02] border-t border-white/10 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {historyPage} of {historyTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage >= historyTotalPages}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CONTRIBUTOR LEADERBOARD ── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Top 3 Podium Highlights (if available) */}
          {top3.length > 0 && !isLeaderboardLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {top3.map((entry, idx) => {
                const isGold = idx === 0;
                const isSilver = idx === 1;
                const isBronze = idx === 2;

                const borderColor = isGold
                  ? 'border-amber-400/40 bg-gradient-to-b from-amber-500/15 via-[#0B0D1B] to-[#0B0D1B]'
                  : isSilver
                  ? 'border-slate-300/30 bg-gradient-to-b from-slate-400/10 via-[#0B0D1B] to-[#0B0D1B]'
                  : 'border-amber-700/30 bg-gradient-to-b from-amber-700/10 via-[#0B0D1B] to-[#0B0D1B]';

                const iconColor = isGold
                  ? 'text-amber-300'
                  : isSilver
                  ? 'text-slate-200'
                  : 'text-amber-500';

                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`border rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl ${borderColor} ${
                      entry.is_current_user ? 'ring-2 ring-emerald-500 shadow-emerald-500/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${iconColor}`}>
                          #{entry.rank}
                        </span>
                        {isGold && <Crown className="w-5 h-5 text-amber-300" />}
                        {isSilver && <Medal className="w-5 h-5 text-slate-300" />}
                        {isBronze && <Award className="w-5 h-5 text-amber-600" />}
                      </div>

                      {entry.is_current_user && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                          You
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <p className="font-bold text-white text-base truncate">
                        {entry.is_current_user
                          ? talentProfile?.full_name || entry.name
                          : entry.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        {entry.email_masked}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Total Earned
                        </span>
                        <span className="text-lg font-black text-emerald-400">
                          ₹{entry.total_paid.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {renderGradeBadge(entry.grade)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full Leaderboard Table / Cards */}
          <div className="bg-[#0B0D1B] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Contributor Rankings
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranked by cumulative verified compensation disbursed.
                </p>
              </div>

              {leaderboardPosition.rank && (
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  Your Standing: <strong className="text-amber-300 font-bold">#{leaderboardPosition.rank}</strong> ({formatOrdinal(leaderboardPosition.rank)})
                </div>
              )}
            </div>

            {/* Desktop Table View (sm+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Contributor</th>
                    <th className="py-3 px-4">Talent ID</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4 text-right">Total Paid Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLeaderboardLoading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-2" />
                        <p className="text-sm">Calculating server-side leaderboard standings...</p>
                      </td>
                    </tr>
                  ) : leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        <Trophy className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                        <p className="text-base font-semibold text-white">No leaderboard records yet</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Completed payouts will automatically rank contributors on this leaderboard.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {leaderboard.map((item) => (
                        <tr
                          key={item.rank}
                          className={`transition-colors ${
                            item.is_current_user
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/15 font-semibold text-white'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-black">
                            <div className="flex items-center gap-1.5">
                              {item.rank === 1 ? (
                                <Crown className="w-4 h-4 text-amber-300" />
                              ) : item.rank === 2 ? (
                                <Medal className="w-4 h-4 text-slate-300" />
                              ) : item.rank === 3 ? (
                                <Award className="w-4 h-4 text-amber-600" />
                              ) : (
                                <span className="text-slate-500 text-xs w-4 text-center">#{item.rank}</span>
                              )}
                              <span className="text-sm">#{item.rank}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                {item.is_current_user
                                  ? talentProfile?.full_name || item.name
                                  : item.name}
                              </span>
                              {item.is_current_user && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono block mt-0.5">
                              {item.email_masked}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                            {item.talent_id && item.talent_id !== 'NA'
                              ? item.talent_id
                              : item.is_current_user && talentProfile?.registration_code
                              ? talentProfile.registration_code
                              : 'NA'}
                          </td>

                          <td className="py-3.5 px-4">
                            {renderGradeBadge(item.grade)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-base whitespace-nowrap">
                            ₹{item.total_paid.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}

                      {/* Neighborhood for users ranked outside Top 10 */}
                      {leaderboardPosition.rank &&
                        leaderboardPosition.rank > 10 &&
                        userNeighborhood.filter((n) => n.rank > 10).length > 0 && (
                          <>
                            <tr className="bg-white/[0.01]">
                              <td colSpan={5} className="py-2.5 text-center text-slate-500 font-bold tracking-widest text-sm">
                                • • •
                              </td>
                            </tr>
                            {userNeighborhood
                              .filter((n) => n.rank > 10)
                              .map((item) => (
                                <tr
                                  key={item.rank}
                                  className={`transition-colors ${
                                    item.is_current_user
                                      ? 'bg-emerald-500/15 hover:bg-emerald-500/20 font-semibold text-white ring-1 ring-emerald-500/30'
                                      : 'hover:bg-white/[0.02]'
                                  }`}
                                >
                                  <td className="py-3.5 px-4 font-black">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-500 text-xs w-4 text-center">#{item.rank}</span>
                                      <span className="text-sm">#{item.rank}</span>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-white">
                                        {item.is_current_user
                                          ? talentProfile?.full_name || item.name
                                          : item.name}
                                      </span>
                                      {item.is_current_user && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold uppercase shadow-sm">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-slate-400 font-mono block mt-0.5">
                                      {item.email_masked}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                                    {item.talent_id && item.talent_id !== 'NA'
                                      ? item.talent_id
                                      : item.is_current_user && talentProfile?.registration_code
                                      ? talentProfile.registration_code
                                      : 'NA'}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    {renderGradeBadge(item.grade)}
                                  </td>

                                  <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-base whitespace-nowrap">
                                    ₹{item.total_paid.toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                          </>
                        )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="md:hidden divide-y divide-white/5">
              {isLeaderboardLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-400 mb-2" />
                  <p className="text-xs">Loading rankings...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-slate-400 px-4">
                  <Trophy className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-white">No rankings yet</p>
                </div>
              ) : (
                <>
                  {leaderboard.map((item) => (
                    <div
                      key={item.rank}
                      className={`p-3.5 flex items-center justify-between gap-3 ${
                        item.is_current_user ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs shrink-0 text-amber-300">
                          #{item.rank}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-white text-sm truncate">
                              {item.is_current_user
                                ? talentProfile?.full_name || item.name
                                : item.name}
                            </p>
                            {item.is_current_user && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            {item.email_masked}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="text-sm font-black text-emerald-400">
                          ₹{item.total_paid.toLocaleString('en-IN')}
                        </p>
                        {renderGradeBadge(item.grade)}
                      </div>
                    </div>
                  ))}

                  {/* Mobile Neighborhood for users outside Top 10 */}
                  {leaderboardPosition.rank &&
                    leaderboardPosition.rank > 10 &&
                    userNeighborhood.filter((n) => n.rank > 10).length > 0 && (
                      <>
                        <div className="py-2.5 text-center text-slate-500 font-bold tracking-widest text-xs">
                          • • •
                        </div>
                        {userNeighborhood
                          .filter((n) => n.rank > 10)
                          .map((item) => (
                            <div
                              key={item.rank}
                              className={`p-3.5 flex items-center justify-between gap-3 ${
                                item.is_current_user ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs shrink-0 text-slate-300">
                                  #{item.rank}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-white text-sm truncate">
                                      {item.is_current_user
                                        ? talentProfile?.full_name || item.name
                                        : item.name}
                                    </p>
                                    {item.is_current_user && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 font-bold shrink-0">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono truncate">
                                    {item.email_masked}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                <p className="text-sm font-black text-emerald-400">
                                  ₹{item.total_paid.toLocaleString('en-IN')}
                                </p>
                                {renderGradeBadge(item.grade)}
                              </div>
                            </div>
                          ))}
                      </>
                    )}
                </>
              )}
            </div>

            {/* Pagination */}
            {!isLeaderboardLoading && leaderboard.length > 0 && leaderboardTotalPages > 1 && (
              <div className="bg-white/[0.02] border-t border-white/10 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {leaderboardPage} of {leaderboardTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}
                    disabled={leaderboardPage === 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setLeaderboardPage((p) => Math.min(leaderboardTotalPages, p + 1))}
                    disabled={leaderboardPage >= leaderboardTotalPages}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3D CONTRIBUTOR JOURNEY MODAL ── */}
      <ContributorJourneyModal
        isOpen={isJourneyModalOpen}
        onClose={() => setIsJourneyModalOpen(false)}
        summary={summary}
        talentProfile={talentProfile}
        user={user}
        leaderboard={leaderboard}
        userRank={userRank ?? null}
        currentTier={currentTier}
        allTiers={TIER_CONFIG}
      />
    </div>
  );
};
