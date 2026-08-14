import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
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
} from 'lucide-react';
import { brandingApi } from '../services/api';
import { useActiveLogo, notifyLogoUpdated } from '../lib/useActiveLogo';
import { SeoImage } from '../seo/components/SeoImage';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const AdminBrandLogoSettings: React.FC = () => {
  const { logoUrl, logoData, isLoading, refetchLogo } = useActiveLogo();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Calculated local file specs
  const [fileSpecs, setFileSpecs] = useState({
    format: '',
    dimensions: '',
    size: '',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    setStatusMsg(null);

    // Validate type and size
    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_TYPES.includes(mime) && !['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      setFileError('Unsupported file format. Please select a valid PNG, JPG, WEBP, or SVG image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('File size exceeds the 5MB limit. Please upload a smaller image.');
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFilePreview(localUrl);

    const sizeKb = (file.size / 1024).toFixed(1) + ' KB';

    // Calculate dimensions
    const img = new Image();
    img.onload = () => {
      setFileSpecs({
        format: ext.toUpperCase(),
        dimensions: `${img.width} × ${img.height} px`,
        size: sizeKb,
      });
    };
    img.src = localUrl;
  };

  const handleCancelSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview('');
    setFileError('');
  };

  const executeUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setFileError('');
    setStatusMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await brandingApi.uploadLogo(formData);
      if (res.data && res.data.success) {
        setStatusMsg({ text: 'Site logo updated successfully on Cloudinary and Supabase!', type: 'success' });
        setSelectedFile(null);
        setFilePreview('');
        setShowReplaceModal(false);
        await refetchLogo();
        notifyLogoUpdated();
      } else {
        throw new Error(res.data?.message || 'Failed to upload logo');
      }
    } catch (err: any) {
      console.error('Logo upload error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to update logo. The existing logo has been preserved.';
      setFileError(msg);
      setStatusMsg({ text: msg, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    setStatusMsg(null);
    try {
      const res = await brandingApi.deleteLogo();
      if (res.data && res.data.success) {
        setStatusMsg({ text: 'Logo permanently deleted. Reverted to default brand mark.', type: 'success' });
        setShowDeleteModal(false);
        await refetchLogo();
        notifyLogoUpdated();
      } else {
        throw new Error(res.data?.message || 'Delete failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unable to delete the logo. The existing logo has been preserved.';
      setStatusMsg({ text: msg, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const activeUrl = filePreview || logoUrl || '/assets/logo.png';
  const isCustomConfigured = logoData && logoData.cloudinary_public_id;

  return (
    <div className="space-y-8 font-sans">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              Site Settings &amp; Branding
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Cloudinary Lifecycle CDN
            </span>
          </div>
          <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
            Brand Logo &amp; Identity Assets
          </h2>
          <p className="text-xs text-slate-400 font-mono max-w-2xl leading-relaxed">
            Manage your official Zenemoo site logo across Desktop, Tablet, Mobile Navbars, and Browser Favicons. Uploaded assets are optimized and stored in Cloudinary <code className="text-cyan-400">zenemoo/site-branding/logo/</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-right font-mono text-xs">
            <span className="text-slate-500 text-[10px] block uppercase">Logo Status</span>
            {isCustomConfigured ? (
              <span className="text-emerald-400 font-bold flex items-center justify-end gap-1.5 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5" /> Active CDN Logo
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center justify-end gap-1.5 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5" /> Default Brandmark
              </span>
            )}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-mono flex items-center gap-3 shadow-lg ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Grid: Management Card & Admin Live Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Management Card */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <ImageIcon className="w-5 h-5 text-cyan-400" /> Active Logo Controls
            </h3>

            {/* Current Active Asset Card */}
            <div className="flex items-center gap-5 p-4 rounded-2xl bg-black/50 border border-white/10">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0">
                <SeoImage src={activeUrl} alt="Active Logo" className="w-full h-full object-contain" />
              </div>

              <div className="space-y-1 font-mono text-xs flex-1 min-w-0">
                <div className="text-white font-bold truncate">
                  {logoData?.asset_name || 'Zenemoo Official Site Logo'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Format: <span className="text-cyan-400 uppercase">{logoData?.format || 'PNG'}</span> • Dimensions:{' '}
                  <span className="text-purple-300">{logoData?.width ? `${logoData.width} × ${logoData.height} px` : 'Auto'}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Public ID: <span className="text-slate-300">{logoData?.cloudinary_public_id || 'default_asset'}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Last Updated: {logoData?.updated_at ? new Date(logoData.updated_at).toLocaleString() : 'System Default'}
                </div>
              </div>
            </div>

            {/* Select New File / Replace Area */}
            <div className="space-y-4">
              <label className="block text-xs font-mono font-bold text-slate-300">
                Upload or Replace Site Logo (PNG, JPG, WEBP, SVG up to 5MB):
              </label>

              {!selectedFile ? (
                <div className="flex items-center gap-3">
                  <label className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-cyan-500/10">
                    <Upload className="w-4 h-4" />
                    <span>Upload New Logo</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFileSelect} className="hidden" />
                  </label>

                  {isCustomConfigured && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Delete Logo
                    </button>
                  )}
                </div>
              ) : (
                /* Selected File Pre-Upload Actions */
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-cyan-400" /> Selected File Ready for Activation
                    </span>
                    <button onClick={handleCancelSelectedFile} className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div>Filename: <strong className="text-white">{selectedFile.name}</strong></div>
                    <div>Specs: <span className="text-purple-300">{fileSpecs.dimensions}</span> ({fileSpecs.size}, {fileSpecs.format})</div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (isCustomConfigured) {
                          setShowReplaceModal(true);
                        } else {
                          executeUpload();
                        }
                      }}
                      disabled={isUploading}
                      className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-black" /> Uploading to Cloudinary...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-black" /> Save &amp; Activate Logo
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCancelSelectedFile}
                      disabled={isUploading}
                      className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {fileError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Admin Live Navbar & Favicon Previews */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <h3 className="text-base font-bold font-display text-white flex items-center justify-between border-b border-white/10 pb-4">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> Real-time Navbar Previews
              </span>
              <span className="text-xs font-mono text-cyan-400">Live Simulation</span>
            </h3>

            {/* 1. Desktop Navbar Preview */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 font-bold flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-cyan-400" /> 1. Desktop Navbar Display (1920 × 1080)
              </label>
              <div className="p-4 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shrink-0">
                    <SeoImage src={activeUrl} alt="Desktop Preview" className="w-full h-full object-contain rounded-full bg-white p-0.5" />
                  </div>
                  <span className="text-lg font-extrabold font-display text-white tracking-wider">ZENEMOO</span>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span>Home</span>
                  <span>Services</span>
                  <span>Opportunities</span>
                  <span className="px-3 py-1 rounded-full bg-cyan-500 text-black font-bold text-[10px]">Zenemoo AI</span>
                </div>
              </div>
            </div>

            {/* 2. Mobile Navbar Preview */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 font-bold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-purple-400" /> 2. Mobile Navbar Display (375 × 812)
              </label>
              <div className="max-w-xs p-3 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0">
                    <SeoImage src={activeUrl} alt="Mobile Preview" className="w-full h-full object-contain rounded-full bg-white p-0.5" />
                  </div>
                  <span className="text-base font-extrabold font-display text-white">ZENEMOO</span>
                </div>
                <span className="p-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-mono">☰</span>
              </div>
            </div>

            {/* 3. Browser Favicon Preview */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 font-bold flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" /> 3. Browser Tab Favicon Preview (32 × 32)
              </label>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs text-slate-300">
                <div className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
                  <SeoImage src={activeUrl} alt="Favicon" className="w-full h-full object-contain rounded-full" />
                </div>
                <span>Zenemoo — AI Data Solutions</span>
                <span className="text-slate-600">×</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REPLACE CONFIRMATION MODAL */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-mono text-xs">
          <div className="w-full max-w-md bg-[#0c0d12] border border-cyan-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 text-cyan-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <h3 className="text-base font-bold font-display text-white">Replace Current Site Logo?</h3>
            </div>

            <p className="text-slate-300 leading-relaxed bg-white/[0.03] p-4 rounded-xl border border-white/10">
              Uploading a new logo will replace the currently active site logo. The previous Cloudinary asset will be safely purged after the new upload succeeds.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReplaceModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={executeUpload}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Replace Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-mono text-xs">
          <div className="w-full max-w-md bg-[#0c0d12] border border-red-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-bold font-display text-white">Delete Site Logo?</h3>
            </div>

            <p className="text-slate-300 leading-relaxed bg-white/[0.03] p-4 rounded-xl border border-white/10">
              Are you sure you want to permanently delete this logo from Cloudinary? The website will automatically fall back to the default Zenemoo brand mark. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
