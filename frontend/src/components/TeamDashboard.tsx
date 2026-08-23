import React, { useState, useEffect, useRef } from 'react';
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
  Bell,
  ChevronUp,
  CheckCheck,
  Trash2,
  Calendar,
  CreditCard,
  Video,
  Info,
  ShieldAlert,
  Server,
  Users,
  Mail,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { SecurePrivateProfileEditor } from './SecurePrivateProfileEditor';
import { EnterpriseTeamDirectory } from './EnterpriseTeamDirectory';
import { EnterpriseHREmailComposer } from './EnterpriseHREmailComposer';
import { OpportunityCenterView } from './OpportunityCenterView';
import { ZenemooDocumentationModal, ZenemooSupportPortalModal } from './ZenemooFooterModals';
import { portalAuthApi, uploadApi, selfProfileApi, notificationApi, privateProfileApi } from '../services/api';
import { initFCMIfGranted, setupAppLifecycleNotificationListener } from '../services/notificationService';

interface TeamDashboardProps {
  initialUserData?: any;
  onLogout: () => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ initialUserData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'password' | 'notifications' | 'directory' | 'email' | 'opportunities'>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const userCardRef = useRef<HTMLButtonElement>(null);

  const [profile, setProfile] = useState<any>(() => {
    if (initialUserData && Object.keys(initialUserData).length > 0) return initialUserData;
    try {
      const saved = localStorage.getItem('zenemoo_portal_user');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const getPortalRoleInfo = (role?: string) => {
    const r = (role || profile?.role || '').toLowerCase();
    if (r === 'marketing_lead' || r === 'marketing') {
      return { label: 'Marketing Portal', badge: 'Marketing Specialist', color: 'text-pink-400' };
    }
    if (r === 'project_manager' || r === 'pm') {
      return { label: 'Project Management', badge: 'Project Manager', color: 'text-amber-400' };
    }
    if (r === 'tech_lead') {
      return { label: 'Tech & Engineering', badge: 'Engineering Lead', color: 'text-blue-400' };
    }
    if (r === 'ai_specialist') {
      return { label: 'Data & AI Portal', badge: 'AI Specialist', color: 'text-purple-400' };
    }
    if (r === 'qa_lead') {
      return { label: 'QA Operations', badge: 'Quality Assurance Lead', color: 'text-yellow-400' };
    }
    return { label: 'Team Portal', badge: 'Team Member', color: 'text-cyan-400' };
  };

  const roleInfo = getPortalRoleInfo(profile?.role);

  const [cooldownInfo, setCooldownInfo] = useState<any>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  // Full Notification System State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilterTab, setNotifFilterTab] = useState<'all' | 'unread'>('all');
  const [notifSearchQuery, setNotifSearchQuery] = useState('');

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Photo Update Media Link & Public Guide Modal State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoLinkInput, setPhotoLinkInput] = useState('');
  const [contactPhoneInput, setContactPhoneInput] = useState('');
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    ref_no: string;
    phone_number: string;
    image_url: string;
    message: string;
    employee_id: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoLinkInput.trim()) {
      showToast('Please enter an image link (Google Drive, Cloudinary, Imgur, etc.) or upload a file.', 'error');
      return;
    }

    setIsSubmittingPhoto(true);
    try {
      const payload = {
        image_url: photoLinkInput.trim(),
        phone_number: contactPhoneInput.trim() || profile.phone || profile.company_phone || '',
        link_type: photoLinkInput.includes('drive.google') ? 'google_drive' : photoLinkInput.includes('cloudinary') ? 'cloudinary' : 'external_link',
        notes: 'Submitted via Team Dashboard Overview',
      };

      const res = await selfProfileApi.uploadImage(payload);
      if (res.data && res.data.success) {
        setSubmissionResult({
          ref_no: res.data.ref_no || `REF-IMG-${Math.floor(100000 + Math.random() * 900000)}`,
          phone_number: res.data.phone_number || payload.phone_number,
          image_url: res.data.image_url || payload.image_url,
          message: res.data.message || 'Submitted successfully for Admin/HR review.',
          employee_id: res.data.employee_id || profile.employee_id || 'ZNM-30A53',
        });
        showToast('Profile photo request submitted to Admin & HR!', 'success');
        await fetchProfile();
      } else {
        showToast(res.data?.message || 'Failed to submit photo request.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Submission failed.', 'error');
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  const handleDeviceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'zenemoo/team');

      const uploadRes = await uploadApi.upload(formData);
      if (uploadRes.data && uploadRes.data.url) {
        setPhotoLinkInput(uploadRes.data.url);
        showToast('Image file uploaded! Media link auto-filled below.', 'success');
      } else {
        showToast('Failed to upload image file.', 'error');
      }
    } catch (err: any) {
      showToast('Failed to upload image file.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await portalAuthApi.getMeProfile();
      if (res.data && res.data.success) {
        let u = res.data.user;
        try {
          const privRes = await privateProfileApi.getPrivateProfile();
          if (privRes.data && privRes.data.profile) {
            const p = privRes.data.profile;
            u = {
              ...u,
              email: p.personal_email || u.email,
              phone: p.personal_mobile || p.phone_number || u.phone,
              personal_email: p.personal_email,
              personal_mobile: p.personal_mobile,
            };
          }
        } catch (e) {}
        setProfile(u);
        localStorage.setItem('zenemoo_portal_user', JSON.stringify(u));
        setCooldownInfo(res.data.image_cooldown || {});
      }
    } catch (err: any) {
      console.warn('Failed to fetch profile:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLogout();
        return;
      }
    } finally {
      setIsLoadingProfile(false);
      setIsVerifyingSession(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      if (res.data && res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
    
    // Team & HR FCM Token Registration and App Resume (State Change) listener
    const userId = profile?.id || initialUserData?.id;
    const userRole = profile?.role || initialUserData?.role || 'team_member';
    initFCMIfGranted('team_hr', userId, userRole);
    setupAppLifecycleNotificationListener('team_hr', userId, userRole);

    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click to close profile popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        userCardRef.current &&
        !userCardRef.current.contains(event.target as Node)
      ) {
        setIsProfilePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle screen resize to auto-collapse sidebar on tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        setIsNoticeDismissed(true);
        const updatedUser = { ...profile, temporary_password: false, password_changed: true };
        setProfile(updatedUser);
        localStorage.setItem('zenemoo_portal_user', JSON.stringify(updatedUser));
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

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read.', 'success');
    } catch (err) {}
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const getNotificationIcon = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'meeting':
        return <Video className="w-4 h-4 text-purple-400" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'project':
        return <Briefcase className="w-4 h-4 text-cyan-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'system':
        return <Server className="w-4 h-4 text-slate-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    const matchesTab = notifFilterTab === 'all' || (notifFilterTab === 'unread' && !n.is_read);
    const matchesSearch =
      !notifSearchQuery ||
      n.title?.toLowerCase().includes(notifSearchQuery.toLowerCase()) ||
      n.message?.toLowerCase().includes(notifSearchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

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

  if (isVerifyingSession) {
    return (
      <div className="h-screen w-screen bg-[#050505] text-slate-100 flex flex-col items-center justify-center font-mono space-y-4 select-none">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shadow-2xl animate-pulse">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-10 h-10 object-cover" />
          </div>
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400 absolute -top-1 -right-1" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-sm font-bold text-white tracking-widest uppercase">ZENEMOO ENTERPRISE PORTAL</div>
          <div className="text-xs text-cyan-400 animate-pulse">Verifying Session &amp; Permissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#050505] text-slate-100 flex flex-col md:flex-row selection:bg-cyan-500/30 selection:text-cyan-200 relative">
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

      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-all"
        />
      )}

      {/* 1. FIXED ENTERPRISE 3-SECTION SIDEBAR NAVIGATION */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen bg-[#09090b] border-r border-white/10 flex flex-col justify-between shrink-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* SECTION 1: FIXED BRAND LOGO HEADER */}
        <div className={`h-16 shrink-0 border-b border-white/10 px-4 flex items-center justify-between bg-[#06070b]/90 backdrop-blur-md z-10 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-9 h-9 rounded-xl bg-white p-0.5 shadow-md shrink-0 object-cover" />
            {!isSidebarCollapsed && (
              <div className="truncate">
                <div className="font-display font-extrabold text-xs text-white tracking-wider truncate">ZENEMOO</div>
                <div className={`text-[9px] font-mono font-bold truncate ${roleInfo.color}`}>{roleInfo.label}</div>
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

        {/* SECTION 2: INDEPENDENTLY SCROLLABLE GROUPED NAVIGATION LIST */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar font-mono text-xs">
          {/* GROUP 1: MY WORKSPACE */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                MY WORKSPACE
              </div>
            )}

            {/* ITEM 1: Overview & Profile */}
            <div className="relative group">
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  activeTab === 'overview'
                    ? 'bg-cyan-500/10 text-cyan-300 font-bold border-l-2 border-cyan-400 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <User className="w-4 h-4 text-cyan-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Overview &amp; Profile</span>}
                </div>
              </button>
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Overview &amp; Profile
                </div>
              )}
            </div>

            {/* ITEM 2: Team Directory */}
            <div className="relative group">
              <button
                onClick={() => {
                  setActiveTab('directory');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  activeTab === 'directory'
                    ? 'bg-cyan-500/10 text-cyan-300 font-bold border-l-2 border-cyan-400 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Team Directory</span>}
                </div>
              </button>
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Team Directory
                </div>
              )}
            </div>
          </div>

          {/* GROUP 2: ACCOUNT & INBOX */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                ACCOUNT &amp; INBOX
              </div>
            )}

            {/* ITEM 3: Edit Private Profile */}
            <div className="relative group">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  activeTab === 'profile'
                    ? 'bg-purple-500/10 text-purple-300 font-bold border-l-2 border-purple-400 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Edit Private Profile</span>}
                </div>
              </button>
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Edit Private Profile
                </div>
              )}
            </div>

            {/* ITEM 4: Notification Center View */}
            <div className="relative group">
              <button
                onClick={() => {
                  setActiveTab('notifications');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  activeTab === 'notifications'
                    ? 'bg-emerald-500/10 text-emerald-300 font-bold border-l-2 border-emerald-400 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Notification Center</span>}
                </div>
                {!isSidebarCollapsed && unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Notification Center ({unreadCount})
                </div>
              )}
            </div>

            {/* ITEM 4: Email Dispatcher */}
            <div className="relative group">
              <button
                onClick={() => {
                  setActiveTab('email');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  activeTab === 'email'
                    ? 'bg-purple-500/10 text-purple-300 font-bold border-l-2 border-purple-400 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Email Dispatcher</span>}
                </div>
                {!isSidebarCollapsed && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    profile?.email_access
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}>
                    {profile?.email_access ? 'Active' : 'Locked'}
                  </span>
                )}
              </button>
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Email Dispatcher ({profile?.email_access ? 'Allowed' : 'No Access'})
                </div>
              )}
            </div>

            {/* ITEM 4.5: Opportunity Center */}
            <div className="relative group">
              <button
                onClick={() => {
                  setActiveTab('opportunities');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  activeTab === 'opportunities'
                    ? 'bg-cyan-500/10 text-cyan-300 font-bold border-l-2 border-cyan-400 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Briefcase className="w-4 h-4 text-cyan-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Opportunity Center</span>}
                </div>
              </button>
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Opportunity Center
                </div>
              )}
            </div>

            {/* ITEM 5: Account Security */}
            <div className="relative group">
              <button
                onClick={() => {
                  setActiveTab('password');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  activeTab === 'password'
                    ? 'bg-amber-500/10 text-amber-300 font-bold border-l-2 border-amber-400 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Account Security</span>}
                </div>
              </button>
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                  Account Security
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* 2. INTERACTIVE SIDEBAR BOTTOM PROFILE CARD & POPOVER */}
        <div className="relative pt-4 border-t border-white/10 font-mono text-xs">
          <button
            ref={userCardRef}
            onClick={() => setIsProfilePopoverOpen(!isProfilePopoverOpen)}
            className={`w-full min-h-[48px] p-2 sm:p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 transition-all duration-200 flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            } cursor-pointer group shadow-lg`}
            title="Click to view interactive profile menu"
          >
            <div className="flex items-center gap-3 truncate">
              <div className="relative shrink-0">
                <img
                  src={profile.image_url || '/assets/executive.png'}
                  alt={profile.name}
                  className="w-9 h-9 rounded-xl object-cover border border-cyan-400/60 shadow-md group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#09090b] animate-pulse" />
              </div>

              {!isSidebarCollapsed && (
                <div className="text-left truncate">
                  <div className="font-bold text-white text-xs truncate group-hover:text-cyan-300 transition-colors">
                    {profile.name || 'Team Member'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{profile.employee_id || 'ZNM-MEMBER'}</div>
                  <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    ● Online Member
                  </div>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <ChevronUp
                className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 ${
                  isProfilePopoverOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            )}
          </button>

          {/* Floating User Profile Popover */}
          {isProfilePopoverOpen && (
            <div
              ref={popoverRef}
              className="absolute bottom-16 left-0 sm:left-2 w-72 sm:w-80 p-5 rounded-3xl bg-[#09090b]/95 backdrop-blur-2xl border border-cyan-500/40 shadow-2xl shadow-cyan-500/10 space-y-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
            >
              <div className="flex items-start gap-3 border-b border-white/10 pb-4">
                <img
                  src={profile.image_url || '/assets/executive.png'}
                  alt={profile.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400 shadow-xl"
                />
                <div className="space-y-1 truncate">
                  <div className="font-bold text-sm text-white truncate">{profile.name}</div>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold uppercase inline-block">
                    {profile.badge || 'Team Member'}
                  </span>
                  <div className="text-[11px] text-slate-300 truncate">{profile.designation}</div>
                  <div className="text-[10px] text-slate-400 truncate">{profile.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <div className="text-slate-400">Account Status</div>
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Online
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                  <div className="text-slate-400">Security Access</div>
                  <div className="text-cyan-300 font-bold">Encrypted JWT</div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    setActiveTab('overview');
                    setIsProfilePopoverOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center gap-2.5 text-xs transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" /> View Roster Profile
                </button>

                <button
                  onClick={() => {
                    setActiveTab('notifications');
                    setIsProfilePopoverOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center gap-2.5 text-xs transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-400" /> Notification Center ({unreadCount})
                </button>

                <button
                  onClick={() => {
                    setActiveTab('password');
                    setIsProfilePopoverOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center gap-2.5 text-xs transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" /> Security &amp; Password
                </button>

                <button
                  onClick={() => {
                    setIsProfilePopoverOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 flex items-center gap-2.5 text-xs transition-colors cursor-pointer font-bold mt-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" /> Sign Out Session
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 3. MAIN CONTENT CONTAINER (h-screen overflow-hidden, <main> scrolls) */}
      <div className="flex-1 flex flex-col min-w-0 w-full h-screen overflow-hidden">
        {/* Fixed Top Sticky Header Bar */}
        <header className="sticky top-0 z-30 shrink-0 bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 py-3 sm:py-3.5 px-3.5 sm:px-6 md:px-8 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 truncate">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden min-h-[44px] px-3 rounded-xl bg-white/5 text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer border border-white/10"
              aria-label="Toggle Navigation Drawer"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              {activeTab === 'overview' && <User className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
              {activeTab === 'profile' && <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
              {activeTab === 'notifications' && <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
              {activeTab === 'password' && <Key className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
            </div>

            <div className="truncate">
              <h1 className="text-xs sm:text-sm font-bold font-display text-white tracking-tight truncate">
                {activeTab === 'overview' && 'Team Member Profile & Roster Record'}
                {activeTab === 'profile' && 'Self-Service Secure Private Profile Editor'}
                {activeTab === 'notifications' && 'System Notification Center & Inbox'}
                {activeTab === 'password' && 'Account Password & Security'}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate hidden sm:block">
                Zenemoo Platform &bull; Sequential Reordering &amp; AI Engine
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 font-mono text-xs">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter list records..."
                value={searchFilterQuery}
                onChange={(e) => setSearchFilterQuery(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none placeholder-slate-500 w-32 xl:w-40"
              />
            </div>

            <NotificationBell />

            <button
              onClick={onLogout}
              className="min-h-[40px] px-3 py-1.8 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <button
              onClick={handleReturnToHome}
              className="min-h-[40px] px-3 py-1.8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Return to Website"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </header>

        {/* 4. SCROLLABLE MAIN CONTENT AREA (<main> handles scrolling) */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
          {/* First Time Login Security Prompt Banner */}
          {profile && !isNoticeDismissed && (profile.temporary_password === true || profile.password_changed === false) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs shadow-xl animate-in fade-in duration-300 relative">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 truncate">
                    ⚠️ First-Time Login Notice — Action Recommended
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    You are currently using a temporary password. Please update your password &amp; complete your private profile.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('password')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all cursor-pointer shadow-md"
                >
                  Change Password &rarr;
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Update Profile &rarr;
                </button>
                <button
                  onClick={() => setIsNoticeDismissed(true)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Top Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 font-mono text-xs">
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg min-w-0">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block truncate">Assigned Position</span>
                <span className="text-xs sm:text-sm font-bold text-white block truncate font-display" title={profile.designation || 'Specialist'}>
                  {profile.designation || 'Specialist'}
                </span>
                <span className="text-[10px] text-cyan-400 block truncate">{profile.department || 'Engineering'}</span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-purple-500/30 flex items-center justify-between gap-3 shadow-lg min-w-0">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block truncate">Employee ID</span>
                <span className="text-xs sm:text-sm font-bold text-purple-300 block truncate" title={profile.employee_id || 'ZNM-E861'}>
                  {profile.employee_id || 'ZNM-E861'}
                </span>
                <span className="text-[10px] text-purple-400 block truncate">Joined: {profile.joining_date || 'Active'}</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg sm:col-span-2 lg:col-span-1 min-w-0">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block truncate">Image Upload Status</span>
                <span className="text-xs font-bold text-emerald-300 block truncate">
                  {cooldownInfo.can_upload_image ? 'Ready for Update' : 'Cooldown Active'}
                </span>
                <span className="text-[10px] text-emerald-400 block truncate">
                  {cooldownInfo.countdown_message || '7-day policy enforced.'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>



          {/* TAB 1: OVERVIEW & MY PROFILE */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
              <div className="lg:col-span-1 glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-3">
                  <Shield className="w-4 h-4 text-cyan-400" /> Official Roster Record
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Official employee credentials below are managed by the Administrator and read-only.
                </p>

                <div className="space-y-3 font-mono">
                  <div className="relative group p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                    <img
                      src={profile.image_url || '/assets/executive.png'}
                      alt={profile.name}
                      className="w-14 h-14 rounded-xl object-cover border border-cyan-400 shrink-0"
                    />
                    <div className="truncate">
                      <div className="font-bold text-white text-sm truncate">{profile.name}</div>
                      <div className="text-xs text-cyan-400 font-bold truncate">{profile.employee_id}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPhotoModalOpen(true);
                          setPhotoLinkInput('');
                          setContactPhoneInput(profile.phone || profile.company_phone || profile.personal_mobile || '');
                          setSubmissionResult(null);
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline cursor-pointer flex items-center gap-1 mt-1 font-bold"
                      >
                        <Camera className="w-3 h-3 text-purple-400" /> Change Photo
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Designation &amp; Role</div>
                    <div className="text-sm font-bold text-white truncate">{profile.designation}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Department</div>
                    <div className="text-sm font-bold text-cyan-300 truncate">{profile.department}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Official Email</div>
                    <div className="text-xs font-bold text-white truncate">{profile.email}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase">Date of Joining</div>
                    <div className="text-xs font-bold text-white truncate">{profile.joining_date || 'Active Roster'}</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" /> Bio &amp; Professional Summary
                    </h3>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer font-bold"
                    >
                      Edit Private Profile &rarr;
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    {profile.bio || 'No professional bio description added yet. Click Edit Private Profile to add your bio.'}
                  </p>
                </div>

                <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
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

          {/* TAB 3: DEDICATED FULL NOTIFICATION CENTER PAGE VIEW */}
          {activeTab === 'notifications' && (
            <div className="glass-panel p-5 sm:p-8 rounded-3xl border border-emerald-500/30 space-y-6 font-mono text-xs shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-emerald-400" /> System Notification Center
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Manage system alerts, task assignments, security notices, and official announcements.</p>
                </div>

                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCheck className="w-4 h-4" /> Mark All as Read ({unreadCount})
                    </button>
                  )}

                  <button
                    onClick={fetchNotifications}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Refresh list"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 font-mono text-xs">
                  <button
                    onClick={() => setNotifFilterTab('all')}
                    className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                      notifFilterTab === 'all' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Notifications ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifFilterTab('unread')}
                    className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                      notifFilterTab === 'unread' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={notifSearchQuery}
                    onChange={(e) => setNotifSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Notifications Full List */}
              <div className="space-y-3 font-sans">
                {filteredNotifs.length === 0 ? (
                  <div className="p-12 text-center space-y-3 glass-panel rounded-3xl border border-white/5">
                    <Bell className="w-12 h-12 text-slate-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">No Notifications Found</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Your inbox is clean! You will receive system notifications, task updates, and broadcast messages here.
                    </p>
                  </div>
                ) : (
                  filteredNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        n.is_read
                          ? 'bg-white/[0.02] border-white/10 text-slate-300'
                          : 'bg-emerald-500/[0.04] border-emerald-500/40 text-white shadow-lg shadow-emerald-500/5'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0 mt-1">
                          {getNotificationIcon(n.type)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{n.title}</span>
                            {!n.is_read && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[9px] font-bold uppercase">
                                New Unread
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{n.message}</p>
                          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                            <span>Sender: <strong className="text-slate-200">{n.sender_email || 'Zenemoo System'}</strong></span>
                            <span>Time: <strong className="text-slate-200">{new Date(n.created_at).toLocaleString()}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 font-mono">
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 text-xs transition-all cursor-pointer font-bold"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark Read
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteNotif(n.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="glass-panel p-5 sm:p-8 rounded-3xl border border-amber-500/30 max-w-xl space-y-6 font-mono text-xs shadow-2xl">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" /> Account Security &amp; Password Update
                </h2>
                <p className="text-xs text-slate-400 mt-1">Change your portal account password. Password must contain letters, numbers, and symbols.</p>
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
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400 min-h-[44px]"
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
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400 min-h-[44px]"
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
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-amber-400 min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold font-display text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isChangingPass ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />} Update Password
              </button>
            </form>
          )}

          {/* TAB 5: ENTERPRISE TEAM DIRECTORY */}
          {activeTab === 'directory' && (
            <EnterpriseTeamDirectory userRole="team" showToast={showToast} />
          )}

          {/* TAB 6: COMPANY EMAIL DISPATCHER */}
          {activeTab === 'email' && (
            profile?.email_access ? (
              <EnterpriseHREmailComposer
                showToast={showToast}
                userProfile={profile}
                onEmailSentSuccess={() => fetchNotifications()}
              />
            ) : (
              <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 text-center font-mono">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-base font-bold text-white font-display">Company Email Dispatcher Locked</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your account currently does not have active <span className="text-purple-300 font-bold">Email Permission</span> granted.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs text-purple-300 max-w-md mx-auto space-y-1">
                  <div className="font-bold flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400" /> Super Admin Authorization Required
                  </div>
                  <p className="text-[11px] text-slate-400">
                    To request email sending permission, contact your Super Administrator. They can enable <span className="text-cyan-300 font-bold">Email Permission</span> with 1 click in the RBAC User Accounts registry!
                  </p>
                </div>
              </div>
            )
          )}

          {/* TAB 7: OPPORTUNITY CENTER */}
          {activeTab === 'opportunities' && (
            <OpportunityCenterView userRole="team_member" showToast={showToast} />
          )}
          {/* Dashboard Responsive Footer (scrolls naturally with main content) */}
          <footer className="py-6 px-4 sm:px-8 border-t border-white/10 font-mono text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 mb-4">
            <div className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} Zenemoo AI Solutions. Powered by Zenemoo Enterprise AI Platform
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                Documentation
              </button>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(true)}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                Support Portal
              </button>
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 transition-colors"
              >
                Privacy &amp; Terms
              </a>
            </div>
          </footer>
        </main>

        {/* CHANGE PHOTO & MEDIA LINK MODAL */}
        {isPhotoModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-mono text-xs">
            <div className="w-full max-w-lg bg-[#090d16] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-white">Update Profile Picture</h3>
                    <p className="text-[11px] text-slate-400">Submit Google Drive, Cloudinary, Imgur, or public media link</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!submissionResult ? (
                <form onSubmit={handlePhotoSubmit} className="space-y-4">
                  {/* Public Access Guide Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-blue-950/40 border border-cyan-500/30 space-y-2 shadow-inner">
                    <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs">
                      <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span>Google Drive &amp; Public Sharing Instructions</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      If pasting a link from <strong>Google Drive</strong>, <strong>Cloudinary</strong>, <strong>Imgur</strong>, or <strong>PostImages</strong>, please ensure the file link permission is set to <span className="text-amber-300 font-bold underline">"Anyone with the link can view"</span> so Admin &amp; HR can verify and approve your photo!
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-white/10">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 font-bold">Google Drive</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-purple-300 font-bold">Cloudinary</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-300 font-bold">Imgur</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-amber-300 font-bold">Direct URL</span>
                    </div>
                  </div>

                  {/* Media Link Input */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block text-[11px]">
                      Media / Image Link <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/file/d/... or Cloudinary image link"
                      value={photoLinkInput}
                      onChange={(e) => setPhotoLinkInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[44px]"
                    />
                  </div>

                  {/* Contact Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block text-[11px]">
                      Contact Phone Number <span className="text-slate-400 font-normal">(For Verification)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={contactPhoneInput}
                      onChange={(e) => setContactPhoneInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[44px]"
                    />
                  </div>

                  {/* Submit Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPhoto || isUploadingImage}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold cursor-pointer flex items-center gap-2 shadow-lg min-h-[44px]"
                    >
                      {isSubmittingPhoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Submit for Verification</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Submission Confirmation Screen */
                <div className="space-y-5 text-center py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold font-display text-white">Thank You for Submitting!</h4>
                    <p className="text-xs text-emerald-400 font-bold">{submissionResult.message}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2.5 font-mono text-[11px]">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="text-slate-400">Submission Reference:</span>
                      <span className="text-cyan-300 font-bold">{submissionResult.ref_no}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="text-slate-400">Employee ID:</span>
                      <span className="text-purple-300 font-bold">{submissionResult.employee_id}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="text-slate-400">Contact Number:</span>
                      <span className="text-white font-bold">{submissionResult.phone_number || 'Provided'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Submitted Media Link:</span>
                      <div className="p-2.5 rounded-xl bg-black/40 text-cyan-400 truncate text-[10px] border border-white/5">
                        {submissionResult.image_url}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] text-left flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>Admin or HR will check public link accessibility. Once approved, your new profile picture will be posted on the site!</span>
                  </div>

                  <button
                    onClick={() => setIsPhotoModalOpen(false)}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-display text-xs cursor-pointer shadow-lg"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ZenemooDocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />
      <ZenemooSupportPortalModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </div>
  );
};
