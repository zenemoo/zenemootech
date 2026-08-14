import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Edit3, CheckCircle, Upload, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { mediaApi } from '../services/api';
import { SeoImage } from '../seo/components/SeoImage';

export interface SeoImageUploadResult {
  imageUrl: string;
  publicId: string;
  seoFilename: string;
  altText: string;
  title: string;
  description: string;
  width?: number;
  height?: number;
  format?: string;
  fileSize?: number;
}

interface AdminSeoImageUploaderProps {
  folder?: string;
  entityType?: 'opportunity' | 'program' | 'team' | 'partner' | 'logo' | 'service' | 'blog' | 'general';
  entityId?: string;
  entityTitle?: string;
  assetType?: 'banner' | 'poster' | 'profile' | 'logo' | 'image';
  currentImageUrl?: string;
  currentPublicId?: string;
  onUploadSuccess: (result: SeoImageUploadResult) => void;
  label?: string;
  className?: string;
}

export const AdminSeoImageUploader: React.FC<AdminSeoImageUploaderProps> = ({
  folder = 'zenemoo/team',
  entityType = 'general',
  entityId = '',
  entityTitle = '',
  assetType = 'image',
  currentImageUrl = '',
  currentPublicId = '',
  onUploadSuccess,
  label = 'Upload Image with Auto SEO',
  className = '',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSeoEditor, setShowSeoEditor] = useState(false);

  // Auto-calculated SEO Metadata
  const [autoSeo, setAutoSeo] = useState({
    seoFilename: '',
    altText: '',
    title: '',
    description: '',
    format: '',
    dimensions: '',
    fileSize: '',
  });

  // Admin Custom Overrides (Optional)
  const [customAlt, setCustomAlt] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Calculate live SEO preview values upon file selection or entityTitle change
  useEffect(() => {
    if (currentImageUrl && !selectedFile) {
      setPreviewUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  const generateAutoMetadata = (file: File) => {
    const rawName = file.name;
    const extMatch = rawName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

    const cleanSlug = (entityTitle || rawName.replace(/\.[^/.]+$/, ''))
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-');

    const calculatedSeoFilename = `zenemoo-${cleanSlug || 'ai-asset'}.${ext}`;

    let calculatedAlt = '';
    const titleContext = entityTitle.trim();

    if (entityType === 'logo') {
      calculatedAlt = 'Zenemoo official logo';
    } else if (entityType === 'opportunity' || entityType === 'program') {
      calculatedAlt = titleContext
        ? `Zenemoo ${titleContext} ${assetType === 'banner' ? 'Opportunity Banner' : 'AI Data Collection Project'}`
        : 'Zenemoo AI Data Collection Project';
    } else if (entityType === 'team') {
      calculatedAlt = titleContext ? `Zenemoo Team Member — ${titleContext}` : 'Zenemoo Specialized Language Data Specialist';
    } else if (entityType === 'partner') {
      calculatedAlt = titleContext ? `Zenemoo Enterprise Partner Logo — ${titleContext}` : 'Zenemoo Partner Logo';
    } else {
      calculatedAlt = titleContext ? `Zenemoo ${titleContext}` : 'Zenemoo Enterprise AI Solution';
    }

    const calculatedTitle = titleContext ? `Zenemoo ${titleContext} (${assetType})` : 'Zenemoo Enterprise Visual Asset';
    const calculatedDesc = titleContext
      ? `Official ${assetType} visual asset for ${titleContext} provided by Zenemoo Enterprise AI Solutions.`
      : 'Official visual asset for Zenemoo enterprise language & AI data solutions.';

    const sizeInKb = (file.size / 1024).toFixed(1) + ' KB';

    setAutoSeo({
      seoFilename: calculatedSeoFilename,
      altText: calculatedAlt,
      title: calculatedTitle,
      description: calculatedDesc,
      format: ext.toUpperCase(),
      dimensions: 'Auto-calculated on Cloudinary upload',
      fileSize: sizeInKb,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB limit.');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Compute Auto SEO metadata
    generateAutoMetadata(file);

    // Read image dimensions locally if possible
    const img = new Image();
    img.onload = () => {
      setAutoSeo((prev) => ({
        ...prev,
        dimensions: `${img.width} × ${img.height} px`,
      }));
    };
    img.src = localUrl;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', folder);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);
      formData.append('entity_title', entityTitle);
      formData.append('asset_type', assetType);

      // Send admin custom overrides if specified, otherwise backend auto-generates
      if (customAlt.trim()) formData.append('alt_text', customAlt.trim());
      if (customTitle.trim()) formData.append('title', customTitle.trim());
      if (customDescription.trim()) formData.append('description', customDescription.trim());

      const res = await mediaApi.upload(formData);
      const resData = res.data;

      if (resData.success && (resData.media || resData.data)) {
        const item = resData.media || resData.data;
        const finalResult: SeoImageUploadResult = {
          imageUrl: item.cloudinary_secure_url || item.image_url,
          publicId: item.cloudinary_public_id || item.public_id,
          seoFilename: item.seo_filename || autoSeo.seoFilename,
          altText: customAlt.trim() || item.alt_text || autoSeo.altText,
          title: customTitle.trim() || item.title || autoSeo.title,
          description: customDescription.trim() || item.description || autoSeo.description,
          width: item.width,
          height: item.height,
          format: item.format,
          fileSize: item.file_size || item.bytes,
        };

        setPreviewUrl(finalResult.imageUrl);
        onUploadSuccess(finalResult);
        setSelectedFile(null);
        setShowSeoEditor(false);
      } else {
        throw new Error(resData.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Image SEO upload error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
        {label}
      </label>

      {/* File Upload Box */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-all">
        {previewUrl ? (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-black/60 border border-cyan-500/30 shrink-0 group shadow-lg">
            <SeoImage
              src={previewUrl}
              alt={customAlt || autoSeo.altText || 'Uploaded asset preview'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] font-mono text-cyan-300 font-bold">SEO Ready</span>
            </div>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
            <ImageIcon className="w-8 h-8 text-slate-600 mb-1" />
            <span className="text-[10px] font-mono">No Image</span>
          </div>
        )}

        <div className="flex-1 w-full space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 file:cursor-pointer cursor-pointer"
          />

          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Auto SEO: Generates alt text, title &amp; clean filename automatically.
          </p>

          {selectedFile && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Uploading to Cloudinary...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Save &amp; Generate SEO Asset
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowSeoEditor(!showSeoEditor)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                {showSeoEditor ? 'Hide SEO Preview' : 'Review SEO Metadata'}
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Automatic SEO Preview & Inspector Panel */}
      {(selectedFile || showSeoEditor || previewUrl) && (
        <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/20 text-xs font-mono text-slate-300 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>AUTOMATIC IMAGE SEO PREVIEW</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Google Image Search Optimized
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Readonly Auto Calculated Metadata */}
            <div className="space-y-2">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">SEO Filename:</span>
                <span className="text-cyan-300 font-semibold break-all">
                  {autoSeo.seoFilename || (currentPublicId ? `${currentPublicId}.jpg` : 'zenemoo-asset.jpg')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 text-[10px] block">Dimensions</span>
                  <span className="text-slate-200">{autoSeo.dimensions || 'Responsive'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Format</span>
                  <span className="text-purple-300">{autoSeo.format || 'WEBP / JPG'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">File Size</span>
                  <span className="text-emerald-300">{autoSeo.fileSize || 'Optimized'}</span>
                </div>
              </div>
            </div>

            {/* Optional Edit Fields */}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  Alt Text (Auto-generated):
                </label>
                <input
                  type="text"
                  value={customAlt !== '' ? customAlt : autoSeo.altText}
                  onChange={(e) => setCustomAlt(e.target.value)}
                  placeholder="Auto-derived from content"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  Title (Auto-generated):
                </label>
                <input
                  type="text"
                  value={customTitle !== '' ? customTitle : autoSeo.title}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Auto-derived title"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:border-cyan-400 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
