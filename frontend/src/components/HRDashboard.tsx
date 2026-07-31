import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Mail,
  User,
  Bell,
  KeyRound,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { portalApi } from '../services/api';
import { AdminDashboard } from './AdminDashboard';
import { NotificationBell } from './NotificationBell';
import { CursorSpotlight } from './CursorSpotlight';
import { ThreeNeuralBackground } from './ThreeNeuralBackground';

interface HRDashboardProps {
  onLogout: () => void;
}

export const HRDashboard: React.FC<HRDashboardProps> = ({ onLogout }) => {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'notifications' | 'password'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Profile Edit Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editLanguages, setEditLanguages] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const fetchHRProfile = async () => {
    setIsLoading(true);
    try {
      const res = await portalApi.getMyProfile();
      if (res.data && res.data.success) {
        setProfile(res.data.user);
        setEditBio(res.data.user.bio || '');
        setEditSkills(Array.isArray(res.data.user.skills) ? res.data.user.skills.join(', ') : '');
        setEditLanguages(Array.isArray(res.data.user.languages) ? res.data.user.languages.join(', ') : '');

        // Default to email tab if user has email access
        if (res.data.user?.permissions?.email_access) {
          setActiveTab('email');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load HR profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHRProfile();
  }, []);

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
      });

      if (res.data && res.data.success) {
        setProfile(res.data.user);
        setSuccessMsg('HR Profile details updated successfully!');
        setIsEditingProfile(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 font-mono text-xs">
          <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-slate-400">Loading HR Operations Portal...</div>
        </div>
      </div>
    );
  }

  const hasEmailAccess = profile?.permissions?.email_access === true || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
      <CursorSpotlight />
      <ThreeNeuralBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base sm:text-lg text-white tracking-wider">ZENEMOO</span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
                  HR Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <img
                src={profile?.image_url || '/assets/executive.png'}
                alt={profile?.name}
                className="w-9 h-9 rounded-full object-cover border border-purple-500/40"
              />
              <div className="hidden sm:block text-left font-mono">
                <div className="font-bold text-xs text-white truncate max-w-[140px]">{profile?.name}</div>
                <div className="text-[10px] text-purple-300 font-bold">{profile?.designation}</div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all cursor-pointer"
                title="Sign Out of HR Portal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main HR Container */}
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

        {/* HR Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-4 h-4" /> Company Email System
            {hasEmailAccess && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px]">ENABLED</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" /> My Profile
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Change Password
          </button>
        </div>

        {/* TAB 1: COMPANY EMAIL SYSTEM */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            {!hasEmailAccess ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-red-500/30 space-y-4 max-w-xl mx-auto my-12">
                <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
                <h3 className="text-xl font-bold text-white font-display">Email Access Authorization Required</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Your HR account (<span className="text-white font-bold">{profile?.email}</span>) does not currently have active <code className="text-cyan-300">email_access</code> authorization.
                </p>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-300 space-y-1">
                  <div>Please request the System Administrator to enable:</div>
                  <div className="font-bold text-purple-300">User Permissions &rarr; Company Email Access = YES</div>
                </div>
              </div>
            ) : (
              /* Embed Standalone Email View of Admin Dashboard safely */
              <div className="rounded-3xl border border-white/10 overflow-hidden bg-[#050505]/90 backdrop-blur-xl">
                <AdminDashboard
                  initialTab="history"
                  isStandaloneEmailView={true}
                  onExit={() => setActiveTab('profile')}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">HR Personnel Profile</h2>
                  <p className="text-slate-400 text-xs">Official HR record details &amp; self-service bio description.</p>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile Details
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-5">
                <img
                  src={profile?.image_url || '/assets/executive.png'}
                  alt={profile?.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-purple-500/40 shadow-xl shrink-0"
                />

                <div className="space-y-3 min-w-0 flex-1">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">{profile?.name}</h2>
                    <p className="text-purple-300 font-bold">{profile?.designation} &bull; {profile?.department}</p>
                    <p className="text-slate-400 text-[11px]">{profile?.email}</p>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    {profile?.bio || 'No bio description provided.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Employee ID
                  </div>
                  <div className="text-sm font-bold text-purple-300">{profile?.employee_id || 'ZNM-HR'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Joining Date
                  </div>
                  <div className="text-sm font-bold text-white">{profile?.joining_date}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Email Access Permission
                  </div>
                  <div className="text-sm font-bold text-emerald-300 font-mono">
                    {hasEmailAccess ? '✅ AUTHORIZED (YES)' : '❌ DENIED (NO)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">HR Notification Center</h2>
                  <p className="text-slate-400 text-xs">System alerts, candidate notifications, and administrative updates.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <NotificationBell />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="glass-panel p-8 rounded-3xl border border-purple-500/30 space-y-6">
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" /> SECURE HR PASSWORD MANAGEMENT
                </div>
                <h2 className="text-xl font-bold text-white font-display">Change Your HR Password</h2>
                <p className="text-slate-400 text-xs">
                  Update your default password (<code className="text-purple-300 font-bold">Team@123</code>) to a strong personal password.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Current Password <span className="text-purple-400">*</span></label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
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
                  <label className="block text-slate-300 font-bold mb-1.5">New Password <span className="text-purple-400">*</span></label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
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
                  <label className="block text-slate-300 font-bold mb-1.5">Confirm New Password <span className="text-purple-400">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/40 w-full max-w-xl space-y-6 font-mono text-xs text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" /> Edit HR Profile
              </h3>
              <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Bio Description</label>
                <textarea
                  rows={4}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Describe your background and HR responsibilities..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Skills (Comma-Separated)</label>
                <input
                  type="text"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  placeholder="e.g. HR Operations, Recruitment, QA Audit"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                />
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold cursor-pointer transition-all shadow-lg flex items-center gap-2"
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
        &copy; 2026 Zenemoo Enterprise AI Language &amp; Data Solutions. Authenticated HR Session.
      </footer>
    </div>
  );
};
