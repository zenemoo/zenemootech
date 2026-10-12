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
  Info,
  Type,
  Maximize2,
  Lock,
  Globe,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { shortenerApi, ShortenerLinkItem } from '../services/api';

interface AdminQrCodeStudioTabProps {
  onAddToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Curated High-Contrast Palettes
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
  { label: 'Opportunities', url: 'https://zenemoo.in/opportunities' },
  { label: 'Talent Hub', url: 'https://zenemoo.in/talent-hub' },
  { label: 'DesiCrew Programs', url: 'https://zenemoo.in/desicrew-contributors' },
  { label: 'Book a Call', url: 'https://zenemoo.in/book-a-call' },
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

function isValidHexColor(input: string): boolean {
  if (!input) return false;
  const clean = input.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{3}$/.test(clean) || /^[0-9a-fA-F]{6}$/.test(clean);
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
  // 1. Content State
  const [qrText, setQrText] = useState('https://zenemoo.in');

  // URL Shortener Links Picker State
  const [shortLinks, setShortLinks] = useState<ShortenerLinkItem[]>([]);
  const [isLoadingShortLinks, setIsLoadingShortLinks] = useState(false);
  const [isShortLinksDropdownOpen, setIsShortLinksDropdownOpen] = useState(false);
  const [shortLinkSearch, setShortLinkSearch] = useState('');

  // 2. Logo State (memory only)
  const [logoOption, setLogoOption] = useState<'none' | 'zenemoo' | 'custom'>('zenemoo');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [customLogoName, setCustomLogoName] = useState<string>('');
  const [logoScale, setLogoScale] = useState(20); // 12% to 25% of QR width
  const [logoPadding, setLogoPadding] = useState(8); // padding around logo badge
  const [badgeShape, setBadgeShape] = useState<'rounded' | 'circle'>('rounded');
  const [logoBorderRadius, setLogoBorderRadius] = useState(12); // radius for rounded badge
  const [logoBgColor, setLogoBgColor] = useState('#ffffff');

  // 3. QR Colors & Styling
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [margin, setMargin] = useState(2); // Quiet zone modules (1 to 5)
  const [resolution, setResolution] = useState<512 | 1024 | 2048>(1024);
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');

  // 4. Background & Branded Card State
  const [previewMode, setPreviewMode] = useState<'qr' | 'card'>('qr');
  const [cardBgColor, setCardBgColor] = useState('#0a0d14');
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
  const [cardRadius, setCardRadius] = useState(32); // Card corner radius in export px

  // Backing plate (safeguard for scannability against background images)
  const [backingPlateColor, setBackingPlateColor] = useState('#ffffff');
  const [backingPlatePadding, setBackingPlatePadding] = useState(24);
  const [backingPlateRadius, setBackingPlateRadius] = useState(24);

  // Card Typography & CTA
  const [cardTitle, setCardTitle] = useState('Zenemoo');
  const [cardSubtitle, setCardSubtitle] = useState('Scan to explore opportunities & updates');
  const [cardCta, setCardCta] = useState('Point camera to scan');
  const [cardTextColor, setCardTextColor] = useState('#ffffff');
  const [cardTextAlign, setCardTextAlign] = useState<'left' | 'center' | 'right'>('center');

  // 5. Canvas References & Execution
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Contrast Calculation
  const contrastRatio = computeContrastRatio(fgColor, bgColor);
  const isContrastWarning = contrastRatio !== null && contrastRatio < 3.0;

  // Enforce Error Correction Level 'H' when a center logo is active
  const effectiveErrorCorrection = logoOption !== 'none' ? 'H' : errorCorrection;

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
    onAddToast('Background Uploaded', `"${file.name}" ready for card design.`, 'success');
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
      onAddToast('Background Loaded', 'Remote HTTPS image preview loaded successfully.', 'success');
    };

    testImg.onerror = () => {
      setIsTestingBgUrl(false);
      setBgUrlError(
        'Unable to load image. The URL may be invalid or the remote server may disallow cross-origin canvas access (CORS). Upload the file directly for guaranteed export.'
      );
      onAddToast('Image Load Failed', 'CORS restriction or network error loading remote URL.', 'warning');
    };

