import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  BookOpen,
  X,
  Layers,
} from 'lucide-react';
import { portfolioApi, CompanyPortfolioItem } from '../services/api';
import { SeoImage } from '../seo/components/SeoImage';
import { useActiveLogo } from '../lib/useActiveLogo';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// ----------------------------------------------------------------------
// Dedicated High-Performance Page Canvas Component
// Guarantees zero concurrent canvas render collisions & prevents white screens
// ----------------------------------------------------------------------
interface PdfPageItemProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  totalPages: number;
  naturalAspectRatio: string;
  naturalWidth: number;
  onIntersect: (pageNum: number) => void;
  registerRef: (pageNum: number, el: HTMLDivElement | null) => void;
}

const PdfPageItem: React.FC<PdfPageItemProps> = React.memo(
  ({
    pdfDoc,
    pageNum,
    scale,
    totalPages,
    naturalAspectRatio,
    naturalWidth,
    onIntersect,
    registerRef,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const renderTaskRef = useRef<any>(null);
    const [isRendered, setIsRendered] = useState<boolean>(false);
    const [isInView, setIsInView] = useState<boolean>(pageNum <= 3); // Preload first 3 pages immediately

    // Viewport Intersection Observer
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      registerRef(pageNum, el);

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting) {
            setIsInView(true);
            onIntersect(pageNum);
          }
        },
        {
          rootMargin: '900px 0px 900px 0px', // Buffer ahead before user scrolls into page
          threshold: [0.1, 0.4],
        }
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
        registerRef(pageNum, null);
      };
    }, [pageNum, onIntersect, registerRef]);

    // Canvas render with clean await & cancellation management
    useEffect(() => {
      if (!isInView || !pdfDoc || !canvasRef.current) return;

      let isCancelled = false;

      const performRender = async () => {
        // Cancel and safely await previous in-flight render on this canvas
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
            await renderTaskRef.current.promise;
          } catch (_) {
            // Expected RenderingCancelledException
          }
          renderTaskRef.current = null;
        }

        if (isCancelled) return;

        try {
          const page = await pdfDoc.getPage(pageNum);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale });
          const canvas = canvasRef.current;
          if (!canvas) return;

          const context = canvas.getContext('2d', { alpha: false });
          if (!context) return;

          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';

          const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

          const renderTask = page.render({
            canvasContext: context,
            transform: transform,
            viewport: viewport,
          });

          renderTaskRef.current = renderTask;
          await renderTask.promise;
          renderTaskRef.current = null;

          if (!isCancelled) {
            setIsRendered(true);
          }
        } catch (err: any) {
          if (err?.name !== 'RenderingCancelledException') {
            console.warn(`Page ${pageNum} render notice:`, err?.message || err);
          }
        }
      };

      performRender();

      return () => {
        isCancelled = true;
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (_) {}
        }
      };
    }, [isInView, pdfDoc, pageNum, scale]);

    const targetWidth = naturalWidth ? Math.floor(naturalWidth * scale) : undefined;

    return (
      <div
        ref={(el) => {
          containerRef.current = el;
          registerRef(pageNum, el);
        }}
        data-page-number={pageNum}
        className="relative group rounded-lg sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl shadow-cyan-950/30 border border-white/10 bg-slate-900 transition-all flex items-center justify-center shrink-0"
        style={{
          width: targetWidth ? `${targetWidth}px` : '100%',
          maxWidth: '100%',
          aspectRatio: naturalAspectRatio,
        }}
      >
        {/* Floating Page Number Pill */}
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 px-1.5 sm:px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[9px] sm:text-[10px] font-mono text-cyan-300 opacity-60 group-hover:opacity-100 transition-opacity select-none">
          {pageNum}/{totalPages}
        </div>

        {/* Crisp Document Canvas */}
        <canvas
          ref={canvasRef}
          className="block bg-white transition-opacity duration-200"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />

        {/* Loading placeholder shown only before first render */}
        {!isRendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-0">
            <RefreshCw className="w-5 h-5 text-cyan-400/70 animate-spin mb-2" />
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">Loading page {pageNum}...</span>
          </div>
        )}
      </div>
    );
  }
);

