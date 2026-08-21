import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Server, Users, CheckCircle2, Clock, Award, ShieldCheck, Sparkles, ArrowRight, Database, Bot, BrainCircuit } from 'lucide-react';
import { CountUp } from './CountUp';

export const TelemetryStats: React.FC = () => {
  const [dailyOutput, setDailyOutput] = useState(512);

  useEffect(() => {
    const interval = setInterval(() => {
      setDailyOutput(Math.floor(500 + Math.random() * 25));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: 'Daily Output Capacity',
      end: 500,
      suffix: '+ Mins',
      decimals: 0,
      sub: 'Reviewed & QC Checked',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Monthly Production Target',
      end: 10000,
      suffix: '+ Mins',
      decimals: 0,
      sub: 'Scalable for Large Datasets',
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Quality & Accuracy Rate',
      end: 99.9,
      suffix: '%+',
      decimals: 1,
      sub: 'Super QC Verified',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Total Active Team',
      end: 50,
      suffix: '+ Members',
      decimals: 0,
      sub: '40 Transcribers + 10 QC',
      color: 'from-blue-500 to-indigo-500',
    },
  ];

  return (
    <section id="telemetry" className="py-24 relative z-10 bg-[#07080d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            PRODUCTION CAPACITY &amp; TELEMETRY
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            High-Volume Language Data Output
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Structured production workflows, daily delivery targets, and dedicated review pipelines for AI datasets, data annotation, and enterprise transcription.
          </p>
        </div>

        {/* 4 KPI Big Counter Cards with Animated CountUp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all duration-300 relative group overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`}></div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight mb-2 group-hover:scale-105 transition-transform duration-300">
                <CountUp end={stat.end} decimals={stat.decimals} suffix={stat.suffix} />
              </div>
              <div className="text-sm font-semibold text-slate-200">{stat.label}</div>
              <div className="text-xs text-slate-400 mt-1 font-mono">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* AI Capability Banner & Direct Navigation CTAs */}
        <div className="mb-12 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-blue-950/40 border border-cyan-500/20 p-4 sm:p-5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
                <span>Enterprise AI Data &amp; Multilingual Workflows</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Full-lifecycle AI data training datasets, multimodal data annotation, speech-to-text transcription, and human-verified Super QC pipelines.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 md:pt-0">
              <a
                href="/ai-data"
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold transition-all flex items-center gap-1.5 group shadow-lg shadow-cyan-500/10 cursor-pointer"
              >
                <span>AI Data Training &amp; Dataset Services</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="/zenemooai"
                className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-mono text-xs font-bold transition-all flex items-center gap-1.5 group shadow-lg shadow-purple-500/10 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Explore Zenemoo AI →</span>
              </a>
            </div>
          </div>
        </div>

        {/* Real-time Team Capacity Console */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold font-display text-white">Zenemo Tech — Team Capacity Console</h3>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Vendor: DesiCrew Solutions • Active Since 2023 • Founder: Prem Prasad Pradhan
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Status: ACTIVE PRODUCTION
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                Avg Work Time: 5 Hrs / Member
              </span>
            </div>
          </div>

          {/* Telemetry JSON Display */}
          <div className="mt-6 bg-black/60 rounded-xl p-6 border border-white/10 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <div className="text-slate-500 mb-2">// team_capacity.json</div>
            <pre className="text-cyan-300">
{`{
  "company": "Zenemo Tech",
  "founder_lead": "Prem Prasad Pradhan",
  "primary_partner": "DesiCrew Solutions",
  "active_vendor_years": "1.5+",
  "team_breakdown": {
    "transcribers_and_annotators": 40,
    "reviewers_and_qc_specialists": 10,
    "project_coordinators": 2,
    "total_active_workforce": "50+ Members"
  },
  "core_ai_data_pipelines": [
    "AI Training Datasets",
    "Audio Speech Transcription",
    "Data Annotation & NLP Tagging",
    "Multilingual Language Data",
    "Super QC Human Verification"
  ],
  "languages_supported": ["Hindi", "English (Indian)", "Odia", "Bengali", "23+ Regional Dialects"],
  "daily_production_capacity": "500+ minutes",
  "monthly_production_capacity": "10,000+ minutes",
  "quality_assurance_rate": "99.9%+ accuracy",
  "ai_platform_integration": "Zenemoo AI & Android Data Collector Platform"
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
