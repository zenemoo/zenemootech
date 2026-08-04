import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  MessageSquare,
  Shield,
  Briefcase,
  Building,
  UserCheck,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  CreditCard,
  MapPin,
  Heart,
  Globe,
  Award,
  FileText,
  RefreshCw,
  Eye,
  Slash,
} from 'lucide-react';
import { directoryApi } from '../services/api';

export interface DirectoryMember {
  id: string;
  employee_id: string;
  position: string;
  position_num?: number;
  name: string;
  photo: string;
  designation: string;
  department: string;
  badge: string;
  skills: string[];
  public_bio: string;
  company_email: string;
  company_phone?: string;
  joining_date: string;
  status: string;
  is_private_profile_completed: boolean;
  // Role-Sanitized Fields (Populated depending on backend RBAC)
  personal_phone?: string;
  personal_email?: string;
  address_current?: string;
  address_permanent?: string;
  emergency_contact_person?: string;
  emergency_contact_phone?: string;
  emergency_relationship?: string;
  languages?: string[];
  dob?: string;
  blood_group?: string;
  experience?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  private_bio?: string;
  bank_name?: string;
  account_holder?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  pan_number?: string;
  upi_id?: string;
}

interface EnterpriseTeamDirectoryProps {
  userRole: 'admin' | 'hr' | 'team';
  showToast: (text: string, type: 'success' | 'error') => void;
}

