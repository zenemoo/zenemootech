import React from 'react';
import { Handshake, ExternalLink, Quote, Building, CheckCircle2, Award, Star } from 'lucide-react';

export const Partner: React.FC = () => {
  return (
    <section id="partner" className="py-24 relative z-10 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-4">
            <Handshake className="w-3.5 h-3.5" />
            ENTERPRISE COLLABORATION
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Our Enterprise Partner
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            We have been collaborating with <span className="text-emerald-400 font-semibold">DesiCrew Solutions</span> for over 1.5+ years, contributing to enterprise language data and AI dataset projects through transcription, annotation, and data processing services.
          </p>
        </div>

        {/* Partner Showcase Card */}
        <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-white/10 relative overflow-hidden mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info */}
            <div className="lg:col-span-5 text-center lg:text-left space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-[1px] shadow-xl shadow-emerald-500/20">
                <div className="w-full h-full bg-[#0a0c14] rounded-[15px] flex items-center justify-center">
                  <Building className="w-10 h-10 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold font-display text-white">DesiCrew Solutions</h3>
              <a
                href="https://www.desicrew.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:underline"
              >
                www.desicrew.in
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left font-mono text-xs space-y-2.5">
                <div className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">Partnership Status</div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Active Vendor — Certified Since 2023</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>AI Datasets &amp; Speech Corpus Production</span>
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Multilingual Transcription &amp; Annotation</span>
                </div>
              </div>
            </div>

            {/* Right Overview */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xl font-bold font-display text-white">About DesiCrew Solutions</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                DesiCrew Solutions is an India-based business process outsourcing and language data services company that supports AI, machine learning, and enterprise data processing projects. The company operates delivery centers across India and provides services such as data annotation, transcription, data processing, and back-office support for global clients.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Our team at <strong className="text-white">Zenemo Tech</strong> works as part of the extended delivery network supporting multilingual data production, transcription, annotation, and AI training dataset preparation projects.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-center font-mono">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-emerald-400">1.5+ Yrs</div>
                  <div className="text-[10px] text-slate-400">Collaboration</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-cyan-400">20+</div>
                  <div className="text-[10px] text-slate-400">Team Members</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-purple-400">3</div>
                  <div className="text-[10px] text-slate-400">Languages</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-lg font-bold text-blue-400">AI</div>
                  <div className="text-[10px] text-slate-400">Data Projects</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Card */}
        <div className="max-w-4xl mx-auto glass-panel rounded-3xl p-8 sm:p-10 border border-white/10 relative overflow-hidden text-center">
          <Quote className="w-12 h-12 text-cyan-500/20 mx-auto mb-4" />
          <p className="text-lg sm:text-xl text-slate-200 font-normal italic leading-relaxed mb-6">
            "They consistently deliver projects on time with good quality and follow project guidelines properly. The team is reliable, responsive, and easy to work with for ongoing language data and transcription projects."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 font-bold font-display text-white flex items-center justify-center text-lg shadow-lg">
              V
            </div>
            <div className="text-left">
              <div className="text-white font-bold font-display">Viji M.P.</div>
              <div className="text-xs font-mono text-cyan-400">Team Leader • DesiCrew Solutions</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
