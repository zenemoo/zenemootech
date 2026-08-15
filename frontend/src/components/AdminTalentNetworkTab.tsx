import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { talentRegistrationApi } from '../services/api';

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

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All Languages');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedRole, setSelectedRole] = useState<string>('All Roles');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('All Work Types');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [selectedMinCapacity, setSelectedMinCapacity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Detail Modal & Note Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [newAdminNote, setNewAdminNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

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
        setRegistrations(res.data.data || []);
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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await talentRegistrationApi.updateAdminStatus(id, { status: newStatus });
      if (res?.data?.success) {
        setActionSuccessMsg(`Status updated to ${newStatus.toUpperCase()}`);
        if (selectedCandidate) {
          setSelectedCandidate({ ...selectedCandidate, status: newStatus });
        }
        fetchRegistrations();
        setTimeout(() => setActionSuccessMsg(''), 3000);
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

  const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
    if (
      window.confirm(
        `Are you sure you want to PERMANENTLY delete candidate registration data for:\n\n"${candidateName}"?\n\nThis will erase all profile details, languages, experiences, and internal notes from Supabase database and local storage.`
      )
    ) {
      try {
        const res = await talentRegistrationApi.deleteAdminRegistration(candidateId);
        if (res?.data?.success) {
          if (selectedCandidate?.id === candidateId) {
            setSelectedCandidate(null);
          }
          setActionSuccessMsg(`Candidate "${candidateName}" permanently deleted.`);
          setTimeout(() => setActionSuccessMsg(''), 4000);
          fetchRegistrations();
        } else {
          alert(res?.data?.message || 'Failed to delete candidate record.');
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error deleting candidate record.');
      }
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              PROTECTED ADMIN SUITE
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Private Resource Engine
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Zenemoo AI Data Network &amp; Resource Manager
          </h2>
          <p className="text-xs text-slate-400 font-mono max-w-2xl leading-relaxed">
            Search, filter, and coordinate registered candidates, recruiters, vocalists, and vendor agencies for internal AI dataset projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Download className="w-4 h-4 text-black" /> Export CSV Data
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block font-bold">Total Network</span>
          <span className="text-xl font-extrabold text-white">{stats.total}</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase block font-bold">Verified</span>
          <span className="text-xl font-extrabold text-emerald-300">{stats.verified}</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <span className="text-[10px] text-amber-400 uppercase block font-bold">Pending</span>
          <span className="text-xl font-extrabold text-amber-300">{stats.pending}</span>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
          <span className="text-[10px] text-cyan-400 uppercase block font-bold">Coordinators</span>
          <span className="text-xl font-extrabold text-cyan-300">{stats.coordinators}</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-400 uppercase block font-bold">Vendors</span>
          <span className="text-xl font-extrabold text-purple-300">{stats.vendors}</span>
        </div>

        <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/30 space-y-1">
          <span className="text-[10px] text-pink-400 uppercase block font-bold">Singers</span>
          <span className="text-xl font-extrabold text-pink-300">{stats.singers}</span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
          <span className="text-[10px] text-indigo-400 uppercase block font-bold">Recording Teams</span>
          <span className="text-xl font-extrabold text-indigo-300">{stats.recordingTeams}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block font-bold">Languages</span>
          <span className="text-xl font-extrabold text-cyan-400">{stats.languageCoverageCount}</span>
        </div>
      </div>

      {/* Multi-Filter Search Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 font-mono text-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search Name, Email, Phone, State, City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {LANGUAGES_LIST.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {INDIAN_STATES_UT.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {ROLES_LIST.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={selectedWorkType}
              onChange={(e) => setSelectedWorkType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {WORK_TYPES_LIST.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            <select
              value={selectedMinCapacity}
              onChange={(e) => setSelectedMinCapacity(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Any Capacity</option>
              <option value="10">10+ Speakers</option>
              <option value="50">50+ Speakers</option>
              <option value="100">100+ Speakers</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidate Registration Roster Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-400 font-bold">Matching Candidates: {registrations.length}</span>
          <button
            onClick={fetchRegistrations}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Roster
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" /> Loading Zenemoo AI Data Network Roster...
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <div>No matching registrations found for the selected filter queries.</div>
            <div className="text-[11px] text-slate-500">Try adjusting your language, state, capacity, or role parameters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="p-4">Candidate &amp; Contact</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Languages Supported</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Availability</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {registrations.map((item) => {
                  const langs = (item.languages || [])
                    .map((l: any) => `${l.language} (${l.proficiency}${l.capacity > 1 ? `, cap:${l.capacity}` : ''})`)
                    .join(', ');

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 space-y-0.5">
                        <div className="text-white font-bold">{item.full_name}</div>
                        <div className="text-[11px] text-slate-400">{item.email}</div>
                        <div className="text-[11px] text-cyan-400">{item.country_code} {item.phone}</div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                          {item.primary_role}
                        </span>
                      </td>

                      <td className="p-4 max-w-xs truncate text-[11px] text-slate-300">
                        {langs || 'None specified'}
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
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {item.status || 'pending'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
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
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </button>

                          <button
                            onClick={() => handleDeleteCandidate(item.id, item.full_name)}
                            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-[11px] inline-flex items-center cursor-pointer transition-all"
                            title="Delete Candidate Record"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CANDIDATE DETAIL & NOTES MODAL (FULL 8 SECTIONS SUBMITTED DATA) */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans">
          <div className="w-full max-w-4xl bg-[#090a10] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto font-mono text-xs text-slate-200">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold font-display text-white">{selectedCandidate.full_name}</h3>
                  <span className="px-3 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                    {selectedCandidate.primary_role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Candidate ID: <span className="text-cyan-300 font-bold">{selectedCandidate.id}</span> &bull; Submitted: <span className="text-white">{selectedCandidate.created_at || 'Just now'}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                ✓ {actionSuccessMsg}
              </div>
            )}

            {/* Quick Status Action Controls */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Current Verification Status:</span>
                <span
                  className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedCandidate.status === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : selectedCandidate.status === 'shortlisted'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : selectedCandidate.status === 'rejected'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {selectedCandidate.status || 'pending'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedCandidate.id, 'verified')}
                  disabled={isUpdatingStatus}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold cursor-pointer transition-all"
                >
                  Verify Profile
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedCandidate.id, 'shortlisted')}
                  disabled={isUpdatingStatus}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold cursor-pointer transition-all"
                >
                  Shortlist
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedCandidate.id, 'rejected')}
                  disabled={isUpdatingStatus}
                  className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold cursor-pointer transition-all"
                >
                  Reject
                </button>

                <button
                  onClick={() => handleDeleteCandidate(selectedCandidate.id, selectedCandidate.full_name)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/60 text-red-200 font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Permanently Delete Candidate Record"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete Record
                </button>
              </div>
            </div>

            {/* Grid 1: Personal Contact & Role Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Contact Information */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <span>1. Contact &amp; Personal Details</span>
                  <span className="text-slate-500">ID Verification</span>
                </div>
                <div>Full Name: <span className="text-white font-bold">{selectedCandidate.full_name}</span></div>
                <div>Email Address: <span className="text-white font-bold">{selectedCandidate.email}</span></div>
                <div>Phone / WhatsApp: <span className="text-cyan-300 font-bold">{selectedCandidate.country_code} {selectedCandidate.phone}</span></div>
                <div>State / UT: <span className="text-white font-bold">{selectedCandidate.state}</span></div>
                <div>City / District: <span className="text-white font-bold">{selectedCandidate.city_district}</span></div>
                <div>Preferred Contact: <span className="text-emerald-400 font-bold">{selectedCandidate.preferred_contact}</span></div>
              </div>

              {/* 2. Role & Contribution Configuration */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="font-bold text-purple-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <span>2. Role &amp; Contribution Details</span>
                  <span className="text-slate-500">{selectedCandidate.primary_role}</span>
                </div>
                <div>Primary Role: <span className="text-purple-300 font-bold">{selectedCandidate.primary_role}</span></div>
                
                {/* Render Dynamic Role Details object */}
                {selectedCandidate.role_details && Object.keys(selectedCandidate.role_details).length > 0 ? (
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    {Object.entries(selectedCandidate.role_details).map(([k, v]: [string, any]) => (
                      <div key={k} className="text-[11px]">
                        <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}: </span>
                        <span className="text-white font-bold">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-[11px] italic">Individual role registration</div>
                )}
              </div>
            </div>

            {/* 3. Supported Language Matrix & Native Capacities */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="font-bold text-white uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>3. Supported Language Matrix &amp; Speaker Capacities</span>
                <span className="text-cyan-400 font-bold">{(selectedCandidate.languages || []).length} Languages Registered</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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

            {/* 4. Work Capabilities & Availability */}
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
              <div className="pt-1">
                <span className="text-slate-400 block text-[10px] mb-1">Supported Work Capabilities:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedCandidate.work_capabilities || []).map((cap: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-200 text-[11px]">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Previous Experience History Records */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="font-bold text-amber-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>5. Previous AI / Data Project Experience History</span>
                <span className={selectedCandidate.has_previous_experience ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {selectedCandidate.has_previous_experience ? '✓ Experienced Contributor' : 'No Previous AI Project Experience'}
                </span>
              </div>

              {selectedCandidate.has_previous_experience && selectedCandidate.experiences && selectedCandidate.experiences.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedCandidate.experiences.map((exp: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-white font-bold">
                        <span className="text-cyan-300">{exp.project_company_name || exp.projectName || 'Project'}</span>
                        <span className="text-[10px] text-slate-400">{exp.duration}</span>
                      </div>
                      <div className="text-[11px] text-purple-300 font-bold">{exp.type_of_work || exp.typeOfWork}</div>
                      {exp.languages_used && <div className="text-[10px] text-slate-400">Languages: {exp.languages_used}</div>}
                      {exp.work_volume && <div className="text-[10px] text-slate-400">Volume: {exp.work_volume}</div>}
                      {exp.description && <div className="text-[11px] text-slate-300 pt-1 leading-relaxed">{exp.description}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-[11px] italic">No previous commercial project records attached.</div>
              )}
            </div>

            {/* 6. Equipment & Recording Resources */}
            {selectedCandidate.equipment_resources && Object.keys(selectedCandidate.equipment_resources).length > 0 && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="font-bold text-teal-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <span>6. Equipment &amp; Recording Resources</span>
                  <span className="text-slate-400">Hardware Setup</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedCandidate.equipment_resources).map(([k, v]: [string, any]) => (
                    <div key={k} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block capitalize">{k.replace(/_/g, ' ')}:</span>
                      <span className="text-white font-bold">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Additional Info & Referrals */}
            {selectedCandidate.additional_info && Object.keys(selectedCandidate.additional_info).length > 0 && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="font-bold text-cyan-300 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5">
                  7. Additional Information &amp; Special Capabilities
                </div>
                {selectedCandidate.additional_info.referral_source && (
                  <div>Referral Source: <span className="text-white font-bold">{selectedCandidate.additional_info.referral_source}</span></div>
                )}
                {selectedCandidate.additional_info.additional_notes && (
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1">Custom Capabilities Description:</span>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-slate-200 text-[11px] leading-relaxed">
                      {selectedCandidate.additional_info.additional_notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8. Consents & Verification Audit */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>8. Legal Consents &amp; Security Verification</span>
                <span className="text-emerald-400 font-bold">✓ Privacy Agreements Verified</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>Terms &amp; Conditions: <span className="text-emerald-400 font-bold">Accepted ✓</span></div>
                <div>Privacy Policy: <span className="text-emerald-400 font-bold">Accepted ✓</span></div>
                {selectedCandidate.consents?.timestamp && (
                  <div>Consent Recorded: <span className="text-white font-bold">{selectedCandidate.consents.timestamp}</span></div>
                )}
              </div>
            </div>

            {/* Internal Admin Notes Timeline (Private) */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider border-b border-white/10 pb-1.5">
                Internal Admin Notes Timeline (Private)
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add private admin comment or project matching note..."
                  value={newAdminNote}
                  onChange={(e) => setNewAdminNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleAddAdminNote}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold cursor-pointer shrink-0 transition-all"
                >
                  Add Note
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(selectedCandidate.admin_notes_history || []).map((noteItem: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="text-cyan-300 font-bold">{noteItem.admin_email}</span>
                      <span>{noteItem.created_at}</span>
                    </div>
                    <div className="text-white leading-relaxed">{noteItem.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer transition-all"
              >
                Close Profile Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
