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
  CheckCircle2,
  Lock,
  Zap,
  Award,
  Globe2,
  FileCheck,
  Languages,
  Headphones,
  Check,
  Send,
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

const AI_SERVICES = [
  'AI Training Datasets',
  'Audio & Speech Transcription',
  'Data Annotation & NLP Tagging',
  'Multilingual Language Data',
  'Voice & Language Processing',
  'Human-in-the-Loop Validation',
  'Super QC Verification',
  'Enterprise Data Preparation',
];

const LANGUAGES = [
  'Hindi',
  'English (Indian)',
  'Odia',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Telugu',
  '23+ Regional Dialects',
];

const PIPELINE_STEPS = [
  { step: '01', title: 'Data Collection', sub: 'Acoustic & Domain Ingestion' },
  { step: '02', title: 'Transcription / Annotation', sub: 'Native Speaker Labeling' },
  { step: '03', title: 'AI Data Processing', sub: 'Segmentation & Formatting' },
  { step: '04', title: 'Human Review', sub: 'Linguistic Guideline Audit' },
  { step: '05', title: 'Super QC Verification', sub: 'Zero Error Leakage Pass' },
  { step: '06', title: 'Enterprise Delivery', sub: 'Structured Dataset Export' },
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
      {/* Subtle Background Lighting Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[350px] bg-gradient-to-b from-cyan-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-72 h-72 bg-purple-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Container - Controlled Max Width for 1080p, 1440p & 4K */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* ── 1. SECTION HEADER (Exact reference match) ── */}
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

        {/* ── 2. FOUR METRIC BIG CARDS (Exact reference card structure & layout) ── */}
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

        {/* ── 3. AI DATA TRAINING & DATASET SERVICES BANNER (Exact screenshot match) ── */}
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

        {/* ── 4. TWO-COLUMN CORE CAPABILITIES: AI SERVICES & DELIVERY TEAM ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: AI Services Matrix */}
          <div className="rounded-2xl sm:rounded-3xl bg-[#080d19]/80 border border-white/10 p-5 sm:p-7 space-y-4 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-white">
                  AI Data Training &amp; Dataset Services
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Comprehensive language, voice, and data preparation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {AI_SERVICES.map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/25 transition-colors text-xs text-slate-300 font-sans"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-medium truncate">{service}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Our Delivery Team */}
          <div className="rounded-2xl sm:rounded-3xl bg-[#080d19]/80 border border-white/10 p-5 sm:p-7 space-y-4 backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold font-display text-white">
                      Our Delivery Team
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      50+ Dedicated active members across India
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold">
                  Active
                </span>
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-sans mb-1.5">
                    <span className="text-slate-300 font-medium">Transcribers &amp; Annotators</span>
                    <span className="font-mono font-bold text-white">40 Members</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 w-[80%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-sans mb-1.5">
                    <span className="text-slate-300 font-medium">Reviewers &amp; QC Specialists</span>
                    <span className="font-mono font-bold text-emerald-400">10 Specialists</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 w-[20%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-sans mb-1.5">
                    <span className="text-slate-300 font-medium">Project Coordinators</span>
                    <span className="font-mono font-bold text-purple-400">2 Leads</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 w-[100%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Primary Partner: DesiCrew Solutions</span>
              <span className="text-cyan-400 font-bold">Super QC Verified</span>
            </div>
          </div>
        </div>

        {/* ── 5. TWO-COLUMN: MULTILINGUAL COVERAGE & QUALITY PIPELINE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Multilingual Data Coverage */}
          <div className="rounded-2xl sm:rounded-3xl bg-[#080d19]/80 border border-white/10 p-5 sm:p-7 space-y-4 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-white">
                  Multilingual Data Coverage
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Built for Indian-language and regional-language AI data requirements.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {LANGUAGES.map((lang, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 text-xs font-mono text-slate-200 transition-colors"
                >
                  {lang}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed pt-1">
              Specialized linguistic expertise covering high-resource and low-resource regional dialects with strict phonetic and orthographic adherence.
            </p>
          </div>

          {/* Right Column: Human + AI Quality Pipeline */}
          <div className="rounded-2xl sm:rounded-3xl bg-[#080d19]/80 border border-white/10 p-5 sm:p-7 space-y-4 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-white">
                  Human + AI Quality Pipeline
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Zero error tolerance multi-stage quality control
                </p>
              </div>
            </div>

            {/* Sequential Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {PIPELINE_STEPS.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 hover:border-emerald-500/25 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">{item.step}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white truncate font-display">{item.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 6. FOUR TRUST PILLARS (Exact screenshot bottom pills) ── */}
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

        {/* ── 7. COMPANY-GRADE ENTERPRISE CTA SECTION ── */}
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0a1124] to-[#060913] border border-cyan-500/20 p-6 sm:p-10 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Ready for Enterprise-Scale Data Operations?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Talk to the Zenemoo team about multilingual transcription, annotation, AI training data, and high-volume production requirements.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 max-w-md mx-auto">
            <a
              href="/#contact"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-mono text-xs sm:text-sm font-extrabold shadow-lg shadow-cyan-500/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Discuss Your Project</span>
            </a>

            <a
              href="/zenemooai"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 font-mono text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Explore Zenemoo AI</span>
            </a>
          </div>

          <p className="text-[11px] font-mono text-slate-400 pt-4 border-t border-white/5">
            Trusted by global AI teams, language tech companies, and enterprise platforms for high-quality data operations.
          </p>
        </div>
      </div>
    </section>
  );
};
