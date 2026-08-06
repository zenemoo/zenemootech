import React, { useState, useEffect } from 'react';
import { Handshake, ExternalLink, Quote, Building, CheckCircle2, Sparkles, Globe2 } from 'lucide-react';
import { PartnerCompany, getStoredPartners } from '../lib/partnerStore';
import { SeoImage } from '../seo/components/SeoImage';

export const Partner: React.FC = () => {
  const [partnerList, setPartnerList] = useState<PartnerCompany[]>([]);

  useEffect(() => {
    getStoredPartners().then((data) => {
      const activeOnly = data.filter((p) => p.status === 'active');
      setPartnerList(activeOnly.length > 0 ? activeOnly : []);
    });
  }, []);

  // Generate repeated list for seamless infinite marquee scrolling (right to left)
  const getMarqueeItems = (list: PartnerCompany[]) => {
    if (list.length === 0) return [];
    let items = [...list];
    while (items.length < 8) {
      items = [...items, ...list];
    }
    return [...items, ...items];
  };

  const marqueeItems = getMarqueeItems(partnerList);

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
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-[1px] shadow-xl shadow-emerald-500/20 overflow-hidden">
                <div className="w-full h-full bg-[#0a0c14] rounded-[15px] flex items-center justify-center p-2">
                  <SeoImage
                    src="https://res.cloudinary.com/rwoe0mm9/image/upload/v1785224476/zenemoo/team/bpdmgzavltahmfrmajbl.png"
                    alt="DesiCrew Solutions Official Enterprise Partner Logo — Zenemoo"
                    width={80}
                    height={80}
                    objectFit="contain"
                    className="w-full h-full rounded-xl"
                  />
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
        <div className="max-w-4xl mx-auto glass-panel rounded-3xl p-8 sm:p-10 border border-white/10 relative overflow-hidden text-center mb-16">
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

        {/* CONTINUOUS SLIDING RIGHT-TO-LEFT MARQUEE BANNER */}
        {partnerList.length > 0 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> COLLABORATING ECOSYSTEM &amp; CLIENT DATA PIPELINES
              </div>
              <h3 className="text-xl font-bold font-display text-white">
                Organizations &amp; AI Frameworks We Work With
              </h3>
            </div>

            {/* Marquee Container with Gradient Side Masks */}
            <div className="relative overflow-hidden py-4 rounded-2xl bg-white/[0.01] border border-white/5">
              {/* Left & Right Gradient Fade Overlays */}
              <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[#050507] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-[#050507] to-transparent z-10 pointer-events-none"></div>

              {/* Ticker Container - Continuous Right to Left */}
              <div className="animate-marquee gap-4 px-4">
                {marqueeItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => {
                      if (item.website_url) {
                        window.open(item.website_url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="px-6 py-4 rounded-2xl glass-panel glass-panel-interactive border border-white/10 flex items-center gap-4 shrink-0 group cursor-pointer"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-10 h-10 object-contain rounded-xl shrink-0 bg-white/5 p-1 border border-white/10 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="p-2.5 rounded-xl border text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shrink-0">
                        <Globe2 className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-display text-sm text-white group-hover:text-cyan-300 transition-colors">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold border text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{item.role || 'Data Solution Partner'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
