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
  ShieldCheck,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Type,
  Lock,
  Globe,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  HelpCircle,
  Clipboard,
  Smartphone,
  Printer,
  FileText,
  CheckCircle,
  SlidersHorizontal,
  Share2,
} from 'lucide-react';
import { shortenerApi, ShortenerLinkItem } from '../services/api';

interface AdminQrCodeStudioTabProps {
  onAddToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Fixed intrinsic buffer sizes for live preview (compact & crisp on Retina displays)
const PREVIEW_QR_BUFFER_SIZE = 512;
const PREVIEW_CARD_BUFFER_WIDTH = 640;
const PREVIEW_CARD_BUFFER_HEIGHT = 800;

// 8 Curated Professional Style Presets
interface StylePreset {
  id: string;
  name: string;
  description: string;
  fg: string;
  bg: string;
  logoOption: 'none' | 'zenemoo' | 'custom';
  logoBgColor: string;
  badgeShape: 'rounded' | 'circle' | 'square';
  cardBgColor: string;
  tag?: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Universal black & white high-contrast',
    fg: '#000000',
    bg: '#ffffff',
    logoOption: 'none',
    logoBgColor: '#ffffff',
    badgeShape: 'rounded',
    cardBgColor: '#111827',
  },
  {
    id: 'zenemoo',
    name: 'Zenemoo',
    description: 'Signature electric cyan on deep slate',
    fg: '#22d3ee',
    bg: '#06070b',
    logoOption: 'zenemoo',
    logoBgColor: '#06070b',
    badgeShape: 'rounded',
    cardBgColor: '#06070b',
    tag: 'Default',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Electric indigo tech aesthetic',
    fg: '#6366f1',
    bg: '#090b11',
    logoOption: 'zenemoo',
    logoBgColor: '#090b11',
    badgeShape: 'rounded',
    cardBgColor: '#0b0f19',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Refined slate for corporate documents',
    fg: '#0f172a',
    bg: '#f8fafc',
    logoOption: 'zenemoo',
    logoBgColor: '#ffffff',
    badgeShape: 'square',
    cardBgColor: '#0f172a',
  },
  {
    id: 'social',
    name: 'Social Media',
    description: 'High-energy vibrant crimson rose',
    fg: '#f43f5e',
    bg: '#0c0714',
    logoOption: 'zenemoo',
    logoBgColor: '#ffffff',
    badgeShape: 'circle',
    cardBgColor: '#170c1e',
  },
  {
    id: 'event',
    name: 'Event',
    description: 'Lush emerald green for gatherings & tickets',
    fg: '#10b981',
    bg: '#050c08',
    logoOption: 'zenemoo',
    logoBgColor: '#050c08',
    badgeShape: 'circle',
    cardBgColor: '#051b11',
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Ultra crisp inverted monochrome',
    fg: '#ffffff',
    bg: '#000000',
    logoOption: 'zenemoo',
    logoBgColor: '#000000',
    badgeShape: 'rounded',
    cardBgColor: '#030303',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Understated cool graphite on white',
    fg: '#334155',
    bg: '#ffffff',
    logoOption: 'none',
    logoBgColor: '#ffffff',
    badgeShape: 'rounded',
    cardBgColor: '#1e293b',
  },
];

// Quick URL Suggestions
const QUICK_URL_PRESETS = [
  { label: 'Zenemoo Home', url: 'https://zenemoo.in' },
  { label: 'Talent Hub', url: 'https://zenemoo.in/talent-hub' },
  { label: 'Opportunities', url: 'https://zenemoo.in/opportunities' },
  { label: 'Book a Call', url: 'https://zenemoo.in/book-a-call' },
  { label: 'WhatsApp', url: 'https://wa.me/918000000000' },
  { label: 'Google Meet', url: 'https://meet.google.com/new' },
];

// Quick color palette swatches
const COLOR_SWATCHES = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Zenemoo Cyan', hex: '#22d3ee' },
  { name: 'Electric Indigo', hex: '#6366f1' },
  { name: 'Emerald Forest', hex: '#10b981' },
  { name: 'Rose Red', hex: '#f43f5e' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Royal Violet', hex: '#a855f7' },
  { name: 'Slate Gray', hex: '#334155' },
  { name: 'Deep Midnight', hex: '#06070b' },
];

/**
 * Normalizes and validates hex colors (#RGB or #RRGGBB)
 */
function normalizeHexColor(input: string, fallback: string = '#000000'): string {
  if (!input) return fallback;
  const clean = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const full = clean.split('').map((c) => c + c).join('');
    return '#' + full.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return '#' + clean.toLowerCase();
  }
  return fallback;
}

/**
 * Calculates WCAG 2.1 relative luminance
 */
