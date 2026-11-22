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

export const AdminImageSitemapTab: React.FC<AdminImageSitemapTabProps> = ({
  opportunities,
  teamMembers = [],
  onRefreshOpportunities,
  onRefreshTeam,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'posters' | 'opportunities' | 'team' | 'brand'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stopped' | 'draft'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; cdnUrl: string; sourceUrl: string } | null>(null);

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

  // Filtered opportunities
  const filteredOpps = useMemo(() => {
    return opportunities.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (o.title || '').toLowerCase().includes(q);
      const codeMatch = (o.public_id || (o as any).project_code || '').toLowerCase().includes(q);
      const partnerMatch = (o.partner_name || '').toLowerCase().includes(q);
      return titleMatch || codeMatch || partnerMatch;
    });
  }, [opportunities, statusFilter, searchQuery]);

  // Filtered team members
  const filteredTeam = useMemo(() => {
    return teamMembers.filter((m) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (m.name || '').toLowerCase().includes(q);
      const roleMatch = (m.designation || (m as any).role || '').toLowerCase().includes(q);
      const deptMatch = (m.department || '').toLowerCase().includes(q);
      const empIdMatch = ((m as any).employee_id || '').toLowerCase().includes(q);
      return nameMatch || roleMatch || deptMatch || empIdMatch;
    });
  }, [teamMembers, searchQuery]);

  // Static site brand assets included in image-sitemap.xml
  const brandAssets = [
    {
      title: 'Zenemoo Official Logo (Primary)',
      type: 'Brand Identity',
      pageUrl: 'https://www.zenemoo.in/',
      cdnUrl: 'https://www.zenemoo.in/assets/logo.png',
      sourceUrl: 'https://www.zenemoo.in/assets/logo.png',
      caption: 'Official Brand Logo for Zenemoo (Formerly QuantumCoders Data Solution)',
    },
    {
      title: 'Official UDYAM MSME Registration QR Code',
      type: 'Govt Verification',
      pageUrl: 'https://www.zenemoo.in/',
      cdnUrl: 'https://www.zenemoo.in/assets/udyam-qr.png',
      sourceUrl: 'https://www.zenemoo.in/assets/udyam-qr.png',
      caption: 'Zenemoo Official Government MSME Registration Verification QR Code',
    },
    {
      title: 'Zenemoo Opportunities Portal Banner',
      type: 'Portal Asset',
      pageUrl: 'https://www.zenemoo.in/opportunities',
      cdnUrl: 'https://www.zenemoo.in/assets/logo.png',
      sourceUrl: 'https://www.zenemoo.in/assets/logo.png',
      caption: 'AI Data Annotation, Audio Recording & Speech Evaluation Project Opportunities',
    },
    {
      title: 'Zenemoo Team Directory Portal Header',
      type: 'Portal Asset',
      pageUrl: 'https://www.zenemoo.in/team-directory',
      cdnUrl: 'https://www.zenemoo.in/assets/logo.png',
      sourceUrl: 'https://www.zenemoo.in/assets/logo.png',
      caption: 'Zenemoo Official Team Directory — Specialized AI Language & Data Operations',
    },
  ];

  // Filtered gallery posters
  const filteredPosters = useMemo(() => {
    return customPosters.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (p.title || '').toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q);
      const tagMatch = (p.tags || []).some((t) => t.toLowerCase().includes(q));
      return titleMatch || catMatch || tagMatch;
    });
  }, [customPosters, searchQuery]);

  const totalSitemapImages = oppsWithPosters.length * 2 + teamWithPhotos.length + brandAssets.length + customPosters.length;

  return (
    <div className="space-y-8 pb-16">
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-[#0c1222] via-[#090d19] to-[#04060c] border border-cyan-500/20 shadow-xl shadow-cyan-950/20">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Edge CDN &amp; SEO Engine
          </div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2.5">
            <ImageIcon className="w-7 h-7 text-cyan-400" />
            Image Sitemap &amp; Branded CDN Manager
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-2xl leading-relaxed">
            All opportunity posters, banners, festival greetings, and team portraits are served directly under <span className="text-cyan-300">https://www.zenemoo.in/cdn/...</span> with 30-day edge caching and indexed in Google Image Sitemap (<span className="text-cyan-300">/image-sitemap.xml</span>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setModalError('');
              setIsAddPosterModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add SEO Poster / Image
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh assets from database"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <a
            href="/image-sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            Open Live image-sitemap.xml
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2. STATS & METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total Indexed Assets</span>
            <ImageIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalSitemapImages}</div>
          <p className="text-[10px] font-mono text-slate-400">Posters, Social Cards, Team &amp; Brand Media</p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Opportunity Posters</span>
            <Briefcase className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {oppsWithPosters.length} <span className="text-xs text-slate-500">/ {opportunities.length}</span>
          </div>
          <p className="text-[10px] font-mono text-cyan-400/80">Active in image-sitemap.xml</p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Team Member Portraits</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {teamWithPhotos.length} <span className="text-xs text-slate-500">/ {teamMembers.length}</span>
          </div>
          <p className="text-[10px] font-mono text-purple-400/80">Active team portraits on /cdn/...</p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Crawler Indexing</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold font-mono text-emerald-300">Googlebot-Image OK</div>
          <p className="text-[10px] font-mono text-slate-400">Allowed in robots.txt &amp; sitemap index</p>
        </div>
      </div>

      {/* 3. SECTION SELECTOR TABS & SEARCH */}
      <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Assets
          </button>
          <button
            onClick={() => setActiveSection('posters')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'posters'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Posters &amp; Gallery ({customPosters.length})
          </button>
          <button
            onClick={() => setActiveSection('opportunities')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'opportunities'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Opportunity Posters ({oppsWithPosters.length})
          </button>
          <button
            onClick={() => setActiveSection('team')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'team'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Team Members ({teamWithPhotos.length})
          </button>
          <button
            onClick={() => setActiveSection('brand')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'brand'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Brand Assets ({brandAssets.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, title, or code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50"
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

      {/* 4. CUSTOM POSTERS & FESTIVAL BANNERS SECTION */}
      {(activeSection === 'all' || activeSection === 'posters') && (
        <div className="rounded-3xl border border-emerald-500/20 bg-[#070e14] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0b181b]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono text-white">
                Custom SEO Posters &amp; Festival Banners ({filteredPosters.length})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-emerald-300 hidden sm:inline">
                Indexed in /image-sitemap.xml under /images
              </span>
              <button
                onClick={() => {
                  setModalError('');
                  setIsAddPosterModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Poster
              </button>
            </div>
          </div>

          {filteredPosters.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ImageIcon className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm font-mono text-slate-400">No custom posters added yet.</p>
              <button
                onClick={() => {
                  setModalError('');
                  setIsAddPosterModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                Upload Festival Poster or Banner
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredPosters.map((poster) => {
                const cdnUrl = poster.cdn_url || toBrandedCdnUrl(poster.image_url);
                const sourceUrl = toCloudinaryDirectUrl(poster.image_url);

                return (
                  <div key={poster.id} className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between hover:bg-white/[0.02] transition-colors">
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        onClick={() =>
                          setPreviewModalImage({
                            url: cdnUrl,
                            title: poster.title,
                            cdnUrl,
                            sourceUrl,
                          })
                        }
                        className="relative w-16 h-16 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 cursor-pointer group/thumb"
                      >
                        <img
                          src={cdnUrl}
                          alt={poster.alt_text || poster.title}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = sourceUrl;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {poster.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {poster.created_at ? new Date(poster.created_at).toLocaleDateString() : 'Active'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white font-mono truncate">{poster.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1">{poster.caption || poster.alt_text}</p>
                      </div>
                    </div>

                    {/* Middle: Dual Links */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-cyan-500/30 font-mono text-xs max-w-sm">
                        <span className="text-cyan-400 text-[10px] font-bold">CDN:</span>
                        <span className="truncate text-slate-300 text-[11px] select-all max-w-[180px]">
                          {cdnUrl}
                        </span>
                        <button
                          onClick={() => handleCopy(cdnUrl, `cdn-${poster.id}`)}
                          className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer"
                          title="Copy Branded CDN Link"
                        >
                          {copiedId === `cdn-${poster.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={cdnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-white/5 text-slate-300 hover:bg-white/10"
                          title="Open CDN URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Delete Action */}
                      {deleteConfirmId === poster.id ? (
                        <div className="flex items-center gap-1 bg-red-950/80 p-1 rounded-xl border border-red-500/40">
                          <span className="text-[10px] font-mono text-red-300 px-1">Delete?</span>
                          <button
                            onClick={() => handleDeletePoster(poster.id)}
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
                          onClick={() => setDeleteConfirmId(poster.id)}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                          title="Delete Poster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TEAM MEMBERS & DIRECTORY PORTRAITS SECTION */}
      {(activeSection === 'all' || activeSection === 'team') && (
        <div className="rounded-3xl border border-purple-500/20 bg-[#070a14] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0e0c1f]">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold font-mono text-white">
                Team Member Portraits &amp; Profiles ({filteredTeam.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-purple-300">
              Live in Google Image Sitemap under /team/...
            </span>
          </div>

          {filteredTeam.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm font-mono text-slate-400">No team members match your search criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTeam.map((member) => {
                const rawImage = member.image_url || (member as any).image || (member as any).photo;
                const hasPhoto = !!rawImage;
                const brandedCdnUrl = hasPhoto ? toBrandedCdnUrl(rawImage) : '';
                const sourceCloudinaryUrl = hasPhoto ? toCloudinaryDirectUrl(rawImage) : '';
                const cleanSlug = member.slug || getSlugFromName(member.name);
                const publicProfileUrl = `/team/${cleanSlug}`;

                return (
                  <div key={member.id} className="p-5 hover:bg-white/[0.015] transition-colors space-y-4">
                    {/* Top Bar: Thumbnail + Name + Role */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Portrait Thumbnail with Zoom Click */}
                        {hasPhoto ? (
                          <div
                            onClick={() => setPreviewModalImage({
                              url: brandedCdnUrl,
                              title: `${member.name} (${member.designation || 'Specialist'})`,
                              cdnUrl: brandedCdnUrl,
                              sourceUrl: sourceCloudinaryUrl,
                            })}
                            className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/60 border border-purple-500/40 group cursor-pointer shrink-0 shadow-lg"
                          >
                            <img
                              src={brandedCdnUrl}
                              alt={member.name}
                              onError={(e) => {
                                e.currentTarget.src = sourceCloudinaryUrl || '/assets/executive.png';
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-purple-300" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <Users className="w-6 h-6 mb-1 opacity-50" />
                            <span className="text-[9px] font-mono">No Photo</span>
                          </div>
                        )}

                        {/* Name & Role Details */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm font-mono truncate">
                              {member.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {member.designation || (member as any).role || 'Team Member'}
                            </span>
                            {member.department && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">
                                {member.department}
                              </span>
                            )}
                            {(member as any).employee_id && (
                              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                                [{(member as any).employee_id}]
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 line-clamp-1">
                            {member.bio || 'Zenemoo AI Language & Data Team Specialist.'}
                          </p>
                        </div>
                      </div>

                      {/* Quick Profile Link */}
                      <div className="flex items-center gap-2 shrink-0 sm:self-center">
                        <a
                          href={publicProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-400" />
                          View Profile
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* CDN & Source Links Detail Box */}
                    {hasPhoto ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs">
                        {/* 1. Branded CDN Link */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Branded CDN URL (Google Image Indexed)
                            </span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              ✓ In image-sitemap.xml
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-cyan-500/30">
                            <span className="truncate text-slate-300 text-[11px] select-all flex-1">
                              {brandedCdnUrl}
                            </span>
                            <button
                              onClick={() => handleCopy(brandedCdnUrl, `team-cdn-${member.id}`)}
                              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 shrink-0 transition-all cursor-pointer"
                              title="Copy Branded CDN Link"
                            >
                              {copiedId === `team-cdn-${member.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={brandedCdnUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 shrink-0 transition-all"
                              title="Test Branded CDN Link in New Tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* 2. Original Cloudinary Source Link */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-bold flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-purple-400" /> Cloudinary Origin Source URL
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Storage Backend
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-white/10">
                            <span className="truncate text-slate-400 text-[11px] select-all flex-1">
                              {sourceCloudinaryUrl}
                            </span>
                            <button
                              onClick={() => handleCopy(sourceCloudinaryUrl, `team-src-${member.id}`)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 shrink-0 transition-all cursor-pointer"
                              title="Copy Cloudinary Direct Source URL"
                            >
                              {copiedId === `team-src-${member.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={sourceCloudinaryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 shrink-0 transition-all"
                              title="Open Direct Cloudinary Asset"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>This team member does not have a photo uploaded yet. Add an image in Team Management to automatically index it in Google Image Sitemap.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. OPPORTUNITIES POSTER LIST TABLE */}
      {(activeSection === 'all' || activeSection === 'opportunities') && (
        <div className="rounded-3xl border border-white/10 bg-[#070a14] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0e1c]">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-white">
                Program Opportunity Posters ({filteredOpps.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Showing posters included in Google Image Sitemap
            </span>
          </div>

          {filteredOpps.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm font-mono text-slate-400">No opportunities match your filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredOpps.map((opp, idx) => {
                const cleanId = String(opp.id || '').trim();
                const hasPoster = !!opp.poster_url;
                const brandedCdnUrl = hasPoster ? toBrandedCdnUrl(opp.poster_url) : '';
                const sourceCloudinaryUrl = hasPoster ? toCloudinaryDirectUrl(opp.poster_url) : '';
                const publicCode = opp.public_id || (opp as any).project_code || `ZEN-${String(idx + 1).padStart(3, '0')}`;

                return (
                  <div key={opp.id} className="p-5 hover:bg-white/[0.015] transition-colors space-y-4">
                    {/* Top Bar: Thumbnail + Title + Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {hasPoster ? (
                          <div
                            onClick={() => setPreviewModalImage({
                              url: brandedCdnUrl,
                              title: opp.title,
                              cdnUrl: brandedCdnUrl,
                              sourceUrl: sourceCloudinaryUrl,
                            })}
                            className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/60 border border-white/10 group cursor-pointer shrink-0 shadow-lg"
                          >
                            <img
                              src={brandedCdnUrl}
                              alt={opp.title}
                              onError={(e) => {
                                e.currentTarget.src = sourceCloudinaryUrl;
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-cyan-300" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-slate-900 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                            <span className="text-[9px] font-mono">No Poster</span>
                          </div>
                        )}

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              [{publicCode}]
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              opp.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : opp.status === 'stopped'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
                            }`}>
                              {opp.status}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Partner: <strong className="text-slate-300">{opp.partner_name || 'Zenemoo'}</strong>
                            </span>
                          </div>
                          <h4 className="text-sm font-bold font-mono text-white truncate max-w-xl">
                            {opp.title}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-400 line-clamp-1">
                            {opp.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 sm:self-center">
                        <a
                          href={`/opportunity/${cleanId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          Live Page
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {hasPoster ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Branded CDN URL (Google Image Indexed)
                            </span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              ✓ In image-sitemap.xml
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-cyan-500/30">
                            <span className="truncate text-slate-300 text-[11px] select-all flex-1">
                              {brandedCdnUrl}
                            </span>
                            <button
                              onClick={() => handleCopy(brandedCdnUrl, `cdn-${opp.id}`)}
                              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 shrink-0 transition-all cursor-pointer"
                              title="Copy Branded CDN Link"
                            >
                              {copiedId === `cdn-${opp.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={brandedCdnUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 shrink-0 transition-all"
                              title="Test Branded CDN Link in New Tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-bold flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-purple-400" /> Cloudinary Origin Source URL
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Storage Backend
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-white/10">
                            <span className="truncate text-slate-400 text-[11px] select-all flex-1">
                              {sourceCloudinaryUrl}
                            </span>
                            <button
                              onClick={() => handleCopy(sourceCloudinaryUrl, `src-${opp.id}`)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 shrink-0 transition-all cursor-pointer"
                              title="Copy Cloudinary Direct Source URL"
                            >
                              {copiedId === `src-${opp.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={sourceCloudinaryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 shrink-0 transition-all"
                              title="Open Direct Cloudinary Asset"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>This opportunity does not have a poster banner uploaded yet. Add a poster in the Opportunity Editor to automatically index it in Google Image Sitemap.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. BRAND CORE ASSETS IN SITEMAP */}
      {(activeSection === 'all' || activeSection === 'brand') && (
        <div className="rounded-3xl border border-white/10 bg-[#070a14] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/10 bg-[#0a0e1c] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold font-mono text-white">
                Core Brand Assets in Image Sitemap ({brandAssets.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Static &amp; verified legal identity assets indexed on Google
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {brandAssets.map((asset, i) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 p-1 shrink-0 flex items-center justify-center">
                    <img src={asset.cdnUrl} alt={asset.title} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-white">{asset.title}</span>
                      <span className="px-2 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {asset.type}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{asset.caption}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 hidden md:inline truncate max-w-xs">
                    {asset.cdnUrl}
                  </span>
                  <button
                    onClick={() => handleCopy(asset.cdnUrl, `brand-${i}`)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
                    title="Copy Brand Image URL"
                  >
                    {copiedId === `brand-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. ADD NEW POSTER MODAL */}
      {isAddPosterModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsAddPosterModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#0a0f1d] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    SEO CDN ENGINE
                  </span>
                </div>
                <h3 className="text-lg font-bold font-mono text-white mt-1">
                  Add SEO Poster or Festival Banner
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Uploaded to Cloudinary • Served via /cdn/... • Auto-indexed in /image-sitemap.xml
                </p>
              </div>
              <button
                onClick={() => setIsAddPosterModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
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
              {/* Title & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
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

                <div className="space-y-1.5">
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

              {/* Image Input Selection: File Upload or Direct Link */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 font-bold flex items-center justify-between">
                  <span>Image Source (File or Link)</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, WEBP under 10MB</span>
                </label>

                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 px-4 py-3 border-2 border-dashed border-cyan-500/40 hover:border-cyan-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono text-cyan-300 font-bold">
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

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
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
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                  <img
                    src={newPreviewUrl}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-xl border border-cyan-500/30"
                  />
                  <div className="flex-1 min-w-0 font-mono text-[11px] space-y-0.5">
                    <p className="text-cyan-300 font-bold truncate">Image Ready for Processing</p>
                    <p className="text-slate-400 truncate">
                      Will be mapped to: https://www.zenemoo.in/cdn/...
                    </p>
                  </div>
                </div>
              )}

              {/* Caption & Alt Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300 font-bold">SEO Caption / Description</label>
                  <textarea
                    rows={2}
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Official festival greeting poster by Zenemoo AI Tech..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddPosterModalOpen(false)}
                  disabled={isSubmittingPoster}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPoster}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-mono text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
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

      {/* 9. MODAL IMAGE ZOOM VIEWER */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#090d19] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
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

            <div className="max-h-[60vh] overflow-hidden flex items-center justify-center bg-black/60 rounded-2xl border border-white/10 p-2">
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                onError={(e) => {
                  e.currentTarget.src = previewModalImage.sourceUrl;
                }}
                className="max-h-[56vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs space-y-2">
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
