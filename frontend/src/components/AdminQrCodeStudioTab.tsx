import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Link2,
  Palette,
  Eye,
  Maximize2,
  ShieldCheck,
  X,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { shortenerApi, ShortenerLinkItem } from '../services/api';

interface AdminQrCodeStudioTabProps {
  onAddToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Curated High-Contrast Presets
const COLOR_PRESETS = [
  { name: 'Classic Dark', fg: '#000000', bg: '#ffffff' },
  { name: 'Zenemoo Cyan', fg: '#22d3ee', bg: '#06070b' },
  { name: 'Electric Indigo', fg: '#6366f1', bg: '#090b11' },
  { name: 'Emerald Forest', fg: '#10b981', bg: '#050c08' },
  { name: 'Royal Violet', fg: '#a855f7', bg: '#0c0714' },
  { name: 'Amber Sunset', fg: '#f59e0b', bg: '#0d0a04' },
  { name: 'Monochrome Slate', fg: '#0f172a', bg: '#f8fafc' },
];

// Quick URL Suggestions
const QUICK_PRESETS = [
  { label: 'Zenemoo Home', url: 'https://zenemoo.in' },
  { label: 'Talent Hub', url: 'https://zenemoo.in/talent-hub' },
  { label: 'Opportunities', url: 'https://zenemoo.in/opportunities' },
  { label: 'DesiCrew Programs', url: 'https://zenemoo.in/desicrew-contributors' },
  { label: 'Book a Call', url: 'https://zenemoo.in/book-a-call' },
];

/**
 * Calculates WCAG 2.1 relative luminance and contrast ratio between two hex colors
 */
function getRelativeLuminance(hex: string): number {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 10) / 255;
  const g = parseInt(clean.substring(2, 4), 10) / 255;
  const b = parseInt(clean.substring(4, 6), 10) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = getRelativeLuminance(hex1);
    const l2 = getRelativeLuminance(hex2);
    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (brighter + 0.05) / (darker + 0.05);
  } catch (_) {
    return 1;
  }
}

