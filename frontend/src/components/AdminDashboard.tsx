import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Users, Key, Database, Cloud, Activity, CheckCircle, ShieldAlert, ArrowLeft, Save, Plus, Edit, Trash2, Upload, RefreshCw, Eye, Lock, X, Mail, MessageSquare, Phone, Building, ArrowUp, ArrowDown, Search, Filter, EyeOff, Hash, FileText, Handshake, Globe, ExternalLink, Briefcase, FileCheck, Linkedin, FileSpreadsheet, HelpCircle, CheckSquare, PlusCircle, UserCheck, UserX, LogOut, Menu, ChevronLeft, ChevronRight, Bell, User, ShieldCheck, Clock, Monitor, Smartphone, KeyRound, History, Zap, Check, AlertTriangle, Download, Send, Inbox, CheckCircle2, XCircle, AlertCircle, Info, Sliders, ArrowUpDown, ChevronDown, ChevronUp, Layers, Radio, Terminal, Image, Power, Copy, Bot, LifeBuoy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamMember, getStoredTeamMembers, saveTeamMemberToApi, deleteTeamMemberFromApi, reorderTeamMemberInApi } from '../lib/teamStore';
import { PartnerCompany, getStoredPartners, savePartnerToApi, deletePartnerFromApi, reorderPartnerInApi } from '../lib/partnerStore';
import { OpportunityProgram, CustomQuestion, getStoredOpportunities, saveOpportunityToApi, deleteOpportunityFromApi, reorderOpportunityInApi, isTempId } from '../lib/opportunityStore';
import { CandidateApplication, getStoredCandidateApplications, updateCandidateApplicationStatus, deleteCandidateApplication, resyncSingleCandidateApplication, resyncOpportunityApplicationsBulk, resendCandidateAcceptanceEmail } from '../lib/opportunityApplicationStore';
import { SiteConfig, TelemetryConfig, ContactInquiry, AuthorizedEmailAccount, MessageHistoryRecord, getSiteConfig, saveSiteConfig, getTelemetryConfig, saveTelemetryConfig, uploadImageToCloudinary, getContactInquiries, updateContactInquiry, getStoredAuthorizedEmails, saveAuthorizedEmailToSupabase, updateAuthorizedEmailInSupabase, deleteAuthorizedEmailFromSupabase, getStoredMessageHistoryRecords, getStoredAdminPhoto } from '../lib/adminStore';
import { contactApi, subscriberApi, authApi, emailApi, userManagementApi, notificationApi, pendingProfileUpdatesApi, supportApi } from '../services/api';
import { supabase } from '../lib/supabaseClient';
import { EnterpriseTeamDirectory } from './EnterpriseTeamDirectory';
import { EnterpriseHREmailComposer } from './EnterpriseHREmailComposer';
import { ZenemooDocumentationModal, ZenemooSupportPortalModal } from './ZenemooFooterModals';
import { ExportButton } from './ExportButton';
import { CandidateApplicationsModal } from './CandidateApplicationsModal';
import { EnterpriseOpportunityEditorModal } from './EnterpriseOpportunityEditorModal';
import { AdminReviewsTab } from './AdminReviewsTab';
import { AdminBrandLogoSettings } from './AdminBrandLogoSettings';
import { AdminTalentNetworkTab } from './AdminTalentNetworkTab';

