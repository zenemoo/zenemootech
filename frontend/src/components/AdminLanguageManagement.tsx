import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Users,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  X,
  AlertCircle,
  Tag,
  ShieldCheck,
  Mic,
  Award,
} from 'lucide-react';
import { talentRegistrationApi } from '../services/api';
import { normalizeLanguageKey, formatLanguageDisplayName, isSameLanguage } from '../utils/languageUtils';

interface AdminLanguageManagementProps {
  registrations?: any[];
  onRefreshRegistrations?: () => void;
}

export const AdminLanguageManagement: React.FC<AdminLanguageManagementProps> = ({
  registrations = [],
  onRefreshRegistrations,
}) => {
  const [languages, setLanguages] = useState<any[]>([]);
  const [allNetworkCandidates, setAllNetworkCandidates] = useState<any[]>(registrations);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLang, setEditingLang] = useState<any | null>(null);
  const [inputName, setInputName] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [inputStatus, setInputStatus] = useState<string>('active');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchLanguages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await talentRegistrationApi.adminGetSupportedLanguages();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setLanguages(res.data.data);
      }
    } catch (err) {
      console.error('Fetch languages error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const res = await talentRegistrationApi.adminGetNetworkAnalytics();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setAllNetworkCandidates(res.data.data);
      } else if (registrations.length > 0) {
        setAllNetworkCandidates(registrations);
      }
    } catch (err) {
      console.warn('Analytics candidate load fallback:', err);
      if (registrations.length > 0) {
        setAllNetworkCandidates(registrations);
      }
    } finally {
      setLoadingCandidates(false);
    }
  }, [registrations]);

  useEffect(() => {
    fetchLanguages();
    fetchAllCandidates();
  }, [fetchLanguages, fetchAllCandidates]);

  // Keep local allNetworkCandidates updated if prop changes and has more items
  useEffect(() => {
    if (registrations.length > allNetworkCandidates.length) {
      setAllNetworkCandidates(registrations);
    }
  }, [registrations, allNetworkCandidates.length]);

  // Compute live resource metrics per language from authentic candidate database using canonical key
  // Mutually distinct candidates per language (a person with Odia + Hindi counts 1 in Odia and 1 in Hindi)
  const langMetrics = useMemo(() => {
    const map = new Map<
      string,
      { resources: number; nativeCount: number; capacity: number }
    >();

    allNetworkCandidates.forEach((r) => {
      const seenLangsForCandidate = new Set<string>();

      (r.languages || []).forEach((l: any) => {
        const rawName = typeof l === 'string' ? l : (l?.language || '').trim();
        if (!rawName) return;

        const canonicalName = formatLanguageDisplayName(rawName);
        const key = normalizeLanguageKey(canonicalName);
        if (!key || key === 'other unspecified') return;

        // Count candidate once per language
        if (seenLangsForCandidate.has(key)) return;
        seenLangsForCandidate.add(key);

        const isNative =
          typeof l === 'object' &&
          ((l?.proficiency || '').toLowerCase().includes('native') ||
            (l?.speaker_availability || '').toLowerCase().includes('native'));

        const capVal = typeof l === 'object' ? Math.max(1, Number(l?.capacity) || 1) : 1;

        const existing = map.get(key) || { resources: 0, nativeCount: 0, capacity: 0 };
        existing.resources += 1;
        if (isNative) existing.nativeCount += 1;
        existing.capacity += capVal;
        map.set(key, existing);
      });
    });

    return map;
  }, [allNetworkCandidates]);

  // Combined Directory: Merge Official Supported Languages + Registered Custom Languages (Normalized & Deduplicated)
  const combinedDirectory = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Add Official Supported Languages
    languages.forEach((l) => {
      const formatted = formatLanguageDisplayName(l.language);
      const key = normalizeLanguageKey(formatted);
      if (!key) return;

      map.set(key, {
        id: l.id || `official_${key}`,
        language: formatted,
        code: (l.code || '').trim().toUpperCase(),
        status: l.status || 'active',
        source: 'Official',
        isOfficial: true,
      });
    });

    // 2. Add Registered Custom Languages present in candidates
    allNetworkCandidates.forEach((r) => {
      (r.languages || []).forEach((l: any) => {
        const rawName = typeof l === 'string' ? l : (l?.language || '').trim();
        if (!rawName) return;

        const formatted = formatLanguageDisplayName(rawName);
        const key = normalizeLanguageKey(formatted);
        if (!key || key === 'other unspecified') return;

        if (!map.has(key)) {
          map.set(key, {
            id: `custom_${key}`,
            language: formatted,
            code: '',
            status: 'active',
            source: 'Custom / Registered',
            isOfficial: false,
          });
        }
      });
    });

    return Array.from(map.values());
  }, [languages, allNetworkCandidates]);

  // Summary Metrics for Languages
  const languageSummaryStats = useMemo(() => {
    const totalUniqueLanguages = combinedDirectory.length;
    const activeLanguages = combinedDirectory.filter((l) => l.status === 'active').length;
    let totalResourceAssociations = 0;
    let totalNativeSpeakers = 0;
    let totalCapacity = 0;

    langMetrics.forEach((m) => {
      totalResourceAssociations += m.resources;
      totalNativeSpeakers += m.nativeCount;
      totalCapacity += m.capacity;
    });

    return {
      totalUniqueLanguages,
      activeLanguages,
      totalResourceAssociations,
      totalNativeSpeakers,
      totalCapacity,
    };
  }, [combinedDirectory, langMetrics]);

  // Combined and filtered language list with fuzzy search
  const filteredLanguages = useMemo(() => {
    let list = [...combinedDirectory];

    if (searchQuery.trim()) {
      const q = normalizeLanguageKey(searchQuery);
      list = list.filter(
        (l) =>
          normalizeLanguageKey(l.language).includes(q) ||
          (l.code || '').toLowerCase().includes(q) ||
          (l.source || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((l) => (l.status || 'active') === statusFilter);
    }

    list.sort((a, b) => a.language.localeCompare(b.language));
    return list;
  }, [combinedDirectory, searchQuery, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingLang(null);
    setInputName('');
    setInputCode('');
    setInputStatus('active');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lang: any) => {
    setEditingLang(lang);
    setInputName(lang.language);
    setInputCode(lang.code || '');
    setInputStatus(lang.status || 'active');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedName = formatLanguageDisplayName(inputName);
    const targetKey = normalizeLanguageKey(formattedName);

    if (!targetKey || targetKey === 'other unspecified') {
      return setFormError('Valid language name is required.');
    }

    // Enforce case-insensitive duplicate check
    const isDuplicate = combinedDirectory.some(
      (l) => (!editingLang || l.id !== editingLang.id) && normalizeLanguageKey(l.language) === targetKey
    );
    if (isDuplicate) {
      return setFormError(`Language "${formattedName}" already exists in the directory.`);
    }

    setIsSaving(true);
    setFormError('');

    try {
      if (editingLang && editingLang.isOfficial) {
        // Edit Official Language
        const res = await talentRegistrationApi.adminUpdateSupportedLanguage(editingLang.id, {
          language: formattedName,
          code: inputCode.trim().toUpperCase(),
          status: inputStatus,
        });
        if (res?.data?.success) {
          setSuccessMsg(`Language "${formattedName}" updated successfully.`);
          setIsModalOpen(false);
          fetchLanguages();
          setTimeout(() => setSuccessMsg(''), 3500);
        }
      } else {
        // Add Official Language
        const res = await talentRegistrationApi.adminAddSupportedLanguage({
          language: formattedName,
          code: inputCode.trim().toUpperCase(),
          status: inputStatus,
        });
        if (res?.data?.success) {
          setSuccessMsg(`Language "${formattedName}" added to official supported list.`);
          setIsModalOpen(false);
          fetchLanguages();
          setTimeout(() => setSuccessMsg(''), 3500);
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save language.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (lang: any) => {
    const nextStatus = lang.status === 'active' ? 'inactive' : 'active';
    try {
      if (lang.isOfficial) {
        const res = await talentRegistrationApi.adminUpdateSupportedLanguage(lang.id, {
          status: nextStatus,
        });
        if (res?.data?.success) {
          setSuccessMsg(`Language "${lang.language}" status changed to ${nextStatus.toUpperCase()}`);
          fetchLanguages();
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } else {
        // Promote custom language to official with toggled status
        const res = await talentRegistrationApi.adminAddSupportedLanguage({
          language: lang.language,
          code: lang.code || '',
          status: nextStatus,
        });
        if (res?.data?.success) {
          setSuccessMsg(`Language "${lang.language}" status changed to ${nextStatus.toUpperCase()}`);
          fetchLanguages();
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-[120] p-4 rounded-2xl bg-emerald-500/90 backdrop-blur-md text-black font-mono font-bold text-xs shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-black shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-purple-400" /> Language Intelligence &amp; Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Official Supported Languages Directory
          </h1>
          <p className="text-xs text-slate-400 font-mono max-w-2xl leading-relaxed">
            Manage official languages available for public AI talent registration. Each distinct language is normalized and deduplicated across all registered resources.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="w-full md:w-auto px-5 py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs font-mono flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-white" /> Add Supported Language
        </button>
      </div>

      {/* ── TOP METRICS CARDS ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Unique Languages</span>
            <Globe className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{languageSummaryStats.totalUniqueLanguages}</div>
          <div className="text-[10px] text-purple-400">Total Distinct Languages</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase font-bold">
            <span>Active For Signups</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300">{languageSummaryStats.activeLanguages}</div>
          <div className="text-[10px] text-emerald-500 font-bold">Registration Enabled</div>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-[10px] uppercase font-bold">
            <span>Resource Links</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300">{languageSummaryStats.totalResourceAssociations}</div>
          <div className="text-[10px] text-cyan-400 font-bold">Language Associations</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase font-bold">
            <span>Native Speakers</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300">{languageSummaryStats.totalNativeSpeakers}</div>
          <div className="text-[10px] text-emerald-500 font-bold">Mother Tongue Fluent</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-[10px] uppercase font-bold">
            <span>Total Capacity</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300">{languageSummaryStats.totalCapacity}</div>
          <div className="text-[10px] text-amber-500 font-bold">Recruitable Speakers</div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search language name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <button
            onClick={() => {
              fetchLanguages();
              fetchAllCandidates();
              if (onRefreshRegistrations) onRefreshRegistrations();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-400 cursor-pointer transition-colors"
            title="Refresh language list and candidate counts"
          >
            <RotateCcw className={`w-4 h-4 ${loading || loadingCandidates ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Languages Directory Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="p-4">Language Name</th>
                <th className="p-4 text-center">Language Code</th>
                <th className="p-4 text-center">Source</th>
                <th className="p-4 text-center">Registered Resources</th>
                <th className="p-4 text-center">Native Speakers</th>
                <th className="p-4 text-center">Total Capacity</th>
                <th className="p-4 text-center">Registration Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredLanguages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-mono">
                    No supported or registered languages found matching search parameters.
                  </td>
                </tr>
              ) : (
                filteredLanguages.map((item) => {
                  const key = normalizeLanguageKey(item.language);
                  const m = langMetrics.get(key) || { resources: 0, nativeCount: 0, capacity: 0 };
                  const isActive = item.status === 'active' || !item.status;

                  return (
                    <tr key={item.id || item.language} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="text-white font-bold flex items-center gap-2">
                          <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>{item.language}</span>
                        </div>
                      </td>

                      <td className="p-4 text-center font-mono text-slate-400">
                        {item.code ? (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-purple-300 font-bold">
                            {item.code}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isOfficial
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {item.source}
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-cyan-300">{m.resources}</td>

                      <td className="p-4 text-center font-bold text-emerald-400">{m.nativeCount}</td>

                      <td className="p-4 text-center font-bold text-amber-300">
                        {m.capacity > 0 ? m.capacity : '1'}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/40'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                            title={isActive ? 'Deactivate language' : 'Activate language'}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 transition-all cursor-pointer"
                            title="Edit language details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD / EDIT LANGUAGE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-md bg-[#0a0c14] border border-white/15 rounded-3xl p-6 space-y-6 font-mono text-xs text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>{editingLang ? 'Edit Supported Language' : 'Add Supported Language'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLanguage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Language Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mizo / Kui / Ho / Santali"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">ISO Language Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. lus / kui / ho"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Registration Availability Status</label>
                <select
                  value={inputStatus}
                  onChange={(e) => setInputStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-purple-400 cursor-pointer text-xs"
                >
                  <option value="active">Active (Appears in Registration Form)</option>
                  <option value="inactive">Inactive (Disabled for new signups)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingLang ? 'Update Language' : 'Save Language'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
