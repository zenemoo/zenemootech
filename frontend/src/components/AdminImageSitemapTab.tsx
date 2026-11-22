import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowUpRight,
  Globe,
  AlertCircle,
  Maximize2,
  X,
  FileCode,
  CheckCircle2,
  Users,
  Briefcase,
  Award,
  IdCard,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowDownUp,
} from 'lucide-react';
import { OpportunityProgram } from '../lib/opportunityStore';
import { TeamMember, getSlugFromName } from '../lib/teamStore';
import { toBrandedCdnUrl, toCloudinaryDirectUrl } from '../lib/cdnHelper';
import { galleryApi, GalleryImageItem } from '../services/api';

interface AdminImageSitemapTabProps {
  opportunities: OpportunityProgram[];
  teamMembers?: TeamMember[];
  onRefreshOpportunities: () => Promise<void>;
  onRefreshTeam?: () => Promise<void>;
}

// Unified item representation for mixed recent-first display
interface UnifiedSitemapItem {
  id: string;
  kind: 'poster' | 'opportunity' | 'team';
  title: string;
  categoryLabel: string;
  cdnUrl: string;
  sourceUrl: string;
  altText: string;
  caption: string;
  tags?: string[];
  createdAt: number; // timestamp for sorting: recent on top!
  dateFormatted: string;
  posterId?: string; // for custom poster deletion
  actionUrl?: string; // for live preview
  actionLabel?: string;
  statusBadge?: string;
}

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'assets',
}) => {
  if (totalItems <= pageSize) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers
  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/40 font-mono text-xs">
      <div className="text-slate-400 text-center sm:text-left text-[11px]">
        Showing <span className="text-cyan-400 font-bold">{startIdx}</span>–<span className="text-cyan-400 font-bold">{endIdx}</span> of <span className="text-white font-bold">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-[11px] cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Prev</span>
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer"
            >
              1
            </button>
            {startPage > 2 && <span className="text-slate-600 px-0.5">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              p === currentPage
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-slate-600 px-0.5">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-[11px] cursor-pointer"
          title="Next Page"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const AdminImageSitemapTab: React.FC<AdminImageSitemapTabProps> = ({
  opportunities,
  teamMembers = [],
  onRefreshOpportunities,
  onRefreshTeam,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'posters' | 'opportunities' | 'team'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stopped' | 'draft'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; cdnUrl: string; sourceUrl: string } | null>(null);

  // Single Unified Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Gallery Posters State
  const [customPosters, setCustomPosters] = useState<GalleryImageItem[]>([]);
  const [isAddPosterModalOpen, setIsAddPosterModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Festivals & Greetings');
  const [newCaption, setNewCaption] = useState('');
  const [newAltText, setNewAltText] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState('');
  const [newUrlInput, setNewUrlInput] = useState('');
  const [isSubmittingPoster, setIsSubmittingPoster] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // AI Auto-Fill State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

  const fetchPosters = async () => {
    try {
      const res = await galleryApi.getAll();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setCustomPosters(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load gallery posters:', e);
    }
  };

  useEffect(() => {
    fetchPosters();
  }, []);

  // Reset pagination whenever search query or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeSection, statusFilter]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        onRefreshOpportunities(),
        onRefreshTeam ? onRefreshTeam() : Promise.resolve(),
        fetchPosters(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setModalError('Please upload an image file under 10 MB.');
      return;
    }
    setModalError('');
    setNewFile(file);
    const localUrl = URL.createObjectURL(file);
    setNewPreviewUrl(localUrl);
    if (!newTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      setNewTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  // AI Auto-Fill Handler: Uses Zenemoo Admin & HR AI backend tokens and engine
  const handleAiGenerateSeo = async () => {
    if (!newTitle.trim()) {
      setAiFeedback({
        type: 'warning',
        message: 'Please enter a Poster Title above first so AI can generate tailored SEO metadata.',
      });
      return;
    }

    setIsGeneratingAi(true);
    setAiFeedback(null);

    try {
      const res = await galleryApi.generateSeo({
        title: newTitle.trim(),
        category: newCategory,
      });

      if (res.data && res.data.success && res.data.data) {
        const { caption, altText, tags } = res.data.data;
        if (caption) setNewCaption(caption);
        if (altText) setNewAltText(altText);
        if (tags) {
          setNewTags(Array.isArray(tags) ? tags.join(', ') : String(tags));
        }
        setAiFeedback({
          type: 'success',
          message: '✓ SEO Caption, Alt Text & Keywords generated by Zenemoo AI!',
        });
      } else {
        throw new Error((res.data as any)?.message || 'Failed to auto-generate SEO');
      }
    } catch (err: any) {
      console.warn('AI SEO generation warning:', err);
      // Smart contextual fallback
      const cleanTitle = newTitle.trim();
      const isFest = /festival|diwali|holi|eid|christmas|puja|new year|greeting|independence|republic/i.test(cleanTitle + ' ' + newCategory);
      const cap = isFest
        ? `Official ${cleanTitle} celebration and festival greetings poster published by Zenemoo AI Tech.`
        : `Official ${cleanTitle} digital asset published by Zenemoo AI Data Solutions under www.zenemoo.in.`;
      const alt = `${cleanTitle} - Zenemoo AI Platform`;
      const tgs = `${cleanTitle}, ${newCategory}, Zenemoo, AI Technology, Google Image SEO`;

      setNewCaption(cap);
      setNewAltText(alt);
      setNewTags(tgs);
      setAiFeedback({
        type: 'success',
        message: '✓ Smart SEO metadata applied successfully!',
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCreatePosterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setModalError('Poster title is required.');
      return;
    }
    if (!newFile && !newUrlInput.trim()) {
      setModalError('Please upload an image file or provide an image link.');
      return;
    }

    setIsSubmittingPoster(true);
    setModalError('');

    try {
      if (newFile) {
        const formData = new FormData();
        formData.append('file', newFile);
        formData.append('title', newTitle.trim());
        formData.append('category', newCategory);
        formData.append('caption', newCaption.trim());
        formData.append('altText', newAltText.trim() || newTitle.trim());
        formData.append('tags', newTags.trim());

        const res = await galleryApi.create(formData);
        if (res.data && res.data.success) {
          setIsAddPosterModalOpen(false);
          setNewFile(null);
          setNewPreviewUrl('');
          setNewUrlInput('');
          setNewTitle('');
          setNewCaption('');
          setNewAltText('');
          setNewTags('');
          setAiFeedback(null);
          await fetchPosters();
        } else {
          throw new Error(res.data?.message || 'Failed to save poster');
        }
      } else {
        const payload = {
          title: newTitle.trim(),
          category: newCategory,
          imageUrl: newUrlInput.trim(),
          caption: newCaption.trim(),
          altText: newAltText.trim() || newTitle.trim(),
          tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        };
        const res = await galleryApi.create(payload);
        if (res.data && res.data.success) {
          setIsAddPosterModalOpen(false);
          setNewUrlInput('');
          setNewTitle('');
          setNewCaption('');
          setNewAltText('');
          setNewTags('');
          setAiFeedback(null);
          await fetchPosters();
        } else {
          throw new Error(res.data?.message || 'Failed to save poster');
        }
      }
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || 'Error saving poster.');
    } finally {
      setIsSubmittingPoster(false);
    }
  };

  const handleDeletePoster = async (id: string) => {
    try {
      const res = await galleryApi.delete(id);
      if (res.data && res.data.success) {
        setCustomPosters((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirmId(null);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
    }
  };

  // Opportunities with posters
  const oppsWithPosters = useMemo(() => {
    return opportunities.filter((o) => !!o.poster_url);
  }, [opportunities]);

  // Team members with photos
  const teamWithPhotos = useMemo(() => {
    return teamMembers.filter((m) => !!m.image_url || !!(m as any).image || !!(m as any).photo);
  }, [teamMembers]);

  // ── UNIFIED MIXED COLLECTION (Recent On Top - Strictly Live Admin-Added & Database Assets) ──
  const allUnifiedAssets: UnifiedSitemapItem[] = useMemo(() => {
    const list: UnifiedSitemapItem[] = [];

    // 1. Custom Posters & Festival Banners (Added from Admin Panel)
    customPosters.forEach((p) => {
      if (!p || (!p.image_url && !p.cdn_url)) return;
      const cdnUrl = p.cdn_url || toBrandedCdnUrl(p.image_url);
      const sourceUrl = toCloudinaryDirectUrl(p.image_url || p.cdn_url);
      const parsedTime = p.created_at ? new Date(p.created_at).getTime() : Date.now();

      list.push({
        id: `poster_${p.id}`,
        kind: 'poster',
        title: p.title,
        categoryLabel: p.category || 'Festivals & Greetings',
        cdnUrl,
        sourceUrl,
        altText: p.alt_text || p.title,
        caption: p.caption || `Official ${p.category} poster banner by Zenemoo.`,
        tags: p.tags,
        createdAt: isNaN(parsedTime) ? Date.now() : parsedTime,
        dateFormatted: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent Poster',
        posterId: p.id,
      });
    });

    // 2. Program Opportunities Posters
    oppsWithPosters.forEach((opp, idx) => {
      const cdnUrl = toBrandedCdnUrl(opp.poster_url);
      const sourceUrl = toCloudinaryDirectUrl(opp.poster_url);
      const parsedTime = opp.created_at ? new Date(opp.created_at).getTime() : 1700000000000 - idx * 100000;
      const publicCode = opp.public_id || (opp as any).project_code ? `[${opp.public_id || (opp as any).project_code}] ` : '';

      list.push({
        id: `opp_${opp.id}`,
        kind: 'opportunity',
        title: `${publicCode}${opp.title}`,
        categoryLabel: 'Opportunity Banner',
        cdnUrl,
        sourceUrl,
        altText: `${publicCode}${opp.title} — Official Project Poster | Zenemoo`,
        caption: opp.description || `Official program opportunity poster for ${opp.title}.`,
        statusBadge: opp.status,
        createdAt: isNaN(parsedTime) ? 1700000000000 : parsedTime,
        dateFormatted: opp.created_at ? new Date(opp.created_at).toLocaleDateString() : 'Active Opportunity',
        actionUrl: `/opportunity/${opp.id}`,
        actionLabel: 'View Opportunity',
      });
    });

    // 3. Team Member Official Portraits
    teamWithPhotos.forEach((m, idx) => {
      const rawImg = m.image_url || (m as any).image || (m as any).photo;
      if (!rawImg) return;
      const cdnUrl = toBrandedCdnUrl(rawImg);
      const sourceUrl = toCloudinaryDirectUrl(rawImg);
      const parsedTime = (m as any).created_at ? new Date((m as any).created_at).getTime() : 1690000000000 - idx * 100000;
      const slug = m.slug || getSlugFromName(m.name);

      list.push({
        id: `team_${m.id}`,
        kind: 'team',
        title: `${m.name} — ${m.designation || 'Specialist'}`,
        categoryLabel: m.department ? `Team • ${m.department}` : 'Team Portrait',
        cdnUrl,
        sourceUrl,
        altText: `Official portrait of ${m.name}, ${m.designation || 'Team Member'} at Zenemoo.`,
        caption: m.bio || `${m.name} is a specialist in Zenemoo AI Language & Data Operations.`,
        createdAt: isNaN(parsedTime) ? 1690000000000 : parsedTime,
        dateFormatted: 'Team Portrait',
        actionUrl: `/team/${slug}`,
        actionLabel: 'View Profile',
      });
    });

    // ── STRICT SORT: WHICH ONE ADD RECENT SHOWS TOP ──
    list.sort((a, b) => b.createdAt - a.createdAt);

    return list;
  }, [customPosters, oppsWithPosters, teamWithPhotos]);

  // Filter mixed assets based on selected tab and search query
  const filteredUnifiedAssets = useMemo(() => {
    return allUnifiedAssets.filter((item) => {
      // 1. Tab Kind Filter
      if (activeSection === 'posters' && item.kind !== 'poster') return false;
      if (activeSection === 'opportunities' && item.kind !== 'opportunity') return false;
      if (activeSection === 'team' && item.kind !== 'team') return false;

      // 2. Status Filter
      if (statusFilter !== 'all' && item.statusBadge && item.statusBadge !== statusFilter) {
        return false;
      }

      // 3. Search Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchCaption = (item.caption || '').toLowerCase().includes(q);
      const matchCategory = (item.categoryLabel || '').toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchCaption || matchCategory || matchTags;
    });
  }, [allUnifiedAssets, activeSection, statusFilter, searchQuery]);

  // Single Pagination Slices
  const totalPages = Math.ceil(filteredUnifiedAssets.length / pageSize) || 1;
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnifiedAssets.slice(start, start + pageSize);
  }, [filteredUnifiedAssets, currentPage, pageSize]);

  const totalSitemapImages = allUnifiedAssets.length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 w-full max-w-full overflow-hidden">
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1222] via-[#090d19] to-[#04060c] border border-cyan-500/20 shadow-xl shadow-cyan-950/20 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Unified Edge CDN &amp; Google Image Sitemap</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-white flex items-center gap-2.5 truncate">
              <ImageIcon className="w-6 h-6 sm:w-7 h-7 text-cyan-400 shrink-0" />
              <span className="truncate">Image Sitemap &amp; Branded CDN</span>
            </h1>
            <p className="text-xs font-mono text-slate-400 max-w-3xl leading-relaxed">
              All visual media assets (posters, festival greetings, opportunity banners, team portraits, brand marks) are unified in a single sitemap directory under <span className="text-cyan-300">https://www.zenemoo.in/cdn/...</span> with recent items displayed first.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <button
              onClick={() => {
                setModalError('');
                setAiFeedback(null);
                setIsAddPosterModalOpen(true);
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add SEO Poster</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh all assets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Refresh</span>
            </button>

            <a
              href="/image-sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <FileCode className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Open Live Sitemap</span>
              <span className="sm:hidden">Sitemap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. STATS & METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">Total Mixed Media</span>
            <ImageIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">{totalSitemapImages}</div>
          <p className="text-[10px] font-mono text-slate-400 truncate">Posters, Opportunities &amp; Team</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">Custom SEO Posters</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
            {customPosters.length}
          </div>
          <p className="text-[10px] font-mono text-emerald-400/80 truncate">Indexed under /images</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">Opportunity Posters</span>
            <Briefcase className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
            {oppsWithPosters.length}
          </div>
          <p className="text-[10px] font-mono text-cyan-400/80 truncate">Indexed under /opportunity/...</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">Team Member Photos</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
            {teamWithPhotos.length}
          </div>
          <p className="text-[10px] font-mono text-purple-400/80 truncate">Indexed under /team/...</p>
        </div>
      </div>

      {/* 3. SECTION SELECTOR TABS & SEARCH */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#0a0f1d] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Section Tabs with horizontal scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Assets</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {allUnifiedAssets.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSection('posters')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === 'posters'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Posters &amp; Gallery</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {customPosters.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSection('opportunities')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === 'opportunities'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Opportunities</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {oppsWithPosters.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSection('team')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSection === 'team'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
              {teamWithPhotos.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, name, tag..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. UNIFIED ASSET DIRECTORY (SINGLE LIST WITH RECENT ON TOP + SINGLE PAGINATION) */}
      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#070a14] overflow-hidden shadow-2xl">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0e1c] flex-wrap gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 sm:w-5 h-5 text-cyan-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold font-mono text-white truncate">
              Unified Media Assets ({filteredUnifiedAssets.length})
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              <Clock className="w-3 h-3" /> Recent First
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => {
                setModalError('');
                setAiFeedback(null);
                setIsAddPosterModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Poster</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredUnifiedAssets.length === 0 ? (
          <div className="p-10 sm:p-14 text-center space-y-3">
            <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-sm font-mono font-bold text-white">No visual assets found</h4>
            <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
              No media matches your search query or filter. Try clearing your search keyword or switching tabs.
            </p>
            <button
              onClick={() => {
                setActiveSection('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* Unified Rows */}
            <div className="divide-y divide-white/5">
              {paginatedAssets.map((item) => {
                const isCustomPoster = item.kind === 'poster';

                // Badge styling depending on kind
                let kindBadgeClass = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
                let kindIcon = <Briefcase className="w-3 h-3" />;
                let kindName = 'Opportunity';

                if (item.kind === 'poster') {
                  kindBadgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                  kindIcon = <Sparkles className="w-3 h-3" />;
                  kindName = 'Custom Poster';
                } else if (item.kind === 'team') {
                  kindBadgeClass = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
                  kindIcon = <Users className="w-3 h-3" />;
                  kindName = 'Team Portrait';
                }

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 w-full md:w-auto">
                      {/* Zoomable Thumbnail */}
                      <div
                        onClick={() =>
                          setPreviewModalImage({
                            url: item.cdnUrl,
                            title: item.title,
                            cdnUrl: item.cdnUrl,
                            sourceUrl: item.sourceUrl,
                          })
                        }
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 cursor-pointer group/thumb shadow-md"
                      >
                        <img
                          src={item.cdnUrl}
                          alt={item.altText || item.title}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = item.sourceUrl;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Kind Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${kindBadgeClass}`}>
                            {kindIcon}
                            <span>{kindName}</span>
                          </span>

                          {/* Specific Category Pill */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/5 text-slate-300 border border-white/10">
                            {item.categoryLabel}
                          </span>

                          {/* Status Badge */}
                          {item.statusBadge && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              item.statusBadge === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {item.statusBadge}
                            </span>
                          )}

                          {/* Date text */}
                          <span className="text-[10px] font-mono text-slate-500">
                            {item.dateFormatted}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white font-mono truncate">{item.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1">{item.caption}</p>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {item.tags.slice(0, 4).map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/5 text-slate-400">
                                #{t}
                              </span>
                            ))}
                            {item.tags.length > 4 && (
                              <span className="text-[9px] font-mono text-slate-500">+{item.tags.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: CDN Box & Actions */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 md:pt-0">
                      {/* Branded CDN Copy Box */}
                      <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-cyan-500/30 font-mono text-xs w-full sm:w-auto">
                        <span className="text-cyan-400 text-[10px] font-bold">CDN:</span>
                        <span className="truncate text-slate-300 text-[11px] select-all flex-1 sm:max-w-[200px]">
                          {item.cdnUrl}
                        </span>
                        <button
                          onClick={() => handleCopy(item.cdnUrl, `cdn-${item.id}`)}
                          className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer shrink-0"
                          title="Copy Branded CDN Link"
                        >
                          {copiedId === `cdn-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={item.cdnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-white/5 text-slate-300 hover:bg-white/10 shrink-0"
                          title="Open CDN URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Action Button: Live Page or Delete */}
                      {isCustomPoster && item.posterId ? (
                        deleteConfirmId === item.posterId ? (
                          <div className="flex items-center justify-end gap-1 bg-red-950/80 p-1 rounded-xl border border-red-500/40">
                            <span className="text-[10px] font-mono text-red-300 px-1">Delete?</span>
                            <button
                              onClick={() => handleDeletePoster(item.posterId!)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-mono font-bold cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px] font-mono cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(item.posterId!)}
                            className="self-end sm:self-center p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                            title="Delete Poster"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      ) : item.actionUrl ? (
                        <a
                          href={item.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white font-mono text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{item.actionLabel || 'View'}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Exactly ONE Unified Pagination Bar */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUnifiedAssets.length}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              itemLabel="indexed assets"
            />
          </>
        )}
      </div>

      {/* 5. ADD NEW POSTER MODAL WITH ZENEMOO ADMIN AI AUTO-FILL */}
      {isAddPosterModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsAddPosterModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#0a0f1d] border border-cyan-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3.5 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    SEO CDN ENGINE
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                  Add SEO Poster or Festival Banner
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  Uploaded to Cloudinary • Served via /cdn/... • Auto-indexed in /image-sitemap.xml
                </p>
              </div>
              <button
                onClick={() => setIsAddPosterModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePosterSubmit} className="space-y-4">
              {/* Field 1 & 2: Title & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 font-bold">
                    Poster Title <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value);
                      if (!newAltText) setNewAltText(e.target.value);
                    }}
                    placeholder="e.g. Zenemoo Happy Diwali 2026 Wishes"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 font-bold">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Festivals & Greetings">Festivals &amp; Greetings</option>
                    <option value="Official Badges & Certifications">Official Badges &amp; Certifications</option>
                    <option value="Brand Graphics">Brand Graphics</option>
                    <option value="Campaigns & Events">Campaigns &amp; Events</option>
                  </select>
                </div>
              </div>

              {/* Field 3: Image Input Selection: File Upload or Direct Link */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 font-bold flex items-center justify-between">
                  <span>Image Source (File or Link)</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, WEBP under 10MB</span>
                </label>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 px-4 py-3 border-2 border-dashed border-cyan-500/40 hover:border-cyan-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono text-cyan-300 font-bold truncate">
                        {newFile ? newFile.name : 'Choose Poster Image File'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <div className="flex-1 h-px bg-white/10" />
                    <span>OR PASTE CLOUDINARY LINK</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <input
                    type="url"
                    value={newUrlInput}
                    onChange={(e) => {
                      setNewUrlInput(e.target.value);
                      if (e.target.value) setNewPreviewUrl(e.target.value);
                    }}
                    placeholder="https://res.cloudinary.com/... or /cdn/..."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Preview Thumbnail */}
              {newPreviewUrl && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
                  <img
                    src={newPreviewUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-cyan-500/30 shrink-0"
                  />
                  <div className="flex-1 min-w-0 font-mono text-[11px] space-y-0.5">
                    <p className="text-cyan-300 font-bold truncate">Image Ready for Upload</p>
                    <p className="text-slate-400 truncate text-[10px]">
                      Will map to: https://www.zenemoo.in/cdn/...
                    </p>
                  </div>
                </div>
              )}

              {/* ✨ ZENEMOO ADMIN & HR AI AUTO-FILL SECTION (Directly below Image Source #3) */}
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-blue-950/40 border border-cyan-500/30 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-white">Zenemoo AI SEO Assistant</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Admin AI
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">
                        Auto-generate Google Image-ranked caption, alt text & keywords from Title &amp; Category.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAiGenerateSeo}
                    disabled={isGeneratingAi}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-mono text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>Auto-Fill with AI</span>
                      </>
                    )}
                  </button>
                </div>

                {aiFeedback && (
                  <div
                    className={`text-[11px] font-mono px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                      aiFeedback.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {aiFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span>{aiFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Caption & Alt Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 font-bold">SEO Caption / Description</label>
                  <textarea
                    rows={2}
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Official festival greeting poster by Zenemoo AI Tech..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 font-bold">Alt Text &amp; Keywords</label>
                  <textarea
                    rows={2}
                    value={newAltText}
                    onChange={(e) => setNewAltText(e.target.value)}
                    placeholder="Keywords for Google Image SEO ranking..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 font-bold">SEO Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Diwali, Festival, Zenemoo, AI Technology"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddPosterModalOpen(false)}
                  disabled={isSubmittingPoster}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPoster}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-mono text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPoster ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading to CDN &amp; Sitemap...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Confirm &amp; Publish Poster</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL IMAGE ZOOM VIEWER */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#090d19] border border-cyan-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold font-mono text-white truncate max-w-xl">
                {previewModalImage.title}
              </h3>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-hidden flex items-center justify-center bg-black/60 rounded-xl sm:rounded-2xl border border-white/10 p-2">
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                onError={(e) => {
                  e.currentTarget.src = previewModalImage.sourceUrl;
                }}
                className="max-h-[56vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Branded CDN URL:</span>
                <button
                  onClick={() => handleCopy(previewModalImage.cdnUrl, 'modal-cdn')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'modal-cdn' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'modal-cdn' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-cyan-300 truncate select-all">{previewModalImage.cdnUrl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
