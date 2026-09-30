import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  Crown,
  Medal,
  Shield,
  CheckCircle2,
  Lock,
  Zap,
  ArrowRight,
  User,
  CreditCard,
  Flag,
  Flame,
  ChevronRight,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TalentLeaderboardItem, TalentPaymentSummary } from '../../services/paymentWorkerApi';

export interface TierConfig {
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

interface ContributorJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: TalentPaymentSummary;
  talentProfile: any;
  user: any;
  leaderboard: TalentLeaderboardItem[];
  userRank?: number | null;
  currentTier: TierConfig;
  allTiers: Record<string, TierConfig>;
}

export const ContributorJourneyModal: React.FC<ContributorJourneyModalProps> = ({
  isOpen,
  onClose,
  summary,
  talentProfile,
  user,
  leaderboard,
  userRank,
  currentTier,
  allTiers,
}) => {
  const [activeTab, setActiveTab] = useState<'journey' | 'race'>('journey');

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Derive contributor identity safely
  const contributorName =
    talentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    'Zenemoo Contributor';

  const contributorEmail =
    talentProfile?.email ||
    user?.email ||
    'N/A';

  const contributorId =
    talentProfile?.registration_code ||
    (talentProfile?.id ? `ZEN-${String(talentProfile.id).slice(0, 6).toUpperCase()}` : 'N/A');

  const contributorAvatar =
    talentProfile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    null;

  const totalPaid = summary.total_paid || 0;

  // Ordinal Presentation Helper
  const formatOrdinal = (n: number | null | undefined) => {
    if (!n || n <= 0) return 'Unranked';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Ordered list of tier IDs from Bronze to Diamond
  const tierLevels: Array<'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'> = [
    'Bronze',
    'Silver',
    'Gold',
    'Platinum',
    'Diamond',
  ];

  const currentTierIndex = tierLevels.indexOf(currentTier.id);

  // Top 10 Slice for Race View
  const top10 = leaderboard.slice(0, 10);
  const currentUserItem = leaderboard.find((item) => item.is_current_user);
  const isCurrentUserInTop10 = top10.some((item) => item.is_current_user);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto custom-scrollbar">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#070914]/95 border border-white/15 rounded-3xl shadow-2xl shadow-cyan-950/50 backdrop-blur-2xl overflow-hidden z-10 my-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-white/10 bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform"
                style={{
                  background: currentTier.badgeBg,
                  border: `1px solid ${currentTier.badgeBorder}`,
                  boxShadow: currentTier.badgeGlow,
                }}
              >
                <Sparkles className="w-5 h-5" style={{ color: currentTier.primaryColor }} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide flex items-center gap-2">
                  <span>Contributor Journey</span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border"
                    style={{
                      backgroundColor: currentTier.badgeBg,
                      borderColor: currentTier.badgeBorder,
                      color: currentTier.badgeText,
                    }}
                  >
                    3D Visualizer
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Track your progression &amp; live standing in the Zenemoo ecosystem
                </p>
              </div>
            </div>

            {/* View Tab Switcher & Close */}
            <div className="flex items-center gap-2">
              <div className="hidden xs:flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveTab('journey')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'journey'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Tier Journey</span>
                </button>
                <button
                  onClick={() => setActiveTab('race')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'race'
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/30 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Top 10 Race</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Close Modal (Esc)"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex xs:hidden items-center justify-center p-2 border-b border-white/10 bg-black/40 gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('journey')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'journey'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Tier Journey</span>
            </button>
            <button
              onClick={() => setActiveTab('race')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'race'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Top 10 Race</span>
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-7 space-y-6 custom-scrollbar">
            {/* ── SCREEN 1: CONTRIBUTOR PROFILE + WINDING TIER PATH ── */}
            {activeTab === 'journey' && (
              <div className="space-y-6">
                {/* Contributor Profile Card (3D Glass Elevation) */}
                <div
                  className="relative rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border backdrop-blur-xl shadow-xl transition-all duration-300"
                  style={{
                    borderColor: currentTier.badgeBorder,
                    boxShadow: `0 10px 30px -10px ${currentTier.glowColor}`,
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left: Avatar & Identity */}
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      <div className="relative shrink-0">
                        {contributorAvatar ? (
                          <img
                            src={contributorAvatar}
                            alt={contributorName}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 shadow-md"
                            style={{ borderColor: currentTier.primaryColor }}
                          />
                        ) : (
                          <div
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white border-2 shadow-md"
                            style={{
                              backgroundColor: currentTier.badgeBg,
                              borderColor: currentTier.primaryColor,
                            }}
                          >
                            {contributorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div
                          className="absolute -bottom-1 -right-1 p-1 rounded-lg border shadow-sm"
                          style={{
                            backgroundColor: currentTier.primaryColor,
                            borderColor: '#000',
                          }}
                        >
                          <currentTier.icon className="w-3 h-3 text-black stroke-[2.5]" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                            {contributorName}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-sm"
                            style={{
                              backgroundColor: currentTier.badgeBg,
                              borderColor: currentTier.badgeBorder,
                              color: currentTier.badgeText,
                            }}
                          >
                            {currentTier.badgeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                          {contributorEmail}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1">
                          <span className="text-slate-500">Contributor ID:</span>
                          <span className="font-semibold text-slate-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            {contributorId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Cumulative Earnings Highlight */}
                    <div className="sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Total Verified Earnings
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        ₹{totalPaid.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-slate-400 ml-1.5">INR</span>
                      </span>
                      <div className="flex items-center sm:justify-end gap-1 text-[11px] text-emerald-400 mt-0.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{summary.payment_count || 0} Successful Payouts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 3D Winding Progression Path ── */}
                <div className="relative rounded-3xl p-5 sm:p-7 bg-[#090C1A] border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span>Contributor Tier Progression Path</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ascend through verified milestone levels to reach the pinnacle Diamond tier
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                      <span>Status:</span>
                      <strong style={{ color: currentTier.primaryColor }}>
                        {currentTier.name}
                      </strong>
                    </div>
                  </div>

                  {/* Winding S-Curve Path Nodes */}
                  <div className="relative flex flex-col gap-5 sm:gap-6 py-2">
                    {tierLevels.map((tierKey, idx) => {
                      const tier = allTiers[tierKey] || allTiers.Bronze;
                      const IconComponent = tier.icon;
                      const isCurrent = tierKey === currentTier.id;
                      const isPast = idx < currentTierIndex;
                      const isFuture = idx > currentTierIndex;

                      // Stagger alignment for curved/winding effect:
                      // Even index: slight left indent, Odd index: slight right indent
                      const offsetClass =
                        idx % 2 === 0
                          ? 'sm:translate-x-2'
                          : 'sm:translate-x-12 md:translate-x-16';

                      return (
                        <div
                          key={tierKey}
                          className={`relative flex items-center gap-4 transition-all duration-300 ${offsetClass}`}
                        >
                          {/* Left Connector Line */}
                          {idx < tierLevels.length - 1 && (
                            <div
                              className="absolute left-6 top-12 bottom-[-24px] w-[2px] z-0"
                              style={{
                                background: isPast
                                  ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.6), rgba(16, 185, 129, 0.3))'
                                  : isCurrent
                                  ? `linear-gradient(180deg, ${tier.primaryColor}, rgba(255,255,255,0.1))`
                                  : 'rgba(255, 255, 255, 0.08)',
                              }}
                            />
                          )}

                          {/* Node Icon Circle */}
                          <div
                            className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                              isCurrent
                                ? 'scale-110 shadow-xl ring-4 ring-offset-2 ring-offset-[#090C1A]'
                                : isPast
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-white/5 border-white/10 text-slate-500'
                            }`}
                            style={{
                              backgroundColor: isCurrent ? tier.badgeBg : undefined,
                              borderColor: isCurrent ? tier.primaryColor : undefined,
                              boxShadow: isCurrent ? tier.badgeGlow : undefined,
                              // ringColor: isCurrent ? tier.primaryColor : undefined,
                            }}
                          >
                            {isPast ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <IconComponent
                                className="w-5 h-5"
                                style={{
                                  color: isCurrent ? tier.primaryColor : undefined,
                                }}
                              />
                            )}

                            {/* Active Pulse Wave on Current Node */}
                            {isCurrent && (
                              <span
                                className="absolute -inset-1 rounded-2xl animate-ping opacity-25"
                                style={{ backgroundColor: tier.primaryColor }}
                              />
                            )}
                          </div>

                          {/* Node Description Card */}
                          <div
                            className={`flex-1 rounded-2xl p-3.5 sm:p-4 border transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                              isCurrent
                                ? 'bg-white/[0.05] shadow-lg'
                                : isPast
                                ? 'bg-white/[0.02] border-white/10 opacity-80'
                                : 'bg-white/[0.01] border-white/5 opacity-50'
                            }`}
                            style={{
                              borderColor: isCurrent ? tier.badgeBorder : undefined,
                              boxShadow: isCurrent ? `0 4px 20px -5px ${tier.glowColor}` : undefined,
                            }}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm sm:text-base text-white">
                                  {tier.name}
                                </span>

                                {isCurrent && (
                                  <span
                                    className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider animate-pulse"
                                    style={{
                                      backgroundColor: tier.primaryColor,
                                      color: '#000',
                                    }}
                                  >
                                    YOU ARE HERE
                                  </span>
                                )}

                                {isPast && (
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    COMPLETED
                                  </span>
                                )}

                                {isFuture && (
                                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" />
                                    LOCKED
                                  </span>
                                )}
                              </div>

                              <span className="text-xs text-slate-400 font-mono block mt-0.5">
                                Threshold: ₹{tier.minThreshold.toLocaleString('en-IN')}
                                {tier.nextThreshold !== tier.minThreshold ? ` – ₹${(tier.nextThreshold - 1).toLocaleString('en-IN')}` : '+'}
                              </span>
                            </div>

                            {/* Node Right Status */}
                            <div className="sm:text-right">
                              {isCurrent ? (
                                <div>
                                  <span className="text-xs font-mono font-bold text-white">
                                    ₹{totalPaid.toLocaleString('en-IN')}
                                  </span>
                                  {tier.nextMilestone && (
                                    <span className="text-[11px] text-slate-400 block font-mono">
                                      ₹{Math.max(0, tier.nextThreshold - totalPaid).toLocaleString('en-IN')} to {tier.nextMilestone}
                                    </span>
                                  )}
                                </div>
                              ) : isPast ? (
                                <span className="text-xs text-emerald-400 font-mono font-semibold">
                                  ✓ Achieved
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 font-mono">
                                  Goal: ₹{tier.minThreshold.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Next Milestone Card Bar at bottom of path */}
                  {currentTier.nextMilestone && (
                    <div
                      className="mt-6 p-4 rounded-2xl border bg-white/[0.02] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      style={{ borderColor: currentTier.badgeBorder }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: currentTier.badgeBg }}
                        >
                          <Trophy className="w-4 h-4" style={{ color: currentTier.primaryColor }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Next Target: <strong style={{ color: currentTier.primaryColor }}>{currentTier.nextMilestone} Contributor</strong>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Earn ₹{Math.max(0, currentTier.nextThreshold - totalPaid).toLocaleString('en-IN')} more to automatically advance to {currentTier.nextMilestone}.
                          </p>
                        </div>
                      </div>

                      <div className="w-full sm:w-48 shrink-0">
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              background: currentTier.progressGradient,
                              width: `${Math.min(100, Math.max(5, (totalPaid / currentTier.nextThreshold) * 100))}%`,
                              boxShadow: `0 0 10px ${currentTier.glowColor}`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SCREEN 2: TOP 10 RACING CIRCUIT VIEW ── */}
            {activeTab === 'race' && (
              <div className="space-y-6">
                {/* Circuit Banner */}
                <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Flag className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-white">
                        Zenemoo Top 10 Contributor Circuit
                      </h3>
                      <p className="text-xs text-slate-400">
                        Leaderboard standings based on verified cumulative payouts
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Your Rank</span>
                    <span className="text-xl font-black text-amber-300">
                      {userRank ? `#${userRank}` : 'Unranked'}
                    </span>
                  </div>
                </div>

                {/* Stylized Racing Track Grid */}
                <div className="space-y-3">
                  {top10.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Trophy className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="text-sm font-semibold text-white">No leaderboard records available</p>
                    </div>
                  ) : (
                    top10.map((item, index) => {
                      const isFirst = item.rank === 1;
                      const isSecond = item.rank === 2;
                      const isThird = item.rank === 3;
                      const isYou = item.is_current_user;

                      const itemTier = allTiers[item.grade] || allTiers.Bronze;

                      // Staggered curvature styling
                      const curveOffset =
                        index === 0
                          ? 'sm:translate-x-0'
                          : index === 1
                          ? 'sm:translate-x-3'
                          : index === 2
                          ? 'sm:translate-x-6'
                          : index % 2 === 0
                          ? 'sm:translate-x-4'
                          : 'sm:translate-x-8';

                      return (
                        <div
                          key={item.rank}
                          className={`relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-300 flex items-center justify-between gap-3 ${curveOffset} ${
                            isYou
                              ? 'bg-gradient-to-r from-cyan-950/40 via-cyan-900/30 to-blue-950/40 border-cyan-400/50 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/40'
                              : isFirst
                              ? 'bg-gradient-to-r from-amber-500/15 via-[#0A0D1E] to-[#0A0D1E] border-amber-400/40 shadow-md'
                              : isSecond
                              ? 'bg-gradient-to-r from-slate-400/10 via-[#0A0D1E] to-[#0A0D1E] border-slate-300/30'
                              : isThird
                              ? 'bg-gradient-to-r from-amber-700/10 via-[#0A0D1E] to-[#0A0D1E] border-amber-700/30'
                              : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                          }`}
                        >
                          {/* Rank Marker */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                                isFirst
                                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-md shadow-amber-500/20'
                                  : isSecond
                                  ? 'bg-slate-400/20 border-slate-300/50 text-slate-200'
                                  : isThird
                                  ? 'bg-amber-700/20 border-amber-600/50 text-amber-500'
                                  : 'bg-white/5 border-white/10 text-slate-400 font-mono'
                              }`}
                            >
                              {isFirst ? (
                                <Crown className="w-5 h-5 text-amber-300" />
                              ) : isSecond ? (
                                <Medal className="w-5 h-5 text-slate-300" />
                              ) : isThird ? (
                                <Award className="w-5 h-5 text-amber-600" />
                              ) : (
                                `#${item.rank}`
                              )}
                            </div>

                            {/* Participant Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm sm:text-base text-white truncate">
                                  {isYou ? contributorName : item.name}
                                </span>

                                {isYou && (
                                  <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                                    YOU ARE HERE
                                  </span>
                                )}

                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: itemTier.badgeBg,
                                    border: `1px solid ${itemTier.badgeBorder}`,
                                    color: itemTier.badgeText,
                                  }}
                                >
                                  {item.grade}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 font-mono block truncate">
                                {item.email_masked}
                              </span>
                            </div>
                          </div>

                          {/* Earnings Amount */}
                          <div className="text-right shrink-0">
                            <span className="text-sm sm:text-base font-black text-emerald-400">
                              ₹{item.total_paid.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-500 block uppercase font-mono">
                              Verified
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* If user is outside top 10, show a dedicated standing card */}
                  {!isCurrentUserInTop10 && userRank && userRank > 10 && (
                    <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-300 shrink-0">
                          #{userRank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {contributorName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-black uppercase">
                              YOU
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            Current Standing ({formatOrdinal(userRank)} Position)
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-emerald-400">
                          ₹{totalPaid.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-cyan-300 block font-mono">
                          {currentTier.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 sm:px-7 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono text-[11px] text-slate-500">
              Zenemoo Contributor Hub &bull; Live Progression
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
