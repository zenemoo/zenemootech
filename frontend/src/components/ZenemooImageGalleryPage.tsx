import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Download,
  Share2,
  Copy,
  Check,
  Eye,
  Maximize2,
  X,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  Calendar,
  Grid,
  Columns,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { galleryApi, GalleryImageItem } from '../services/api';
import { getStoredOpportunities, OpportunityProgram } from '../lib/opportunityStore';
import { getStoredTeamMembers, TeamMember, getSlugFromName } from '../lib/teamStore';
import { toBrandedCdnUrl, toCloudinaryDirectUrl } from '../lib/cdnHelper';

interface UnifiedGalleryItem {
  id: string;
  title: string;
  category: 'Festivals & Greetings' | 'Official Badges & Certifications' | 'Program Opportunities' | 'Team & Leadership' | 'Brand Graphics';
  imageUrl: string;
  cdnUrl: string;
  sourceUrl: string;
  altText: string;
  caption: string;
  tags: string[];
  aspectRatio: '1:1' | '4:5' | '16:9';
  actionUrl?: string;
  actionLabel?: string;
  date?: string;
  isCustomPoster?: boolean;
}

interface ZenemooImageGalleryPageProps {
  onBack?: () => void;
  onOpenAiDrawer?: () => void;
  onNavigateToOpportunity?: (id: string) => void;
  onNavigateToTeam?: (slug: string) => void;
}

const ITEMS_PER_PAGE = 12;

/**
 * Zenemoo-Style "ZENEMOOOOOOO" Pagination Component
 * Colors strictly match Zenemoo official logo:
 * - "ZENEM" in crisp bold white
 * - The "O"s alternate in signature brand colors: Royal Purple (#8B5CF6) and Electric Cyan (#00F0FF)
 */
interface GooglePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const GooglePagination: React.FC<GooglePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  // Window of up to 10 pages centered on current page
  const maxPages = 10;
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let endPage = startPage + maxPages - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  const pageNumbers: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex flex-col items-center justify-center pt-14 pb-10 select-none font-sans">
      <div className="flex items-end justify-center gap-1.5 sm:gap-3">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <button
            onClick={() => onPageChange(currentPage - 1)}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline text-xs sm:text-sm font-mono font-medium mr-2 sm:mr-4 cursor-pointer pb-2 transition-colors"
          >
            <span className="text-base leading-none">&lt;</span>
            <span className="hidden xs:inline">Previous</span>
          </button>
        ) : (
          <div className="w-8 sm:w-16" />
        )}

        {/* Wordmark Prefix: "ZENEM" in bold crisp white (Zenemoo Logo Style) */}
        <div className="flex items-end text-3xl sm:text-5xl font-black tracking-wider pb-3.5 text-white font-display">
          <span>Z</span>
          <span>E</span>
          <span>N</span>
          <span>E</span>
          <span>M</span>
        </div>

        {/* The 'O's in Zenemoo brand colors: alternating Royal Purple (#8B5CF6) and Electric Cyan (#00F0FF) */}
        <div className="flex items-end gap-1 sm:gap-2">
          {pageNumbers.map((p) => {
            const isCurrent = p === currentPage;
            const isCyan = p % 2 === 0;
            const letterColor = isCyan ? 'text-[#00F0FF]' : 'text-[#8B5CF6]';
            const glowShadow = isCyan
              ? 'drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]'
              : 'drop-shadow-[0_0_12px_rgba(139,92,246,0.7)]';

            return (
              <div key={p} className="flex flex-col items-center">
                <button
                  onClick={() => onPageChange(p)}
                  disabled={isCurrent}
                  className={`text-3xl sm:text-5xl font-black leading-none transition-all font-display ${letterColor} ${
                    isCurrent
                      ? `scale-110 ${glowShadow} cursor-default`
                      : 'hover:scale-125 cursor-pointer opacity-80 hover:opacity-100'
                  }`}
                  title={`Go to page ${p}`}
                >
                  O
                </button>
                <button
                  onClick={() => onPageChange(p)}
                  disabled={isCurrent}
                  className={`text-xs sm:text-sm font-mono mt-1.5 transition-colors ${
                    isCurrent
                      ? 'text-white font-bold cursor-default'
                      : 'text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer'
                  }`}
                >
                  {p}
                </button>
              </div>
            );
          })}
        </div>

        {/* Next Button */}
        {currentPage < totalPages ? (
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline text-xs sm:text-sm font-mono font-medium ml-2 sm:ml-4 cursor-pointer pb-2 transition-colors"
          >
            <span className="hidden xs:inline">Next</span>
            <span className="text-base leading-none">&gt;</span>
          </button>
        ) : (
          <div className="w-8 sm:w-16" />
        )}
      </div>

      {/* Zenemoo Signature Gradient Accent Bar: Cyan to Purple */}
      <div className="flex items-center gap-2.5 mt-4 opacity-80">
        <div className="w-10 sm:w-20 h-0.5 bg-gradient-to-r from-transparent to-cyan-400 rounded-full" />
        <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">EST 2023 • ZENEMOO IMAGES</span>
        <div className="w-10 sm:w-20 h-0.5 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
      </div>
    </div>
  );
};