// ----------------------------------------------------------------------
// Dedicated Landscape Widescreen Thumbnail Item Component
// ----------------------------------------------------------------------
interface PdfThumbnailItemProps {
  pdfDoc: any;
  pageNum: number;
  isCurrent: boolean;
  naturalAspectRatio: string;
  onClick: () => void;
  registerRef: (pageNum: number, el: HTMLDivElement | null) => void;
}

const PdfThumbnailItem: React.FC<PdfThumbnailItemProps> = React.memo(
  ({
    pdfDoc,
    pageNum,
    isCurrent,
    naturalAspectRatio,
    onClick,
    registerRef,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const renderTaskRef = useRef<any>(null);
    const [isRendered, setIsRendered] = useState<boolean>(false);
    const [isInView, setIsInView] = useState<boolean>(pageNum <= 5);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      registerRef(pageNum, el);

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0] && entries[0].isIntersecting) {
            setIsInView(true);
          }
        },
        { rootMargin: '500px 0px 500px 0px', threshold: 0.1 }
      );

      observer.observe(el);
      return () => {
        observer.disconnect();
        registerRef(pageNum, null);
      };
    }, [pageNum, registerRef]);

    useEffect(() => {
      if (!isInView || !pdfDoc || !canvasRef.current) return;

      let isCancelled = false;

      const renderThumb = async () => {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
            await renderTaskRef.current.promise;
          } catch (_) {}
          renderTaskRef.current = null;
        }

        if (isCancelled) return;

        try {
          const page = await pdfDoc.getPage(pageNum);
          if (isCancelled) return;

          const baseViewport = page.getViewport({ scale: 1.0 });
          const thumbScale = Math.min(0.25, 240 / (baseViewport.width || 1000));
          const viewport = page.getViewport({ scale: thumbScale });
          const canvas = canvasRef.current;
          if (!canvas) return;

          const context = canvas.getContext('2d', { alpha: false });
          if (!context) return;

          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = '100%';
          canvas.style.height = '100%';

          const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

          const renderTask = page.render({
            canvasContext: context,
            transform: transform,
            viewport: viewport,
          });

          renderTaskRef.current = renderTask;
          await renderTask.promise;
          renderTaskRef.current = null;

          if (!isCancelled) {
            setIsRendered(true);
          }
        } catch (err: any) {
          if (err?.name !== 'RenderingCancelledException') {
            console.warn(`Thumbnail ${pageNum} notice:`, err?.message || err);
          }
        }
      };

      renderThumb();

      return () => {
        isCancelled = true;
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (_) {}
        }
      };
    }, [isInView, pdfDoc, pageNum]);

    return (
      <div
        ref={(el) => {
          containerRef.current = el;
          registerRef(pageNum, el);
        }}
        data-thumb-page={pageNum}
        onClick={onClick}
        className={`group relative rounded-xl p-2 border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
          isCurrent
            ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
            : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/20'
        }`}
      >
        {/* Horizontal Landscape 16:9 Thumbnail Box */}
        <div
          className="w-full bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-white/10 relative shadow-sm"
          style={{
            aspectRatio: naturalAspectRatio,
          }}
        >
          <canvas
            ref={canvasRef}
            className="block w-full h-full object-contain bg-white transition-opacity"
          />
          {!isRendered && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
              <span className="text-[9px] font-mono text-slate-500">{pageNum}</span>
            </div>
          )}
        </div>
        <span
          className={`text-[11px] font-mono font-bold transition-colors ${
            isCurrent ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
          }`}
        >
          Page {pageNum}
        </span>
      </div>
    );
  }
);