/**
 * Canvas rounded rectangle helper
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const AdminQrCodeStudioTab: React.FC<AdminQrCodeStudioTabProps> = ({ onAddToast }) => {
  // Content State
  const [qrText, setQrText] = useState('https://zenemoo.in');
  
  // URL Shortener Links Picker
  const [shortLinks, setShortLinks] = useState<ShortenerLinkItem[]>([]);
  const [isLoadingShortLinks, setIsLoadingShortLinks] = useState(false);
  const [isShortLinksDropdownOpen, setIsShortLinksDropdownOpen] = useState(false);

  // Logo State (stored strictly in local memory)
  const [logoOption, setLogoOption] = useState<'none' | 'zenemoo' | 'custom'>('zenemoo');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [customLogoName, setCustomLogoName] = useState<string>('');
  const [logoScale, setLogoScale] = useState(20); // 12% to 26% of QR width
  const [logoPadding, setLogoPadding] = useState(6); // padding around logo badge
  const [logoBorderRadius, setLogoBorderRadius] = useState(12); // radius in px
  const [logoBgColor, setLogoBgColor] = useState('#ffffff');

  // Styling & Color State
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [margin, setMargin] = useState(2); // Quiet zone modules
  const [resolution, setResolution] = useState<512 | 1024 | 2048>(1024);
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');

  // Preview & Export State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Load URL shortener links in memory for quick picker
  const loadShortLinks = useCallback(async () => {
    setIsLoadingShortLinks(true);
    try {
      const res = await shortenerApi.getLinks({ limit: 100 });
      if (res.data?.success && Array.isArray(res.data.links)) {
        setShortLinks(res.data.links);
      }
    } catch (_) {
      // Graceful fallback
    } finally {
      setIsLoadingShortLinks(false);
    }
  }, []);

  useEffect(() => {
    loadShortLinks();
  }, [loadShortLinks]);

  // Clean up custom logo object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (customLogoUrl && customLogoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customLogoUrl);
      }
    };
  }, [customLogoUrl]);

  // Contrast Ratio Calculation
  const contrastRatio = getContrastRatio(fgColor, bgColor);
  const isContrastWarning = contrastRatio < 3.0;

  // Enforce Error Correction Level 'H' when a center logo is active
  const effectiveErrorCorrection = logoOption !== 'none' ? 'H' : errorCorrection;

  // Active logo source
  const getActiveLogoSrc = (): string | null => {
    if (logoOption === 'zenemoo') {
      return '/assets/logo.png';
    }
    if (logoOption === 'custom' && customLogoUrl) {
      return customLogoUrl;
    }
    return null;
  };

  // Re-render QR code on canvas whenever parameters change
  const renderQrCode = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrText.trim()) return;

    setIsGenerating(true);
    try {
      // 1. Generate base QR code onto canvas
      await QRCode.toCanvas(canvas, qrText.trim(), {
        width: resolution,
        margin: margin,
        errorCorrectionLevel: effectiveErrorCorrection,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      });

      const ctx = canvas.getContext('2d');
      const logoSrc = getActiveLogoSrc();

      // 2. Draw logo on center if enabled
      if (ctx && logoSrc) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = logoSrc;

        await new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve(); // continue if logo fails to load
        });

        if (logoImg.width > 0 && logoImg.height > 0) {
          const logoPixelSize = resolution * (logoScale / 100);
          const x = (resolution - logoPixelSize) / 2;
          const y = (resolution - logoPixelSize) / 2;
          const pad = logoPadding;

          // Draw protective badge background behind logo
          ctx.save();
          ctx.fillStyle = logoBgColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;

          drawRoundedRect(
            ctx,
            x - pad,
            y - pad,
            logoPixelSize + pad * 2,
            logoPixelSize + pad * 2,
            logoBorderRadius
          );
          ctx.fill();
          ctx.restore();

          // Clip logo to rounded rect
          ctx.save();
          drawRoundedRect(ctx, x, y, logoPixelSize, logoPixelSize, Math.max(0, logoBorderRadius - 2));
          ctx.clip();
          ctx.drawImage(logoImg, x, y, logoPixelSize, logoPixelSize);
          ctx.restore();
        }
      }
    } catch (err: any) {
      console.warn('[QR Generator Error]', err);
    } finally {
      setIsGenerating(false);
    }
  }, [
    qrText,
    resolution,
    margin,
    effectiveErrorCorrection,
    fgColor,
    bgColor,
    logoOption,
    customLogoUrl,
    logoScale,
    logoPadding,
    logoBorderRadius,
    logoBgColor,
  ]);

  useEffect(() => {
    renderQrCode();
  }, [renderQrCode]);

  // Handle Local Logo Upload (purely in memory)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onAddToast('Invalid File', 'Please upload a valid PNG, JPG, or SVG image file.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onAddToast('File Too Large', 'Please select an image smaller than 5MB.', 'warning');
      return;
    }

    if (customLogoUrl && customLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customLogoUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomLogoUrl(objectUrl);
    setCustomLogoName(file.name);
    setLogoOption('custom');
    onAddToast('Logo Loaded', `"${file.name}" loaded locally in browser memory.`, 'success');
  };

  // Download Handler (PNG)
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `zenemoo_qr_${resolution}x${resolution}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    onAddToast('PNG Downloaded', `Exported at ${resolution}×${resolution} resolution`, 'success');
  };

  // Download Handler (JPG with guaranteed solid background)
  const handleDownloadJpg = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an offscreen canvas with explicit background fill to guarantee zero transparency artifacts
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0);

    const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = `zenemoo_qr_${resolution}x${resolution}_${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
    onAddToast('JPG Downloaded', `Exported at ${resolution}×${resolution} resolution`, 'success');
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setIsCopied(true);
          onAddToast('Image Copied', 'QR code copied to clipboard as PNG', 'success');
          setTimeout(() => setIsCopied(false), 2000);
        } catch (_) {
          // Fallback to copying URL text
          navigator.clipboard.writeText(qrText);
          onAddToast('URL Copied', 'Copied QR text to clipboard', 'info');
        }
      }, 'image/png');
    } catch (_) {
      onAddToast('Copy Unavailable', 'Your browser does not permit direct image clipboard copy.', 'warning');
    }
  };

  // Reset to default
  const handleReset = () => {
    setQrText('https://zenemoo.in');
    setFgColor('#000000');
    setBgColor('#ffffff');
    setLogoOption('zenemoo');
    setLogoScale(20);
    setLogoPadding(6);
    setLogoBorderRadius(12);
    setLogoBgColor('#ffffff');
    setMargin(2);
    setResolution(1024);
    setErrorCorrection('H');
    if (customLogoUrl && customLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customLogoUrl);
    }
    setCustomLogoUrl(null);
    setCustomLogoName('');
    onAddToast('Reset Complete', 'Restored default Zenemoo QR Code settings', 'info');
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              QR Code Studio
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                Client-Side Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              High-resolution vector-quality QR codes with center branding. 100% private in-browser generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
            title="Reset All Controls"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN STUDIO LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CONTROLS & STYLING (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. CONTENT & SHORTENER LINK PICKER */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                QR Code Content
              </label>

              {/* URL Shortener Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsShortLinksDropdownOpen(!isShortLinksDropdownOpen)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Insert Short Link</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isShortLinksDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 max-h-64 overflow-y-auto rounded-xl bg-[#090b11] border border-white/15 shadow-2xl p-2 z-50 space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1">
                      Choose Active Short Link:
                    </p>
                    {shortLinks.length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono italic px-2 py-2">
                        {isLoadingShortLinks ? 'Loading links...' : 'No short links found.'}
                      </p>
                    ) : (
                      shortLinks.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => {
                            setQrText(`https://zenemoo.in/l/${l.code}`);
                            setIsShortLinksDropdownOpen(false);
                            onAddToast('Short Link Inserted', `https://zenemoo.in/l/${l.code}`, 'info');
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300 group-hover:text-cyan-200">
                            <span>/l/{l.code}</span>
                            <span className="text-[9px] text-slate-500">{l.status}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{l.destination_url}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Input textarea/input */}
            <div className="relative">
              <textarea
                rows={2}
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                placeholder="Enter any destination URL (e.g. https://zenemoo.in) or text..."
                className="w-full p-3 pr-8 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all resize-none"
              />
              {qrText && (
                <button
                  type="button"
                  onClick={() => setQrText('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                  title="Clear Input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick URL chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-slate-500 mr-1">Quick:</span>
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setQrText(p.url)}
                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. CENTER LOGO & BRANDING */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                Center Logo Embedding
              </label>
              <span className="text-[10px] font-mono text-slate-400">High Error Correction Active</span>
            </div>

            {/* Logo Options Radio */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setLogoOption('none')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  logoOption === 'none'
                    ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold'
                    : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-mono">No Logo</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Plain QR pattern</div>
              </button>

              <button
                type="button"
                onClick={() => setLogoOption('zenemoo')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  logoOption === 'zenemoo'
                    ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold'
                    : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-mono flex items-center justify-center gap-1">
                  <span>Zenemoo</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">Official Badge</div>
              </button>

              <label
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer block ${
                  logoOption === 'custom'
                    ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold'
                    : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="text-xs font-mono flex items-center justify-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                  {customLogoName ? customLogoName : 'Local image'}
                </div>
              </label>
            </div>

            {/* Fine-Tuning Sliders (Only visible when logo is enabled) */}
            {logoOption !== 'none' && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3.5">
                {/* Logo Size */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Logo Size ({logoScale}%)</span>
                    <span className="text-[10px] text-slate-500">Max recommended: 25%</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={26}
                    value={logoScale}
                    onChange={(e) => setLogoScale(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Logo Background Padding */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Protective Badge Padding ({logoPadding}px)</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={16}
                    value={logoPadding}
                    onChange={(e) => setLogoPadding(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Badge Corner Radius */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Badge Roundness ({logoBorderRadius}px)</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={logoBorderRadius}
                    onChange={(e) => setLogoBorderRadius(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Badge Background Color */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono text-slate-300">Badge Background:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={logoBgColor}
                      onChange={(e) => setLogoBgColor(e.target.value)}
                      className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={logoBgColor}
                      onChange={(e) => setLogoBgColor(e.target.value)}
                      className="w-20 px-2 py-1 rounded bg-black/60 border border-white/10 text-white text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. COLORS & PALETTE PRESETS */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                Color Customization
              </label>

              {/* Contrast Indicator Badge */}
              <div
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isContrastWarning
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {isContrastWarning ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                <span>Contrast: {contrastRatio.toFixed(1)}:1</span>
              </div>
            </div>

            {/* Warning if contrast is low */}
            {isContrastWarning && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Low contrast detected ({contrastRatio.toFixed(1)}:1). Smartphone cameras may fail to scan this code.
                  Consider increasing the contrast between foreground and background.
                </p>
              </div>
            )}

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">Foreground (Pattern)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">Background</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Palette Presets */}
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
                Curated High-Contrast Palettes:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setFgColor(preset.fg);
                      setBgColor(preset.bg);
                      setLogoBgColor(preset.bg === '#06070b' || preset.bg.startsWith('#0') ? '#000000' : '#ffffff');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: preset.fg }}
                    />
                    <span className="text-[11px]">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. RESOLUTION & QUIET ZONE SPECIFICATIONS */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Resolution & Export Quality
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: '512 px', value: 512, sub: 'Mobile / Web' },
                { label: '1024 px', value: 1024, sub: 'High-Res Digital' },
                { label: '2048 px', value: 2048, sub: 'Print & Poster' },
              ].map((res) => (
                <button
                  key={res.value}
                  type="button"
                  onClick={() => setResolution(res.value as any)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    resolution === res.value
                      ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-mono">{res.label}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{res.sub}</div>
                </button>
              ))}
            </div>

            {/* Margin Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Quiet Zone Margin ({margin} modules)</span>
                <span className="text-[10px] text-slate-500">Industry standard: 2-4 modules</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE CANVAS PREVIEW & EXPORT (5 COLS) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Live Preview
              </span>
              <span className="text-[10px] font-mono text-cyan-300">
                {resolution}×{resolution} px
              </span>
            </div>

            {/* Canvas Rendering Box */}
            <div className="relative p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center min-h-[300px] overflow-hidden">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-xl shadow-2xl transition-all"
                style={{ width: '100%', maxWidth: '280px', aspectRatio: '1/1' }}
              />

              {isGenerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Content Preview Label */}
            <div className="text-left bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Encoded Target:</span>
              <p className="text-xs font-mono text-cyan-300 break-all truncate">
                {qrText || <span className="text-slate-600 italic">No content</span>}
              </p>
            </div>

            {/* Download Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!qrText.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJpg}
                  disabled={!qrText.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>Download JPG</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyImage}
                disabled={!qrText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Image Copied!' : 'Copy to Clipboard'}</span>
              </button>
            </div>

            {/* Privacy & Scan Guarantee Notice */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono text-slate-400 flex items-center gap-2 text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Generated 100% locally in browser memory. Zero tracking, zero storage.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
