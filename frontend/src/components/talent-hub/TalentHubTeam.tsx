import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Share2,
  Copy,
  Check,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Edit2,
  Trash2,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useTalentHubAuth } from './TalentHubAuthContext';
import {
  talentTeamApi,
  TeamMember,
  TeamStatusResponse,
} from '../../services/talentTeamApi';
import {
  exportTeamToCSV,
  exportTeamToXLSX,
  exportTeamToPDF,
} from '../../utils/teamExportUtils';

// Standard Indian states list for clean auto-suggestions
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry'
];

// Common Zenemoo supported languages
const POPULAR_LANGUAGES = [
  'Hindi', 'English', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Gujarati',
  'Urdu', 'Kannada', 'Odia', 'Malayalam', 'Punjabi', 'Assamese', 'Maithili',
  'Bhojpuri', 'Sanskrit', 'Marwari', 'Nepali', 'Santali', 'Kashmiri'
];

export const TalentHubTeam: React.FC = () => {
  const { token, session, talentProfile } = useTalentHubAuth();
  const sessionToken = token || session?.access_token || '';
  const isAuthenticated = Boolean(session);

  // Team status & statistics
  const [teamStatus, setTeamStatus] = useState<TeamStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Member listing state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Active member for View / Edit / Delete
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country_code: '+91',
    gender: 'Not Specified',
    state: '',
    city_district: '',
    languages: [] as string[],
    preferred_contact: 'WhatsApp',
    availability: 'Immediately',
    skills_notes: '',
  });

  const [customLanguageInput, setCustomLanguageInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast / Copy notification
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${key} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch Team Status
  const fetchStatus = useCallback(async () => {
    if (!sessionToken) return;
    setLoadingStatus(true);
    try {
      const res = await talentTeamApi.getStatus(sessionToken);
      setTeamStatus(res);
    } catch (err: any) {
      console.error('Failed to load team status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [sessionToken]);

  // Fetch Team Members
  const fetchMembers = useCallback(async () => {
    if (!sessionToken) return;
    setLoadingMembers(true);
    try {
      const res = await talentTeamApi.getMembers(sessionToken, {
        page,
        limit,
        q: searchQuery,
      });
      if (res.success) {
        setMembers(res.members);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [sessionToken, page, limit, searchQuery]);

  useEffect(() => {
    if (isAuthenticated && sessionToken) {
      fetchStatus();
      fetchMembers();
    }
  }, [isAuthenticated, sessionToken, fetchStatus, fetchMembers]);

  // Debounced search handling
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchMembers();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Check role restriction
  const isVendorRole = useMemo(() => {
    return talentProfile?.primary_role === 'Vendor / Agency' || teamStatus?.isVendor === true;
  }, [talentProfile, teamStatus]);

  // Reset form
  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      country_code: '+91',
      gender: 'Not Specified',
      state: '',
      city_district: '',
      languages: [],
      preferred_contact: 'WhatsApp',
      availability: 'Immediately',
      skills_notes: '',
    });
    setCustomLanguageInput('');
    setFormError(null);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (member: TeamMember) => {
    setActiveMember(member);
    setFormData({
      full_name: member.full_name || '',
      email: member.email || '',
      phone: member.phone || '',
      country_code: member.country_code || '+91',
      gender: member.gender || 'Not Specified',
      state: member.state || '',
      city_district: member.city_district || '',
      languages: Array.isArray(member.languages) ? [...member.languages] : [],
      preferred_contact: member.preferred_contact || 'WhatsApp',
      availability: member.availability || 'Immediately',
      skills_notes: member.skills_notes || '',
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Open View Modal
  const handleOpenView = (member: TeamMember) => {
    setActiveMember(member);
    setShowViewModal(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (member: TeamMember) => {
    setActiveMember(member);
    setShowDeleteModal(true);
  };

  // Language Chip Toggle
  const toggleLanguage = (lang: string) => {
    setFormData((prev) => {
      const exists = prev.languages.includes(lang);
      if (exists) {
        return { ...prev, languages: prev.languages.filter((l) => l !== lang) };
      } else {
        return { ...prev, languages: [...prev.languages, lang] };
      }
    });
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguageInput.trim();
    if (trimmed && !formData.languages.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, languages: [...prev.languages, trimmed] }));
      setCustomLanguageInput('');
    }
  };

  // Submit Add Manual Member
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError('Full Name is required.');
      return;
    }
    if (!sessionToken) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      const res = await talentTeamApi.addMemberManual(sessionToken, formData);
      if (res.success) {
        showToast('Team member added successfully!');
        setShowAddModal(false);
        resetForm();
        fetchStatus();
        fetchMembers();
      } else {
        setFormError(res.message || 'Failed to add team member.');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Server error while adding team member.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Member
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember || !sessionToken) return;
    if (!formData.full_name.trim()) {
      setFormError('Full Name is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const res = await talentTeamApi.updateMember(sessionToken, activeMember.id, formData);
      if (res.success) {
        showToast('Team member updated successfully!');
        setShowEditModal(false);
        setActiveMember(null);
        fetchMembers();
      } else {
        setFormError(res.message || 'Failed to update member.');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Server error while updating member.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm Delete / Remove Member
  const handleConfirmDelete = async () => {
    if (!activeMember || !sessionToken) return;
    setFormSubmitting(true);

    try {
      const res = await talentTeamApi.deleteMember(sessionToken, activeMember.id);
      if (res.success) {
        showToast(`${activeMember.full_name} removed from your team.`);
        setShowDeleteModal(false);
        setActiveMember(null);
        fetchStatus();
        fetchMembers();
      } else {
        showToast(res.message || 'Failed to remove member.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Server error while removing member.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Regenerate Invite Token
  const handleRegenerateToken = async () => {
    if (!sessionToken) return;
    try {
      const res = await talentTeamApi.generateInviteToken(sessionToken);
      if (res.success) {
        showToast('New invitation link generated!');
        fetchStatus();
      }
    } catch (err: any) {
      showToast('Failed to regenerate invitation link', 'error');
    }
  };

  // Build Public Invite URL
  const publicInviteUrl = useMemo(() => {
    if (!teamStatus?.invite?.token) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.zenemoo.in';
    return `${origin}/team/join/${teamStatus.invite.token}`;
  }, [teamStatus]);

  // Export handlers
  const handleExport = async (format: 'pdf' | 'csv' | 'xlsx') => {
    setShowExportMenu(false);
    if (!sessionToken) return;

    try {
      showToast(`Generating ${format.toUpperCase()} export...`);
      const exportRes = await talentTeamApi.getExportData(sessionToken);
      if (!exportRes.success) {
        showToast('Failed to retrieve export data', 'error');
        return;
      }

      const header = {
        vendorName: exportRes.vendor?.fullName || talentProfile?.full_name || 'Vendor',
        vendorRegistrationCode: exportRes.vendor?.registrationCode || talentProfile?.registration_code || '-',
        vendorRole: exportRes.vendor?.primaryRole || 'Vendor / Agency',
        totalMembers: exportRes.members?.length || 0,
        activeMembers: (exportRes.members || []).filter((m: any) => m.status === 'active').length,
        generatedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      };

      if (format === 'csv') {
        exportTeamToCSV(header, exportRes.members || []);
      } else if (format === 'xlsx') {
        exportTeamToXLSX(header, exportRes.members || []);
      } else if (format === 'pdf') {
        exportTeamToPDF(header, exportRes.members || []);
      }

      showToast(`Exported ${format.toUpperCase()} successfully!`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Please try again.', 'error');
    }
  };

  // Non-vendor gating screen
  if (!loadingStatus && !isVendorRole) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Vendor / Agency Feature Only</h2>
        <p className="text-slate-400 max-w-md text-sm mb-6 leading-relaxed">
          The <span className="text-sky-400 font-semibold">My Team</span> workspace is reserved exclusively for registered
          Talents with the <span className="text-slate-200 font-medium">Vendor / Agency</span> role to manage and supply talent pools.
        </p>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 max-w-sm">
          Your current registered role is: <span className="text-sky-400 font-semibold">{talentProfile?.primary_role || 'Talent'}</span>.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER & VENDOR IDENTITY ── */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">My Team</h1>
                <p className="text-xs text-slate-400">
                  Manage the people connected to your Vendor / Agency profile.
                </p>
              </div>
            </div>
          </div>

          {/* Vendor Details Badge */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-xl">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Vendor Name</div>
              <div className="text-xs font-semibold text-slate-200">{teamStatus?.vendor?.fullName || talentProfile?.full_name || 'Vendor Partner'}</div>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Registration Code</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-sky-400">
                  {teamStatus?.vendor?.registrationCode || talentProfile?.registration_code || '-'}
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      teamStatus?.vendor?.registrationCode || talentProfile?.registration_code || '',
                      'Registration Code'
                    )
                  }
                  className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
                  title="Copy Registration Code"
                >
                  {copiedKey === 'Registration Code' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── METRICS SUMMARY CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Members</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">
                {loadingStatus ? '...' : teamStatus?.stats?.totalMembers ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Members</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {loadingStatus ? '...' : teamStatus?.stats?.activeMembers ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Recently Added (30 Days)</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {loadingStatus ? '...' : teamStatus?.stats?.recentlyAdded ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION BAR & SEARCH CONTROLS ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member name, email, phone, ID, city..."
            className="w-full bg-slate-900/90 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Add Manual Member */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Add Member Manually
          </button>

          {/* Generate Share Link */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/30 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Generate Share Link
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Export
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-30">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  Export PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5"
                >
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                  Export XLSX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TEAM MEMBER TABLE / CARDS ── */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loadingMembers ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mb-3" />
            <span className="text-xs">Loading team members...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No Team Members Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              {searchQuery
                ? 'No team members match your search criteria.'
                : 'You have not added any team members yet. Click Add Member Manually or share your invitation link.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleOpenAdd}
                className="bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                + Add Member
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Share Invitation Link
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Member</th>
                    <th className="py-3.5 px-4 font-semibold">Contact Details</th>
                    <th className="py-3.5 px-4 font-semibold">Location</th>
                    <th className="py-3.5 px-4 font-semibold">Languages</th>
                    <th className="py-3.5 px-4 font-semibold">Added Date</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100">{member.full_name}</div>
                        <div className="flex items-center gap-1 text-[11px] text-sky-400 font-mono mt-0.5">
                          <span>{member.member_code}</span>
                          <button
                            onClick={() => handleCopy(member.member_code, 'Member ID')}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                            title="Copy Member Code"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{member.email || '-'}</span>
                          {member.email && (
                            <button
                              onClick={() => handleCopy(member.email!, 'Email')}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                            >
                              <Copy className="w-3 h-3 text-slate-400" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{member.phone ? `${member.country_code || '+91'} ${member.phone}` : '-'}</span>
                          {member.phone && (
                            <button
                              onClick={() => handleCopy(member.phone!, 'Phone')}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                            >
                              <Copy className="w-3 h-3 text-slate-400" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>
                            {member.city_district || '-'}
                            {member.state ? `, ${member.state}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Languages */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Array.isArray(member.languages) && member.languages.length > 0 ? (
                            member.languages.slice(0, 3).map((l, i) => (
                              <span
                                key={i}
                                className="bg-slate-800 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded text-[10px]"
                              >
                                {l}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                          {Array.isArray(member.languages) && member.languages.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{member.languages.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Added Date */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {member.created_at
                          ? new Date(member.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenView(member)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded-lg transition-colors"
                            title="View Member"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition-colors"
                            title="Edit Member"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(member)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Shown only on small screens) */}
            <div className="block md:hidden divide-y divide-slate-800/60 p-3 space-y-3">
              {members.map((member) => (
                <div key={member.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-100 text-sm">{member.full_name}</div>
                      <div className="text-xs font-mono text-sky-400 mt-0.5">{member.member_code}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenView(member)}
                        className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 bg-slate-900 border border-slate-800 text-amber-400 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(member)}
                        className="p-1.5 bg-slate-900 border border-slate-800 text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{member.country_code || '+91'} {member.phone}</span>
                      </div>
                    )}
                    {(member.state || member.city_district) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{member.city_district || '-'}{member.state ? `, ${member.state}` : ''}</span>
                      </div>
                    )}
                  </div>

                  {Array.isArray(member.languages) && member.languages.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {member.languages.map((l, i) => (
                        <span key={i} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    Added: {member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN') : '-'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>records per page (Total: {totalCount})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-200">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ── ADD / EDIT MEMBER MODAL ──
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    {showAddModal ? (
                      <UserPlus className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Edit2 className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">
                      {showAddModal ? 'Add Team Member Manually' : 'Edit Team Member'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {showAddModal
                        ? 'Enter details to add this person directly under your Vendor team.'
                        : `Updating member details for ${activeMember?.full_name}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={showAddModal ? handleSubmitAdd : handleSubmitEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="rahul@example.com"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contact Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.country_code}
                        onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                        className="w-16 bg-slate-950/80 border border-slate-800 text-center rounded-xl px-2 py-2.5 text-xs text-slate-300 focus:outline-none"
                      />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="9876543210"
                        className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* State & City / District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">State</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">City / District</label>
                    <input
                      type="text"
                      value={formData.city_district}
                      onChange={(e) => setFormData({ ...formData, city_district: e.target.value })}
                      placeholder="e.g. Mumbai / Pune"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Languages Multi-select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Supported Languages</label>
                  <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-28 overflow-y-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800/80">
                    {POPULAR_LANGUAGES.map((lang) => {
                      const isSelected = formData.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isSelected ? `✓ ${lang}` : `+ ${lang}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Language */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customLanguageInput}
                      onChange={(e) => setCustomLanguageInput(e.target.value)}
                      placeholder="Or type another language..."
                      className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCustomLanguage}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Availability & Preferred Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Availability</label>
                    <select
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="Immediately">Immediately</option>
                      <option value="1 Week Notice">1 Week Notice</option>
                      <option value="15 Days Notice">15 Days Notice</option>
                      <option value="1 Month Notice">1 Month Notice</option>
                      <option value="Part-time only">Part-time only</option>
                      <option value="Weekends only">Weekends only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Preferred Contact</label>
                    <select
                      value={formData.preferred_contact}
                      onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>
                </div>

                {/* Skills / Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Skills / Role Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.skills_notes}
                    onChange={(e) => setFormData({ ...formData, skills_notes: e.target.value })}
                    placeholder="e.g. Lead transcriber, Hindi vocal artist, Field recording setup..."
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer"
                  >
                    {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {showAddModal ? 'Add Member' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          ── SHARE LINK INVITATION MODAL ──
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">Share Invitation Link</h3>
                    <p className="text-xs text-slate-400">
                      People who register via this link are added to your team automatically.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">Team Join Link</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicInviteUrl}
                      className="flex-1 bg-slate-900 border border-slate-800 text-xs text-sky-400 font-mono rounded-lg px-3 py-2 select-all focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopy(publicInviteUrl, 'Invite Link')}
                      className="p-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors cursor-pointer"
                      title="Copy Share Link"
                    >
                      {copiedKey === 'Invite Link' ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* WhatsApp & Share Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Join my team at Zenemoo Data Solutions! Please submit your details here: ${publicInviteUrl}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Share on WhatsApp
                  </a>

                  <button
                    onClick={() => handleCopy(publicInviteUrl, 'Invite Link')}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-sky-400" />
                    Copy Link
                  </button>
                </div>

                {/* Regenerate security note */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Need a new secure token?</span>
                  <button
                    onClick={handleRegenerateToken}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate Link
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          ── VIEW MEMBER DETAILS MODAL ──
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showViewModal && activeMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{activeMember.full_name}</h3>
                    <p className="text-xs font-mono text-sky-400">{activeMember.member_code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Email</span>
                    <span className="text-slate-200 font-medium">{activeMember.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Contact</span>
                    <span className="text-slate-200 font-medium">
                      {activeMember.phone ? `${activeMember.country_code || '+91'} ${activeMember.phone}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">State</span>
                    <span className="text-slate-200 font-medium">{activeMember.state || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">City / District</span>
                    <span className="text-slate-200 font-medium">{activeMember.city_district || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Availability</span>
                    <span className="text-slate-200 font-medium">{activeMember.availability || 'Immediately'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Preferred Contact</span>
                    <span className="text-slate-200 font-medium">{activeMember.preferred_contact || 'WhatsApp'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px] mb-1.5">Languages</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(activeMember.languages) && activeMember.languages.length > 0 ? (
                      activeMember.languages.map((l, i) => (
                        <span key={i} className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs">
                          {l}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">None specified</span>
                    )}
                  </div>
                </div>

                {activeMember.skills_notes && (
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px] mb-1">Skills & Notes</span>
                    <p className="text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                      {activeMember.skills_notes}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Source: {activeMember.source === 'share_link' ? 'Invitation Link' : 'Manual Entry'}</span>
                  <span>
                    Added: {activeMember.created_at ? new Date(activeMember.created_at).toLocaleDateString('en-IN') : '-'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          ── DELETE MEMBER CONFIRMATION MODAL ──
         ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDeleteModal && activeMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-1">Remove this team member?</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to remove <span className="text-slate-200 font-semibold">{activeMember.full_name}</span> ({activeMember.member_code}) from your Vendor team?
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setActiveMember(null);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Remove Member
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
