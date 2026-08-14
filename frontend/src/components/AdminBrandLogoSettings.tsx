import React, { useState, useEffect, useRef } from 'react';
import {
  ImageIcon,
  Sparkles,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Monitor,
  Smartphone,
  ShieldCheck,
  X,
  FileCheck,
  Eye,
  Sliders,
  Sun,
  Moon,
  Info,
  Check,
  Layers,
} from 'lucide-react';
import { brandingApi } from '../services/api';
import { useActiveLogo, notifyLogoUpdated, ActiveLogoData } from '../lib/useActiveLogo';
import { SeoImage } from '../seo/components/SeoImage';

type UploadState =
  | 'IDLE'
  | 'SELECTED'
  | 'VALIDATING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'SAVING'
  | 'ACTIVATING'
  | 'SUCCESS'
  | 'ERROR';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const AdminBrandLogoSettings: React.FC = () => {
  const { logoUrl, logoData, isLoading, refetchLogo } = useActiveLogo();

  // Selection & Upload Pipeline State
  const [uploadState, setUploadState] = useState<UploadState>('IDLE');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [fileSpecs, setFileSpecs] = useState({
    format: '',
    dimensions: '',
    width: 0,
    height: 0,
    size: '',
  });

  // SEO Editable Fields
  const [altText, setAltText] = useState<string>('Zenemoo official site logo');
  const [logoTitle, setLogoTitle] = useState<string>('Zenemoo Official Logo');
  const [showSeoSettings, setShowSeoSettings] = useState<boolean>(false);

  // Single Clean Error Message
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Modals & Panels
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Drag & Drop State
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local SEO fields when logoData changes
  useEffect(() => {
    if (logoData) {
      if (logoData.altText) setAltText(logoData.altText);
      if (logoData.title) setLogoTitle(logoData.title);
    }
  }, [logoData]);

  // File Selection Handler with Pre-Upload Validation
  const processFile = (file: File) => {
    setErrorMessage('');
    setSuccessMessage('');

    // 1. MIME & Extension Check
    const mime = (file.type || '').toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_MIME_TYPES.includes(mime) && !ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage('Please upload a PNG, JPG, WEBP or supported SVG image under 5 MB.');
      setUploadState('ERROR');
      return;
    }

    // 2. Size Check
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('Please upload a PNG, JPG, WEBP or supported SVG image under 5 MB.');
      setUploadState('ERROR');
      return;
    }

    setUploadState('VALIDATING');
    const localUrl = URL.createObjectURL(file);

    // 3. Image Dimensions Check
    const img = new Image();
    img.onerror = () => {
      setErrorMessage('Corrupted or invalid image file. Please upload a valid PNG, JPG, WEBP or SVG file.');
      setUploadState('ERROR');
      URL.revokeObjectURL(localUrl);
    };
    img.onload = () => {
      const formattedSize = (file.size / 1024).toFixed(1) + ' KB';
      setFileSpecs({
        format: ext.toUpperCase(),
        dimensions: `${img.width} × ${img.height}`,
        width: img.width,
        height: img.height,
        size: formattedSize,
      });
      setSelectedFile(file);
      setFilePreviewUrl(localUrl);
      setUploadState('SELECTED');
      setAltText(`Zenemoo official site logo — ${file.name.replace(/\.[^/.]+$/, '')}`);
    };
    img.src = localUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleCancelSelection = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl('');
    setErrorMessage('');
    setUploadState('IDLE');
    setUploadProgress(0);
  };

  // Safe Execute Upload & Activate Pipeline
  const executeUploadAndActivate = async () => {
    if (!selectedFile) return;

    setErrorMessage('');
    setSuccessMessage('');
    setShowReplaceModal(false);

    try {
      // Step 1: Uploading
      setUploadState('UPLOADING');
      setUploadProgress(20);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('altText', altText.trim());
      formData.append('title', logoTitle.trim());

      setUploadProgress(45);
      setUploadState('PROCESSING');

      const response = await brandingApi.uploadLogo(formData);
      setUploadProgress(75);
      setUploadState('SAVING');

      if (response?.data?.success) {
        setUploadProgress(90);
        setUploadState('ACTIVATING');

        await refetchLogo();
        notifyLogoUpdated();

        setUploadProgress(100);
        setUploadState('SUCCESS');
        setSuccessMessage('✓ Logo uploaded successfully • Branding record saved • Logo activated');

        // Reset local selection state after success
        setSelectedFile(null);
        setFilePreviewUrl('');
        setTimeout(() => setUploadState('IDLE'), 3500);
      } else {
        throw new Error(response?.data?.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Logo Upload Execution Error:', err);
      setUploadState('ERROR');
      setUploadProgress(0);

      // Clean human-readable error messages (never expose AxiosError or raw 30000ms timeout)
      const rawMsg = err.response?.data?.message || err.message || '';
      if (rawMsg.toLowerCase().includes('timeout') || rawMsg.toLowerCase().includes('exceeded')) {
        setErrorMessage('Logo upload is taking longer than expected. Please try again.');
      } else if (rawMsg.toLowerCase().includes('404')) {
        setErrorMessage('Unable to reach the site branding service. Please refresh and try again.');
      } else {
        setErrorMessage('Logo could not be uploaded. Please check the file and try again.');
      }
    }
  };

  // Execute Delete Custom Logo Flow
  const executeDeleteLogo = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setShowDeleteModal(false);

    try {
      setUploadState('SAVING');
      const response = await brandingApi.deleteLogo();
      if (response?.data?.success) {
        await refetchLogo();
        notifyLogoUpdated();
        setSuccessMessage('Custom logo removed. Default Zenemoo brand mark restored.');
        setUploadState('SUCCESS');
        setTimeout(() => setUploadState('IDLE'), 3500);
      } else {
        throw new Error(response?.data?.message || 'Delete failed');
      }
    } catch (err: any) {
      console.error('Delete Logo Error:', err);
      setUploadState('ERROR');
      setErrorMessage('Unable to remove the custom logo. The existing logo has been preserved.');
    }
  };

  const currentDisplayUrl = filePreviewUrl || logoUrl || '/assets/logo.png';
  const hasCustomLogo = Boolean(logoData && logoData.cloudinary_public_id);
  const isBusy = ['UPLOADING', 'PROCESSING', 'SAVING', 'ACTIVATING'].includes(uploadState);

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto">
      {/* ── HEADER TITLE BAR ── */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              SITE BRANDING
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" /> Enterprise Media CDN
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Site Settings &amp; Brand Logo Manager
          </h2>
          <p className="text-xs text-slate-400 font-mono max-w-2xl leading-relaxed">
            Manage the official logo displayed across Zenemoo Desktop, Mobile Navbars, and Search Engine indexing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-right font-mono text-xs">
            <span className="text-slate-500 text-[10px] block uppercase font-bold">ACTIVE BRAND STATUS</span>
            {hasCustomLogo ? (
              <span className="text-emerald-400 font-bold flex items-center justify-end gap-1.5 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> ACTIVE ✓ (Cloudinary CDN)
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center justify-end gap-1.5 mt-0.5">
                <Info className="w-3.5 h-3.5 text-amber-400" /> DEFAULT BRANDMARK
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── SINGLE CLEAN SUCCESS & ERROR NOTIFICATIONS ── */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="p-1 text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center justify-between shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 text-red-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── STEP-BY-STEP PROGRESS BAR DURING UPLOAD/PROCESSING ── */}
      {isBusy && (
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/40 space-y-3 font-mono text-xs shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              {uploadState === 'UPLOADING' && 'Uploading Logo to Cloudinary...'}
              {uploadState === 'PROCESSING' && 'Processing Media CDN Asset...'}
              {uploadState === 'SAVING' && 'Saving Supabase Branding Record...'}
              {uploadState === 'ACTIVATING' && 'Activating Frontend Navbar Logo...'}
            </span>
            <span className="text-white font-bold">{uploadProgress}%</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-4">
            <span className={uploadProgress >= 25 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              ✓ Media Storage Upload
            </span>
            <span>•</span>
            <span className={uploadProgress >= 75 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              ✓ Branding Record Sync
            </span>
            <span>•</span>
            <span className={uploadProgress >= 95 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              ✓ Navbar Activation
            </span>
          </div>
        </div>
      )}

      {/* ── MAIN GRID: CURRENT ACTIVE LOGO & DROPZONE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: CURRENT ACTIVE LOGO CARD */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-cyan-400" /> CURRENT ACTIVE LOGO
                </h3>
                <span className="text-xs font-mono text-slate-400">Zenemoo Site Identity</span>
              </div>

              {/* Logo Display Container with Light & Dark contrast option */}
              <div className="relative w-full h-48 rounded-2xl bg-[#08090d] border border-white/10 flex items-center justify-center p-6 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-purple-500/5 opacity-50" />
                <div className="relative w-32 h-32 rounded-2xl bg-white/10 p-3 border border-white/10 flex items-center justify-center shadow-2xl">
                  <SeoImage
                    src={logoUrl}
                    alt={logoData?.altText || 'Zenemoo Official Site Logo'}
                    className="w-full h-full object-contain"
                    fallbackSrc="/assets/logo.png"
                  />
                </div>
              </div>

              {/* Active Logo Metadata Roster */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>{logoData?.title || 'Zenemoo Official Site Logo'}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {hasCustomLogo ? 'Cloudinary CDN' : 'Default Brandmark'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>Format: <span className="text-white font-bold uppercase">{logoData?.format || 'PNG'}</span></div>
                  <div>Dimensions: <span className="text-purple-300 font-bold">{logoData?.width ? `${logoData.width} × ${logoData.height}` : '2978 × 2978'}</span></div>
                  <div>File Size: <span className="text-slate-300">{logoData?.fileSize || 'N/A'}</span></div>
                  <div>Status: <span className="text-emerald-400 font-bold">{hasCustomLogo ? 'ACTIVE ✓' : 'DEFAULT'}</span></div>
                </div>

                {logoData?.cloudinary_public_id && (
                  <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-white/5">
                    Public ID: <span className="text-cyan-400 font-mono">{logoData.cloudinary_public_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar: Preview, Replace, Remove */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Eye className="w-4 h-4 text-cyan-400" /> Preview Navbar
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex-1 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4 text-cyan-400" /> Replace Logo
              </button>

              {hasCustomLogo && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isBusy}
                  className="px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Remove Custom Logo"
                >
                  <Trash2 className="w-4 h-4 text-red-400" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: UPLOAD NEW LOGO / SELECTED FILE */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" /> UPLOAD NEW LOGO
              </h3>
              <span className="text-xs font-mono text-purple-400">Drag &amp; Drop Dropzone</span>
            </div>

            {!selectedFile ? (
              /* Drag & Drop Upload Zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-10 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-4 cursor-pointer relative ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                    : 'border-white/15 bg-white/[0.01] hover:border-purple-400/50 hover:bg-white/[0.03]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-cyan-400 shadow-xl">
                  <Upload className="w-8 h-8 animate-bounce" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white font-display">Drag &amp; Drop Logo Here</h4>
                  <p className="text-xs font-mono text-slate-400">or click to browse from computer</p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-cyan-300 font-bold">
                  PNG / JPG / WEBP / SVG &bull; Maximum 5 MB
                </div>
              </div>
            ) : (
              /* Selected File Card & Actions */
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                    <span className="font-bold text-cyan-300 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-cyan-400" /> SELECTED FILE DETAILS
                    </span>
                    <button
                      onClick={handleCancelSelection}
                      disabled={isBusy}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-900 border border-white/10 p-1 flex items-center justify-center shrink-0">
                      <img src={filePreviewUrl} alt="Selected preview" className="w-full h-full object-contain" />
                    </div>

                    <div className="space-y-1 text-[11px] min-w-0 flex-1">
                      <div className="text-white font-bold truncate">Filename: {selectedFile.name}</div>
                      <div className="text-slate-300">Dimensions: <span className="text-purple-300 font-bold">{fileSpecs.dimensions} px</span></div>
                      <div className="text-slate-300">Size: <span className="text-cyan-300 font-bold">{fileSpecs.size}</span> ({fileSpecs.format})</div>
                    </div>
                  </div>

                  {/* Expandable Image SEO Metadata Controls */}
                  <div className="pt-2 border-t border-cyan-500/20">
                    <button
                      type="button"
                      onClick={() => setShowSeoSettings(!showSeoSettings)}
                      className="text-[11px] text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Sliders className="w-3.5 h-3.5" /> {showSeoSettings ? 'Hide Image SEO Metadata' : 'Edit Image SEO Metadata'}
                    </button>

                    {showSeoSettings && (
                      <div className="mt-3 space-y-3 p-3 rounded-xl bg-black/40 border border-white/10">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Alt Text (Search Engine Accessibility):</label>
                          <input
                            type="text"
                            value={altText}
                            onChange={(e) => setAltText(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-cyan-400 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Logo Title Tag:</label>
                          <input
                            type="text"
                            value={logoTitle}
                            onChange={(e) => setLogoTitle(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-cyan-400 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowPreviewModal(true)}
                      disabled={isBusy}
                      className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4 text-cyan-400" /> Preview
                    </button>

                    <button
                      onClick={handleCancelSelection}
                      disabled={isBusy}
                      className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        if (hasCustomLogo) {
                          setShowReplaceModal(true);
                        } else {
                          executeUploadAndActivate();
                        }
                      }}
                      disabled={isBusy}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
                    >
                      {isBusy ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-black" /> Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-black" /> Save &amp; Activate Logo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PREVIEW BEFORE ACTIVATION MODAL ── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans">
          <div className="w-full max-w-2xl bg-[#090a10] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-lg font-bold font-display text-white">LOGO PREVIEW &amp; SIMULATION</h3>
                  <p className="text-[10px] text-slate-400">Verify appearance before activation</p>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Desktop Navbar Simulation */}
            <div className="space-y-2">
              <label className="text-slate-400 font-bold flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400" /> Navbar Desktop Simulation
              </label>
              <div className="p-4 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shrink-0">
                    <SeoImage src={currentDisplayUrl} alt="Preview" className="w-full h-full object-contain rounded-full bg-white p-0.5" />
                  </div>
                  <span className="text-lg font-extrabold font-display text-white tracking-wider">ZENEMOO</span>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-slate-400 text-xs font-mono">
                  <span>Home</span>
                  <span>Services</span>
                  <span>Opportunities</span>
                  <span className="px-3 py-1 rounded-full bg-cyan-500 text-black font-bold text-[10px]">Admin</span>
                </div>
              </div>
            </div>

            {/* 2. Light & Dark Background Contrast Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Light Background Contrast
                </label>
                <div className="p-6 rounded-2xl bg-white border border-slate-300 flex items-center justify-center shadow-lg">
                  <SeoImage src={currentDisplayUrl} alt="Light Preview" className="h-12 w-auto object-contain" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-purple-400" /> Dark Background Contrast
                </label>
                <div className="p-6 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-center shadow-lg">
                  <SeoImage src={currentDisplayUrl} alt="Dark Preview" className="h-12 w-auto object-contain" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                Close Preview
              </button>

              {selectedFile && (
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    if (hasCustomLogo) {
                      setShowReplaceModal(true);
                    } else {
                      executeUploadAndActivate();
                    }
                  }}
                  disabled={isBusy}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-black" /> Save &amp; Activate Logo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REPLACE CONFIRMATION MODAL ── */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-mono text-xs">
          <div className="w-full max-w-md bg-[#0c0d12] border border-cyan-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 text-cyan-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <h3 className="text-base font-bold font-display text-white">Replace Current Logo?</h3>
            </div>

            <p className="text-slate-300 leading-relaxed bg-white/[0.03] p-4 rounded-xl border border-white/10">
              Uploading a new logo will replace the currently active site logo. The previous Cloudinary asset will be safely purged only after the new logo is confirmed working.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReplaceModal(false)}
                disabled={isBusy}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={executeUploadAndActivate}
                disabled={isBusy}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
              >
                {isBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Replace Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-mono text-xs">
          <div className="w-full max-w-md bg-[#0c0d12] border border-red-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-bold font-display text-white">Remove Active Logo?</h3>
            </div>

            <p className="text-slate-300 leading-relaxed bg-white/[0.03] p-4 rounded-xl border border-white/10">
              This will remove the custom logo and restore the default Zenemoo logo. The custom Cloudinary asset will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isBusy}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={executeDeleteLogo}
                disabled={isBusy}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 cursor-pointer flex items-center gap-2"
              >
                {isBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove Logo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
