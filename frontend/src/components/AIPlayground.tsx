import React, { useState } from 'react';
import { Sparkles, Sliders, RefreshCw, Zap, Mic, Tags, Volume2, Scissors, CheckCircle, Download, Eye, FileText, Globe } from 'lucide-react';

export const AIPlayground: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transcribe' | 'annotate' | 'voice' | 'segment'>('transcribe');
  const [language, setLanguage] = useState<'Hindi' | 'English' | 'Odia'>('Hindi');
  const [qcLevel, setQcLevel] = useState<'QC Passed' | 'Super QC Approved'>('Super QC Approved');
  const [format, setFormat] = useState<'JSON' | 'SRT' | 'TXT' | 'CSV'>('JSON');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(100);

  const tabs = [
    { id: 'transcribe', name: 'Audio Transcription', icon: Mic, desc: 'Clean Verbatim & Speaker Diarization' },
    { id: 'annotate', name: 'Data Annotation', icon: Tags, desc: 'NLP Intent, Entity & Sentiment Tagging' },
    { id: 'voice', name: 'Voice Over Recording', icon: Volume2, desc: 'Native Speakers in Hindi, English & Odia' },
    { id: 'segment', name: 'Audio Segmentation', icon: Scissors, desc: 'Utterance Timestamp Alignment' },
  ];

  const handleSimulate = () => {
    setIsProcessing(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const getOutputPreview = () => {
    switch (activeTab) {
      case 'transcribe':
        return {
          header: `Zenemo Tech Audio Transcript (${language} • ${format})`,
          content: language === 'Hindi'
            ? `[00:00.00] Speaker 1 (Male): नमस्ते, ज़ेनेमो टेक में आपका स्वागत है।\n[00:03.45] Speaker 2 (Female): हमारी टीम 99% से अधिक सटीकता के साथ ट्रांसक्रिप्शन और डेटा एनोटेशन प्रदान करती है।\n[00:08.10] Speaker 1 (Male): DesiCrew Solutions के साथ 1.5 वर्षों से अधिक समय से पार्टनरशिप जारी है।`
            : language === 'Odia'
            ? `[00:00.00] Speaker 1 (Male): ନମସ୍କାର, ଜେନେମୋ ଟେକ୍ କୁ ସ୍ୱାଗତ।\n[00:03.45] Speaker 2 (Female): ଆମର ଟିମ୍ ଅଡିଓ ଟ୍ରାନ୍ସକ୍ରିପସନ୍ ଏବଂ ଡାଟା ଆନୋଟେସନ୍ ସଠିକ୍ ଭାବରେ ପ୍ରଦାନ କରେ।\n[00:08.10] Speaker 1 (Male): ଆମେ 2023 ରୁ DesiCrew Solutions ର ଭେଣ୍ଡର।`
            : `[00:00.00] Speaker 1 (Male): Hello, welcome to Zenemo Tech.\n[00:03.45] Speaker 2 (Female): Our specialized team delivers 99%+ accuracy across transcription and data annotation.\n[00:08.10] Speaker 1 (Male): Certified DesiCrew Solutions vendor active since 2023.`,
        };
      case 'annotate':
        return {
          header: `Zenemo Tech NLP Entity Annotation (${language})`,
          content: `{\n  "text": "Prem Prasad Pradhan leads Zenemo Tech team in K. Barida, Main Road, Odisha.",\n  "entities": [\n    { "entity": "Prem Prasad Pradhan", "label": "PER", "confidence": 0.998 },\n    { "entity": "Zenemo Tech", "label": "ORG", "confidence": 0.999 },\n    { "entity": "K. Barida", "label": "LOC", "confidence": 0.995 },\n    { "entity": "Odisha", "label": "LOC", "confidence": 0.997 }\n  ],\n  "sentiment": "POSITIVE",\n  "qc_status": "${qcLevel}"\n}`,
        };
      case 'voice':
        return {
          header: `Zenemo Tech Voice Over Audio Metadata (${language})`,
          content: `{\n  "sample_id": "VO_${language.toUpperCase()}_042",\n  "speaker_type": "Native Professional Speaker",\n  "sample_rate": "48000 Hz",\n  "format": "WAV / MP3",\n  "clarity_score": "99.7%",\n  "use_case": "IVR / Speech Training Dataset"\n}`,
        };
      case 'segment':
        return {
          header: `Zenemo Tech Audio Segmentation (${language})`,
          content: `[\n  { "utterance_id": 1, "start": "00:00.00", "end": "00:03.20", "silence_before": 0.15, "speaker": "SPK_1" },\n  { "utterance_id": 2, "start": "00:03.50", "end": "00:07.80", "silence_before": 0.30, "speaker": "SPK_2" }\n]`,
        };
    }
  };

  return (
    <section id="playground" className="py-24 relative z-10 bg-noise">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            INTERACTIVE DATA SERVICES STUDIO
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Test Zenemo Tech Data Pipelines
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Simulate transcription formats, NLP entity annotation tags, and multilingual voice deliverables in real-time.
          </p>
        </div>

        {/* Playground Container */}
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-white/10 bg-white/[0.02]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`p-4 sm:p-5 text-left transition-all duration-200 border-r border-white/10 last:border-r-0 ${
                    isActive
                      ? 'bg-cyan-500/10 border-b-2 border-b-cyan-400 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="font-semibold text-sm">{tab.name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">{tab.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 p-6 sm:p-8 gap-8">
            {/* Left Column: Controls */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-bold font-display text-white mb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Deliverable Controls
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-6">
                  Select target language, review stage, and output export specifications.
                </p>

                <div className="space-y-6">
                  {/* Language Selector */}
                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-2 block flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      Target Language
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Hindi', 'English', 'Odia'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`py-2.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                            language === lang
                              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                              : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QC Level */}
                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-2 block flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Quality Gate Approval Stage
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['QC Passed', 'Super QC Approved'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setQcLevel(lvl)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-mono font-semibold transition-all ${
                            qcLevel === lvl
                              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                              : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Export Format */}
                  <div>
                    <label className="text-xs font-mono text-slate-300 mb-2 block flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      File Delivery Format
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['JSON', 'SRT', 'TXT', 'CSV'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setFormat(fmt)}
                          className={`py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                            format === fmt
                              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                              : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specs Box */}
                <div className="mt-8 p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-slate-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service Pipeline:</span>
                    <span className="text-cyan-400 font-semibold uppercase">{activeTab}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Accuracy Guarantee:</span>
                    <span className="text-emerald-400 font-semibold">99%+ Verified</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vendor Client:</span>
                    <span className="text-slate-200">DesiCrew Solutions</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSimulate}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Executing Pipeline Quality Check ({progress}%)...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-cyan-200" />
                    Run Zenemo Tech QC Audit
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Preview */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="relative flex-1 min-h-[350px] rounded-2xl overflow-hidden bg-black/80 border border-white/10 p-6 font-mono text-xs text-cyan-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 text-slate-400">
                    <span className="text-white font-bold">{getOutputPreview().header}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {qcLevel}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-200">
                    {getOutputPreview().content}
                  </pre>
                </div>

                {/* Overlay status */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Zenemo Tech QC Pipeline</span>
                  <span className="text-cyan-400 font-semibold">100% Guideline Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
