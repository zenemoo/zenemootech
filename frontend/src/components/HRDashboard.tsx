import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Mail,
  User,
  Key,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Lock,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  Send,
  FileText,
  Clock,
  Search,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { SecurePrivateProfileEditor } from './SecurePrivateProfileEditor';
import { portalAuthApi, selfProfileApi, emailApi } from '../services/api';

interface HRDashboardProps {
  initialUserData: any;
  onLogout: () => void;
}

export const HRDashboard: React.FC<HRDashboardProps> = ({ initialUserData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'email' | 'profile' | 'password'>('email');
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
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Email System State
  const [emailSubTab, setEmailSubTab] = useState<'compose' | 'history' | 'drafts'>('compose');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailComposer, setEmailComposer] = useState({
    sender: 'contact@zenemoo.in',
    recipients: '',
    cc: '',
    bcc: '',
    subject: '',
    html: '',
  });

  // Profile Edit State
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editLanguages, setEditLanguages] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change State
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
    try {
      const res = await portalAuthApi.getMeProfile();
      if (res.data && res.data.success) {
        const u = res.data.user;
        setProfile(u);
        localStorage.setItem('zenemoo_portal_user', JSON.stringify(u));
        setCooldownInfo(res.data.image_cooldown || {});
        setEditBio(u.bio || '');
        setEditSkills(Array.isArray(u.skills) ? u.skills.join(', ') : u.skills || '');
        setEditLanguages(Array.isArray(u.languages) ? u.languages.join(', ') : u.languages || '');
        setEditPhone(u.phone || '');
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLogout();
      }
    }
  };

  const loadEmailData = async () => {
    if (!profile.email_access && profile.role !== 'admin') return;
    setIsLoadingEmails(true);
    try {
      const [resHist, resDrafts] = await Promise.all([
        emailApi.getHistory().catch(() => ({ data: { data: [] } })),
        emailApi.getDrafts().catch(() => ({ data: { data: [] } })),
      ]);
      if (resHist.data?.data) setEmailLogs(resHist.data.data);
      if (resDrafts.data?.data) setEmailDrafts(resDrafts.data.data);
    } catch (e) {
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    loadEmailData();
  }, []);

  useEffect(() => {
    if (profile && (profile.temporary_password === true || profile.password_changed === false)) {
      setActiveTab('password');
    }
  }, [profile]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailComposer.recipients || !emailComposer.subject || !emailComposer.html) {
      showToast('Recipients, subject, and email body are required.', 'error');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await emailApi.send(emailComposer);
      if (res.data && res.data.success) {
        showToast(`Email sent successfully via Brevo SMTP!`, 'success');
        setEmailComposer({
          sender: 'contact@zenemoo.in',
          recipients: '',
          cc: '',
          bcc: '',
          subject: '',
          html: '',
        });
        setEmailSubTab('history');
        await loadEmailData();
      } else {
        showToast(res.data?.message || 'Email delivery failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Email delivery failed.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const skillsArr = editSkills.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      const langsArr = editLanguages.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

      const res = await selfProfileApi.updateProfile({
        bio: editBio,
        skills: skillsArr,
        languages: langsArr,
        phone: editPhone,
      });

      if (res.data && res.data.success) {
        showToast('HR Profile updated successfully!', 'success');
        await fetchProfile();
      } else {
        showToast(res.data?.message || 'Failed to update profile.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Update failed.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await portalAuthApi.changePassword(currentPassword, newPassword);
      if (res.data && res.data.success) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.data?.message || 'Password change failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Password change failed.', 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-between selection:bg-purple-500/30 selection:text-purple-200 font-sans">
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

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 py-4 px-4 sm:px-8 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md" />
            <div>
              <div className="font-display font-extrabold text-base text-white tracking-wider">ZENEMOO</div>
              <div className="text-[10px] font-mono text-purple-400">HR Operations Portal</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
              <img
                src={profile.image_url || '/assets/executive.png'}
                alt={profile.name}
                className="w-7 h-7 rounded-full object-cover border border-purple-400/50"
              />
              <div className="text-left">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{profile.name}</div>
                <div className="text-[10px] font-mono text-purple-400">HR Operations</div>
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

      {/* Main Content */}
      <main className="flex-1 py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-4 h-4" /> Company Email System
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" /> HR Profile
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Key className="w-4 h-4" /> Security &amp; Password
          </button>
        </div>

        {/* TAB 1: COMPANY EMAIL SYSTEM MODULE */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            {!profile.email_access && profile.role !== 'admin' ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-red-500/30 space-y-4">
                <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
                <h3 className="text-lg font-bold font-display text-white">Company Email Access Revoked</h3>
                <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
                  You do not currently have permission to access the Company Email System. Contact your Super Administrator to grant <code className="text-cyan-300">email_access=true</code>.
                </p>
              </div>
            ) : (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-purple-400" /> Brevo Enterprise Email System
                    </h2>
                    <p className="text-xs font-mono text-slate-400">Compose and dispatch transactional emails &amp; view historical logs.</p>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <button
                      onClick={() => setEmailSubTab('compose')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        emailSubTab === 'compose' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Compose
                    </button>
                    <button
                      onClick={() => setEmailSubTab('history')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        emailSubTab === 'history' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sent Logs ({emailLogs.length})
                    </button>
                  </div>
                </div>

                {emailSubTab === 'compose' ? (
                  <form onSubmit={handleSendEmail} className="space-y-4 font-mono text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1.5">Sender Identity</label>
                        <select
                          value={emailComposer.sender}
                          onChange={(e) => setEmailComposer({ ...emailComposer, sender: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                        >
                          <option value="contact@zenemoo.in" className="bg-slate-900 text-white">contact@zenemoo.in (Primary Contact)</option>
                          <option value="support@zenemoo.in" className="bg-slate-900 text-white">support@zenemoo.in (Support Lead)</option>
                          <option value="info@zenemoo.in" className="bg-slate-900 text-white">info@zenemoo.in (HR &amp; Operations)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1.5">Recipient Address(es) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. employee@company.com, candidate@org.io"
                          value={emailComposer.recipients}
                          onChange={(e) => setEmailComposer({ ...emailComposer, recipients: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">Email Subject Line *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Zenemoo HR Onboarding &amp; Briefing"
                        value={emailComposer.subject}
                        onChange={(e) => setEmailComposer({ ...emailComposer, subject: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">Message Body Content *</label>
                      <textarea
                        rows={6}
                        required
                        placeholder="Type message content here..."
                        value={emailComposer.html}
                        onChange={(e) => setEmailComposer({ ...emailComposer, html: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingEmail}
                      className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      {isSendingEmail ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />} Dispatch Email via Brevo
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {emailLogs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">No email history logs found.</div>
                    ) : (
                      emailLogs.map((log) => (
                        <div key={log.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-bold text-white text-sm">{log.subject}</div>
                            <div className="text-[11px] text-slate-400">
                              To: {Array.isArray(log.recipients) ? log.recipients.join(', ') : log.recipients}
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            ✓ SENT
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HR PRIVATE PROFILE */}
        {activeTab === 'profile' && (
          <SecurePrivateProfileEditor showToast={showToast} role="hr" />
        )}

        {/* TAB 3: CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 max-w-xl space-y-6 font-mono text-xs">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" /> Account Security &amp; Password Update
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Current Password</label>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">New Password</label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
        &copy; {new Date().getFullYear()} Zenemoo Tech &bull; Enterprise HR Portal
      </footer>
    </div>
  );
};
