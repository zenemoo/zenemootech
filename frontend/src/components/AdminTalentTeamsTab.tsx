import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Eye,
  Mail,
  Phone,
  MapPin,
  Globe,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Building,
  ShieldCheck,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { talentTeamApi, TeamMember } from '../services/talentTeamApi';
import {
  exportTeamToCSV,
  exportTeamToXLSX,
  exportTeamToPDF,
  downloadBlob,
} from '../utils/teamExportUtils';

interface VendorOverview {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  state: string;
  city_district: string;
  registration_code: string;
  status: string;
  created_at: string;
  totalMembers: number;
  activeMembers: number;
}

interface AdminTalentTeamsTabProps {
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminTalentTeamsTab: React.FC<AdminTalentTeamsTabProps> = ({ showToast }) => {
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('zenemoo_jwt_token') || '' : '';

  const [vendors, setVendors] = useState<VendorOverview[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [totalVendors, setTotalVendors] = useState(0);
  const [totalTeamMembers, setTotalTeamMembers] = useState(0);

  // Drilldown selection
  const [selectedVendor, setSelectedVendor] = useState<VendorOverview | null>(null);
  const [vendorMembers, setVendorMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [memberLimit, setMemberLimit] = useState(20);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [memberTotalCount, setMemberTotalCount] = useState(0);

  // Search in vendor list
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  // Active member for View Details modal
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);

  // Copy notification & Export state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const notify = (title: string, message?: string, type: 'success' | 'error' = 'success') => {
    if (showToast) {
      showToast(title, message, type);
    }
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify('Copied', `${key} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch Vendors Overview
  const fetchVendorsOverview = useCallback(async () => {
    if (!adminToken) return;
    setLoadingVendors(true);
    try {
      const res = await talentTeamApi.getAdminTeamsOverview(adminToken);
      if (res.success) {
        setVendors(res.vendors || []);
        setTotalVendors(res.totalVendors || 0);
        setTotalTeamMembers(res.totalTeamMembers || 0);
      }
    } catch (err: any) {
      console.error('Failed to load admin vendor teams:', err);
      notify('Error', 'Failed to retrieve vendor teams overview', 'error');
    } finally {
      setLoadingVendors(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchVendorsOverview();
  }, [fetchVendorsOverview]);

  // Fetch drilldown vendor members
  const fetchVendorMembers = useCallback(async () => {
    if (!adminToken || !selectedVendor) return;
    setLoadingMembers(true);
    try {
      const res = await talentTeamApi.getAdminVendorMembers(adminToken, selectedVendor.id, {
        page: memberPage,
        limit: memberLimit,
        q: memberSearchQuery,
      });
      if (res.success) {
        setVendorMembers(res.members || []);
        setMemberTotalPages(res.pagination.totalPages);
        setMemberTotalCount(res.pagination.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to load vendor team members:', err);
      notify('Error', 'Failed to retrieve team members', 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [adminToken, selectedVendor, memberPage, memberLimit, memberSearchQuery]);

  useEffect(() => {
    if (selectedVendor) {
      fetchVendorMembers();
    }
  }, [selectedVendor, fetchVendorMembers]);

  // Filtered Vendors for search
  const filteredVendors = useMemo(() => {
    if (!vendorSearchQuery.trim()) return vendors;
    const q = vendorSearchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.full_name?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.registration_code?.toLowerCase().includes(q) ||
        v.state?.toLowerCase().includes(q) ||
        v.city_district?.toLowerCase().includes(q)
    );
  }, [vendors, vendorSearchQuery]);

  // Master Export (all vendors or single vendor)
  const handleMasterExport = async (format: 'pdf' | 'csv' | 'xlsx') => {
    setShowExportDropdown(false);
    if (!adminToken) return;

    try {
      notify('Exporting', `Generating master team report (${format.toUpperCase()})...`);
      const exportRes = await talentTeamApi.getAdminMasterExport(
        adminToken,
        selectedVendor ? selectedVendor.id : undefined
      );

      if (!exportRes.success) {
        notify('Export Failed', 'Unable to retrieve team members data', 'error');
        return;
      }

      const header = {
        vendorName: selectedVendor ? selectedVendor.full_name : 'All Registered Vendors (Master)',
        vendorRegistrationCode: selectedVendor ? selectedVendor.registration_code : 'ADMIN-MASTER',
        vendorRole: 'Vendor / Agency Directory',
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

      notify('Export Ready', `Downloaded ${format.toUpperCase()} successfully.`);
    } catch (err) {
      console.error('Master export error:', err);
      notify('Export Failed', 'An error occurred during export generation', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & SUMMARY METRICS ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Building className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Talent Teams Management</h2>
                <p className="text-xs text-slate-400">
                  Inspect vendor organizations, supplied team members, and master team allocations.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons: Refresh & Export */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (selectedVendor) fetchVendorMembers();
                else fetchVendorsOverview();
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {selectedVendor ? 'Export This Team' : 'Master Export'}
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-30">
                  <button
                    onClick={() => handleMasterExport('pdf')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <FileText className="w-4 h-4 text-rose-400" />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleMasterExport('csv')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleMasterExport('xlsx')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                    Export as Excel (XLSX)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Registered Vendors / Agencies</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{totalVendors}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Building className="w-5 h-5 text-sky-400" />
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Team Members Supplied</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{totalTeamMembers}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Avg Team Size</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {totalVendors > 0 ? (totalTeamMembers / totalVendors).toFixed(1) : '0'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── BREADCRUMB / DRILLDOWN VIEW HEADER ── */}
      {selectedVendor ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
            <button
              onClick={() => {
                setSelectedVendor(null);
                setVendorMembers([]);
              }}
              className="flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Vendors
            </button>

            <div className="text-xs text-slate-400">
              Viewing: <span className="font-bold text-slate-200">{selectedVendor.full_name}</span> ({selectedVendor.registration_code})
            </div>
          </div>

          {/* Member Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search member name, email, phone, ID..."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Vendor Members Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            {loadingMembers ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mb-3" />
                <span className="text-xs">Loading team members...</span>
              </div>
            ) : vendorMembers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No team members found for this vendor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Member</th>
                      <th className="py-3.5 px-4 font-semibold">Contact Details</th>
                      <th className="py-3.5 px-4 font-semibold">Location</th>
                      <th className="py-3.5 px-4 font-semibold">Languages</th>
                      <th className="py-3.5 px-4 font-semibold">Availability</th>
                      <th className="py-3.5 px-4 font-semibold">Added Date</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {vendorMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100">{member.full_name}</div>
                          <div className="text-[11px] font-mono text-sky-400">{member.member_code}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200">{member.email || '-'}</div>
                          <div className="text-slate-400">{member.phone ? `${member.country_code || '+91'} ${member.phone}` : '-'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {member.city_district || '-'}
                          {member.state ? `, ${member.state}` : ''}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(member.languages) && member.languages.length > 0 ? (
                              member.languages.map((l, i) => (
                                <span key={i} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded">
                                  {l}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{member.availability || 'Immediately'}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setViewingMember(member)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded-lg"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── LEVEL 1: ALL VENDORS TABLE ── */
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={vendorSearchQuery}
              onChange={(e) => setVendorSearchQuery(e.target.value)}
              placeholder="Search vendor name, registration code, city..."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingVendors ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mb-3" />
                <span className="text-xs">Loading vendor list...</span>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No vendor profiles found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Vendor / Agency</th>
                      <th className="py-3.5 px-4 font-semibold">Registration Code</th>
                      <th className="py-3.5 px-4 font-semibold">Location</th>
                      <th className="py-3.5 px-4 font-semibold">Total Team Members</th>
                      <th className="py-3.5 px-4 font-semibold">Active Members</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100">{vendor.full_name}</div>
                          <div className="text-slate-400 text-[11px]">{vendor.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                          {vendor.registration_code || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          {vendor.city_district || '-'}
                          {vendor.state ? `, ${vendor.state}` : ''}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-100">{vendor.totalMembers}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-400">{vendor.activeMembers}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setMemberPage(1);
                            }}
                            className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            View Team ({vendor.totalMembers})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MEMBER INSPECT MODAL ── */}
      <AnimatePresence>
        {viewingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{viewingMember.full_name}</h3>
                  <div className="text-xs font-mono text-sky-400">{viewingMember.member_code}</div>
                </div>
                <button
                  onClick={() => setViewingMember(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">Email</span>
                  <span className="text-slate-200 font-medium">{viewingMember.email || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">Contact</span>
                  <span className="text-slate-200 font-medium">
                    {viewingMember.phone ? `${viewingMember.country_code || '+91'} ${viewingMember.phone}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">Location</span>
                  <span className="text-slate-200 font-medium">
                    {viewingMember.city_district || '-'}{viewingMember.state ? `, ${viewingMember.state}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">Availability</span>
                  <span className="text-slate-200 font-medium">{viewingMember.availability || 'Immediately'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">Source</span>
                  <span className="text-slate-200 font-medium">
                    {viewingMember.source === 'share_link' ? 'Public Invitation Link' : 'Manual Entry'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">Added Date</span>
                  <span className="text-slate-200 font-medium">
                    {viewingMember.created_at ? new Date(viewingMember.created_at).toLocaleDateString('en-IN') : '-'}
                  </span>
                </div>
              </div>

              {Array.isArray(viewingMember.languages) && viewingMember.languages.length > 0 && (
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px] mb-1">Languages</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingMember.languages.map((l, i) => (
                      <span key={i} className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {viewingMember.skills_notes && (
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px] mb-1">Skills & Notes</span>
                  <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                    {viewingMember.skills_notes}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
