import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  Clock,
  HardDrive,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  X,
  FileCheck,
  QrCode,
  Globe,
  FileSpreadsheet,
} from 'lucide-react';
import { portfolioApi, CompanyPortfolioItem } from '../services/api';
import { PortfolioShareModal } from './PortfolioShareModal';

export const AdminPortfolioSettings: React.FC = () => {
  const [portfolio, setPortfolio] = useState<CompanyPortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('Zenemoo Official Company Portfolio');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Modals
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current portfolio metadata
  const fetchPortfolio = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await portfolioApi.getAdminPortfolio();
      if (res.data && res.data.success && res.data.data) {
        setPortfolio(res.data.data);
      } else if (res.data && res.data.data) {
        setPortfolio(res.data.data);
      } else {
        setPortfolio(null);
      }
    } catch (e: any) {
      console.warn('Admin portfolio fetch warning:', e.message);
      setErrorMessage('Unable to load portfolio details. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Selected PDF exceeds the maximum 15 MB limit.');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    setShowUploadModal(true);
  };

  // Upload or Replace PDF (Safe atomic flow)
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress('Streaming PDF to Cloudinary CDN...');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', customTitle || 'Zenemoo Official Company Portfolio');

      const res = await portfolioApi.uploadPortfolio(formData);

      if (res.data && res.data.success) {
        setSuccessMessage('Company portfolio PDF uploaded and published successfully!');
        setPortfolio(res.data.data);
        setShowUploadModal(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        throw new Error(res.data?.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Portfolio upload error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to upload portfolio PDF.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Toggle Published Status
  const handleToggleStatus = async () => {
    if (!portfolio) return;
    const nextStatus = !portfolio.is_published;
    try {
      const res = await portfolioApi.toggleStatus(nextStatus);
      if (res.data && res.data.success) {
        setPortfolio((prev) => (prev ? { ...prev, is_published: nextStatus } : null));
        setSuccessMessage(`Portfolio is now ${nextStatus ? 'Published' : 'Unpublished'}.`);
      }
    } catch (e: any) {
      setErrorMessage('Failed to update publication status.');
    }
  };

  // Delete Portfolio
  const handleDeletePortfolio = async () => {
    try {
      const res = await portfolioApi.deletePortfolio();
      if (res.data && res.data.success) {
        setPortfolio(null);
        setShowDeleteModal(false);
        setSuccessMessage('Company portfolio has been removed from the public website.');
      }
    } catch (e: any) {
      setErrorMessage('Failed to delete portfolio.');
    }
  };

  // Copy Link Handler
  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://www.zenemoo.in/portfolio');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold font-display text-white">Company Portfolio Management</h2>
            <p className="text-xs font-mono text-cyan-400">
              Public URL: <span className="text-white">https://www.zenemoo.in/portfolio</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchPortfolio}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs font-mono shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Upload className="w-4 h-4 text-black stroke-[2.5]" />
            <span>{portfolio ? 'Replace PDF' : 'Upload New PDF'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ACTIVE PORTFOLIO MANAGEMENT CARD */}
      {portfolio ? (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
          {/* Main Card Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <FileCheck className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-cyan-400">
                    COMPANY PORTFOLIO
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border ${
                      portfolio.is_published
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                    }`}
                  >
                    ● {portfolio.is_published ? 'PUBLISHED' : 'UNPUBLISHED'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{portfolio.original_filename || portfolio.filename}</h3>
                <p className="text-xs font-mono text-slate-400">
                  {portfolio.file_size_formatted || 'N/A'} {portfolio.page_count ? `• ${portfolio.page_count} pages` : ''} • Updated:{' '}
                  {portfolio.updated_at ? new Date(portfolio.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS (Preview, Share, Download, Replace, Delete) */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preview</span>
              </a>

              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/10 active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Share</span>
              </button>

              <a
                href={portfolio.public_url}
                download={portfolio.filename}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download</span>
              </a>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Replace PDF</span>
              </button>

              <button
                onClick={handleToggleStatus}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              >
                {portfolio.is_published ? 'Unpublish' : 'Publish'}
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                title="Delete Portfolio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PUBLIC URL DISPLAY BOX */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-400">Public Live URL</label>
              <a
                href="/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Open in browser</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
              <input
                type="text"
                readOnly
                value="https://www.zenemoo.in/portfolio"
                className="w-full bg-transparent text-xs font-mono text-cyan-300 focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer active:scale-95"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* METADATA SPECS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>File Size</span>
              </div>
              <p className="text-sm font-bold font-mono text-white">{portfolio.file_size_formatted || 'N/A'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Last Updated</span>
              </div>
              <p className="text-sm font-bold font-mono text-white">
                {portfolio.updated_at ? new Date(portfolio.updated_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Storage System</span>
              </div>
              <p className="text-sm font-bold font-mono text-white">Cloudinary Raw CDN</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Public Route</span>
              </div>
              <p className="text-xs font-mono font-bold text-cyan-300 truncate">/portfolio</p>
            </div>
          </div>
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold text-white">No Company Portfolio Uploaded</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Upload a PDF document (1–10 MB, max 15 MB) to publish the official Zenemoo company portfolio.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs font-mono shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Upload Company Portfolio PDF</span>
          </button>
        </div>
      )}

      {/* UPLOAD / REPLACE CONFIRMATION MODAL */}
      {showUploadModal && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#080912] border border-cyan-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {portfolio ? 'Replace Portfolio PDF' : 'Upload Portfolio PDF'}
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <p className="text-xs text-slate-400">Selected File:</p>
              <p className="text-sm font-bold font-mono text-cyan-300 truncate">{selectedFile.name}</p>
              <p className="text-xs font-mono text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Document Title (Optional)</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 focus:border-cyan-400 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isUploading ? uploadProgress || 'Uploading...' : 'Confirm & Publish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#080912] border border-red-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Delete Company Portfolio?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will remove the portfolio from the public website and purge the asset from Cloudinary CDN. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePortfolio}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE PORTFOLIO MODAL WITH QR CODE (100% Client-Side) */}
      <PortfolioShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        publicUrl="https://www.zenemoo.in/portfolio"
      />
    </div>
  );
};
