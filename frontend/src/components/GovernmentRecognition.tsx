import React, { useState } from 'react';
import { Award, ShieldCheck, CheckCircle2, Copy, Check, ExternalLink, Building2, Calendar, FileText, Landmark } from 'lucide-react';

export const GovernmentRecognition: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const regNumber = 'UDYAM-OD-11-0124893';

  const copyRegNumber = () => {
    navigator.clipboard.writeText(regNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="credentials" className="py-24 relative z-10 bg-[#050507] border-t border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono tracking-wider uppercase">
            <Landmark className="w-4 h-4 text-cyan-400" />
            OFFICIAL GOVT. CREDENTIALS
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight">
            Government Registered Enterprise
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Zenemoo is an officially registered Micro Enterprise under the Ministry of Micro, Small and Medium Enterprises (MSME), Government of India.
          </p>

          {/* Verification Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Government Verified
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> MSME Registered
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-semibold">
              <Award className="w-3.5 h-3.5" /> Official UDYAM Registration
            </span>
          </div>
        </div>

        {/* Master MSME Credential Card */}
        <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-white/10 relative overflow-hidden shadow-2xl shadow-cyan-500/5">
          {/* Subtle Cyber Grid Background accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Section: Registration Certificate Data */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20">
                    <div className="w-full h-full bg-[#090b12] rounded-[15px] flex items-center justify-center">
                      <Landmark className="w-6 h-6 text-cyan-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold font-display text-white">
                      MSME (Udyam) Registered Enterprise
                    </h3>
                    <div className="text-xs font-mono text-cyan-400 mt-0.5">
                      Government of India • Ministry of MSME
                    </div>
                  </div>
                </div>

                {/* Registration Number Badge with Copy */}
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-cyan-500/30 text-cyan-300 font-mono text-xs">
                  <span className="text-slate-400">Reg No:</span>
                  <strong className="text-white tracking-wider">{regNumber}</strong>
                  <button
                    onClick={copyRegNumber}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-cyan-400 hover:text-white cursor-pointer"
                    title="Copy Registration Number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Enterprise Specification Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Enterprise Name
                  </div>
                  <div className="text-white font-bold text-base font-sans">Zenemoo</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Registration Type
                  </div>
                  <div className="text-emerald-400 font-bold text-base font-sans">Micro Enterprise</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" /> Major Activity
                  </div>
                  <div className="text-purple-300 font-bold text-base font-sans">Services (AI &amp; Data Technology)</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" /> Registration Date
                  </div>
                  <div className="text-white font-bold text-base font-sans">06 August 2026</div>
                </div>
              </div>

              {/* Issuing Authority & Trust Statement */}
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 font-mono text-xs space-y-2">
                <div className="text-slate-300 flex items-center gap-2">
                  <span className="text-slate-400">Issuing Authority:</span>
                  <strong className="text-cyan-300 font-sans text-xs">
                    Ministry of Micro, Small and Medium Enterprises, Government of India
                  </strong>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  "Zenemoo is an officially registered Micro Enterprise under the Ministry of Micro, Small and Medium Enterprises (MSME), Government of India."
                </p>
              </div>
            </div>

            {/* Right Section: Official QR Code Display */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-4">
              <div className="text-xs font-mono text-slate-300 font-bold tracking-wider uppercase flex items-center gap-1.5">
                Official Udyam QR Code
              </div>

              {/* Original Untouched QR Code Image */}
              <div className="p-3 bg-white rounded-2xl shadow-xl border border-white/20 hover:scale-105 transition-transform duration-300">
                <img
                  src="/assets/udyam-qr.png"
                  alt="Official UDYAM Registration Certificate QR Code — Ministry of MSME, Govt of India"
                  className="w-44 h-44 object-contain rounded-lg"
                  loading="eager"
                />
              </div>

              <div className="text-[11px] font-mono text-slate-400 max-w-xs">
                Scan with any QR scanner to verify official certificate details on the Government of India Udyam portal.
              </div>

              <a
                href="https://udyamregistration.gov.in/Udyam_Verify.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-colors"
              >
                Verify on Udyam Portal <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
