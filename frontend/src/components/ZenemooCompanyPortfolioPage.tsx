import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  BookOpen,
  X,
  Layers,
  Check,
  Copy,
} from 'lucide-react';
import { portfolioApi, CompanyPortfolioItem } from '../services/api';
import { SeoImage } from '../seo/components/SeoImage';
import { useActiveLogo } from '../lib/useActiveLogo';
import { PortfolioShareModal } from './PortfolioShareModal';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const ZenemooCompanyPortfolioPage: React.FC = () => {
  const { logoUrl } = useActiveLogo();
  const [portfolio, setPortfolio] = useState<CompanyPortfolioItem | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [renderedPages, setRenderedPages] = useState<{ [pageNum: number]: boolean }>({});
  const [renderedThumbnails, setRenderedThumbnails] = useState<{ [pageNum: number]: boolean }>({});

  // UI Modes
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isReadingMode, setIsReadingMode] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [pageNum: number]: HTMLCanvasElement | null }>({});
  const thumbnailRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});
  const thumbnailCanvasRefs = useRef<{ [pageNum: number]: HTMLCanvasElement | null }>({});

  // Fetch Portfolio Metadata (15-min cached, near-zero egress)
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

  // Load PDF.js dynamically on demand to preserve lightweight initial bundle
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

  // Load PDF Document when metadata is ready
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
          disableRange: false, // HTTP Range 206 partial streaming
          disableStream: false,
          disableAutoFetch: false,
        });

        return loadingTask.promise;
      })
      .then((pdf) => {
        if (!isMounted) return;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
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
  }, [portfolio?.public_url]);

  // Render a full-size page canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        await page.render({
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        }).promise;

        setRenderedPages((prev) => ({ ...prev, [pageNum]: true }));
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering page ${pageNum}:`, e);
        }
      }
    },
    [pdfDoc, scale]
  );

  // Render a small thumbnail canvas lazily
  const renderThumbnail = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      const canvas = thumbnailCanvasRefs.current[pageNum];
      if (!canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const thumbScale = 0.22; // Small thumbnail scale
        const viewport = page.getViewport({ scale: thumbScale });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        setRenderedThumbnails((prev) => ({ ...prev, [pageNum]: true }));
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.warn(`Thumbnail render notice (page ${pageNum}):`, e);
        }
      }
    },
    [pdfDoc]
  );

  // Main Document IntersectionObserver for Virtualized Rendering + Active Page Tracking
  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1', 10);
          if (entry.isIntersecting) {
            renderPage(pageNum);
            setCurrentPage(pageNum);

            // Buffer next and previous pages
            if (pageNum + 1 <= totalPages) renderPage(pageNum + 1);
            if (pageNum - 1 >= 1) renderPage(pageNum - 1);
          }
        });
      },
      {
        root: null,
        rootMargin: '300px 0px 300px 0px',
        threshold: [0.1, 0.5],
      }
    );

    for (let i = 1; i <= totalPages; i++) {
      const el = pageRefs.current[i];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pdfDoc, totalPages, renderPage]);

  // Thumbnail Sidebar Lazy Rendering IntersectionObserver
  useEffect(() => {
    if (!pdfDoc || totalPages === 0 || !showThumbnails) return;

    const thumbObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-thumb-page') || '1', 10);
          if (entry.isIntersecting) {
            renderThumbnail(pageNum);
            if (pageNum + 1 <= totalPages) renderThumbnail(pageNum + 1);
          }
        });
      },
      {
        root: null,
        rootMargin: '100px 0px 100px 0px',
        threshold: 0.1,
      }
    );

    for (let i = 1; i <= totalPages; i++) {
      const el = thumbnailRefs.current[i];
      if (el) thumbObserver.observe(el);
    }

    return () => thumbObserver.disconnect();
  }, [pdfDoc, totalPages, showThumbnails, renderThumbnail]);

  // Re-render visible pages on scale change
  useEffect(() => {
    if (!pdfDoc) return;
    setRenderedPages({});
    renderPage(currentPage);
    if (currentPage + 1 <= totalPages) renderPage(currentPage + 1);
    if (currentPage - 1 >= 1) renderPage(currentPage - 1);
  }, [scale, pdfDoc, renderPage, currentPage, totalPages]);

  // Adjust default scale and sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScale(0.75);
        setShowThumbnails(false);
      } else if (width < 1024) {
        setScale(0.95);
        setShowThumbnails(false);
      } else {
        setScale(1.2);
        setShowThumbnails(true);
      }
    };
    handleResize();
  }, []);

  // Keyboard shortcut listener (Esc to exit reading mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isReadingMode) {
        setIsReadingMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReadingMode]);

  // Zoom Controls
  const handleZoomIn = () => setScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)));
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - (showThumbnails ? 260 : 48);
      const targetScale = Math.max(0.5, Math.min(2.0, +(containerWidth / 620).toFixed(2)));
      setScale(targetScale);
    }
  };

  // Scroll to Page
  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  };

  return (
    <div className={`bg-[#050505] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 ${isReadingMode ? 'fixed inset-0 z-50 overflow-hidden' : 'min-h-screen'}`}>
      {/* TOP BRANDED WEBSITE HEADER (Hidden in dedicated Reading Mode) */}
      {!isReadingMode && (
        <header className="sticky top-0 z-40 bg-[#080912]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Logo & Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <a href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Return to Zenemoo Home">
                <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
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
                  <span className="text-base sm:text-lg font-extrabold tracking-wider font-display text-white group-hover:text-cyan-400 transition-colors leading-tight truncate">
                    ZENEMOO
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/90 tracking-tight hidden sm:block">
                    Company Portfolio
                  </span>
                </div>
              </a>
            </div>

            {/* Prominent Download Button & Action Suite */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <a
                href="/"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>Back Home</span>
              </a>

              <button
                onClick={() => setIsReadingMode(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/10 hover:border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Reading Mode (Fullscreen)"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reading Mode</span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/10 hover:border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Share Portfolio + QR"
                aria-label="Share Portfolio"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {portfolio?.public_url && (
                <a
                  href={portfolio.public_url}
                  download={portfolio.filename || 'zenemoo-company-portfolio.pdf'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs font-mono shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  <span className="hidden md:inline">Download Company Portfolio</span>
                  <span className="md:hidden">Download</span>
                </a>
              )}
            </div>
          </div>
        </header>
      )}

      {/* READING MODE TOP COMPACT FLOATING BAR */}
      {isReadingMode && (
        <div className="z-50 bg-[#080912]/95 backdrop-blur-xl border-b border-white/15 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shadow-2xl shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-extrabold font-display tracking-wider text-white">ZENEMOO PORTFOLIO</span>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/30">
              Page {currentPage} / {totalPages || 1}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1 cursor-pointer"
              title="Toggle Thumbnails"
            >
              {showThumbnails ? <PanelLeftClose className="w-4 h-4 text-cyan-400" /> : <PanelLeft className="w-4 h-4 text-cyan-400" />}
              <span className="hidden md:inline text-[11px]">{showThumbnails ? 'Hide' : 'Thumbnails'}</span>
            </button>

            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-cyan-400" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 min-w-[36px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-cyan-400" />
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
            </button>

            {portfolio?.public_url && (
              <a
                href={portfolio.public_url}
                download={portfolio.filename || 'zenemoo-company-portfolio.pdf'}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-cyan-500/20"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            <button
              onClick={() => setIsReadingMode(false)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ml-1"
              title="Exit Reading Mode (Esc)"
            >
              <X className="w-4 h-4 text-slate-300" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN BODY AREA WITH SIDEBAR + VIEWER */}
      <div className={`flex-1 flex w-full max-w-full overflow-hidden ${isReadingMode ? 'h-[calc(100vh-52px)]' : ''}`}>
        {/* COLLAPSIBLE PAGE THUMBNAIL NAVIGATOR SIDEBAR */}
        {showThumbnails && portfolio && (
          <aside
            className={`shrink-0 border-r border-white/10 bg-[#06070b]/90 backdrop-blur-xl flex flex-col transition-all duration-300 z-30 ${
              isReadingMode ? 'w-48 sm:w-56' : 'w-48 sm:w-56 md:w-60'
            }`}
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
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isCurrent = currentPage === pageNum;
                return (
                  <div
                    key={pageNum}
                    data-thumb-page={pageNum}
                    ref={(el) => {
                      thumbnailRefs.current[pageNum] = el;
                    }}
                    onClick={() => scrollToPage(pageNum)}
                    className={`group relative rounded-xl p-2 border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="w-full aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-white/10 relative shadow-sm">
                      <canvas
                        ref={(el) => {
                          thumbnailCanvasRefs.current[pageNum] = el;
                        }}
                        className="block w-full h-full object-contain bg-white"
                      />
                      {!renderedThumbnails[pageNum] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
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
              })}
            </div>
          </aside>
        )}

        {/* MAIN VIEWER SCROLLING CONTAINER */}
        <main
          className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 overflow-y-auto w-full relative custom-scrollbar"
          ref={containerRef}
        >
          {/* LOADING SKELETON */}
          {isLoadingMetadata && (
            <div className="w-full max-w-3xl my-12 flex flex-col items-center justify-center p-12 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-md">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
              <p className="text-sm font-mono text-cyan-300">Loading Zenemoo Portfolio...</p>
              <p className="text-xs text-slate-500 mt-1">Connecting to official CDN asset</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoadingMetadata && !portfolio && !error && (
            <div className="w-full max-w-xl my-16 text-center p-8 sm:p-12 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-5">
                <FileText className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-2">Company Portfolio Coming Soon</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                Our official enterprise company portfolio document is currently being updated.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Zenemoo Home</span>
              </a>
            </div>
          )}

          {/* ERROR STATE */}
          {error && (
            <div className="w-full max-w-lg my-12 p-6 rounded-3xl bg-red-950/40 border border-red-500/30 text-center backdrop-blur-md">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Portfolio Unavailable</h3>
              <p className="text-xs text-red-300/80 mb-5">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={fetchMetadata}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  Retry Loading
                </button>
                {portfolio?.public_url && (
                  <a
                    href={portfolio.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all"
                  >
                    Direct Open
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE PDF VIEWER */}
          {!isLoadingMetadata && portfolio && (
            <div className="w-full flex flex-col items-center">
              {/* STICKY FLOATING CONTROL TOOLBAR (When not in reading mode) */}
              {!isReadingMode && (
                <div className="sticky top-2 z-30 mb-4 px-3 py-2 rounded-2xl bg-[#080912]/90 border border-white/15 backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-2 sm:gap-4 max-w-2xl w-full">
                  {/* Left: Thumbnail Sidebar Toggle & Page Stepper */}
                  <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 shrink-0">
                    <button
                      onClick={() => setShowThumbnails(!showThumbnails)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}
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
                    <span className="font-bold">
                      {currentPage} <span className="text-slate-500">/</span> {totalPages || 1}
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
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/5">
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <span className="text-[11px] font-mono font-bold text-slate-300 px-1.5 min-w-[42px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  </div>

                  {/* Right: Fit Width & Reading Mode */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFitWidth}
                      className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-[11px] font-mono text-slate-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
                      title="Fit to Width"
                    >
                      Fit Width
                    </button>
                    <button
                      onClick={() => setIsReadingMode(true)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Enter Reading Mode"
                    >
                      <Maximize2 className="w-4 h-4 text-cyan-400" />
                    </button>
                    <a
                      href={portfolio.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Open in New Tab"
                    >
                      <ExternalLink className="w-4 h-4 text-cyan-400" />
                    </a>
                  </div>
                </div>
              )}

              {/* CANVASES STREAM */}
              <div className="w-full flex flex-col items-center gap-4 sm:gap-6 py-2 overflow-x-auto max-w-full">
                {isLoadingPdf && (
                  <div className="py-16 flex flex-col items-center justify-center">
                    <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin mb-3" />
                    <p className="text-xs font-mono text-cyan-300">Rendering document pages...</p>
                  </div>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <div
                    key={pageNum}
                    data-page-number={pageNum}
                    ref={(el) => {
                      pageRefs.current[pageNum] = el;
                    }}
                    className="relative group rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-cyan-950/40 border border-white/10 bg-slate-900/90 transition-all"
                    style={{
                      minHeight: scale * 400,
                    }}
                  >
                    {/* Floating Page Tag */}
                    <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 opacity-60 group-hover:opacity-100 transition-opacity">
                      Page {pageNum} of {totalPages}
                    </div>

                    {/* Canvas Render Element */}
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[pageNum] = el;
                      }}
                      className="block bg-white transition-transform"
                    />

                    {/* Lazy skeleton loader if page canvas not rendered yet */}
                    {!renderedPages[pageNum] && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm"
                        style={{ minHeight: scale * 400 }}
                      >
                        <RefreshCw className="w-5 h-5 text-cyan-400/60 animate-spin mb-2" />
                        <span className="text-[11px] font-mono text-slate-400">Loading page {pageNum}...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* FOOTER SPECS */}
              {!isReadingMode && (
                <div className="mt-8 mb-12 text-center text-xs font-mono text-slate-500 space-y-1">
                  <p>
                    Official Zenemoo Company Portfolio &bull; {portfolio.file_size_formatted || 'PDF Document'} &bull; {totalPages || 1} Pages
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Direct Cloud CDN Streaming &bull; Continuous Scroll &bull; Zero Server Egress
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* SHARE PORTFOLIO MODAL WITH QR CODE */}
      <PortfolioShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        publicUrl="https://www.zenemoo.in/portfolio"
      />
    </div>
  );
};
