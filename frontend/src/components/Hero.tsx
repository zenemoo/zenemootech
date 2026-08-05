import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Mic, Tags, Volume2, Globe, Users, Calendar, Mail, Play, Pause } from 'lucide-react';
import { CountUp } from './CountUp';

export const Hero: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Audio playback simulation fallback:', err.message);
            setIsPlaying(!isPlaying);
          });
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section className="relative pt-24 pb-20 md:pt-28 md:pb-24 overflow-hidden bg-noise">
      {/* Background Lights & Aurora */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-1"></div>
        <div className="aurora-blob aurora-2"></div>
        <div className="aurora-blob aurora-3"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Top Pill Badge with Official Logo */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl mb-8 group hover:border-cyan-500/40 transition-all duration-300 shadow-lg">
            <img src="/assets/logo.png" alt="ZENEMOO Logo" className="w-6 h-6 rounded-full bg-white p-0.5 shadow" />
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-mono text-cyan-300 uppercase tracking-wider font-semibold">
              Trusted DesiCrew Vendor • Est. 2023
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
              99%+ Quality Rate &rarr;
            </span>
          </div>

          {/* Cinematic Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold font-display tracking-tight text-white leading-[1.08] mb-6">
            Professional <br className="hidden sm:inline" />
            <span className="text-gradient-hero">Language &amp; Data Services</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto mb-10">
            We are <strong className="text-white font-semibold">Zenemoo Data Solutions</strong> — a specialized team delivering high-accuracy <span className="text-cyan-300 font-semibold">audio transcription</span>, <span className="text-purple-300 font-semibold">data annotation</span>, and <span className="text-blue-300 font-semibold">multilingual voice over</span> services to enterprises and AI technology companies. Delivering 100% output to <strong className="text-emerald-400 font-semibold">DesiCrew Solutions</strong> since 2023.
          </p>

          {/* Glass CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a
              href="#contact"
              className="w-full sm:w-auto relative group overflow-hidden rounded-2xl p-[1px] font-semibold text-sm shadow-xl shadow-cyan-500/25"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 group-hover:scale-105 transition-transform duration-300"></span>
              <span className="relative flex items-center justify-center gap-3 px-8 py-4 bg-[#08090e] rounded-[15px] text-white group-hover:bg-transparent transition-colors duration-200">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:text-white" />
                Hire Our Team
                <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>

            <a
              href="mailto:contact@zenemoo.in"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-slate-200 hover:text-white font-medium text-sm backdrop-blur-xl hover:bg-white/[0.08] transition-all duration-200"
            >
              <Mail className="w-4 h-4 text-purple-400" />
              Email Us Now
            </a>
          </div>
        </div>

        {/* Floating KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16 max-w-5xl mx-auto">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400 mb-1">
              <CountUp end={1.5} decimals={1} suffix="+ Yrs" />
            </div>
            <div className="text-xs font-semibold text-slate-200">DesiCrew Partnership</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">Active Since 2023</div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-purple-400 mb-1">
              <CountUp end={99} decimals={0} suffix="%+" />
            </div>
            <div className="text-xs font-semibold text-slate-200">Quality &amp; Accuracy Rate</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">Passes Super QC</div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 mb-1">
              <CountUp end={180} decimals={0} suffix="+ Mins" />
            </div>
            <div className="text-xs font-semibold text-slate-200">Daily Production Output</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">3,600+ Mins / Month</div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-blue-400 mb-1">
              <CountUp end={20} decimals={0} suffix="+" />
            </div>
            <div className="text-xs font-semibold text-slate-200">Trained Specialists</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">Hindi • English • Odia</div>
          </div>
        </div>

        {/* Interactive Audio Transcription & Annotation Visualizer Card */}
        <div className="max-w-5xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-600 to-blue-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

          <div className="relative glass-panel rounded-2xl overflow-hidden border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 font-mono text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span className="text-white font-semibold ml-2">zenemo_tech_language_pipeline_studio.json</span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-cyan-400 font-semibold">
                <span>QC Status: APPROVED (99.4%)</span>
              </div>
            </div>

            {/* Audio Waveform Simulator */}
            <div className="bg-black/60 rounded-xl p-4 sm:p-6 border border-white/10 font-mono text-xs text-slate-300 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <audio
                    ref={audioRef}
                    src="/assets/wellcomeaudio.mp3"
                    onEnded={() => setIsPlaying(false)}
                    onError={() => console.log('Audio file /assets/wellcomeaudio.mp3 not found yet')}
                  />
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/30 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div>
                    <div className="text-white font-bold text-sm">English &amp; Odia Speech Transcription Sample</div>
                    <div className="text-[11px] text-slate-400">DesiCrew AI Dataset Pipeline • Speaker Diarization Active</div>
                  </div>
                </div>
                <div className="text-emerald-400 font-bold">Verbatim Accuracy: 99.8%</div>
              </div>

              {/* Animated Waveform Bars */}
              <div className="flex items-center gap-1 h-12 py-2 px-3 rounded-lg bg-slate-950 border border-white/5 overflow-hidden">
                {[40, 65, 30, 85, 95, 45, 70, 100, 60, 30, 75, 90, 40, 80, 55, 90, 70, 35, 85, 60, 45, 95, 70, 50, 80, 30, 65, 85, 40, 90, 60, 75].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      isPlaying ? 'bg-gradient-to-t from-cyan-500 to-purple-500 animate-pulse' : 'bg-slate-700'
                    }`}
                    style={{ height: isPlaying ? `${Math.max(15, Math.round(h * Math.random()))}%` : `${h}%` }}
                  ></div>
                ))}
              </div>

              {/* Sample Timestamps & Verbatim Text */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">00:01.24 - 00:04.80</span>
                  <span className="text-slate-200">Speaker 1 (Indian English): "Hello, our specialized data annotation and audio transcription team is fully ready for your project."</span>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">00:01.24 - 00:04.80</span>
                  <span className="text-slate-200">Speaker 1 (Odia Translation): "ନମସ୍କାର, ଆମର ବିଶେଷଜ୍ଞ ଡାଟା ଆନୋଟେସନ୍ ଏବଂ ଅଡିଓ ଟ୍ରାନ୍ସକ୍ରିପ୍ସନ୍ ଟିମ୍ ଆପଣଙ୍କ ପ୍ରକଳ୍ପ ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ଭାବେ ପ୍ରସ୍ତୁତ ଅଛି।"</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Logos Bar */}
        <div className="mt-20 pt-10 border-t border-white/10 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-8">
            PROVEN DELIVERABLE PARTNERSHIPS &amp; LANGUAGE FRAMEWORKS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-70">
            <span className="text-sm font-semibold font-mono text-emerald-400 hover:text-white transition-colors">
              DesiCrew Solutions (Vendor Since 2023)
            </span>
            <span className="text-sm font-semibold font-mono text-slate-300 hover:text-cyan-400 transition-colors">
              Hindi Audio Datasets
            </span>
            <span className="text-sm font-semibold font-mono text-slate-300 hover:text-purple-400 transition-colors">
              Indian English Transcripts
            </span>
            <span className="text-sm font-semibold font-mono text-slate-300 hover:text-cyan-400 transition-colors">
              Odia NLP &amp; Speech Corpus
            </span>
            <span className="text-sm font-semibold font-mono text-slate-300 hover:text-blue-400 transition-colors">
              Multi-Stage Super QC
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
