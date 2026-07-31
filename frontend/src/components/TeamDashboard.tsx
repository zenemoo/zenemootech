import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Key,
  Bell,
  LogOut,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  Save,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  FileText,
  Calendar,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Award,
  Globe,
  Camera,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { portalAuthApi, selfProfileApi, uploadApi } from '../services/api';

interface TeamDashboardProps {
  initialUserData: any;
  onLogout: () => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ initialUserData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'password' | 'notifications'>('overview');
  const [profile, setProfile] = useState<any>(initialUserData || {});
  const [cooldownInfo, setCooldownInfo] = useState<any>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Editable Profile Form State
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editLanguages, setEditLanguages] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editPortfolio, setEditPortfolio] = useState('');

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
        setCooldownInfo(res.data.image_cooldown || {});
        setEditBio(u.bio || '');
        setEditSkills(Array.isArray(u.skills) ? u.skills.join(', ') : u.skills || '');
        setEditLanguages(Array.isArray(u.languages) ? u.languages.join(', ') : u.languages || '');
        setEditPhone(u.phone || '');
        setEditLinkedin(u.linkedin || '');
        setEditGithub(u.github || '');
        setEditTwitter(u.twitter || '');
        setEditPortfolio(u.portfolio || '');
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Calculate Profile Completion %
  const calculateCompletion = () => {
    let score = 50; // Base score for credentials & read-only fields
    if (profile.bio) score += 10;
    if (profile.skills && profile.skills.length > 0) score += 10;
    if (profile.languages && profile.languages.length > 0) score += 10;
    if (profile.image_url && profile.image_url !== '/assets/executive.png') score += 10;
    if (profile.linkedin || profile.github || profile.portfolio) score += 10;
    return Math.min(100, score);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const skillsArr = editSkills.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      const langsArr = editLanguages.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

      const res = await selfProfileApi.updateProfile({
        bio: editBio,
        skills: skillsArr,
        languages: langsArr,
        phone: editPhone,
        linkedin: editLinkedin,
        github: editGithub,
        twitter: editTwitter,
        portfolio: editPortfolio,
      });

      if (res.data && res.data.success) {
        showToast('Profile updated successfully in Team Roster!', 'success');
        await fetchProfile();
      } else {
        showToast(res.data?.message || 'Failed to update profile.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Update failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

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
          showToast('Profile image updated successfully!', 'success');
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

  // Password Strength Evaluator
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

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Banner */}
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

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 py-4 px-4 sm:px-8 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <div>
              <div className="font-display font-extrabold text-base text-white tracking-wider">ZENEMOO</div>
              <div className="text-[10px] font-mono text-cyan-400">Team Member Portal</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
              <img
                src={profile.image_url || '/assets/executive.png'}
                alt={profile.name}
                className="w-7 h-7 rounded-full object-cover border border-cyan-400/50"
              />
              <div className="text-left">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{profile.name}</div>
                <div className="text-[10px] font-mono text-cyan-400">{profile.employee_id}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono font-bold text-red-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Welcome Header & Profile Overview Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={profile.image_url || '/assets/executive.png'}
                  alt={profile.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-cyan-400 shadow-xl"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`absolute -bottom-2 -right-2 p-2 rounded-xl bg-cyan-500 text-black shadow-lg cursor-pointer hover:bg-cyan-400 transition-all ${
                    !cooldownInfo.can_upload_image && profile.role !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={cooldownInfo.countdown_message || 'Update Picture'}
                >
                  <Camera className="w-4 h-4" />
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

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">{profile.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold uppercase">
                    {profile.badge || 'Specialist'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-300">
                  {profile.designation} &bull; <span className="text-cyan-400">{profile.department}</span>
                </p>
                <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                  <span>ID: <strong className="text-white">{profile.employee_id}</strong></span>
                  <span>Joined: <strong className="text-white">{profile.joining_date || 'Active Member'}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Completion & 7-Day Countdown Status */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1 min-w-[180px]">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Profile Completion</span>
                  <strong className="text-cyan-300">{calculateCompletion()}%</strong>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${calculateCompletion()}%` }}
                  />
                </div>
              </div>

              {/* 7-Day Image Upload Rule Banner */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1 text-xs font-mono min-w-[220px]">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0" /> Image Update Status
                </div>
                <div className="text-[11px] text-slate-300 leading-tight">
                  {cooldownInfo.countdown_message || 'Ready for profile image update.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" /> Overview &amp; Profile
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Edit Profile Details
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Key className="w-4 h-4" /> Change Password
          </button>
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
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Employee ID</div>
                  <div className="text-sm font-bold text-white">{profile.employee_id}</div>
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
                    Edit Bio &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  {profile.bio || 'No professional bio description added yet. Click Edit Profile to add your bio.'}
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

        {/* TAB 2: EDIT ALLOWED PROFILE FIELDS */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 space-y-6 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold font-display text-white">Self-Service Profile Editor</h2>
                <p className="text-xs text-slate-400">Update your bio, technical skills, spoken languages, and social links.</p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 shadow-lg cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Professional Bio</label>
                  <textarea
                    rows={4}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Briefly describe your expertise, project accomplishments, and specialization..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Technical Skills (Comma Separated)</label>
                  <input
                    type="text"
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    placeholder="e.g. Odia Speech Transcription, Data Annotation, Python, Audio Segmentation"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Spoken Languages (Comma Separated)</label>
                  <input
                    type="text"
                    value={editLanguages}
                    onChange={(e) => setEditLanguages(e.target.value)}
                    placeholder="e.g. English, Odia, Hindi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Contact Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 9827775230"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">LinkedIn Profile URL</label>
                  <input
                    type="text"
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">GitHub Profile URL</label>
                  <input
                    type="text"
                    value={editGithub}
                    onChange={(e) => setEditGithub(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Portfolio / Website Link</label>
                  <input
                    type="text"
                    value={editPortfolio}
                    onChange={(e) => setEditPortfolio(e.target.value)}
                    placeholder="https://portfolio.me"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 max-w-xl space-y-6 font-mono text-xs">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" /> Account Security &amp; Password Update
              </h2>
              <p className="text-xs text-slate-400">Default initial password is Team@123. Please update to a secure password.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Current Password</label>
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
                <label className="block text-slate-300 font-bold mb-1.5">New Password</label>
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

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span>Password Strength:</span>
                      <strong className={passStrength >= 4 ? 'text-emerald-400' : passStrength >= 2 ? 'text-amber-400' : 'text-red-400'}>
                        {passStrength >= 4 ? 'Strong' : passStrength >= 2 ? 'Medium' : 'Weak'}
                      </strong>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passStrength >= 4 ? 'bg-emerald-500' : passStrength >= 2 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(passStrength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              {isChangingPass ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Update Account Password
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs font-mono text-slate-500 border-t border-white/10">
        &copy; {new Date().getFullYear()} Zenemoo Tech &bull; Enterprise Team Member Portal
      </footer>
    </div>
  );
};
