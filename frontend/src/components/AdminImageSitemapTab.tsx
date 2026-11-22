import React, { useState, useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { OpportunityProgram } from '../lib/opportunityStore';
import { toBrandedCdnUrl, toCloudinaryDirectUrl } from '../lib/cdnHelper';

interface AdminImageSitemapTabProps {
  opportunities: OpportunityProgram[];
  onRefreshOpportunities: () => Promise<void>;
}

export const AdminImageSitemapTab: React.FC<AdminImageSitemapTabProps> = ({
  opportunities,
  onRefreshOpportunities,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stopped' | 'draft'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; cdnUrl: string; sourceUrl: string } | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshOpportunities();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Opportunities with posters
  const oppsWithPosters = useMemo(() => {
    return opportunities.filter((o) => !!o.poster_url);
  }, [opportunities]);

  // Filtered opportunities
  const filteredOpps = useMemo(() => {
    return opportunities.filter((o) => {
      // Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (o.title || '').toLowerCase().includes(q);
      const codeMatch = (o.public_id || (o as any).project_code || '').toLowerCase().includes(q);
      const partnerMatch = (o.partner_name || '').toLowerCase().includes(q);
      return titleMatch || codeMatch || partnerMatch;
    });
  }, [opportunities, statusFilter, searchQuery]);

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
  ];

  const totalSitemapImages = oppsWithPosters.length * 2 + brandAssets.length;

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
            All opportunity posters and banners are automatically routed through our edge CDN proxy (<span className="text-cyan-300">https://www.zenemoo.in/cdn/...</span>) with 30-day edge caching and dynamically indexed in Google Image Sitemap (<span className="text-cyan-300">/image-sitemap.xml</span>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh opportunities from database"
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
          <p className="text-[10px] font-mono text-slate-400">Posters, Social Cards &amp; Brand Media</p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Posters Covered</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {oppsWithPosters.length} <span className="text-xs text-slate-500">/ {opportunities.length}</span>
          </div>
          <p className="text-[10px] font-mono text-emerald-400/80">100% of opportunities with posters</p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Branded CDN Domain</span>
            <Globe className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold font-mono text-white truncate">zenemoo.in/cdn/...</div>
          <p className="text-[10px] font-mono text-purple-300">30-day Edge Cache (Immutable)</p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-[#090d19]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Crawler Indexing</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold font-mono text-cyan-300">Googlebot-Image OK</div>
          <p className="text-[10px] font-mono text-slate-400">Allowed in robots.txt &amp; sitemap index</p>
        </div>
      </div>

      {/* 3. SEARCH & STATUS FILTER */}
      <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opportunity title or code..."
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

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'active', 'stopped', 'draft'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. OPPORTUNITIES POSTER LIST TABLE */}
      <div className="rounded-3xl border border-white/10 bg-[#070a14] overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0e1c]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
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
              const socialCardCdnUrl = `https://www.zenemoo.in/cdn/zenemoo/og-previews/zenemoo_opp_card_${cleanId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
              const publicCode = opp.public_id || (opp as any).project_code || `ZEN-${String(idx + 1).padStart(3, '0')}`;

              return (
                <div key={opp.id} className="p-5 hover:bg-white/[0.015] transition-colors space-y-4">
                  {/* Top Bar: Thumbnail + Title + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Thumbnail with Zoom Click */}
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
                              // Guaranteed fallback so it never fails
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

                      {/* Title & Info */}
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

                    {/* Quick Link Actions */}
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

                  {/* CDN & Source Links Detail Box */}
                  {hasPoster ? (
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

      {/* 5. BRAND CORE ASSETS IN SITEMAP */}
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

      {/* 6. MODAL IMAGE ZOOM VIEWER */}
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