function getHexRelativeLuminance(hex: string): number | null {
  const clean = hex.trim().replace(/^#/, '');
  let full = clean;
  if (clean.length === 3 && /^[0-9a-fA-F]{3}$/.test(clean)) {
    full = clean.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return null;
  }
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio safely without NaN/Infinity
 */
function computeContrastRatio(hex1: string, hex2: string): number | null {
  const l1 = getHexRelativeLuminance(hex1);
  const l2 = getHexRelativeLuminance(hex2);
  if (l1 === null || l2 === null) return null;
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (brighter + 0.05) / (darker + 0.05);
  if (!isFinite(ratio) || isNaN(ratio)) return null;
  return ratio;
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
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export const AdminQrCodeStudioTab: React.FC<AdminQrCodeStudioTabProps> = ({ onAddToast }) => {
  // Navigation / Workflow State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Section Accordion Toggle State
  const [isContentOpen, setIsContentOpen] = useState(true);
  const [isDesignOpen, setIsDesignOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // STEP 1: Content State
  const [contentTab, setContentTab] = useState<'url' | 'shortlink' | 'presets'>('url');
  const [qrText, setQrText] = useState('https://zenemoo.in');

  // URL Shortener Links Picker State
  const [shortLinks, setShortLinks] = useState<ShortenerLinkItem[]>([]);
  const [isLoadingShortLinks, setIsLoadingShortLinks] = useState(false);
  const [shortLinkSearch, setShortLinkSearch] = useState('');

  // Active Style Preset ID
  const [selectedPresetId, setSelectedPresetId] = useState<string>('zenemoo');

  // STEP 2: Design State
  // Colors & QR styling
  const [fgColor, setFgColor] = useState('#22d3ee');
  const [bgColor, setBgColor] = useState('#06070b');
  const [margin, setMargin] = useState(2); // Quiet zone modules (1 to 5)
  const [resolution, setResolution] = useState<512 | 1024 | 2048>(1024); // Controls EXPORT resolution
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');

  // Center Logo
  const [isLogoEnabled, setIsLogoEnabled] = useState(true);
  const [logoOption, setLogoOption] = useState<'none' | 'zenemoo' | 'custom'>('zenemoo');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [customLogoName, setCustomLogoName] = useState<string>('');
  const [logoScale, setLogoScale] = useState(20); // 10% to 40%
  const [logoPadding, setLogoPadding] = useState(8); // padding around logo badge
  const [badgeShape, setBadgeShape] = useState<'rounded' | 'circle' | 'square'>('rounded');
  const [logoBorderRadius, setLogoBorderRadius] = useState(12); // radius for rounded badge
  const [logoBgColor, setLogoBgColor] = useState('#06070b');

  // Background & Branded Card State
  const [previewMode, setPreviewMode] = useState<'qr' | 'card'>('qr');
  const [cardBgColor, setCardBgColor] = useState('#06070b');
  const [bgType, setBgType] = useState<'solid' | 'upload' | 'url'>('solid');
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(null);
  const [uploadedBgName, setUploadedBgName] = useState('');
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [appliedBgUrl, setAppliedBgUrl] = useState<string | null>(null);
  const [isTestingBgUrl, setIsTestingBgUrl] = useState(false);
  const [bgUrlError, setBgUrlError] = useState<string | null>(null);
  const [bgFit, setBgFit] = useState<'cover' | 'contain'>('cover');
  const [bgPosition, setBgPosition] = useState<'center' | 'top' | 'bottom'>('center');
  const [overlayColor, setOverlayColor] = useState('#000000');
  const [overlayOpacity, setOverlayOpacity] = useState(35); // 0% to 90%
  const [cardPadding, setCardPadding] = useState(48); // Card padding in export px

  // Backing plate (safeguard for scannability against background images)
  const [backingPlateColor, setBackingPlateColor] = useState('#ffffff');
  const [backingPlatePadding, setBackingPlatePadding] = useState(24);
  const [backingPlateRadius, setBackingPlateRadius] = useState(24);

  // Card Typography & CTA
  const [isCardTextEnabled, setIsCardTextEnabled] = useState(true);
  const [cardTitle, setCardTitle] = useState('Zenemoo');
  const [cardSubtitle, setCardSubtitle] = useState('Scan to explore opportunities & updates');
  const [cardCta, setCardCta] = useState('Point camera to scan');
  const [cardTextColor, setCardTextColor] = useState('#ffffff');
  const [cardTextAlign, setCardTextAlign] = useState<'left' | 'center' | 'right'>('center');

  // STEP 3: Preview Canvas References
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Contrast Calculation
  const contrastRatio = computeContrastRatio(fgColor, bgColor);
  const isContrastWarning = contrastRatio !== null && contrastRatio < 3.0;

  // Enforce Error Correction Level 'H' when a center logo is active
  const effectiveErrorCorrection = (isLogoEnabled && logoOption !== 'none') ? 'H' : errorCorrection;

  // Scannability status
  const isLogoTooLarge = isLogoEnabled && logoOption !== 'none' && logoScale > 25;

  // Load URL shortener links in memory for quick insertion
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

  // Clean up object URLs on unmount or replacement
  useEffect(() => {
    return () => {
      if (customLogoUrl && customLogoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customLogoUrl);
      }
      if (uploadedBgUrl && uploadedBgUrl.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedBgUrl);
      }
    };
  }, [customLogoUrl, uploadedBgUrl]);

  // Handle Logo Upload (memory only)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onAddToast('Invalid File', 'Please select a valid PNG, JPG, or SVG image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onAddToast('File Too Large', 'Please select a logo smaller than 5MB.', 'warning');
      return;
    }

    if (customLogoUrl && customLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customLogoUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomLogoUrl(objectUrl);
    setCustomLogoName(file.name);
    setLogoOption('custom');
    setIsLogoEnabled(true);
    onAddToast('Logo Loaded', `"${file.name}" loaded locally in memory.`, 'success');
  };

  // Handle Background Upload (memory only)
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onAddToast('Invalid File', 'Please select a valid PNG, JPG, or WebP image file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onAddToast('File Too Large', 'Please select a background image smaller than 10MB.', 'warning');
      return;
    }

    if (uploadedBgUrl && uploadedBgUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedBgUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadedBgUrl(objectUrl);
    setUploadedBgName(file.name);
    setBgType('upload');
    setBgUrlError(null);
    onAddToast('Background Uploaded', `"${file.name}" ready for branded card.`, 'success');
  };

  // Handle Testing & Loading Remote HTTPS Background URL
  const handleApplyBgUrl = () => {
    const trimmed = bgUrlInput.trim();
    if (!trimmed) {
      setBgUrlError('Please enter a valid image URL');
      return;
    }
    if (!trimmed.startsWith('https://')) {
      setBgUrlError('Background image must use a secure HTTPS URL');
      return;
    }

    setIsTestingBgUrl(true);
    setBgUrlError(null);

    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';

    testImg.onload = () => {
      setAppliedBgUrl(trimmed);
      setBgType('url');
      setIsTestingBgUrl(false);
      onAddToast('Background Loaded', 'Remote HTTPS image loaded successfully.', 'success');
    };

    testImg.onerror = () => {
      setIsTestingBgUrl(false);
      setBgUrlError(
        'Unable to load image. The URL may be invalid or the remote server disallows cross-origin canvas access (CORS). Upload the file directly for guaranteed export.'
      );
      onAddToast('Image Load Failed', 'CORS restriction or network error loading remote URL.', 'warning');
    };

    testImg.src = trimmed;
  };

  // Active Logo Source
  const getActiveLogoSrc = (): string | null => {
    if (!isLogoEnabled) return null;
    if (logoOption === 'zenemoo') {
      return '/assets/logo.png';
    }
    if (logoOption === 'custom' && customLogoUrl) {
      return customLogoUrl;
    }
    return null;
  };

  // Active Background Image Source
  const getActiveBgSrc = (): string | null => {
    if (bgType === 'upload' && uploadedBgUrl) {
      return uploadedBgUrl;
    }
    if (bgType === 'url' && appliedBgUrl) {
      return appliedBgUrl;
    }
    return null;
  };

  // Apply a style preset
  const handleApplyPreset = (preset: StylePreset) => {
    setSelectedPresetId(preset.id);
    setFgColor(preset.fg);
    setBgColor(preset.bg);
    setCardBgColor(preset.cardBgColor);

    if (preset.logoOption === 'none') {
      setIsLogoEnabled(false);
      setLogoOption('none');
    } else {
      setIsLogoEnabled(true);
      setLogoOption(preset.logoOption);
      setLogoBgColor(preset.logoBgColor);
      setBadgeShape(preset.badgeShape);
    }
    onAddToast('Preset Applied', `"${preset.name}" style applied.`, 'info');
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setQrText(text.trim());
        onAddToast('Pasted', 'Text pasted from clipboard', 'info');
      } else {
        onAddToast('Clipboard Empty', 'No text found in clipboard', 'info');
      }
    } catch (_) {
      onAddToast('Permission Denied', 'Clipboard access not allowed by browser. Paste directly into the field.', 'warning');
    }
  };

  /**
   * Core Helper: Render square QR Code onto any canvas at specified pixel resolution.
   * Strips inline width/height injected by qrcode library so preview canvas NEVER stretches!
   */
  const drawQrToCanvas = useCallback(
    async (targetCanvas: HTMLCanvasElement, targetResolution: number): Promise<boolean> => {
      if (!qrText.trim()) return false;

      const safeFg = normalizeHexColor(fgColor, '#000000');
      const safeBg = normalizeHexColor(bgColor, '#ffffff');

      // 1. Render base QR modules with high precision
      await QRCode.toCanvas(targetCanvas, qrText.trim(), {
        width: targetResolution,
        margin: margin,
        errorCorrectionLevel: effectiveErrorCorrection,
        color: {
          dark: safeFg,
          light: safeBg,
        },
      });

      // CRITICAL FIX: QRCode.toCanvas forces canvas.style.width and canvas.style.height = `${targetResolution}px`.
      // We explicitly strip these inline pixel styles to preserve true 1:1 responsive aspect ratio!
      targetCanvas.style.removeProperty('width');
      targetCanvas.style.removeProperty('height');
      targetCanvas.style.width = '100%';
      targetCanvas.style.height = '100%';
      targetCanvas.style.aspectRatio = '1 / 1';
      targetCanvas.style.objectFit = 'contain';

      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return true;

      // 2. Center Logo Badge with Aspect Ratio Preservation
      const logoSrc = getActiveLogoSrc();
      if (logoSrc) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = logoSrc;

        await new Promise<void>((resolve) => {
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            resolve();
          } else {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => resolve();
          }
        });

        if (logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
          const scaleMultiplier = targetResolution / 1024;
          const badgeBoxSize = targetResolution * (logoScale / 100);
          const badgeX = (targetResolution - badgeBoxSize) / 2;
          const badgeY = (targetResolution - badgeBoxSize) / 2;
          const pad = logoPadding * scaleMultiplier;
          const radius = logoBorderRadius * scaleMultiplier;

          // A. Draw badge background plate
          ctx.save();
          ctx.fillStyle = normalizeHexColor(logoBgColor, '#ffffff');
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 12 * scaleMultiplier;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4 * scaleMultiplier;

          if (badgeShape === 'circle') {
            ctx.beginPath();
            ctx.arc(
              badgeX + badgeBoxSize / 2,
              badgeY + badgeBoxSize / 2,
              badgeBoxSize / 2,
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else if (badgeShape === 'square') {
            ctx.fillRect(badgeX, badgeY, badgeBoxSize, badgeBoxSize);
          } else {
            drawRoundedRect(ctx, badgeX, badgeY, badgeBoxSize, badgeBoxSize, radius);
            ctx.fill();
          }
          ctx.restore();

          // B. Draw Logo within badge bounding box with strictly preserved aspect ratio
          const innerSize = Math.max(10, badgeBoxSize - pad * 2);
          const imgAspect = logoImg.naturalWidth / logoImg.naturalHeight;
          let drawW = innerSize;
          let drawH = innerSize;

          if (imgAspect >= 1) {
            drawW = innerSize;
            drawH = innerSize / imgAspect;
          } else {
            drawH = innerSize;
            drawW = innerSize * imgAspect;
          }

          const drawX = badgeX + (badgeBoxSize - drawW) / 2;
          const drawY = badgeY + (badgeBoxSize - drawH) / 2;

          ctx.save();
          // Clip to inner badge area to prevent overflow
          if (badgeShape === 'circle') {
            ctx.beginPath();
            ctx.arc(
              badgeX + badgeBoxSize / 2,
              badgeY + badgeBoxSize / 2,
              badgeBoxSize / 2 - 1,
              0,
              Math.PI * 2
            );
            ctx.clip();
          } else if (badgeShape === 'rounded') {
            drawRoundedRect(
              ctx,
              badgeX + 1,
              badgeY + 1,
              badgeBoxSize - 2,
              badgeBoxSize - 2,
              Math.max(2, radius - 2)
            );
            ctx.clip();
          }

          ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
          ctx.restore();
        }
      }

      return true;
    },
    [
      qrText,
      fgColor,
      bgColor,
      margin,
      effectiveErrorCorrection,
      isLogoEnabled,
      logoOption,
      customLogoUrl,
      logoScale,
      logoPadding,
      badgeShape,
      logoBorderRadius,
      logoBgColor,
    ]
  );

  /**
   * Helper: Render the Branded Campaign Card onto target canvas with proportional layout
   */
  const drawCardToCanvas = useCallback(
    async (
      targetCanvas: HTMLCanvasElement,
      qrCanvasSource: HTMLCanvasElement,
      width: number = PREVIEW_CARD_BUFFER_WIDTH,
      height: number = PREVIEW_CARD_BUFFER_HEIGHT
    ): Promise<boolean> => {
      targetCanvas.width = width;
      targetCanvas.height = height;

      // Ensure canvas CSS respects aspect-ratio
      targetCanvas.style.removeProperty('width');
      targetCanvas.style.removeProperty('height');
      targetCanvas.style.width = '100%';
      targetCanvas.style.height = '100%';
      targetCanvas.style.aspectRatio = '4 / 5';
      targetCanvas.style.objectFit = 'contain';

      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return false;

      const scale = width / 1200;

      // 1. Draw Card Background
      ctx.fillStyle = normalizeHexColor(cardBgColor, '#06070b');
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Background Image if active
      const bgSrc = getActiveBgSrc();
      if (bgSrc) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = bgSrc;

        await new Promise<void>((resolve) => {
          if (bgImg.complete && bgImg.naturalWidth > 0) {
            resolve();
          } else {
            bgImg.onload = () => resolve();
            bgImg.onerror = () => resolve();
          }
        });

        if (bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0) {
          ctx.save();
          const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
          const canvasAspect = width / height;

          let dw = width;
          let dh = height;
          let dx = 0;
          let dy = 0;

          if (bgFit === 'cover') {
            if (imgAspect > canvasAspect) {
              dh = height;
              dw = height * imgAspect;
              dx = (width - dw) / 2;
            } else {
              dw = width;
              dh = width / imgAspect;
              dy = bgPosition === 'top' ? 0 : bgPosition === 'bottom' ? height - dh : (height - dh) / 2;
            }
          } else {
            if (imgAspect > canvasAspect) {
              dw = width;
              dh = width / imgAspect;
              dy = (height - dh) / 2;
            } else {
              dh = height;
              dw = height * imgAspect;
              dx = (width - dw) / 2;
            }
          }

          ctx.drawImage(bgImg, dx, dy, dw, dh);
          ctx.restore();
        }
      }

      // 3. Draw Overlay Tint
      if (overlayOpacity > 0) {
        ctx.save();
        ctx.fillStyle = normalizeHexColor(overlayColor, '#000000');
        ctx.globalAlpha = Math.min(1, Math.max(0, overlayOpacity / 100));
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 4. Card Inner Frame / Content Layout
      const pad = (cardPadding / 100) * 120 * scale;
      const contentTop = pad + 35 * scale;

      if (isCardTextEnabled) {
        ctx.save();
        ctx.fillStyle = normalizeHexColor(cardTextColor, '#ffffff');
        ctx.textAlign = cardTextAlign;

        let textX = width / 2;
        if (cardTextAlign === 'left') textX = pad + 35 * scale;
        if (cardTextAlign === 'right') textX = width - pad - 35 * scale;

        // Draw Card Title
        if (cardTitle.trim()) {
          ctx.font = `bold ${Math.round(52 * scale)}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(cardTitle.trim(), textX, contentTop + 35 * scale);
        }

        // Draw Card Subtitle
        if (cardSubtitle.trim()) {
          ctx.font = `normal ${Math.round(25 * scale)}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = normalizeHexColor(cardTextColor, '#ffffff') + 'cc';
          ctx.fillText(cardSubtitle.trim(), textX, contentTop + 78 * scale);
        }
        ctx.restore();
      }

      // 5. Draw Safe QR Backing Plate & QR Code
      const qrDisplaySize = Math.round(620 * scale);
      const platePad = Math.round((backingPlatePadding / 24) * 36 * scale);
      const plateWidth = qrDisplaySize + platePad * 2;
      const plateHeight = qrDisplaySize + platePad * 2;
      const plateX = (width - plateWidth) / 2;
      const plateY = isCardTextEnabled ? contentTop + 130 * scale : (height - plateHeight) / 2;

      ctx.save();
      ctx.fillStyle = normalizeHexColor(backingPlateColor, '#ffffff');
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = Math.round(36 * scale);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(16 * scale);
      drawRoundedRect(
        ctx,
        plateX,
        plateY,
        plateWidth,
        plateHeight,
        Math.round((backingPlateRadius / 24) * 32 * scale)
      );
      ctx.fill();
      ctx.restore();

      // Draw the QR Code onto backing plate
      ctx.drawImage(
        qrCanvasSource,
        plateX + platePad,
        plateY + platePad,
        qrDisplaySize,
        qrDisplaySize
      );

      // 6. Draw Call-To-Action (CTA) Footer Banner
      if (isCardTextEnabled && cardCta.trim()) {
        const ctaY = plateY + plateHeight + 50 * scale;
        ctx.save();
        ctx.textAlign = 'center';

        const ctaText = cardCta.trim();
        ctx.font = `bold ${Math.round(24 * scale)}px system-ui, -apple-system, sans-serif`;
        const textMetrics = ctx.measureText(ctaText);
        const pillWidth = Math.max(Math.round(320 * scale), textMetrics.width + 70 * scale);
        const pillHeight = Math.round(56 * scale);
        const pillX = (width - pillWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = Math.max(1, 1.5 * scale);
        drawRoundedRect(ctx, pillX, ctaY, pillWidth, pillHeight, pillHeight / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = normalizeHexColor(cardTextColor, '#ffffff');
        ctx.fillText(ctaText, width / 2, ctaY + 36 * scale);
        ctx.restore();
      }

      return true;
    },
    [
      cardBgColor,
      bgType,
      uploadedBgUrl,
      appliedBgUrl,
      bgFit,
      bgPosition,
      overlayColor,
      overlayOpacity,
      cardPadding,
      isCardTextEnabled,
      cardTitle,
      cardSubtitle,
      cardCta,
      cardTextColor,
      cardTextAlign,
      backingPlateColor,
      backingPlatePadding,
      backingPlateRadius,
    ]
  );

  // Master Render Effect: Renders live preview canvas at fixed high-DPI display buffer (512x512 / 640x800)
  // This keeps the live preview strictly compact, responsive, and separated from the export resolution!
  const renderLivePreview = useCallback(async () => {
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas || !qrText.trim()) return;

    setIsRendering(true);
    try {
      // 1. Render QR preview canvas at fixed compact buffer (512px)
      await drawQrToCanvas(qrCanvas, PREVIEW_QR_BUFFER_SIZE);

      // 2. Render Card preview canvas at fixed compact buffer (640x800)
      const cardCanvas = cardCanvasRef.current;
      if (cardCanvas) {
        await drawCardToCanvas(cardCanvas, qrCanvas, PREVIEW_CARD_BUFFER_WIDTH, PREVIEW_CARD_BUFFER_HEIGHT);
      }
    } catch (err: any) {
      console.warn('[QR Code Studio Render Error]', err);
    } finally {
      setIsRendering(false);
    }
  }, [qrText, drawQrToCanvas, drawCardToCanvas]);

  useEffect(() => {
    renderLivePreview();
  }, [renderLivePreview]);

  // Clean filename generator
  const getExportFilename = (type: 'qr' | 'card', ext: 'png' | 'jpg') => {
    let slug = 'zenemoo-qr';
    if (type === 'card' && cardTitle.trim()) {
      slug = 'zenemoo-' + cardTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    return `${slug}-${type === 'qr' ? `${resolution}x${resolution}` : 'card'}-${Date.now()}.${ext}`;
  };

  /**
   * Helper: Generates a full-resolution offscreen canvas matching the selected export resolution
   * (512px, 1024px, or 2048px). Leaves the on-screen preview canvas completely untouched!
   */
  const createExportCanvas = async (type: 'qr' | 'card'): Promise<HTMLCanvasElement | null> => {
    if (type === 'qr') {
      const offscreen = document.createElement('canvas');
      offscreen.width = resolution;
      offscreen.height = resolution;
      const success = await drawQrToCanvas(offscreen, resolution);
      return success ? offscreen : null;
    } else {
      const cardW = resolution === 2048 ? 2400 : resolution === 512 ? 800 : 1200;
      const cardH = resolution === 2048 ? 3000 : resolution === 512 ? 1000 : 1500;
      const qrSubRes = resolution === 2048 ? 1240 : resolution === 512 ? 414 : 620;

      const offscreenQr = document.createElement('canvas');
      await drawQrToCanvas(offscreenQr, qrSubRes);

      const offscreenCard = document.createElement('canvas');
      const success = await drawCardToCanvas(offscreenCard, offscreenQr, cardW, cardH);
      return success ? offscreenCard : null;
    }
  };

  // EXPORT 1: Full-Resolution PNG (Lossless)
  const handleDownloadPng = async () => {
    try {
      const canvas = await createExportCanvas(previewMode);
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = getExportFilename(previewMode, 'png');
      link.href = dataUrl;
      link.click();
      onAddToast(
        `${previewMode === 'qr' ? 'QR Code' : 'Branded Card'} PNG Exported`,
        `Downloaded at ${canvas.width}×${canvas.height} px resolution`,
        'success'
      );
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('tainted')) {
        onAddToast(
          'Export Blocked by CORS',
          'The remote background image host blocks cross-origin export. Upload the image directly from your device.',
          'error'
        );
      } else {
        onAddToast('Export Failed', err.message || 'Failed to download PNG', 'error');
      }
    }
  };

  // EXPORT 2: Full-Resolution JPG (Solid Background Guaranteed)
  const handleDownloadJpg = async () => {
    try {
      const canvas = await createExportCanvas(previewMode);
      if (!canvas) return;

      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // Solid background fill ensures zero dark/transparent JPG artifacts
      ctx.fillStyle = normalizeHexColor(previewMode === 'qr' ? bgColor : cardBgColor, '#ffffff');
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(canvas, 0, 0);

      const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = getExportFilename(previewMode, 'jpg');
      link.href = dataUrl;
      link.click();
      onAddToast(
        `${previewMode === 'qr' ? 'QR Code' : 'Branded Card'} JPG Exported`,
        `Downloaded at ${canvas.width}×${canvas.height} px resolution`,
        'success'
      );
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('tainted')) {
        onAddToast(
          'Export Blocked by CORS',
          'The remote background image host blocks cross-origin export. Upload the image directly from your device.',
          'error'
        );
      } else {
        onAddToast('Export Failed', err.message || 'Failed to download JPG', 'error');
      }
    }
  };

  // EXPORT 3: Copy to Clipboard
  const handleCopyClipboard = async () => {
    try {
      const canvas = await createExportCanvas(previewMode);
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setIsCopied(true);
          onAddToast(
            'Image Copied',
            `${previewMode === 'qr' ? 'QR Code' : 'Branded Card'} copied to clipboard as PNG`,
            'success'
          );
          setTimeout(() => setIsCopied(false), 2200);
        } catch (_) {
          await navigator.clipboard.writeText(qrText);
          onAddToast('URL Copied', 'Clipboard image copy unsupported in this browser; copied URL instead.', 'info');
        }
      }, 'image/png');
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('tainted')) {
        onAddToast(
          'Copy Blocked by CORS',
          'Remote image host blocks canvas copy. Upload the image directly from your computer.',
          'error'
        );
      } else {
        onAddToast('Copy Unavailable', 'Your browser does not permit direct image clipboard copy.', 'warning');
      }
    }
  };

  // EXPORT 4: Open High-Res in New Tab
  const handleOpenInNewTab = async () => {
    try {
      const canvas = await createExportCanvas(previewMode);
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');
      const win = window.open();
      if (win) {
        win.document.write(
          `<!DOCTYPE html><html><head><title>Zenemoo QR Studio Preview (${canvas.width}x${canvas.height})</title><style>body{margin:0;background:#06070b;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{max-width:90vw;max-height:90vh;box-shadow:0 20px 50px rgba(0,0,0,0.8);border-radius:16px;}</style></head><body><img src="${dataUrl}" alt="Zenemoo QR Code" /></body></html>`
        );
        win.document.close();
      } else {
        onAddToast('Popup Blocked', 'Please allow popups to open full-resolution preview.', 'warning');
      }
    } catch (err: any) {
      onAddToast('Unable to Open Tab', err.message || 'Browser security blocked opening image.', 'error');
    }
  };

  // Reset Everything to Zenemoo Defaults
  const handleReset = () => {
    setQrText('https://zenemoo.in');
    setContentTab('url');
    setSelectedPresetId('zenemoo');

    setFgColor('#22d3ee');
    setBgColor('#06070b');
    setIsLogoEnabled(true);
    setLogoOption('zenemoo');
    setLogoScale(20);
    setLogoPadding(8);
    setBadgeShape('rounded');
    setLogoBorderRadius(12);
    setLogoBgColor('#06070b');
    setMargin(2);
    setResolution(1024);
    setErrorCorrection('H');

    // Background & Card Reset
    setPreviewMode('qr');
    setCardBgColor('#06070b');
    setBgType('solid');
    if (uploadedBgUrl && uploadedBgUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedBgUrl);
    }
    setUploadedBgUrl(null);
    setUploadedBgName('');
    setBgUrlInput('');
    setAppliedBgUrl(null);
    setBgUrlError(null);
    setOverlayOpacity(35);

    setIsCardTextEnabled(true);
    setCardTitle('Zenemoo');
    setCardSubtitle('Scan to explore opportunities & updates');
    setCardCta('Point camera to scan');
    setCardTextColor('#ffffff');
    setCardTextAlign('center');

    if (customLogoUrl && customLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customLogoUrl);
    }
    setCustomLogoUrl(null);
    setCustomLogoName('');

    setCurrentStep(1);
    onAddToast('Design Reset', 'Restored default Zenemoo branding and QR specifications', 'info');
  };

  const filteredShortLinks = shortLinks.filter(
    (l) =>
      l.code.toLowerCase().includes(shortLinkSearch.toLowerCase()) ||
      l.destination_url.toLowerCase().includes(shortLinkSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* 1. COMPACT PAGE HEADER */}
      <header className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">QR Code Studio</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300">
                <Lock className="w-3 h-3" />
                Generated locally
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Create branded QR codes for links, campaigns and digital sharing. 100% private, no data is stored.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Reset All Designs and Controls to Default"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Design</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/30 text-white text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-600/20"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help & Tips</span>
          </button>
        </div>
      </header>

      {/* 2. STEP-BASED WORKFLOW PROGRESS BAR */}
      <nav aria-label="Workflow Steps" className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          { num: 1, title: 'Content', desc: 'Enter your link or text' },
          { num: 2, title: 'Design', desc: 'Customize appearance' },
          { num: 3, title: 'Preview', desc: 'Check and adjust' },
          { num: 4, title: 'Download', desc: 'Save your QR code' },
        ].map((s) => {
          const isActive = currentStep === s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                setCurrentStep(s.num as any);
                if (s.num === 1) setIsContentOpen(true);
                if (s.num === 2) setIsDesignOpen(true);
              }}
              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'bg-white/[0.015] border-white/5 hover:bg-white/[0.04] text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                  isActive
                    ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/30'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {s.num}
              </div>
              <div className="min-w-0">
                <span className={`block text-xs font-bold leading-tight truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {s.title}
                </span>
                <span className="block text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                  {s.desc}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* 3. MAIN TWO-COLUMN STUDIO WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CUSTOMIZATION CONTROLS (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* ================= STEP 1: CONTENT CARD ================= */}
          <section className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsContentOpen(!isContentOpen)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.01] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Content
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Step 1
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Enter a URL or text to generate QR code</p>
                </div>
              </div>
              <div className="text-slate-400">
                {isContentOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isContentOpen && (
              <div className="p-4 sm:p-5 pt-0 border-t border-white/5 space-y-4">
                {/* Content Sub-Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setContentTab('url')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      contentTab === 'url'
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    URL / Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentTab('shortlink')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      contentTab === 'shortlink'
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Short Link</span>
                    {shortLinks.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300">
                        {shortLinks.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentTab('presets')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      contentTab === 'presets'
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Presets
                  </button>
                </div>

                {/* TAB 1: URL / Text Input */}
                {contentTab === 'url' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute left-3.5 top-3.5 text-slate-500 pointer-events-none">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <textarea
                        rows={2}
                        value={qrText}
                        onChange={(e) => setQrText(e.target.value)}
                        placeholder="https://zenemoo.in or any plain text..."
                        className="w-full pl-10 pr-20 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all resize-none"
                      />
                      <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                        {qrText && (
                          <button
                            type="button"
                            onClick={() => setQrText('')}
                            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                            title="Clear Content"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handlePasteClipboard}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-mono border border-white/10 flex items-center gap-1 transition-colors"
                          title="Paste from clipboard"
                        >
                          <Clipboard className="w-3 h-3" />
                          <span>Paste</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Preset Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {QUICK_URL_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setQrText(p.url)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                            qrText === p.url
                              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/5'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: Short Links List Integration */}
                {contentTab === 'shortlink' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search short links by code or destination..."
                        value={shortLinkSearch}
                        onChange={(e) => setShortLinkSearch(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={loadShortLinks}
                        disabled={isLoadingShortLinks}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Reload short links"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingShortLinks ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5 bg-black/40">
                      {filteredShortLinks.length === 0 ? (
                        <div className="p-6 text-center text-xs font-mono text-slate-500">
                          {isLoadingShortLinks ? 'Loading short links...' : 'No matching short links found.'}
                        </div>
                      ) : (
                        filteredShortLinks.map((link) => {
                          const fullUrl = `https://zenemoo.in/l/${link.code}`;
                          const isSelected = qrText === fullUrl;
                          return (
                            <button
                              key={link.code}
                              type="button"
                              onClick={() => {
                                setQrText(fullUrl);
                                onAddToast('Short Link Selected', fullUrl, 'info');
                              }}
                              className={`w-full p-2.5 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected ? 'bg-cyan-500/15' : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-cyan-300">
                                    /l/{link.code}
                                  </span>
                                  <span className="text-[10px] text-slate-500 px-1.5 py-0.2 rounded bg-white/5">
                                    {link.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {link.destination_url}
                                </p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Category Presets */}
                {contentTab === 'presets' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        category: 'Company & Programs',
                        items: [
                          { label: 'Zenemoo Main Site', url: 'https://zenemoo.in' },
                          { label: 'Career Opportunities', url: 'https://zenemoo.in/opportunities' },
                          { label: 'Talent Network Hub', url: 'https://zenemoo.in/talent-hub' },
                        ],
                      },
                      {
                        category: 'Contact & Connect',
                        items: [
                          { label: 'Schedule Call', url: 'https://zenemoo.in/book-a-call' },
                          { label: 'WhatsApp Official', url: 'https://wa.me/918000000000' },
                          { label: 'Google Meet Room', url: 'https://meet.google.com/new' },
                        ],
                      },
                    ].map((group) => (
                      <div key={group.category} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                          {group.category}
                        </span>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                setQrText(item.url);
                                onAddToast('Preset Selected', item.url, 'info');
                              }}
                              className="w-full text-left p-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span>{item.label}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ================= STEP 2: DESIGN & STYLE CARD ================= */}
          <section className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsDesignOpen(!isDesignOpen)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.01] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Design & Style
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      Step 2
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Customize the look and feel of your QR code</p>
                </div>
              </div>
              <div className="text-slate-400">
                {isDesignOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isDesignOpen && (
              <div className="p-4 sm:p-5 pt-0 border-t border-white/5 space-y-6">
                {/* 2A. QUICK PRESETS CAROUSEL (8 items) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                      Quick Presets
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">1-click styling</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {STYLE_PRESETS.map((p) => {
                      const isSelected = selectedPresetId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10'
                              : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                          }`}
                        >
                          <div
                            className="w-full h-12 rounded-lg border border-white/10 mb-2 flex items-center justify-center relative overflow-hidden"
                            style={{ backgroundColor: p.bg }}
                          >
                            <QrCode className="w-7 h-7" style={{ color: p.fg }} />
                            {p.logoOption !== 'none' && (
                              <div
                                className="absolute w-3 h-3 rounded-full flex items-center justify-center shadow-sm"
                                style={{ backgroundColor: p.logoBgColor }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.fg }} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {p.name}
                            </span>
                            {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                          </div>
                          <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                            {p.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2B. SUBSECTION: QR COLORS */}
                <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-mono text-white flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-cyan-400" />
                      QR Colors
                    </label>

                    {/* WCAG Contrast Ratio Indicator */}
                    <div
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        contrastRatio === null
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : isContrastWarning
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {contrastRatio === null ? (
                        <span>Contrast: N/A</span>
                      ) : isContrastWarning ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Contrast: {contrastRatio.toFixed(1)}:1 (Low)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Contrast: {contrastRatio.toFixed(1)}:1 (Good)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isContrastWarning && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-mono flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Low contrast may fail on older phone cameras. Choose a higher contrast combination.</span>
                    </div>
                  )}

                  {/* Foreground & Background Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1.5">
                      <span className="text-[11px] font-mono text-slate-400 block">Foreground Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHexColor(fgColor, '#000000')}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 text-white text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1.5">
                      <span className="text-[11px] font-mono text-slate-400 block">Background Color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHexColor(bgColor, '#ffffff')}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 text-white text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Swatch row */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-mono text-slate-500 mr-1">Quick swatches:</span>
                    {COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.name}
                        type="button"
                        onClick={() => setFgColor(sw.hex)}
                        title={`Set foreground to ${sw.name}`}
                        className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer shadow-sm"
                        style={{ backgroundColor: sw.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* 2C. SUBSECTION: CENTER LOGO */}
                <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-mono text-white flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Center Logo
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsLogoEnabled(!isLogoEnabled)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                        isLogoEnabled ? 'bg-cyan-500 justify-end' : 'bg-white/10 justify-start'
                      }`}
                      aria-label="Toggle Center Logo"
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>

                  {isLogoEnabled && (
                    <div className="space-y-4 pt-1">
                      {/* Logo Choice Radio-Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setLogoOption('none')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            logoOption === 'none'
                              ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                              : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-mono">No Logo</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLogoOption('zenemoo')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            logoOption === 'zenemoo'
                              ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                              : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-mono">Zenemoo Logo</div>
                        </button>

                        <label
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer block ${
                            logoOption === 'custom'
                              ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                              : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
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
                            <span>Upload Logo</span>
                          </div>
                          {customLogoName && (
                            <span className="text-[9px] text-cyan-300 block truncate mt-0.5">
                              {customLogoName}
                            </span>
                          )}
                        </label>
                      </div>

                      {logoOption !== 'none' && (
                        <div className="space-y-3.5 p-3 rounded-xl bg-black/40 border border-white/5">
                          {/* Logo Size Slider */}
                          <div>
                            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                              <span>Logo Size ({logoScale}%)</span>
                              <span className="text-[10px] text-slate-500">
                                {logoScale > 25 ? '⚠️ Large size' : 'Safe standard (10-25%)'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={40}
                              value={logoScale}
                              onChange={(e) => setLogoScale(parseInt(e.target.value, 10))}
                              className="w-full accent-cyan-400 cursor-pointer"
                            />
                            {isLogoTooLarge && (
                              <div className="flex items-center justify-between mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono">
                                <span>Logo scale &gt;25% may affect scanning on older devices.</span>
                                <button
                                  type="button"
                                  onClick={() => setLogoScale(20)}
                                  className="underline font-bold text-amber-200 hover:text-white shrink-0 ml-2"
                                >
                                  Use safe 20%
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Badge Shape & Background */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
                                Badge Shape
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { id: 'square', label: 'Square' },
                                  { id: 'rounded', label: 'Rounded' },
                                  { id: 'circle', label: 'Circle' },
                                ].map((sh) => (
                                  <button
                                    key={sh.id}
                                    type="button"
                                    onClick={() => setBadgeShape(sh.id as any)}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                                      badgeShape === sh.id
                                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                                        : 'bg-white/5 border-white/10 text-slate-400'
                                    }`}
                                  >
                                    {sh.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
                                Badge Background
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={normalizeHexColor(logoBgColor, '#ffffff')}
                                  onChange={(e) => setLogoBgColor(e.target.value)}
                                  className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={logoBgColor}
                                  onChange={(e) => setLogoBgColor(e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 text-white text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2D. SUBSECTION: BACKGROUND & BRANDED CARD */}
                <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-mono text-white flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Background & Branded Card
                    </label>

                    {(uploadedBgUrl || appliedBgUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setBgType('solid');
                          setAppliedBgUrl(null);
                          if (uploadedBgUrl && uploadedBgUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(uploadedBgUrl);
                          }
                          setUploadedBgUrl(null);
                          setUploadedBgName('');
                          setBgUrlInput('');
                        }}
                        className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
                      >
                        Reset Background
                      </button>
                    )}
                  </div>

                  {/* Mode Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBgType('solid')}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        bgType === 'solid'
                          ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-mono">Solid Color</div>
                    </button>

                    <label
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer block ${
                        bgType === 'upload'
                          ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleBgUpload}
                        className="hidden"
                      />
                      <div className="text-xs font-mono flex items-center justify-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Upload Image</span>
                      </div>
                      {uploadedBgName && (
                        <div className="text-[9px] text-indigo-300 truncate mt-0.5">
                          {uploadedBgName}
                        </div>
                      )}
                    </label>

                    <button
                      type="button"
                      onClick={() => setBgType('url')}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                        bgType === 'url'
                          ? 'bg-indigo-500/20 border-indigo-400 text-white font-bold'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-mono flex items-center justify-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Image URL</span>
                      </div>
                    </button>
                  </div>

                  {/* Remote URL Input */}
                  {bgType === 'url' && (
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                      <span className="text-[11px] font-mono text-slate-400 block">
                        Enter HTTPS Image URL:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={bgUrlInput}
                          onChange={(e) => {
                            setBgUrlInput(e.target.value);
                            setBgUrlError(null);
                          }}
                          placeholder="https://example.com/poster.jpg"
                          className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={handleApplyBgUrl}
                          disabled={isTestingBgUrl}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold shrink-0 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {isTestingBgUrl ? 'Loading...' : 'Preview'}
                        </button>
                      </div>
                      {bgUrlError && (
                        <p className="text-[11px] text-rose-300 font-mono">{bgUrlError}</p>
                      )}
                    </div>
                  )}

                  {/* Card Base Color & Card Style */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-xs font-mono text-slate-300">Card Base Color:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={normalizeHexColor(cardBgColor, '#06070b')}
                          onChange={(e) => setCardBgColor(e.target.value)}
                          className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={cardBgColor}
                          onChange={(e) => setCardBgColor(e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-black/60 border border-white/10 text-white text-[11px] font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-xs font-mono text-slate-300">Card Style:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('qr')}
                          className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                            previewMode === 'qr'
                              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400'
                              : 'text-slate-400 border-white/5'
                          }`}
                        >
                          QR Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('card')}
                          className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                            previewMode === 'card'
                              ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400'
                              : 'text-slate-400 border-white/5'
                          }`}
                        >
                          Branded Card
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Image Fit & Overlay if background image used */}
                  {(uploadedBgUrl || appliedBgUrl) && (
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-mono text-slate-400 block mb-1">Image Fit</label>
                          <div className="grid grid-cols-2 gap-1">
                            {(['cover', 'contain'] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setBgFit(mode)}
                                className={`py-1 text-xs font-mono rounded border capitalize transition-all cursor-pointer ${
                                  bgFit === mode
                                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                                    : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-mono text-slate-400 block mb-1">Position</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['top', 'center', 'bottom'] as const).map((pos) => (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => setBgPosition(pos)}
                                className={`py-1 text-xs font-mono rounded border capitalize transition-all cursor-pointer ${
                                  bgPosition === pos
                                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                                    : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                              >
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                          <span>Dark Tint Overlay ({overlayOpacity}%)</span>
                          <span className="text-[10px] text-slate-500">Improves contrast & readability</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={90}
                          value={overlayOpacity}
                          onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10))}
                          className="w-full accent-indigo-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2E. SUBSECTION: TEXT & CALL TO ACTION (Branded Card) */}
                <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-mono text-white flex items-center gap-2">
                      <Type className="w-3.5 h-3.5 text-purple-400" />
                      Text & Call to Action (Branded Card)
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsCardTextEnabled(!isCardTextEnabled)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                        isCardTextEnabled ? 'bg-cyan-500 justify-end' : 'bg-white/10 justify-start'
                      }`}
                      aria-label="Toggle Card Text"
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>

                  {isCardTextEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-mono text-slate-400 block mb-1">Card Title</label>
                          <input
                            type="text"
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                            placeholder="Zenemoo"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-mono text-slate-400 block mb-1">Call To Action (CTA)</label>
                          <input
                            type="text"
                            value={cardCta}
                            onChange={(e) => setCardCta(e.target.value)}
                            placeholder="Point camera to scan"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">Card Subtitle</label>
                        <input
                          type="text"
                          value={cardSubtitle}
                          onChange={(e) => setCardSubtitle(e.target.value)}
                          placeholder="Scan to explore opportunities & updates"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-300">Text Color:</span>
                          <input
                            type="color"
                            value={normalizeHexColor(cardTextColor, '#ffffff')}
                            onChange={(e) => setCardTextColor(e.target.value)}
                            className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => setCardTextAlign(align)}
                              className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                                cardTextAlign === align
                                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                                  : 'bg-white/5 border-white/10 text-slate-400'
                              }`}
                              title={`Align ${align}`}
                            >
                              {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                              {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                              {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2F. SUBSECTION: ADVANCED SETTINGS (Collapsible) */}
                <div className="rounded-xl bg-black/30 border border-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold font-mono text-white">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Advanced Settings</span>
                    </div>
                    <div className="text-slate-400">
                      {isAdvancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {isAdvancedOpen && (
                    <div className="p-4 pt-1 border-t border-white/5 space-y-4">
                      {/* Quiet zone */}
                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                          <span>Quiet Zone Margin ({margin} modules)</span>
                          <span className="text-[10px] text-slate-500">Standard: 2-4 modules</span>
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

                      {/* Error Correction Level */}
                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                          <span>Error Correction Level</span>
                          <span className="text-[10px] font-mono text-cyan-300">
                            {isLogoEnabled && logoOption !== 'none' ? 'Locked to Level H (Logo active)' : `${errorCorrection} Level`}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['L', 'M', 'Q', 'H'] as const).map((lvl) => {
                            const isSelected = effectiveErrorCorrection === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                disabled={isLogoEnabled && logoOption !== 'none' && lvl !== 'H'}
                                onClick={() => setErrorCorrection(lvl)}
                                className={`py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer disabled:opacity-30 ${
                                  isSelected
                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                }`}
                              >
                                Level {lvl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: PREVIEW & EXPORT (5 COLS) - Flexible height, never stretches */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4 self-start">
          {/* ================= STEP 3: LIVE PREVIEW CARD ================= */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl space-y-4">
            {/* Header with QR Only / Branded Card Toggle */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Live Preview</h2>
              </div>

              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewMode('qr')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    previewMode === 'qr'
                      ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  QR Only
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('card')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    previewMode === 'card'
                      ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Branded Card
                </button>
              </div>
            </div>

            {/* PREVIEW CANVAS CONTAINER (Strictly constrained, centered, never overflows) */}
            <div className="relative p-4 sm:p-5 rounded-2xl bg-[#06070b]/90 border border-white/10 flex items-center justify-center overflow-hidden">
              {/* MODE A: QR-ONLY PREVIEW (Strict 1:1 Aspect-Square Container, max-w 320px) */}
              {previewMode === 'qr' && (
                <div
                  className="w-full max-w-[280px] sm:max-w-[320px] aspect-square mx-auto flex items-center justify-center"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <canvas
                    ref={qrCanvasRef}
                    className="w-full h-full max-w-[320px] max-h-[320px] object-contain rounded-xl shadow-xl block"
                    style={{
                      aspectRatio: '1 / 1',
                      maxWidth: '320px',
                      maxHeight: '320px',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}

              {/* MODE B: BRANDED CARD PREVIEW (Aspect-Ratio 4:5 Poster Container, max-w 300px) */}
              {previewMode === 'card' && (
                <div
                  className="w-full max-w-[260px] sm:max-w-[300px] aspect-[4/5] mx-auto flex items-center justify-center"
                  style={{ aspectRatio: '4 / 5' }}
                >
                  <canvas
                    ref={cardCanvasRef}
                    className="w-full h-full max-w-[300px] object-contain rounded-xl shadow-xl block"
                    style={{
                      aspectRatio: '4 / 5',
                      maxWidth: '300px',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}

              {isRendering && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-2xl">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>

            {/* MINI PRESET SWITCHER THUMBNAILS UNDERNEATH PREVIEW */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block text-left">
                Quick Style Switch:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {STYLE_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-1 rounded-lg border text-center transition-all cursor-pointer ${
                      selectedPresetId === preset.id
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-sm'
                        : 'border-white/10 bg-black/40 hover:border-white/20'
                    }`}
                    title={preset.name}
                  >
                    <div
                      className="w-full h-6 rounded flex items-center justify-center mb-0.5"
                      style={{ backgroundColor: preset.bg }}
                    >
                      <QrCode className="w-3.5 h-3.5" style={{ color: preset.fg }} />
                    </div>
                    <span className="text-[9px] font-mono text-slate-300 block truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW STATS INFO BAR (Size, Format, Contrast) */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-center text-xs font-mono">
              <div className="border-r border-white/5 pr-1">
                <span className="text-[10px] text-slate-500 block">Export Size</span>
                <span className="text-white font-bold truncate block">
                  {previewMode === 'qr'
                    ? `${resolution}×${resolution}`
                    : resolution === 2048
                    ? '2400×3000'
                    : resolution === 512
                    ? '800×1000'
                    : '1200×1500'}
                </span>
              </div>
              <div className="border-r border-white/5 pr-1">
                <span className="text-[10px] text-slate-500 block">Format</span>
                <span className="text-cyan-300 font-bold truncate block">
                  {previewMode === 'qr' ? 'Square QR' : 'Branded Card'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Contrast</span>
                <span
                  className={`font-bold flex items-center justify-center gap-1 ${
                    isContrastWarning ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {contrastRatio ? `${contrastRatio.toFixed(1)}:1` : 'N/A'}
                  {!isContrastWarning && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                </span>
              </div>
            </div>
          </section>

          {/* ================= STEP 4: DOWNLOAD & SHARE CARD ================= */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Download & Share</h2>
                <p className="text-[11px] text-slate-400">High-quality export ready for digital and print use</p>
              </div>
            </div>

            {/* Resolution Selector Radio-Cards (Controls EXPORT size, separated from live preview) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Export Resolution:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 512, label: '512 px', sub: 'Web (Small)' },
                  { value: 1024, label: '1024 px', sub: 'High-Res (Rec.)' },
                  { value: 2048, label: '2048 px', sub: 'Print (Ultra HD)' },
                ].map((res) => (
                  <button
                    key={res.value}
                    type="button"
                    onClick={() => setResolution(res.value as any)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      resolution === res.value
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-sm'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-mono">{res.label}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5 truncate">{res.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons: Download PNG & Download JPG (dynamically rendered at full export resolution) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!qrText.trim()}
                className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Download className="w-4 h-4 text-black" />
                <div className="text-left leading-tight">
                  <div>Download PNG</div>
                  <div className="text-[9px] opacity-80 font-normal">Lossless, best quality</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadJpg}
                disabled={!qrText.trim()}
                className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Download className="w-4 h-4 text-purple-200" />
                <div className="text-left leading-tight">
                  <div>Download JPG</div>
                  <div className="text-[9px] opacity-80 font-normal">Smaller size, solid bg</div>
                </div>
              </button>
            </div>

            {/* Secondary Actions: Copy to Clipboard & Open in New Tab */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyClipboard}
                disabled={!qrText.trim()}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInNewTab}
                disabled={!qrText.trim()}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open in New Tab</span>
              </button>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero server uploads. 100% private in-browser rendering.</span>
            </div>
          </section>
        </div>
      </div>

      {/* ================= HELP & TIPS MODAL ================= */}
      {isHelpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#090b11] border border-white/15 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">QR Code Studio — Best Practices</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono text-slate-300">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  1. Maintain High Contrast (&gt; 3.0:1)
                </span>
                <p className="text-slate-400">
                  QR code modules must stand out distinctly from the background. Dark foreground on light background or bright neon on deep slate scan most reliably.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  2. Center Logo Sizing (&le; 25%)
                </span>
                <p className="text-slate-400">
                  When a logo is present, Level H Error Correction is automatically applied (can recover up to 30% obstructed code). Keep your logo scale below 25% for reliable scans.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  3. Print Recommendations
                </span>
                <p className="text-slate-400">
                  Minimum recommended print size is 2×2 cm (0.8×0.8 in) for close-range business cards and 10×10 cm for banners. Use 2048px Ultra HD export for print graphics.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-400" />
                  4. Privacy & Zero-Cloud Guarantee
                </span>
                <p className="text-slate-400">
                  Your QR codes, links, images, and logos are rendered strictly in your browser memory. Nothing is stored on any server or sent across the network.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono cursor-pointer transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