export const EnterpriseTeamDirectory: React.FC<EnterpriseTeamDirectoryProps> = ({
  userRole,
  showToast,
}) => {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'personal' | 'professional' | 'address' | 'bank' | 'emergency'>('overview');

  const fetchDirectory = async () => {
    setIsLoading(true);
    try {
      const res = await directoryApi.getMembers();
      if (res.data && res.data.success) {
        setMembers(res.data.data || []);
      }
    } catch (err: any) {
      console.warn('Failed to fetch team directory:', err);
      showToast('Failed to load enterprise team directory.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text.startsWith('ENC:')) return;
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, 'success');
  };

  // Helper to sanitize any stray encrypted values if backend cold-start fails
  const formatText = (text?: string): string => {
    if (!text) return '';
    if (text.startsWith('ENC:')) return '';
    return text;
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const cleanPhone = formatText(m.personal_phone);
    const cleanEmail = formatText(m.personal_email);
    const cleanUpi = formatText(m.upi_id);
    const posStr = String(m.position || '');
    const nameStr = String(m.name || '');
    const empIdStr = String(m.employee_id || '');
    const desigStr = String(m.designation || '');
    const deptStr = String(m.department || '');
    const badgeStr = String(m.badge || '');
    const compEmailStr = String(m.company_email || '');

    const matchesSearch =
      !q ||
      nameStr.toLowerCase().includes(q) ||
      empIdStr.toLowerCase().includes(q) ||
      posStr.toLowerCase().includes(q) ||
      desigStr.toLowerCase().includes(q) ||
      deptStr.toLowerCase().includes(q) ||
      badgeStr.toLowerCase().includes(q) ||
      compEmailStr.toLowerCase().includes(q) ||
      (cleanPhone && cleanPhone.toLowerCase().includes(q)) ||
      (cleanEmail && cleanEmail.toLowerCase().includes(q)) ||
      (cleanUpi && cleanUpi.toLowerCase().includes(q)) ||
      (Array.isArray(m.skills) && m.skills.some((s) => String(s || '').toLowerCase().includes(q)));

    const matchesDept = selectedDept === 'all' || deptStr.toLowerCase() === selectedDept.toLowerCase();

    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'completed' && m.is_private_profile_completed) ||
      (selectedStatusFilter === 'pending' && !m.is_private_profile_completed);

    return matchesSearch && matchesDept && matchesStatus;
  });

  const uniqueDepartments = Array.from(new Set(members.map((m) => m.department).filter(Boolean)));

  return (
    <div className="space-y-6 font-mono text-xs w-full max-w-full overflow-x-hidden">
      {/* 1. Directory Header */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-cyan-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base sm:text-xl font-bold font-display text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Enterprise Team Directory
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Internal employee roster &amp; directory registry &bull; Logged in as{' '}
              <strong className="text-cyan-300 uppercase">{userRole}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs">
              {filteredMembers.length} Members
            </span>
            <button
              onClick={fetchDirectory}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer font-bold"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Instant Multi-Field Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Name, Employee ID (ZNM-30A53), Phone, Email, UPI, Position, Skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono min-h-[44px]"
            />
          </div>

          {/* Department Filter Dropdown */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none"
            >
              <option value="all" className="bg-[#090d16] text-white">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept} className="bg-[#090d16] text-white">
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/10" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-white/10 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Directory Members Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No team members matched your query "{searchQuery}". Try searching by Employee ID, Name, Skills, or Phone.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              onClick={() => {
                setSelectedMember(member);
                setActiveModalTab('overview');
              }}
              className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer space-y-4 group shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Photo & Unique Employee ID */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-cyan-400/60 group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="truncate min-w-0">
                      <h3 className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition-colors">
                        {member.name}
                      </h3>
                      {/* Explicit Unique Employee ID */}
                      <div className="text-xs text-cyan-400 font-bold font-mono tracking-wider truncate">
                        {member.employee_id}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono truncate">
                        Pos: <strong className="text-purple-300">{member.position}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Designation, Department & Badge */}
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-200 font-sans font-bold truncate">{member.designation}</div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                      {member.department}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold">
                      {member.badge}
                    </span>
                  </div>
                </div>

                {/* Skills tags preview */}
                {Array.isArray(member.skills) && member.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {member.skills.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-300 text-[10px]">
                        ⚡ {skill}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="text-[10px] text-slate-500 self-center">+{member.skills.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Profile Completion & Click Hint */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px]">
                {member.is_private_profile_completed ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Private Profile Submitted
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Pending Private Profile
                  </span>
                )}

                <span className="text-cyan-400 font-bold group-hover:underline flex items-center gap-0.5">
                  View Profile &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. ROLE-BASED EMPLOYEE DETAIL MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#090d16] border border-cyan-500/40 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl font-mono text-xs max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={selectedMember.photo}
                  alt={selectedMember.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-xl shrink-0"
                />
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base sm:text-xl font-bold font-display text-white truncate">{selectedMember.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {/* Unique Employee ID */}
                    <span className="text-cyan-400 font-bold font-mono">{selectedMember.employee_id}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-purple-300 font-bold">Position: {selectedMember.position}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                      {selectedMember.badge}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Contact Cards (Admin & HR) */}
            {(userRole === 'admin' || userRole === 'hr') && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-cyan-400" /> Operational Contact Actions (Decrypted):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Personal Email Card */}
                  <div className={`p-4 rounded-2xl border ${
                    formatText(selectedMember.personal_email)
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-white/[0.02] border-white/10 opacity-60'
                  } space-y-2`}>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                      <span>📧 Personal Email</span>
                      {formatText(selectedMember.personal_email) && (
                        <span className="text-emerald-400 font-mono">✓ Verified</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white truncate font-mono">
                      {formatText(selectedMember.personal_email) || 'Personal Email Not Added'}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {formatText(selectedMember.personal_email) ? (
                        <>
                          <a
                            href={`mailto:${formatText(selectedMember.personal_email)}`}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1 text-xs transition-all"
                          >
                            <Mail className="w-3.5 h-3.5 text-black" /> Email
                          </a>
                          <button
                            onClick={() => copyToClipboard(formatText(selectedMember.personal_email), 'Personal Email')}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1 text-xs cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center gap-1"
                        >
                          <Slash className="w-3.5 h-3.5 text-slate-500" /> Personal Email Not Added
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Personal Mobile Phone Card */}
                  <div className={`p-4 rounded-2xl border ${
                    formatText(selectedMember.personal_phone)
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-white/[0.02] border-white/10 opacity-60'
                  } space-y-2`}>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                      <span>📞 Personal Mobile Number</span>
                      {formatText(selectedMember.personal_phone) && (
                        <span className="text-emerald-400 font-mono">✓ Verified</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white truncate font-mono">
                      {formatText(selectedMember.personal_phone) || 'Phone Number Not Added'}
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {formatText(selectedMember.personal_phone) ? (
                        <>
                          <a
                            href={`tel:${formatText(selectedMember.personal_phone)}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1 text-xs transition-all"
                          >
                            <Phone className="w-3.5 h-3.5 text-black" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${formatText(selectedMember.personal_phone).replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 text-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                          <button
                            onClick={() => copyToClipboard(formatText(selectedMember.personal_phone), 'Phone Number')}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1 text-xs cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center gap-1"
                        >
                          <Slash className="w-3.5 h-3.5 text-slate-500" /> Phone Number Not Added
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Unsubmitted Profile Warning Banner */}
            {!selectedMember.is_private_profile_completed && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 font-mono text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <strong className="block text-white">Private Profile Not Submitted</strong>
                  <span className="text-slate-400 text-[11px]">
                    This employee has not submitted their private self-service profile details yet.
                  </span>
                </div>
              </div>
            )}

            {/* Modal Tabs Navigation (Admin & HR Views) */}
            {(userRole === 'admin' || userRole === 'hr') && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
                <button
                  onClick={() => setActiveModalTab('overview')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeModalTab === 'overview' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                  }`}
                >
                  Roster Overview
                </button>
                <button
                  onClick={() => setActiveModalTab('personal')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeModalTab === 'personal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                  }`}
                >
                  Personal &amp; Contact
                </button>
                <button
                  onClick={() => setActiveModalTab('address')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeModalTab === 'address' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                  }`}
                >
                  Addresses
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={() => setActiveModalTab('bank')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      activeModalTab === 'bank' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                    }`}
                  >
                    Bank &amp; Financial
                  </button>
                )}

                <button
                  onClick={() => setActiveModalTab('emergency')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeModalTab === 'emergency' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                  }`}
                >
                  Emergency Contact
                </button>
              </div>
            )}

            {/* TAB CONTENT: TEAM MEMBER VIEW & OVERVIEW */}
            {(userRole === 'team' || activeModalTab === 'overview') && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Department &amp; Position</div>
                    <div className="text-sm font-bold text-white">{selectedMember.department}</div>
                    <div className="text-xs text-purple-300 font-bold">{selectedMember.position}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Official Company Email</div>
                    <div className="text-sm font-bold text-cyan-300 truncate">{selectedMember.company_email}</div>
                  </div>
                </div>

                {selectedMember.public_bio && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Public Professional Bio</div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedMember.public_bio}</p>
                  </div>
                )}

                {Array.isArray(selectedMember.skills) && selectedMember.skills.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase">Skills &amp; Technical Stack</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold"
                        >
                          ⚡ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: PERSONAL & CONTACT (Admin & HR) */}
            {userRole !== 'team' && activeModalTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Personal Mobile Phone</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {formatText(selectedMember.personal_phone) || 'Phone Number Not Added'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Personal Email</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {formatText(selectedMember.personal_email) || 'Personal Email Not Added'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Date of Birth</div>
                    <div className="text-xs font-bold text-white">{formatText(selectedMember.dob) || 'Not Specified'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Blood Group</div>
                    <div className="text-xs font-bold text-red-400">{formatText(selectedMember.blood_group) || 'Not Specified'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Languages</div>
                    <div className="text-xs font-bold text-white">
                      {Array.isArray(selectedMember.languages) && selectedMember.languages.length > 0
                        ? selectedMember.languages.join(', ')
                        : 'English'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: ADDRESSES (Admin & HR) */}
            {userRole !== 'team' && activeModalTab === 'address' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Current Residential Address</div>
                  <div className="text-xs text-white leading-relaxed">
                    {formatText(selectedMember.address_current) || 'No current address submitted.'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Permanent Address</div>
                  <div className="text-xs text-white leading-relaxed">
                    {formatText(selectedMember.address_permanent) || 'No permanent address submitted.'}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: BANK & FINANCIAL (Admin Unmasked / HR Masked) */}
            {userRole === 'admin' && activeModalTab === 'bank' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Bank Name &amp; Holder</div>
                    <div className="text-sm font-bold text-white">{formatText(selectedMember.bank_name) || 'Bank Not Specified'}</div>
                    <div className="text-xs text-cyan-300">{formatText(selectedMember.account_holder)}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Bank Account Number (Decrypted)</div>
                    <div className="text-sm font-bold text-emerald-300 font-mono">
                      {formatText(selectedMember.bank_account_number) || 'Not Provided'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">IFSC Code</div>
                    <div className="text-xs font-bold text-white font-mono">{formatText(selectedMember.ifsc_code) || 'Not Provided'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">PAN Number</div>
                    <div className="text-xs font-bold text-white font-mono">{formatText(selectedMember.pan_number) || 'Not Provided'}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">UPI Virtual Handle</div>
                    <div className="text-xs font-bold text-purple-300 font-mono">{formatText(selectedMember.upi_id) || 'Not Provided'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: EMERGENCY CONTACT (Admin & HR) */}
            {userRole !== 'team' && activeModalTab === 'emergency' && (
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
                <div className="text-xs font-bold text-red-300 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" /> Emergency Contact Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400">Contact Person Name</div>
                    <div className="text-xs font-bold text-white">{formatText(selectedMember.emergency_contact_person) || 'Not Provided'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400">Relationship</div>
                    <div className="text-xs font-bold text-white">{formatText(selectedMember.emergency_relationship) || 'Not Specified'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400">Emergency Phone Number</div>
                    <div className="text-xs font-bold text-emerald-300 font-mono">{formatText(selectedMember.emergency_contact_phone) || 'Not Provided'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