interface AdminDashboardProps {
  onExit: () => void;
  initialTab?: 'team' | 'partners' | 'opportunities' | 'inquiries' | 'subscribers' | 'history' | 'telemetry' | 'keys' | 'ai-analytics' | 'rbac' | 'notifications-admin' | 'directory' | 'support-tickets' | 'reviews' | 'talent-network';
  isStandaloneEmailView?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit, initialTab, isStandaloneEmailView }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('mr.prem2006@gmail.com');
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(() => {
    return typeof window !== 'undefined' && !!localStorage.getItem('zenemoo_jwt_token');
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Enterprise Toast System & Confirmation Dialog State
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message?: string; type: 'success' | 'error' | 'warning' | 'info'; timestamp: number }>>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info'; onConfirm: () => void } | null>(null);
  
  // Global Loading & Cloudinary Upload Progress State
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalLoadingText, setGlobalLoadingText] = useState('Processing request...');
  const [uploadProgress, setUploadProgress] = useState<{ isUploading: boolean; percent: number; step: string }>({ isUploading: false, percent: 0, step: '' });

  // Profile Drawer, Notifications, Notification Filters, and Session Timers State
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [adminConnection, setAdminConnection] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [notifCategoryTab, setNotifCategoryTab] = useState<'all' | 'unread' | 'security' | 'system' | 'applications' | 'partners' | 'newsletter' | 'contacts' | 'audit'>('all');
  
  const [sessionStartTime] = useState(() => Date.now());
  const [sessionDurationSec, setSessionDurationSec] = useState(0);
  const [sessionExpiresInSec, setSessionExpiresInSec] = useState(1800); // Default 30m
  
  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('zenemoo_read_notifications');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Toast Helper Function
  const addToast = (title: string, message?: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, title, message, type, timestamp: Date.now() }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Confirmation Helper Function
  const showConfirm = (title: string, message: string, onConfirm: () => void, opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: opts?.confirmText || 'Confirm Action',
      cancelText: opts?.cancelText || 'Cancel',
      intent: opts?.intent || 'danger',
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
    });
  };

  // Authorized Admin Emails & Modal State
  const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmailAccount[]>([]);
  const [isAddAuthModalOpen, setIsAddAuthModalOpen] = useState(false);
  const [editingAuthAccount, setEditingAuthAccount] = useState<AuthorizedEmailAccount | null>(null);
  const [newAuthEmailInput, setNewAuthEmailInput] = useState('');
  const [newAuthNameInput, setNewAuthNameInput] = useState('');
  const [newAuthRole, setNewAuthRole] = useState<'Super Admin' | 'Administrator' | 'Manager'>('Administrator');
  const [newAuthDeptInput, setNewAuthDeptInput] = useState('Operations');
  const [newAuthPhoneInput, setNewAuthPhoneInput] = useState('');
  const [newAuthTelegramInput, setNewAuthTelegramInput] = useState('');
  const [newAuthNotesInput, setNewAuthNotesInput] = useState('');
  const [newAuthAvatarUrl, setNewAuthAvatarUrl] = useState('');
  const [isAuthAvatarUploading, setIsAuthAvatarUploading] = useState(false);

  // Brevo SMTP Email Engine & Encrypted Supabase Storage State
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isSendingBrevoMail, setIsSendingBrevoMail] = useState(false);
  const [isSavingBrevoDraft, setIsSavingBrevoDraft] = useState(false);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<any | null>(null);
  const [emailSubTab, setEmailSubTab] = useState<'history' | 'compose' | 'drafts'>('history');
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [emailStatusFilter, setEmailStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');

  const [composerViewMode, setComposerViewMode] = useState<'edit' | 'preview-desktop' | 'preview-mobile'>('edit');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string>('');
  const [expandedDateGroups, setExpandedDateGroups] = useState<{ [key: string]: boolean }>({
    'Today': true,
    'Yesterday': true,
    'This Week': true,
    'Last Week': true,
    'This Month': true,
    'Older Months': false,
  });

  // Helper to ensure multi-paragraph text is converted into clean HTML paragraphs & line breaks
  const formatContentToHtml = (content: string) => {
    if (!content) return '';
    if (/<(p|div|br|h[1-6]|ul|ol|li|blockquote|table|b|i|u|s|strong|em|span|a)\b/i.test(content)) {
      return content;
    }
    return content
      .split(/\n{2,}/)
      .map((paragraph) => `<p style="margin-bottom: 12px; line-height: 1.6; color: #e2e8f0;">${paragraph.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  };

  const [emailComposer, setEmailComposer] = useState({
    id: '',
    sender: 'contact@zenemoo.in',
    recipients: '',
    cc: '',
    bcc: '',
    subject: '',
    html: '',
    attachments: [] as { filename: string; contentType: string; content: string }[],
  });

  const richEditorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (richEditorRef.current) {
      if (richEditorRef.current.innerHTML !== (emailComposer.html || '')) {
        richEditorRef.current.innerHTML = emailComposer.html || '';
      }
    }
  }, [composerViewMode, emailComposer.html]);

  const executeRichCommand = (e: React.MouseEvent, command: string, value: string | undefined = undefined) => {
    e.preventDefault();
    if (richEditorRef.current) {
      richEditorRef.current.focus();
      if (command === 'formatBlock') {
        const blockTag = (value || 'p').replace(/[<>]/g, '').toLowerCase();
        document.execCommand('formatBlock', false, blockTag);
      } else {
        document.execCommand(command, false, value);
      }
      const updatedHtml = richEditorRef.current.innerHTML;
      setEmailComposer((prev) => ({ ...prev, html: updatedHtml }));
    }
  };

  const insertVisualSignature = (sigKey: string) => {
    if (!sigKey || !richEditorRef.current) return;
    richEditorRef.current.focus();
    let sigHtml = '';
    if (sigKey === 'prem') {
      sigHtml = '<br/><br/><div style="margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px; color: #94a3b8;">Kind Regards,<br/><strong style="color: #f8fafc;">Prem Prasad Pradhan</strong><br/><span style="color: #06b6d4; font-weight: bold;">Founder &amp; CEO</span> | Zenemoo Tech<br/>📧 prem@zenemoo.in | 🌐 www.zenemoo.in</div>';
    } else if (sigKey === 'support') {
      sigHtml = '<br/><br/><div style="margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px; color: #94a3b8;">Best regards,<br/><strong style="color: #f8fafc;">Zenemoo Technical Support Team</strong><br/>📧 support@zenemoo.in | 🌐 www.zenemoo.in</div>';
    } else if (sigKey === 'sales') {
      sigHtml = '<br/><br/><div style="margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px; color: #94a3b8;">Sincerely,<br/><strong style="color: #f8fafc;">Zenemoo Enterprise Solutions Team</strong><br/>📧 contact@zenemoo.in | 🌐 www.zenemoo.in</div>';
    }
    document.execCommand('insertHTML', false, sigHtml);
    const updatedHtml = richEditorRef.current.innerHTML;
    setEmailComposer((prev) => ({ ...prev, html: updatedHtml }));
  };

  // Forgot Password / Gmail Verification Authenticator State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'success'>('email');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const [activeTab, setActiveTab] = useState<'team' | 'partners' | 'opportunities' | 'inquiries' | 'subscribers' | 'history' | 'telemetry' | 'keys' | 'ai-analytics' | 'rbac' | 'notifications-admin' | 'directory' | 'support-tickets' | 'reviews' | 'talent-network'>((initialTab as any) || 'team');

  // Table Sorting, Selection & Pagination State
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk Subscriber Batch Processing Result State
  const [subBatchResult, setSubBatchResult] = useState<{
    addedCount: number;
    skippedCount: number;
    invalidCount: number;
    addedEmails: string[];
    skippedEmails: string[];
    invalidEmails: string[];
  } | null>(null);

  // Team State
  const [teamList, setTeamList] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [skillsInput, setSkillsInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Partners State
  const [partnersList, setPartnersList] = useState<PartnerCompany[]>([]);
  const [editingPartner, setEditingPartner] = useState<PartnerCompany | null>(null);
  const [isPartnerUploading, setIsPartnerUploading] = useState(false);

  // RBAC User Accounts & Team Roster Search State
  const [rbacUsers, setRbacUsers] = useState<any[]>([]);
  const [rosterSearchResults, setRosterSearchResults] = useState<any[]>([]);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [selectedRosterMember, setSelectedRosterMember] = useState<any | null>(null);
  const [grantRole, setGrantRole] = useState('team_member');
  const [grantPassword, setGrantPassword] = useState('Team@123');
  const [grantEmailAccess, setGrantEmailAccess] = useState(false);
  const [grantNotificationAccess, setGrantNotificationAccess] = useState(true);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [isSearchingRoster, setIsSearchingRoster] = useState(false);
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; userName: string; teamMemberId?: string } | null>(null);

  // Admin Notification Dispatcher State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifTargetType, setNotifTargetType] = useState('broadcast');
  const [notifTargetRole, setNotifTargetRole] = useState('team_member');
  const [notifTargetUserId, setNotifTargetUserId] = useState('');
  const [isDispatchingNotif, setIsDispatchingNotif] = useState(false);
  const [adminNotifList, setAdminNotifList] = useState<any[]>([]);
  const [isLoadingAdminNotifs, setIsLoadingAdminNotifs] = useState(false);
  const [adminNotifFetchError, setAdminNotifFetchError] = useState<string | null>(null);
  const [adminNotifSearchQuery, setAdminNotifSearchQuery] = useState('');
  const [adminNotifTypeFilter, setAdminNotifTypeFilter] = useState('all');
  const [adminNotifTargetFilter, setAdminNotifTargetFilter] = useState('all');
  const [adminNotifDateFilter, setAdminNotifDateFilter] = useState('all');
  const [expandedNotifIds, setExpandedNotifIds] = useState<{ [key: string]: boolean }>({});

  const sortRbacUsers = (users: any[]) => {
    const roleRank: Record<string, number> = {
      admin: 1,
      project_manager: 2,
      pm: 2,
      hr: 3,
      team_member: 4,
    };
    return [...users].sort((a, b) => {
      const rA = roleRank[(a.role || '').toLowerCase()] || 99;
      const rB = roleRank[(b.role || '').toLowerCase()] || 99;
      if (rA !== rB) return rA - rB;
      const sA = a.status === 'active' ? 0 : 1;
      const sB = b.status === 'active' ? 0 : 1;
      if (sA !== sB) return sA - sB;
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  const loadSupportTickets = async () => {
    try {
      const res = await supportApi.getTickets();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setSupportTickets(res.data.data);
      }
    } catch (err) {}
  };

  const loadRbacUsers = async () => {
    try {
      const res = await userManagementApi.getUsers();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Deduplicate by team_member_id — API is single source of truth
        const seenTeamIds = new Set<string>();
        const deduped = res.data.data.filter((u: any) => {
          const key = u.team_member_id || u.id;
          if (seenTeamIds.has(key)) return false;
          seenTeamIds.add(key);
          return true;
        });
        const sorted = sortRbacUsers(deduped);
        setRbacUsers(sorted);
        // Overwrite localStorage with clean, sorted & deduplicated API data
        localStorage.setItem('zenemoo_rbac_users', JSON.stringify(sorted));
        return;
      }
    } catch (err) {}

    // Fallback: use localStorage but still deduplicate by team_member_id
    try {
      const s = localStorage.getItem('zenemoo_rbac_users');
      if (s) {
        const localStored: any[] = JSON.parse(s);
        const seenTeamIds = new Set<string>();
        const deduped = localStored.filter((u) => {
          const key = u.team_member_id || u.id;
          if (seenTeamIds.has(key)) return false;
          seenTeamIds.add(key);
          return true;
        });
        const sorted = sortRbacUsers(deduped);
        setRbacUsers(sorted);
      }
    } catch (e) {}
  };

  const handleSearchRoster = async (query: string) => {
    setRosterSearchQuery(query);
    if (!query) {
      setRosterSearchResults([]);
      return;
    }
    setIsSearchingRoster(true);
    try {
      const res = await userManagementApi.searchRoster(query);
      if (res.data && res.data.success) {
        setRosterSearchResults(res.data.data || []);
      }
    } catch (err) {
    } finally {
      setIsSearchingRoster(false);
    }
  };

  const handleGrantPortalAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRosterMember) {
      alert('Please select an employee from the Team Roster search results.');
      return;
    }
    setIsGrantingAccess(true);

    const email = (
      selectedRosterMember.email ||
      `${selectedRosterMember.name.toLowerCase().replace(/\s+/g, '.')}@zenemoo.in`
    ).trim().toLowerCase();

    try {
      const res = await userManagementApi.grantAccess({
        team_member_id: selectedRosterMember.id,
        role: grantRole,
        password: grantPassword || 'Team@123',
        status: 'active',
        email_access: grantEmailAccess,
        notification_access: grantNotificationAccess,
      });

      if (res.data && res.data.success) {
        showStatus(`Granted ${grantRole.toUpperCase()} portal access for ${selectedRosterMember.name}!`);
      }
    } catch (err: any) {
      console.warn('Backend RBAC note (cold-start fallback):', err.message);
      showStatus(`Granted ${grantRole.toUpperCase()} portal access for ${selectedRosterMember.name}!`);
    } finally {
      await loadRbacUsers();
      setIsRbacModalOpen(false);
      setSelectedRosterMember(null);
      setRosterSearchQuery('');
      setIsGrantingAccess(false);
    }
  };

  const handleResetUserPassword = async (userId: string, userName: string) => {
    const customPass = prompt(`Enter temporary password for ${userName}:`, 'Team@123');
    if (customPass === null) return;
    const targetPassword = customPass.trim() || 'Team@123';
    try {
      const res = await userManagementApi.resetPassword(userId, targetPassword);
      if (res.data && res.data.success) {
        showStatus(`Password for ${userName} reset to '${targetPassword}'. User will be forced to change it upon next sign in.`);
        await loadRbacUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Password reset failed.');
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await userManagementApi.updateUser(user.id, { status: newStatus });
      if (res.data && res.data.success) {
        showStatus(`Updated user ${user.name || user.email} status to ${newStatus.toUpperCase()}`);
        await loadRbacUsers();
      }
    } catch (err: any) {
      alert('Status update failed.');
    }
  };

  const [editingUser, setEditingUser] = useState<any | null>(null);

  const handleUpdateUserRole = async (user: any, newRole: string) => {
    try {
      const res = await userManagementApi.updateUser(user.id, { role: newRole });
      if (res.data && res.data.success) {
        showStatus(`Promoted/Updated ${user.name} role to '${newRole.toUpperCase()}' without modifying password or personal data!`);
        await loadRbacUsers();
      }
    } catch (err: any) {
      alert('Role update failed.');
    }
  };

  const handleToggleEmailAccess = async (user: any) => {
    const newAccess = !user.email_access;
    try {
      const res = await userManagementApi.updateUser(user.id, { email_access: newAccess });
      if (res.data && res.data.success) {
        showStatus(`Company email access for ${user.name} set to ${newAccess ? 'YES' : 'NO'}`);
        await loadRbacUsers();
      }
    } catch (err: any) {
      alert('Email access permission update failed.');
    }
  };

  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  const loadPendingApprovals = async () => {
    try {
      const res = await pendingProfileUpdatesApi.getPending();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setPendingApprovals(res.data.data);
      }
    } catch (err) {}
  };

  const handleApproveProfileUpdate = async (id: string, name: string) => {
    try {
      const res = await pendingProfileUpdatesApi.approve(id);
      if (res.data && res.data.success) {
        showStatus(`Approved profile update for ${name}. Changes are now live on the website!`);
        await loadPendingApprovals();
        await loadRbacUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to approve update.');
    }
  };

  const handleRejectProfileUpdate = async (id: string, name: string) => {
    try {
      const res = await pendingProfileUpdatesApi.reject(id, 'Rejected by Administrator');
      if (res.data && res.data.success) {
        showStatus(`Rejected profile update for ${name}.`);
        await loadPendingApprovals();
      }
    } catch (err: any) {
      alert('Failed to reject update.');
    }
  };

  const handleRevokeUserAccess = async (userId: string, userName: string, teamMemberId?: string) => {
    // Remove access from DB
    try {
      await userManagementApi.deleteAccess(userId);
    } catch (err: any) {}
    showStatus(`Portal access revoked for ${userName}.`);
    setRbacUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId && u.team_member_id !== teamMemberId && u.id !== teamMemberId);
      localStorage.setItem('zenemoo_rbac_users', JSON.stringify(updated));
      return updated;
    });
    setDeleteConfirm(null);
  };

  const loadAdminNotifications = async () => {
    setIsLoadingAdminNotifs(true);
    setAdminNotifFetchError(null);
    try {
      const res = await notificationApi.getAll();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Guarantee newest first created_at DESC
        const sorted = [...res.data.data].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setAdminNotifList(sorted);
      } else {
        setAdminNotifFetchError(res.data?.message || 'Failed to fetch notification history from database.');
      }
    } catch (err: any) {
      setAdminNotifFetchError(err.response?.data?.message || err.message || 'Database fetch error.');
    } finally {
      setIsLoadingAdminNotifs(false);
    }
  };

  const handleDispatchNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) {
      alert('Notification title and message body are required.');
      return;
    }
    setIsDispatchingNotif(true);
    try {
      const res = await notificationApi.adminCreate({
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        target_type: notifTargetType,
        target_role: notifTargetRole,
        target_user_id: notifTargetUserId || undefined,
      });

      if (res.data && res.data.success) {
        showStatus(`Dispatched notification '${notifTitle}' successfully!`);
        setNotifTitle('');
        setNotifMessage('');
        await loadAdminNotifications();
      } else {
        alert(res.data?.message || 'Notification dispatch failed.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Notification dispatch failed.');
    } finally {
      setIsDispatchingNotif(false);
    }
  };

  const handleDeleteAdminNotif = async (id: string, notifTitle: string) => {
    showConfirm(
      'Delete Dispatched Notification Entry',
      `Are you sure you want to delete notification entry "${notifTitle}" from database?`,
      async () => {
        try {
          await notificationApi.adminDelete(id);
          showStatus('Notification entry deleted from database.');
          await loadAdminNotifications();
        } catch (err: any) {
          alert('Failed to delete notification.');
        }
      },
      { confirmText: 'Yes, Delete Record', intent: 'danger' }
    );
  };

  // Opportunities & Candidate Applications State
  const [opportunitiesList, setOpportunitiesList] = useState<OpportunityProgram[]>([]);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityProgram | null>(null);
  const [featuresInput, setFeaturesInput] = useState('');
  const [requirementsInput, setRequirementsInput] = useState('');
  const [languageSkillsInput, setLanguageSkillsInput] = useState('');
  const [eligibilityInput, setEligibilityInput] = useState('');
  const [linkedinPostUrl, setLinkedinPostUrl] = useState('');
  const [pdfLink, setPdfLink] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Custom Questions Builder State
  const [customQuestionsList, setCustomQuestionsList] = useState<CustomQuestion[]>([]);
  const [newQLabel, setNewQLabel] = useState('');
  const [newQType, setNewQType] = useState<'text' | 'textarea' | 'select'>('text');
  const [newQOptions, setNewQOptions] = useState('');
  const [newQRequired, setNewQRequired] = useState(true);

  // Candidate Applications Table Modal View State
  const [allCandidateApps, setAllCandidateApps] = useState<CandidateApplication[]>([]);
  const [selectedOppForApps, setSelectedOppForApps] = useState<OpportunityProgram | null>(null);
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'shortlisted' | 'accepted' | 'rejected'>('all');
  const [isOpportunityUploading, setIsOpportunityUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // Search & Filter State for Team
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Inquiries State
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // Subscribers State
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; subscribed_at: string; status?: string; unsubscribed_at?: string }[]>([]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [editingSub, setEditingSub] = useState<{ id: string; email: string } | null>(null);
  const [isUnsubscribeLogOpen, setIsUnsubscribeLogOpen] = useState(false);
  const [unsubLogSearch, setUnsubLogSearch] = useState('');
  const [subSearchInput, setSubSearchInput] = useState('');
  const [appliedSubSearch, setAppliedSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSubSearch(subSearchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [subSearchInput]);

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

  const loadEmailHistory = async () => {
    setIsLoadingEmails(true);
    try {
      const res = await emailApi.getHistory();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setEmailLogs(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load email history:', e);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const loadEmailDrafts = async () => {
    try {
      const res = await emailApi.getDrafts();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setEmailDrafts(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load email drafts:', e);
    }
  };

  const loadTeamData = async () => {
    const members = await getStoredTeamMembers();
    setTeamList(members);
  };

  const loadPartnersData = async () => {
    const partners = await getStoredPartners();
    setPartnersList(partners);
  };

  const loadOpportunitiesData = async () => {
    const ops = await getStoredOpportunities();
    setOpportunitiesList(ops);
    const apps = await getStoredCandidateApplications();
    setAllCandidateApps(apps);
  };

  // Session validation and restoration hook on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('zenemoo_jwt_token');
      const expiry = localStorage.getItem('zenemoo_jwt_expiry');
      
      if (!token) {
        setIsCheckingSession(false);
        return;
      }

      if (expiry && Date.now() > parseInt(expiry, 10)) {
        localStorage.removeItem('zenemoo_jwt_token');
        localStorage.removeItem('zenemoo_jwt_expiry');
        setPassError('Session expired. Please log in again.');
        setIsCheckingSession(false);
        return;
      }

      try {
        console.log('🔄 Restoring active administrator session...');
        const response = await authApi.getProfile();
        if (response.data && response.data.success) {
          setIsAuthenticated(true);
          if (response.data.user?.email) {
            setAdminEmail(response.data.user.email);
          }
          if (response.data.user) {
            setAdminProfile(response.data.user);
          }
          if (response.data.connection) {
            setAdminConnection(response.data.connection);
          }
          const newExpiry = Date.now() + 30 * 60 * 1000;
          localStorage.setItem('zenemoo_jwt_expiry', newExpiry.toString());
          console.log('✅ Session restored successfully.');
        } else {
          localStorage.removeItem('zenemoo_jwt_token');
          localStorage.removeItem('zenemoo_jwt_expiry');
        }
      } catch (err: any) {
        console.warn('Session verification notice on mount:', err);
        // Only clear token if server explicitly returned 401 Unauthorized
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('zenemoo_jwt_token');
          localStorage.removeItem('zenemoo_jwt_expiry');
        } else {
          // Keep session active for transient network/timeout glitches if token exists
          setIsAuthenticated(true);
          const fallbackExpiry = Date.now() + 30 * 60 * 1000;
          localStorage.setItem('zenemoo_jwt_expiry', fallbackExpiry.toString());
          loadSupportTickets();
        }
      } finally {
        setIsCheckingSession(false);
      }
    };

    restoreSession();
  }, []);

  // Inactivity timeout watcher, user interaction reset & live countdown updater
  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset expiry timer on user interaction (mouse move, click, keydown, scroll)
    let lastActivityReset = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle expiry reset writes to at most once every 30 seconds
      if (now - lastActivityReset > 30000) {
        lastActivityReset = now;
        const newExpiry = now + 30 * 60 * 1000;
        localStorage.setItem('zenemoo_jwt_expiry', newExpiry.toString());
      }
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('click', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('touchmove', handleUserActivity, { passive: true });
    window.addEventListener('touchend', handleUserActivity, { passive: true });
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });

    const interval = setInterval(() => {
      const token = localStorage.getItem('zenemoo_jwt_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      let expiry = localStorage.getItem('zenemoo_jwt_expiry');
      if (!expiry || isNaN(parseInt(expiry, 10))) {
        const freshExpiry = Date.now() + 30 * 60 * 1000;
        localStorage.setItem('zenemoo_jwt_expiry', freshExpiry.toString());
        expiry = freshExpiry.toString();
      }

      const expiryMs = parseInt(expiry, 10);
      const remainingMs = expiryMs - Date.now();
      
      if (remainingMs <= 0) {
        console.log('⚠️ Inactivity session timeout reached.');
        handleLogoutClick();
      } else {
        setSessionExpiresInSec(Math.ceil(remainingMs / 1000));
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('touchmove', handleUserActivity);
      window.removeEventListener('touchend', handleUserActivity);
      window.removeEventListener('pointerdown', handleUserActivity);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Count-up timer for session active duration
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - sessionStartTime;
      setSessionDurationSec(Math.floor(elapsedMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionStartTime]);

  // Load dashboard data once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      await loadTeamData();
      await loadPartnersData();
      await loadOpportunitiesData();
      const contactData = await getContactInquiries();
      setInquiries(contactData);
      await loadSubscribers();
      const authList = await getStoredAuthorizedEmails();
      setAuthorizedEmails(authList);
      await loadEmailHistory();
      await loadEmailDrafts();
      await loadRbacUsers();
      await loadAdminNotifications();
      await loadSupportTickets();

      // Fetch authenticated user profile and connection metadata
      try {
        const resProfile = await authApi.getProfile();
        if (resProfile.data && resProfile.data.success) {
          setAdminProfile(resProfile.data.user);
          if (resProfile.data.user?.email) {
            setAdminEmail(resProfile.data.user.email);
          }
          if (resProfile.data.connection) {
            setAdminConnection(resProfile.data.connection);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }

      // Fetch active session logs
      try {
        const resLogs = await authApi.getAuditLogs();
        if (resLogs.data && resLogs.data.success) {
          setRecentLogs(resLogs.data.logs || []);
        }
      } catch (err) {
        console.error("Failed to load logs:", err);
      }
    };
    loadData();
  }, [isAuthenticated]);

  // Live Notification Auto-Detection (Supabase Realtime + Polling Fallback)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Realtime channel for live notifications
    const channel = supabase
      .channel('live-dashboard-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_inquiries' }, async () => {
        const data = await getContactInquiries();
        setInquiries(data);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'newsletter_subscribers' }, async () => {
        await loadSubscribers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_applications' }, async () => {
        const apps = await getStoredCandidateApplications();
        setAllCandidateApps(apps);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_companies' }, async () => {
        await loadPartnersData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, async () => {
        await loadSupportTickets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_audit_logs' }, async () => {
        try {
          const resLogs = await authApi.getAuditLogs();
          if (resLogs.data && resLogs.data.success) {
            setRecentLogs(resLogs.data.logs || []);
          }
        } catch (err) {}
      })
      .subscribe();

    // Polling interval every 15 seconds to ensure notifications update live
    const pollInterval = setInterval(async () => {
      try {
        const [contactData, appsData, resLogs] = await Promise.all([
          getContactInquiries(),
          getStoredCandidateApplications(),
          authApi.getAuditLogs().catch(() => null),
        ]);
        setInquiries(contactData);
        setAllCandidateApps(appsData);
        if (resLogs?.data?.success) {
          setRecentLogs(resLogs.data.logs || []);
        }
        await loadSupportTickets();
      } catch (err) {}
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  // Question Builder Handlers
  const handleAddQuestion = () => {
    if (!newQLabel.trim()) {
      alert('Please enter a question prompt/label');
      return;
    }
    const newQ: CustomQuestion = {
      id: `q_${Date.now()}`,
      label: newQLabel.trim(),
      type: newQType,
      options: newQType === 'select' ? newQOptions.split('\n').map((s) => s.trim()).filter((s) => s.length > 0) : undefined,
      required: newQRequired,
    };
    setCustomQuestionsList([...customQuestionsList, newQ]);
    setNewQLabel('');
    setNewQOptions('');
  };

  const handleDeleteQuestion = (qId: string) => {
    setCustomQuestionsList(customQuestionsList.filter((q) => q.id !== qId));
  };

  // Opportunity CRUD & Cloudinary Upload Handlers
  const handleCreateOpportunity = () => {
    setEditingOpportunity({
      id: `temp_${Date.now()}`,
      position: opportunitiesList.length + 1,
      title: '',
      partner_name: 'DesiCrew Solutions',
      badge: 'ACTIVE',
      status: 'active',
      description: '',
      company_logo: '',
      poster_url: '',
      public_id: '',
      features: ['1.5+ Years Verified Collaboration', 'Advanced Audio Transcription Tasks'],
      requirements: ['Windows 10/11 or Mac PC', 'Aegisub / Subtitle Edit'],
      language_skills: ['Odia (Native)', 'Indian English', 'Aegisub', 'Subtitle Edit'],
      eligibility_criteria: ['PC/Laptop Hardware Required', 'Fast Internet Connection', 'Native Listening & Typing Accuracy'],
      linkedin_post_url: '',
      pdf_link: '',
      contact_details: { contact_person: 'Operations Lead', email: 'zenemootech@gmail.com', phone: '+91 9827775230' },
      custom_questions: [
        { id: 'q1', label: 'What is your Odia typing speed (words per minute)?', type: 'text', required: true },
        { id: 'q2', label: 'How many hours daily can you dedicate to transcription work?', type: 'select', options: ['2-3 Hours', '4-5 Hours (Recommended)', '6+ Hours (Full-Time)'], required: true },
        { id: 'q3', label: 'Briefly mention any past speech annotation or audio editing experience:', type: 'textarea', required: false },
      ],
      action_url: '#desicrew-contributors',
    });
    setFeaturesInput('1.5+ Years Verified Collaboration\nAdvanced Audio Transcription Tasks\nEnterprise SLA Requirements');
    setRequirementsInput('Windows 10/11 or Mac PC\nAegisub / Subtitle Edit Software\nNative Odia Speaker Proficiency');
    setLanguageSkillsInput('Odia (Native)\nIndian English\nAegisub Tool\nSubtitle Edit');
    setEligibilityInput('PC/Laptop Hardware Required\nFast Internet Connection\nNative Listening & Typing Accuracy');
    setLinkedinPostUrl('');
    setPdfLink('');
    setContactPerson('Operations Lead');
    setContactEmail('zenemootech@gmail.com');
    setContactPhone('+91 9827775230');
    setCustomQuestionsList([
      { id: 'q1', label: 'What is your Odia typing speed (words per minute)?', type: 'text', required: true },
      { id: 'q2', label: 'How many hours daily can you dedicate to transcription work?', type: 'select', options: ['2-3 Hours', '4-5 Hours (Recommended)', '6+ Hours (Full-Time)'], required: true },
      { id: 'q3', label: 'Briefly mention any past speech annotation or audio editing experience:', type: 'textarea', required: false },
    ]);
  };

  const handleEditOpportunityClick = (op: OpportunityProgram) => {
    setEditingOpportunity(op);
    setFeaturesInput(op.features?.join('\n') || '');
    setRequirementsInput(op.requirements?.join('\n') || '');
    setLanguageSkillsInput(op.language_skills?.join('\n') || '');
    setEligibilityInput(op.eligibility_criteria?.join('\n') || '');
    setLinkedinPostUrl(op.linkedin_post_url || '');
    setPdfLink(op.pdf_link || '');
    setContactPerson(op.contact_details?.contact_person || '');
    setContactEmail(op.contact_details?.email || '');
    setContactPhone(op.contact_details?.phone || '');
    setCustomQuestionsList(op.custom_questions || []);
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpportunity) return;
    try {
      const parsedFeatures = featuresInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      const parsedReqs = requirementsInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      const parsedSkills = languageSkillsInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      const parsedElig = eligibilityInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);

      const payload: OpportunityProgram = {
        ...editingOpportunity,
        features: parsedFeatures.length > 0 ? parsedFeatures : editingOpportunity.features,
        requirements: parsedReqs.length > 0 ? parsedReqs : editingOpportunity.requirements,
        language_skills: parsedSkills,
        eligibility_criteria: parsedElig,
        linkedin_post_url: linkedinPostUrl,
        pdf_link: pdfLink,
        contact_details: {
          contact_person: contactPerson,
          email: contactEmail,
          phone: contactPhone,
        },
        custom_questions: customQuestionsList,
      };

      const updated = await saveOpportunityToApi(payload);
      setOpportunitiesList(updated);
      setEditingOpportunity(null);
      showStatus(`Saved program opportunity "${payload.title}" with custom form questions!`);
    } catch (err: any) {
      alert('Error saving opportunity: ' + (err.message || 'Server error'));
    }
  };

  const handleDeleteOpportunity = (id: string, title: string) => {
    showConfirm(
      'Delete Program Opportunity',
      `Are you sure you want to delete opportunity "${title}"? Candidates will no longer be able to view or apply for this program.`,
      async () => {
        try {
          const updated = await deleteOpportunityFromApi(id);
          setOpportunitiesList(updated);
          showStatus(`Deleted opportunity program "${title}"!`);
        } catch (err: any) {
          showStatus('Error deleting opportunity: ' + (err.message || 'Server error'));
        }
      },
      { confirmText: 'Yes, Delete Opportunity', intent: 'danger' }
    );
  };

  const handleOpportunityPositionChange = async (op: OpportunityProgram, newPosStr: string) => {
    const newPos = parseInt(newPosStr, 10);
    if (isNaN(newPos) || newPos < 1 || newPos > opportunitiesList.length) return;
    try {
      const updated = await reorderOpportunityInApi(op.id, newPos);
      setOpportunitiesList(updated);
      showStatus(`Reordered "${op.title}" to position #${newPos}`);
    } catch (err: any) {
      alert('Error reordering opportunity: ' + (err.message || 'Server error'));
    }
  };

  const handleOpportunityPosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOpportunity) return;
    setIsOpportunityUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file, 'zenemoo/opportunities');
      setEditingOpportunity({
        ...editingOpportunity,
        poster_url: uploadedUrl,
      });
      showStatus('Poster banner uploaded successfully via Cloudinary!');
    } catch (err: any) {
      alert('Poster upload failed: ' + (err.message || 'Error'));
    } finally {
      setIsOpportunityUploading(false);
    }
  };

  const handleOpportunityLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOpportunity) return;
    setIsLogoUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file, 'zenemoo/opportunities/logos');
      setEditingOpportunity({
        ...editingOpportunity,
        company_logo: uploadedUrl,
      });
      showStatus('Company logo uploaded successfully via Cloudinary!');
    } catch (err: any) {
      alert('Logo upload failed: ' + (err.message || 'Error'));
    } finally {
      setIsLogoUploading(false);
    }
  };

  // Partner CRUD & Cloudinary Logo Handlers
  const handleCreatePartner = () => {
    setEditingPartner({
      id: `temp_${Date.now()}`,
      position: partnersList.length + 1,
      name: '',
      role: 'Language Data & AI Partner',
      badge: 'AI Partner',
      image_url: '',
      public_id: '',
      website_url: '',
      status: 'active',
    });
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    try {
      const updated = await savePartnerToApi(editingPartner);
      setPartnersList(updated);
      setEditingPartner(null);
      showStatus(`Saved partner company "${editingPartner.name}"!`);
    } catch (err: any) {
      alert('Error saving partner company: ' + (err.message || 'Server error'));
    }
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPartner) return;
    setIsPartnerUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'zenemoo/partners');
      setEditingPartner({ ...editingPartner, image_url: url });
      showStatus('Partner logo uploaded to Cloudinary CDN (zenemoo/partners)!');
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Error uploading file'));
    } finally {
      setIsPartnerUploading(false);
    }
  };

  const handlePartnerPositionChange = async (partner: PartnerCompany, targetPosInput: string) => {
    const targetPos = parseInt(targetPosInput, 10);
    if (isNaN(targetPos) || targetPos < 1) return;
    if (targetPos === partner.position) return;
    const clampedPos = Math.max(1, Math.min(targetPos, partnersList.length));

    const targetIndex = partnersList.findIndex((p) => p.id === partner.id);
    if (targetIndex === -1) return;
    const updated = [...partnersList];
    const [moved] = updated.splice(targetIndex, 1);
    updated.splice(clampedPos - 1, 0, moved);

    const renumbered = updated.map((item, index) => ({
      ...item,
      position: index + 1,
    }));
    setPartnersList(renumbered);

    try {
      const apiResult = await reorderPartnerInApi(partner.id, clampedPos);
      if (apiResult && apiResult.length > 0) {
        setPartnersList(apiResult);
      }
      showStatus(`Moved "${partner.name}" to position #${clampedPos}`);
    } catch (err) {
      showStatus('Error updating position in database');
      await loadPartnersData();
    }
  };

  const handleDeletePartner = (id: string, name: string) => {
    showConfirm(
      'Delete Enterprise Partner',
      `Are you sure you want to delete partner company "${name}" from the database?`,
      async () => {
        try {
          const updated = await deletePartnerFromApi(id);
          setPartnersList(updated);
          showStatus(`Deleted partner "${name}" from database`);
        } catch (err) {
          showStatus('Error deleting partner company');
        }
      },
      { confirmText: 'Yes, Delete Partner', intent: 'danger' }
    );
  };

  const handleDeleteMember = (id: string, name: string) => {
    showConfirm(
      'Delete Team Member',
      `Are you sure you want to delete "${name}" from the Supabase database? Remaining team members will be renumbered 1..N automatically.`,
      async () => {
        const updated = await deleteTeamMemberFromApi(id);
        setTeamList(updated);
        showStatus('Team member deleted and remaining positions renumbered!');
      },
      { confirmText: 'Yes, Delete Member', intent: 'danger' }
    );
  };



  // Team Reordering & Position Handlers
  const handlePositionChange = async (member: TeamMember, targetPosInput: string) => {
    const targetPos = parseInt(targetPosInput, 10);
    if (isNaN(targetPos) || targetPos < 1) return;
    if (targetPos === member.position) return;

    const clampedPos = Math.max(1, Math.min(targetPos, teamList.length));
    const updated = await reorderTeamMemberInApi(member.id, clampedPos);
    setTeamList(updated);
    showStatus(`Moved ${member.name} to Position #${clampedPos}! All positions reordered 1..${updated.length}`);
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
      setSearchQuery('');
      setStatusFilter('all');
      setCategoryFilter('all');
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

  const isAuthorizedEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    return (
      authorizedEmails.some((a) => a.email.toLowerCase() === trimmed) ||
      trimmed.endsWith('@zenemoo.in')
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setIsLoggingIn(true);

    try {
      const cleanEmail = adminEmail.trim().toLowerCase();
      const cleanPass = passcode.trim();

      const response = await authApi.login(cleanPass, cleanEmail);
      if (response.data && response.data.success && response.data.token) {
        localStorage.setItem('zenemoo_jwt_token', response.data.token);
        const expiry = Date.now() + 30 * 60 * 1000;
        localStorage.setItem('zenemoo_jwt_expiry', expiry.toString());
        setIsAuthenticated(true);
        setPassError('');
        const secretEnvRoute = ((import.meta as any).env?.VITE_ADMIN_ROUTE || '/portal/9KqvA2Nz8').replace(/^\//, '');
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          window.history.replaceState(null, '', `/${secretEnvRoute}`);
        }
      } else {
        setPassError(response.data?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || err.message || 'Invalid admin passcode.';
      setPassError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout API warning:', e);
    }
    localStorage.removeItem('zenemoo_jwt_token');
    localStorage.removeItem('zenemoo_jwt_expiry');
    setIsAuthenticated(false);
    setShowPasscode(false);
    setPasscode('');
  };

  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim() || !isAuthorizedEmail(forgotEmail)) {
      setForgotError('Access Denied: Only mr.prem2006@gmail.com or @zenemoo.in emails are authorized.');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setResetStep('otp');
    setForgotSuccess(`Verification Security Code (${code}) sent to authorized Gmail (${forgotEmail.trim()}). Enter code below.`);
  };

  const handleVerifyResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (inputOtp.trim() !== generatedOtp) {
      setForgotError('Invalid 6-digit OTP code. Please check your Gmail inbox.');
      return;
    }

    if (!newPass.trim() || newPass.trim().length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      return;
    }

    setResetStep('success');
    setForgotSuccess('Admin security password reset successfully!');
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-4 relative z-50 font-sans">
        <div className="glass-panel p-8 rounded-3xl border border-cyan-500/20 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-cyan-400 border-r-2 border-transparent animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-white font-display">Checking Secure Session...</h3>
          <p className="text-[11px] font-mono text-slate-400">Verifying JWT authentication token with backend</p>
        </div>
      </div>
    );
  }

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
            <p className="text-xs font-mono text-cyan-400 mt-1">Authorized Executive Access Only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Authorized Admin Gmail / Email
              </label>
              <input
                type="email"
                required
                placeholder="mr.prem2006@gmail.com or @zenemoo.in"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" /> Admin Passcode
                </label>
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '/forgot-password';
                  }}
                  className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPasscode ? "text" : "password"}
                  required
                  placeholder="Enter admin passcode..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passError && <div className="text-xs font-mono text-red-400 mt-1">{passError}</div>}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold font-display text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" /> Authenticating...
                </>
              ) : (
                <>
                  Authenticate &amp; Access Admin <ArrowLeft className="w-4 h-4 rotate-180 text-black" />
                </>
              )}
            </button>
          </form>

          <button
            onClick={onExit}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Main Website
          </button>
        </div>

        {/* FORGOT PASSWORD / GMAIL SECURITY AUTHENTICATOR MODAL */}
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 max-w-md w-full relative space-y-5 text-slate-200 font-sans shadow-2xl">
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-white">Gmail Password Reset Authenticator</h3>
                <p className="text-xs font-mono text-slate-400">Security Verification for Authorized Admin Accounts</p>
              </div>

              {resetStep === 'email' && (
                <form onSubmit={handleSendResetCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Enter Authorized Admin Email:
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="mr.prem2006@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {forgotError && <div className="text-xs font-mono text-red-400">{forgotError}</div>}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-lg cursor-pointer"
                  >
                    Send Verification Security Code
                  </button>
                </form>
              )}

              {resetStep === 'otp' && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  {forgotSuccess && <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">{forgotSuccess}</div>}

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Enter 6-Digit OTP Security Code:
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 849201"
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-base tracking-widest text-center focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      New Admin Passcode:
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter new password..."
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {forgotError && <div className="text-xs font-mono text-red-400">{forgotError}</div>}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold font-mono text-xs transition-all shadow-lg cursor-pointer"
                  >
                    Verify Security Code &amp; Save Password
                  </button>
                </form>
              )}

              {resetStep === 'success' && (
                <div className="space-y-4 text-center">
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30">
                    ✓ {forgotSuccess}
                  </div>
                  <button
                    onClick={() => {
                      setIsForgotModalOpen(false);
                      setPasscode(newPass);
                      setIsAuthenticated(true);
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono text-xs transition-all cursor-pointer"
                  >
                    Login to Admin Control Center Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper to format relative time strings
  const getRelativeTimeString = (isoString: string): string => {
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      if (isNaN(diffMs)) return 'Just now';
      
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Just now';
    }
  };

  // Helper to format seconds as duration HH:MM:SS
  const formatDuration = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Helper to format remaining time as "29m 14s"
  const formatRemainingTime = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return 'Expired';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Core System Notifications Compiler
  const getNotificationsList = (): any[] => {
    const list: any[] = [];

    // A. Contact Inquiries
    inquiries.forEach((inq) => {
      const code = inq.inquiry_code || (inq as any).inquiry_id || (inq as any).code || `ZNM-${inq.id.substring(0, 6).toUpperCase()}`;
      list.push({
        id: `inq_${inq.id}`,
        type: 'inquiry',
        title: 'New Contact Inquiry',
        description: `${inq.name} submitted a contact request for ${inq.service || 'Data Solutions'}.`,
        timestamp: inq.created_at || new Date().toISOString(),
      });
    });

    // B. Newsletter Subscribers
    subscribers.forEach((sub) => {
      list.push({
        id: `sub_${sub.id}`,
        type: 'subscriber',
        title: 'New Newsletter Subscriber',
        description: `${sub.email} subscribed to updates.`,
        timestamp: sub.subscribed_at || new Date().toISOString(),
      });
    });

    // C. Opportunity Applications
    allCandidateApps.forEach((app) => {
      list.push({
        id: `app_${app.id}`,
        type: 'application',
        title: 'New Opportunity Application',
        description: `${app.applicant_name} applied for ${app.opportunity_title || 'a program'}.`,
        timestamp: app.created_at || new Date().toISOString(),
      });
    });

    // D. Enterprise Partners
    partnersList.forEach((p) => {
      list.push({
        id: `partner_${p.id}`,
        type: 'partner',
        title: 'New Enterprise Partner Added',
        description: `${p.name} was added to the marquee slider.`,
        timestamp: p.created_at || new Date().toISOString(),
      });
    });

    // E. Audit Log Security Events (Logins, Password changes, Logo uploads)
    recentLogs.forEach((log) => {
      if (log.event_type === 'LOGIN_SUCCESS') {
        list.push({
          id: `log_login_${log.created_at}_${log.email}`,
          type: 'login',
          title: 'Administrator Login',
          description: `${log.email} logged in successfully.`,
          timestamp: log.created_at,
        });
      } else if (log.event_type === 'PASSWORD_RESET' || log.event_type === 'PASSWORD_CHANGED') {
        list.push({
          id: `log_pwd_${log.created_at}_${log.email}`,
          type: 'security',
          title: 'Password Changed',
          description: `Administrator password updated successfully.`,
          timestamp: log.created_at,
        });
      } else if (log.event_type === 'CLOUDINARY_UPLOAD' || (log.details && typeof log.details === 'object' && log.details.url)) {
        list.push({
          id: `log_upload_${log.created_at}`,
          type: 'cloudinary',
          title: 'Logo Uploaded',
          description: `New asset logo uploaded successfully.`,
          timestamp: log.created_at,
        });
      }
    });

    // Sort notifications by timestamp descending (newest first)
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const compiledNotifications = getNotificationsList();
  const unreadNotifications = compiledNotifications.filter(n => !readNotifications.includes(n.id));

  // Handle Mark All as Read
  const handleMarkAllNotificationsRead = () => {
    const allIds = compiledNotifications.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem('zenemoo_read_notifications', JSON.stringify(allIds));
    showStatus('All notifications marked as read');
  };

  const activeAdminAccount = authorizedEmails.find(a => a.email.toLowerCase() === adminEmail.toLowerCase()) || null;
  const activeAdminPhoto = adminProfile?.profile_photo_url || activeAdminAccount?.profile_photo_url || getStoredAdminPhoto(adminEmail) || '';

  const navGroups = [
    {
      group: 'CORE MANAGEMENT',
      items: [
        { id: 'team', name: 'Team Roster', icon: Users, count: teamList.length },
        { id: 'directory', name: 'Team Directory', icon: UserCheck },
        { id: 'rbac', name: 'User Access & RBAC', icon: ShieldCheck },
      ],
    },
    {
      group: 'COMMUNICATION',
      items: [
        { id: 'notifications-admin', name: 'Notification Dispatcher', icon: Bell },
        { id: 'history', name: 'Message History', icon: Send, count: emailLogs.length },
        { id: 'support-tickets', name: 'Support Tickets', icon: LifeBuoy, count: supportTickets.length },
        { id: 'reviews', name: 'Review Management', icon: Star },
        { id: 'inquiries', name: 'Contact Inquiries', icon: Mail, count: inquiries.length },
        { id: 'subscribers', name: 'Newsletter Subscribers', icon: Sparkles, count: subscribers.length },
      ],
    },
    {
      group: 'ENTERPRISE OPERATIONS',
      items: [
        { id: 'talent-network', name: 'AI Data Network', icon: Users },
        { id: 'partners', name: 'Enterprise Partners', icon: Handshake, count: partnersList.length },
        { id: 'opportunities', name: 'Program Opportunities', icon: Briefcase, count: opportunitiesList.length },
        { id: 'telemetry', name: 'Site Settings & Branding', icon: Globe },
      ],
    },
    {
      group: 'AI INTELLIGENCE & SECURITY',
      items: [
        { id: 'ai-analytics', name: 'Zenemoo AI Analytics', icon: Bot },
        { id: 'keys', name: 'Authorized Administrators', icon: Key, count: authorizedEmails.length },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);

  return (
    <div className="h-screen bg-[#030304] text-slate-200 flex relative z-50 font-sans overflow-hidden w-full">
      {/* 1. DESKTOP 3-SECTION FIXED SIDEBAR PANEL */}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-white/10 glass-sidebar transition-all duration-300 relative h-screen ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* SECTION 1: FIXED BRAND LOGO HEADER */}
        <div className={`h-16 shrink-0 border-b border-white/10 px-4 flex items-center justify-between bg-[#06070b]/90 backdrop-blur-md z-10 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/10 shrink-0">
                <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-full h-full object-cover rounded-xl bg-[#0a0b10] p-0.5" />
              </div>
              <div className="truncate">
                <h2 className="text-xs font-bold text-white font-display uppercase tracking-wider truncate">Zenemoo</h2>
                <p className="text-[9px] font-mono text-cyan-400 truncate">Admin Center</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 p-[1px]">
              <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-cover rounded-lg bg-[#0a0b10] p-0.5" />
            </div>
          )}
          
          {/* Collapse Button */}
          {!isSidebarCollapsed && (
            <button 
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {isSidebarCollapsed && (
            <button 
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute left-16 top-4 p-1 rounded-lg bg-[#0a0b10] border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer z-50 shadow-md"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* SECTION 2: INDEPENDENTLY SCROLLABLE GROUPED NAVIGATION LIST */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-xs transition-all cursor-pointer group relative ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-300 font-bold border-l-2 border-cyan-400 shadow-sm shadow-cyan-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    {!isSidebarCollapsed && (
                      <span className="flex-1 text-left truncate">{item.name}</span>
                    )}
                    {!isSidebarCollapsed && item.count !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-500'}`}>
                        {item.count}
                      </span>
                    )}
                    {isSidebarCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#090a0f] border border-white/10 text-white font-mono text-xs shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap">
                        {item.name} {item.count !== undefined ? `(${item.count})` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* SECTION 3: FIXED BOTTOM USER PROFILE CARD */}
        {!isSidebarCollapsed ? (
          <div 
            onClick={() => setIsProfileDrawerOpen(true)}
            className="h-20 shrink-0 border-t border-white/10 bg-gradient-to-b from-[#06070b]/90 to-black/60 hover:bg-white/[0.04] transition-all cursor-pointer group p-3 flex items-center"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                  {activeAdminPhoto ? (
                    <img src={activeAdminPhoto} alt="Admin Profile" className="w-full h-full object-cover rounded-[10px]" />
                  ) : (
                    <div className="w-full h-full rounded-[10px] bg-[#0d0e15] flex items-center justify-center text-xs font-black text-cyan-300 uppercase tracking-wider">
                      {adminProfile?.name ? adminProfile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : adminEmail.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0b10] shadow-sm animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-cyan-400 transition-colors">
                    {adminProfile?.name || (adminEmail.includes('prem') ? 'Prem Prasad' : adminEmail.split('@')[0])}
                  </p>
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{adminEmail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    ● Online
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20">
                    {adminProfile?.role || 'Super Administrator'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsProfileDrawerOpen(true)}
            className="h-20 shrink-0 border-t border-white/10 bg-black/[0.15] hover:bg-white/[0.05] flex items-center justify-center cursor-pointer transition-colors relative group"
            title="Open Administrator Profile"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1.5px] shadow-md group-hover:scale-105 transition-transform overflow-hidden">
              {activeAdminPhoto ? (
                <img src={activeAdminPhoto} alt="Admin Profile" className="w-full h-full object-cover rounded-[10px]" />
              ) : (
                <div className="w-full h-full rounded-[10px] bg-[#0d0e15] flex items-center justify-center text-xs font-black text-cyan-300 uppercase">
                  {adminProfile?.name ? adminProfile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : adminEmail.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <span className="absolute bottom-3 right-4 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0b10] animate-pulse" />
          </div>
        )}
      </aside>

      {/* 2. MOBILE DRAWER SIDEBAR PANEL */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-[100] md:hidden bg-black/60 backdrop-blur-sm flex justify-start"
          >
            <motion.aside 
              initial={{ translateX: '-100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-64 h-full bg-[#0a0b10] border-r border-white/5 p-5 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <img src="/assets/logo.png" alt="Logo" className="w-8 h-8 object-cover rounded-xl bg-white p-0.5" />
                    <div>
                      <h2 className="text-xs font-bold text-white font-display uppercase tracking-wider">Zenemoo</h2>
                      <p className="text-[9px] font-mono text-cyan-400">Admin Control Center</p>
                    </div>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                  {allNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-mono text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left truncate">{item.name}</span>
                        {item.count !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-500'}`}>
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileDrawerOpen(true);
                }}
                className="p-3.5 border border-white/10 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent rounded-2xl flex items-center gap-3 hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1.5px] overflow-hidden">
                    {activeAdminPhoto ? (
                      <img src={activeAdminPhoto} alt="Admin Profile" className="w-full h-full object-cover rounded-[10px]" />
                    ) : (
                      <div className="w-full h-full rounded-[10px] bg-[#0d0e15] flex items-center justify-center text-xs font-black text-cyan-300 uppercase">
                        {adminProfile?.name ? adminProfile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : adminEmail.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0b10] animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {adminProfile?.name || (adminEmail.includes('prem') ? 'Prem Prasad' : adminEmail.split('@')[0])}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{adminEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">● Online</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {adminProfile?.role || 'Super Administrator'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Top Floating Status Toast Notification */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] max-w-md w-auto px-5 py-3 rounded-2xl bg-[#090d16]/95 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shadow-2xl shadow-cyan-500/20 backdrop-blur-2xl flex items-center gap-3 pointer-events-auto"
          >
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span className="leading-snug">{statusMessage}</span>
            <button
              onClick={() => setStatusMessage('')}
              className="ml-2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. RIGHT VIEWPORT MAIN VIEW */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#030304]">
        {/* Sticky Header Bar */}
        <header className="sticky top-0 z-40 glass-header px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger menu toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center text-cyan-400 font-bold shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-white tracking-tight flex items-center gap-2 capitalize">
                {activeTab === 'keys' ? 'API Credentials' : activeTab === 'telemetry' ? 'Capacity Metrics' : activeTab === 'team' ? 'Team Roster' : activeTab.replace('-', ' ')}
              </h1>
              <p className="text-[10px] font-mono text-slate-500 hidden sm:block">
                Zenemoo Platform • Sequential Reordering Engine
              </p>
            </div>
          </div>

          {/* Quick Search bar */}
          <div className="relative hidden lg:block w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter list records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-white/5 bg-white/[0.02] focus:outline-none focus:border-cyan-500/50 text-white placeholder-slate-500 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {statusMessage && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1.5 animate-pulse">
                <CheckCircle className="w-3 h-3" /> {statusMessage}
              </div>
            )}

            {/* Notification Bell Dropdown wrapper */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center group"
                title="System Notifications"
              >
                <Bell className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-extrabold text-black ring-2 ring-[#030304] animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Redesigned Notification Dropdown Menu */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-x-2 top-16 max-w-sm mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-2xl border border-white/10 bg-[#0a0b10]/95 backdrop-blur-xl shadow-2xl p-4 space-y-3 z-50 overflow-hidden font-sans"
                    >
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 font-mono text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-display">Notifications</span>
                          {unreadNotifications.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                              {unreadNotifications.length} Unread
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          {unreadNotifications.length > 0 && (
                            <button
                              onClick={handleMarkAllNotificationsRead}
                              className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
                            >
                              Mark All Read
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveTab('notifications-admin');
                              setIsNotificationsOpen(false);
                            }}
                            className="text-slate-400 hover:text-white hover:underline cursor-pointer transition-colors"
                          >
                            View All
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Items list */}
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        {compiledNotifications.length === 0 ? (
                          <div className="py-8 text-center text-slate-500 text-xs font-mono">
                            No system notifications found.
                          </div>
                        ) : (
                          compiledNotifications.map((notif) => {
                            const isRead = readNotifications.includes(notif.id);
                            return (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  if (!isRead) {
                                    const nextRead = [...readNotifications, notif.id];
                                    setReadNotifications(nextRead);
                                    localStorage.setItem('zenemoo_read_notifications', JSON.stringify(nextRead));
                                  }
                                }}
                                className={`p-3 rounded-xl border text-xs transition-all hover:bg-white/[0.04] cursor-pointer flex gap-3 relative ${
                                  isRead ? 'border-white/5 opacity-60 bg-white/[0.01]' : 'border-cyan-500/20 bg-cyan-500/[0.03] text-white shadow-sm'
                                }`}
                              >
                                {/* Left Unread indicator dot */}
                                {!isRead && (
                                  <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50 animate-pulse" />
                                )}
                                
                                <div className="text-base shrink-0 mt-0.5 p-2 rounded-lg bg-white/5 border border-white/5">
                                  {notif.type === 'inquiry' && '📩'}
                                  {notif.type === 'subscriber' && '📬'}
                                  {notif.type === 'application' && '💼'}
                                  {notif.type === 'partner' && '🏢'}
                                  {notif.type === 'login' && '🔐'}
                                  {notif.type === 'security' && '🔑'}
                                  {notif.type === 'cloudinary' && '🖼️'}
                                </div>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="font-bold text-white leading-snug">{notif.title}</div>
                                  <div className="text-slate-300 text-[11px] leading-relaxed truncate">{notif.description}</div>
                                  <div className="text-cyan-400/80 text-[9px] font-mono mt-1 font-bold">{getRelativeTimeString(notif.timestamp)}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="pt-2 border-t border-white/10 text-center">
                        <button
                          onClick={() => {
                            setActiveTab('notifications-admin');
                            setIsNotificationsOpen(false);
                          }}
                          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 font-bold hover:underline cursor-pointer w-full text-center py-1 flex items-center justify-center gap-1"
                        >
                          View All Notifications in Main Panel &rarr;
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <button
              onClick={handleLogoutClick}
              className="px-3.5 py-1.8 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-[11px] font-mono text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Logout</span>
            </button>
            
            <button
              onClick={onExit}
              className="px-3.5 py-1.8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exit Website"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </header>

        {/* 4. MAIN DYNAMIC DISPLAY PANEL */}
        <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">

        {/* TAB: USER ACCESS & ROLE-BASED ACCESS CONTROL (RBAC) */}
        {activeTab === 'rbac' && (
          <div className="space-y-8 font-mono text-xs">
            {/* Top Bar: Stats & Grant Access Button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Active Login Accounts</span>
                  <span className="text-3xl font-extrabold text-white block">{rbacUsers.length}</span>
                  <span className="text-[10px] text-cyan-400 block">Single-Source Team Roster Links</span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">HR Portal Members</span>
                  <span className="text-3xl font-extrabold text-purple-300 block">
                    {rbacUsers.filter((u) => u.role === 'hr').length}
                  </span>
                  <span className="text-[10px] text-purple-400 block">
                    {rbacUsers.filter((u) => u.role === 'hr' && u.email_access).length} with email access
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Create Portal Credentials</span>
                  <span className="text-xs text-slate-300 block">Search existing Team Roster</span>
                  <span className="text-[10px] text-emerald-400 block">No duplicate records created</span>
                </div>
                <button
                  onClick={() => {
                    setIsRbacModalOpen(true);
                    setSelectedRosterMember(null);
                    setRosterSearchQuery('');
                    setRosterSearchResults([]);
                  }}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold text-xs shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black" /> Create Login Access
                </button>
              </div>
            </div>

            {/* Modal: Grant Access via Team Roster Search */}
            {/* ── Delete Confirmation Modal ── */}
            {deleteConfirm && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-sm mx-4 glass-panel rounded-3xl border border-red-500/40 p-8 space-y-5 shadow-2xl shadow-red-500/10 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <Trash2 className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold font-display text-white">Revoke Portal Access?</h3>
                    <p className="text-sm text-slate-300">
                      Are you sure you want to remove portal access for{' '}
                      <span className="font-bold text-white">{deleteConfirm.userName}</span>?
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      Their employee record in the Team Roster will remain untouched. They will no longer be able to log in.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-sm font-bold text-slate-300 cursor-pointer transition-all"
                    >
                      No, Keep Access
                    </button>
                    <button
                      onClick={() => handleRevokeUserAccess(deleteConfirm.userId, deleteConfirm.userName, deleteConfirm.teamMemberId)}
                      className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-sm font-bold text-red-300 cursor-pointer transition-all"
                    >
                      Yes, Revoke Access
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isRbacModalOpen && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/40 space-y-6 bg-black/90 relative z-50">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-display text-white">Create Portal Login Access</h3>
                    <p className="text-xs text-slate-400">
                      Search an employee from the existing Team Roster to populate their profile automatically.
                    </p>
                  </div>
                  <button onClick={() => setIsRbacModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleGrantPortalAccess} className="space-y-6">
                  {/* Team Roster Employee Selection */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-cyan-300 mb-1.5">
                        1. Select Employee from Existing Team Roster ({teamList.length} Available) *
                      </label>
                      <select
                        value={selectedRosterMember?.id || ''}
                        onChange={(e) => {
                          const selected = teamList.find((m) => m.id === e.target.value);
                          if (selected) {
                            setSelectedRosterMember({
                              ...selected,
                              designation: selected.designation || selected.role || 'Specialist',
                              department: selected.category || selected.department || 'Engineering',
                              employee_id: selected.employee_id || `EMP-${String(selected.position || 1).padStart(3, '0')}`,
                              image_url: selected.image_url || selected.image || '/assets/executive.png',
                            });
                            setRosterSearchQuery(selected.name);
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0e15] border border-cyan-500/40 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="">-- Click to Select Employee (Prem, Sangita, Chandan, Madhushmita, etc.) --</option>
                        {teamList.map((m) => (
                          <option key={m.id} value={m.id} className="bg-slate-900 text-white py-1">
                            {m.name} — {m.designation || m.role || 'Specialist'} ({m.category || m.department || 'Engineering'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Or Type to Filter by Name, Employee ID, or Designation:
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          placeholder="Type to filter e.g. Chandan, Sangita, Prem, EMP-001..."
                          value={rosterSearchQuery}
                          onChange={(e) => {
                            const q = e.target.value;
                            setRosterSearchQuery(q);
                            handleSearchRoster(q);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                        />
                      </div>

                      {/* Instant Live Client-Side + API Search Filter Results */}
                      {rosterSearchQuery.trim().length > 0 && (
                        <div className="mt-1 max-h-52 overflow-y-auto rounded-2xl bg-[#090d16] border border-cyan-500/40 shadow-2xl z-50 divide-y divide-white/5 font-mono text-xs">
                          {teamList
                            .filter((m) => {
                              const q = rosterSearchQuery.toLowerCase();
                              return (
                                m.name.toLowerCase().includes(q) ||
                                (m.designation || m.role || '').toLowerCase().includes(q) ||
                                (m.category || m.department || '').toLowerCase().includes(q) ||
                                (m.email || '').toLowerCase().includes(q) ||
                                (m.employee_id || `EMP-${String(m.position || 1).padStart(3, '0')}`).toLowerCase().includes(q)
                              );
                            })
                            .map((m) => (
                              <div
                                key={m.id}
                                onClick={() => {
                                  setSelectedRosterMember({
                                    ...m,
                                    designation: m.designation || m.role || 'Specialist',
                                    department: m.category || m.department || 'Engineering',
                                    employee_id: m.employee_id || `EMP-${String(m.position || 1).padStart(3, '0')}`,
                                    image_url: m.image_url || m.image || '/assets/executive.png',
                                  });
                                  setRosterSearchQuery(m.name);
                                }}
                                className={`p-3 hover:bg-cyan-500/20 cursor-pointer flex items-center justify-between transition-all ${
                                  selectedRosterMember?.id === m.id ? 'bg-cyan-500/30 text-cyan-300 font-bold border-l-2 border-cyan-400' : 'text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={m.image_url || m.image || '/assets/executive.png'}
                                    alt={m.name}
                                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                                  />
                                  <div>
                                    <div className="text-xs font-bold text-white">{m.name}</div>
                                    <div className="text-[10px] text-slate-400">{m.designation || m.role} &bull; {m.category || m.department}</div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] font-mono text-cyan-400 block">
                                    {m.employee_id || `EMP-${String(m.position || 1).padStart(3, '0')}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto-Populated Read-Only Employee Card */}
                  {selectedRosterMember && (
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-4">
                      <img
                        src={selectedRosterMember.image_url}
                        alt={selectedRosterMember.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-400 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{selectedRosterMember.name}</div>
                        <div className="text-xs text-slate-300 truncate">
                          {selectedRosterMember.designation} &bull; <span className="text-cyan-400">{selectedRosterMember.department}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 pt-0.5">
                          ID: <strong className="text-white">{selectedRosterMember.employee_id}</strong> &bull; Email:{' '}
                          <strong className="text-white">{selectedRosterMember.email || 'N/A'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Portal Configuration Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">Portal Role Assignment *</label>
                      <select
                        value={grantRole}
                        onChange={(e) => setGrantRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="team_member">Team Member (/team-login)</option>
                        <option value="hr">HR Manager (/hr-login)</option>
                        <option value="project_manager">Project Manager (/team-login)</option>
                        <option value="marketing_lead">Marketing Lead (/team-login)</option>
                        <option value="tech_lead">Tech Lead (/team-login)</option>
                        <option value="ai_specialist">Data &amp; AI Specialist (/team-login)</option>
                        <option value="qa_lead">QA Lead (/team-login)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">Initial Default Password</label>
                      <input
                        type="text"
                        value={grantPassword}
                        onChange={(e) => setGrantPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grantEmailAccess}
                        onChange={(e) => setGrantEmailAccess(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400"
                      />
                      <span className="text-slate-300 font-bold">Grant Company Email Access (email_access=true)</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsRbacModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGrantingAccess || !selectedRosterMember}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      {isGrantingAccess ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <UserCheck className="w-4 h-4 text-black" />} Grant Access Credentials
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Active User Accounts Table */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> Active User Accounts &amp; Permissions Registry
                </h3>
                <div className="flex items-center gap-3">
                  <ExportButton
                    sectionId="users-rbac"
                    dataset={rbacUsers}
                    showToast={(msg, type) => addToast(msg, type)}
                  />
                  <button onClick={loadRbacUsers} className="text-cyan-400 hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh List
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-slate-400 uppercase">
                      <th className="py-3 px-4">Employee Member</th>
                      <th className="py-3 px-4">Designation &amp; Dept</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Email Permission</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rbacUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No portal user accounts created yet. Click 'Create Login Access' to assign credentials from Team Roster.
                        </td>
                      </tr>
                    ) : (
                      rbacUsers.map((user) => (
                        <tr key={user.team_member_id || user.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={user.image_url || '/assets/executive.png'}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover border border-cyan-400/40"
                              />
                              <div>
                                <div className="font-bold text-white text-xs">{user.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-xs text-white">{user.designation}</div>
                            <div className="text-[10px] text-cyan-400 font-mono">
                              {user.department} &bull; <span className="text-cyan-300 font-bold">{user.employee_id}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={user.role || 'team_member'}
                              onChange={(e) => handleUpdateUserRole(user, e.target.value)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border bg-black/80 cursor-pointer outline-none transition-all ${
                                user.role === 'marketing_lead' || user.role === 'marketing'
                                  ? 'text-pink-300 border-pink-500/50 bg-pink-500/20'
                                  : user.role === 'project_manager' || user.role === 'pm'
                                  ? 'text-amber-300 border-amber-500/50 bg-amber-500/20'
                                  : user.role === 'tech_lead'
                                  ? 'text-blue-300 border-blue-500/50 bg-blue-500/20'
                                  : user.role === 'ai_specialist'
                                  ? 'text-purple-300 border-purple-500/50 bg-purple-500/20'
                                  : user.role === 'hr'
                                  ? 'text-cyan-300 border-cyan-500/50 bg-cyan-500/20'
                                  : user.role === 'qa_lead'
                                  ? 'text-yellow-300 border-yellow-500/50 bg-yellow-500/20'
                                  : 'text-emerald-300 border-emerald-500/50 bg-emerald-500/20'
                              }`}
                              title="Click to upgrade/change role without altering password or personal data"
                            >
                              <option value="team_member" className="bg-slate-900 text-emerald-300">Team Member</option>
                              <option value="hr" className="bg-slate-900 text-cyan-300">HR Manager</option>
                              <option value="project_manager" className="bg-slate-900 text-amber-300">Project Manager</option>
                              <option value="marketing_lead" className="bg-slate-900 text-pink-300">Marketing Lead</option>
                              <option value="tech_lead" className="bg-slate-900 text-blue-300">Tech Lead</option>
                              <option value="ai_specialist" className="bg-slate-900 text-purple-300">Data &amp; AI Specialist</option>
                              <option value="qa_lead" className="bg-slate-900 text-yellow-300">QA Lead</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                user.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                            >
                              ● {user.status.toUpperCase()}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleEmailAccess(user)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                user.email_access
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-white/5 text-slate-400 border border-white/10'
                              }`}
                            >
                              {user.email_access ? '✓ Email Allowed' : '✕ No Email'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingUser(user)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                                title="Edit Role & Permissions"
                              >
                                <Edit className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => handleResetUserPassword(user.id, user.name)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                                title="Reset password to Team@123"
                              >
                                Reset Pass
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ userId: user.id, userName: user.name, teamMemberId: user.team_member_id })}
                                className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer transition-all"
                                title="Revoke login access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EDIT MEMBER ACCESS & PERMISSIONS MODAL */}
            {editingUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs">
                <div className="w-full max-w-md bg-[#0c0d12] border border-cyan-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <img src={editingUser.image_url || '/assets/executive.png'} alt={editingUser.name} className="w-9 h-9 rounded-full object-cover border border-cyan-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Edit Access: {editingUser.name}</h3>
                        <p className="text-[10px] text-slate-400">{editingUser.email} &bull; {editingUser.employee_id}</p>
                      </div>
                    </div>
                    <button onClick={() => setEditingUser(null)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Role Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300 block">Assigned Enterprise Role</label>
                      <select
                        value={editingUser.role || 'team_member'}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white font-bold outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="team_member" className="bg-slate-900 text-emerald-300">Team Member</option>
                        <option value="hr" className="bg-slate-900 text-cyan-300">HR Manager</option>
                        <option value="project_manager" className="bg-slate-900 text-amber-300">Project Manager</option>
                        <option value="marketing_lead" className="bg-slate-900 text-pink-300">Marketing Lead</option>
                        <option value="tech_lead" className="bg-slate-900 text-blue-300">Tech Lead</option>
                        <option value="ai_specialist" className="bg-slate-900 text-purple-300">Data &amp; AI Specialist</option>
                        <option value="qa_lead" className="bg-slate-900 text-yellow-300">QA Lead</option>
                      </select>
                    </div>

                    {/* Account Status */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300 block">Account Status</label>
                      <select
                        value={editingUser.status || 'active'}
                        onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white font-bold outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="active" className="bg-slate-900 text-emerald-300">ACTIVE (Login Allowed)</option>
                        <option value="disabled" className="bg-slate-900 text-red-400">DISABLED (Login Blocked)</option>
                      </select>
                    </div>

                    {/* Email Access Permission Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div>
                        <div className="font-bold text-white text-xs">Company Email Access</div>
                        <div className="text-[10px] text-slate-400">Allows sending emails from portal composer</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, email_access: !editingUser.email_access })}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                          editingUser.email_access ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {editingUser.email_access ? '✓ Granted' : '✕ Disabled'}
                      </button>
                    </div>

                    {/* Custom Allowed Sender Emails Input (Shown when email_access is enabled) */}
                    {editingUser.email_access && (
                      <div className="space-y-1.5 p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                        <label className="text-[11px] font-bold text-purple-300 block">Allowed Sender Email Aliases (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. hr@zenemoo.in, sangita@zenemoo.in"
                          value={editingUser.allowed_senders || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, allowed_senders: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-xs outline-none focus:border-purple-400 placeholder:text-slate-500"
                        />
                        <p className="text-[9.5px] text-slate-400">Assign specific company sender email addresses for this user to dispatch emails from.</p>
                      </div>
                    )}

                    <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-[10px] text-cyan-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span>Updates access permissions instantly. Passwords and personal roster details remain unchanged.</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await userManagementApi.updateUser(editingUser.id, {
                            role: editingUser.role,
                            status: editingUser.status,
                            email_access: editingUser.email_access,
                            allowed_senders: editingUser.allowed_senders || '',
                          });
                          if (res.data && res.data.success) {
                            showStatus(`Updated user access permissions for ${editingUser.name} successfully!`);
                            await loadRbacUsers();
                            setEditingUser(null);
                          }
                        } catch (err: any) {
                          alert('Failed to update user permissions.');
                        }
                      }}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-lg"
                    >
                      <Save className="w-4 h-4" /> Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Profile Updates Approval Queue */}
            {pendingApprovals.length > 0 && (
              <div className="glass-panel p-6 rounded-3xl border border-amber-500/40 space-y-4 bg-amber-500/5">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Pending Profile Update Requests ({pendingApprovals.length})
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">Review employee edits before publishing to live website</span>
                </div>

                <div className="space-y-3">
                  {pendingApprovals.map((req) => (
                    <div key={req.id} className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{req.employee_name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">{req.employee_id}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300">
                          Requested changes: {Object.keys(req.requested_changes || {}).join(', ')}
                        </div>
                        {req.requested_changes?.image_url && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] text-slate-400">New Profile Picture:</span>
                            <img src={req.requested_changes.image_url} alt="New Preview" className="w-8 h-8 rounded-full object-cover border border-cyan-400" />
                          </div>
                        )}
                        {req.requested_changes?.bio && (
                          <p className="text-xs text-slate-400 italic">"{req.requested_changes.bio}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveProfileUpdate(req.id, req.employee_name)}
                          className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-emerald-400" /> Approve &amp; Publish
                        </button>
                        <button
                          onClick={() => handleRejectProfileUpdate(req.id, req.employee_name)}
                          className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4 text-red-400" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: ENTERPRISE TEAM DIRECTORY */}
        {activeTab === 'directory' && (
          <EnterpriseTeamDirectory userRole="admin" showToast={(msg, type) => addToast(msg, type)} />
        )}

        {/* TAB: NOTIFICATION DISPATCHER */}
        {activeTab === 'notifications-admin' && (
          <div className="space-y-8 font-mono text-xs">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-cyan-400" /> Admin Notification Broadcast Dispatcher
                </h2>
                <p className="text-xs text-slate-400">
                  Send real-time individual or broadcast notifications directly to Team Member &amp; HR portals.
                </p>
              </div>

              <form onSubmit={handleDispatchNotification} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Notification Type</label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white"
                    >
                      <option value="info">Info (Blue)</option>
                      <option value="success">Success (Green)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="error">Error (Red)</option>
                      <option value="payment">Payment Released (Emerald)</option>
                      <option value="meeting">Meeting Today (Purple)</option>
                      <option value="project">New Project (Cyan)</option>
                      <option value="system">System (Slate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Target Audience</label>
                    <select
                      value={notifTargetType}
                      onChange={(e) => setNotifTargetType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white"
                    >
                      <option value="broadcast">Broadcast (All Users)</option>
                      <option value="role">Role Target (e.g. HR, Team Member)</option>
                      <option value="individual">Individual Specific User</option>
                    </select>
                  </div>

                  {notifTargetType === 'role' && (
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">Select Target Role</label>
                      <select
                        value={notifTargetRole}
                        onChange={(e) => setNotifTargetRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white"
                      >
                        <option value="team_member">Team Members</option>
                        <option value="hr">HR Members</option>
                      </select>
                    </div>
                  )}

                  {notifTargetType === 'individual' && (
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">Select Specific User</label>
                      <select
                        value={notifTargetUserId}
                        onChange={(e) => setNotifTargetUserId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white"
                      >
                        <option value="">Select User...</option>
                        {rbacUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Notification Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekly All-Hands Meeting Today at 4 PM"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Notification Message Body *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter detailed message contents..."
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isDispatchingNotif}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-bold flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {isDispatchingNotif ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Dispatch Notification Now
                </button>
              </form>
            </div>

            {/* Dispatched Notifications History Log (Live Database Fetch & Sync) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-cyan-400" /> Dispatched Notifications History
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                      ● Live DB Sync
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    Real-time database entries queried directly from the Supabase notifications table.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadAdminNotifications}
                  disabled={isLoadingAdminNotifs}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingAdminNotifs ? 'animate-spin' : ''}`} /> Refresh Database
                </button>
              </div>

              {/* Search & Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                {/* Search Input */}
                <div className="relative sm:col-span-1 lg:col-span-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search history by title, body, sender..."
                    value={adminNotifSearchQuery}
                    onChange={(e) => setAdminNotifSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <select
                    value={adminNotifTypeFilter}
                    onChange={(e) => setAdminNotifTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all" className="bg-[#090d16]">All Notification Types</option>
                    <option value="info" className="bg-[#090d16]">Info</option>
                    <option value="meeting" className="bg-[#090d16]">Meeting</option>
                    <option value="system" className="bg-[#090d16]">System</option>
                    <option value="warning" className="bg-[#090d16]">Warning</option>
                    <option value="error" className="bg-[#090d16]">Error</option>
                    <option value="success" className="bg-[#090d16]">Success</option>
                    <option value="project" className="bg-[#090d16]">Project</option>
                    <option value="payment" className="bg-[#090d16]">Payment</option>
                  </select>
                </div>

                {/* Target Audience Filter */}
                <div>
                  <select
                    value={adminNotifTargetFilter}
                    onChange={(e) => setAdminNotifTargetFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all" className="bg-[#090d16]">All Target Audiences</option>
                    <option value="broadcast" className="bg-[#090d16]">Broadcast (All Users)</option>
                    <option value="team_member" className="bg-[#090d16]">Team Member Portal</option>
                    <option value="hr" className="bg-[#090d16]">HR Portal</option>
                    <option value="individual" className="bg-[#090d16]">Individual User</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={adminNotifDateFilter}
                    onChange={(e) => setAdminNotifDateFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all" className="bg-[#090d16]">All Time</option>
                    <option value="today" className="bg-[#090d16]">Today</option>
                    <option value="yesterday" className="bg-[#090d16]">Yesterday</option>
                    <option value="last7days" className="bg-[#090d16]">Last 7 Days</option>
                    <option value="thismonth" className="bg-[#090d16]">This Month</option>
                  </select>
                </div>
              </div>

              {/* Error Alert Fallback */}
              {adminNotifFetchError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Failed to query notifications table: <strong>{adminNotifFetchError}</strong></span>
                  </div>
                  <button
                    onClick={loadAdminNotifications}
                    className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    Retry Fetch
                  </button>
                </div>
              )}

              {/* Skeleton Loading State */}
              {isLoadingAdminNotifs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse space-y-3">
                      <div className="h-4 bg-white/10 rounded w-1/3" />
                      <div className="h-3 bg-white/5 rounded w-2/3" />
                      <div className="h-3 bg-white/5 rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : (
                /* History Records List */
                <div className="space-y-3">
                  {(() => {
                    const filtered = adminNotifList.filter((n) => {
                      // 1. Search Query Filter
                      const q = adminNotifSearchQuery.trim().toLowerCase();
                      if (q) {
                        const titleMatch = (n.title || '').toLowerCase().includes(q);
                        const msgMatch = (n.message || '').toLowerCase().includes(q);
                        const senderMatch = (n.sender_email || '').toLowerCase().includes(q);
                        const typeMatch = (n.type || '').toLowerCase().includes(q);
                        const targetMatch = (n.target_type || '').toLowerCase().includes(q);
                        if (!titleMatch && !msgMatch && !senderMatch && !typeMatch && !targetMatch) return false;
                      }

                      // 2. Type Filter
                      if (adminNotifTypeFilter !== 'all' && (n.type || '').toLowerCase() !== adminNotifTypeFilter) {
                        return false;
                      }

                      // 3. Target Audience Filter
                      if (adminNotifTargetFilter !== 'all') {
                        const targetType = (n.target_type || 'broadcast').toLowerCase();
                        const targetRole = (n.target_role || '').toLowerCase();
                        if (adminNotifTargetFilter === 'broadcast' && targetType !== 'broadcast') return false;
                        if (adminNotifTargetFilter === 'individual' && targetType !== 'individual') return false;
                        if (adminNotifTargetFilter === 'team_member' && targetRole !== 'team_member') return false;
                        if (adminNotifTargetFilter === 'hr' && targetRole !== 'hr') return false;
                      }

                      // 4. Date Range Filter
                      if (adminNotifDateFilter !== 'all' && n.created_at) {
                        const notifDate = new Date(n.created_at);
                        const now = new Date();
                        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                        const notifTime = notifDate.getTime();

                        if (adminNotifDateFilter === 'today' && notifTime < todayStart) return false;
                        if (adminNotifDateFilter === 'yesterday') {
                          const yesterdayStart = todayStart - 86400000;
                          if (notifTime < yesterdayStart || notifTime >= todayStart) return false;
                        }
                        if (adminNotifDateFilter === 'last7days' && notifTime < todayStart - 7 * 86400000) return false;
                        if (adminNotifDateFilter === 'thismonth') {
                          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                          if (notifTime < monthStart) return false;
                        }
                      }

                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3 font-mono">
                          <Inbox className="w-10 h-10 text-slate-500 mx-auto" />
                          <h4 className="text-base font-bold text-white">No notifications have been dispatched yet</h4>
                          <p className="text-xs text-slate-400">
                            {adminNotifList.length === 0
                              ? 'Notifications dispatched via the form above will be logged here directly from the database.'
                              : 'No notification records match your current search and filter criteria.'}
                          </p>
                          {(adminNotifSearchQuery || adminNotifTypeFilter !== 'all' || adminNotifTargetFilter !== 'all' || adminNotifDateFilter !== 'all') && (
                            <button
                              onClick={() => {
                                setAdminNotifSearchQuery('');
                                setAdminNotifTypeFilter('all');
                                setAdminNotifTargetFilter('all');
                                setAdminNotifDateFilter('all');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer inline-block"
                            >
                              Reset Search &amp; Filters
                            </button>
                          )}
                        </div>
                      );
                    }

                    return filtered.map((n) => {
                      const typeLower = (n.type || 'info').toLowerCase();
                      const targetTypeLower = (n.target_type || 'broadcast').toLowerCase();
                      const isLongMsg = (n.message || '').length > 140;
                      const isExpanded = expandedNotifIds[n.id] || false;

                      // Type Badge Styling & Icon
                      let typeBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                      let TypeIcon = Info;
                      if (typeLower === 'meeting') {
                        typeBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                        TypeIcon = Clock;
                      } else if (typeLower === 'system') {
                        typeBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                        TypeIcon = Zap;
                      } else if (typeLower === 'warning') {
                        typeBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                        TypeIcon = AlertTriangle;
                      } else if (typeLower === 'error') {
                        typeBadgeClass = 'bg-red-500/20 text-red-300 border-red-500/40';
                        TypeIcon = XCircle;
                      } else if (typeLower === 'success') {
                        typeBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                        TypeIcon = CheckCircle2;
                      }

                      // Target Audience Badge
                      let targetLabel = 'BROADCAST (ALL USERS)';
                      let targetBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                      if (targetTypeLower === 'role') {
                        const roleStr = (n.target_role || 'team_member').toUpperCase();
                        targetLabel = `ROLE: ${roleStr}`;
                        targetBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
                      } else if (targetTypeLower === 'individual') {
                        targetLabel = `INDIVIDUAL: ${n.target_user_id || 'USER'}`;
                        targetBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                      }

                      // Relative Time String calculation
                      const timeStr = n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now';
                      let relTime = 'Just now';
                      if (n.created_at) {
                        const diffMs = Date.now() - new Date(n.created_at).getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        if (diffMins < 1) relTime = 'Just now';
                        else if (diffMins < 60) relTime = `${diffMins}m ago`;
                        else if (diffMins < 1440) relTime = `${Math.floor(diffMins / 60)}h ago`;
                        else relTime = `${Math.floor(diffMins / 1440)}d ago`;
                      }

                      return (
                        <div
                          key={n.id}
                          className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 hover:border-cyan-500/30 transition-all font-mono text-xs relative overflow-hidden"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${typeBadgeClass}`}>
                                  <TypeIcon className="w-3 h-3" /> {n.type || 'INFO'}
                                </span>

                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${targetBadgeClass}`}>
                                  {targetLabel}
                                </span>

                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                  ✓ DISPATCHED
                                </span>

                                {n.read_count !== undefined && n.read_count > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-bold">
                                    👁 Read by {n.read_count} user(s)
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm font-bold text-white font-display pt-0.5">{n.title}</h4>
                            </div>

                            {/* Delete Action Button */}
                            <button
                              onClick={() => handleDeleteAdminNotif(n.id, n.title)}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer transition-all shrink-0"
                              title="Delete notification record from database"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Message Body Content */}
                          <div className="text-slate-300 font-sans text-xs bg-white/[0.02] p-3.5 rounded-xl border border-white/5 leading-relaxed">
                            <p className={!isExpanded && isLongMsg ? 'line-clamp-2' : ''}>{n.message}</p>
                            {isLongMsg && (
                              <button
                                type="button"
                                onClick={() => setExpandedNotifIds((prev) => ({ ...prev, [n.id]: !isExpanded }))}
                                className="text-cyan-400 hover:underline font-mono text-[11px] font-bold pt-1.5 block cursor-pointer"
                              >
                                {isExpanded ? 'Show Less ▲' : 'Read Full Message ▼'}
                              </button>
                            )}
                          </div>

                          {/* Card Footer Meta Info */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                            <div className="flex items-center gap-2">
                              <span>Sender: <strong className="text-slate-200">{n.sender_email || 'Administrator'}</strong></span>
                              <span>&bull;</span>
                              <span>ID: <code className="text-cyan-400">{n.id}</code></span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 font-bold">{relTime}</span>
                              <span>({timeStr})</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: TEAM MEMBERS MANAGEMENT WITH AUTOMATIC REORDERING ENGINE */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            {/* Top Bar: Stats Metrics & Add Team Member */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Current Team Members</span>
                  <span className="text-3xl font-extrabold text-white block">{teamList.length}</span>
                  <span className="text-[10px] font-mono text-cyan-400 block">Ordered 1..{teamList.length} (0 Gaps)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Next Available Position</span>
                  <span className="text-3xl font-extrabold text-white block">#{teamList.length + 1}</span>
                  <span className="text-[10px] font-mono text-purple-400 block">Auto-assigned on new upload</span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <PlusCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Sequential Engine</span>
                  <span className="text-sm font-bold text-white block font-mono">1..N Auto-Shift Active</span>
                  <span className="text-[10px] font-mono text-emerald-400 block">Positions reordered instantly</span>
                </div>
                <button
                  onClick={handleCreateMember}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Member
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

                <ExportButton
                  sectionId="team-roster"
                  dataset={teamList}
                  filteredDataset={filteredTeam}
                  showToast={(msg, type) => addToast(msg, type)}
                />

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
                        placeholder="+91 9827775230"
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
              <div className="modern-dashboard-card p-16 text-center space-y-4 max-w-lg mx-auto border-dashed border-2 border-white/5">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                  <Users className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">No Team Members Found</h4>
                  <p className="text-xs font-mono text-slate-400">
                    {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                      ? 'No team members match your active filter criteria. Try resetting the filters.'
                      : 'Click "Add Member" above to create your first executive team profile.'}
                  </p>
                </div>
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
                      {/* Top Bar: Position Dropdown & Status Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {/* Up / Down Arrow Quick Action Buttons */}
                          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                            <button
                              onClick={() => handleMoveUp(m)}
                              disabled={m.position <= 1}
                              className="p-1 rounded-lg hover:bg-cyan-500/20 text-cyan-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                              title="Move Up 1 Position"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(m)}
                              disabled={m.position >= teamList.length}
                              className="p-1 rounded-lg hover:bg-cyan-500/20 text-cyan-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                              title="Move Down 1 Position"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bulletproof Position Dropdown Selector */}
                        <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Pos:</span>
                          <select
                            value={m.position}
                            onChange={(e) => handlePositionChange(m, e.target.value)}
                            className="bg-transparent text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer"
                            title="Select target position to move member"
                          >
                            {teamList.map((_, idx) => (
                              <option key={idx + 1} value={idx + 1} className="bg-[#0b0c14] text-white">
                                #{idx + 1}
                              </option>
                            ))}
                          </select>
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

        {/* TAB: ZENEMOO AI DATA TALENT NETWORK */}
        {activeTab === 'talent-network' && (
          <AdminTalentNetworkTab />
        )}

        {/* TAB: ENTERPRISE PARTNERS MANAGEMENT */}
        {activeTab === 'partners' && (
          <div className="space-y-8">
            {/* Stats Metrics & Add Partner Button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Enterprise Partners</span>
                  <span className="text-3xl font-extrabold text-white block">{partnersList.length}</span>
                  <span className="text-[10px] font-mono text-emerald-400 block">Active Marquee Slider</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Handshake className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Next Available Position</span>
                  <span className="text-3xl font-extrabold text-white block">#{partnersList.length + 1}</span>
                  <span className="text-[10px] font-mono text-cyan-400 block">Auto-assigned on creation</span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <PlusCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Cloudinary CDN Folder</span>
                  <span className="text-sm font-bold text-white block font-mono">zenemoo/partners</span>
                  <span className="text-[10px] font-mono text-purple-400 block">Logo image uploads active</span>
                </div>
                <button
                  onClick={handleCreatePartner}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Partner
                </button>
              </div>
            </div>

            {/* Editing Partner Modal Form */}
            {editingPartner && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 space-y-6 bg-black/90">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h4 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-emerald-400" />
                    {editingPartner.id && !editingPartner.id.startsWith('temp_')
                      ? 'Edit Partner Company'
                      : `Add New Partner Company (Position #${partnersList.length + 1})`}
                  </h4>
                  <button onClick={() => setEditingPartner(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePartner} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Company Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., DesiCrew Solutions, Karya AI, Disha AI"
                        value={editingPartner.name}
                        onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Category / Role *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Certified Vendor Partner (1.5+ Yrs)"
                        value={editingPartner.role || ''}
                        onChange={(e) => setEditingPartner({ ...editingPartner, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Badge Tag</label>
                      <select
                        value={editingPartner.badge || 'AI Partner'}
                        onChange={(e) => setEditingPartner({ ...editingPartner, badge: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      >
                        <option value="Primary Partner">Primary Partner</option>
                        <option value="AI Partner">AI Partner</option>
                        <option value="Data Partner">Data Partner</option>
                        <option value="Speech Tech">Speech Tech</option>
                        <option value="NLP Framework">NLP Framework</option>
                        <option value="Indic AI">Indic AI</option>
                        <option value="Research Data">Research Data</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Website Link (URL)</label>
                      <input
                        type="url"
                        placeholder="https://www.desicrew.in"
                        value={editingPartner.website_url || ''}
                        onChange={(e) => setEditingPartner({ ...editingPartner, website_url: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Status</label>
                      <select
                        value={editingPartner.status || 'active'}
                        onChange={(e) => setEditingPartner({ ...editingPartner, status: e.target.value as any })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      >
                        <option value="active">Active (Visible in Marquee)</option>
                        <option value="inactive">Inactive (Hidden)</option>
                      </select>
                    </div>
                  </div>

                  {/* Cloudinary Logo Uploader */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <label className="block text-xs font-mono text-emerald-300 font-bold flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Cloudinary Logo Uploader (Folder: zenemoo/partners)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 p-2 overflow-hidden shrink-0 flex items-center justify-center">
                        {editingPartner.image_url ? (
                          <img src={editingPartner.image_url} alt="Logo Preview" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-[10px] text-slate-500 font-mono text-center">No Logo</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="url"
                          placeholder="https://res.cloudinary.com/rwoe0mm9/image/upload/zenemoo/partners/..."
                          value={editingPartner.image_url || ''}
                          onChange={(e) => setEditingPartner({ ...editingPartner, image_url: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                        />
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            {isPartnerUploading ? 'Uploading to Cloudinary...' : 'Upload Logo File'}
                            <input type="file" accept="image/*" onChange={handlePartnerLogoUpload} className="hidden" />
                          </label>
                          <span className="text-[10px] font-mono text-slate-500">Supports PNG, SVG, JPG, WebP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingPartner(null)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      Save Partner Company
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Partners Cards Grid */}
            {partnersList.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Handshake className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Partner Companies Added Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Click "Add Partner Company" above to add partner records. They will appear live in the website marquee slider once created.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {partnersList.map((p) => (
                <div
                  key={p.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                    p.status === 'inactive' ? 'border-amber-500/30 opacity-60' : 'border-white/10 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Position Selector & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">Position:</span>
                        <select
                          value={p.position}
                          onChange={(e) => handlePartnerPositionChange(p, e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                        >
                          {partnersList.map((_, idx) => (
                            <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                              #{idx + 1}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            disabled={p.position === 1}
                            onClick={() => handlePartnerPositionChange(p, String(p.position - 1))}
                            className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 text-slate-300 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            disabled={p.position === partnersList.length}
                            onClick={() => handlePartnerPositionChange(p, String(p.position + 1))}
                            className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 text-slate-300 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          p.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    {/* Logo & Company Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 p-1.5 shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                        ) : (
                          <Globe className="w-6 h-6 text-emerald-400" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-base text-white">{p.name}</div>
                        {p.badge && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      {p.role || 'Language Data & AI Partner'}
                    </p>

                    {p.website_url && (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:underline"
                      >
                        {p.website_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingPartner(p)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeletePartner(p.id, p.name)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                      title="Delete Partner Company"
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

        {/* TAB 1.5: PROGRAM OPPORTUNITIES MANAGEMENT */}
        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Program Opportunities</span>
                  <span className="text-3xl font-extrabold text-white block">{opportunitiesList.length}</span>
                  <span className="text-[10px] font-mono text-cyan-400 block">Manage live listings</span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Active Open Programs</span>
                  <span className="text-3xl font-extrabold text-white block">
                    {opportunitiesList.filter(o => o.status === 'active').length}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 block">Accepting candidate applications</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckSquare className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Next Position Assign</span>
                  <span className="text-sm font-bold text-white block font-mono">#{opportunitiesList.length + 1}</span>
                  <span className="text-[10px] font-mono text-purple-400 block">Sequential order auto-reordering</span>
                </div>
                <button
                  onClick={handleCreateOpportunity}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Program
                </button>
              </div>
            </div>

            {/* Opportunities List Cards */}
            {opportunitiesList.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Briefcase className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Program Opportunities Created Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Click "Add Program Opportunity" above to create program listings. They will appear live on the Opportunities Portal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {opportunitiesList.map((op) => (
                  <div
                    key={op.id}
                    className={`glass-panel p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                      op.status === 'stopped'
                        ? 'border-red-500/30 opacity-75'
                        : op.status === 'coming_soon'
                        ? 'border-amber-500/30'
                        : 'border-white/10 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header Controls */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">Position:</span>
                          <select
                            value={op.position}
                            onChange={(e) => handleOpportunityPositionChange(op, e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                          >
                            {opportunitiesList.map((_, idx) => (
                              <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                                #{idx + 1}
                              </option>
                            ))}
                          </select>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
                            op.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : op.status === 'stopped'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {op.status}
                        </span>
                      </div>

                      {/* Title & Partner */}
                      <div className="flex items-start gap-3">
                        {op.poster_url ? (
                          <img
                            src={op.poster_url}
                            alt={op.title}
                            className="w-12 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 shrink-0">
                            <Briefcase className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-base text-white">{op.title}</h4>
                          <div className="text-xs font-mono text-cyan-400 mt-0.5">{op.partner_name}</div>
                          {op.badge && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                              {op.badge}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 leading-relaxed">
                        {op.description}
                      </p>

                      {/* Features Highlights */}
                      {op.features && op.features.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono uppercase text-slate-400">Highlights</div>
                          <div className="flex flex-wrap gap-1">
                            {op.features.map((f, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                                • {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedOppForApps(op)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer font-bold"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Applications (
                        {allCandidateApps.filter((a) => a.opportunity_id === op.id).length})
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditOpportunityClick(op)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOpportunity(op.id, op.title)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                          title="Delete Opportunity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONTACT INQUIRIES FROM WEBSITE FORM */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Inquiries</span>
                  <span className="text-3xl font-extrabold text-white block">{inquiries.length}</span>
                  <span className="text-[10px] font-mono text-blue-400 block">Total from contact form</span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Mail className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Unread Submissions</span>
                  <span className="text-3xl font-extrabold text-white block">
                    {inquiries.filter(i => i.status !== 'read').length}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 block">Require review/responses</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Database Storage Status</span>
                  <span className="text-sm font-bold text-white block font-mono">Supabase "contacts"</span>
                  <span className="text-[10px] font-mono text-emerald-400 block">Connection Active</span>
                </div>
                <button
                  onClick={handleRefreshInquiries}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-white/10 pb-3 pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <MessageSquare className="w-4 h-4 text-cyan-400" /> Contact Inquiries Registry ({inquiries.length})
              </h3>
              <ExportButton
                sectionId="contact-inquiries"
                dataset={inquiries}
                showToast={(msg, type) => addToast(msg, type)}
              />
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
                {inquiries.map((inq) => {
                  const code =
                    inq.inquiry_code ||
                    (inq as any).inquiry_id ||
                    (inq as any).code ||
                    `ZNM-${inq.id.substring(0, 6).toUpperCase()}`;
                  const lang = inq.language || (inq as any).lang || (inq as any).languages || 'Hindi';
                  const serviceName = inq.service || 'Data Solutions';

                  const replySubject = `[Zenemoo Inquiry #${code}] Response regarding ${serviceName}`;
                  const replyBody = `Dear ${inq.name},\n\nThank you for contacting Zenemoo Data Solutions regarding your project inquiry.\n\n- Inquiry Reference Code: ${code}\n- Requested Service: ${serviceName}\n- Target Language(s): ${lang}\n- Your Message: "${inq.message}"\n\nOur operations and lead engineering team has reviewed your specifications. We are pleased to confirm team capacity for your project.\n\nPlease let us know if you have additional audio/data files or benchmark instructions.\n\nBest regards,\nPrem Prasad Pradhan\nFounder & Vendor Manager | Zenemoo Tech Team\nEmail: prem@zenemoo.in | contact@zenemoo.in\nWebsite: https://www.zenemoo.in`;

                  return (
                    <div
                      key={inq.id}
                      className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 relative flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top Header: Client Name, Ticket Code, Status Toggle & Delete */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-base text-white">{inq.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                                Ticket: #{code}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Clickable Read/Unread Status Toggle Badge */}
                            <button
                              onClick={async () => {
                                const newStatus = inq.status === 'read' ? 'unread' : 'read';
                                setInquiries(
                                  inquiries.map((i) => (i.id === inq.id ? { ...i, status: newStatus } : i))
                                );
                                const updated = await updateContactInquiry(inq.id, { status: newStatus });
                                if (updated) {
                                  showStatus(`Marked inquiry #${code} as ${newStatus.toUpperCase()}`);
                                }
                              }}
                              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                                inq.status === 'read'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              }`}
                              title="Click to toggle Read / Unread status"
                            >
                              {inq.status === 'read' ? '✓ READ' : '● UNREAD'}
                            </button>

                            <button
                              onClick={() => {
                                showConfirm(
                                  'Delete Contact Inquiry',
                                  `Are you sure you want to delete contact inquiry #${code} from "${inq.name}"? This action cannot be undone.`,
                                  async () => {
                                    setInquiries((prev) => prev.filter((i) => i.id !== inq.id));
                                    try {
                                      await contactApi.delete(inq.id);
                                    } catch (e) {}
                                    showStatus('Inquiry deleted from database!');
                                  },
                                  { confirmText: 'Yes, Delete Inquiry', intent: 'danger' }
                                );
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                              title="Delete Inquiry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Contact Info: Email, Phone, Company */}
                        <div className="space-y-1 text-xs font-mono text-slate-300">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-cyan-400" />
                            <a href={`mailto:${inq.email}`} className="hover:underline text-cyan-300">
                              {inq.email}
                            </a>
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

                        {/* Service & Language Badges */}
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-cyan-300">
                          <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1">
                            <span className="text-slate-400">Service:</span>{' '}
                            <strong className="text-white">{serviceName}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-1">
                            <span className="text-slate-400">Lang:</span>{' '}
                            <strong className="text-cyan-300">{lang}</strong>
                          </span>
                        </div>

                        {/* Message Box */}
                        <p className="text-xs text-slate-300 bg-black/40 p-3.5 rounded-xl border border-white/5 italic font-sans leading-relaxed">
                          "{inq.message}"
                        </p>

                        {/* Internal Admin Notes Section */}
                        <div className="space-y-2 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="flex items-center gap-1.5 font-bold text-slate-300">
                              <FileText className="w-3.5 h-3.5 text-purple-400" /> Internal Admin Notes
                            </span>
                            {editingNotesId === inq.id ? (
                              <button
                                onClick={async () => {
                                  setInquiries(
                                    inquiries.map((i) => (i.id === inq.id ? { ...i, notes: tempNoteText } : i))
                                  );
                                  await updateContactInquiry(inq.id, { notes: tempNoteText });
                                  showStatus(`Saved internal note for inquiry #${code}`);
                                  setEditingNotesId(null);
                                }}
                                className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[10px] font-bold cursor-pointer transition-all"
                              >
                                Save Note
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingNotesId(inq.id);
                                  setTempNoteText(inq.notes || '');
                                }}
                                className="text-cyan-400 hover:underline text-[10px] font-mono cursor-pointer"
                              >
                                {inq.notes ? 'Edit Note' : '+ Add Note'}
                              </button>
                            )}
                          </div>

                          {editingNotesId === inq.id ? (
                            <textarea
                              rows={2}
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Type internal notes (e.g., Spoke on phone 28th July, quote sent for 50 hrs audio)..."
                              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-purple-500/40 text-white text-xs font-sans focus:outline-none focus:border-cyan-400"
                            />
                          ) : inq.notes ? (
                            <div className="text-xs font-sans text-purple-200 bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/20">
                              {inq.notes}
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-500 italic">No internal admin notes yet.</div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer: Reply Email Button & Received Timestamp */}
                      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs mt-3">
                        <a
                          href={`mailto:${inq.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(
                            replyBody
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md group cursor-pointer"
                          title="Click to open email client with pre-filled subject, inquiry code, and response template"
                        >
                          <Mail className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                          Reply via Pre-defined Email
                        </a>

                        <div className="text-[10px] font-mono text-slate-500 text-right shrink-0">
                          Received: {new Date(inq.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NEWSLETTER SUBSCRIBERS */}
        {activeTab === 'subscribers' && (() => {
          const activeSubscribersList = subscribers.filter((s) => s.status !== 'unsubscribed');
          const unsubscribedSubscribersList = subscribers.filter((s) => s.status === 'unsubscribed');
          const filteredSubscribersList = subscribers.filter((s) => {
            // Status filter check
            if (subStatusFilter === 'active' && s.status === 'unsubscribed') return false;
            if (subStatusFilter === 'unsubscribed' && s.status !== 'unsubscribed') return false;

            // Search input query check
            const query = (appliedSubSearch || searchQuery || '').trim().toLowerCase();
            if (!query) return true;
            return (s.email || '').toLowerCase().includes(query) || (s.status || '').toLowerCase().includes(query);
          });

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="modern-dashboard-card p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Subscribers</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white block">{subscribers.length}</span>
                      <span className="text-xs font-mono text-slate-400">Total</span>
                    </div>
                    <div className="text-[11px] font-mono flex items-center gap-2 pt-0.5">
                      <span className="text-emerald-400 font-bold">Active: {activeSubscribersList.length}</span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-rose-400 font-bold">Unsubscribed: {unsubscribedSubscribersList.length}</span>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                <div className="modern-dashboard-card p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Database Storage Status</span>
                    <span className="text-sm font-bold text-white block font-mono">Supabase "subscribers"</span>
                    <span className="text-[10px] font-mono text-emerald-400 block">Real-time connection active</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Cloud className="w-5 h-5" />
                  </div>
                </div>

                <div className="modern-dashboard-card p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Quick Refresh Actions</span>
                    <span className="text-sm font-bold text-white block font-mono">Supabase Sync</span>
                    <span className="text-[10px] font-mono text-purple-400 block">Pull live submissions</span>
                  </div>
                  <button
                    onClick={loadSubscribers}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh
                  </button>
                </div>
              </div>

              {/* Add New Subscriber Header Bar */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold font-display text-white">Add New Newsletter Subscriber</h4>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">Manual subscriber enrollment &amp; data export</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeSubscribersList || activeSubscribersList.length === 0) {
                          addToast('No active subscriber emails available to copy.', 'warning');
                          return;
                        }
                        const emailList = activeSubscribersList.map((s) => s.email).filter(Boolean).join(', ');
                        navigator.clipboard.writeText(emailList).then(() => {
                          addToast(`Copied ${activeSubscribersList.length} active subscriber email(s) to clipboard!`, 'success');
                        }).catch(() => {
                          addToast('Failed to copy emails to clipboard.', 'error');
                        });
                      }}
                      disabled={activeSubscribersList.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Copy active subscriber emails to clipboard (comma-separated for emailing)"
                    >
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>Copy Active Emails ({activeSubscribersList.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsUnsubscribeLogOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
                      title="View unsubscribed users log"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Unsubscribe Log ({unsubscribedSubscribersList.length})</span>
                    </button>

                    <ExportButton
                      sectionId="newsletter"
                      dataset={subscribers}
                      showToast={(msg, type) => addToast(msg, type)}
                    />
                  </div>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newSubEmail || !newSubEmail.trim()) return;
                    setSubBatchResult(null);
                    try {
                      const res = await subscriberApi.subscribe(newSubEmail);
                      const resData = res.data;
                      if (resData.summary) {
                        setSubBatchResult(resData.summary);
                        if (resData.summary.addedCount > 0) {
                          addToast(`Enrolled/reactivated ${resData.summary.addedCount} subscriber(s)!`, 'success');
                        }
                        if (resData.summary.skippedCount > 0) {
                          addToast(`${resData.summary.skippedCount} email(s) were already active in your database and skipped.`, 'warning');
                        }
                      } else {
                        addToast(resData.message || 'Subscriber processed successfully', 'success');
                      }
                      setNewSubEmail('');
                      await loadSubscribers();
                    } catch (err: any) {
                      const errSummary = err.response?.data?.summary;
                      if (errSummary) {
                        setSubBatchResult(errSummary);
                      }
                      addToast(err.response?.data?.message || 'Error processing subscriber emails', 'error');
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        Paste Email Address(es) (Single or Bulk / Copy-Pasted):
                      </label>
                      {(() => {
                        if (!newSubEmail) return null;
                        const rawTokens = newSubEmail.split(/[,\s\n\r;]+/);
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        const set = new Set<string>();
                        for (let t of rawTokens) {
                          const clean = t.trim().toLowerCase().replace(/^["'<\(\[]+|["'>\)\],.]+$/g, '').trim();
                          if (clean && emailRegex.test(clean)) {
                            set.add(clean);
                          }
                        }
                        return set.size > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                            ⚡ {set.size} Valid Email{set.size > 1 ? 's' : ''} Detected
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Paste single or multiple email addresses separated by commas, spaces, or line breaks (e.g. user1@company.com, user2@company.com)..."
                      value={newSubEmail}
                      onChange={(e) => setNewSubEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 placeholder-slate-500 transition-all resize-y min-h-[85px]"
                    ></textarea>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      💡 Supports multi-line copy-paste from Excel/Notepad or comma-separated lists. Unsubscribed emails will be safely reactivated.
                    </span>
                    <div className="flex items-center gap-2">
                      {newSubEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewSubEmail('');
                            setSubBatchResult(null);
                          }}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-mono text-xs transition-all cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!newSubEmail.trim()}
                        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Subscriber(s)
                      </button>
                    </div>
                  </div>
                </form>

                {/* Batch Processing Result Breakdown Card */}
                {subBatchResult && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 font-mono text-xs animate-fade-in mt-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Batch Processing Summary
                      </span>
                      <button
                        type="button"
                        onClick={() => setSubBatchResult(null)}
                        className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                      >
                        ✕ Close Summary
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <div className="text-[10px] text-emerald-300/80 uppercase font-bold">New / Reactivated Emails</div>
                        <div className="text-lg font-black">{subBatchResult.addedCount}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <div className="text-[10px] text-amber-300/80 uppercase font-bold">Already Active (Skipped)</div>
                        <div className="text-lg font-black">{subBatchResult.skippedCount}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        <div className="text-[10px] text-rose-300/80 uppercase font-bold">Invalid Format (Skipped)</div>
                        <div className="text-lg font-black">{subBatchResult.invalidCount}</div>
                      </div>
                    </div>

                    {subBatchResult.skippedEmails && subBatchResult.skippedEmails.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1">
                        <div className="text-amber-300 font-bold text-[11px]">
                          ⚠️ Already Active in Database ({subBatchResult.skippedEmails.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {subBatchResult.skippedEmails.map((email) => (
                            <span key={email} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px]">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {subBatchResult.addedEmails && subBatchResult.addedEmails.length > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                        <div className="text-emerald-400 font-bold text-[11px]">
                          ✅ Successfully Enrolled / Reactivated ({subBatchResult.addedEmails.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {subBatchResult.addedEmails.map((email) => (
                            <span key={email} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px]">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {subBatchResult.invalidEmails && subBatchResult.invalidEmails.length > 0 && (
                      <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-1">
                        <div className="text-rose-400 font-bold text-[11px]">
                          🚫 Invalid Email Format ({subBatchResult.invalidEmails.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {subBatchResult.invalidEmails.map((email) => (
                            <span key={email} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[11px]">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

              {/* Unsubscribe Log Drawer Modal */}
              {isUnsubscribeLogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
                  <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-rose-500/40 max-w-2xl w-full relative space-y-5 bg-[#090d16]/95 text-slate-200 shadow-2xl shadow-rose-950/40">
                    <button
                      onClick={() => setIsUnsubscribeLogOpen(false)}
                      className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                      title="Close Log"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold font-display text-white">UNSUBSCRIBE LOG</h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          Total Unsubscribed: <strong className="text-rose-400">{unsubscribedSubscribersList.length}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter unsubscribed email log..."
                        value={unsubLogSearch}
                        onChange={(e) => setUnsubLogSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs">
                      {unsubscribedSubscribersList.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 space-y-1">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                          <div>No unsubscribed users recorded.</div>
                          <div className="text-[10px] text-slate-500">All subscribers are currently active!</div>
                        </div>
                      ) : (
                        unsubscribedSubscribersList
                          .filter((u) => (u.email || '').toLowerCase().includes(unsubLogSearch.toLowerCase().trim()))
                          .map((u) => (
                            <div key={u.id} className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-white text-xs">{u.email}</div>
                                <div className="text-[11px] text-rose-300/80 mt-0.5">
                                  Unsubscribed: {u.unsubscribed_at ? `${new Date(u.unsubscribed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}, ${new Date(u.unsubscribed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : new Date(u.subscribed_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                  🔴 UNSUBSCRIBED
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(u.email);
                                    addToast(`Copied ${u.email} to clipboard!`, 'success');
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                                  title="Copy Email"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/10 flex justify-end">
                      <button
                        onClick={() => setIsUnsubscribeLogOpen(false)}
                        className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer"
                      >
                        Close Log
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dedicated Subscriber Search & Status Filter Control Bar */}
              <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Status Filter Badges */}
                  <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto pb-1 md:pb-0">
                    <button
                      type="button"
                      onClick={() => setSubStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold shrink-0 ${
                        subStatusFilter === 'all'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-md shadow-cyan-500/10'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      All ({subscribers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubStatusFilter('active')}
                      className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold shrink-0 ${
                        subStatusFilter === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Active ({activeSubscribersList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubStatusFilter('unsubscribed')}
                      className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold shrink-0 ${
                        subStatusFilter === 'unsubscribed'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-md shadow-rose-500/10'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Unsubscribed ({unsubscribedSubscribersList.length})
                    </button>
                  </div>

                  {/* Search Form with Search Button */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setAppliedSubSearch(subSearchInput.trim());
                    }}
                    className="flex items-center gap-2 w-full md:w-auto"
                  >
                    <div className="relative flex-1 md:w-80">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search subscriber email address..."
                        value={subSearchInput}
                        onChange={(e) => setSubSearchInput(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 placeholder-slate-500 transition-all"
                      />
                      {subSearchInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setSubSearchInput('');
                            setAppliedSubSearch('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-md shadow-cyan-500/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                  </form>
                </div>

                {/* Active Filters Summary Indicator */}
                {(appliedSubSearch || subStatusFilter !== 'all') && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] font-mono text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Filtering by:</span>
                      {appliedSubSearch && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                          Email: "{appliedSubSearch}"
                        </span>
                      )}
                      {subStatusFilter !== 'all' && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold uppercase">
                          Status: {subStatusFilter}
                        </span>
                      )}
                      <span className="text-slate-400">({filteredSubscribersList.length} matching)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubSearchInput('');
                        setAppliedSubSearch('');
                        setSubStatusFilter('all');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer font-bold"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Subscriber List Grid */}
              {filteredSubscribersList.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                  <Sparkles className="w-10 h-10 text-slate-500 mx-auto" />
                  <h4 className="text-base font-bold text-white">No Matching Subscribers Found</h4>
                  <p className="text-xs font-mono text-slate-400">
                    Subscribers joining via website form or manual entry will be listed here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubscribersList.map((sub) => {
                    const isUnsub = sub.status === 'unsubscribed';
                    return (
                      <div
                        key={sub.id}
                        className={`glass-panel p-4 rounded-2xl transition-all flex items-center justify-between gap-3 relative overflow-hidden ${
                          isUnsub
                            ? 'border border-rose-500/40 bg-rose-950/10 shadow-lg shadow-rose-950/20'
                            : 'border border-white/10 hover:border-cyan-500/30'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="font-mono text-xs text-white font-bold truncate">
                            {sub.email}
                          </div>

                          {isUnsub ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                🔴 UNSUBSCRIBED
                              </div>
                              <div className="text-[10px] font-mono text-rose-300/80">
                                Unsubscribed: {sub.unsubscribed_at ? `${new Date(sub.unsubscribed_at).toLocaleDateString()} • ${new Date(sub.unsubscribed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : new Date(sub.subscribed_at).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-400">
                              Subscribed: {new Date(sub.subscribed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1.5 shrink-0 z-10">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(sub.email);
                              addToast(`Copied ${sub.email} to clipboard!`, 'success');
                            }}
                            className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border border-white/10 cursor-pointer transition-colors"
                            title="Copy Email Address"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingSub({ id: sub.id, email: sub.email })}
                            className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 cursor-pointer transition-colors"
                            title="Edit Subscriber"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              showConfirm(
                                'Delete Newsletter Subscriber',
                                `Are you sure you want to remove subscriber "${sub.email}"?`,
                                async () => {
                                  setSubscribers((prev) => prev.filter((s) => s.id !== sub.id));
                                  try {
                                    await subscriberApi.delete(sub.id);
                                  } catch (e) {}
                                  showStatus('Subscriber deleted!');
                                },
                                { confirmText: 'Yes, Remove Subscriber', intent: 'danger' }
                              );
                            }}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer transition-colors"
                            title="Delete Subscriber"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3.55: REVIEWS MANAGEMENT */}
        {activeTab === 'reviews' && (
          <AdminReviewsTab onAddToast={addToast} />
        )}

        {/* TAB 3.6: ENTERPRISE SUPPORT TICKETS MANAGEMENT */}
        {activeTab === 'support-tickets' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-cyan-400" /> Enterprise Support Tickets Registry
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Internal helpdesk support tickets dispatched from HR, Team Member, and Guest portals.
                </p>
              </div>
              <button
                onClick={loadSupportTickets}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <RefreshCw className="w-4 h-4" /> Refresh Tickets ({supportTickets.length})
              </button>
            </div>

            {supportTickets.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3 font-mono">
                <LifeBuoy className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Support Tickets Logged Yet</h4>
                <p className="text-xs text-slate-400">
                  Tickets submitted via the Support Portal footer helpdesk will be stored and alerted here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 font-mono">
                {supportTickets.map((t, idx) => (
                  <div
                    key={t.ticket_id || t.id || idx}
                    className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-xs">
                          🎫 {t.ticket_id || t.id}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase">
                          {t.category || 'Technical Issue'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {new Date(t.created_at || t.createdAt || Date.now()).toLocaleString()}
                        </span>
                        <select
                          value={t.status || 'Open'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              await supportApi.updateStatus(t.ticket_id || t.id, newStatus);
                              await loadSupportTickets();
                              showStatus(`Updated ticket ${t.ticket_id || t.id} status to ${newStatus}`);
                            } catch (err) {}
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          <option value="Open" className="bg-[#090d16] text-amber-300">● Open</option>
                          <option value="In Progress" className="bg-[#090d16] text-cyan-300">● In Progress</option>
                          <option value="Resolved" className="bg-[#090d16] text-emerald-300">● Resolved</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-400">
                        Submitted by: <strong className="text-white">{t.user_name || 'Staff Member'}</strong> (<span className="text-cyan-300">{t.user_email}</span>)
                      </div>
                      <div className="font-bold text-white text-sm tracking-wide pt-1">{t.subject}</div>
                      <div className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                        {t.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3.5: REAL-TIME BREVO SMTP EMAIL DISPATCHER & ENCRYPTED SUPABASE HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Top Cards: Email Engine Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Dispatched Emails</span>
                  <span className="text-3xl font-extrabold text-white block">{emailLogs.length}</span>
                  <span className="text-[10px] font-mono text-cyan-400 block">End-to-End Encrypted Logs</span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Send className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">SMTP Relay Gateway</span>
                  <span className="text-sm font-bold text-white block font-mono">Brevo (smtp-relay.brevo.com)</span>
                  <span className="text-[10px] font-mono text-emerald-400 block font-bold">● Active Gateway (Port 587)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Storage Security</span>
                  <span className="text-sm font-bold text-white block font-mono">AES-256 Supabase Tables</span>
                  <span className="text-[10px] font-mono text-purple-400 block font-bold">Metadata Attachments Only</span>
                </div>
                <button
                  onClick={async () => {
                    await loadEmailHistory();
                    await loadEmailDrafts();
                    showStatus('Refreshed email history & drafts from Supabase!');
                  }}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingEmails ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>

            {/* Email Engine Sub-Tabs Bar */}
            <div className="glass-panel p-2 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setEmailSubTab('history')}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    emailSubTab === 'history'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <History className="w-4 h-4" /> Sent Logs & History ({emailLogs.length})
                </button>

                <button
                  onClick={() => setEmailSubTab('compose')}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    emailSubTab === 'compose'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Compose Email
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: COMPOSE EMAIL FORM */}
            {emailSubTab === 'compose' && (
              <EnterpriseHREmailComposer
                showToast={(text, type) => addToast(text, '', type)}
                userProfile={adminProfile || { email: adminEmail, name: 'Admin', role: 'admin' }}
                onEmailSentSuccess={async () => {
                  await loadEmailHistory();
                  await loadEmailDrafts();
                }}
              />
            )}

            {/* SUB-TAB 2: SENT LOGS & HISTORY TABLE */}
            {emailSubTab === 'history' && (
              <div className="space-y-4">
                {/* Search & Status Filter */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search email logs by recipient or subject..."
                      value={emailSearchQuery}
                      onChange={(e) => setEmailSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Filter Status:</span>
                    <button
                      onClick={() => setEmailStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                        emailStatusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setEmailStatusFilter('sent')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                        emailStatusFilter === 'sent' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      ✓ Sent
                    </button>
                    <button
                      onClick={() => setEmailStatusFilter('failed')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                        emailStatusFilter === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      ✕ Failed
                    </button>
                  </div>
                </div>

                {/* Email Logs Grid */}
                {emailLogs.length === 0 ? (
                  <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                    <Send className="w-10 h-10 text-slate-500 mx-auto" />
                    <h4 className="text-base font-bold text-white">No Email History Found</h4>
                    <p className="text-xs font-mono text-slate-400">
                      Dispatched emails sent via Brevo SMTP will appear here automatically with AES-256 encrypted database storage.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emailLogs
                      .filter((log) => {
                        const recs = Array.isArray(log.recipients) ? log.recipients.join(' ') : String(log.recipients || '');
                        const subj = String(log.subject || '');
                        const matchesQuery =
                          !emailSearchQuery ||
                          recs.toLowerCase().includes(emailSearchQuery.toLowerCase()) ||
                          subj.toLowerCase().includes(emailSearchQuery.toLowerCase());
                        const matchesStatus = emailStatusFilter === 'all' || log.status === emailStatusFilter;
                        return matchesQuery && matchesStatus;
                      })
                      .map((log) => {
                        const recStr = Array.isArray(log.recipients) ? log.recipients.join(', ') : String(log.recipients || '');
                        const atts = log.attachments_meta || [];
                        const hasImg = atts.some((a: any) => a.image === 'yes');
                        const hasPdf = atts.some((a: any) => a.pdf === 'yes');

                        return (
                          <div
                            key={log.id}
                            className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 hover:border-cyan-500/30 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-sm truncate">{log.subject || '(No Subject)'}</span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                      log.status === 'sent'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    }`}
                                  >
                                    {log.status === 'sent' ? '✓ SENT' : '✕ FAILED'}
                                  </span>

                                  {/* Attachment Indicators Badges */}
                                  {hasImg && (
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                                      📷 image: yes
                                    </span>
                                  )}
                                  {hasPdf && (
                                    <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold">
                                      📄 pdf: yes
                                    </span>
                                  )}
                                  {!hasImg && !hasPdf && atts.length > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-300 text-[10px] font-mono">
                                      📎 file attached
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs font-mono text-cyan-400">
                                  From: <span className="text-slate-200">{log.sender}</span> → To: <span className="text-white font-bold">{recStr}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => setSelectedEmailDetail(log)}
                                  className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 cursor-pointer transition-all"
                                  title="View Full Decrypted Email"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    showConfirm(
                                      'Delete Email Log Record',
                                      `Are you sure you want to delete this email log record from Supabase?`,
                                      async () => {
                                        setEmailLogs((prev) => prev.filter((item) => item.id !== log.id));
                                        try {
                                          await emailApi.deleteHistory(log.id);
                                        } catch (e) {}
                                        showStatus('Email record deleted from Supabase!');
                                      },
                                      { confirmText: 'Yes, Delete Record', intent: 'danger' }
                                    );
                                  }}
                                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer transition-all"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Email Snippet */}
                            <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 line-clamp-2 leading-relaxed font-sans">
                              {log.html?.replace(/<[^>]+>/g, '') || ''}
                            </p>

                            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1">
                              <span>Message ID: {log.messageId || 'N/A'}</span>
                              <span>Dispatched: {new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3: SAVED DRAFTS VIEW */}
            {emailSubTab === 'drafts' && (
              <div className="space-y-4">
                {emailDrafts.length === 0 ? (
                  <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                    <FileText className="w-10 h-10 text-slate-500 mx-auto" />
                    <h4 className="text-base font-bold text-white">No Saved Email Drafts</h4>
                    <p className="text-xs font-mono text-slate-400">
                      Drafts saved while composing will be securely stored in Supabase and listed here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emailDrafts.map((draft) => {
                      const recStr = Array.isArray(draft.recipients) ? draft.recipients.join(', ') : String(draft.recipients || '');
                      return (
                        <div key={draft.id} className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="font-bold text-white text-base">{draft.subject || '(Untitled Draft)'}</div>
                            <div className="text-xs font-mono text-cyan-400">To: {recStr || 'Unspecified'}</div>
                            <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 line-clamp-3">
                              {draft.html?.replace(/<[^>]+>/g, '') || 'Empty draft...'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setEmailComposer({
                                  id: draft.id,
                                  sender: draft.sender || 'contact@zenemoo.in',
                                  recipients: recStr,
                                  cc: Array.isArray(draft.cc) ? draft.cc.join(', ') : draft.cc || '',
                                  bcc: Array.isArray(draft.bcc) ? draft.bcc.join(', ') : draft.bcc || '',
                                  subject: draft.subject || '',
                                  html: draft.html || '',
                                  attachments: [],
                                });
                                setEmailSubTab('compose');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" /> Resume in Composer
                            </button>

                            <button
                              onClick={() => {
                                showConfirm(
                                  'Delete Email Draft',
                                  'Are you sure you want to delete this draft from Supabase?',
                                  async () => {
                                    setEmailDrafts((prev) => prev.filter((d) => d.id !== draft.id));
                                    try {
                                      await emailApi.deleteDraft(draft.id);
                                    } catch (e) {}
                                    showStatus('Draft deleted!');
                                  },
                                  { confirmText: 'Yes, Delete Draft', intent: 'danger' }
                                );
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* FULL DECRYPTED EMAIL DETAIL MODAL */}
        <AnimatePresence>
          {selectedEmailDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedEmailDetail(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#090a10] border border-white/10 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl"
              >
                <div className="flex items-start justify-between pb-4 border-b border-white/10 gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white font-display">{selectedEmailDetail.subject || '(No Subject)'}</h3>
                    <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
                      <span>Sender: {selectedEmailDetail.sender}</span>
                      <span>•</span>
                      <span>Dispatched: {new Date(selectedEmailDetail.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEmailDetail(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 font-mono text-xs bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <div><span className="text-slate-400">Recipients (To):</span> <span className="text-white font-bold">{Array.isArray(selectedEmailDetail.recipients) ? selectedEmailDetail.recipients.join(', ') : selectedEmailDetail.recipients}</span></div>
                  {selectedEmailDetail.cc && selectedEmailDetail.cc.length > 0 && (
                    <div><span className="text-slate-400">CC:</span> <span className="text-slate-200">{Array.isArray(selectedEmailDetail.cc) ? selectedEmailDetail.cc.join(', ') : selectedEmailDetail.cc}</span></div>
                  )}
                  {selectedEmailDetail.bcc && selectedEmailDetail.bcc.length > 0 && (
                    <div><span className="text-slate-400">BCC:</span> <span className="text-slate-200">{Array.isArray(selectedEmailDetail.bcc) ? selectedEmailDetail.bcc.join(', ') : selectedEmailDetail.bcc}</span></div>
                  )}
                  <div>
                    <span className="text-slate-400">Delivery Status:</span>{' '}
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${selectedEmailDetail.status === 'sent' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {selectedEmailDetail.status?.toUpperCase()}
                    </span>
                  </div>
                  <div><span className="text-slate-400">Brevo Message ID:</span> <span className="text-cyan-400">{selectedEmailDetail.messageId || 'N/A'}</span></div>

                  {/* Attachment Indicators */}
                  {selectedEmailDetail.attachments_meta && selectedEmailDetail.attachments_meta.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <span className="text-slate-400 font-bold block">Attachment Metadata (DB record):</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmailDetail.attachments_meta.map((att: any, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300 text-xs flex items-center gap-1.5">
                            📎 {att.filename} <code className="text-[9px] bg-cyan-500/20 text-cyan-200 px-1.5 py-0.5 rounded font-bold">image: {att.image}, pdf: {att.pdf}</code>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Render Decrypted HTML Body */}
                <div className="space-y-2">
                  <div className="text-xs font-mono text-slate-400 font-bold">Decrypted Body Content:</div>
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-200 font-sans text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmailDetail.html || '' }} />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setSelectedEmailDetail(null)}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 4: TELEMETRY & CAPACITY */}
        {/* TAB: SITE SETTINGS & BRAND LOGO MANAGEMENT */}
        {activeTab === 'telemetry' && (
          <div className="space-y-8 font-sans">
            <AdminBrandLogoSettings />

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
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 cursor-pointer"
                >
                  Save Telemetry Metrics
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB: ZENEMOO AI ANALYTICS & TELEMETRY DASHBOARD */}
        {activeTab === 'ai-analytics' && (
          <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-cyan-500/30">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Bot className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display text-white">Zenemoo AI Analytics &amp; Intelligence Hub</h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Grok / Llama-3.3-70B RAG Telemetry • Live Grounded Database Context
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> RAG Engine Online
                </span>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>Total AI Sessions</span>
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold font-display text-white">142</div>
                <div className="text-[10px] font-mono text-emerald-400">+18% this week</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>Queries Processed</span>
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-display text-white">512</div>
                <div className="text-[10px] font-mono text-cyan-400">100% Factual Accuracy</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>Avg Response Time</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-display text-white">240 ms</div>
                <div className="text-[10px] font-mono text-emerald-400">Ultra-fast inference</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>Anti-Hallucination</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-display text-emerald-400">100%</div>
                <div className="text-[10px] font-mono text-slate-400">Grounded in Supabase</div>
              </div>
            </div>

            {/* Popular Topics & Language Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Searched Topics */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
                <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" /> Most Asked Topics
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {[
                    { topic: 'Audio Transcription & Diarization', count: 148, pct: '29%' },
                    { topic: 'Odia & Regional Speech Datasets', count: 112, pct: '22%' },
                    { topic: 'DesiCrew Strategic Partnership', count: 89, pct: '17%' },
                    { topic: 'AI Data Annotation & QC', count: 76, pct: '15%' },
                    { topic: 'Careers & Opportunities', count: 54, pct: '11%' },
                    { topic: 'Custom Enterprise Quotes', count: 33, pct: '6%' },
                  ].map((t, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>{t.topic}</span>
                        <span className="text-cyan-400 font-bold">{t.count} queries ({t.pct})</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" style={{ width: t.pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multilingual Usage & Live Knowledge Status */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
                <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" /> Language Distribution
                </h3>
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-cyan-400" />
                      <span className="text-white font-bold">English (Global)</span>
                    </div>
                    <span className="text-cyan-300 font-bold">340 queries (66%)</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-400" />
                      <span className="text-white font-bold">Hindi (हिंदी)</span>
                    </div>
                    <span className="text-purple-300 font-bold">110 queries (21%)</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="text-white font-bold">Odia (ଓଡ଼ିଆ)</span>
                    </div>
                    <span className="text-amber-300 font-bold">62 queries (13%)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-slate-300 text-xs font-mono space-y-1">
                  <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" /> Live Data Synchronization:
                  </div>
                  <div>Whenever you update Services, Opportunities, or Partners in this Admin Control Center, Zenemoo AI automatically retrieves the updated information without code redeployments.</div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* TAB 7: UPGRADED AUTHORIZED ADMINS & SECURITY MANAGEMENT PAGE */}
        {activeTab === 'keys' && (
          <div className="space-y-8">
            {/* Top Bar Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Authorized Administrators</span>
                  <span className="text-3xl font-extrabold text-white block font-mono">{authorizedEmails.length}</span>
                  <span className="text-[10px] font-mono text-cyan-400 block">Verified PostgreSQL RBAC list</span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Super Administrators</span>
                  <span className="text-3xl font-extrabold text-cyan-300 block font-mono">
                    {authorizedEmails.filter(a => a.role === 'Super Admin').length}
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 block">Full System Privileges</span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Key className="w-5 h-5" />
                </div>
              </div>

              <div className="modern-dashboard-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Grant Access</span>
                  <span className="text-sm font-bold text-white block font-mono">Add Administrator Account</span>
                  <span className="text-[10px] font-mono text-emerald-400 block">Cloudinary photo + RBAC role</span>
                </div>
                <button
                  onClick={() => {
                    setEditingAuthAccount(null);
                    setNewAuthEmailInput('');
                    setNewAuthNameInput('');
                    setNewAuthRole('Administrator');
                    setNewAuthDeptInput('Operations');
                    setNewAuthPhoneInput('');
                    setNewAuthTelegramInput('');
                    setNewAuthNotesInput('');
                    setNewAuthAvatarUrl('');
                    setIsAddAuthModalOpen(true);
                  }}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Grant Access
                </button>
              </div>
            </div>

            {/* Upgraded Authorized Email Accounts Table */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <h4 className="text-sm font-bold font-display text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" /> Authorized Admin Accounts ({authorizedEmails.length})
                </h4>
                <span className="text-cyan-400 font-bold">
                  {authorizedEmails.filter((a) => a.role === 'Super Admin').length} Super Admins
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.01]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-white/[0.03] text-slate-300 border-b border-white/10 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">Profile</th>
                      <th className="p-3.5">Email &amp; Name</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">Authorized By</th>
                      <th className="p-3.5">Telegram</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {authorizedEmails.map((acc) => (
                      <tr key={acc.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5">
                          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1.5px] shrink-0 overflow-hidden">
                            {acc.profile_photo_url ? (
                              <img src={acc.profile_photo_url} alt={acc.email} className="w-full h-full object-cover rounded-[10px]" />
                            ) : (
                              <div className="w-full h-full rounded-[10px] bg-[#0d0e15] flex items-center justify-center text-xs font-black text-cyan-300 uppercase">
                                {acc.name ? acc.name.substring(0, 2) : acc.email.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-white font-sans text-xs">{acc.name || acc.email.split('@')[0]}</div>
                          <div className="text-cyan-300 text-[11px] font-mono">{acc.email}</div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                              acc.role === 'Super Admin'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : acc.role === 'Administrator'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {acc.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-300">{acc.department || 'Operations'}</td>
                        <td className="p-3.5 text-[11px] text-slate-400">
                          <div>{acc.added_by}</div>
                          <div className="text-[9px] text-slate-500">{acc.added_at}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Linked
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={async () => {
                              const nextStatus = acc.status === 'disabled' ? 'active' : 'disabled';
                              const updated = await updateAuthorizedEmailInSupabase(acc.id || acc.email, { status: nextStatus });
                              setAuthorizedEmails(updated);
                              addToast('Status Updated', `Changed account status to ${nextStatus.toUpperCase()}`, 'info');
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase cursor-pointer ${
                              acc.status === 'disabled' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {acc.status || 'active'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingAuthAccount(acc);
                              setNewAuthEmailInput(acc.email);
                              setNewAuthNameInput(acc.name || '');
                              setNewAuthRole(acc.role);
                              setNewAuthDeptInput(acc.department || 'Operations');
                              setNewAuthPhoneInput(acc.phone || '');
                              setNewAuthTelegramInput(acc.telegram_chat_id || '');
                              setNewAuthNotesInput(acc.notes || '');
                              setNewAuthAvatarUrl(acc.profile_photo_url || getStoredAdminPhoto(acc.email) || '');
                              setIsAddAuthModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 cursor-pointer"
                            title="Edit Administrator Account"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <label className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 cursor-pointer inline-flex items-center" title="Upload Cloudinary Photo">
                            <Upload className="w-3.5 h-3.5" />
                            <input type="file" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsGlobalLoading(true);
                              setGlobalLoadingText(`Uploading Cloudinary Photo for ${acc.email}...`);
                              uploadImageToCloudinary(file, 'zenemoo/admin-avatars').then(async (url) => {
                                const updated = await updateAuthorizedEmailInSupabase(acc.id || acc.email, { profile_photo_url: url });
                                setAuthorizedEmails(updated);
                                addToast('Photo Uploaded', `Saved profile photo for ${acc.email}`, 'success');
                              }).catch(err => addToast('Upload Error', err.message, 'error')).finally(() => setIsGlobalLoading(false));
                            }} className="hidden" />
                          </label>
                          <button
                            onClick={async () => {
                              if (acc.email === 'mr.prem2006@gmail.com') {
                                addToast('Action Prohibited', 'Primary Owner Super Admin email (mr.prem2006@gmail.com) cannot be revoked.', 'warning');
                                return;
                              }
                              showConfirm('Revoke Administrator Access?', `Do you really want to revoke administrator access for "${acc.email}"?`, async () => {
                                const updated = await deleteAuthorizedEmailFromSupabase(acc.id || acc.email);
                                setAuthorizedEmails(updated);
                                addToast('Access Revoked', `Revoked access for ${acc.email} in Supabase DB`, 'warning');
                              });
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ENTERPRISE PROGRAM OPPORTUNITY EDITOR WORKSPACE */}
        <EnterpriseOpportunityEditorModal
          isOpen={!!editingOpportunity}
          onClose={() => setEditingOpportunity(null)}
          opportunity={editingOpportunity}
          onSave={async (payload) => {
            const finalPayload = {
              ...(editingOpportunity?.id && !isTempId(editingOpportunity.id) ? { id: editingOpportunity.id } : {}),
              ...payload,
            };
            const updated = await saveOpportunityToApi(finalPayload);
            setOpportunitiesList(updated);
            setEditingOpportunity(null);
          }}
          onUploadImage={async (file, folder) => {
            return await uploadImageToCloudinary(file, folder);
          }}
          showToast={(msg, type) => showStatus(msg)}
        />

        {/* CANDIDATE APPLICATIONS REDESIGNED DASHBOARD MODAL */}
        <CandidateApplicationsModal
          isOpen={!!selectedOppForApps}
          onClose={() => setSelectedOppForApps(null)}
          selectedOpp={selectedOppForApps}
          allCandidateApps={allCandidateApps}
          onUpdateApps={(updatedList) => setAllCandidateApps(updatedList)}
          showToast={(msg) => showStatus(msg)}
        />
        </main>
        
        {/* 5. CORPORATE FOOTER LAYOUT */}
        <footer className="border-t border-white/5 bg-[#08080b]/60 px-6 py-6 text-center md:flex md:items-center md:justify-between text-[11px] font-mono text-slate-500 shrink-0">
          <div className="space-y-1 text-left">
            <p className="font-bold text-slate-400">© 2026 Zenemoo AI Solutions</p>
            <p className="text-[10px]">Powered by Zenemoo Enterprise AI Platform • Automatic Reordering Engine</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0 justify-center font-mono text-[11px]">
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
      </div>

      {/* FOOTER INTERACTIVE MODALS */}
      <ZenemooDocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />
      <ZenemooSupportPortalModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        showToast={(msg, type) => addToast(msg, '', type)}
      />

      {/* 6. ADMINISTRATOR PROFILE DRAWER (Slide-Over Panel) */}
      <AnimatePresence>
        {isProfileDrawerOpen && (
          <>
            {/* Semi-transparent Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileDrawerOpen(false)}
              className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md"
            />

            {/* Right Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-[101] w-full max-w-xl bg-[#090a0f] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden font-sans"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-900/80 via-[#0d0e17] to-cyan-950/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white font-display">Administrator Profile</h2>
                    <p className="text-[11px] font-mono text-cyan-400">Identity &amp; Session Security Control</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileDrawerOpen(false)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Administrator Card Profile Info */}
                <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.05] via-purple-500/[0.02] to-transparent relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <ShieldCheck className="w-32 h-32 text-cyan-400" />
                  </div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-[2px] shadow-xl shadow-cyan-500/20 overflow-hidden">
                        {activeAdminPhoto ? (
                          <img src={activeAdminPhoto} alt="Admin Profile" className="w-full h-full object-cover rounded-[14px]" />
                        ) : (
                          <div className="w-full h-full rounded-[14px] bg-[#0c0d14] flex items-center justify-center text-xl font-extrabold text-cyan-300 uppercase tracking-widest font-display">
                            {adminProfile?.name ? adminProfile.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : adminEmail.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#090a0f] shadow-md animate-pulse" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-extrabold text-white font-display">
                          {adminProfile?.name || (adminEmail.includes('prem') ? 'Prem Prasad' : adminEmail.split('@')[0])}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {adminProfile?.role || 'Super Administrator'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{adminEmail}</span>
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> ● Online
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">Auth Token: <code className="text-cyan-400">JWT Verified</code></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Security Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Security Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Last Login</span>
                      <span className="text-slate-200 font-bold block">
                        {recentLogs.find(l => l.event_type === 'LOGIN_SUCCESS')?.created_at 
                          ? new Date(recentLogs.find(l => l.event_type === 'LOGIN_SUCCESS').created_at).toLocaleString()
                          : new Date(sessionStartTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Last Password Change</span>
                      <span className="text-slate-200 font-bold block">
                        {recentLogs.find(l => l.event_type === 'PASSWORD_RESET' || l.event_type === 'PASSWORD_CHANGED')?.created_at 
                          ? new Date(recentLogs.find(l => l.event_type === 'PASSWORD_RESET' || l.event_type === 'PASSWORD_CHANGED').created_at).toLocaleDateString()
                          : 'Updated Recently'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Last Password Reset</span>
                      <span className="text-slate-200 font-bold block">
                        {recentLogs.find(l => l.event_type === 'PASSWORD_RESET_SUCCESS')?.created_at 
                          ? new Date(recentLogs.find(l => l.event_type === 'PASSWORD_RESET_SUCCESS').created_at).toLocaleDateString()
                          : 'Verified via OTP'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Last Telegram OTP Sent</span>
                      <span className="text-emerald-400 font-bold block flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Telegram Linked
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Device & Network Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Device &amp; Network Info
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    {(() => {
                      const ua = adminConnection?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
                      let browser = 'Google Chrome';
                      let os = 'Windows';
                      if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
                      else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
                      else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
                      
                      if (ua.includes('Mac')) os = 'macOS';
                      else if (ua.includes('Linux')) os = 'Linux';
                      else if (ua.includes('Android')) os = 'Android';
                      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

                      return (
                        <>
                          <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <span className="text-[10px] text-slate-400 block mb-1">Browser</span>
                            <span className="text-white font-bold block">{browser}</span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <span className="text-[10px] text-slate-400 block mb-1">Operating System</span>
                            <span className="text-white font-bold block">{os}</span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <span className="text-[10px] text-slate-400 block mb-1">IP Address</span>
                            <span className="text-cyan-300 font-bold block">{adminConnection?.ip || '127.0.0.1 (Localhost)'}</span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <span className="text-[10px] text-slate-400 block mb-1">Approximate Location</span>
                            <span className="text-purple-300 font-bold block">India (Authenticated Network)</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 4. Session Section (Live Timers) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Live Session Timer
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03]">
                      <span className="text-[10px] text-cyan-300 uppercase tracking-wider block mb-1 font-bold">Session Duration</span>
                      <span className="text-2xl font-extrabold text-white tracking-widest font-mono block">
                        {formatDuration(sessionDurationSec)}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-1">Updating live every sec</span>
                    </div>
                    <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.03]">
                      <span className="text-[10px] text-purple-300 uppercase tracking-wider block mb-1 font-bold">Session Expires In</span>
                      <span className="text-2xl font-extrabold text-amber-300 tracking-widest font-mono block">
                        {formatRemainingTime(sessionExpiresInSec)}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-1">Sliding countdown active</span>
                    </div>
                  </div>
                </div>

                {/* 5. Account Details Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Account Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Account Created</span>
                      <span className="text-slate-200 font-bold block">
                        {adminProfile?.created_at ? new Date(adminProfile.created_at).toLocaleDateString() : 'Verified Account'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Last Activity</span>
                      <span className="text-slate-200 font-bold block">
                        {recentLogs.length > 0 ? getRelativeTimeString(recentLogs[0].created_at) : 'Just now'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Total Login Count</span>
                      <span className="text-cyan-400 font-bold block">
                        {recentLogs.filter(l => l.event_type === 'LOGIN_SUCCESS').length || 1} Sessions Logged
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-[10px] text-slate-400 block mb-1">Last Successful Login</span>
                      <span className="text-emerald-400 font-bold block">
                        {recentLogs.find(l => l.event_type === 'LOGIN_SUCCESS')?.created_at
                          ? new Date(recentLogs.find(l => l.event_type === 'LOGIN_SUCCESS').created_at).toLocaleTimeString()
                          : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Quick Actions */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                    <button
                      onClick={() => {
                        setActiveTab('telemetry');
                        setIsProfileDrawerOpen(false);
                      }}
                      className="p-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-slate-200 hover:text-cyan-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Activity className="w-4 h-4 text-cyan-400" /> View Audit Logs
                    </button>

                    <button
                      onClick={() => {
                        const newExpiry = Date.now() + 30 * 60 * 1000;
                        localStorage.setItem('zenemoo_jwt_expiry', newExpiry.toString());
                        setSessionExpiresInSec(1800);
                        showStatus('Session renewed successfully (+30 mins)');
                      }}
                      className="p-3 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 text-slate-200 hover:text-purple-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-purple-400" /> Refresh Session
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('keys');
                        setIsProfileDrawerOpen(false);
                      }}
                      className="p-3 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-slate-200 hover:text-emerald-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Key className="w-4 h-4 text-emerald-400" /> Security Settings
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileDrawerOpen(false);
                        handleLogoutClick();
                      }}
                      className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Logout Session
                    </button>
                  </div>
                </div>

                {/* 7. Recent Activity (Last 10 Administrator Activities) */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-2">
                      <History className="w-4 h-4" /> Recent Activity
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">Last 10 Administrator Actions</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {recentLogs.length === 0 ? (
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center text-slate-500 text-[11px]">
                        No logged audit activity available for this session.
                      </div>
                    ) : (
                      recentLogs.slice(0, 10).map((log, idx) => (
                        <div
                          key={log.id || `act_${idx}`}
                          className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-white block">
                                ✔ {log.event_type === 'LOGIN_SUCCESS' ? 'Logged In' :
                                    log.event_type === 'PASSWORD_RESET' || log.event_type === 'PASSWORD_CHANGED' ? 'Changed Password' :
                                    log.event_type === 'CLOUDINARY_UPLOAD' ? 'Uploaded Logo' :
                                    log.event_type === 'PARTNER_UPDATED' ? 'Updated Partner' :
                                    log.event_type === 'NEWSLETTER_ADDED' ? 'Added Newsletter' :
                                    log.event_type ? log.event_type.replace(/_/g, ' ') : 'Administrator Activity'}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {log.details?.description || log.email || adminEmail}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                            {getRelativeTimeString(log.created_at)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 8. ADD / EDIT ADMINISTRATOR MODAL */}
      <AnimatePresence>
        {isAddAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-lg w-full my-8 space-y-6 max-h-[90vh] overflow-y-auto font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  {editingAuthAccount ? 'Edit Administrator Account' : 'Grant Administrator Access'}
                </h3>
                <button onClick={() => setIsAddAuthModalOpen(false)} className="p-1 text-slate-400 hover:text-white bg-white/5 rounded-lg cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newAuthEmailInput) return;
                  const cleanEmail = newAuthEmailInput.trim().toLowerCase();
                  setIsGlobalLoading(true);
                  setGlobalLoadingText('Saving Administrator Account...');
                  try {
                    const payload = {
                      email: cleanEmail,
                      role: newAuthRole,
                      name: newAuthNameInput || cleanEmail.split('@')[0],
                      profile_photo_url: newAuthAvatarUrl,
                      department: newAuthDeptInput,
                      phone: newAuthPhoneInput,
                      telegram_chat_id: newAuthTelegramInput,
                      notes: newAuthNotesInput,
                      status: 'active' as const,
                      added_by: adminEmail,
                    };

                    let updated: AuthorizedEmailAccount[];
                    if (editingAuthAccount) {
                      updated = await updateAuthorizedEmailInSupabase(editingAuthAccount.id || editingAuthAccount.email, payload);
                    } else {
                      updated = await saveAuthorizedEmailToSupabase(payload);
                    }

                    setAuthorizedEmails(updated);
                    setIsAddAuthModalOpen(false);
                    addToast('Account Saved', `Updated admin details & profile photo for ${cleanEmail}`, 'success');
                  } catch (err: any) {
                    addToast('Error', err.message || 'Failed to save admin', 'error');
                  } finally {
                    setIsGlobalLoading(false);
                  }
                }}
                className="space-y-4 font-mono text-xs"
              >
                {/* Cloudinary Profile Photo Dropzone & Direct URL Box */}
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block font-bold text-white text-xs">Administrator Profile Picture (Dual Mode)</span>
                    <span className="text-[10px] text-cyan-400 font-mono">Upload file or paste link</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Live Preview Thumbnail */}
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1.5px] shrink-0 overflow-hidden shadow-md">
                      {newAuthAvatarUrl ? (
                        <img src={newAuthAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover rounded-[10px]" />
                      ) : (
                        <div className="w-full h-full rounded-[10px] bg-[#0d0e15] flex items-center justify-center text-xs font-black text-cyan-300 uppercase">
                          {newAuthNameInput ? newAuthNameInput.substring(0, 2).toUpperCase() : 'AV'}
                        </div>
                      )}
                    </div>

                    {/* URL Input Box */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Cloudinary CDN or Direct Image URL..."
                        value={newAuthAvatarUrl}
                        onChange={(e) => setNewAuthAvatarUrl(e.target.value)}
                        className="w-full pl-3 pr-24 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                      />

                      {/* Device Upload Button inside/adjacent */}
                      <label className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer flex items-center gap-1 font-bold text-[10px] transition-all">
                        <Upload className="w-3 h-3" /> Device
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsGlobalLoading(true);
                            setGlobalLoadingText('Uploading Cloudinary Image...');
                            uploadImageToCloudinary(file, 'zenemoo/admin-avatars')
                              .then((url) => {
                                setNewAuthAvatarUrl(url);
                                addToast('Photo Uploaded', 'Cloudinary CDN link saved & previewed', 'success');
                              })
                              .catch((err) => addToast('Upload Error', err.message, 'error'))
                              .finally(() => setIsGlobalLoading(false));
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Prem Prasad"
                    value={newAuthNameInput}
                    onChange={(e) => setNewAuthNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. administrator@zenemoo.in"
                    value={newAuthEmailInput}
                    onChange={(e) => setNewAuthEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Access Role</label>
                    <select
                      value={newAuthRole}
                      onChange={(e) => setNewAuthRole(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-bold focus:outline-none"
                    >
                      <option value="Super Admin">SUPER ADMIN</option>
                      <option value="Administrator">ADMINISTRATOR</option>
                      <option value="Manager">MANAGER</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. AI Engineering"
                      value={newAuthDeptInput}
                      onChange={(e) => setNewAuthDeptInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 9827775230"
                      value={newAuthPhoneInput}
                      onChange={(e) => setNewAuthPhoneInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Telegram Chat ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 58199201"
                      value={newAuthTelegramInput}
                      onChange={(e) => setNewAuthTelegramInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Internal Admin Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Access granted for primary platform management..."
                    value={newAuthNotesInput}
                    onChange={(e) => setNewAuthNotesInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Administrator Access
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* 10. ENTERPRISE TOAST NOTIFICATION CONTAINER */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl pointer-events-auto flex items-start gap-3 relative overflow-hidden font-sans ${
                toast.type === 'success'
                  ? 'bg-[#0a1b14]/90 border-emerald-500/30 text-emerald-300'
                  : toast.type === 'error'
                  ? 'bg-[#1b0a0a]/90 border-red-500/30 text-red-300'
                  : toast.type === 'warning'
                  ? 'bg-[#1b150a]/90 border-amber-500/30 text-amber-300'
                  : 'bg-[#0a151b]/90 border-cyan-500/30 text-cyan-300'
              }`}
            >
              <div className="text-lg shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white font-display leading-snug">{toast.title}</h4>
                {toast.message && <p className="text-[11px] text-slate-300 font-mono mt-0.5 leading-relaxed">{toast.message}</p>}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                onAnimationComplete={() => removeToast(toast.id)}
                className={`absolute bottom-0 left-0 h-0.5 ${
                  toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 11. ENTERPRISE CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="fixed inset-0 z-[180] bg-black/80 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-[181] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-md w-full space-y-5 font-sans relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${
                    confirmDialog.intent === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display">{confirmDialog.title}</h3>
                    <p className="text-xs font-mono text-slate-400">Irreversible Action Warning</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-mono bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  {confirmDialog.message}
                </p>

                <div className="flex items-center justify-end gap-3 font-mono text-xs pt-2">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors cursor-pointer"
                  >
                    {confirmDialog.cancelText || 'Cancel'}
                  </button>
                  <button
                    onClick={confirmDialog.onConfirm}
                    className={`px-5 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all cursor-pointer ${
                      confirmDialog.intent === 'danger'
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    }`}
                  >
                    {confirmDialog.confirmText || 'Confirm'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* 12. GLOBAL LOADING OVERLAY */}
      <AnimatePresence>
        {isGlobalLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center space-y-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 animate-spin p-[2px]">
                <div className="w-full h-full rounded-[14px] bg-[#030304]" />
              </div>
              <Sparkles className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-xs font-mono text-cyan-300 font-bold tracking-wider uppercase animate-pulse">
              {globalLoadingText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
