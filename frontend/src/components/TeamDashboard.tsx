import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Key,
  LogOut,
  Clock,
  CheckCircle,
  AlertTriangle,
  Save,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  FileText,
  Sparkles,
  RefreshCw,
  Award,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeft,
  Camera,
  UserCheck,
  Building,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { SecurePrivateProfileEditor } from './SecurePrivateProfileEditor';
import { portalAuthApi, uploadApi, selfProfileApi } from '../services/api';

interface TeamDashboardProps {
  initialUserData: any;
  onLogout: () => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ initialUserData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'password'>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchFilterQuery, setSearchFilterQuery] = useState('');

  const [profile, setProfile] = useState<any>(() => {
    if (initialUserData && Object.keys(initialUserData).length > 0) return initialUserData;
    try {
      const saved = localStorage.getItem('zenemoo_portal_user');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [cooldownInfo, setCooldownInfo] = useState<any>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await portalAuthApi.getMeProfile();
      if (res.data && res.data.success) {
        const u = res.data.user;
        setProfile(u);
        localStorage.setItem('zenemoo_portal_user', JSON.stringify(u));
        setCooldownInfo(res.data.image_cooldown || {});
      }
    } catch (err: any) {
      console.warn('Failed to fetch profile:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLogout();
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile && (profile.temporary_password === true || profile.password_changed === false)) {
      setActiveTab('password');
    }
  }, [profile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cooldownInfo.can_upload_image && profile.role !== 'admin') {
      showToast(cooldownInfo.countdown_message || 'Image update cooldown active (7-day rule).', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'zenemoo/team');

      const uploadRes = await uploadApi.upload(formData);
      if (uploadRes.data && uploadRes.data.url) {
        const imageUrl = uploadRes.data.url;
        const res = await selfProfileApi.uploadImage(imageUrl);
        if (res.data && res.data.success) {
          showToast(res.data.message || '⚡ Profile picture submitted for Administrator approval!', 'success');
          await fetchProfile();
        } else {
          showToast(res.data?.message || 'Failed to update image.', 'error');
        }
      } else {
        showToast('Failed to upload image asset.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Image upload blocked (7-day rule).', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await portalAuthApi.changePassword(currentPassword, newPassword);
      if (res.data && res.data.success) {
        showToast('Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await fetchProfile();
      } else {
        showToast(res.data?.message || 'Failed to change password.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Password change failed.', 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passStrength = getPasswordStrength(newPassword);

  const handleReturnToHome = () => {
    window.history.pushState(null, '', '/');
    window.location.hash = '';
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl font-mono text-xs font-bold border backdrop-blur-xl animate-bounce flex items-center gap-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-red-500/20 text-red-300 border-red-500/40'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toastMsg.text}
        </div>
      )}

      {/* 1. ENTERPRISE SIDEBAR NAVIGATION (Desktop & Mobile) */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen bg-[#09090b] border-r border-white/10 flex flex-col justify-between p-4 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="space-y-6">
          {/* Sidebar Brand Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md shrink-0" />
              {!isSidebarCollapsed && (
                <div className="truncate">
                  <div className="font-display font-extrabold text-sm text-white tracking-wider truncate">ZENEMOO</div>
                  <div className="text-[10px] font-mono text-cyan-400 truncate">Team Portal</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Sidebar Menu Items */}
          <nav className="space-y-1.5 font-mono text-xs">
            <button
              onClick={() => {
                setActiveTab('overview');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <User className="w-4 h-4 text-cyan-400 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Overview &amp; Profile</span>}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('profile');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Edit Private Profile</span>}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('password');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Account Security</span>}
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="pt-4 border-t border-white/10 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={profile.image_url || '/assets/executive.png'}
                alt={profile.name}
                className="w-9 h-9 rounded-xl object-cover border border-cyan-400/50"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {!isSidebarCollapsed && (
              <div className="truncate">
                <div className="font-bold text-white text-xs truncate">{profile.name || 'Team Member'}</div>
                <div className="text-[10px] text-slate-400 truncate">{profile.employee_id || 'ZNM-MEMBER'}</div>
                <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online Member
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 py-3.5 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 truncate">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white cursor-pointer"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              {activeTab === 'overview' && <User className="w-5 h-5" />}
              {activeTab === 'profile' && <Sparkles className="w-5 h-5" />}
              {activeTab === 'password' && <Key className="w-5 h-5" />}
            </div>

            <div className="truncate">
              <h1 className="text-sm font-bold font-display text-white tracking-tight truncate">
                {activeTab === 'overview' && 'Team Member Profile & Roster Record'}
                {activeTab === 'profile' && 'Self-Service Secure Private Profile Editor'}
                {activeTab === 'password' && 'Account Password & Security'}
              </h1>
              <p className="text-[11px] font-mono text-slate-400 truncate">
                Zenemoo Platform &bull; Sequential Reordering &amp; AI Engine
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
            {/* Filter Search Input */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter list records..."
                value={searchFilterQuery}
                onChange={(e) => setSearchFilterQuery(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none placeholder-slate-500 w-36"
              />
            </div>

            <NotificationBell />

            <button
              onClick={onLogout}
              className="px-3 py-1.8 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <button
              onClick={handleReturnToHome}
              className="px-3 py-1.8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Return to Website"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Top Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-mono text-xs">
            {/* Metric 1: Assigned Role */}
            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Assigned Position</span>
                <span className="text-base font-bold text-white block">{profile.designation || 'Specialist'}</span>
                <span className="text-[10px] text-cyan-400 block">{profile.department || 'Engineering'}</span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 2: Official Employee ID */}
            <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Employee ID</span>
                <span className="text-base font-bold text-purple-300 block">{profile.employee_id || 'ZNM-E861'}</span>
                <span className="text-[10px] text-purple-400 block">Joined: {profile.joining_date || 'Active'}</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            {/* Metric 3: Image Cooldown Status */}
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Image Upload Status</span>
                <span className="text-xs font-bold text-emerald-300 block truncate max-w-[170px]">
                  {cooldownInfo.can_upload_image ? 'Ready for Update' : 'Cooldown Active'}
                </span>
                <span className="text-[10px] text-emerald-400 block truncate max-w-[170px]">
                  {cooldownInfo.countdown_message || '7-day policy enforced.'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & MY PROFILE */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              {/* Read-Only Official Information Panel */}
              <div className="md:col-span-1 glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-3">
                  <Shield className="w-4 h-4 text-cyan-400" /> Official Roster Record
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Official employee credentials below are managed by the Administrator and read-only.
                </p>

                <div className="space-y-3 font-mono">
                  <div className="relative group p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                    <img
                      src={profile.image_url || '/assets/executive.png'}
                      alt={profile.name}
                      className="w-14 h-14 rounded-xl object-cover border border-cyan-400"
                    />
                    <div>
                      <div className="font-bold text-white text-sm">{profile.name}</div>
                      <div className="text-xs text-cyan-400 font-bold">{profile.employee_id}</div>
                      <label
                        htmlFor="avatar-upload"
                        className="text-[10px] text-purple-400 hover:underline cursor-pointer flex items-center gap-1 mt-1"
                      >
                        <Camera className="w-3 h-3" /> Change Photo
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={!cooldownInfo.can_upload_image && profile.role !== 'admin'}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Designation &amp; Role</div>
                    <div className="text-sm font-bold text-white">{profile.designation}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Department</div>
                    <div className="text-sm font-bold text-cyan-300">{profile.department}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Official Email</div>
                    <div className="text-xs font-bold text-white truncate">{profile.email}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Date of Joining</div>
                    <div className="text-xs font-bold text-white">{profile.joining_date || 'Active Roster'}</div>
                  </div>
                </div>
              </div>

              {/* Profile Bio & Skills Overview */}
              <div className="md:col-span-2 space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" /> Bio &amp; Professional Summary
                    </h3>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      Edit Private Profile &rarr;
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    {profile.bio || 'No professional bio description added yet. Click Edit Private Profile to add your bio.'}
                  </p>
                </div>

                <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                    <Award className="w-4 h-4 text-cyan-400" /> Skills &amp; Technical Capabilities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                      profile.skills.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold"
                        >
                          ⚡ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 font-mono italic">No technical skills added yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PRIVATE PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <SecurePrivateProfileEditor showToast={showToast} role={profile.role} />
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 max-w-xl space-y-6 font-mono text-xs">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" /> Account Security &amp; Password Update
                </h2>
                <p className="text-xs text-slate-400">Change your portal account password. Password must contain letters, numbers, and symbols.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password..."
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">New Password *</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password..."
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Password Complexity Strength</span>
                        <span className="font-bold text-amber-300">
                          {passStrength <= 2 ? 'Weak' : passStrength <= 4 ? 'Good' : 'Strong'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passStrength <= 2 ? 'bg-red-500' : passStrength <= 4 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${(passStrength / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold font-display text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isChangingPass ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />} Update Password
              </button>
            </form>
          )}
        </main>

        {/* Dashboard Footer */}
        <footer className="py-4 px-8 border-t border-white/10 font-mono text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div>
            &copy; {new Date().getFullYear()} Zenemoo AI Solutions Pvt. Ltd. Powered by Zenemoo Enterprise AI Platform
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:text-slate-400 cursor-pointer">Documentation</span>
            <span className="hover:text-slate-400 cursor-pointer">Support Portal</span>
            <span className="hover:text-slate-400 cursor-pointer">Privacy &amp; Terms</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