export const ZenemooImageGalleryPage: React.FC<ZenemooImageGalleryPageProps> = ({
  onBack,
  onOpenAiDrawer,
  onNavigateToOpportunity,
  onNavigateToTeam,
}) => {
  const [customPosters, setCustomPosters] = useState<GalleryImageItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityProgram[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter, Search & Layout State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('masonry');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Lightbox Modal State
  const [activeItem, setActiveItem] = useState<UnifiedGalleryItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Load all images (custom posters + opportunities + team portraits)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchAllMedia = async () => {
      setIsLoading(true);
      try {
        const [galleryRes, opps, team] = await Promise.all([
          galleryApi.getAll().catch(() => ({ data: { data: [] } })),
          getStoredOpportunities().catch(() => []),
          getStoredTeamMembers().catch(() => []),
        ]);

        if (galleryRes?.data?.data && Array.isArray(galleryRes.data.data)) {
          setCustomPosters(galleryRes.data.data);
        }
        setOpportunities(opps || []);
        setTeamMembers(team || []);
      } catch (err) {
        console.warn('Media fetch notice:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllMedia();
  }, []);

  // Reset page when category or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Unify all images into an optimized, structured gallery collection
  const allMediaItems: UnifiedGalleryItem[] = useMemo(() => {
    const list: UnifiedGalleryItem[] = [];

    // 1. Manually added SEO posters / festival banners
    customPosters.forEach((p) => {
      if (!p || (!p.image_url && !p.cdn_url)) return;
      const cdnUrl = p.cdn_url || toBrandedCdnUrl(p.image_url);
      const sourceUrl = toCloudinaryDirectUrl(p.image_url || p.cdn_url);

      let cat: UnifiedGalleryItem['category'] = 'Festivals & Greetings';
      if (p.category === 'Official Badges & Certifications' || p.category.includes('Badge') || p.category.includes('Certification')) {
        cat = 'Official Badges & Certifications';
      } else if (p.category === 'Brand Graphics' || p.category.includes('Brand')) {
        cat = 'Brand Graphics';
      }

      list.push({
        id: p.id,
        title: p.title,
        category: cat,
        imageUrl: cdnUrl,
        cdnUrl,
        sourceUrl,
        altText: p.alt_text || p.title,
        caption: p.caption || `Official ${cat} graphic by Zenemoo.`,
        tags: p.tags || ['Zenemoo', cat],
        aspectRatio: (p.aspect_ratio as any) || '1:1',
        date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Official Asset',
        isCustomPoster: true,
      });
    });

    // 2. Program Opportunities Posters
    opportunities.forEach((opp) => {
      if (!opp || !opp.poster_url) return;
      const cdnUrl = toBrandedCdnUrl(opp.poster_url);
      const sourceUrl = toCloudinaryDirectUrl(opp.poster_url);
      const code = opp.public_id || (opp as any).project_code ? `[${opp.public_id || (opp as any).project_code}] ` : '';

      list.push({
        id: `opp_${opp.id}`,
        title: `${code}${opp.title}`,
        category: 'Program Opportunities',
        imageUrl: cdnUrl,
        cdnUrl,
        sourceUrl,
        altText: `${code}${opp.title} — Official Project Poster | Zenemoo`,
        caption: `Official project opportunity poster for ${opp.title} (${opp.partner_name || 'Zenemoo'}).`,
        tags: ['Opportunity', opp.partner_name || 'Zenemoo', opp.work_mode || 'Remote', 'AI Project'],
        aspectRatio: '1:1',
        actionUrl: `/opportunity/${opp.id}`,
        actionLabel: 'View Opportunity Details',
        date: opp.created_at ? new Date(opp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Live Project',
      });
    });

    // 3. Team Member Official Portraits
    teamMembers.forEach((m) => {
      const rawImg = m.image_url || (m as any).image;
      if (!m || !rawImg) return;
      const cdnUrl = toBrandedCdnUrl(rawImg);
      const sourceUrl = toCloudinaryDirectUrl(rawImg);
      const slug = m.slug || getSlugFromName(m.name);

      list.push({
        id: `team_${m.id}`,
        title: `${m.name} — ${m.designation || 'Specialist'}`,
        category: 'Team & Leadership',
        imageUrl: cdnUrl,
        cdnUrl,
        sourceUrl,
        altText: `Official portrait of ${m.name}, ${m.designation} (${m.department || 'Operations'}) at Zenemoo.`,
        caption: m.bio || `${m.name} is a key member of the specialized AI language and data operations team at Zenemoo.`,
        tags: ['Team', m.designation || 'Specialist', m.department || 'Operations', 'Zenemoo Leadership'],
        aspectRatio: '1:1',
        actionUrl: `/team/${slug}`,
        actionLabel: 'View Full Member Profile',
        date: 'Zenemoo Team',
      });
    });

    return list;
  }, [customPosters, opportunities, teamMembers]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: allMediaItems.length,
      'Festivals & Greetings': 0,
      'Official Badges & Certifications': 0,
      'Program Opportunities': 0,
      'Team & Leadership': 0,
      'Brand Graphics': 0,
    };

    allMediaItems.forEach((i) => {
      if (counts[i.category] !== undefined) {
        counts[i.category]++;
      }
    });

    return counts;
  }, [allMediaItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allMediaItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCaption = item.caption.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchCaption || matchCategory || matchTags;
    });
  }, [allMediaItems, selectedCategory, searchQuery]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (galleryRef.current) {
      galleryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  // Copy CDN link handler
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Safe Image Download Handler
  const handleDownloadImage = async (item: UnifiedGalleryItem) => {
    setIsDownloading(true);
    try {
      const response = await fetch(item.cdnUrl, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanFilename = item.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .substring(0, 50);
      link.download = `zenemoo-${cleanFilename || 'image'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(item.cdnUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Google Image SEO & Structured Schema JSON-LD injection
  useEffect(() => {
    document.title = 'Zenemoo Images — Official Posters, Festival Greetings & Visual Assets';

    const setMeta = (nameAttr: string, attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${attrVal}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta(
      'name',
      'description',
      'Explore official Zenemoo posters, festival banners, government MSME certificates, program opportunities, and executive team media.'
    );
    setMeta('property', 'og:title', 'Zenemoo Official Media & Image Gallery');
    setMeta(
      'property',
      'og:description',
      'Official visual directory of Zenemoo AI Data Solutions — Festival posters, announcements, project posters, and team portraits.'
    );
    setMeta('property', 'og:url', 'https://www.zenemoo.in/images');
    setMeta('property', 'og:image', 'https://www.zenemoo.in/assets/logo.png');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://www.zenemoo.in/images');

    // Schema.org ImageGallery Structured Data
    const schemaId = 'zenemoo-image-gallery-schema';
    let scriptTag = document.getElementById(schemaId) as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = schemaId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: 'Zenemoo Official Media, Posters & Image Gallery',
      description: 'Official image library, festival greetings, certificates, and opportunity posters of Zenemoo.',
      url: 'https://www.zenemoo.in/images',
      publisher: {
        '@type': 'Organization',
        name: 'Zenemoo AI Data Solutions',
        url: 'https://www.zenemoo.in',
        logo: 'https://www.zenemoo.in/assets/logo.png',
      },
      image: allMediaItems.slice(0, 50).map((item) => ({
        '@type': 'ImageObject',
        contentUrl: item.cdnUrl,
        name: item.title,
        description: item.caption,
        caption: item.caption,
        uploadDate: item.date || '2026-08-01',
      })),
    };

    scriptTag.text = JSON.stringify(schemaData);

    return () => {
      const el = document.getElementById(schemaId);
      if (el) el.remove();
    };
  }, [allMediaItems]);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar onBack={onBack} showBackButton={true} onOpenAiDrawer={onOpenAiDrawer} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-20 space-y-8">
        {/* ── GOOGLE-STYLE CLEAN MINIMALIST HEADER WITH OFFICIAL ZENEMOO BRANDING ── */}
        <div className="flex flex-col items-center justify-center text-center pt-2 sm:pt-4 space-y-4">
          {/* Brand Logo & Title - Strictly from Zenemoo Official Logo (Image 2) */}
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-wider font-display flex items-baseline select-none">
              <span className="text-white">ZENEM</span>
              <span className="text-[#8B5CF6]">O</span>
              <span className="text-[#00F0FF]">O</span>
              <span className="text-slate-400 font-light text-2xl sm:text-3xl md:text-4xl ml-2.5">Images</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-slate-400 opacity-80">
              <span className="h-[1px] w-6 sm:w-10 bg-gradient-to-r from-transparent to-cyan-400" />
              <span className="tracking-widest uppercase">EST 2023 • OFFICIAL VISUAL DIRECTORY</span>
              <span className="h-[1px] w-6 sm:w-10 bg-gradient-to-r from-purple-500 to-transparent" />
            </div>
          </div>

          {/* Clean Search Box with Zenemoo Cyan Focus */}
          <div className="w-full max-w-2xl relative pt-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 sm:left-5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Zenemoo posters, festivals, certificates, opportunities..."
              className="w-full pl-11 sm:pl-12 pr-10 py-3 sm:py-3.5 bg-[#121622] hover:bg-[#151a29] focus:bg-[#151a29] border border-white/10 hover:border-cyan-500/40 focus:border-cyan-400 rounded-full text-sm sm:text-base text-white placeholder-slate-400 shadow-lg shadow-black/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Chips with Zenemoo Gradient Accent */}
          <div className="w-full flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
            {Object.keys(categoryCounts).map((catName) => {
              const count = categoryCounts[catName] || 0;
              const isActive = selectedCategory === catName;
              return (
                <button
                  key={catName}
                  onClick={() => setSelectedCategory(catName)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                      : 'bg-[#0f1420] text-slate-400 border-white/10 hover:text-white hover:border-white/25'
                  }`}
                >
                  <span>{catName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Results Summary & View Toggles */}
          <div ref={galleryRef} className="w-full flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-b border-white/5 pb-3">
            <span>
              About <strong className="text-slate-200">{filteredItems.length}</strong> results (Page {currentPage} of {totalPages})
            </span>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setLayoutMode('masonry')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  layoutMode === 'masonry' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
                title="Masonry View"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  layoutMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── IMAGE GALLERY GRID (Google Images Card Style) ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-[#101524] border border-white/5 rounded-2xl h-64 animate-pulse p-4" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-[#101524] border border-white/10 p-12 text-center space-y-4">
            <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-xl font-bold text-white font-display">No images found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Your search - <strong className="text-white">{searchQuery}</strong> - did not match any image records.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div
              className={
                layoutMode === 'masonry'
                  ? 'columns-2 sm:columns-3 lg:columns-4 gap-4 sm:gap-5 space-y-4 sm:space-y-5'
                  : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5'
              }
            >
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveItem(item)}
                  className="group relative bg-[#0f1422] hover:bg-[#141b2e] rounded-xl sm:rounded-2xl border border-white/10 hover:border-cyan-500/60 overflow-hidden shadow-md hover:shadow-xl hover:shadow-cyan-500/15 transition-all duration-300 cursor-pointer break-inside-avoid flex flex-col justify-between"
                >
                  {/* Clean Image Container */}
                  <div className="relative overflow-hidden bg-black/60 flex items-center justify-center min-h-[160px] sm:min-h-[220px]">
                    <img
                      src={item.cdnUrl}
                      alt={item.altText}
                      loading="lazy"
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== item.sourceUrl) {
                          target.src = item.sourceUrl;
                        }
                      }}
                    />

                    {/* Category pill */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-medium backdrop-blur-md bg-black/70 text-cyan-300 border border-white/15">
                        {item.category.replace(' & Greetings', '').replace('Official ', '')}
                      </span>
                    </div>

                    {/* Quick View overlay icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-2.5 rounded-full bg-black/70 text-white border border-white/20 shadow-lg">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Clean Google Images Card Footer: Title + Source (zenemoo.in) */}
                  <div className="p-3 sm:p-3.5 space-y-1">
                    <h4 className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1 leading-snug">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
                      <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">zenemoo.in</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 truncate">{item.date || 'Visual'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── GOOGLE-STYLE "Z E N E M O O O O O O" PAGINATION ── */}
            <GooglePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      {/* ── CLEAN GOOGLE IMAGES PREVIEW MODAL (LIGHTBOX) ── */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="bg-[#0e1320] border border-cyan-500/30 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#0a0e18] shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-300 font-bold">zenemoo.in</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-slate-400">{activeItem.category}</span>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Split View */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Image Canvas (Left / Top) */}
              <div className="lg:col-span-7 bg-[#05070d] p-4 sm:p-8 flex items-center justify-center min-h-[280px] sm:min-h-[420px] border-b lg:border-b-0 lg:border-r border-white/10">
                <img
                  src={activeItem.cdnUrl}
                  alt={activeItem.altText}
                  className="max-h-[62vh] max-w-full w-auto object-contain rounded-xl shadow-2xl"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== activeItem.sourceUrl) {
                      target.src = activeItem.sourceUrl;
                    }
                  }}
                />
              </div>

              {/* Details & Actions Panel (Right / Bottom) */}
              <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-[#0a0e18]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white font-display leading-snug">
                      {activeItem.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                      {activeItem.caption}
                    </p>
                  </div>

                  {/* Tags */}
                  {activeItem.tags && activeItem.tags.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Related Keywords</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeItem.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-slate-300 border border-white/5"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Action Buttons */}
                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadImage(activeItem)}
                      disabled={isDownloading}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: activeItem.title,
                            text: activeItem.caption,
                            url: activeItem.cdnUrl,
                          }).catch(() => {});
                        } else {
                          handleCopyLink(activeItem.cdnUrl);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono inline-flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                      title="Share Poster"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedLink ? 'Copied' : 'Share'}</span>
                    </button>
                  </div>

                  {/* Visit Linked Page */}
                  {activeItem.actionUrl && (
                    <button
                      onClick={() => {
                        if (activeItem.actionUrl?.startsWith('/opportunity/') && onNavigateToOpportunity) {
                          const oppId = activeItem.actionUrl.replace('/opportunity/', '');
                          onNavigateToOpportunity(oppId);
                        } else if (activeItem.actionUrl?.startsWith('/team/') && onNavigateToTeam) {
                          const slug = activeItem.actionUrl.replace('/team/', '');
                          onNavigateToTeam(slug);
                        } else {
                          window.location.href = activeItem.actionUrl!;
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#1b263b] hover:bg-[#23324d] text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{activeItem.actionLabel || 'Visit Page'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
