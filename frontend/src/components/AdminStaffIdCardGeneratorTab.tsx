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

// Final Canva Master Background Template: 3200 x 4800 (Aspect ratio: 2 : 3 = 0.6667)
const MASTER_WIDTH = 3200;
const MASTER_HEIGHT = 4800;
const PREVIEW_WIDTH = 420;
const PREVIEW_HEIGHT = 630; // 420 * 1.5 = 630 (exact 2:3 aspect ratio matching Canva template)
const EXPORT_WIDTH = 1600; // 300+ DPI (1600 x 2400)
const EXPORT_HEIGHT = 2400;
const EXPORT_WIDTH_UHD = 3200; // 600 DPI (3200 x 4800 full master Canva resolution)
const EXPORT_HEIGHT_UHD = 4800;
const BACKGROUND_ASSET_SRC = '/assets/Zenemoo ID card Background.png';
const GENUINE_ZENEMOO_LOGO_SRC = '/assets/logo.png';
const GENUINE_ZENEMOO_LOGO_REMOTE = 'https://www.zenemoo.in/assets/logo.png';

export const AdminStaffIdCardGeneratorTab: React.FC<AdminStaffIdCardGeneratorTabProps> = ({
  onAddToast,
  onShowConfirm,
}) => {

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
  const cachedBgImage = useRef<HTMLImageElement | null>(null);
  const cachedLogoImage = useRef<HTMLImageElement | null>(null);
  const cachedPhotoImage = useRef<HTMLImageElement | null>(null);
  const cachedQrCanvas = useRef<HTMLCanvasElement | null>(null);

  // Preload Final Canva Master Background Template
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = BACKGROUND_ASSET_SRC;
    img.onload = () => {
      cachedBgImage.current = img;
      renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    };
    img.onerror = () => {
      console.warn('[Staff ID Generator] Background template failed to load:', BACKGROUND_ASSET_SRC);
    };
  }, []);

  // Preload Genuine Zenemoo Brand Logo for QR code center with CORS support
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = GENUINE_ZENEMOO_LOGO_SRC;
    img.onload = () => {
      cachedLogoImage.current = img;
      renderCardToCanvas(previewCanvasRef.current, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    };
    img.onerror = () => {
      console.warn('[Staff ID Generator] Local logo failed, falling back to remote asset:', GENUINE_ZENEMOO_LOGO_REMOTE);
      img.src = GENUINE_ZENEMOO_LOGO_REMOTE;
    };
  }, []);

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
  type FieldIconType = 'id_card' | 'mail' | 'phone' | 'calendar';

  const drawStaffFieldIcon = (
    ctx: CanvasRenderingContext2D,
    iconType: FieldIconType,
    cx: number,
    cy: number,
    size: number,
    color: string,
    lineWidth: number
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    const s = size / 24;
    ctx.scale(s, s);
    ctx.translate(-12, -12); // Center 24x24 viewBox around (0,0)

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth / s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (iconType === 'id_card') {
      // Lucide IdCard: Outer card, portrait head, shoulders, info lines
      ctx.beginPath();
      ctx.roundRect(2, 5, 20, 14, 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(9, 11, 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(9, 16.5, 3.2, Math.PI, 0, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(15, 10); ctx.lineTo(18.5, 10);
      ctx.moveTo(15, 13.5); ctx.lineTo(18.5, 13.5);
      ctx.stroke();
    } else if (iconType === 'mail') {
      // Lucide Mail: Envelope body and flap
      ctx.beginPath();
      ctx.roundRect(2, 4.5, 20, 15, 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(2, 6.5);
      ctx.lineTo(11.1, 12.6);
      ctx.quadraticCurveTo(12, 13.2, 12.9, 12.6);
      ctx.lineTo(22, 6.5);
      ctx.stroke();
    } else if (iconType === 'phone') {
      // Lucide Phone: Telephone receiver
      const phonePath = new Path2D(
        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      );
      ctx.stroke(phonePath);
    } else if (iconType === 'calendar') {
      // Lucide Calendar: Body, binder pins, header line, checkmark
      ctx.beginPath();
      ctx.roundRect(3, 4, 18, 17, 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(8, 2); ctx.lineTo(8, 6);
      ctx.moveTo(16, 2); ctx.lineTo(16, 6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(3, 9.5); ctx.lineTo(21, 9.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(9, 14.5);
      ctx.lineTo(11, 16.5);
      ctx.lineTo(15, 12.5);
      ctx.stroke();
    }

    ctx.restore();
  };

  const renderCardToCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, targetW: number, targetH: number) => {
      if (!canvas) return;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Master Canvas Coordinate System: 3200 x 4800 (Aspect ratio: 2 : 3)
      const scale = targetW / 3200;

      // 1. Crisp Solid White Backing (guarantees solid background for JPG exports)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Render Canva Master Background Template (contains top logo, waves, Z watermark, bottom accent, tagline)
      if (cachedBgImage.current && cachedBgImage.current.complete && cachedBgImage.current.naturalWidth > 0) {
        ctx.drawImage(cachedBgImage.current, 0, 0, targetW, targetH);
      }

      // 3. Circular Employee Portrait (Precisely fitted inside circular portrait frame)
      // Master Coordinates: Center (1730, 1918), Inner Frame Radius: 742 px
      const photoCenterX = 1730 * scale;
      const photoCenterY = 1918 * scale;
      const photoRadius = 742 * scale;

      ctx.save();
      ctx.beginPath();
      ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
      ctx.clip();

      if (cachedPhotoImage.current && cachedPhotoImage.current.complete && cachedPhotoImage.current.naturalWidth > 0) {
        // Draw image using object-fit: cover
        const img = cachedPhotoImage.current;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const diam = photoRadius * 2;
        let drawW = diam;
        let drawH = diam;
        let drawX = photoCenterX - photoRadius;
        let drawY = photoCenterY - photoRadius;

        if (imgAspect > 1) {
          drawH = diam;
          drawW = diam * imgAspect;
          drawX = photoCenterX - drawW / 2;
          drawY = photoCenterY - photoRadius;
        } else {
          drawW = diam;
          drawH = diam / imgAspect;
          drawX = photoCenterX - photoRadius;
          drawY = photoCenterY - drawH / 2;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        // Elegant fallback avatar placeholder
        ctx.fillStyle = '#EDE9FE';
        ctx.fillRect(photoCenterX - photoRadius, photoCenterY - photoRadius, photoRadius * 2, photoRadius * 2);
        ctx.fillStyle = '#4F46E5';
        ctx.font = `700 ${Math.round(420 * scale)}px 'Space Grotesk', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((fullName.charAt(0) || 'Z').toUpperCase(), photoCenterX, photoCenterY);
      }
      ctx.restore();

      // 4. Preserve Embedded Small "Z." Badge on Portrait Rim
      // Master Coordinates: Center (2243, 2456), Radius: 205 px
      // Re-drawing this region from cachedBgImage restores the genuine badge and stars in front of the employee photo cleanly
      if (cachedBgImage.current && cachedBgImage.current.complete && cachedBgImage.current.naturalWidth > 0) {
        const badgeCenterX = 2243 * scale;
        const badgeCenterY = 2456 * scale;
        const badgeRadius = 205 * scale;

        ctx.save();
        ctx.beginPath();
        ctx.arc(badgeCenterX, badgeCenterY, badgeRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(cachedBgImage.current, 0, 0, targetW, targetH);
        ctx.restore();
      }

      // 5. Employee Name & Designation (Centered below portrait frame)
      let currentY = 2890 * scale;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Measured font scaling for long names
      const maxNameW = targetW * 0.82;
      let nameFontSize = Math.round(130 * scale);
      ctx.font = `800 ${nameFontSize}px 'Space Grotesk', system-ui, sans-serif`;
      let nameMetrics = ctx.measureText(fullName);
      if (nameMetrics.width > maxNameW) {
        nameFontSize = Math.max(Math.round(80 * scale), Math.floor(nameFontSize * (maxNameW / nameMetrics.width)));
        ctx.font = `800 ${nameFontSize}px 'Space Grotesk', system-ui, sans-serif`;
      }

      ctx.fillStyle = '#0F172A';
      ctx.fillText(fullName, photoCenterX, currentY);

      // Designation
      if (visibility.designation && designation.trim()) {
        currentY += 120 * scale;
        let desigFontSize = Math.round(64 * scale);
        ctx.font = `700 ${desigFontSize}px 'Space Grotesk', system-ui, sans-serif`;
        const maxDesigW = targetW * 0.80;
        let desigMetrics = ctx.measureText(designation.toUpperCase());
        if (desigMetrics.width > maxDesigW) {
          desigFontSize = Math.max(Math.round(44 * scale), Math.floor(desigFontSize * (maxDesigW / desigMetrics.width)));
          ctx.font = `700 ${desigFontSize}px 'Space Grotesk', system-ui, sans-serif`;
        }
        ctx.fillStyle = '#0284C7';
        ctx.fillText(designation.toUpperCase(), photoCenterX, currentY);
      }

      // Department Pill Badge
      if (visibility.department && department.trim()) {
        currentY += 115 * scale;
        const deptFontSize = Math.round(48 * scale);
        ctx.font = `700 ${deptFontSize}px 'Inter', system-ui, sans-serif`;
        const depText = department.toUpperCase();
        const depMetrics = ctx.measureText(depText);
        const pillPadX = 36 * scale;
        const pillH = 76 * scale;
        const pillW = depMetrics.width + pillPadX * 2;
        const pillX = photoCenterX - pillW / 2;
        const pillY = currentY - pillH / 2 - 4 * scale;

        ctx.fillStyle = 'rgba(240, 249, 255, 0.95)';
        ctx.strokeStyle = '#BAE6FD';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0369A1';
        ctx.textBaseline = 'middle';
        ctx.fillText(depText, photoCenterX, pillY + pillH / 2);
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();

      // 6. Dynamic Lower Section: Info Stack on Left, QR Code on Right
      // Both positioned safely above the blue horizontal accent at Y = 4250 * scale!

      // Gather active info fields to avoid awkward gaps when switches are toggled
      const activeInfoItems: { iconType: FieldIconType; label: string; value: string }[] = [];
      if (visibility.staff_id && staffId.trim()) {
        activeInfoItems.push({ iconType: 'id_card', label: 'STAFF ID', value: staffId });
      }
      if (visibility.email && email.trim()) {
        activeInfoItems.push({ iconType: 'mail', label: 'EMAIL', value: email });
      }
      if (visibility.phone && phone.trim()) {
        activeInfoItems.push({ iconType: 'phone', label: 'PHONE', value: phone });
      }
      if (visibility.joining_year && joiningYear.trim()) {
        activeInfoItems.push({ iconType: 'calendar', label: 'JOINED', value: joiningYear });
      }

      // Vertical bounding range for info area (stays well above Y = 4250 blue horizontal accent)
      const infoSectionTop = (visibility.department && department.trim() ? 3300 : 3200) * scale;
      const infoSectionBottom = 4140 * scale;
      const availableHeight = infoSectionBottom - infoSectionTop;

      const itemCount = activeInfoItems.length;
      if (itemCount > 0) {
        // Improved row spacing and vertical centering
        const rowStep = Math.min(240 * scale, availableHeight / Math.max(1, itemCount));
        const totalStackHeight = (itemCount - 1) * rowStep;
        let startStackY = infoSectionTop + (availableHeight - totalStackHeight) / 2;

        ctx.save();
        const stackX = 270 * scale;
        // Balanced icon circle radius: 68px (diameter 136px)
        const iconR = 68 * scale;
        const iconSize = 72 * scale;
        const iconStroke = Math.max(2, 6.5 * scale);
        // Available width for text before QR plate margin
        const maxFieldValW = 1660 * scale;
        // Field value increased ~27% (74px -> 94px), semibold
        const baseValFontSize = Math.round(94 * scale);
        // Field label increased ~18% (46px -> 54px), bold uppercase
        const labelFontSize = Math.round(54 * scale);

        activeInfoItems.forEach((item, idx) => {
          const ry = startStackY + idx * rowStep;

          // Icon Circle Plate (Light blue container with cyan stroke)
          ctx.fillStyle = '#F0F9FF';
          ctx.strokeStyle = '#BAE6FD';
          ctx.lineWidth = 3.5 * scale;
          ctx.beginPath();
          ctx.arc(stackX, ry, iconR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw Genuine Professional Vector Icon (Zenemoo blue #0284C7)
          drawStaffFieldIcon(ctx, item.iconType, stackX, ry, iconSize, '#0284C7', iconStroke);

          // Sublabel (Larger, crisp uppercase slate #64748B)
          const tx = stackX + iconR + 42 * scale;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#64748B';
          ctx.font = `700 ${labelFontSize}px 'Inter', sans-serif`;
          ctx.fillText(item.label, tx, ry - 22 * scale);

          // Value (Prominent, clean sans-serif with medium-to-semibold 600 weight, deep navy #0A192F)
          let valFontSize = baseValFontSize;
          ctx.font = `600 ${valFontSize}px 'Space Grotesk', 'Inter', system-ui, sans-serif`;
          let valMetrics = ctx.measureText(item.value);
          if (valMetrics.width > maxFieldValW) {
            valFontSize = Math.max(Math.round(44 * scale), Math.floor(baseValFontSize * (maxFieldValW / valMetrics.width)));
            ctx.font = `600 ${valFontSize}px 'Space Grotesk', 'Inter', system-ui, sans-serif`;
          }
          ctx.fillStyle = '#0A192F';
          ctx.fillText(item.value, tx, ry + 54 * scale);
        });
        ctx.restore();
      }

      // 7. QR Code Placement (Lower Right, strictly above blue bar at 4250)
      if (visibility.qr_code && cachedQrCanvas.current) {
        const qrSize = 760 * scale;
        const qrX = 2160 * scale;
        const qrY = 3260 * scale;

        // White Card Plate for QR with soft drop shadow
        const platePad = 35 * scale;
        const plateX1 = qrX - platePad;
        const plateY1 = qrY - platePad;
        const plateW = qrSize + platePad * 2;
        const plateH = qrSize + platePad * 2;
        const plateRadius = 35 * scale;

        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
        ctx.shadowBlur = 24 * scale;
        ctx.shadowOffsetY = 8 * scale;
        ctx.beginPath();
        ctx.roundRect(plateX1, plateY1, plateW, plateH, plateRadius);
        ctx.fill();
        ctx.restore();

        // Draw QR Matrix
        ctx.drawImage(cachedQrCanvas.current, qrX, qrY, qrSize, qrSize);

        // Overlay Genuine Zenemoo Brand Logo in Center of QR with solid white circular backing
        if (cachedLogoImage.current && cachedLogoImage.current.complete) {
          const centerBadgeSize = 180 * scale;
          const centerBadgeX = qrX + (qrSize - centerBadgeSize) / 2;
          const centerBadgeY = qrY + (qrSize - centerBadgeSize) / 2;

          ctx.save();
          // Solid white circular backing behind genuine logo
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(
            centerBadgeX + centerBadgeSize / 2,
            centerBadgeY + centerBadgeSize / 2,
            centerBadgeSize / 2 + 18 * scale,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Clipped Genuine Zenemoo Logo
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

        // 3. Polished "SCAN TO VERIFY" Caption (Centered directly beneath QR, balanced spacing)
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1E293B'; // Deep slate navy for crisp print legibility
        ctx.font = `800 ${Math.round(54 * scale)}px 'Space Grotesk', system-ui, sans-serif`;
        // Positioned at Y = 4135 * scale: provides 80px clearance from QR plate and 115px clearance from bottom blue bar
        ctx.fillText('SCAN TO VERIFY', qrX + qrSize / 2, 4135 * scale);
        ctx.restore();
      }
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
      // 1. Ensure genuine Zenemoo brand logo is loaded before export begins
      if (!cachedLogoImage.current || !cachedLogoImage.current.complete || cachedLogoImage.current.naturalWidth === 0) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = GENUINE_ZENEMOO_LOGO_SRC;
          img.onload = () => {
            cachedLogoImage.current = img;
            resolve();
          };
          img.onerror = () => {
            const remoteImg = new Image();
            remoteImg.crossOrigin = 'anonymous';
            remoteImg.src = GENUINE_ZENEMOO_LOGO_REMOTE;
            remoteImg.onload = () => {
              cachedLogoImage.current = remoteImg;
              resolve();
            };
            remoteImg.onerror = () => {
              reject(new Error('Genuine Zenemoo brand logo failed to load. Export aborted to prevent missing logo.'));
            };
          };
        });
      }

      // 2. Ensure Canva background template is loaded before export begins
      if (!cachedBgImage.current || !cachedBgImage.current.complete || cachedBgImage.current.naturalWidth === 0) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = BACKGROUND_ASSET_SRC;
          img.onload = () => {
            cachedBgImage.current = img;
            resolve();
          };
          img.onerror = () => {
            reject(new Error('Canva background template failed to load. Export aborted.'));
          };
        });
      }

      // 3. Ensure QR code canvas is rendered before export
      if (visibility.qr_code && (!cachedQrCanvas.current || cachedQrCanvas.current.width === 0) && canonicalProfileUrl) {
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, canonicalProfileUrl, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark: '#0A192F', light: '#FFFFFF' },
        });
        cachedQrCanvas.current = qrCanvas;
      }

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
