import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  ArrowLeft,
  Search,
  Volume2,
  Video,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  FileText,
  Download,
  Play,
  Pause,
  Copy,
  Check,
  X,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { datasetApi } from '../services/api';
import { formatFileSize, detectFileType, DatasetCategoryType } from '../utils/fileTypeDetector';

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

interface DatasetFileItem {
  id: string;
  dataset_id: string;
  file_name: string;
  file_type: DatasetCategoryType;
  mime_type?: string;
  file_size: number;
  drive_url?: string;
  thumbnail_url?: string;
  raw_content?: string;
  created_at: string;
}

interface PublicDatasetDetailPageProps {
  slug: string;
  onBack: () => void;
  onOpenAiDrawer?: () => void;
}

export const PublicDatasetDetailPage: React.FC<PublicDatasetDetailPageProps> = ({
  slug,
  onBack,
  onOpenAiDrawer,
}) => {
  const [dataset, setDataset] = useState<DatasetItem | null>(null);
  const [files, setFiles] = useState<DatasetFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<DatasetCategoryType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Preview Modals
  const [previewFile, setPreviewFile] = useState<DatasetFileItem | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await datasetApi.getDatasetBySlugOrId(slug);
        if (res.data && res.data.success) {
          setDataset(res.data.dataset);
          setFiles(res.data.files || []);
        }
      } catch (err) {
        console.error('Error loading public dataset detail:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [slug]);

  // Filtered files list
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const matchCat = activeCategory === 'ALL' || f.file_type === activeCategory;
      const matchSearch = f.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [files, activeCategory, searchQuery]);

  // Helper to extract direct playable/renderable media URL
  const getFileMediaUrl = (file: DatasetFileItem): string => {
    const url = file.drive_url || file.thumbnail_url;
    if (!url) return '';

    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      if (file.file_type === 'IMAGE') {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    return url;
  };

  // Helper to get Google Drive embed preview iframe URL
  const getEmbedPreviewUrl = (file: DatasetFileItem): string | null => {
    const url = file.drive_url || file.thumbnail_url;
    if (!url) return null;

    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    return null;
  };

  // Extract & format real JSON content for preview
  const getRealJsonContent = (file: DatasetFileItem): string => {
    if (file.raw_content) {
      try {
        const parsed = JSON.parse(file.raw_content);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return file.raw_content;
      }
    }

    if (file.drive_url && file.drive_url.startsWith('data:')) {
      try {
        const b64Parts = file.drive_url.split(',');
        if (b64Parts.length > 1) {
          const decoded = atob(b64Parts[1]);
          const parsed = JSON.parse(decoded);
          return JSON.stringify(parsed, null, 2);
        }
      } catch (e) {}
    }

    return `{\n  "file_name": "${file.file_name}",\n  "file_size": "${formatFileSize(file.file_size)}",\n  "type": "${file.file_type}"\n}`;
  };

  // Safe universal download handler
  const handleDownloadFile = (file: DatasetFileItem) => {
    const url = file.drive_url || file.thumbnail_url;
    if (!url) return;

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar onBack={onBack} showBackButton={true} onOpenAiDrawer={onOpenAiDrawer} />

      <main className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <button onClick={onBack} className="hover:text-cyan-400 cursor-pointer">
            AI Data
          </button>
          <span>/</span>
          <span>Datasets</span>
          <span>/</span>
          <span className="text-white font-bold">{dataset?.name || 'Dataset Detail'}</span>
        </div>

        {/* DATASET HERO SUMMARY CARD */}
        {isLoading ? (
          <div className="h-48 bg-[#090a0f] rounded-3xl border border-white/10 animate-pulse" />
        ) : dataset ? (
          <div className="bg-[#090a0f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
                  {dataset.language || 'Multilingual'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-2 font-display">{dataset.name}</h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                  {dataset.description || 'Enterprise AI language & speech training dataset.'}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-white/5 shrink-0 text-xs">
                <div>
                  <p className="text-slate-400">Total Files</p>
                  <p className="text-xl font-extrabold text-white font-mono mt-0.5">{dataset.total_files || files.length}</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-slate-400">Dataset Size</p>
                  <p className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">{formatFileSize(dataset.total_size_bytes)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">Dataset details could not be loaded.</div>
        )}

        {/* CATEGORY SWITCHER & SEARCH */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#090a0f] p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
            {['ALL', 'AUDIO', 'VIDEO', 'IMAGE', 'JSON', 'CSV', 'PDF'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* FILES DISPLAY TABLE */}
        <div className="bg-[#090a0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/80 text-[11px] font-mono uppercase text-slate-400">
                  <th className="p-4">File Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Uploaded</th>
                  <th className="p-4 text-right">Preview / Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-mono">
                      No files matching category "{activeCategory}" found.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => {
                    const catInfo = detectFileType(file.file_name, file.mime_type);
                    const isAudioPlaying = playingAudioId === file.id;

                    return (
                      <tr key={file.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-semibold text-white flex items-center gap-3">
                          {file.file_type === 'AUDIO' && (
                            <button
                              onClick={() => {
                                setPreviewFile(file);
                              }}
                              className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all cursor-pointer"
                              title="Play Audio Sample"
                            >
                              <Play className="w-4 h-4 ml-0.5" />
                            </button>
                          )}
                          {file.file_type !== 'AUDIO' && (
                            <span className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                              <FileText className="w-4 h-4" />
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-white">{file.file_name}</p>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${catInfo.badgeBg}`}>
                            {catInfo.badgeText}
                          </span>
                        </td>

                        <td className="p-4 font-mono text-slate-300">{formatFileSize(file.file_size)}</td>
                        <td className="p-4 text-slate-400 text-[11px]">{new Date(file.created_at).toLocaleDateString()}</td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Preview</span>
                            </button>

                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* FILE PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090a0f] border border-white/10 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {previewFile.file_type}
                </span>
                <h3 className="text-base font-bold text-white font-display truncate max-w-md">{previewFile.file_name}</h3>
              </div>
              <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              {/* Audio Preview */}
              {previewFile.file_type === 'AUDIO' && (
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-white/5 text-center space-y-4">
                  <Volume2 className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-300 font-mono">{previewFile.file_name}</p>
                  {previewFile.drive_url && (previewFile.drive_url.startsWith('data:') || previewFile.drive_url.startsWith('blob:')) ? (
                    <audio src={previewFile.drive_url} controls autoPlay className="w-full" />
                  ) : getEmbedPreviewUrl(previewFile) ? (
                    <iframe
                      src={getEmbedPreviewUrl(previewFile)!}
                      className="w-full h-40 rounded-2xl border-0 bg-slate-950"
                      allow="autoplay"
                      title={previewFile.file_name}
                    />
                  ) : (
                    <audio src={getFileMediaUrl(previewFile)} controls autoPlay className="w-full" />
                  )}
                </div>
              )}

              {/* Video Preview */}
              {previewFile.file_type === 'VIDEO' && (
                <div className="bg-black rounded-2xl overflow-hidden border border-white/10">
                  {previewFile.drive_url && (previewFile.drive_url.startsWith('data:') || previewFile.drive_url.startsWith('blob:')) ? (
                    <video src={previewFile.drive_url} controls autoPlay className="w-full max-h-96 object-contain" />
                  ) : getEmbedPreviewUrl(previewFile) ? (
                    <iframe
                      src={getEmbedPreviewUrl(previewFile)!}
                      className="w-full h-72 sm:h-96 rounded-2xl border-0 bg-black"
                      allow="autoplay; fullscreen"
                      title={previewFile.file_name}
                    />
                  ) : (
                    <video src={getFileMediaUrl(previewFile)} controls autoPlay className="w-full max-h-96 object-contain" />
                  )}
                </div>
              )}

              {/* Image Preview */}
              {previewFile.file_type === 'IMAGE' && (
                <div className="bg-slate-900 rounded-2xl p-2 border border-white/10 text-center">
                  <img
                    src={getFileMediaUrl(previewFile)}
                    alt={previewFile.file_name}
                    className="max-h-96 w-full object-contain rounded-xl mx-auto"
                  />
                </div>
              )}

              {/* JSON Code Viewer */}
              {previewFile.file_type === 'JSON' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 font-mono text-xs text-emerald-400 max-h-80 overflow-y-auto space-y-2">
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const jsonStr = getRealJsonContent(previewFile);
                        navigator.clipboard.writeText(jsonStr);
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 hover:text-white text-[10px] inline-flex items-center gap-1 border border-slate-800 cursor-pointer"
                    >
                      {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {getRealJsonContent(previewFile)}
                  </pre>
                </div>
              )}

              {/* CSV Viewer */}
              {previewFile.file_type === 'CSV' && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 overflow-x-auto text-xs font-mono">
                  {previewFile.raw_content ? (
                    <pre className="whitespace-pre-wrap text-amber-300 leading-relaxed max-h-72 overflow-y-auto">
                      {previewFile.raw_content}
                    </pre>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-cyan-400">
                          <th className="p-2">Filename</th>
                          <th className="p-2">Size</th>
                          <th className="p-2">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        <tr>
                          <td className="p-2">{previewFile.file_name}</td>
                          <td className="p-2">{formatFileSize(previewFile.file_size)}</td>
                          <td className="p-2 text-emerald-400">CSV Dataset</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* PDF Preview */}
              {previewFile.file_type === 'PDF' && (
                <div className="bg-slate-900 p-8 rounded-2xl border border-white/10 text-center space-y-3">
                  <FileText className="w-12 h-12 text-rose-400 mx-auto" />
                  <p className="text-sm font-bold text-white">{previewFile.file_name}</p>
                  <p className="text-xs text-slate-400">PDF Research document ready for download.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Size: {formatFileSize(previewFile.file_size)}</span>
              <button
                onClick={() => handleDownloadFile(previewFile)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Original File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
