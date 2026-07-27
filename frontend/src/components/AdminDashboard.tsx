import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Key, Database, Cloud, Activity, CheckCircle, ShieldAlert, ArrowLeft, Save, Plus, Edit, Trash2, Upload, RefreshCw, Eye, Lock, X, Mail, MessageSquare, Phone, Building } from 'lucide-react';
import { TeamMember, INITIAL_TEAM_MEMBERS, getStoredTeamMembers, saveTeamMembers } from '../lib/teamStore';
import { SiteConfig, TelemetryConfig, ContactInquiry, getSiteConfig, saveSiteConfig, getTelemetryConfig, saveTelemetryConfig, uploadImageToCloudinary, getContactInquiries } from '../lib/adminStore';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  const [activeTab, setActiveTab] = useState<'team' | 'inquiries' | 'telemetry' | 'keys'>('team');

  // Team State
  const [teamList, setTeamList] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [skillsInput, setSkillsInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Inquiries State
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);

  // Config State
  const [config, setConfig] = useState<SiteConfig>(getSiteConfig());
  const [telemetry, setTelemetry] = useState<TelemetryConfig>(getTelemetryConfig());
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const members = await getStoredTeamMembers();
      setTeamList(members);
      const contactData = await getContactInquiries();
      setInquiries(contactData);
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

  // Team Handlers
  const handleCreateMember = () => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: '',
      role: 'Audio Transcription Specialist',
      image: '',
      fallback: '/assets/executive.png',
      bio: '',
      skills: ['Transcription', 'Data Annotation', 'Quality Focus'],
      badge: 'Specialist',
      email: 'quantumcoderstechlab@gmail.com',
    };
    setEditingMember(newMember);
    setSkillsInput(newMember.skills.join(', '));
  };

  const handleEditMember = (m: TeamMember) => {
    setEditingMember({ ...m });
    setSkillsInput(m.skills ? m.skills.join(', ') : '');
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('Delete this team member from database?')) {
      const updated = teamList.filter((m) => m.id !== id);
      setTeamList(updated);
      await saveTeamMembers(updated);
      showStatus('Team member deleted successfully!');
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updatedMember = {
      ...editingMember,
      skills: parsedSkills.length > 0 ? parsedSkills : ['Specialist'],
    };

    const exists = teamList.some((m) => m.id === updatedMember.id);
    let updatedList: TeamMember[];
    if (exists) {
      updatedList = teamList.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    } else {
      updatedList = [updatedMember, ...teamList];
    }

    setTeamList(updatedList);
    await saveTeamMembers(updatedList);
    setEditingMember(null);
    showStatus('Team member saved to Supabase database!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;
    setIsUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'zenemoo/team');
      setEditingMember({ ...editingMember, image: url });
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

  // Config Handlers
  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    saveSiteConfig(config);
    showStatus('API Credentials saved successfully!');
  };

  const handleSaveTelemetry = (e: React.FormEvent) => {
    e.preventDefault();
    saveTelemetryConfig(telemetry);
    showStatus('Telemetry metrics updated!');
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // PASSCODE LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-white/10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-[2px] mx-auto shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0a0b12] rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold font-display text-white">Zenemoo Admin Dashboard</h2>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Enter passcode to manage Supabase, Cloudinary, and contact messages.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                placeholder="Enter Passcode (default: zenemoo2026)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 font-mono text-center"
              />
              {passError && <p className="text-xs text-red-400 font-mono mt-2">{passError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 hover:opacity-95 transition-all"
            >
              Access Admin Control Center
            </button>
          </form>

          <button
            onClick={onExit}
            className="text-xs font-mono text-slate-400 hover:text-white inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Website
          </button>
        </div>
      </div>
    );
  }

  // MAIN ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans relative z-50">
      {/* Top Admin Navbar */}
      <header className="bg-[#0a0b12] border-b border-white/10 sticky top-0 z-40 px-4 sm:px-8 py-4 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[2px]">
              <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-white flex items-center gap-2">
                Zenemoo Admin Control Center
              </h1>
              <div className="text-[11px] font-mono text-cyan-400">
                Supabase &amp; Cloudinary Ecosystem Management
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {statusMessage && (
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-pulse">
                ✓ {statusMessage}
              </span>
            )}

            <button
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/20 text-slate-200 text-xs font-mono flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              Exit to Website
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-8 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'team'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Team Members ({teamList.length})
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

        {/* TAB 1: TEAM MEMBERS MANAGEMENT */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-display text-white">Team Directory Management</h3>
                <p className="text-xs font-mono text-slate-400">
                  Add, edit, or delete team members. Photos uploaded are synced with Cloudinary &amp; Supabase.
                </p>
              </div>

              <button
                onClick={handleCreateMember}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Team Member
              </button>
            </div>

            {/* Editing Form Modal */}
            {editingMember && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 space-y-6 bg-black/80">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h4 className="text-lg font-bold font-display text-white">
                    {teamList.some((m) => m.id === editingMember.id) ? 'Edit Team Member' : 'Add New Specialist'}
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
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Role Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="Data Annotation Specialist"
                        value={editingMember.role}
                        onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Skills (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="Transcription, Annotation, Quality Focus"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Cloudinary Image Upload */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <label className="block text-xs font-mono text-cyan-300 font-bold flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Cloudinary Image Uploader (Folder: zenemoo/team)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                        {editingMember.image ? (
                          <img src={editingMember.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">No Image</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="url"
                          placeholder="https://res.cloudinary.com/rwoe0mm9/image/upload/zenemoo/team/..."
                          value={editingMember.image}
                          onChange={(e) => setEditingMember({ ...editingMember, image: e.target.value })}
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

            {/* Team Directory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamList.map((m) => (
                <div key={m.id} className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.image || m.fallback || '/assets/executive.png'}
                      onError={(e) => { (e.target as HTMLImageElement).src = m.fallback || '/assets/executive.png'; }}
                      alt={m.name}
                      className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-white text-base font-display">{m.name}</h4>
                      <div className="text-xs font-mono text-purple-400">{m.role}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-cyan-300">
                        {m.badge}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="text-[10px] font-mono text-slate-500">ID: {m.id}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditMember(m)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10"
                        title="Edit Member"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                      <div className="font-bold text-base text-white">{inq.name}</div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                        {inq.status || 'NEW'}
                      </span>
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

        {/* TAB 3: TELEMETRY & CAPACITY */}
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
                <label className="block text-slate-300 mb-1">Quality &amp; Accuracy Rate (%)</label>
                <input
                  type="number"
                  value={telemetry.accuracyRate}
                  onChange={(e) => setTelemetry({ ...telemetry, accuracyRate: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Total Active Team Members</label>
                <input
                  type="number"
                  value={telemetry.activeSpecialists}
                  onChange={(e) => setTelemetry({ ...telemetry, activeSpecialists: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
              >
                Save Telemetry Metrics
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: SUPABASE & CLOUDINARY KEYS GUIDE */}
        {activeTab === 'keys' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold font-display text-white">API Keys &amp; Database Credentials</h3>

            <form onSubmit={handleSaveKeys} className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 font-mono text-xs">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4" /> Supabase Database Credentials
                </h4>

                <div>
                  <label className="block text-slate-300 mb-1">VITE_SUPABASE_URL</label>
                  <input
                    type="text"
                    value={config.supabaseUrl}
                    onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">VITE_SUPABASE_ANON_KEY</label>
                  <input
                    type="password"
                    value={config.supabaseAnonKey}
                    onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                  <Cloud className="w-4 h-4" /> Cloudinary CDN Upload Credentials
                </h4>

                <div>
                  <label className="block text-slate-300 mb-1">VITE_CLOUDINARY_CLOUD_NAME</label>
                  <input
                    type="text"
                    value={config.cloudinaryCloudName}
                    onChange={(e) => setConfig({ ...config, cloudinaryCloudName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">VITE_CLOUDINARY_UPLOAD_PRESET</label>
                  <input
                    type="text"
                    value={config.cloudinaryUploadPreset}
                    onChange={(e) => setConfig({ ...config, cloudinaryUploadPreset: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                Save Credentials
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
