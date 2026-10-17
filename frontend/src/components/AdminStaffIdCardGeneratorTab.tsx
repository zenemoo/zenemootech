import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  IdCard,
  Search,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Download,
  Check,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Globe,
  ExternalLink,
  Printer,
  User,
  Phone,
  Mail,
  Hash,
  Building,
  Calendar,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
  Layers,
  FileCheck,
} from 'lucide-react';
import {
  staffIdCardApi,
  StaffIdCardItem,
  StaffCardFieldVisibility,
} from '../services/api';
import { useActiveLogo } from '../lib/useActiveLogo';

interface AdminStaffIdCardGeneratorTabProps {
  onAddToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onShowConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }
  ) => void;
}

// Default Field Visibility
const DEFAULT_VISIBILITY: StaffCardFieldVisibility = {
  designation: true,
  staff_id: true,
  email: true,
  phone: true,
  department: true,
  joining_year: true,
  qr_code: true,
};

// Standard CR-80 card proportions (54mm x 85.6mm -> approx 1 : 1.585)
const PREVIEW_WIDTH = 420;
const PREVIEW_HEIGHT = 665;
const EXPORT_WIDTH = 1200; // 300+ DPI
const EXPORT_HEIGHT = 1900;
const EXPORT_WIDTH_UHD = 2400; // 600 DPI
const EXPORT_HEIGHT_UHD = 3800;

