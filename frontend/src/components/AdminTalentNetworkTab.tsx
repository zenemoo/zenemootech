import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Archive,
  Download,
  Eye,
  FileText,
  MapPin,
  Globe,
  Phone,
  Mail,
  ShieldCheck,
  Award,
  Mic,
  RefreshCw,
  X,
  MessageSquare,
  Plus,
  Sliders,
  CheckSquare,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  AlertTriangle,
  UserCheck,
  Briefcase,
  Handshake,
  Building,
  RotateCcw,
  Sparkles,
  Layers,
  PieChart,
  BarChart2,
} from 'lucide-react';
import { talentRegistrationApi } from '../services/api';
import { AdminNetworkAnalytics } from './AdminNetworkAnalytics';

const INDIAN_STATES_UT = [
  'All States',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi (NCT)',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const LANGUAGES_LIST = [
  'All Languages',
  'Assamese',
  'Bengali',
  'Bodo',
  'Dogri',
  'English',
  'Gujarati',
  'Hindi',
  'Kannada',
  'Kashmiri',
  'Konkani',
  'Maithili',
  'Malayalam',
  'Manipuri',
  'Marathi',
  'Nepali',
  'Odia',
  'Punjabi',
  'Sanskrit',
  'Santali',
  'Sindhi',
  'Tamil',
  'Telugu',
  'Urdu',
];

const ROLES_LIST = [
  'All Roles',
  'Individual Participant',
  'Coordinator',
  'Speaker Recruiter',
  'Singer / Vocal Artist',
  'Recording Team',
  'Field Agent',
  'Vendor / Agency',
  'Community / Organization',
];

const WORK_TYPES_LIST = [
  'All Work Types',
  'Voice / Audio Recording',
  'Speech Data Collection',
  'Video Recording',
  'Image Collection',
  'Transcription',
  'Translation / Localization',
  'Data Annotation / Labeling',
  'AI / LLM Evaluation',
  'Human Feedback / RLHF',
  'Field Data Collection',
];

