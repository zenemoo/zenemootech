import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  Volume2,
  Video,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  ShieldCheck,
  Globe,
  Layers,
  Info,
  Clock,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DatasetItem, DatasetCategory, getPublicDatasets } from '../lib/dataPortfolioStore';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface AiDataPortfolioPageProps {
  onOpenAiDrawer?: () => void;
  onNavigateContact?: () => void;
}

const CATEGORIES: { label: string; value: string; icon: any }[] = [
  { label: 'All Datasets', value: 'All', icon: Layers },
  { label: 'Audio', value: 'Audio', icon: Volume2 },
  { label: 'Video', value: 'Video', icon: Video },
  { label: 'Image', value: 'Image', icon: ImageIcon },
  { label: 'JSON', value: 'JSON', icon: FileCode },
  { label: 'CSV', value: 'CSV', icon: FileSpreadsheet },
  { label: 'Transcription', value: 'Transcription', icon: Database },
  { label: 'Annotation', value: 'Annotation', icon: CheckCircle2 },
];

export const AiDataPortfolioPage: React.FC<AiDataPortfolioPageProps> = ({
  onOpenAiDrawer,
  onNavigateContact,
}) => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(null);

  // Controlled display pagination / batch size for performance
  const [displayCount, setDisplayCount] = useState(9);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchDatasets = async () => {
      setIsLoading(true);
      try {
        const data = await getPublicDatasets();
        setDatasets(data);
      } catch (err) {
        console.error('Error loading public datasets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  const filteredDatasets = useMemo(() => {
    return datasets.filter((item) => {
      // Security enforcement: is_public must be true
      if (!item.is_public) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.language && item.language.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.format && item.format.toLowerCase().includes(q)) ||
        (item.use_case && item.use_case.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [datasets, searchQuery, selectedCategory]);

  const visibleDatasets = useMemo(() => {
    return filteredDatasets.slice(0, displayCount);
  }, [filteredDatasets, displayCount]);

  const handleRequestDataset = () => {
    if (onNavigateContact) {
      onNavigateContact();
    } else {
      window.location.href = '/#contact';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar onOpenAiDrawer={onOpenAiDrawer} />

      {/* Hero Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden border-b border-white/10">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-blue-600/15 to-purple-600/20 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6 backdrop-blur-md shadow-lg shadow-cyan-500/10"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>ENTERPRISE AI DATASETS & LANGUAGE CORPORA</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-display leading-[1.15]"
          >
            AI Data Portfolio
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-sm sm:text-base lg:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            High-quality, human-generated and validated datasets for AI, ML, speech, language and computer vision projects.
          </motion.p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Search Bar & Category Filters */}
        <div className="space-y-6">
          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              placeholder="Search datasets by title, language (Odia, Hindi, etc.), format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white/[0.03] border border-white/15 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-xl shadow-xl transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    setSelectedCategory(cat.value);
                    setDisplayCount(9);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/50 scale-105'
                      : 'bg-white/[0.03] border border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-cyan-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Representative Sample Notice */}
        <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-center flex items-center justify-center gap-3 backdrop-blur-md">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            Representative samples are shown for demonstration purposes. Client-confidential datasets and private project data are not publicly displayed.
          </p>
        </div>

        {/* Datasets Grid */}
        {isLoading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-400">Loading datasets...</p>
          </div>
        ) : visibleDatasets.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-white/[0.01] rounded-3xl border border-white/10">
            <Database className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Datasets Match Your Criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search terms or selecting a different category filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-cyan-500/20 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {visibleDatasets.map((dataset, idx) => (
                <motion.div
                  key={dataset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="group relative flex flex-col bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-950/40"
                >
                  {/* Card Thumbnail / Header Cover */}
                  <div className="relative h-44 bg-slate-950 border-b border-white/10 overflow-hidden">
                    {dataset.thumbnail_url ? (
                      <img
                        src={dataset.thumbnail_url}
                        alt={dataset.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40">
                        <Database className="w-12 h-12 text-cyan-500/30 group-hover:scale-110 transition-transform" />
                      </div>
                    )}

                    {/* Category & Language Badges overlay */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-black/70 backdrop-blur-md border border-cyan-500/40 text-cyan-300 uppercase tracking-wider">
                        {dataset.category} • {dataset.language}
                      </span>
                    </div>

                    {dataset.is_featured && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-900/80 border border-purple-400/50 text-purple-200 backdrop-blur-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-300" />
                          FEATURED
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                        {dataset.title}
                      </h3>

                      {dataset.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {dataset.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Format</span>
                        <span className="text-slate-200 font-semibold truncate block">{dataset.format || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Duration/Size</span>
                        <span className="text-slate-200 font-semibold truncate block">{dataset.duration || dataset.file_size || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Samples</span>
                        <span className="text-slate-200 font-semibold truncate block">{dataset.sample_count || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Quality Certification Badge */}
                    {dataset.quality_info && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{dataset.quality_info}</span>
                      </div>
                    )}

                    {/* View Sample Action Button */}
                    <button
                      onClick={() => setSelectedDataset(dataset)}
                      className="w-full py-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 group-hover:border-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/5"
                    >
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>View Sample</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Controlled Pagination / Load More Button */}
        {filteredDatasets.length > displayCount && (
          <div className="text-center pt-6">
            <button
              onClick={() => setDisplayCount((prev) => prev + 9)}
              className="px-6 py-3 rounded-2xl bg-slate-900 border border-white/15 text-slate-200 hover:text-white hover:border-cyan-500/40 text-xs font-mono font-bold transition-all shadow-xl"
            >
              Load More Datasets ({filteredDatasets.length - displayCount} remaining)
            </button>
          </div>
        )}

        {/* Business CTA Section */}
        <section className="mt-16 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 text-center relative overflow-hidden backdrop-blur-2xl shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Need Similar Data?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Zenemoo creates custom, high-accuracy speech, text, translation, vision, and domain-specific dataset pipelines tailored for enterprise AI teams.
            </p>
            <div className="pt-2">
              <button
                onClick={handleRequestDataset}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 cursor-pointer"
              >
                <span>Request a Dataset</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Glassmorphism Sample Detail Modal */}
      <AnimatePresence>
        {selectedDataset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 relative"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-slate-900 via-[#0a0f1d] to-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {selectedDataset.category} • {selectedDataset.language}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDataset(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div>
                  <h2 className="text-xl font-extrabold text-white font-display">{selectedDataset.title}</h2>
                  {selectedDataset.description && (
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">{selectedDataset.description}</p>
                  )}
                </div>

                {/* Metadata Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/10 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Language</span>
                    <span className="text-slate-200 font-bold">{selectedDataset.language}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Format</span>
                    <span className="text-slate-200 font-bold">{selectedDataset.format || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Sample Count</span>
                    <span className="text-slate-200 font-bold">{selectedDataset.sample_count || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Duration</span>
                    <span className="text-slate-200 font-bold">{selectedDataset.duration || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Resolution</span>
                    <span className="text-slate-200 font-bold">{selectedDataset.resolution || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Storage Provider</span>
                    <span className="text-slate-200 font-bold uppercase">{selectedDataset.storage_provider || 'Google Drive'}</span>
                  </div>
                </div>

                {selectedDataset.use_case && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300 block">Use Case & AI Task</span>
                    <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 leading-relaxed font-mono">
                      {selectedDataset.use_case}
                    </div>
                  </div>
                )}

                {selectedDataset.quality_info && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-300 block">Quality Information</span>
                    <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed font-mono flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{selectedDataset.quality_info}</span>
                    </div>
                  </div>
                )}

                {/* Sample Media Preview Component */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-semibold text-slate-200 block">Sample Media Preview</span>
                  {selectedDataset.file_url ? (
                    selectedDataset.category === 'Audio' ? (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                        <audio controls src={selectedDataset.file_url} className="w-full" />
                      </div>
                    ) : selectedDataset.category === 'Video' ? (
                      <div className="p-2 rounded-2xl bg-slate-950 border border-white/10">
                        <video controls src={selectedDataset.file_url} className="w-full max-h-64 rounded-xl" />
                      </div>
                    ) : selectedDataset.category === 'Image' ? (
                      <div className="p-2 rounded-2xl bg-slate-950 border border-white/10 flex justify-center">
                        <img src={selectedDataset.file_url} alt="Sample preview" className="max-h-64 object-contain rounded-xl" />
                      </div>
                    ) : selectedDataset.category === 'JSON' || selectedDataset.category === 'CSV' ? (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-cyan-300 overflow-x-auto max-h-48">
                        <pre><code>{`{\n  "dataset": "${selectedDataset.title}",\n  "sample_format": "${selectedDataset.format || 'JSON'}",\n  "language": "${selectedDataset.language}",\n  "status": "validated"\n}`}</code></pre>
                      </div>
                    ) : (
                      <a
                        href={selectedDataset.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-cyan-400 underline font-mono"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Sample File Container</span>
                      </a>
                    )
                  ) : (
                    <div className="p-6 text-center rounded-2xl bg-slate-950 border border-white/10 text-xs text-slate-400 font-mono italic">
                      Sample preview unavailable.
                    </div>
                  )}
                </div>

                {/* Modal Footer CTA */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {selectedDataset.id}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedDataset(null);
                      handleRequestDataset();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Request Full Dataset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <Footer />
    </div>
  );
};
