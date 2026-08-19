import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  Search,
  Volume2,
  Video,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Database,
  Globe,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { datasetApi } from '../services/api';
import { formatFileSize, DatasetCategoryType } from '../utils/fileTypeDetector';

interface DatasetItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  language?: string;
  total_files: number;
  total_size_bytes: number;
  status: string;
  updated_at: string;
}

interface AiDataPortfolioPageProps {
  onBack?: () => void;
  onSelectDataset?: (slug: string) => void;
  onOpenAiDrawer?: () => void;
}

export const AiDataPortfolioPage: React.FC<AiDataPortfolioPageProps> = ({
  onBack,
  onSelectDataset,
  onOpenAiDrawer,
}) => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoading(true);
      try {
        const res = await datasetApi.getDatasets({ status: 'active' });
        if (res.data && res.data.success) {
          setDatasets(res.data.datasets || []);
        }
      } catch (err) {
        console.error('Failed to fetch public datasets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  // Compute dynamic stats metrics from real datasets
  const statsMetrics = useMemo(() => {
    const totalDatasets = datasets.length;
    const languagesCount = new Set(datasets.map((d) => d.language).filter(Boolean)).size;
    const totalFilesCount = datasets.reduce((sum, d) => sum + (d.total_files || 0), 0);
    const totalBytes = datasets.reduce((sum, d) => sum + (d.total_size_bytes || 0), 0);

    return {
      datasets: totalDatasets > 0 ? `${totalDatasets}` : '0',
      languages: languagesCount > 0 ? `${languagesCount}` : '0',
      files: totalFilesCount > 0 ? `${totalFilesCount}` : '0',
      storage: totalBytes > 0 ? formatFileSize(totalBytes) : '0 B',
    };
  }, [datasets]);

  // Filter datasets
  const filteredDatasets = useMemo(() => {
    return datasets.filter((ds) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        ds.name.toLowerCase().includes(q) ||
        (ds.description || '').toLowerCase().includes(q) ||
        (ds.language || '').toLowerCase().includes(q);

      return matchSearch;
    });
  }, [datasets, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar onBack={onBack} showBackButton={true} onOpenAiDrawer={onOpenAiDrawer} />

      <main className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* HERO BANNER */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0a0c16] via-[#080911] to-[#04050a] border border-white/10 p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-tight">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>ZENEMOO DATASETS REPOSITORY</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display leading-tight">
              AI Data <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">Portfolio</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              High-quality, well-structured datasets for speech recognition, computer vision, multilingual natural language processing (NLP), and AI model training.
            </p>

            {/* SEARCH INPUT */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search datasets, categories, languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#050505]/90 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 shadow-xl transition-all"
                />
              </div>
            </div>

            {/* DYNAMIC STATS METRICS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white font-display">{statsMetrics.datasets}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Datasets</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white font-display">{statsMetrics.languages}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Languages</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white font-display">{statsMetrics.files}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Files</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white font-display">{statsMetrics.storage}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Data</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORIES FILTER CHIPS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: 'ALL', label: 'All Categories' },
            { id: 'AUDIO', label: 'Audio Speech' },
            { id: 'VIDEO', label: 'Video Data' },
            { id: 'IMAGE', label: 'Image Datasets' },
            { id: 'JSON', label: 'Text / JSON' },
            { id: 'CSV', label: 'CSV Datasets' },
            { id: 'PDF', label: 'PDF Documents' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#090a0f] text-slate-400 border-white/10 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* DATASETS CATALOG GRID */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-[#090a0f] rounded-3xl border border-white/5 animate-pulse p-6" />
            ))}
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="bg-[#090a0f] border border-white/10 rounded-3xl p-12 text-center">
            <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white font-display">No datasets created yet</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Datasets created by the admin in the Admin Dashboard will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDatasets.map((ds) => (
              <div
                key={ds.id}
                onClick={() => onSelectDataset && onSelectDataset(ds.slug || ds.id)}
                className="group bg-[#090a0f] hover:bg-slate-900/90 border border-white/10 hover:border-cyan-500/50 rounded-3xl p-6 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wide">
                      {ds.language || 'MULTILINGUAL'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatFileSize(ds.total_size_bytes || 0)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors font-display line-clamp-1">
                    {ds.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {ds.description || 'Enterprise AI speech and annotated training dataset.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{ds.total_files || 0} Files</span>
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>View Dataset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