export const AdminStaffIdCardGeneratorTab: React.FC<AdminStaffIdCardGeneratorTabProps> = ({
  onAddToast,
  onShowConfirm,
}) => {
  const { logoUrl } = useActiveLogo();

  // Mode Selection: 'fetched' | 'manual'
  const [mode, setMode] = useState<'fetched' | 'manual'>('fetched');

  // Lookup State (Mode B)
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [multipleCandidates, setMultipleCandidates] = useState<any[]>([]);
  const [verifiedMember, setVerifiedMember] = useState<any | null>(null);

  // In-Memory Lookup Session Cache to eliminate duplicate network queries
  const lookupCache = useRef<Map<string, any>>(new Map());

  // Card Editable Form State
  const [staffId, setStaffId] = useState('ZNM-6E1F0');
  const [fullName, setFullName] = useState('Prem Prasad Pradhan');
  const [designation, setDesignation] = useState('Founder & AI Solutions Architect');
  const [department, setDepartment] = useState('Leadership & AI Operations');
  const [email, setEmail] = useState('contact@mrprem.in');
  const [phone, setPhone] = useState('+91 98277 75230');
  const [joiningYear, setJoiningYear] = useState('Est. 2023');
  const [photoUrl, setPhotoUrl] = useState(
    'https://res.cloudinary.com/rwoe0mm9/image/upload/v1785185414/zenemoo/team/huq7bbgg3a5rcjpnah0h.jpg'
  );
  const [photoPublicId, setPhotoPublicId] = useState('');
  const [photoIsOwned, setPhotoIsOwned] = useState(false);
  const [sourceTeamMemberId, setSourceTeamMemberId] = useState<string | null>(
    '6e1f0659-3c53-40c0-aeb4-54d52b8e55e2'
  );
  const [canonicalProfileUrl, setCanonicalProfileUrl] = useState(
    'https://www.zenemoo.in/team/prem-prasad-pradhan'
  );

  // Field Visibility Switches
  const [visibility, setVisibility] = useState<StaffCardFieldVisibility>(DEFAULT_VISIBILITY);

  // Saved Cards Drawer & Storage
  const [savedCards, setSavedCards] = useState<StaffIdCardItem[]>([]);
  const [isLoadingSavedCards, setIsLoadingSavedCards] = useState(false);
  const [savedCardsSearch, setSavedCardsSearch] = useState('');
  const [showSavedCardsDrawer, setShowSavedCardsDrawer] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [currentSavedCardId, setCurrentSavedCardId] = useState<string | null>(null);

  // Export & UI Controls
  const [exportResolution, setExportResolution] = useState<'300' | '600'>('300');
  const [isExporting, setIsExporting] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  // Interactive Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawImageSource, setRawImageSource] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Canvas Refs
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --------------------------------------------------------------------------
  // 1. INITIALIZATION & REUSABLE ASSET CACHING
  // --------------------------------------------------------------------------
  const cachedLogoImage = useRef<HTMLImageElement | null>(null);
  const cachedPhotoImage = useRef<HTMLImageElement | null>(null);
  const cachedQrCanvas = useRef<HTMLCanvasElement | null>(null);

  // Preload Zenemoo Logo with CORS support
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl || '/assets/logo.png';
    img.onload = () => {
      cachedLogoImage.current = img;
      renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    };
  }, [logoUrl]);

  // Preload and cache photo image
  useEffect(() => {
    if (!photoUrl) {
      cachedPhotoImage.current = null;
      renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photoUrl;
    img.onload = () => {
      cachedPhotoImage.current = img;
      renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    };
    img.onerror = () => {
      console.warn('[Staff ID Generator] Remote photo failed to load:', photoUrl);
      cachedPhotoImage.current = null;
      renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    };
  }, [photoUrl]);

  // Generate QR Code with high-error-correction
  useEffect(() => {
    if (!visibility.qr_code || !canonicalProfileUrl) {
      cachedQrCanvas.current = null;
      renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      return;
    }

    const qrCanvas = document.createElement('canvas');
    QRCode.toCanvas(
      qrCanvas,
      canonicalProfileUrl,
      {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'H', // High error correction permits center logo overlay
        color: {
          dark: '#0A192F',
          light: '#FFFFFF',
        },
      },
      (err) => {
        if (!err) {
          cachedQrCanvas.current = qrCanvas;
          renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        }
      }
    );
  }, [canonicalProfileUrl, visibility.qr_code]);

  // Load Saved Cards List on mount
  const fetchSavedCards = useCallback(async () => {
    setIsLoadingSavedCards(true);
    try {
      const res = await staffIdCardApi.getSavedCards();
      if (res.data && Array.isArray(res.data.cards)) {
        setSavedCards(res.data.cards);
      }
    } catch (e: any) {
      console.warn('Failed to load saved staff cards:', e.message);
    } finally {
      setIsLoadingSavedCards(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedCards();
  }, [fetchSavedCards]);

  // --------------------------------------------------------------------------
  // 2. LOOKUP LOGIC (EGRESS-MINIMIZED & SESSION CACHED)
  // --------------------------------------------------------------------------
  const handleLookupStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = lookupQuery.trim();
    if (!query) {
      setLookupError('Please enter a Staff ID (e.g. ZNM-6E1F0) or Name.');
      return;
    }

    setLookupError(null);
    setMultipleCandidates([]);

    // Check In-Memory Session Cache First
    const cacheKey = query.toUpperCase();
    if (lookupCache.current.has(cacheKey)) {
      const cachedResult = lookupCache.current.get(cacheKey);
      populateFromRecord(cachedResult);
      onAddToast('Staff Loaded from Cache', `Loaded ${cachedResult.name} (0 egress)`, 'info');
      return;
    }

    setIsSearching(true);
    try {
      const res = await staffIdCardApi.lookup(query);
      const payload: any = (res as any)?.data || res;
      if (payload && payload.found && Array.isArray(payload.records) && payload.records.length > 0) {
        if (payload.records.length === 1) {
          const record = payload.records[0];
          lookupCache.current.set(cacheKey, record);
          populateFromRecord(record);
          onAddToast('Staff Record Verified', `Verified ${record.name} on Zenemoo roster`, 'success');
        } else {
          // Ambiguous search: multiple staff matched
          setMultipleCandidates(payload.records);
          onAddToast('Multiple Candidates Found', `Select the intended staff member below`, 'info');
        }
      } else {
        setLookupError(`No staff member found matching "${query}". Please check the Staff ID or Name.`);
      }
    } catch (err: any) {
      setLookupError(err.message || 'Database connection error during lookup.');
      onAddToast('Lookup Failed', err.message || 'Error communicating with database', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const populateFromRecord = (record: any) => {
    setVerifiedMember(record);
    setMultipleCandidates([]);
    setLookupError(null);

    // Derive explicit Staff ID
    const rawId = String(record.id || '202401').replace(/-/g, '').substring(0, 5).toUpperCase();
    const resolvedStaffId = record.employee_id?.trim() || `ZNM-${rawId}`;

    setStaffId(resolvedStaffId);
    setFullName(record.name || '');
    setDesignation(record.designation || record.role || 'Data & AI Specialist');
    setDepartment(record.department || 'Data Solutions Division');
    setEmail(record.email || 'contact@zenemoo.in');
    setPhone(record.phone || record.company_phone || '');
    setJoiningYear(record.joining_date ? `Est. ${record.joining_date}` : 'Est. 2023');
    setSourceTeamMemberId(record.id || null);

    // Profile URL
    const slug = record.slug || record.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    setCanonicalProfileUrl(`https://www.zenemoo.in/team/${slug}`);

    // Photo
    if (record.image_url) {
      setPhotoUrl(record.image_url);
      setPhotoPublicId('');
      setPhotoIsOwned(false); // Source photo owned by team, not this card
    }

    setMode('fetched');
    setCurrentSavedCardId(null);
  };

  // --------------------------------------------------------------------------
  // 3. MASTER CANVAS RENDERING ENGINE (REFERENCE MATCHED)
  // --------------------------------------------------------------------------
  const renderCardToCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, targetW: number, targetH: number) => {
      if (!canvas) return;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = targetW / PREVIEW_WIDTH;

      // 1. Crisp White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Top-Left & Top-Right Cyan/Blue/Purple Geometric Gradient Wave Ribbons
      ctx.save();
      // Wave 1: Cyan to Electric Blue ribbon
      const grad1 = ctx.createLinearGradient(0, 0, targetW, targetH * 0.35);
      grad1.addColorStop(0, '#06B6D4'); // Cyan
      grad1.addColorStop(0.5, '#3B82F6'); // Blue
      grad1.addColorStop(1, '#8B5CF6'); // Purple
      ctx.fillStyle = grad1;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(targetW, 0);
      ctx.bezierCurveTo(targetW, targetH * 0.18, targetW * 0.6, targetH * 0.22, 0, targetH * 0.14);
      ctx.closePath();
      ctx.fill();

      // Wave 2: Subtle translucent accent wave
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(targetW * 0.75, 0);
      ctx.bezierCurveTo(targetW * 0.5, targetH * 0.12, targetW * 0.2, targetH * 0.16, 0, targetH * 0.08);
      ctx.closePath();
      ctx.fill();

      // Bottom Right Geometric Corner Ribbon
      const gradBottom = ctx.createLinearGradient(targetW * 0.5, targetH, targetW, targetH * 0.85);
      gradBottom.addColorStop(0, '#3B82F6');
      gradBottom.addColorStop(1, '#06B6D4');
      ctx.fillStyle = gradBottom;
      ctx.beginPath();
      ctx.moveTo(targetW, targetH);
      ctx.lineTo(targetW * 0.45, targetH);
      ctx.bezierCurveTo(targetW * 0.65, targetH * 0.96, targetW * 0.85, targetH * 0.94, targetW, targetH * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 3. Header: Zenemoo Brand Mark & Text
      const headerTop = 22 * scale;
      const logoSize = 34 * scale;
      const logoX = 24 * scale;
      const logoY = headerTop;

      if (cachedLogoImage.current) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(cachedLogoImage.current, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 ${Math.round(15 * scale)}px 'Space Grotesk', system-ui, sans-serif`;
      ctx.fillText('ZENEMOO', logoX + logoSize + 10 * scale, logoY + 18 * scale);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.font = `600 ${Math.round(8.5 * scale)}px 'Inter', system-ui, sans-serif`;
      ctx.letterSpacing = `${1.2 * scale}px`;
      ctx.fillText('DATA SOLUTIONS', logoX + logoSize + 10 * scale, logoY + 30 * scale);
      ctx.restore();

      // 4. Circular Employee Portrait with Concentric Cyan/Purple Accents
      const photoCenterX = targetW / 2;
      const photoCenterY = 135 * scale;
      const photoRadius = 56 * scale;

      // Outer Gradient Border Ring
      ctx.save();
      const ringGrad = ctx.createLinearGradient(
        photoCenterX - photoRadius,
        photoCenterY - photoRadius,
        photoCenterX + photoRadius,
        photoCenterY + photoRadius
      );
      ringGrad.addColorStop(0, '#06B6D4');
      ringGrad.addColorStop(1, '#8B5CF6');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(photoCenterX, photoCenterY, photoRadius + 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Inner White Ring
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(photoCenterX, photoCenterY, photoRadius + 2 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Clipped Employee Photo
      ctx.beginPath();
      ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
      ctx.clip();

      if (cachedPhotoImage.current) {
        ctx.drawImage(
          cachedPhotoImage.current,
          photoCenterX - photoRadius,
          photoCenterY - photoRadius,
          photoRadius * 2,
          photoRadius * 2
        );
      } else {
        // Fallback Silhouette
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(photoCenterX - photoRadius, photoCenterY - photoRadius, photoRadius * 2, photoRadius * 2);
        ctx.fillStyle = '#0F172A';
        ctx.font = `700 ${Math.round(30 * scale)}px 'Space Grotesk', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(fullName.charAt(0) || 'Z', photoCenterX, photoCenterY + 10 * scale);
      }
      ctx.restore();

      // 5. Employee Name & Designation
      let currentY = 222 * scale;

      ctx.save();
      ctx.textAlign = 'center';

      // Measured font scaling for long names
      let nameFontSize = Math.round(20 * scale);
      ctx.font = `800 ${nameFontSize}px 'Space Grotesk', system-ui, sans-serif`;
      const nameWidth = ctx.measureText(fullName).width;
      if (nameWidth > targetW * 0.88) {
        nameFontSize = Math.round(16 * scale);
        ctx.font = `800 ${nameFontSize}px 'Space Grotesk', system-ui, sans-serif`;
      }

      ctx.fillStyle = '#0A192F'; // Deep Navy
      ctx.fillText(fullName, targetW / 2, currentY);

      // Designation
      if (visibility.designation && designation.trim()) {
        currentY += 19 * scale;
        ctx.fillStyle = '#0284C7'; // Cyan/Navy accent
        ctx.font = `700 ${Math.round(10.5 * scale)}px 'Inter', system-ui, sans-serif`;
        ctx.fillText(designation.toUpperCase(), targetW / 2, currentY);
      }

      // Department Pill Badge
      if (visibility.department && department.trim()) {
        currentY += 20 * scale;
        ctx.font = `600 ${Math.round(8.5 * scale)}px 'Inter', system-ui, sans-serif`;
        const depText = department.toUpperCase();
        const depMetrics = ctx.measureText(depText);
        const pillW = depMetrics.width + 16 * scale;
        const pillH = 17 * scale;
        const pillX = (targetW - pillW) / 2;
        const pillY = currentY - 12 * scale;

        ctx.fillStyle = 'rgba(6, 182, 212, 0.09)';
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0369A1';
        ctx.fillText(depText, targetW / 2, currentY);
      }
      ctx.restore();

      // Decorative divider
      currentY += 18 * scale;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(34 * scale, currentY);
      ctx.lineTo(targetW - 34 * scale, currentY);
      ctx.stroke();

      // 6. Contact Data Stack & QR Code Layout
      const contentSectionTop = currentY + 22 * scale;
      const stackX = 34 * scale;
      let stackY = contentSectionTop;

      // Contact Info Rows
      ctx.save();
      const drawInfoRow = (iconLabel: string, value: string, subLabel: string) => {
        if (!value) return;

        // Micro Icon Circle
        const iconR = 10 * scale;
        ctx.fillStyle = '#F0F9FF';
        ctx.beginPath();
        ctx.arc(stackX + iconR, stackY + iconR, iconR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284C7';
        ctx.font = `700 ${Math.round(8 * scale)}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(iconLabel, stackX + iconR, stackY + iconR + 3 * scale);

        // Sublabel
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748B';
        ctx.font = `600 ${Math.round(7.5 * scale)}px 'Inter', sans-serif`;
        ctx.fillText(subLabel.toUpperCase(), stackX + iconR * 2 + 8 * scale, stackY + 8 * scale);

        // Value
        ctx.fillStyle = '#0F172A';
        ctx.font = `700 ${Math.round(9.5 * scale)}px 'Space Grotesk', system-ui, sans-serif`;
        ctx.fillText(value, stackX + iconR * 2 + 8 * scale, stackY + 20 * scale);

        stackY += 34 * scale;
      };

      if (visibility.staff_id && staffId.trim()) {
        drawInfoRow('#', staffId, 'Staff ID');
      }
      if (visibility.phone && phone.trim()) {
        drawInfoRow('P', phone, 'Phone');
      }
      if (visibility.email && email.trim()) {
        drawInfoRow('@', email, 'Official Email');
      }
      if (visibility.joining_year && joiningYear.trim()) {
        drawInfoRow('J', joiningYear, 'Joined');
      }
      ctx.restore();

      // 7. QR Code Placement (Right-aligned in lower section, balanced with contact stack)
      if (visibility.qr_code && cachedQrCanvas.current) {
        const qrSize = 115 * scale;
        const qrX = targetW - qrSize - 32 * scale;
        const qrY = contentSectionTop + 10 * scale;

        // White Plate with subtle drop shadow
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetY = 4 * scale;
        ctx.beginPath();
        ctx.roundRect(qrX - 6 * scale, qrY - 6 * scale, qrSize + 12 * scale, qrSize + 12 * scale, 10 * scale);
        ctx.fill();
        ctx.restore();

        // Draw QR Matrix
        ctx.drawImage(cachedQrCanvas.current, qrX, qrY, qrSize, qrSize);

        // Overlay Genuine Zenemoo Logo in Center of QR with solid white quiet zone
        if (cachedLogoImage.current) {
          const centerBadgeSize = 28 * scale;
          const centerBadgeX = qrX + (qrSize - centerBadgeSize) / 2;
          const centerBadgeY = qrY + (qrSize - centerBadgeSize) / 2;

          ctx.save();
          // White circle backing
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(
            centerBadgeX + centerBadgeSize / 2,
            centerBadgeY + centerBadgeSize / 2,
            centerBadgeSize / 2 + 2.5 * scale,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Zenemoo Logo clipped into center
          ctx.beginPath();
          ctx.arc(
            centerBadgeX + centerBadgeSize / 2,
            centerBadgeY + centerBadgeSize / 2,
            centerBadgeSize / 2,
            0,
            Math.PI * 2
          );
          ctx.clip();
          ctx.drawImage(cachedLogoImage.current, centerBadgeX, centerBadgeY, centerBadgeSize, centerBadgeSize);
          ctx.restore();
        }

        // Subtext under QR
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748B';
        ctx.font = `600 ${Math.round(7.5 * scale)}px 'Inter', sans-serif`;
        ctx.fillText('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 16 * scale);
        ctx.restore();
      }

      // 8. Brand Footer: Tagline & Website
      ctx.save();
      const footerY = targetH - 24 * scale;
      ctx.textAlign = 'center';

      // Tagline
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${Math.round(9.5 * scale)}px 'Space Grotesk', system-ui, sans-serif`;
      ctx.fillText('A Bright Tomorrow, Together.', targetW / 2, footerY - 14 * scale);

      // Official Domain
      ctx.fillStyle = '#0284C7';
      ctx.font = `700 ${Math.round(8.5 * scale)}px 'Inter', monospace`;
      ctx.letterSpacing = `${1.1 * scale}px`;
      ctx.fillText('WWW.ZENEMOO.IN', targetW / 2, footerY);
      ctx.restore();
    },
    [
      fullName,
      designation,
      department,
      staffId,
      email,
      phone,
      joiningYear,
      visibility,
    ]
  );

  // Re-render preview canvas on state changes
  useEffect(() => {
    renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  }, [renderCardToCanvas]);

  // --------------------------------------------------------------------------
  // 4. HIGH-RESOLUTION PNG / JPG EXPORT ENGINE
  // --------------------------------------------------------------------------
  const handleExport = async (format: 'png' | 'jpg') => {
    if (!staffId.trim() || !fullName.trim()) {
      onAddToast('Missing Information', 'Staff ID and Employee Name are required to export.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const exportW = exportResolution === '600' ? EXPORT_WIDTH_UHD : EXPORT_WIDTH;
      const exportH = exportResolution === '600' ? EXPORT_HEIGHT_UHD : EXPORT_HEIGHT;

      const offscreen = document.createElement('canvas');
      renderCardToCanvas(offscreen, exportW, exportH);

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const cleanSlug = staffId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const filename = `zenemoo-id-card-${cleanSlug}-${Date.now()}.${format}`;

      const dataUrl = offscreen.toDataURL(mimeType, 0.95);
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = filename;
      downloadLink.click();

      onAddToast(
        `${format.toUpperCase()} Exported Successfully`,
        `Generated print-ready card at ${exportW}×${exportH} px resolution (${exportResolution} DPI)`,
        'success'
      );
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('tainted')) {
        onAddToast(
          'Export Blocked by CORS',
          'The remote employee photo host blocked canvas export. Please use Change Image -> Upload Photo to upload a local photo.',
          'error'
        );
      } else {
        onAddToast('Export Failed', err.message || 'Failed to generate ID card image', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. CLOUDINARY PHOTO UPLOAD & INTERACTIVE CROP WORKFLOW
  // --------------------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type & size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      onAddToast('Invalid Image Format', 'Please upload a JPEG, PNG, or WebP photo.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onAddToast('File Too Large', 'Please upload a photo under 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setRawImageSource(result);
      setCropZoom(1);
      setCropPan({ x: 0, y: 0 });
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Render crop preview in interactive modal
  useEffect(() => {
    if (!isCropModalOpen || !rawImageSource || !cropCanvasRef.current) return;
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = rawImageSource;
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;

      ctx.clearRect(0, 0, 400, 400);

      // Draw background dark grid
      ctx.fillStyle = '#090B12';
      ctx.fillRect(0, 0, 400, 400);

      // Save before zoom and pan
      ctx.save();
      ctx.translate(200 + cropPan.x, 200 + cropPan.y);
      ctx.scale(cropZoom, cropZoom);

      const aspect = img.width / img.height;
      let drawW = 320;
      let drawH = 320 / aspect;
      if (aspect < 1) {
        drawH = 320;
        drawW = 320 * aspect;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Overlay Circular Portrait Mask
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.rect(0, 0, 400, 400);
      ctx.arc(200, 200, 140, 0, Math.PI * 2, true);
      ctx.fill();

      // Circular Guide Line
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(200, 200, 140, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
  }, [isCropModalOpen, rawImageSource, cropZoom, cropPan]);

  const handleConfirmCropAndUpload = async () => {
    if (!cropCanvasRef.current || !rawImageSource) return;

    setIsUploadingPhoto(true);
    try {
      // Create high-res circular cropped export canvas
      const cropW = 600;
      const cropH = 600;
      const exportCrop = document.createElement('canvas');
      exportCrop.width = cropW;
      exportCrop.height = cropH;
      const ctx = exportCrop.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      const img = new Image();
      img.src = rawImageSource;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Clear & draw transparent circular mask
      ctx.save();
      ctx.beginPath();
      ctx.arc(cropW / 2, cropH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();

      const scaleMultiplier = cropW / 400;
      ctx.translate(cropW / 2 + cropPan.x * scaleMultiplier, cropH / 2 + cropPan.y * scaleMultiplier);
      ctx.scale(cropZoom * scaleMultiplier, cropZoom * scaleMultiplier);

      const aspect = img.width / img.height;
      let drawW = 320;
      let drawH = 320 / aspect;
      if (aspect < 1) {
        drawH = 320;
        drawW = 320 * aspect;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Convert to blob and upload through secure backend Cloudinary route
      const blob = await new Promise<Blob | null>((resolve) =>
        exportCrop.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('Failed to create image blob');

      const formData = new FormData();
      formData.append('file', blob, `staff-${staffId || 'card'}.png`);
      formData.append('staff_id', staffId);

      const uploadRes = await staffIdCardApi.uploadPhoto(formData);
      if (uploadRes.data && uploadRes.data.secure_url) {
        setPhotoUrl(uploadRes.data.secure_url);
        setPhotoPublicId(uploadRes.data.public_id || '');
        setPhotoIsOwned(true); // Explicitly mark as card-owned for safe lifecycle
        setIsCropModalOpen(false);
        setRawImageSource(null);
        onAddToast('Photo Cropped & Uploaded', 'New photo uploaded to Cloudinary successfully', 'success');
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      onAddToast('Upload Failed', err.message || 'Failed to upload cropped photo to Cloudinary', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6. CARD CONFIGURATION PERSISTENCE (SAVE / LOAD / DELETE)
  // --------------------------------------------------------------------------
  const handleSaveCardConfiguration = async () => {
    if (!staffId.trim() || !fullName.trim()) {
      onAddToast('Required Fields Missing', 'Staff ID and Name are required to save a card configuration.', 'error');
      return;
    }

    setIsSavingCard(true);
    try {
      const payload: Partial<StaffIdCardItem> = {
        id: currentSavedCardId || undefined,
        staff_id: staffId.trim(),
        team_member_id: sourceTeamMemberId,
        mode,
        card_full_name: fullName.trim(),
        card_designation: designation.trim(),
        card_department: department.trim(),
        card_email: email.trim(),
        card_phone: phone.trim(),
        card_photo_url: photoUrl.trim(),
        card_photo_public_id: photoPublicId.trim(),
        card_photo_is_owned: photoIsOwned,
        card_joining_year: joiningYear.trim(),
        qr_destination_url: canonicalProfileUrl.trim(),
        field_visibility: visibility,
        theme_preset: 'signature_light',
      };

      const res = await staffIdCardApi.saveCard(payload);
      if (res.data && res.data.card) {
        setCurrentSavedCardId(res.data.card.id || null);
        onAddToast('Configuration Saved', `Card configuration for ${fullName} saved to Supabase`, 'success');
        fetchSavedCards();
      }
    } catch (err: any) {
      onAddToast('Failed to Save', err.message || 'Error persisting card configuration', 'error');
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleLoadSavedCard = async (savedCard: StaffIdCardItem) => {
    if (!savedCard.id) return;
    try {
      const res = await staffIdCardApi.getCardById(savedCard.id);
      if (res.data && res.data.card) {
        const c = res.data.card;
        setCurrentSavedCardId(c.id || null);
        setStaffId(c.staff_id || '');
        setFullName(c.card_full_name || '');
        setDesignation(c.card_designation || '');
        setDepartment(c.card_department || '');
        setEmail(c.card_email || '');
        setPhone(c.card_phone || '');
        setJoiningYear(c.card_joining_year || '');
        setPhotoUrl(c.card_photo_url || '');
        setPhotoPublicId(c.card_photo_public_id || '');
        setPhotoIsOwned(Boolean(c.card_photo_is_owned));
        setSourceTeamMemberId(c.team_member_id || null);
        setCanonicalProfileUrl(c.qr_destination_url || '');
        setMode(c.mode || 'manual');
        if (c.field_visibility) {
          setVisibility(c.field_visibility);
        }

        if (res.data.sourceMemberMissing) {
          onAddToast(
            'Source Profile Removed',
            'The original staff member is no longer on the roster. You can still print or export this saved card.',
            'warning'
          );
        } else {
          onAddToast('Card Loaded', `Loaded saved configuration for ${c.card_full_name}`, 'info');
        }
        setShowSavedCardsDrawer(false);
      }
    } catch (e: any) {
      onAddToast('Failed to Load Card', e.message || 'Error retrieving saved card', 'error');
    }
  };

  const handleDeleteCard = (card: StaffIdCardItem) => {
    if (!card.id) return;
    onShowConfirm(
      'Delete Card Configuration',
      `Are you sure you want to delete the saved ID card for ${card.card_full_name} (${card.staff_id})? Original staff roster data will NOT be modified.`,
      async () => {
        try {
          await staffIdCardApi.deleteCard(card.id!);
          onAddToast('Card Deleted', `Configuration for ${card.card_full_name} deleted`, 'info');
          if (currentSavedCardId === card.id) {
            setCurrentSavedCardId(null);
          }
          fetchSavedCards();
        } catch (e: any) {
          onAddToast('Delete Failed', e.message || 'Error deleting card configuration', 'error');
        }
      },
      { intent: 'danger', confirmText: 'Delete Card' }
    );
  };

  // Toggle Visibility Helper
  const toggleVisibility = (key: keyof StaffCardFieldVisibility) => {
    setVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP HEADER & ACTION BAR                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-2">
            <IdCard className="w-3.5 h-3.5" />
            <span>OFFICIAL STAFF IDENTITY STUDIO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Staff ID Card Generator
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Generate and export print-ready, high-resolution employee identity cards with genuine Zenemoo branding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSavedCardsDrawer(!showSavedCardsDrawer)}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Saved Cards ({savedCards.length})</span>
          </button>

          <button
            onClick={handleSaveCardConfiguration}
            disabled={isSavingCard}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isSavingCard ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN TWO-COLUMN LAYOUT                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: CONTROLS & FORM EDITOR (~45% on desktop)        */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6">
          {/* Mode Selector Toggle */}
          <div className="glass-panel p-1.5 rounded-2xl border border-white/10 flex bg-black/40 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                setMode('fetched');
                setLookupError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'fetched'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Mode B: Fetch from Roster</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('manual');
                setLookupError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'manual'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>Mode A: Manual Entry</span>
            </button>
          </div>

          {/* Mode B: Search / Fetch Panel */}
          {mode === 'fetched' && (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> Search Staff Record
                </span>
                <span className="text-[10px] font-mono text-slate-400">Exact indexed lookup</span>
              </div>

              <form onSubmit={handleLookupStaff} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="Enter Staff ID (e.g. ZNM-6E1F0) or Name..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  {lookupQuery && (
                    <button
                      type="button"
                      onClick={() => setLookupQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{isSearching ? 'Fetching...' : 'Lookup'}</span>
                </button>
              </form>

              {/* Status / Error Displays */}
              {lookupError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{lookupError}</span>
                </div>
              )}

              {/* Ambiguous candidates list */}
              {multipleCandidates.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="text-[11px] font-mono text-cyan-300 font-bold">
                    Multiple Staff Found ({multipleCandidates.length}). Select one:
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {multipleCandidates.map((c) => {
                      const cId = c.employee_id || `ZNM-${(c.id || '').substring(0, 5).toUpperCase()}`;
                      return (
                        <div
                          key={c.id}
                          onClick={() => populateFromRecord(c)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {cId} • {c.designation || 'Specialist'}
                            </div>
                          </div>
                          <button className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black text-[10px] font-bold font-mono">
                            Select
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Verified member indicator */}
              {verifiedMember && mode === 'fetched' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Verified Roster Profile: <strong>{verifiedMember.name}</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-400">ID: {staffId}</span>
                </div>
              )}
            </div>
          )}

          {/* Form Fields & Overrides Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" /> Card Identity Details
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {mode === 'fetched' ? 'Changes apply to card only (profile untouched)' : 'Manual Entry Mode'}
              </span>
            </div>

            {/* Staff ID Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" /> Staff / Employee ID
                  {mode === 'fetched' && (
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" /> Locked from Roster
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Print on Card</span>
                  <input
                    type="checkbox"
                    checked={visibility.staff_id}
                    onChange={() => toggleVisibility('staff_id')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
              <input
                type="text"
                value={staffId}
                readOnly={mode === 'fetched'}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="ZNM-2024-001"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-colors ${
                  mode === 'fetched'
                    ? 'bg-white/[0.03] border-white/10 text-cyan-300 cursor-not-allowed'
                    : 'bg-black/60 border-white/10 text-white focus:border-cyan-400'
                }`}
              />
            </div>

            {/* Full Name Field (Mandatory) */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Prem Prasad Pradhan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* Designation Field & Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Designation / Role
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Print on Card</span>
                  <input
                    type="checkbox"
                    checked={visibility.designation}
                    onChange={() => toggleVisibility('designation')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior AI Annotator"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* Department Field & Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400" /> Department / Team
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Print on Card</span>
                  <input
                    type="checkbox"
                    checked={visibility.department}
                    onChange={() => toggleVisibility('department')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Data Solutions Division"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email
                  </label>
                  <input
                    type="checkbox"
                    checked={visibility.email}
                    onChange={() => toggleVisibility('email')}
                    className="accent-cyan-400 cursor-pointer"
                    title="Include Email on card"
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@zenemoo.in"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Phone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Contact Phone
                  </label>
                  <input
                    type="checkbox"
                    checked={visibility.phone}
                    onChange={() => toggleVisibility('phone')}
                    className="accent-cyan-400 cursor-pointer"
                    title="Include Phone on card"
                  />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98277 75230"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Joining Year */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> Joining Year
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Print on Card</span>
                  <input
                    type="checkbox"
                    checked={visibility.joining_year}
                    onChange={() => toggleVisibility('joining_year')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
              <input
                type="text"
                value={joiningYear}
                onChange={(e) => setJoiningYear(e.target.value)}
                placeholder="Est. 2023"
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Photo Management Section */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <label className="block text-xs font-mono text-slate-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" /> Employee Portrait
              </label>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-cyan-400/40 p-0.5 bg-black shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Thumbnail" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-mono text-white truncate">
                    {photoIsOwned ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Card-Specific Cloudinary Photo
                      </span>
                    ) : (
                      <span className="text-slate-400">Source Profile Photo</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{photoUrl || 'Default Avatar'}</div>
                </div>

                {/* Change Image Trigger */}
                <label className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0">
                  <Crop className="w-3.5 h-3.5" />
                  <span>Change Image</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
            </div>

            {/* QR Destination Preview */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" /> Canonical Public Profile QR Destination
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Print QR</span>
                  <input
                    type="checkbox"
                    checked={visibility.qr_code}
                    onChange={() => toggleVisibility('qr_code')}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={canonicalProfileUrl}
                  readOnly={mode === 'fetched'}
                  onChange={(e) => setCanonicalProfileUrl(e.target.value)}
                  placeholder="https://www.zenemoo.in/team/..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border transition-colors ${
                    mode === 'fetched'
                      ? 'bg-white/[0.03] border-white/10 text-cyan-300 cursor-not-allowed'
                      : 'bg-black/60 border-white/10 text-white focus:border-cyan-400'
                  }`}
                />
                {canonicalProfileUrl && (
                  <a
                    href={canonicalProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all shrink-0"
                    title="Open public profile in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: LIVE CARD PREVIEW & EXPORT STUDIO (~55%)       */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6 flex flex-col items-center">
          {/* Studio Bar Controls (Zoom, Resolution, Print) */}
          <div className="w-full glass-panel p-3.5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/40 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Zoom:</span>
              <button
                onClick={() => setPreviewZoom((z) => Math.max(70, z - 10))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-cyan-300 w-10 text-center">{previewZoom}%</span>
              <button
                onClick={() => setPreviewZoom((z) => Math.min(130, z + 10))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Quality:</span>
              <select
                value={exportResolution}
                onChange={(e) => setExportResolution(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300 text-xs font-mono focus:outline-none"
              >
                <option value="300" className="bg-[#0A192F] text-white">300 DPI (Standard)</option>
                <option value="600" className="bg-[#0A192F] text-white">600 DPI (Ultra HD)</option>
              </select>
            </div>
          </div>

          {/* Interactive Live Card Canvas Display Container */}
          <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0B0F19] to-[#04060A] border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden w-full min-h-[720px]">
            {/* Ambient Lighting Glow Behind Card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Print-Ready Canvas Target with Dynamic Zoom */}
            <div
              style={{
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease',
              }}
              className="relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] rounded-[20px] overflow-hidden border border-white/15"
            >
              <canvas
                ref={previewCanvasRef}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
                className="block rounded-[20px]"
                style={{ width: `${PREVIEW_WIDTH}px`, height: `${PREVIEW_HEIGHT}px` }}
              />
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleExport('png')}
              disabled={isExporting}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download PNG (Lossless)</span>
            </button>

            <button
              onClick={() => handleExport('jpg')}
              disabled={isExporting}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold font-mono text-xs border border-white/15 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download JPG (Solid White)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SAVED CARDS MANAGEMENT DRAWER (SECTION J)                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showSavedCardsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-[#0A0D16] border-l border-white/10 h-full flex flex-col p-6 space-y-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Saved ID Cards ({savedCards.length})</h2>
              </div>
              <button
                onClick={() => setShowSavedCardsDrawer(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={savedCardsSearch}
                onChange={(e) => setSavedCardsSearch(e.target.value)}
                placeholder="Search saved cards by name or ID..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Saved Cards List */}
            {isLoadingSavedCards ? (
              <div className="p-8 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading saved configurations...
              </div>
            ) : savedCards.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No saved staff ID card configurations found. Click "Save Configuration" on any card to save it.
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto">
                {savedCards
                  .filter((c) =>
                    !savedCardsSearch ||
                    c.card_full_name.toLowerCase().includes(savedCardsSearch.toLowerCase()) ||
                    c.staff_id.toLowerCase().includes(savedCardsSearch.toLowerCase())
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-cyan-400/30 bg-black shrink-0">
                            {c.card_photo_url ? (
                              <img src={c.card_photo_url} alt="Staff" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs">
                                ?
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{c.card_full_name}</div>
                            <div className="text-[11px] font-mono text-cyan-300">
                              {c.staff_id} • {c.card_designation || 'Specialist'}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-mono">
                          {c.mode === 'fetched' ? 'Roster' : 'Manual'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono">
                        <span className="text-slate-500">
                          {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'Recent'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadSavedCard(c)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCard(c)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                            title="Delete card configuration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE CROP MODAL (SECTION C)                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isCropModalOpen && rawImageSource && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090C15] border border-white/15 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Crop className="w-5 h-5 text-cyan-400" />
                <span>Crop Employee Portrait</span>
              </div>
              <button
                onClick={() => {
                  setIsCropModalOpen(false);
                  setRawImageSource(null);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Crop Viewport */}
            <div
              className="relative w-full aspect-square max-w-[400px] mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center cursor-move select-none"
              onMouseDown={(e) => {
                setIsDraggingCrop(true);
                setDragStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
              }}
              onMouseMove={(e) => {
                if (!isDraggingCrop) return;
                setCropPan({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y,
                });
              }}
              onMouseUp={() => setIsDraggingCrop(false)}
              onMouseLeave={() => setIsDraggingCrop(false)}
            >
              <canvas ref={cropCanvasRef} className="block w-full h-full" />
              <div className="absolute bottom-3 left-3 text-[10px] font-mono text-cyan-300 bg-black/70 px-2 py-1 rounded backdrop-blur-md pointer-events-none flex items-center gap-1">
                <Move className="w-3 h-3" /> Drag image to center face inside the circle
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-cyan-400" /> Zoom Scale
                </span>
                <span>{Math.round(cropZoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  setIsCropModalOpen(false);
                  setRawImageSource(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCropAndUpload}
                disabled={isUploadingPhoto}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold font-mono text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isUploadingPhoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isUploadingPhoto ? 'Uploading to Cloudinary...' : 'Confirm & Upload to Cloudinary'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
