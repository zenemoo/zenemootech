import React, { useState } from 'react';
import { Network, CheckCircle, ArrowRight, Layers, FileCheck, Search, Send, FileSpreadsheet, ShieldCheck } from 'lucide-react';

export const Architecture: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<number>(0);

  const steps = [
    {
      num: '01',
      title: 'Project & Data Assignment',
      icon: Layers,
      desc: 'Client provides project guidelines, datasets, or data collection instructions. Tasks are assigned to team members based on language expertise and project requirements.',
      details: ['Guideline analysis & sample batch testing', 'Language & dialect matching (Hindi, English, Odia)', 'Scope & timeline alignment'],
    },
    {
      num: '02',
      title: 'Data Preparation & Segmentation',
      icon: FileSpreadsheet,
      desc: 'Raw audio, image, or text data is prepared, segmented into utterance-level audio chunks, or organized according to project workflow before annotation or transcription begins.',
      details: ['Utterance splitting & silence trimming', 'File hierarchy & metadata tagging', 'Batch distribution to transcribers'],
    },
    {
      num: '03',
      title: 'Annotation / Transcription',
      icon: FileCheck,
      desc: 'Specialists perform clean verbatim transcription, entity labeling, intent tagging, or voice over recordings following strict project guidelines.',
      details: ['Timestamp alignment & speaker labeling', 'NLP entity & sentiment tagging', 'Daily production output tracking (180+ mins/day)'],
    },
    {
      num: '04',
      title: 'Review & Quality Check',
      icon: Search,
      desc: 'Completed work is reviewed by internal reviewers to check guideline compliance, formatting accuracy, and label consistency.',
      details: ['Reviewer error correction workflow', 'Speaker identification verification', 'Style guide compliance audits'],
    },
    {
      num: '05',
      title: 'Final Quality Control (Super QC)',
      icon: ShieldCheck,
      desc: 'Files pass through final quality control before delivery to ensure dataset consistency and enterprise project requirements are met.',
      details: ['Super QC audit pass', 'Zero error leakage policy', 'Consistency check across full batch'],
    },
    {
      num: '06',
      title: 'Client Delivery',
      icon: Send,
      desc: 'Final datasets, transcripts, or annotated files are delivered in the required format (JSON, SRT, TXT, CSV) according to client specifications.',
      details: ['Deliverable packaging & client portal sync', 'DesiCrew Solutions vendor delivery', 'Post-delivery feedback loop'],
    },
  ];

  return (
    <section id="architecture" className="py-24 relative z-10 bg-noise">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
            <Network className="w-3.5 h-3.5" />
            WORKFLOW &amp; QUALITY PIPELINE
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            How We Deliver Quality
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            A structured, 6-stage pipeline ensures every audio minute delivered passes our internal quality gate before reaching your team.
          </p>
        </div>

        {/* Workflow Steps Navigator */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = selectedStep === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedStep(idx)}
                className={`p-4 rounded-2xl text-left border transition-all duration-300 relative ${
                  isSelected
                    ? 'glass-panel border-cyan-400 shadow-xl shadow-cyan-500/15 text-white'
                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-extrabold text-cyan-400">{step.num}</span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`} />
                </div>
                <div className="font-bold text-xs text-white leading-tight font-display">{step.title}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Step Details Box */}
        <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px]">
              <div className="w-full h-full bg-[#0a0b12] rounded-[15px] flex items-center justify-center font-mono font-bold text-cyan-300">
                {steps[selectedStep].num}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-display text-white">{steps[selectedStep].title}</h3>
              <p className="text-xs font-mono text-cyan-400">Zenemo Tech Quality Pipeline Stage {steps[selectedStep].num}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div>
              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider font-mono mb-3">
                Stage Description
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">{steps[selectedStep].desc}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider font-mono mb-3">
                Key Operations &amp; Verification
              </h4>
              <ul className="space-y-3">
                {steps[selectedStep].details.map((detail, dIdx) => (
                  <li key={dIdx} className="flex items-center gap-3 text-xs font-mono text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