// ----------------------------------------------------------------------
// Main Zenemoo Company Portfolio Page
// ----------------------------------------------------------------------
export const ZenemooCompanyPortfolioPage: React.FC = () => {
  const { logoUrl } = useActiveLogo();
  const [portfolio, setPortfolio] = useState<CompanyPortfolioItem | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // PDF.js Engine State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isFitWidth, setIsFitWidth] = useState<boolean>(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);

  // UI State
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isReadingMode, setIsReadingMode] = useState<boolean>(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});
  const thumbnailRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});
  const lastScrollTopRef = useRef<number>(0);
  const naturalPageWidthRef = useRef<number>(1920); // Default widescreen 16:9
  const naturalPageHeightRef = useRef<number>(1080);

  // Fetch Portfolio Metadata
  const fetchMetadata = useCallback(async () => {
    setIsLoadingMetadata(true);
    setError('');
    try {
      const res = await portfolioApi.getPublicPortfolio();
      if (res.data && res.data.success && res.data.data) {
        setPortfolio(res.data.data);
      } else if (res.data && res.data.data) {
        setPortfolio(res.data.data);
      } else {
        setPortfolio(null);
      }
    } catch (err: any) {
      console.warn('Portfolio metadata fetch notice:', err?.message);
      setError('Unable to load company portfolio metadata.');
    } finally {
      setIsLoadingMetadata(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Load PDF.js engine from CDN on demand
  const loadPdfJsScript = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js failed to initialize.'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js engine from CDN.'));
      document.body.appendChild(script);
    });
  };

  // Accurate Fit-to-Width Scale Calculator
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current || !naturalPageWidthRef.current) return 1.0;

    const isMobile = window.innerWidth < 768;
    const containerWidth = containerRef.current.clientWidth;
    const horizontalPadding = isMobile ? 16 : 48;
    const availableWidth = Math.max(180, containerWidth - horizontalPadding);

    const fit = +(availableWidth / naturalPageWidthRef.current).toFixed(3);
    return Math.max(0.15, Math.min(3.0, fit));
  }, []);

  // Load PDF document when portfolio metadata is ready
  useEffect(() => {
    if (!portfolio?.public_url) return;

    let isMounted = true;
    setIsLoadingPdf(true);
    setError('');

    loadPdfJsScript()
      .then((pdfjs) => {
        const loadingTask = pdfjs.getDocument({
          url: portfolio.public_url,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          disableRange: false, // HTTP Range 206 stream support
          disableStream: false,
          disableAutoFetch: false,
        });

        return loadingTask.promise;
      })
      .then(async (pdf) => {
        if (!isMounted) return;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        // Extract native dimensions from page 1
        try {
          const page1 = await pdf.getPage(1);
          const naturalViewport = page1.getViewport({ scale: 1.0 });
          naturalPageWidthRef.current = naturalViewport.width || 1920;
          naturalPageHeightRef.current = naturalViewport.height || 1080;

          // Compute fit scale
          const initialFit = calculateFitScale();
          setScale(initialFit);
          setIsFitWidth(true);
        } catch (vpErr) {
          console.warn('Page viewport extraction notice:', vpErr);
        }

        setIsLoadingPdf(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('PDF document load error:', err);
        setError('Failed to load PDF document. Please try direct open.');
        setIsLoadingPdf(false);
      });

    return () => {
      isMounted = false;
    };
  }, [portfolio?.public_url, calculateFitScale]);

  // Auto-scroll active thumbnail into view when page changes
  useEffect(() => {
    if (currentPage && thumbnailRefs.current[currentPage] && showThumbnails) {
      thumbnailRefs.current[currentPage]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage, showThumbnails]);

  // Responsive resize listener
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setShowThumbnails(true);
      } else {
        setShowThumbnails(false);
      }

      if (isFitWidth && naturalPageWidthRef.current) {
        const nextFit = calculateFitScale();
        setScale(nextFit);
      }
    };

    window.addEventListener('resize', handleResize);
    if (window.innerWidth >= 1024) {
      setShowThumbnails(true);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [isFitWidth, calculateFitScale]);

  // Keyboard shortcut listener (Esc to exit reading mode or drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isReadingMode) setIsReadingMode(false);
        if (showThumbnails && window.innerWidth < 768) setShowThumbnails(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReadingMode, showThumbnails]);

  // Auto-Hide floating toolbar on scroll down
  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const delta = currentScrollTop - lastScrollTopRef.current;

    if (delta > 8 && currentScrollTop > 80) {
      setIsToolbarVisible(false);
    } else if (delta < -6 || currentScrollTop <= 40) {
      setIsToolbarVisible(true);
    }

    lastScrollTopRef.current = currentScrollTop;
  };

  // Zoom and Fit Width handlers
  const handleZoomIn = () => {
    setIsFitWidth(false);
    setScale((s) => Math.min(3.0, +(s + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    setIsFitWidth(false);
    setScale((s) => Math.max(0.2, +(s - 0.15).toFixed(2)));
  };

  const handleFitWidth = () => {
    const nextFit = calculateFitScale();
    setScale(nextFit);
    setIsFitWidth(true);
  };

  // Scroll smoothly to target page
  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum];
    if (el) {
      if (window.innerWidth < 768) {
        setShowThumbnails(false);
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  };

  const handlePageIntersect = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
  }, []);

  const registerPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    pageRefs.current[pageNum] = el;
  }, []);

  const registerThumbRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    thumbnailRefs.current[pageNum] = el;
  }, []);

  const naturalAspectRatio =
    naturalPageWidthRef.current && naturalPageHeightRef.current
      ? `${naturalPageWidthRef.current} / ${naturalPageHeightRef.current}`
      : '16 / 9';

  return (
    <div className="h-screen w-screen bg-[#050505] text-slate-100 flex flex-col font-sans overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* TOP BRANDED WEBSITE HEADER */}
      {!isReadingMode && (
        <header className="shrink-0 z-40 bg-[#080912]/95 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 py-2 sm:py-2.5 transition-all flex items-center justify-between gap-2 shadow-md">
          {/* Logo & Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <a href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0" aria-label="Return to Zenemoo Home">
              <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                <SeoImage
                  src={logoUrl || '/assets/logo.png'}
                  alt="Zenemoo Official Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain rounded-full bg-white p-0.5"
                  fallbackSrc="/assets/logo.png"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-lg font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-tight truncate">
                  ZENEMOO
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-cyan-400/90 tracking-tight hidden xs:block">
                  Company Portfolio
                </span>
              </div>
            </a>
          </div>

          {/* Action Suite */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <a
              href="/"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer"
              title="Return to Home"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Back Home</span>
            </a>

            <button
              onClick={() => setIsReadingMode(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/10 hover:border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Reading Mode (Fullscreen)"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Reading Mode</span>
            </button>

            {portfolio?.public_url && (
              <a
                href={portfolio.public_url}
                download={portfolio.filename || 'zenemoo-company-portfolio.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs font-mono shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
                title="Download Official Company Portfolio PDF"
              >
                <Download className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span className="hidden sm:inline">Download Company Portfolio</span>
                <span className="sm:hidden">Download</span>
              </a>
            )}
          </div>
        </header>
      )}

      {/* READING MODE TOP COMPACT FLOATING BAR */}
      {isReadingMode && (
        <div className="shrink-0 z-40 bg-[#080912]/95 backdrop-blur-xl border-b border-white/15 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 shadow-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-extrabold font-display tracking-wider text-white truncate">ZENEMOO PORTFOLIO</span>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/30 shrink-0">
              {currentPage}/{totalPages || 1}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1 cursor-pointer"
              title={showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}
            >
              {showThumbnails ? <PanelLeftClose className="w-4 h-4 text-cyan-400" /> : <PanelLeft className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-cyan-400" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 min-w-[34px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-cyan-400" />
            </button>

            {portfolio?.public_url && (
              <a
                href={portfolio.public_url}
                download={portfolio.filename || 'zenemoo-company-portfolio.pdf'}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-cyan-500/20"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>
            )}

            <button
              onClick={() => setIsReadingMode(false)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ml-1"
              title="Exit Reading Mode (Esc)"
            >
              <X className="w-4 h-4 text-slate-300" />
              <span className="hidden xs:inline">Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN BODY AREA (FLEX CONTAINER: SIDEBAR + INDEPENDENT PDF VIEWER) */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* MOBILE THUMBNAIL BACKDROP */}
        {showThumbnails && portfolio && (
          <div
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden transition-opacity"
            onClick={() => setShowThumbnails(false)}
            aria-hidden="true"
          />
        )}

        {/* THUMBNAIL NAVIGATOR SIDEBAR */}
        {portfolio && (
          <aside
            className={`
              fixed md:relative top-0 bottom-0 left-0 z-50 md:z-20
              h-full shrink-0 border-r border-white/10 bg-[#06070b]/98 md:bg-[#06070b]/95 backdrop-blur-2xl
              flex flex-col transition-all duration-300 ease-in-out overflow-hidden shadow-2xl md:shadow-none
              ${
                showThumbnails
                  ? 'w-[75vw] max-w-[280px] md:w-56 lg:w-64 translate-x-0'
                  : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0'
              }
            `}
          >
            {/* Sidebar Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                <Layers className="w-4 h-4" />
                <span>Thumbnails ({totalPages || 1})</span>
              </div>
              <button
                onClick={() => setShowThumbnails(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close Sidebar"
                aria-label="Close Thumbnail Sidebar"
              >
                <X className="w-4 h-4 md:hidden" />
                <PanelLeftClose className="w-4 h-4 hidden md:block" />
              </button>
            </div>

            {/* Independent Thumbnail Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <PdfThumbnailItem
                  key={pageNum}
                  pdfDoc={pdfDoc}
                  pageNum={pageNum}
                  isCurrent={currentPage === pageNum}
                  naturalAspectRatio={naturalAspectRatio}
                  onClick={() => scrollToPage(pageNum)}
                  registerRef={registerThumbRef}
                />
              ))}
            </div>
          </aside>
        )}

        {/* MAIN VIEWER SCROLLING CONTAINER */}
        <main
          className="flex-1 h-full flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 overflow-y-auto overflow-x-auto w-full relative custom-scrollbar pb-24 sm:pb-12"
          ref={containerRef}
          onScroll={handleMainScroll}
        >
          {/* LOADING SKELETON */}
          {isLoadingMetadata && (
            <div className="w-full max-w-3xl my-12 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-md">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
              <p className="text-sm font-mono text-cyan-300">Loading Zenemoo Portfolio...</p>
              <p className="text-xs text-slate-500 mt-1">Connecting to official CDN asset</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoadingMetadata && !portfolio && !error && (
            <div className="w-full max-w-xl my-12 text-center p-6 sm:p-12 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-md shadow-2xl">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 sm:mb-5">
                <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold font-display text-white mb-2">Company Portfolio Coming Soon</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 sm:mb-6">
                Our official enterprise company portfolio document is currently being updated.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Zenemoo Home</span>
              </a>
            </div>
          )}

          {/* ERROR STATE */}
          {error && (
            <div className="w-full max-w-lg my-12 p-5 sm:p-6 rounded-3xl bg-red-950/40 border border-red-500/30 text-center backdrop-blur-md">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-white mb-1">Portfolio Unavailable</h3>
              <p className="text-xs text-red-300/80 mb-4 sm:mb-5">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={fetchMetadata}
                  className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  Retry Loading
                </button>
                {portfolio?.public_url && (
                  <a
                    href={portfolio.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all"
                  >
                    Direct Open
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE PDF VIEWER */}
          {!isLoadingMetadata && portfolio && (
            <div className="w-full flex flex-col items-center max-w-full">
              {/* STICKY FLOATING CONTROL TOOLBAR */}
              {!isReadingMode && (
                <div
                  className={`sticky top-2 sm:top-3 z-30 mb-3 sm:mb-4 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-[#080912]/92 border border-white/15 backdrop-blur-2xl shadow-2xl shadow-black/80 flex items-center justify-between gap-1.5 sm:gap-4 max-w-2xl w-full transition-all duration-300 ease-out ${
                    isToolbarVisible
                      ? 'opacity-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 -translate-y-6 pointer-events-none'
                  }`}
                >
                  {/* Left: Thumbnail Sidebar Toggle & Page Stepper */}
                  <div className="flex items-center gap-1 text-xs font-mono text-cyan-300 shrink-0">
                    <button
                      onClick={() => setShowThumbnails(!showThumbnails)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}
                      aria-label="Toggle Thumbnail Sidebar"
                    >
                      {showThumbnails ? <PanelLeftClose className="w-4 h-4 text-cyan-400" /> : <PanelLeft className="w-4 h-4 text-cyan-400" />}
                    </button>

                    <button
                      onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4 text-cyan-400" />
                    </button>
                    <span className="font-bold text-[11px] sm:text-xs select-none">
                      {currentPage}<span className="text-slate-500">/</span>{totalPages || 1}
                    </span>
                    <button
                      onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      aria-label="Next Page"
                    >
                      <ChevronRight className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>

                  {/* Middle: Zoom Controls */}
                  <div className="flex items-center gap-0.5 sm:gap-1 bg-white/[0.04] p-0.5 sm:p-1 rounded-xl border border-white/5">
                    <button
                      onClick={handleZoomOut}
                      className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Zoom Out"
                      aria-label="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-300 px-1 min-w-[34px] sm:min-w-[40px] text-center select-none">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Zoom In"
                      aria-label="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  </div>

                  {/* Right: Fit Width & Fullscreen Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFitWidth}
                      className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono transition-colors cursor-pointer ${
                        isFitWidth
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/5'
                      }`}
                      title="Fit Page to Screen Width"
                      aria-label="Fit Width"
                    >
                      Fit Width
                    </button>

                    <button
                      onClick={() => setIsReadingMode(true)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer hidden xs:inline-flex"
                      title="Enter Reading Mode"
                      aria-label="Enter Reading Mode"
                    >
                      <Maximize2 className="w-4 h-4 text-cyan-400" />
                    </button>
                    <a
                      href={portfolio.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
                      title="Open PDF in New Tab"
                      aria-label="Open in New Tab"
                    >
                      <ExternalLink className="w-4 h-4 text-cyan-400" />
                    </a>
                  </div>
                </div>
              )}

              {/* CANVASES STREAM (Centered, Responsive, Exact Aspect Ratio) */}
              <div className="w-full flex flex-col items-center gap-3 sm:gap-6 py-1 max-w-full">
                {isLoadingPdf && (
                  <div className="py-16 flex flex-col items-center justify-center">
                    <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin mb-3" />
                    <p className="text-xs font-mono text-cyan-300">Rendering document pages...</p>
                  </div>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PdfPageItem
                    key={pageNum}
                    pdfDoc={pdfDoc}
                    pageNum={pageNum}
                    scale={scale}
                    totalPages={totalPages}
                    naturalAspectRatio={naturalAspectRatio}
                    naturalWidth={naturalPageWidthRef.current}
                    onIntersect={handlePageIntersect}
                    registerRef={registerPageRef}
                  />
                ))}
              </div>

              {/* FOOTER SPECS */}
              {!isReadingMode && (
                <div className="mt-8 mb-6 text-center text-xs font-mono text-slate-400 space-y-1">
                  <p className="text-slate-400 font-medium">
                    Copyright &copy; 2026 Zenemoo. All Rights Reserved.
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">
                    Official Zenemoo Company Portfolio &bull; {portfolio.file_size_formatted || '614.6 KB'} &bull; {totalPages || 9} Pages
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
