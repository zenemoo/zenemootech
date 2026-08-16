import React from 'react';
import { Mic, Tags, Volume2, Scissors, CheckCheck, Database, Bot, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const Services: React.FC = () => {
  const services = [
    {
      icon: Mic,
      title: 'Audio Transcription',
      subtitle: 'Clean Verbatim & Timestamps',
      desc: 'Speech-to-text transcription with segmentation, speaker labeling, and timestamping according to strict project guidelines and client specifications.',
      features: [
        'Clean, verbatim, and timestamped transcription',
        'Multi-speaker and utterance segmentation',
        'TXT, DOCX, SRT or custom formats',
        'Review and QC workflow before delivery',
      ],
      tag: 'Core Speech Service',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: Bot,
      title: 'AI Data Collection',
      subtitle: 'Voice, Image & Video Datasets',
      desc: 'Multilingual data collection services for AI and machine learning models, including voice recordings, image data, and video collection according to dataset requirements.',
      features: [
        'Voice data collection in multiple languages',
        'Image and video data collection projects',
        'Metadata and labeling support',
        'Tailored for AI training datasets',
      ],
      tag: 'AI Dataset Engine',
      color: 'from-purple-500 to-pink-600',
    },
    {
      icon: Tags,
      title: 'Data Annotation',
      subtitle: 'NLP, Intent & Entity Labeling',
      desc: 'Structured labeling and annotation of audio and text datasets for AI and machine learning model training based on enterprise client guidelines.',
      features: [
        'NLP and speech dataset annotation',
        'Intent, entity, and sentiment labeling',
        'Audio quality and metadata tagging',
        'Consistency and guideline compliance checks',
      ],
      tag: 'NLP & Labeling',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Volume2,
      title: 'Multilingual Voice Over',
      subtitle: 'Native Speaker Recordings',
      desc: 'Multilingual voice recordings for speech datasets, e-learning content, IVR systems, and audio projects recorded by native speakers.',
      features: [
        'Native speakers in Hindi, English, and Odia',
        'Script reading and speech recording',
        'WAV / MP3 high-clarity delivery formats',
        'Ideal for speech datasets and IVR systems',
      ],
      tag: 'Voice Engine',
      color: 'from-emerald-500 to-cyan-600',
    },
    {
      icon: Scissors,
      title: 'Audio Segmentation',
      subtitle: 'Utterance Timestamp Alignment',
      desc: 'Audio splitting and timestamp alignment into sentence or utterance-level segments for transcription and speech recognition model datasets.',
      features: [
        'Start and end timestamp marking',
        'Silence and non-speech noise handling',
        'JSON, CSV, or custom output format',
        '100% reviewed before delivery',
      ],
      tag: 'Segmentation Core',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: CheckCheck,
      title: 'Review & Quality Control',
      subtitle: 'Multi-Stage Super QC Audit',
      desc: 'Multi-stage review and quality control process ensuring guideline compliance, zero error leakage, and 99%+ accuracy before client delivery.',
      features: [
        'Review and correction workflow',
        'Style guide compliance checks',
        'Error tracking and corrections',
        'Final Super QC before delivery',
      ],
      tag: 'Quality Assurance',
      color: 'from-fuchsia-500 to-purple-600',
    },
    {
      icon: Database,
      title: 'Bulk & Long-Term Data Projects',
      subtitle: 'Dedicated Enterprise Teams',
      desc: 'Support for ongoing and large-volume data projects with dedicated teams, structured workflows, and regular delivery schedules.',
      features: [
        'Dedicated project teams (50+ members across India)',
        'Regular delivery schedules (180+ mins/day)',
        'Workflow and project coordination',
        'Scalable team capacity on demand',
      ],
      tag: 'Enterprise Scale',
      color: 'from-teal-500 to-emerald-600',
    },
  ];

  return (
    <section id="services" className="py-28 relative z-10 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-4">
            <Mic className="w-3.5 h-3.5" />
            WHAT WE DELIVER
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
            Professional Language &amp; Data Services
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Every service is executed by trained specialists with rigorous quality control, delivering results that meet enterprise standards and pass Super QC audits consistently.
          </p>
        </div>

        {/* 3D Floating Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="glass-panel glass-panel-interactive rounded-3xl p-8 border border-white/10 relative group flex flex-col justify-between overflow-hidden"
              >
                {/* Glow bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${service.color}`}></div>

                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${service.color} p-[1px] shadow-lg`}>
                      <div className="w-full h-full bg-[#0a0b12] rounded-[15px] flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-cyan-300">
                      {service.tag}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-xl font-bold font-display text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    {service.title}
                  </h3>
                  <div className="text-xs font-mono text-cyan-400/80 mb-4">{service.subtitle}</div>

                  {/* Description */}
                  <p className="text-sm text-slate-400 leading-relaxed font-normal mb-6">
                    {service.desc}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer link indicator */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400 group-hover:text-white transition-colors">
                  <span>99%+ Accuracy Guaranteed</span>
                  <ArrowUpRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