    testImg.src = trimmed;
  };

  // Active Logo Source
  const getActiveLogoSrc = (): string | null => {
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

  /**
   * Helper: Render the square QR Code onto any given target canvas at specified size
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
          // Scale factor relative to 1024px
          const scaleMultiplier = targetResolution / 1024;
          const badgeBoxSize = targetResolution * (logoScale / 100);
          const badgeX = (targetResolution - badgeBoxSize) / 2;
          const badgeY = (targetResolution - badgeBoxSize) / 2;
          const pad = logoPadding * scaleMultiplier;
          const radius = logoBorderRadius * scaleMultiplier;

          // A. Draw badge background plate
          ctx.save();
          ctx.fillStyle = normalizeHexColor(logoBgColor, '#ffffff');
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 10 * scaleMultiplier;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 3 * scaleMultiplier;

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
          } else {
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
   * Helper: Render the Branded Campaign Card onto target canvas
   */
  const drawCardToCanvas = useCallback(
    async (
      targetCanvas: HTMLCanvasElement,
      qrCanvasSource: HTMLCanvasElement,
      width: number = 1200,
      height: number = 1500
    ): Promise<boolean> => {
      targetCanvas.width = width;
      targetCanvas.height = height;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return false;

      // 1. Draw Card Background
      ctx.fillStyle = normalizeHexColor(cardBgColor, '#0a0d14');
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
            // contain
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
      const pad = (cardPadding / 100) * 120;
      const contentTop = pad + 40;

      ctx.save();
      ctx.fillStyle = normalizeHexColor(cardTextColor, '#ffffff');
      ctx.textAlign = cardTextAlign;

      let textX = width / 2;
      if (cardTextAlign === 'left') textX = pad + 40;
      if (cardTextAlign === 'right') textX = width - pad - 40;

      // Draw Card Title
      if (cardTitle.trim()) {
        ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
        ctx.fillText(cardTitle.trim(), textX, contentTop + 40);
      }

      // Draw Card Subtitle
      if (cardSubtitle.trim()) {
        ctx.font = 'normal 26px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = normalizeHexColor(cardTextColor, '#ffffff') + 'cc';
        ctx.fillText(cardSubtitle.trim(), textX, contentTop + 86);
      }
      ctx.restore();

      // 5. Draw Safe QR Backing Plate & QR Code
      // Backing plate guarantees 100% scanning scannability regardless of background image
      const qrDisplaySize = 620; // 620px square QR
      const platePad = (backingPlatePadding / 24) * 36;
      const plateWidth = qrDisplaySize + platePad * 2;
      const plateHeight = qrDisplaySize + platePad * 2;
      const plateX = (width - plateWidth) / 2;
      const plateY = contentTop + 140;

      ctx.save();
      ctx.fillStyle = normalizeHexColor(backingPlateColor, '#ffffff');
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 16;
      drawRoundedRect(
        ctx,
        plateX,
        plateY,
        plateWidth,
        plateHeight,
        (backingPlateRadius / 24) * 32
      );
      ctx.fill();
      ctx.restore();

      // Draw the QR Code into the backing plate
      ctx.drawImage(
        qrCanvasSource,
        plateX + platePad,
        plateY + platePad,
        qrDisplaySize,
        qrDisplaySize
      );

      // 6. Draw Call-To-Action (CTA) Footer Banner
      if (cardCta.trim()) {
        const ctaY = plateY + plateHeight + 60;
        ctx.save();
        ctx.textAlign = 'center';

        // CTA Pill background
        const ctaText = cardCta.trim();
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        const textMetrics = ctx.measureText(ctaText);
        const pillWidth = Math.max(340, textMetrics.width + 80);
        const pillHeight = 58;
        const pillX = (width - pillWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, pillX, ctaY, pillWidth, pillHeight, pillHeight / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = normalizeHexColor(cardTextColor, '#ffffff');
        ctx.fillText(ctaText, width / 2, ctaY + 38);
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

  // Master Render Effect: Renders QR Canvas and Branded Card Canvas
  const renderAllCanvases = useCallback(async () => {
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas || !qrText.trim()) return;

    setIsRendering(true);
    try {
      // 1. Render QR Canvas at active resolution
      await drawQrToCanvas(qrCanvas, resolution);

      // 2. Render Card Canvas using the generated QR as input
      const cardCanvas = cardCanvasRef.current;
      if (cardCanvas) {
        await drawCardToCanvas(cardCanvas, qrCanvas, 1200, 1500);
      }
    } catch (err: any) {
      console.warn('[QR Code Studio Render Error]', err);
    } finally {
      setIsRendering(false);
    }
  }, [qrText, resolution, drawQrToCanvas, drawCardToCanvas]);

  useEffect(() => {
    renderAllCanvases();
  }, [renderAllCanvases]);

  // Clean filename generator
  const getExportFilename = (type: 'qr' | 'card', ext: 'png' | 'jpg') => {
    let slug = 'zenemoo-qr';
    if (type === 'card' && cardTitle.trim()) {
      slug = 'zenemoo-' + cardTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    return `${slug}-${type === 'qr' ? `${resolution}x${resolution}` : 'card'}-${Date.now()}.${ext}`;
  };

  // EXPORT 1: QR-Only PNG (Lossless)
  const handleDownloadQrPng = async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = getExportFilename('qr', 'png');
      link.href = dataUrl;
      link.click();
      onAddToast('QR PNG Exported', `Downloaded at ${resolution}×${resolution} resolution`, 'success');
    } catch (err: any) {
      onAddToast('Export Failed', err.message || 'Failed to download PNG', 'error');
    }
  };

  // EXPORT 2: QR-Only JPG (Solid Background Guaranteed)
  const handleDownloadQrJpg = async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // Solid background fill ensures zero dark/transparent JPG artifacts
      ctx.fillStyle = normalizeHexColor(bgColor, '#ffffff');
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(canvas, 0, 0);

      const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = getExportFilename('qr', 'jpg');
      link.href = dataUrl;
      link.click();
      onAddToast('QR JPG Exported', `Downloaded at ${resolution}×${resolution} resolution`, 'success');
    } catch (err: any) {
      onAddToast('Export Failed', err.message || 'Failed to download JPG', 'error');
    }
  };

  // EXPORT 3: Branded Card PNG
  const handleDownloadCardPng = async () => {
    const canvas = cardCanvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = getExportFilename('card', 'png');
      link.href = dataUrl;
      link.click();
      onAddToast('Branded Card Exported', 'Downloaded high-resolution marketing card PNG', 'success');
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('tainted')) {
        onAddToast(
          'Export Blocked by CORS',
          'The remote background image host blocks cross-origin export. Please download the image to your computer and upload it directly in Background settings.',
          'error'
        );
      } else {
        onAddToast('Export Failed', err.message || 'Failed to export card image.', 'error');
      }
    }
  };

  // EXPORT 4: Branded Card JPG
  const handleDownloadCardJpg = async () => {
    const canvas = cardCanvasRef.current;
    if (!canvas) return;

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = normalizeHexColor(cardBgColor, '#0a0d14');
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(canvas, 0, 0);

      const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = getExportFilename('card', 'jpg');
      link.href = dataUrl;
      link.click();
      onAddToast('Branded Card Exported', 'Downloaded high-resolution marketing card JPG', 'success');
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('tainted')) {
        onAddToast(
          'Export Blocked by CORS',
          'The remote background image host blocks cross-origin export. Upload the image directly from your computer.',
          'error'
        );
      } else {
        onAddToast('Export Failed', err.message || 'Failed to export card image.', 'error');
      }
    }
  };

  // EXPORT 5: Copy to Clipboard
  const handleCopyClipboard = async () => {
    const canvas = previewMode === 'qr' ? qrCanvasRef.current : cardCanvasRef.current;
    if (!canvas) return;

    try {
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
          // Fallback to text copy
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

  // Reset Everything to Zenemoo Defaults
  const handleReset = () => {
    setQrText('https://zenemoo.in');
    setFgColor('#000000');
    setBgColor('#ffffff');
    setLogoOption('zenemoo');
    setLogoScale(20);
    setLogoPadding(8);
    setBadgeShape('rounded');
    setLogoBorderRadius(12);
    setLogoBgColor('#ffffff');
    setMargin(2);
    setResolution(1024);
    setErrorCorrection('H');

    // Background & Card Reset
    setPreviewMode('qr');
    setCardBgColor('#0a0d14');
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
    onAddToast('Design Reset', 'Restored default Zenemoo branding and QR specifications', 'info');
  };

  const filteredShortLinks = shortLinks.filter(
    (l) =>
      l.code.toLowerCase().includes(shortLinkSearch.toLowerCase()) ||
      l.destination_url.toLowerCase().includes(shortLinkSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">QR Code Studio</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300">
                <Lock className="w-3 h-3" />
                Generated locally
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Create branded QR codes for links, campaigns and digital sharing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Reset All Designs and Controls to Default"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset design</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN STUDIO LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CONTROLS & DESIGN SYSTEM (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* A. QR CONTENT & SHORT LINK INTEGRATION */}
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
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Insert Short Link</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isShortLinksDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 max-h-80 overflow-y-auto rounded-xl bg-[#090b11] border border-white/15 shadow-2xl p-2.5 z-50 space-y-2">
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Live Short Links:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsShortLinksDropdownOpen(false)}
                        className="text-slate-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Filter short links..."
                      value={shortLinkSearch}
                      onChange={(e) => setShortLinkSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-[11px] font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <div className="space-y-1">
                      {filteredShortLinks.length === 0 ? (
                        <p className="text-xs text-slate-500 font-mono italic px-2 py-3 text-center">
                          {isLoadingShortLinks ? 'Loading short links...' : 'No matching short links.'}
                        </p>
                      ) : (
                        filteredShortLinks.map((l) => (
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
                              <span className="text-[9px] text-slate-500 font-normal">{l.status}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{l.destination_url}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input textarea */}
            <div className="relative">
              <textarea
                rows={2}
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                placeholder="Enter any destination URL (e.g. https://zenemoo.in) or plain text..."
                className="w-full p-3 pr-8 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-all resize-none"
              />
              {qrText && (
                <button
                  type="button"
                  onClick={() => setQrText('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white p-1"
                  title="Clear Input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick URL presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-slate-500 mr-1">Presets:</span>
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setQrText(p.url)}
                  className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* B. CENTER LOGO & BRANDING */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                Center Logo Embedding
              </label>
              <span className="text-[10px] font-mono text-cyan-300">Level H Error Correction</span>
            </div>

            {/* Logo Options */}
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
                  {customLogoName ? customLogoName : 'Local file'}
                </div>
              </label>
            </div>

            {/* Logo Customization Sliders */}
            {logoOption !== 'none' && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-4">
                {/* Logo Size */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                    <span>Logo Scale ({logoScale}%)</span>
                    <span className="text-[10px] text-slate-500">Max recommended: 25%</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={25}
                    value={logoScale}
                    onChange={(e) => setLogoScale(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Badge Shape & Padding */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1.5">Badge Shape</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBadgeShape('rounded')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                          badgeShape === 'rounded'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        Square
                      </button>
                      <button
                        type="button"
                        onClick={() => setBadgeShape('circle')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                          badgeShape === 'circle'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        Circle
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
                      <span>Badge Padding ({logoPadding}px)</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={18}
                      value={logoPadding}
                      onChange={(e) => setLogoPadding(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Badge Background Color & Corner Radius (if rounded) */}
                <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-300">Badge Background:</span>
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
                      className="w-20 px-2 py-1 rounded bg-black/60 border border-white/10 text-white text-[11px] font-mono"
                    />
                  </div>

                  {badgeShape === 'rounded' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-300">Roundness:</span>
                      <input
                        type="range"
                        min={0}
                        max={24}
                        value={logoBorderRadius}
                        onChange={(e) => setLogoBorderRadius(parseInt(e.target.value, 10))}
                        className="w-24 accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-mono flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Always test the generated QR code with a physical scanner before printing.</span>
                </div>
              </div>
            )}
          </div>

          {/* C. QR COLORS & WCAG 2.1 CONTRAST CHECKER */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                Color & Contrast Ratio
              </label>

              {/* Bulletproof Contrast Ratio Badge - Never NaN */}
              <div
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                  contrastRatio === null
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : isContrastWarning
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {contrastRatio === null ? (
                  <>
                    <Info className="w-3 h-3" />
                    <span>Contrast: Unavailable</span>
                  </>
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

            {/* Warning if contrast is low */}
            {isContrastWarning && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Low contrast detected ({contrastRatio ? contrastRatio.toFixed(1) : ''}:1). Smartphone cameras may fail
                  to recognize this code in dim lighting. A contrast ratio of 3.0:1 or greater is strongly advised.
                </p>
              </div>
            )}

            {/* Custom Color Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">Foreground (Pattern)</span>
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">Background</span>
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Preset Color Palettes */}
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
                High-Contrast Presets:
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

          {/* D. BACKGROUND IMAGE & BRANDED CAMPAIGN CARD CUSTOMIZATION */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Background & Branded Card
              </label>
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
                  setBgUrlError(null);
                }}
                className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Reset Background
              </button>
            </div>

            {/* Background Source Selector */}
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
                  <span>Upload</span>
                </div>
                <div className="text-[9px] text-slate-500 truncate">
                  {uploadedBgName ? uploadedBgName : 'Local file'}
                </div>
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

            {/* URL Background Loader with Explicit Preview Action */}
            {bgType === 'url' && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                <span className="text-[11px] font-mono text-slate-400 block">
                  Enter HTTPS Image URL (fetched only when previewed):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={bgUrlInput}
                    onChange={(e) => {
                      setBgUrlInput(e.target.value);
                      setBgUrlError(null);
                    }}
                    placeholder="https://example.com/background.jpg"
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBgUrl}
                    disabled={isTestingBgUrl}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold shrink-0 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isTestingBgUrl ? 'Loading...' : 'Preview Image'}
                  </button>
                </div>

                {bgUrlError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
                    {bgUrlError}
                  </div>
                )}
              </div>
            )}

            {/* Solid Card Color Picker */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
              <span className="text-xs font-mono text-slate-300">Card Base Color:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={normalizeHexColor(cardBgColor, '#0a0d14')}
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

            {/* Fitting & Overlay Controls (when background image is used) */}
            {(uploadedBgUrl || appliedBgUrl) && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Image Fit</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['cover', 'contain'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setBgFit(mode)}
                          className={`py-1.5 text-xs font-mono rounded-lg border capitalize transition-all cursor-pointer ${
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
                          className={`py-1.5 text-xs font-mono rounded-lg border capitalize transition-all cursor-pointer ${
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

                {/* Tint Overlay Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Dark Tint Overlay ({overlayOpacity}%)</span>
                    <span className="text-[10px] text-slate-500">Ensures text & QR pop</span>
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

            {/* Campaign Typography Controls */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Card Typography & Branding:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Card Title</label>
                  <input
                    type="text"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    placeholder="e.g. Zenemoo Global"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Call To Action (CTA)</label>
                  <input
                    type="text"
                    value={cardCta}
                    onChange={(e) => setCardCta(e.target.value)}
                    placeholder="e.g. Scan with camera"
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
                  placeholder="e.g. Scan to explore talent & opportunities"
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
          </div>

          {/* E. RESOLUTION & QUIET ZONE */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <label className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Resolution & Quiet Zone
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: '512 px', value: 512, sub: 'Web / Social' },
                { label: '1024 px', value: 1024, sub: 'High-Res Digital' },
                { label: '2048 px', value: 2048, sub: 'Ultra Print Poster' },
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

        {/* RIGHT COLUMN: PREVIEW & EXPORT SUITE (5 COLS) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl space-y-5 text-center">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewMode('qr')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    previewMode === 'qr'
                      ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  QR Code Only
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('card')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    previewMode === 'card'
                      ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Branded Card
                </button>
              </div>

              <span className="text-[10px] font-mono text-cyan-300">
                {previewMode === 'qr' ? `${resolution}×${resolution} px` : '1200×1500 px'}
              </span>
            </div>

            {/* CANVASES PREVIEW CONTAINER */}
            <div className="relative p-4 sm:p-6 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden min-h-[320px]">
              {/* MODE A: QR-ONLY PREVIEW (Strict 1:1 Aspect-Square Container) */}
              <div
                className={`w-full max-w-[280px] sm:max-w-[300px] aspect-square mx-auto flex items-center justify-center ${
                  previewMode === 'qr' ? 'block' : 'hidden'
                }`}
              >
                <canvas
                  ref={qrCanvasRef}
                  className="w-full h-full object-contain rounded-xl shadow-2xl block transition-all"
                  style={{
                    aspectRatio: '1 / 1',
                    imageRendering: 'pixelated',
                  }}
                />
              </div>

              {/* MODE B: BRANDED CARD PREVIEW (Aspect-Ratio 4:5 Poster Container) */}
              <div
                className={`w-full max-w-[280px] sm:max-w-[320px] aspect-[4/5] mx-auto flex items-center justify-center ${
                  previewMode === 'card' ? 'block' : 'hidden'
                }`}
              >
                <canvas
                  ref={cardCanvasRef}
                  className="w-full h-full object-contain rounded-xl shadow-2xl block transition-all"
                  style={{
                    aspectRatio: '4 / 5',
                  }}
                />
              </div>

              {isRendering && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-10">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Target Encoded Info */}
            <div className="text-left bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Encoded Target:</span>
              <p className="text-xs font-mono text-cyan-300 break-all truncate">
                {qrText || <span className="text-slate-600 italic">No content</span>}
              </p>
            </div>

            {/* DEDICATED EXPORT ACTIONS */}
            <div className="space-y-2.5 pt-1">
              {previewMode === 'qr' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadQrPng}
                      disabled={!qrText.trim()}
                      className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadQrJpg}
                      disabled={!qrText.trim()}
                      className="w-full py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      <span>Download JPG</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadCardPng}
                      disabled={!qrText.trim()}
                      className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Card PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadCardJpg}
                      disabled={!qrText.trim()}
                      className="w-full py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>Card JPG</span>
                    </button>
                  </div>
                </>
              )}

              {/* Copy to Clipboard */}
              <button
                type="button"
                onClick={handleCopyClipboard}
                disabled={!qrText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Image Copied to Clipboard!' : `Copy ${previewMode === 'qr' ? 'QR' : 'Card'} to Clipboard`}</span>
              </button>
            </div>

            {/* Privacy and Verification Assurance */}
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
