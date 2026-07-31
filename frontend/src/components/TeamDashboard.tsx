import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  Lock,
  KeyRound,
  Edit3,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Bell,
  Eye,
  EyeOff,
  Github,
  Linkedin,
  Twitter,
  Briefcase,
  Award,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { portalApi, uploadApi } from '../services/api';
import { NotificationBell } from './NotificationBell';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';

interface TeamDashboardProps {
  onLogout: () => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ onLogout }) => {
  const [profile, setProfile] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'notifications' | 'password'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Profile Edit Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editLanguages, setEditLanguages] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const res = await portalApi.getMyProfile();
      if (res.data && res.data.success) {
        setProfile(res.data.user);
        setUploadStatus(res.data.uploadStatus);
        setEditBio(res.data.user.bio || '');
        setEditSkills(Array.isArray(res.data.user.skills) ? res.data.user.skills.join(', ') : '');
        setEditLanguages(Array.isArray(res.data.user.languages) ? res.data.user.languages.join(', ') : '');
        setEditLinkedin(res.data.user.linkedin || '');
        setEditGithub(res.data.user.github || '');
        setEditTwitter(res.data.user.twitter || '');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Timer hook for updating 7-day upload countdown in real time
  useEffect(() => {
    if (!uploadStatus || uploadStatus.can_upload || !uploadStatus.next_allowed_upload) return;

    const timer = setInterval(() => {
      const target = new Date(uploadStatus.next_allowed_upload).getTime();
      const now = Date.now();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setUploadStatus((prev: any) => ({ ...prev, can_upload: true, message: 'You can update your profile image now.' }));
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / (3600 * 24));
        const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;

        setUploadStatus((prev: any) => ({
          ...prev,
          countdown: { days, hours, minutes, seconds },
          message: `You can update your profile picture again in ${days} Days ${hours} Hours ${minutes} Mins.`,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [uploadStatus]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await portalApi.updateMyProfile({
        bio: editBio,
        skills: editSkills,
        languages: editLanguages,
        linkedin: editLinkedin,
        github: editGithub,
        twitter: editTwitter,
      });

      if (res.data && res.data.success) {
        setProfile(res.data.user);
        setUploadStatus(res.data.uploadStatus);
        setSuccessMsg('Profile details updated successfully!');
        setIsEditingProfile(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile details.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadStatus && !uploadStatus.can_upload) {
      setErrorMsg(uploadStatus.message);
      return;
    }

    setIsUploadingImage(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'zenemoo/team');

      const uploadRes = await uploadApi.upload(formData);
      const imageUrl = uploadRes.data?.url || uploadRes.data?.data?.url;

      if (!imageUrl) {
        throw new Error('Image upload failed to return valid URL');
      }

      const updateRes = await portalApi.updateProfileImage(imageUrl);

      if (updateRes.data && updateRes.data.success) {
        setProfile((prev: any) => ({ ...prev, image_url: imageUrl }));
        setUploadStatus(updateRes.data.uploadStatus);
        setSuccessMsg('Profile picture updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update profile image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPass(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await portalApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to change password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Profile Completion Percentage Calculation
  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.name,
      profile.email,
      profile.designation,
      profile.department,
      profile.employee_id,
      profile.bio,
      profile.image_url !== '/assets/executive.png',
      profile.skills && profile.skills.length > 0,
      profile.languages && profile.languages.length > 0,
      profile.linkedin,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 font-mono text-xs">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-slate-400">Loading Team Member Portal...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      <CursorSpotlight />
      <ThreeNeuralBackground />

      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base sm:text-lg text-white tracking-wider">ZENEMOO</span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                  Team Member Portal
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <img
                src={profile?.image_url || '/assets/executive.png'}
                alt={profile?.name}
                className="w-9 h-9 rounded-full object-cover border border-cyan-500/40"
              />
              <div className="hidden sm:block text-left font-mono">
                <div className="font-bold text-xs text-white truncate max-w-[140px]">{profile?.name}</div>
                <div className="text-[10px] text-cyan-400 font-bold">{profile?.designation}</div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all cursor-pointer"
                title="Sign Out of Portal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10 font-mono text-xs">
        {/* Banner Alert Messages */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Top Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Overview Dashboard
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" /> My Profile &amp; Photo
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications Center
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Change Password
          </button>
        </div>

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Hero Banner */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 relative overflow-hidden space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> ACTIVE EMPLOYEE SESSION
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                    Welcome back, {profile?.name}! 👋
                  </h1>
                  <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
                    {profile?.designation} &bull; {profile?.department} Department &bull; ID: <span className="text-cyan-300 font-bold">{profile?.employee_id || 'ZNM-EMP'}</span>
                  </p>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Edit3 className="w-4 h-4" /> Edit My Profile
                </button>
              </div>

              {/* Profile Completion Bar */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Profile Completion Score</span>
                  <span className="text-cyan-300">{calculateProfileCompletion()}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${calculateProfileCompletion()}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" /> Employee ID
                </div>
                <div className="text-lg font-bold text-white font-mono">{profile?.employee_id || 'ZNM-EMP'}</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> Joining Date
                </div>
                <div className="text-lg font-bold text-white font-mono">{profile?.joining_date || '2023-01-15'}</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Last Active Login
                </div>
                <div className="text-xs font-bold text-emerald-300 font-mono">
                  {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'Active Now'}
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" /> Photo Upload Status
                </div>
                <div className="text-xs font-bold text-amber-300 font-mono">
                  {uploadStatus?.can_upload ? 'Eligible Now' : `${uploadStatus?.countdown?.days || 0}d ${uploadStatus?.countdown?.hours || 0}h remaining`}
                </div>
              </div>
            </div>

            {/* Profile & 7-Day Image Widget Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" /> Executive Profile Summary
                  </h3>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs text-cyan-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <img
                    src={profile?.image_url || '/assets/executive.png'}
                    alt={profile?.name}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-xl shrink-0"
                  />

                  <div className="space-y-3 min-w-0 flex-1">
                    <div>
                      <h2 className="text-lg font-extrabold text-white">{profile?.name}</h2>
                      <p className="text-cyan-300 font-bold">{profile?.designation} &bull; {profile?.department}</p>
                      <p className="text-slate-400 text-[11px]">{profile?.email}</p>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      {profile?.bio || 'No bio description provided.'}
                    </p>
                  </div>
                </div>

                {/* Skills & Languages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-cyan-400" /> Core Skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile?.skills && profile.skills.length > 0 ? (
                        profile.skills.map((skill: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px]">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">No skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Spoken Languages
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile?.languages && profile.languages.length > 0 ? (
                        profile.languages.map((lang: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px]">
                            {lang}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">No languages listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 7-Day Profile Picture Widget */}
              <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <h3 className="text-base font-bold text-white font-display">Profile Image Policy</h3>
                  </div>

                  <p className="text-slate-400 text-xs leading-relaxed">
                    To optimize storage security, team members can update their profile image <span className="text-amber-300 font-bold">once every 7 days</span>.
                  </p>

                  {!uploadStatus?.can_upload && uploadStatus?.countdown ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                      <div className="text-[10px] uppercase font-bold text-amber-400">Next Upload Countdown</div>
                      <div className="text-xl font-extrabold text-white font-mono tracking-wider">
                        {uploadStatus.countdown.days}d {uploadStatus.countdown.hours}h {uploadStatus.countdown.minutes}m {uploadStatus.countdown.seconds}s
                      </div>
                      <div className="text-[10px] text-slate-400">Rate limit resets automatically</div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                      <div className="text-xs font-bold text-emerald-300">✅ You are eligible to update your photo</div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <label
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      uploadStatus?.can_upload && !isUploadingImage
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isUploadingImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin"></div>
                        <span>Uploading Photo...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>{uploadStatus?.can_upload ? 'Upload New Photo' : 'Photo Rate Limited'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!uploadStatus?.can_upload || isUploadingImage}
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">My Employee Profile &amp; Settings</h2>
                  <p className="text-slate-400 text-xs">View full employee details and self-update bio, skills, and social links.</p>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile Details
                </button>
              </div>

              {/* Locked Employee Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Full Name (Admin Controlled)
                  </div>
                  <div className="text-sm font-bold text-white">{profile?.name}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Designation (Admin Controlled)
                  </div>
                  <div className="text-sm font-bold text-cyan-300">{profile?.designation}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Department (Admin Controlled)
                  </div>
                  <div className="text-sm font-bold text-white">{profile?.department}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Employee ID (Admin Controlled)
                  </div>
                  <div className="text-sm font-bold text-purple-300">{profile?.employee_id || 'ZNM-EMP'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Joining Date (Admin Controlled)
                  </div>
                  <div className="text-sm font-bold text-white">{profile?.joining_date}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Official Email (Admin Controlled)
                  </div>
                  <div className="text-sm font-bold text-emerald-300">{profile?.email}</div>
                </div>
              </div>

              {/* Bio & Social Links */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Biography &amp; Bio Summary</label>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-300 text-xs leading-relaxed">
                    {profile?.bio || 'No bio provided.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                    <Linkedin className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400">LinkedIn Profile</div>
                      <div className="text-xs font-bold text-white truncate">{profile?.linkedin || 'Not linked'}</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                    <Github className="w-5 h-5 text-slate-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400">GitHub Profile</div>
                      <div className="text-xs font-bold text-white truncate">{profile?.github || 'Not linked'}</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                    <Twitter className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400">Twitter / X</div>
                      <div className="text-xs font-bold text-white truncate">{profile?.twitter || 'Not linked'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">Notification Center</h2>
                  <p className="text-slate-400 text-xs">View all system announcements, project deadlines, meeting invites, and payout notices.</p>
                </div>
              </div>

              {/* Embed Notification Bell List directly in full view */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <NotificationBell />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHANGE PASSWORD TAB */}
        {activeTab === 'password' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 space-y-6">
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> SECURE PASSWORD MANAGEMENT
                </div>
                <h2 className="text-xl font-bold text-white font-display">Change Your Portal Password</h2>
                <p className="text-slate-400 text-xs">
                  Update your default password (<code className="text-cyan-300 font-bold">Team@123</code>) to a strong personal password.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Current Password <span className="text-cyan-400">*</span></label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      placeholder="Enter current password (e.g. Team@123)"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">New Password <span className="text-cyan-400">*</span></label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Confirm New Password <span className="text-cyan-400">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isChangingPass ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Update Password Now</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/40 w-full max-w-xl space-y-6 font-mono text-xs text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" /> Edit My Profile Details
              </h3>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Bio Description</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Describe your background and expertise..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Skills (Comma-Separated)</label>
                <input
                  type="text"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  placeholder="e.g. Odia Transcription, Audio Segmentation, QA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Languages (Comma-Separated)</label>
                <input
                  type="text"
                  value={editLanguages}
                  onChange={(e) => setEditLanguages(e.target.value)}
                  placeholder="e.g. English, Odia, Hindi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="font-bold text-slate-300">Social Profiles</div>

                <div>
                  <label className="block text-slate-400 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={editGithub}
                    onChange={(e) => setEditGithub(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Twitter / X URL</label>
                  <input
                    type="url"
                    value={editTwitter}
                    onChange={(e) => setEditTwitter(e.target.value)}
                    placeholder="https://twitter.com/username"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold cursor-pointer transition-all shadow-lg flex items-center gap-2"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 text-center text-xs font-mono text-slate-500 relative z-10">
        &copy; 2026 Zenemoo Enterprise AI Language &amp; Data Solutions. Authenticated Team Member Session.
      </footer>
    </div>
  );
};
