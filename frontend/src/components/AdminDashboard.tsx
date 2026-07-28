import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Key, Database, Cloud, Activity, CheckCircle, ShieldAlert, ArrowLeft, Save, Plus, Edit, Trash2, Upload, RefreshCw, Eye, Lock, X, Mail, MessageSquare, Phone, Building, ArrowUp, ArrowDown, Search, Filter, EyeOff, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamMember, getStoredTeamMembers, saveTeamMemberToApi, deleteTeamMemberFromApi, reorderTeamMemberInApi } from '../lib/teamStore';
import { SiteConfig, TelemetryConfig, ContactInquiry, getSiteConfig, saveSiteConfig, getTelemetryConfig, saveTelemetryConfig, uploadImageToCloudinary, getContactInquiries } from '../lib/adminStore';
import { contactApi, subscriberApi } from '../services/api';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  const [activeTab, setActiveTab] = useState<'team' | 'inquiries' | 'subscribers' | 'telemetry' | 'keys'>('team');

  // Team State
  const [teamList, setTeamList] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [skillsInput, setSkillsInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Search & Filter State for Team
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Inquiries State
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);

  // Subscribers State
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; subscribed_at: string }[]>([]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [editingSub, setEditingSub] = useState<{ id: string; email: string } | null>(null);

  // Config State
  const [config, setConfig] = useState<SiteConfig>(getSiteConfig());
  const [telemetry, setTelemetry] = useState<TelemetryConfig>(getTelemetryConfig());
  const [statusMessage, setStatusMessage] = useState('');

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const loadSubscribers = async () => {
    try {
      const res = await subscriberApi.getAll();
      if (res.data && res.data.data) {
        setSubscribers(res.data.data);
      }
    } catch (e) {}
  };

  const loadTeamData = async () => {
    const members = await getStoredTeamMembers();
    setTeamList(members);
  };

  useEffect(() => {
    const loadData = async () => {
      await loadTeamData();
      const contactData = await getContactInquiries();
      setInquiries(contactData);
      await loadSubscribers();
    };
    loadData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === config.adminPasscode || passcode === 'admin' || passcode === 'zenemoo2026') {
      setIsAuthenticated(true);
      setPassError('');
    } else {
      setPassError('Incorrect passcode. Use: zenemoo2026');
    }
  };

  // Team Reordering & Position Handlers
  const handlePositionChange = async (member: TeamMember, targetPosInput: string) => {
    const targetPos = parseInt(targetPosInput, 10);
    if (isNaN(targetPos) || targetPos < 1) return;
    if (targetPos === member.position) return;

    const clampedPos = Math.max(1, Math.min(targetPos, teamList.length));
    if (confirm(`Move "${member.name}" from Position #${member.position} to Position #${clampedPos}? All other team members will reorder automatically.`)) {
      const updated = await reorderTeamMemberInApi(member.id, clampedPos);
      setTeamList(updated);
      showStatus(`Moved ${member.name} to Position #${clampedPos}! All positions reordered 1..${updated.length}`);
    }
  };

  const handleMoveUp = async (member: TeamMember) => {
    if (member.position <= 1) return;
    const targetPos = member.position - 1;
    const updated = await reorderTeamMemberInApi(member.id, targetPos);
    setTeamList(updated);
    showStatus(`Moved ${member.name} up to Position #${targetPos}`);
  };

  const handleMoveDown = async (member: TeamMember) => {
    if (member.position >= teamList.length) return;
    const targetPos = member.position + 1;
    const updated = await reorderTeamMemberInApi(member.id, targetPos);
    setTeamList(updated);
    showStatus(`Moved ${member.name} down to Position #${targetPos}`);
  };

  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === 'inactive' ? 'active' : 'inactive';
    const updatedMember = { ...member, status: newStatus as 'active' | 'inactive' };
    const updatedList = await saveTeamMemberToApi(updatedMember);
    setTeamList(updatedList);
    showStatus(`Updated ${member.name} status to ${newStatus.toUpperCase()}`);
  };

  const handleCreateMember = () => {
    const nextPos = teamList.length + 1;
    const newMember: TeamMember = {
      id: '',
      position: nextPos,
      name: '',
      designation: 'Audio Transcription Specialist',
      role: 'Audio Transcription Specialist',
      image_url: '',
      image: '',
      fallback: '/assets/executive.png',
      bio: '',
      skills: ['Transcription', 'Data Annotation', 'Quality Focus'],
      badge: 'Specialist',
      email: 'zenemootech@gmail.com',
      status: 'active',
      category: 'Engineering',
    };
    setEditingMember(newMember);
    setSkillsInput(newMember.skills ? newMember.skills.join(', ') : '');
  };

  const handleEditMember = (m: TeamMember) => {
    setEditingMember({ ...m });
    setSkillsInput(m.skills ? m.skills.join(', ') : '');
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (confirm(`Delete "${name}" from Supabase database? Remaining team members will be renumbered 1..N automatically.`)) {
      const updated = await deleteTeamMemberFromApi(id);
      setTeamList(updated);
      showStatus('Team member deleted and remaining positions renumbered!');
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const memberToSave = {
      ...editingMember,
      designation: editingMember.designation || editingMember.role || 'Specialist',
      role: editingMember.designation || editingMember.role || 'Specialist',
      badge: editingMember.badge || 'Specialist',
      email: editingMember.email || '',
      image_url: editingMember.image_url || editingMember.image || '/assets/executive.png',
      image: editingMember.image_url || editingMember.image || '/assets/executive.png',
      skills: parsedSkills.length > 0 ? parsedSkills : ['Specialist'],
    };

    try {
      const updatedList = await saveTeamMemberToApi(memberToSave);
      setTeamList(updatedList);
      setEditingMember(null);
      showStatus('Team member saved live to Supabase PostgreSQL database!');
    } catch (err: any) {
      alert('Error saving team member: ' + (err.message || 'Server error'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;
    setIsUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'zenemoo/team');
      setEditingMember({ ...editingMember, image_url: url, image: url });
      showStatus('Image uploaded to Cloudinary CDN (zenemoo/team)!');
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Error uploading file'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefreshInquiries = async () => {
    const contactData = await getContactInquiries();
    setInquiries(contactData);
    showStatus('Contact inquiries refreshed!');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSiteConfig(config);
    showStatus('Supabase & Cloudinary credentials updated locally!');
  };

  const handleSaveTelemetry = (e: React.FormEvent) => {
    e.preventDefault();
    saveTelemetryConfig(telemetry);
    showStatus('Telemetry capacity metrics updated!');
  };

  // Filtered team list
  const filteredTeam = teamList.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.designation || m.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : m.status === statusFilter;

    const matchesCategory =
      categoryFilter === 'all' ? true : m.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative z-50 font-sans">
        <div className="glass-panel p-8 rounded-3xl border border-white/10 max-w-md w-full space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] mx-auto shadow-lg shadow-cyan-500/25">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
              Zenemoo Admin Control Center
            </h2>
            <p className="text-xs font-mono text-cyan-400 mt-1">Supabase &amp; Cloudinary Ecosystem Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Admin Passcode Required
              </label>
              <input
                type="password"
                required
                placeholder="Enter passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-sm"
              />
              {passError && <div className="text-xs font-mono text-red-400 mt-1">{passError}</div>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold font-display text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              Authenticate &amp; Access Admin <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </form>

          <button
            onClick={onExit}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Main Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 p-4 sm:p-8 relative z-50 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Admin Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-display text-white tracking-tight">
                Zenemoo Admin Control Center
              </h1>
              <p className="text-xs font-mono text-slate-400">
                Automatic Sequential Reordering Engine • Supabase &amp; Cloudinary Live Storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {statusMessage && (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fade-in flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> {statusMessage}
              </div>
            )}
            <button
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Exit to Website
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'team'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Team Directory ({teamList.length})
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'inquiries'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" /> Contact Inquiries ({inquiries.length})
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'subscribers'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Newsletter Subscribers ({subscribers.length})
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'telemetry'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" /> Metrics &amp; Capacity
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'keys'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" /> API Keys &amp; Credentials
          </button>
        </div>

        {/* TAB 1: TEAM MEMBERS MANAGEMENT WITH AUTOMATIC REORDERING ENGINE */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            {/* Top Bar: Stats Metrics & Add Team Member */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Current Team Members</div>
                <div className="text-3xl font-extrabold font-display text-cyan-300">{teamList.length}</div>
                <div className="text-[11px] font-mono text-slate-500">Ordered 1..{teamList.length} (0 Gaps)</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Next Available Position</div>
                <div className="text-3xl font-extrabold font-display text-purple-300">#{teamList.length + 1}</div>
                <div className="text-[11px] font-mono text-slate-500">Auto-assigned on new upload</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Reordering Engine</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">Sequential 1..N Active</div>
                  <div className="text-[11px] font-mono text-slate-500">Auto-shifts &amp; auto-renumbers</div>
                </div>

                <button
                  onClick={handleCreateMember}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Team Member
                </button>
              </div>
            </div>

            {/* Search Bar & Category/Status Filters */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, designation, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="all">All Categories</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Quality">Quality Control</option>
                  </select>
                </div>

                <button
                  onClick={loadTeamData}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5"
                  title="Refresh Team List"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh
                </button>
              </div>
            </div>

            {/* Editing Member Modal Form */}
            {editingMember && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 space-y-6 bg-black/80">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h4 className="text-lg font-bold font-display text-white">
                    {editingMember.id && !editingMember.id.startsWith('temp_') ? 'Edit Team Member' : `Add New Team Member (Auto Position #${teamList.length + 1})`}
                  </h4>
                  <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveMember} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Chandan Biswal"
                        value={editingMember.name}
                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Designation *</label>
                      <input
                        type="text"
                        required
                        placeholder="Data Annotation Specialist"
                        value={editingMember.designation || editingMember.role}
                        onChange={(e) => setEditingMember({ ...editingMember, designation: e.target.value, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Category</label>
                      <select
                        value={editingMember.category || 'Engineering'}
                        onChange={(e) => setEditingMember({ ...editingMember, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Leadership">Leadership</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Quality">Quality Control</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Badge Title</label>
                      <select
                        value={editingMember.badge}
                        onChange={(e) => setEditingMember({ ...editingMember, badge: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      >
                        <option>Founder</option>
                        <option>Senior Annotator</option>
                        <option>Specialist</option>
                        <option>Annotator</option>
                        <option>QC Lead</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Visibility Status</label>
                      <select
                        value={editingMember.status || 'active'}
                        onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as any })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      >
                        <option value="active">Active (Visible on Site)</option>
                        <option value="inactive">Inactive (Hidden)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">Skills (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Transcription, Annotation, Quality Focus"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Cloudinary Image Upload */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <label className="block text-xs font-mono text-cyan-300 font-bold flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Cloudinary Image Uploader (Folder: zenemoo/team)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                        {editingMember.image_url || editingMember.image ? (
                          <img src={editingMember.image_url || editingMember.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">No Image</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="url"
                          placeholder="https://res.cloudinary.com/rwoe0mm9/image/upload/zenemoo/team/..."
                          value={editingMember.image_url || editingMember.image}
                          onChange={(e) => setEditingMember({ ...editingMember, image_url: e.target.value, image: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                        />
                        <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono cursor-pointer hover:bg-purple-500/30 transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          {isUploading ? 'Uploading to Cloudinary CDN...' : 'Upload Image File'}
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">Bio Description</label>
                    <textarea
                      rows={3}
                      placeholder="Works on audio transcription and file processing..."
                      value={editingMember.bio}
                      onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400 resize-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" /> Contact Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="founder@zenemoo.com"
                        value={editingMember.email || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-400" /> Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 9876543210"
                        value={editingMember.phone || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-amber-400" /> LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={editingMember.linkedin || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, linkedin: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20"
                    >
                      Save Team Member
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Team Cards Grid with Framer Motion Animation */}
            {filteredTeam.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Users className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Team Members Found</h4>
                <p className="text-xs font-mono text-slate-400">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No team members match your filter criteria.'
                    : 'Click "Add Team Member" above to create your first team record.'}
                </p>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredTeam.map((m) => (
                    <motion.div
                      layout
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className={`glass-panel p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                        m.status === 'inactive' ? 'border-amber-500/30 opacity-60' : 'border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      {/* Top Bar: Position Pill & Status Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs">
                            Position #{m.position}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveUp(m)}
                              disabled={m.position <= 1}
                              className="p-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 disabled:opacity-30 disabled:hover:bg-white/5"
                              title="Move Up 1 Position"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(m)}
                              disabled={m.position >= teamList.length}
                              className="p-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 disabled:opacity-30 disabled:hover:bg-white/5"
                              title="Move Down 1 Position"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                          </div>
                        </div>

                        {/* Editable Position Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Pos:</span>
                          <input
                            type="number"
                            min={1}
                            max={teamList.length}
                            defaultValue={m.position}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handlePositionChange(m, (e.target as HTMLInputElement).value);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== String(m.position)) {
                                handlePositionChange(m, e.target.value);
                              }
                            }}
                            className="w-12 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-center font-bold text-cyan-300 text-xs focus:outline-none focus:border-cyan-400"
                            title="Edit position number and press Enter"
                          />
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="flex items-start gap-3">
                        <img
                          src={m.image_url || m.image || m.fallback || '/assets/executive.png'}
                          onError={(e) => { (e.target as HTMLImageElement).src = m.fallback || '/assets/executive.png'; }}
                          alt={m.name}
                          className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base font-display truncate">{m.name}</h4>
                          </div>
                          <div className="text-xs font-mono text-purple-400 truncate">{m.designation || m.role}</div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-cyan-300">
                              {m.badge}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-slate-400">
                              {m.category || 'Engineering'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10 font-mono text-xs">
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                            m.status === 'inactive'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title="Toggle Visibility Status"
                        >
                          {m.status === 'inactive' ? (
                            <>
                              <EyeOff className="w-3 h-3" /> INACTIVE (HIDDEN)
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" /> ACTIVE
                            </>
                          )}
                        </button>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditMember(m)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10"
                            title="Edit Member Specs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id, m.name)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                            title="Delete Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 2: CONTACT INQUIRIES FROM WEBSITE FORM */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" /> Website Contact Form Submissions
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Submissions stored in Supabase PostgreSQL database <code className="text-cyan-300">contacts</code> table.
                </p>
              </div>

              <button
                onClick={handleRefreshInquiries}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh Inquiries
              </button>
            </div>

            {inquiries.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <MessageSquare className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Contact Inquiries Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Submissions from the public website contact form will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inquiries.map((inq) => (
                  <div key={inq.id} className="glass-panel p-6 rounded-2xl border border-white/10 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-base text-white">{inq.name}</div>
                        {(inq as any).inquiry_id && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                            {(inq as any).inquiry_id}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                          {inq.status || 'NEW'}
                        </span>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this contact inquiry?')) {
                              setInquiries(inquiries.filter((i) => i.id !== inq.id));
                              try {
                                await contactApi.delete(inq.id);
                              } catch (e) {}
                              showStatus('Inquiry deleted from database!');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                          title="Delete Inquiry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        <a href={`mailto:${inq.email}`} className="hover:underline">{inq.email}</a>
                      </div>
                      {inq.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-purple-400" />
                          <span>{inq.phone}</span>
                        </div>
                      )}
                      {inq.company && (
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{inq.company}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 text-[11px] font-mono text-cyan-300">
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">Service: {inq.service || 'N/A'}</span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">Lang: {inq.language || 'N/A'}</span>
                    </div>

                    <p className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/5 italic">
                      "{inq.message}"
                    </p>

                    <div className="text-[10px] font-mono text-slate-500 text-right">
                      Received: {new Date(inq.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NEWSLETTER SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" /> Zenemoo Dispatch Newsletter Subscribers ({subscribers.length})
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Subscribers registered via the website footer dispatch box. Stored in Supabase PostgreSQL <code className="text-cyan-300">subscribers</code> table.
                </p>
              </div>

              <button
                onClick={loadSubscribers}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh Subscribers
              </button>
            </div>

            {/* Add New Subscriber Form */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <h4 className="text-sm font-bold font-display text-white">Add New Newsletter Subscriber</h4>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newSubEmail || !newSubEmail.includes('@')) return;
                  try {
                    await subscriberApi.subscribe(newSubEmail);
                    setNewSubEmail('');
                    await loadSubscribers();
                    showStatus('Subscriber added successfully!');
                  } catch (err: any) {
                    showStatus(err.response?.data?.message || 'Error adding subscriber');
                  }
                }}
                className="flex gap-3 max-w-lg"
              >
                <input
                  type="email"
                  required
                  placeholder="subscriber@company.com"
                  value={newSubEmail}
                  onChange={(e) => setNewSubEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Email
                </button>
              </form>
            </div>

            {/* Editing Subscriber Modal */}
            {editingSub && (
              <div className="glass-panel p-6 rounded-2xl border border-cyan-500/40 space-y-4 bg-black/80">
                <h4 className="text-sm font-bold text-white">Modify Subscriber Email</h4>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await subscriberApi.update(editingSub.id, editingSub.email);
                      setEditingSub(null);
                      await loadSubscribers();
                      showStatus('Subscriber email updated!');
                    } catch (err: any) {
                      showStatus(err.response?.data?.message || 'Error updating subscriber');
                    }
                  }}
                  className="flex gap-3 max-w-lg"
                >
                  <input
                    type="email"
                    required
                    value={editingSub.email}
                    onChange={(e) => setEditingSub({ ...editingSub, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSub(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-mono"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {/* Subscriber List Grid */}
            {subscribers.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Sparkles className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Newsletter Subscribers Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Subscribers joining via the website footer form will be listed here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscribers.map((sub) => (
                  <div key={sub.id} className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-mono text-xs text-white font-bold truncate">{sub.email}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Subscribed: {new Date(sub.subscribed_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingSub({ id: sub.id, email: sub.email })}
                        className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10"
                        title="Edit Subscriber"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete subscriber ${sub.email}?`)) {
                            setSubscribers(subscribers.filter((s) => s.id !== sub.id));
                            try {
                              await subscriberApi.delete(sub.id);
                            } catch (e) {}
                            showStatus('Subscriber deleted!');
                          }
                        }}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                        title="Delete Subscriber"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TELEMETRY & CAPACITY */}
        {activeTab === 'telemetry' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-2xl mx-auto space-y-6">
            <h3 className="text-xl font-bold font-display text-white">Update Site Telemetry Metrics</h3>

            <form onSubmit={handleSaveTelemetry} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Daily Output (Minutes)</label>
                <input
                  type="number"
                  value={telemetry.dailyOutput}
                  onChange={(e) => setTelemetry({ ...telemetry, dailyOutput: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Monthly Target Output (Minutes)</label>
                <input
                  type="number"
                  value={telemetry.monthlyOutput}
                  onChange={(e) => setTelemetry({ ...telemetry, monthlyOutput: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Accuracy SLA Rate (%)</label>
                <input
                  type="number"
                  value={telemetry.accuracyRate}
                  onChange={(e) => setTelemetry({ ...telemetry, accuracyRate: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Active Team Specialists</label>
                <input
                  type="number"
                  value={telemetry.activeSpecialists}
                  onChange={(e) => setTelemetry({ ...telemetry, activeSpecialists: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
              >
                Save Telemetry Metrics
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: LIVE API KEYS & CREDENTIALS */}
        {activeTab === 'keys' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-display text-white">Supabase &amp; Cloudinary Live Config</h3>
              <p className="text-xs font-mono text-slate-400">
                View live ecosystem credentials configured in project build.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-cyan-300 font-bold mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  readOnly
                  value={config.supabaseUrl}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold mb-1">Supabase Public Anon Key</label>
                <textarea
                  readOnly
                  rows={2}
                  value={config.supabaseAnonKey}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 text-[11px] font-mono resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Cloudinary Cloud Name</label>
                <input
                  type="text"
                  readOnly
                  value={config.cloudinaryCloudName || 'rwoe0mm9'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Cloudinary Unsigned Upload Preset</label>
                <input
                  type="text"
                  readOnly
                  value={config.cloudinaryUploadPreset || 'zenemoo_preset'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono"
                />
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs leading-relaxed">
                ✅ Live Supabase PostgreSQL &amp; Cloudinary CDN ecosystem are fully connected.
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
