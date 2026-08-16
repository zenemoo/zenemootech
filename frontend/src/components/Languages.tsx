import React from 'react';
import { Languages as LangIcon, CheckCircle2, Clock, Globe } from 'lucide-react';

export const Languages: React.FC = () => {
  const primaryLangs = [
    { name: 'Hindi', script: 'हिन्दी', sample: 'अ आ इ', flag: '🇮🇳', badge: 'Active • Supported' },
    { name: 'English', script: 'Indian English', sample: 'A B C', flag: '🇬🇧', badge: 'Active • Supported' },
    { name: 'Odia', script: 'ଓଡ଼ିଆ', sample: 'ଅ ଆ ଇ', flag: '🏛️', badge: 'Active • Supported' },
  ];

  const supportedLangs = [
    { name: 'Bengali', script: 'বাংলা', sample: 'অ আ ই', flag: '🌐', badge: 'Active • Supported' },
    { name: 'Telugu', script: 'తెలుగు', sample: 'అ ఆ ఇ', flag: '🌐', badge: 'Active • Supported' },
    { name: 'Tamil', script: 'தமிழ்', sample: 'அ ஆ இ', flag: '🌐', badge: 'Active • Supported' },
  ];

  return (
    <section id="languages" className="py-24 relative z-10 bg-[#06070a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <LangIcon className="w-3.5 h-3.5" />
            23+ LANGUAGES SUPPORTED
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Languages We Work In
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Our network includes 50+ members across India, supporting 23+ languages with native speakers and regional-language capabilities.
          </p>
        </div>

        {/* Primary Languages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {primaryLangs.map((lang, i) => (
            <div
              key={i}
              className="glass-panel p-6 rounded-2xl border border-white/10 text-center relative group hover:border-cyan-500/40 transition-all duration-300"
            >
              <div className="text-4xl mb-3">{lang.flag}</div>
              <h3 className="text-xl font-bold font-display text-white mb-1">{lang.name}</h3>
              <div className="text-xs font-mono text-cyan-400 mb-2">{lang.script} ({lang.sample})</div>
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-semibold">
                {lang.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Supported Languages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {supportedLangs.map((lang, i) => (
            <div
              key={i}
              className="glass-panel p-5 rounded-2xl border border-white/5 text-center relative group hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="text-3xl mb-2">{lang.flag}</div>
              <h4 className="text-base font-bold font-display text-white mb-0.5">{lang.name}</h4>
              <div className="text-xs font-mono text-purple-400 mb-2">{lang.script}</div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                {lang.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Language Capability Matrix Table */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="px-6 py-4 bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20 border-b border-white/10">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Multilingual Language Capability Overview
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead className="bg-white/[0.03] text-slate-200 uppercase text-[11px] border-b border-white/10">
                <tr>
                  <th className="p-4">Language</th>
                  <th className="p-4 text-center">Transcription</th>
                  <th className="p-4 text-center">Data Annotation</th>
                  <th className="p-4 text-center">Voice Over</th>
                  <th className="p-4 text-center">Capability Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white flex items-center gap-2">🇮🇳 Hindi</td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-cyan-400 font-bold">Active • Supported</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white flex items-center gap-2">🇬🇧 English (Indian)</td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-cyan-400 font-bold">Active • Supported</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white flex items-center gap-2">🏛️ Odia</td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-cyan-400 font-bold">Active • Supported</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-slate-300 flex items-center gap-2">🌐 23+ Indian &amp; Regional Languages</td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400"><CheckCircle2 className="w-4 h-4 mx-auto" /></td>
                  <td className="p-4 text-center text-emerald-400 font-semibold">Active • Supported</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