export const AdminTalentNetworkTab: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    verified: 0,
    pending: 0,
    coordinators: 0,
    vendors: 0,
    singers: 0,
    recordingTeams: 0,
    languageCoverageCount: 0,
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All Languages');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedRole, setSelectedRole] = useState<string>('All Roles');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('All Work Types');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [selectedMinCapacity, setSelectedMinCapacity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection & UI Modals
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [newAdminNote, setNewAdminNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Modals & Drawers
  const [isMobileFilterDrawerOpen, setIsMobileFilterDrawerOpen] = useState<boolean>(false);
  const [activeMenuCandidateId, setActiveMenuCandidateId] = useState<string | null>(null);
  const [deleteConfirmCandidate, setDeleteConfirmCandidate] = useState<{ id: string; name: string } | null>(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params: any = {
        search: searchQuery,
        language: selectedLanguage === 'All Languages' ? '' : selectedLanguage,
        state: selectedState === 'All States' ? '' : selectedState,
        role: selectedRole === 'All Roles' ? '' : selectedRole,
        workType: selectedWorkType === 'All Work Types' ? '' : selectedWorkType,
        availability: selectedAvailability === 'all' ? '' : selectedAvailability,
        minCapacity: selectedMinCapacity === 'all' ? '' : selectedMinCapacity,
        status: selectedStatus === 'all' ? '' : selectedStatus,
        isArchived: showArchived ? 'true' : 'false',
      };

      const res = await talentRegistrationApi.getAdminRegistrations(params);
      if (res?.data?.success) {
        const fetchedData = res.data.data || [];
        setRegistrations(fetchedData);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Fetch Registrations Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Analytics & Roster State
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);

  const fetchAllRegistrations = async () => {
    try {
      const res = await talentRegistrationApi.getAdminRegistrations({});
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setAllRegistrations(res.data.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchAllRegistrations();
  }, []);

  const handleAnalyticsFilterSelect = (filterType: string, value: string) => {
    if (filterType === 'language') {
      setSelectedLanguage(value);
      setActionSuccessMsg(`Filtered Talent Network by Language: ${value}`);
    } else if (filterType === 'role') {
      setSelectedRole(value);
      setActionSuccessMsg(`Filtered Talent Network by Role: ${value}`);
    } else if (filterType === 'state') {
      setSelectedState(value);
      setActionSuccessMsg(`Filtered Talent Network by State: ${value}`);
    } else if (filterType === 'availability') {
      setSelectedAvailability(value);
      setActionSuccessMsg(`Filtered Talent Network by Availability: ${value}`);
    } else if (filterType === 'workType') {
      setSelectedWorkType(value);
      setActionSuccessMsg(`Filtered Talent Network by Work Type: ${value}`);
    } else if (filterType === 'status') {
      setSelectedStatus(value);
      setActionSuccessMsg(`Filtered Talent Network by Status: ${value.toUpperCase()}`);
    }
    setShowAnalytics(false);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  useEffect(() => {
    fetchRegistrations();
  }, [
    searchQuery,
    selectedLanguage,
    selectedState,
    selectedRole,
    selectedWorkType,
    selectedAvailability,
    selectedMinCapacity,
    selectedStatus,
    showArchived,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedLanguage,
    selectedState,
    selectedRole,
    selectedWorkType,
    selectedAvailability,
    selectedMinCapacity,
    selectedStatus,
    showArchived,
    pageSize,
  ]);

  // Dynamic Statistics Calculation from Database Records
  const computedStats = useMemo(() => {
    const total = registrations.length || stats.total || 0;
    const verified = registrations.filter((r) => r.status === 'verified').length;
    const pending = registrations.filter((r) => r.status === 'pending' || !r.status).length;
    const coordinators = registrations.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('coordinator') || roleStr.includes('recruiter');
    }).length;
    const vendors = registrations.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('vendor') || roleStr.includes('agency') || roleStr.includes('organization');
    }).length;
    const singers = registrations.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('singer') || roleStr.includes('vocal');
    }).length;
    const recordingTeams = registrations.filter((r) => {
      const roleStr = (r.primary_role || '').toLowerCase();
      return roleStr.includes('recording') || roleStr.includes('team');
    }).length;

    // Unique languages count
    const langSet = new Set<string>();
    registrations.forEach((r) => {
      (r.languages || []).forEach((l: any) => {
        if (l.language) langSet.add(l.language);
      });
    });

    return {
      total: total || stats.total || 0,
      verified: verified || stats.verified || 0,
      pending: pending || stats.pending || 0,
      coordinators: coordinators || stats.coordinators || 0,
      vendors: vendors || stats.vendors || 0,
      singers: singers || stats.singers || 0,
      recordingTeams: recordingTeams || stats.recordingTeams || 0,
      languages: langSet.size || stats.languageCoverageCount || 8,
    };
  }, [registrations, stats]);

  // Filtered & Sorted Candidate Records
  const filteredAndSortedCandidates = useMemo(() => {
    let result = [...registrations];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const roleDetailsText = typeof r.role_details === 'object' ? JSON.stringify(r.role_details) : String(r.role_details || '');
        const equipmentText = typeof r.equipment_resources === 'object' ? JSON.stringify(r.equipment_resources) : String(r.equipment_resources || '');
        const addInfoText = typeof r.additional_info === 'object' ? JSON.stringify(r.additional_info) : String(r.additional_info || '');
        const expList = Array.isArray(r.experiences) ? r.experiences : [];
        const expText = expList.map((e: any) => `${e.project_company_name || e.projectName || ''} ${e.type_of_work || e.typeOfWork || ''} ${e.description || ''}`).join(' ');
        const langList = Array.isArray(r.languages) ? r.languages : [];
        const langText = langList.map((l: any) => typeof l === 'string' ? l : `${l.language || ''} ${l.proficiency || ''} ${l.speaker_availability || ''}`).join(' ');
        const capsList = Array.isArray(r.work_capabilities) ? r.work_capabilities : [];
        const capsText = capsList.join(' ');

        const searchableString = `${r.full_name || ''} ${r.email || ''} ${r.phone || ''} ${r.country_code || ''} ${r.state || ''} ${r.city_district || ''} ${r.primary_role || ''} ${r.registration_code || ''} ${r.id || ''} ${roleDetailsText} ${equipmentText} ${addInfoText} ${expText} ${langText} ${capsText}`.toLowerCase();
        return searchableString.includes(q);
      });
    }

    // Language Filter
    if (selectedLanguage !== 'All Languages' && selectedLanguage.toLowerCase() !== 'all') {
      const targetLang = selectedLanguage.toLowerCase().trim();
      result = result.filter((r) => {
        const langList = Array.isArray(r.languages) ? r.languages : [];
        return langList.some((l: any) => {
          const lName = (typeof l === 'string' ? l : (l?.language || '')).toLowerCase();
          return lName.includes(targetLang) || targetLang.includes(lName);
        });
      });
    }

    // State Filter
    if (selectedState !== 'All States' && selectedState.toLowerCase() !== 'all') {
      const targetState = selectedState.toLowerCase().replace(/\([^)]*\)/g, '').trim();
      result = result.filter((r) => {
        const itemState = (r.state || '').toLowerCase().trim();
        return itemState.includes(targetState) || targetState.includes(itemState);
      });
    }

    // Role Filter
    if (selectedRole !== 'All Roles' && selectedRole.toLowerCase() !== 'all') {
      const targetRole = selectedRole.toLowerCase().trim();
      const roleTokens = targetRole.split(/[\/\s,]+/).filter((t) => t.length > 2);
      result = result.filter((r) => {
        const itemRole = (r.primary_role || '').toLowerCase();
        return (
          itemRole.includes(targetRole) ||
          targetRole.includes(itemRole) ||
          roleTokens.some((tok) => itemRole.includes(tok))
        );
      });
    }

    // Work Type Filter
    if (selectedWorkType !== 'All Work Types' && selectedWorkType.toLowerCase() !== 'all') {
      const wt = selectedWorkType.toLowerCase().trim();
      const wtTokens = wt.split(/[\/\s,]+/).filter((t) => t.length > 2);
      result = result.filter((r) => {
        const capsList = Array.isArray(r.work_capabilities) ? r.work_capabilities : [];
        return capsList.some((c: any) => {
          const cStr = (typeof c === 'string' ? c : String(c)).toLowerCase();
          return cStr.includes(wt) || wt.includes(cStr) || wtTokens.some((tok) => cStr.includes(tok));
        });
      });
    }

    // Availability Filter
    if (selectedAvailability !== 'all') {
      const targetAvail = selectedAvailability.toLowerCase().trim();
      result = result.filter((r) => {
        const itemAvail = (r.availability || '').toLowerCase();
        return itemAvail.includes(targetAvail) || targetAvail.includes(itemAvail);
      });
    }

    // Min Capacity Filter
    if (selectedMinCapacity !== 'all' && !isNaN(Number(selectedMinCapacity))) {
      const targetCap = Number(selectedMinCapacity);
      result = result.filter((r) => {
        const langList = Array.isArray(r.languages) ? r.languages : [];
        const maxLangCap = Math.max(0, ...langList.map((l: any) => Number(l.capacity) || 1));
        const recordCap = Number(r.capacity) || 1;
        const effectiveCap = Math.max(maxLangCap, recordCap);
        return effectiveCap >= targetCap;
      });
    }

    // Status Filter
    if (selectedStatus !== 'all') {
      const targetStatus = selectedStatus.toLowerCase().trim();
      result = result.filter((r) => (r.status || 'pending').toLowerCase() === targetStatus);
    }

    // Archive Filter
    if (showArchived) {
      result = result.filter((r) => Boolean(r.is_archived));
    } else {
      result = result.filter((r) => !Boolean(r.is_archived));
    }

    // Client sort
    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'created_at') {
        valA = new Date(a.created_at || 0).getTime();
        valB = new Date(b.created_at || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    registrations,
    searchQuery,
    selectedLanguage,
    selectedState,
    selectedRole,
    selectedWorkType,
    selectedAvailability,
    selectedMinCapacity,
    selectedStatus,
    showArchived,
    sortField,
    sortOrder,
  ]);

  // Paginated Subset
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedCandidates.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedCandidates, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedCandidates.length / pageSize));

  // Active Filter Count Calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedLanguage !== 'All Languages') count++;
    if (selectedState !== 'All States') count++;
    if (selectedRole !== 'All Roles') count++;
    if (selectedWorkType !== 'All Work Types') count++;
    if (selectedAvailability !== 'all') count++;
    if (selectedMinCapacity !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (showArchived) count++;
    return count;
  }, [
    selectedLanguage,
    selectedState,
    selectedRole,
    selectedWorkType,
    selectedAvailability,
    selectedMinCapacity,
    selectedStatus,
    showArchived,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLanguage('All Languages');
    setSelectedState('All States');
    setSelectedRole('All Roles');
    setSelectedWorkType('All Work Types');
    setSelectedAvailability('all');
    setSelectedMinCapacity('all');
    setSelectedStatus('all');
    setShowArchived(false);
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    setActiveMenuCandidateId(null);
    try {
      const res = await talentRegistrationApi.updateAdminStatus(id, { status: newStatus });
      if (res?.data?.success) {
        setActionSuccessMsg(`Status updated to ${newStatus.toUpperCase()}`);
        if (selectedCandidate && selectedCandidate.id === id) {
          setSelectedCandidate({ ...selectedCandidate, status: newStatus });
        }
        fetchRegistrations();
        setTimeout(() => setActionSuccessMsg(''), 3500);
      }
    } catch (err) {
      console.error('Update Status Error:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddAdminNote = async () => {
    if (!selectedCandidate || !newAdminNote.trim()) return;
    try {
      const res = await talentRegistrationApi.addAdminNote(selectedCandidate.id, newAdminNote.trim());
      if (res?.data?.success) {
        setNewAdminNote('');
        setActionSuccessMsg('Admin note recorded.');
        const updatedDetail = await talentRegistrationApi.getAdminRegistrationDetail(selectedCandidate.id);
        if (updatedDetail?.data?.success) {
          setSelectedCandidate(updatedDetail.data.data);
        }
        setTimeout(() => setActionSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Add Note Error:', err);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await talentRegistrationApi.exportAdminRegistrations();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `zenemoo_ai_talent_network_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export CSV Error:', err);
    }
  };

  const confirmDeleteCandidate = async () => {
    if (!deleteConfirmCandidate) return;
    const { id, name } = deleteConfirmCandidate;
    setDeleteConfirmCandidate(null);
    setActiveMenuCandidateId(null);

    try {
      const res = await talentRegistrationApi.deleteAdminRegistration(id);
      if (res?.data?.success) {
        if (selectedCandidate?.id === id) {
          setSelectedCandidate(null);
        }
        setActionSuccessMsg(`Candidate "${name}" permanently purged.`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        fetchRegistrations();
      } else {
        alert(res?.data?.message || 'Failed to delete candidate record.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting candidate record.');
    }
  };

  // Bulk Selection Handlers
  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSet = new Set(selectedCandidateIds);
    if (e.target.checked) {
      paginatedCandidates.forEach((c) => newSet.add(c.id));
    } else {
      paginatedCandidates.forEach((c) => newSet.delete(c.id));
    }
    setSelectedCandidateIds(newSet);
  };

  const handleToggleSelectCandidate = (id: string) => {
    const newSet = new Set(selectedCandidateIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCandidateIds(newSet);
  };

  const isAllPageSelected =
    paginatedCandidates.length > 0 && paginatedCandidates.every((c) => selectedCandidateIds.has(c.id));

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Toast Notification Alert */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-[120] p-4 rounded-2xl bg-emerald-500/90 backdrop-blur-md text-black font-mono font-bold text-xs shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-black shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ── 1. PAGE HERO / INTRODUCTION HEADER ── */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              PROTECTED ADMIN SUITE
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Private Resource Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Zenemoo AI Data Network &amp; Resource Manager
          </h1>
          <p className="text-xs text-slate-400 font-mono max-w-2xl leading-relaxed">
            Search, filter and coordinate registered candidates, coordinators, vocalists, recording teams and vendor resources for internal AI data projects.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-extrabold text-xs font-mono flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            <PieChart className="w-4 h-4 text-cyan-400" /> {showAnalytics ? 'Hide Analytics' : '📊 Network Analytics'}
          </button>
          <button
            onClick={handleExportCsv}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs font-mono flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Download className="w-4 h-4 text-black" /> Export CSV Data
          </button>
        </div>
      </div>

      {showAnalytics ? (
        <AdminNetworkAnalytics
          registrations={allRegistrations.length > 0 ? allRegistrations : registrations}
          onFilterSelect={handleAnalyticsFilterSelect}
          onClose={() => setShowAnalytics(false)}
          onExportCsv={handleExportCsv}
        />
      ) : (
        <>

      {/* ── 2. RESPONSIVE STATISTICS METRICS ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1 hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Total Network</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-white">{computedStats.total}</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase font-bold">
            <span>Verified</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-300">{computedStats.verified}</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-[10px] uppercase font-bold">
            <span>Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-300">{computedStats.pending}</div>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-[10px] uppercase font-bold">
            <span>Coordinators</span>
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-300">{computedStats.coordinators}</div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-[10px] uppercase font-bold">
            <span>Vendors</span>
            <Handshake className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-purple-300">{computedStats.vendors}</div>
        </div>

        <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/30 space-y-1">
          <div className="flex items-center justify-between text-pink-400 text-[10px] uppercase font-bold">
            <span>Singers</span>
            <Mic className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="text-xl font-extrabold text-pink-300">{computedStats.singers}</div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
          <div className="flex items-center justify-between text-indigo-400 text-[10px] uppercase font-bold">
            <span>Recording Teams</span>
            <Building className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-indigo-300">{computedStats.recordingTeams}</div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1 hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Languages</span>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-400">{computedStats.languages}</div>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTER TOOLBAR SYSTEM ── */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 font-mono text-xs">
        {/* Desktop Filter Row */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* Live Search */}
          <div className="relative col-span-2 lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search Name, Email, Phone, State..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {LANGUAGES_LIST.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {/* State Selector */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {INDIAN_STATES_UT.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Role Selector */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {ROLES_LIST.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Work Type Selector */}
          <select
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {WORK_TYPES_LIST.map((wt) => (
              <option key={wt} value={wt}>
                {wt}
              </option>
            ))}
          </select>

          {/* Capacity Selector */}
          <select
            value={selectedMinCapacity}
            onChange={(e) => setSelectedMinCapacity(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">Any Capacity</option>
            <option value="1">1 Speaker</option>
            <option value="5">5+ Speakers</option>
            <option value="10">10+ Speakers</option>
            <option value="50">50+ Speakers</option>
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Mobile Filter Trigger Row */}
        <div className="flex md:hidden items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search candidate name, state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setIsMobileFilterDrawerOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Filters ({activeFiltersCount})</span>
          </button>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Active Filters:</span>

            {selectedLanguage !== 'All Languages' && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                Lang: {selectedLanguage}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-white"
                  onClick={() => setSelectedLanguage('All Languages')}
                />
              </span>
            )}

            {selectedState !== 'All States' && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                State: {selectedState}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-white"
                  onClick={() => setSelectedState('All States')}
                />
              </span>
            )}

            {selectedRole !== 'All Roles' && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                Role: {selectedRole}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedRole('All Roles')} />
              </span>
            )}

            {selectedWorkType !== 'All Work Types' && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                Work: {selectedWorkType}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-white"
                  onClick={() => setSelectedWorkType('All Work Types')}
                />
              </span>
            )}

            {selectedStatus !== 'all' && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                Status: {selectedStatus}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedStatus('all')} />
              </span>
            )}

            <button
              onClick={handleResetFilters}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* ── 4. RESULTS HEADER BAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            Matching Candidates
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs">
              {filteredAndSortedCandidates.length}
            </span>
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">
            {filteredAndSortedCandidates.length > 0
              ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(
                  currentPage * pageSize,
                  filteredAndSortedCandidates.length
                )} of ${filteredAndSortedCandidates.length} candidates`
              : '0 candidates found matching parameters'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Sorting Field Selector */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none cursor-pointer"
            >
              <option value="created_at">Registered Date</option>
              <option value="full_name">Candidate Name</option>
              <option value="primary_role">Role</option>
              <option value="state">State / Location</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300 font-bold hover:bg-white/10"
              title={`Sort Order: ${sortOrder.toUpperCase()}`}
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>

          <button
            onClick={fetchRegistrations}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 5. DESKTOP CANDIDATE ROSTER TABLE & MOBILE CARDS ── */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Loading Zenemoo AI Data Resource Network...</span>
          </div>
        ) : filteredAndSortedCandidates.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-16 text-center text-slate-400 font-mono text-xs space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-white font-bold text-sm">No matching resources found</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Try adjusting or resetting your language, state, role, capacity, or status query filters to discover candidates.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP DATA TABLE (Visible ≥ 768px) */}
            <div className="hidden md:block overflow-x-auto font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={handleSelectAllOnPage}
                        className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Candidate &amp; Contact</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Languages</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Availability</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {paginatedCandidates.map((item) => {
                    const isSelected = selectedCandidateIds.has(item.id);
                    const langList = item.languages || [];
                    const langDisplay = langList
                      .slice(0, 2)
                      .map((l: any) => `${l.language} (${l.proficiency}${l.capacity > 1 ? `, cap:${l.capacity}` : ''})`)
                      .join(', ');
                    const extraLangsCount = langList.length > 2 ? langList.length - 2 : 0;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-white/[0.02] transition-colors ${
                          isSelected ? 'bg-cyan-500/[0.05]' : ''
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectCandidate(item.id)}
                            className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        <td className="p-4 space-y-1">
                          <div className="text-white font-bold flex items-center gap-2">
                            <span>{item.full_name}</span>
                            {item.gender && (
                              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] text-slate-300 font-mono">
                                {item.gender}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{item.email}</div>
                          <div className="text-[11px] text-cyan-400">
                            {item.country_code || '+91'} {item.phone}
                          </div>
                          {item.registration_code && (
                            <div className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 w-fit">
                              ID: {item.registration_code}
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                            {item.primary_role}
                          </span>
                        </td>

                        <td className="p-4 max-w-xs text-[11px] text-slate-300">
                          <div>{langDisplay || 'None specified'}</div>
                          {extraLangsCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                              +{extraLangsCount} more
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-[11px]">
                          <div>{item.state}</div>
                          <div className="text-slate-500">{item.city_district}</div>
                        </td>

                        <td className="p-4 text-[11px]">
                          <span className="text-emerald-400 font-bold">{item.availability || 'Immediately'}</span>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'verified'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : item.status === 'shortlisted'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : item.status === 'rejected'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : item.status === 'archived'
                                ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {item.status || 'pending'}
                          </span>
                        </td>

                        <td className="p-4 text-right relative">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                setSelectedCandidate(item);
                                try {
                                  const res = await talentRegistrationApi.getAdminRegistrationDetail(item.id);
                                  if (res?.data?.success && res.data.data) {
                                    setSelectedCandidate(res.data.data);
                                  }
                                } catch (e) {}
                              }}
                              className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold transition-all cursor-pointer"
                              title="View Full Candidate Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu Toggle */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveMenuCandidateId(activeMenuCandidateId === item.id ? null : item.id)
                                }
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Action Menu Box */}
                              {activeMenuCandidateId === item.id && (
                                <div className="absolute right-0 top-10 z-50 w-44 rounded-2xl bg-[#0a0c14] border border-white/15 shadow-2xl p-1.5 space-y-1 font-mono text-xs">
                                  <button
                                    onClick={() => handleUpdateStatus(item.id, 'verified')}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-2 cursor-pointer"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Verify Profile
                                  </button>

                                  <button
                                    onClick={() => handleUpdateStatus(item.id, 'shortlisted')}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/20 text-cyan-300 font-bold flex items-center gap-2 cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" /> Shortlist
                                  </button>

                                  <button
                                    onClick={() => handleUpdateStatus(item.id, 'archived')}
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-500/20 text-slate-300 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Archive className="w-3.5 h-3.5" /> Archive Profile
                                  </button>

                                  <div className="border-t border-white/10 my-1" />

                                  <button
                                    onClick={() =>
                                      setDeleteConfirmCandidate({ id: item.id, name: item.full_name })
                                    }
                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-300 font-bold flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Record
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CANDIDATE CARDS VIEW (Visible < 768px) */}
            <div className="md:hidden divide-y divide-white/10 font-mono text-xs">
              {paginatedCandidates.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-bold text-sm flex items-center gap-2">
                        <span>{item.full_name}</span>
                        {item.gender && (
                          <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] text-slate-300">
                            {item.gender}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.email}</div>
                      <div className="text-[11px] text-cyan-400">{item.country_code || '+91'} {item.phone}</div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        item.status === 'verified'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : item.status === 'shortlisted'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : item.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {item.status || 'pending'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                      {item.primary_role}
                    </span>
                    {item.registration_code && (
                      <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        ID: {item.registration_code}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <div>
                      <span className="text-slate-400">Location:</span> {item.state}, {item.city_district}
                    </div>
                    <div>
                      <span className="text-slate-400">Availability:</span>{' '}
                      <span className="text-emerald-400 font-bold">{item.availability || 'Immediately'}</span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      setSelectedCandidate(item);
                      try {
                        const res = await talentRegistrationApi.getAdminRegistrationDetail(item.id);
                        if (res?.data?.success && res.data.data) {
                          setSelectedCandidate(res.data.data);
                        }
                      } catch (e) {}
                    }}
                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Eye className="w-4 h-4" /> View Profile
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 6. PAGINATION CONTROLS BAR ── */}
      {filteredAndSortedCandidates.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 text-slate-400">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none cursor-pointer"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 font-bold ${
                currentPage === 1
                  ? 'border-white/5 text-slate-600 cursor-not-allowed'
                  : 'border-white/15 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all ${
                    currentPage === pageNum
                      ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 font-bold ${
                currentPage === totalPages
                  ? 'border-white/5 text-slate-600 cursor-not-allowed'
                  : 'border-white/15 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer'
              }`}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* ── 7. VIEW CANDIDATE PROFILE DRAWER / MODAL ── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#090b12] border-l border-white/15 h-full overflow-y-auto p-6 sm:p-8 space-y-6 font-mono text-xs text-slate-200 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-white">{selectedCandidate.full_name}</h3>
                <p className="text-[11px] text-cyan-400">
                  {selectedCandidate.email} • {selectedCandidate.country_code || '+91'} {selectedCandidate.phone}
                </p>
              </div>

              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Action Controls Bar */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Update Verification Status</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedCandidate.id, 'verified')}
                  disabled={isUpdatingStatus}
                  className={`px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    selectedCandidate.status === 'verified'
                      ? 'bg-emerald-500 text-black shadow-lg'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  Verify Profile
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedCandidate.id, 'shortlisted')}
                  disabled={isUpdatingStatus}
                  className={`px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    selectedCandidate.status === 'shortlisted'
                      ? 'bg-cyan-500 text-black shadow-lg'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  Shortlist
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedCandidate.id, 'rejected')}
                  disabled={isUpdatingStatus}
                  className={`px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    selectedCandidate.status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                  }`}
                >
                  Reject
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedCandidate.id, 'archived')}
                  disabled={isUpdatingStatus}
                  className={`px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    selectedCandidate.status === 'archived'
                      ? 'bg-slate-500 text-white'
                      : 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border border-slate-500/40'
                  }`}
                >
                  Archive
                </button>
                <button
                  onClick={() => setDeleteConfirmCandidate({ id: selectedCandidate.id, name: selectedCandidate.full_name })}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/60 text-red-200 font-bold cursor-pointer transition-all flex items-center gap-1.5 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete Record
                </button>
              </div>
            </div>

            {/* Profile Grid Detail Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Contact Information */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <span>1. Contact &amp; Personal Details</span>
                  {selectedCandidate.registration_code && (
                    <span className="text-amber-300 font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 text-[10px]">
                      ID: {selectedCandidate.registration_code}
                    </span>
                  )}
                </div>
                <div>Full Name: <span className="text-white font-bold">{selectedCandidate.full_name}</span></div>
                <div>Gender: <span className="text-cyan-300 font-bold">{selectedCandidate.gender || 'Male'}</span></div>
                <div>Email Address: <span className="text-white font-bold">{selectedCandidate.email}</span></div>
                <div>Phone / WhatsApp: <span className="text-cyan-300 font-bold">{selectedCandidate.country_code || '+91'} {selectedCandidate.phone}</span></div>
                <div>State / UT: <span className="text-white font-bold">{selectedCandidate.state}</span></div>
                <div>City / District: <span className="text-white font-bold">{selectedCandidate.city_district}</span></div>
                <div>Preferred Contact: <span className="text-emerald-400 font-bold">{selectedCandidate.preferred_contact}</span></div>
              </div>

              {/* 2. Role Configuration */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="font-bold text-purple-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <span>2. Role &amp; Contribution Details</span>
                  <span className="text-slate-500">{selectedCandidate.primary_role}</span>
                </div>
                <div>Primary Role: <span className="text-purple-300 font-bold">{selectedCandidate.primary_role}</span></div>
                
                {selectedCandidate.role_details && Object.keys(selectedCandidate.role_details).length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    {Object.entries(selectedCandidate.role_details).map(([k, v]: [string, any]) => (
                      <div key={k} className="text-[11px]">
                        <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}: </span>
                        <span className="text-white font-bold">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Supported Language Matrix & Speaker Capacities */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="font-bold text-white uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>3. Supported Language Matrix &amp; Speaker Capacities</span>
                <span className="text-cyan-400 font-bold">{(selectedCandidate.languages || []).length} Languages</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(selectedCandidate.languages || []).map((l: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-white font-bold flex items-center justify-between">
                      <span className="text-sm">{l.language}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">{l.proficiency}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{l.speaker_availability}</div>
                    {Number(l.capacity) > 1 && (
                      <div className="text-[10px] text-emerald-400 font-bold pt-0.5">
                        Capacity: {l.capacity} Native Speakers
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Capabilities & Availability */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>4. Work Capabilities &amp; Time Availability</span>
                <span className="text-slate-400">{selectedCandidate.availability}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Availability Timeframe:</span>
                  <span className="text-emerald-400 font-bold">{selectedCandidate.availability || 'Immediately'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Working Preference:</span>
                  <span className="text-white font-bold">{selectedCandidate.working_preference || 'Project Basis'}</span>
                </div>
              </div>
            </div>

            {/* 5. Private Admin Notes Section */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="font-bold text-amber-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>🔒 Private Admin Notes Timeline</span>
                <span className="text-slate-500">Internal Only</span>
              </div>

              {/* Note History */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(selectedCandidate.admin_notes_history || []).length > 0 ? (
                  selectedCandidate.admin_notes_history.map((n: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{n.admin_email || 'Admin'}</span>
                        <span>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</span>
                      </div>
                      <p className="text-slate-200 text-[11px]">{n.note}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-[11px] italic">No internal admin notes recorded yet.</div>
                )}
              </div>

              {/* Add Note Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type internal note..."
                  value={newAdminNote}
                  onChange={(e) => setNewAdminNote(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-slate-500 focus:outline-none text-xs"
                />
                <button
                  onClick={handleAddAdminNote}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer transition-all shrink-0"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. MOBILE FILTER DRAWER MODAL ── */}
      {isMobileFilterDrawerOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0a0c14] border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Filter Talent Network
              </h3>
              <button
                onClick={() => setIsMobileFilterDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-slate-400 block mb-1">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white"
                >
                  {LANGUAGES_LIST.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white"
                >
                  {INDIAN_STATES_UT.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white"
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleResetFilters();
                  setIsMobileFilterDrawerOpen(false);
                }}
                className="flex-1 py-3 rounded-xl border border-white/15 text-slate-300 font-bold text-center"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsMobileFilterDrawerOpen(false)}
                className="flex-1 py-3 rounded-xl bg-cyan-500 text-black font-bold text-center shadow-lg shadow-cyan-500/20"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. DANGER DELETE CONFIRMATION DIALOG MODAL ── */}
      {deleteConfirmCandidate && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-red-500/40 max-w-md w-full space-y-5 text-center font-mono text-xs text-slate-200 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Permanently Delete Candidate?</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Are you sure you want to permanently purge candidate record for{' '}
                <strong className="text-white">"{deleteConfirmCandidate.name}"</strong>? This will erase all profile data from Supabase DB and disk.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={confirmDeleteCandidate}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold cursor-pointer transition-all shadow-lg shadow-red-500/20"
              >
                Permanently Delete Record
              </button>
              <button
                onClick={() => {
                  handleUpdateStatus(deleteConfirmCandidate.id, 'archived');
                  setDeleteConfirmCandidate(null);
                }}
                className="w-full py-3 rounded-xl bg-slate-500/20 hover:bg-slate-500/30 border border-slate-500/40 text-slate-200 font-bold cursor-pointer transition-all"
              >
                Archive Candidate Instead
              </button>
              <button
                onClick={() => setDeleteConfirmCandidate(null)}
                className="w-full py-2.5 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
