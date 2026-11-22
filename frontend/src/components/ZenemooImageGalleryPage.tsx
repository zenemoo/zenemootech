import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  Layers,
  ArrowLeft,
  Calendar,
  Tag,
  Grid,
  Columns,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
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

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('masonry');

  // Lightbox Modal State
  const [activeItem, setActiveItem] = useState<UnifiedGalleryItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Load all images (custom posters + opportunities + team members)
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
        caption: `Official program opportunity poster for ${opp.title} (${opp.partner_name || 'Zenemoo'}). Work mode: ${opp.work_mode || 'Remote'}.`,
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
      // Fallback: direct window download
      window.open(item.cdnUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Google Image SEO & Structured Schema JSON-LD injection
  useEffect(() => {
    document.title = 'Official Media & Image Gallery — Posters, Badges & AI Assets | Zenemoo';

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
      'Explore official Zenemoo posters, festival banners, government MSME certificates, program opportunities, and executive team media with official high-resolution CDN assets.'
    );
    setMeta('property', 'og:title', 'Zenemoo Official Media & Image Gallery');
    setMeta(
      'property',
      'og:description',
      'Official visual directory of Zenemoo AI Data Solutions — Festival posters, announcements, project posters, and team portraits.'
    );
    setMeta('property', 'og:url', 'https://www.zenemoo.in/images');
    setMeta('property', 'og:image', 'https://www.zenemoo.in/assets/logo.png');

    // Canonical Link
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
    <div className="min-h-screen bg-[#05070D] text-slate-100 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar onBack={onBack} showBackButton={true} onOpenAiDrawer={onOpenAiDrawer} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 space-y-10">
        {/* ── HERO HEADER BAR ── */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0B101D] via-[#080C16] to-[#04060B] border border-cyan-500/20 p-6 sm:p-10 shadow-2xl overflow-hidden">
          {/* Subtle Background Glows */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>OFFICIAL BRAND & MEDIA DIRECTORY</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white font-display tracking-tight leading-tight">
                Zenemoo <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">Image Hub</span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Official graphics, festival banners, government recognitions, project posters, and verified media assets indexed directly from the high-performance Zenemoo CDN.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/5 shrink-0">
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Total Indexed Media</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">
                  {isLoading ? '...' : allMediaItems.length}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google Sitemap Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SEARCH & CATEGORY FILTER BAR (Google Images Style) ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posters, festival greetings, certifications, career posters..."
                className="w-full pl-11 pr-4 py-3 bg-[#0B101D] border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-1 bg-[#0B101D] border border-white/10 p-1 rounded-2xl shrink-0 self-end sm:self-auto">
              <button
                onClick={() => setLayoutMode('masonry')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  layoutMode === 'masonry'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Adaptive Flow View"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Uniform Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Chips (Google Images Style) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
            {Object.keys(categoryCounts).map((catName) => {
              const count = categoryCounts[catName] || 0;
              const isActive = selectedCategory === catName;
              return (
                <button
                  key={catName}
                  onClick={() => setSelectedCategory(catName)}
                  className={`px-4 py-2 rounded-full text-xs font-mono font-medium transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                      : 'bg-[#0B101D] text-slate-400 border-white/10 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>{catName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MEDIA GALLERY SHOWCASE ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-[#0B101D] border border-white/5 rounded-2xl h-72 animate-pulse p-4" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-[#0B101D] border border-white/10 p-12 text-center space-y-4">
            <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-xl font-bold text-white font-display">No media found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              No images matching your current search or category filter. Try selecting &quot;All&quot; or clearing your keywords.
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
          <div
            className={
              layoutMode === 'masonry'
                ? 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6'
                : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
            }
          >
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="group relative bg-[#0B101D] rounded-2xl border border-white/10 hover:border-cyan-500/60 overflow-hidden shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer break-inside-avoid flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="relative overflow-hidden bg-slate-950/80 flex items-center justify-center min-h-[220px]">
                  <img
                    src={item.cdnUrl}
                    alt={item.altText}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Seamless fallback to direct Cloudinary source if CDN proxy is cold
                      const target = e.target as HTMLImageElement;
                      if (target.src !== item.sourceUrl) {
                        target.src = item.sourceUrl;
                      }
                    }}
                  />

                  {/* Category Pill Tag */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 text-cyan-300 border border-cyan-500/30 shadow-md">
                      {item.category.replace(' & Greetings', '').replace('Official ', '')}
                    </span>
                  </div>

                  {/* Hover Quick View Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div className="w-full space-y-1.5 text-left">
                      <p className="text-white text-xs font-bold font-sans line-clamp-2 leading-snug drop-shadow-md">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Quick View
                        </span>
                        <span className="text-slate-400">{item.date}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Summary */}
                <div className="p-3.5 bg-[#080C16] border-t border-white/5 space-y-1">
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{item.category}</span>
                    <span className="text-cyan-400 font-bold">CDN • 200 OK</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── LIGHTBOX ZOOM & DETAILS MODAL (Google Images Style) ── */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-[#0B101D] border border-cyan-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#080C16] shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  {activeItem.category}
                </span>
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  {activeItem.date}
                </span>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Split View */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Image Canvas Preview (Left / Top) */}
              <div className="lg:col-span-7 bg-[#05070D] p-4 sm:p-8 flex items-center justify-center min-h-[300px] sm:min-h-[440px] border-b lg:border-b-0 lg:border-r border-white/10">
                <img
                  src={activeItem.cdnUrl}
                  alt={activeItem.altText}
                  className="max-h-[60vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== activeItem.sourceUrl) {
                      target.src = activeItem.sourceUrl;
                    }
                  }}
                />
              </div>

              {/* Metadata & Actions Panel (Right / Bottom) */}
              <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-6 bg-[#080C16]/90">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white font-display leading-snug">
                      {activeItem.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                      {activeItem.caption}
                    </p>
                  </div>

                  {/* Branded CDN URL Inspector */}
                  <div className="space-y-2 bg-[#05070D] p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Branded Edge CDN URL</span>
                      </span>
                      <span className="text-[10px] text-emerald-400">Google Sitemap Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeItem.cdnUrl}
                        className="flex-1 bg-black/50 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 select-all"
                      />
                      <button
                        onClick={() => handleCopyLink(activeItem.cdnUrl)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {activeItem.tags && activeItem.tags.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">SEO Keywords</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeItem.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-white/5"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadImage(activeItem)}
                      disabled={isDownloading}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{isDownloading ? 'Downloading...' : 'Download Image'}</span>
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
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono inline-flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                      title="Share Poster"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Deep Link to Opportunity or Team profile if applicable */}
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
                      className="w-full py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{activeItem.actionLabel || 'Visit Associated Page'}</span>
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
