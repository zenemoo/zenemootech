import React from 'react';
import {
  Activity,
  Clock,
  Calendar,
  ShieldCheck,
  Users,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Database,
  Award,
} from 'lucide-react';
import { CountUp } from './CountUp';

interface StatMetric {
  id: string;
  value: number;
  suffix: string;
  decimals: number;
  label: string;
  subtext: string;
  footer: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  iconBg: string;
  labelColor: string;
  glow: string;
}

const STATS: StatMetric[] = [
  {
    id: 'daily',
    value: 500,
    suffix: '+',
    decimals: 0,
    label: 'Daily Output Capacity',
    subtext: 'Minutes / Day',
    footer: 'Reviewed & QC Checked',
    icon: Clock,
    color: 'from-cyan-500 to-blue-500',
    borderColor: 'border-blue-500/20 hover:border-blue-500/40',
    iconBg: 'bg-blue-950/40 border-blue-500/30 text-blue-400',
    labelColor: 'text-blue-400',
    glow: 'hover:shadow-blue-500/10',
  },
  {
    id: 'monthly',
    value: 10000,
    suffix: '+',
    decimals: 0,
    label: 'Monthly Production Target',
    subtext: 'Minutes / Month',
    footer: 'Scalable for Large Datasets',
    icon: Calendar,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/20 hover:border-purple-500/40',
    iconBg: 'bg-purple-950/40 border-purple-500/30 text-purple-400',
    labelColor: 'text-purple-400',
    glow: 'hover:shadow-purple-500/10',
  },
  {
    id: 'quality',
    value: 99.9,
    suffix: '%+',
    decimals: 1,
    label: 'Quality & Accuracy Rate',
    subtext: 'Super QC Verified',
    footer: 'Human Verified Quality',
    icon: ShieldCheck,
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400',
    labelColor: 'text-emerald-400',
    glow: 'hover:shadow-emerald-500/10',
  },
  {
    id: 'team',
    value: 50,
    suffix: '+',
    decimals: 0,
    label: 'Total Active Team',
    subtext: '40 Transcribers + 10 QC',
    footer: 'Dedicated Team',
    icon: Users,
    color: 'from-blue-500 to-indigo-500',
    borderColor: 'border-indigo-500/20 hover:border-indigo-500/40',
    iconBg: 'bg-indigo-950/40 border-indigo-500/30 text-blue-400',
    labelColor: 'text-blue-400',
    glow: 'hover:shadow-indigo-500/10',
  },
];

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    desc: 'Data security & privacy standards',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: Database,
    title: 'Scalable Production',
    desc: 'Built for large-scale AI data production',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Clock,
    title: 'On-Time Delivery',
    desc: 'Consistent delivery with zero compromise',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Award,
    title: 'Global Standards',
    desc: 'Aligned with industry best practices',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
];

export const TelemetryStats: React.FC = () => {
  return (
    <section
      id="telemetry"
      aria-label="Production Capacity and Telemetry"
      className="py-16 sm:py-24 lg:py-28 relative z-10 bg-[#050711] overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200"
    >
      {/* Subtle Background Ambient Lighting Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[350px] bg-gradient-to-b from-cyan-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-72 h-72 bg-purple-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Centered Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* ── 1. SECTION HEADER ── */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-mono font-bold tracking-wider uppercase shadow-lg shadow-cyan-500/10">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Production Capacity &amp; Telemetry</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
            High-Volume Language Data Output
          </h2>

          <p className="text-slate-400 text-sm sm:text-base md:text-lg leading-relaxed font-sans max-w-2xl mx-auto">
            Structured production workflows, daily delivery targets, and dedicated review pipelines for AI datasets, data annotation, and enterprise transcription.
          </p>
        </div>

        {/* ── 2. FOUR METRIC BIG CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.id}
                className={`rounded-2xl sm:rounded-3xl bg-[#080d1a]/85 backdrop-blur-xl border ${stat.borderColor} p-5 sm:p-6 transition-all duration-300 relative group overflow-hidden shadow-xl ${stat.glow} flex flex-col justify-between`}
              >
                {/* Top Glowing Accent Line */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`} />

                <div>
                  {/* Top-Left Icon in Rounded Square */}
                  <div className="mb-4">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center ${stat.iconBg} transition-transform duration-300 group-hover:scale-105`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Animated Count-Up Number */}
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-white tracking-tight mb-2 group-hover:scale-[1.02] transition-transform duration-300">
                    <CountUp end={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                  </div>

                  {/* Highlighted Metric Label */}
                  <div className={`text-sm sm:text-base font-bold font-display ${stat.labelColor}`}>
                    {stat.label}
                  </div>

                  {/* Subtext */}
                  <div className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
                    {stat.subtext}
                  </div>
                </div>

                {/* Footer Section with Thin Divider */}
                <div className="mt-5 pt-3 border-t border-white/5 text-xs text-slate-400 font-sans flex items-center justify-between">
                  <span>{stat.footer}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. AI DATA TRAINING & DATASET SERVICES BANNER ── */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#080d19]/90 border border-white/10 p-5 sm:p-7 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6">
            {/* Left Content with AI Icon */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/40">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold font-display text-white">
                  AI Data Training &amp; Dataset Services
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-2xl">
                  Full-lifecycle AI data training datasets, multimodal data annotation, speech-to-text transcription, and human-verified Super QC pipelines.
                </p>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
              <a
                href="/ai-data"
                className="px-5 py-2.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/40 font-mono text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-cyan-500/10 cursor-pointer"
              >
                <span>AI Data Training &amp; Datasets</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="/zenemooai"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-mono text-xs sm:text-sm font-semibold shadow-lg shadow-purple-950/60 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Explore Zenemoo AI</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* ── 4. FOUR TRUST PILLARS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST_PILLARS.map((pillar, idx) => {
            const PillarIcon = pillar.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#080d19]/70 border border-white/5 p-4 sm:p-5 flex items-center gap-3.5 hover:border-white/10 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full ${pillar.bg} flex items-center justify-center shrink-0`}>
                  <PillarIcon className={`w-5 h-5 ${pillar.color}`} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white truncate font-display">
                    {pillar.title}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate font-sans">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 5. BOTTOM TRUST STATEMENT ── */}
        <div className="text-center pt-2">
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            Trusted by global AI teams, language tech companies, and enterprise platforms for high-quality data operations.
          </p>
        </div>
      </div>
    </section>
  );
};
