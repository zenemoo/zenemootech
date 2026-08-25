import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Send,
  Sparkles,
  Paperclip,
  X,
  Plus,
  Eye,
  Bookmark,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Minus,
  RotateCcw,
  RotateCw,
  Trash2,
  Smartphone,
  Monitor,
  User,
  Building,
  Check,
  ChevronDown,
  Wand2,
  Users,
  Clock,
  Calendar,
} from 'lucide-react';
import { emailApi, scheduledEmailApi, userManagementApi } from '../services/api';

interface EnterpriseHREmailComposerProps {
  showToast: (text: string, type: 'success' | 'error') => void;
  userProfile: any;
  onEmailSentSuccess: () => void;
}

export interface HRTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export interface HRSignature {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
}

export const PRESET_HR_TEMPLATES: HRTemplate[] = [
  {
    id: 'interview_invite',
    name: 'Interview Invitation',
    category: 'Recruitment',
    subject: 'Invitation for Interview — Zenemoo AI Solutions',
    body: `<p>Dear Candidate,</p>
<p>Thank you for applying for the open position at <strong>Zenemoo AI Solutions</strong>. We were thoroughly impressed by your background and experience.</p>
<p>We would like to invite you for a technical and cultural discussion with our leadership team.</p>
<p><strong>Interview Details:</strong></p>
<ul>
  <li><strong>Format:</strong> Google Meet Video Conference</li>
  <li><strong>Duration:</strong> 45 minutes</li>
  <li><strong>Agenda:</strong> Technical background, past project review, and Q&A</li>
</ul>
<p>Please reply with 2-3 convenient time slots over the next three business days.</p>
<p>Best regards,</p>`,
  },
  {
    id: 'job_offer',
    name: 'Job Offer Letter',
    category: 'Recruitment',
    subject: 'Official Employment Offer — Zenemoo AI Solutions',
    body: `<p>Dear Candidate,</p>
<p>On behalf of <strong>Zenemoo AI Solutions</strong>, I am delighted to offer you the position of <strong>Team Specialist</strong> in our engineering & data operations division!</p>
<p>We believe your skills and expertise will be valuable additions to our team.</p>
<p><strong>Key Highlights of Offer:</strong></p>
<ul>
  <li><strong>Role:</strong> Technical Specialist</li>
  <li><strong>Department:</strong> Engineering & AI Systems</li>
  <li><strong>Work Location:</strong> Zenemoo Headquarters / Remote</li>
</ul>
<p>Please review the attached formal offer document and return a signed copy within 3 business days.</p>
<p>Warm regards,</p>`,
  },
  {
    id: 'welcome_onboarding',
    name: 'Welcome & Onboarding',
    category: 'HR Operations',
    subject: 'Welcome to the Zenemoo Family!',
    body: `<p>Dear Team Member,</p>
<p>Welcome to <strong>Zenemoo AI Solutions</strong>! We are thrilled to officially have you join our team.</p>
<p>Your portal credentials and single-source roster links have been activated. Please review your profile and complete your account setup.</p>
<p>If you have any questions, feel free to reach out directly to HR Operations.</p>
<p>Welcome aboard!</p>`,
  },
  {
    id: 'project_assignment',
    name: 'Project Assignment',
    category: 'Engineering',
    subject: 'New Project Assignment & Requirements Overview',
    body: `<p>Dear Team,</p>
<p>You have been assigned to lead the upcoming high-priority client module for the <strong>Zenemoo Platform Reordering Engine</strong>.</p>
<p><strong>Key Objectives:</strong></p>
<ul>
  <li>Review system design specifications</li>
  <li>Coordinate sequential task pipelines</li>
  <li>Ensure 100% test coverage and build stability</li>
</ul>
<p>Let's schedule a kickoff sync tomorrow at 10:00 AM.</p>
<p>Best regards,</p>`,
  },
  {
    id: 'data_annotation_update',
    name: 'Data Annotation Milestone',
    category: 'AI Operations',
    subject: 'Data Annotation Project Progress & Quality Audit Status',
    body: `<p>Dear Partner / Team,</p>
<p>We are pleased to share the milestone status report for the ongoing <strong>Speech & Data Annotation Program</strong> at Zenemoo AI Solutions.</p>
<p><strong>Milestone Metrics:</strong></p>
<ul>
  <li><strong>Accuracy Audit Score:</strong> 99.4% Verified Quality</li>
  <li><strong>Transcriptions Completed:</strong> Multi-dialect speech datasets processed</li>
  <li><strong>Security Compliance:</strong> Encrypted dataset pipeline verified</li>
</ul>
<p>Please let us know if additional linguistic tags or metadata classifications are required.</p>
<p>Best regards,</p>`,
  },
  {
    id: 'performance_review',
    name: 'Performance Review',
    category: 'HR Operations',
    subject: 'Quarterly Performance Evaluation & Feedback Sync',
    body: `<p>Dear Team Member,</p>
<p>As part of our commitment to continuous growth and excellence at <strong>Zenemoo AI Solutions</strong>, your quarterly performance evaluation is ready.</p>
<p><strong>Review Highlights:</strong></p>
<ul>
  <li><strong>Core Strengths:</strong> High quality output & reliable task delivery</li>
  <li><strong>Growth Target:</strong> Advanced specialization in AI automation workflows</li>
</ul>
<p>Please select a 30-minute slot for our 1-on-1 feedback session.</p>
<p>Best regards,</p>`,
  },
  {
    id: 'client_proposal',
    name: 'Enterprise Client Proposal',
    category: 'Sales & Business',
    subject: 'Zenemoo AI Speech & Language Solutions Proposal',
    body: `<p>Dear Valued Partner,</p>
<p>Thank you for connecting with <strong>Zenemoo AI Solutions</strong> regarding our speech recognition, transcription, and dataset annotation services.</p>
<p>Attached is our detailed enterprise service proposal tailored for your technical roadmap.</p>
<p>We look forward to scheduling a technical walkthrough at your convenience.</p>
<p>Sincerely,</p>`,
  },
  {
    id: 'security_notice',
    name: 'Security & System Alert',
    category: 'IT & Security',
    subject: 'Important: Platform Access Security Update Required',
    body: `<p>Dear User,</p>
<p>This is an automated security notice from <strong>Zenemoo Security Operations</strong>.</p>
<p>To ensure maximum account safety, please review your portal account settings and update your access password if prompted.</p>
<p>If you encounter any issues, please contact Technical Support immediately.</p>
<p>Stay safe,</p>`,
  },
  {
    id: 'meeting_reminder',
    name: 'Meeting Reminder',
    category: 'Operations',
    subject: 'Reminder: Upcoming Team Review Sync',
    body: `<p>Hi Team,</p>
<p>This is a quick reminder for our upcoming project review session scheduled for today.</p>
<p><strong>Meeting Time:</strong> 3:00 PM IST</p>
<p>Please ensure all progress updates and telemetry logs are updated in your portal dashboard beforehand.</p>
<p>See you there!</p>`,
  },
];

export const PRESET_SIGNATURES: HRSignature[] = [
  {
    id: 'support',
    name: 'Zenemoo Support Team',
    title: 'Enterprise Customer Operations',
    department: 'Client Partner Support',
    email: 'support@zenemoo.in',
    phone: '+91 (080) 4920-1200',
  },
  {
    id: 'prem',
    name: 'Prem Prasad Pradhan',
    title: 'Founder & CEO',
    department: 'Leadership & AI Platform',
    email: 'prem@zenemoo.in',
    phone: '+91 (080) 4920-1000',
  },
  {
    id: 'sangita',
    name: 'Sangita Sahoo',
    title: 'HR & Quality Assurance Lead',
    department: 'Human Resources & QA',
    email: 'sangita@zenemoo.in',
    phone: '+91 (080) 4920-1100',
  },
];

export const AUTHORIZED_SENDER_EMAILS = [
  'contact@zenemoo.in',
  'support@zenemoo.in',
  'info@zenemoo.in',
  'sangita@zenemoo.in',
  'prem@zenemoo.in',
  'noreply@zenemoo.in',
];

export interface AttachmentItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  content: string; // Base64 Data URL string
  progress: number;
  status: 'uploading' | 'ready' | 'error';
  errorMsg?: string;
}

export const EnterpriseHREmailComposer: React.FC<EnterpriseHREmailComposerProps> = ({
  showToast,
  userProfile,
  onEmailSentSuccess,
}) => {
  // 1. Sender State
  const [selectedSender, setSelectedSender] = useState<string>('contact@zenemoo.in');

  // 2. Recipient Chip States (To, CC, BCC)
  const [toChips, setToChips] = useState<string[]>([]);
  const [toInput, setToInput] = useState<string>('');
  const [ccChips, setCcChips] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState<string>('');
  const [bccChips, setBccChips] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState<string>('');

  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);

  // 3. Subject & Body States
  const [subject, setSubject] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);

  // 4. Attachments State
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // 5. Signature State
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('support');

  // 6. UI Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // 7. AI Assistant State
  const [aiPurpose, setAiPurpose] = useState('Interview Invitation');
  const [aiTone, setAiTone] = useState('Professional & Executive');
  const [aiRecipientName, setAiRecipientName] = useState('');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // 8. Auto-Save Draft State
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // 9. History Log State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadUserHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await emailApi.getHistory();
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setHistoryLogs(res.data.data);
      }
    } catch (e) {
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadUserHistory();
    loadScheduledLogs('all');
  }, []);

  // 10. Scheduled Emails State & Handlers
  const [scheduledLogs, setScheduledLogs] = useState<any[]>([]);
  const [scheduledFilter, setScheduledFilter] = useState<string>('scheduled');
  const [isScheduledListModalOpen, setIsScheduledListModalOpen] = useState(false);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduledId, setEditingScheduledId] = useState<string | null>(null);

  // Schedule Send Form Inputs
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [scheduleTimezone, setScheduleTimezone] = useState<string>('Asia/Kolkata');
  const [isSchedulingSubmit, setIsSchedulingSubmit] = useState<boolean>(false);

  const loadScheduledLogs = async (statusFilter?: string) => {
    setIsLoadingScheduled(true);
    try {
      const res = await scheduledEmailApi.getScheduled({ status: statusFilter || 'all' });
      if (res.data && res.data.success && Array.isArray(res.data.scheduled)) {
        setScheduledLogs(res.data.scheduled);
      }
    } catch (e) {
      console.warn('Failed to load scheduled logs:', e);
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  const activeScheduledCount = scheduledLogs.filter((item) => item.status === 'scheduled').length;

  const handleOpenScheduleModal = () => {
    let currentTo = [...toChips];
    if (toInput && isValidEmail(toInput) && !currentTo.includes(toInput)) {
      currentTo.push(toInput);
      setToChips(currentTo);
      setToInput('');
    }

    if (currentTo.length === 0) {
      showToast('Please specify at least one valid recipient in the "To" field before scheduling.', 'error');
      return;
    }

    if (!subject) {
      showToast('Please enter an email subject line before scheduling.', 'error');
      return;
    }

    const currentContent = editorRef.current ? editorRef.current.innerHTML : htmlContent;
    if (!currentContent || currentContent === '<br>') {
      showToast('Please enter message body content before scheduling.', 'error');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      const future = new Date(Date.now() + 60 * 60 * 1000);
      const dateStr = future.toISOString().split('T')[0];
      const hours = String(future.getHours()).padStart(2, '0');
      const mins = String(future.getMinutes()).padStart(2, '0');
      setScheduleDate(dateStr);
      setScheduleTime(`${hours}:${mins}`);
    }

    setIsScheduleModalOpen(true);
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      showToast('Please select both a date and time to schedule.', 'error');
      return;
    }

    const scheduledIsoString = `${scheduleDate}T${scheduleTime}:00`;
    const scheduledTimestamp = new Date(scheduledIsoString).getTime();
    const now = Date.now();

    if (isNaN(scheduledTimestamp) || scheduledTimestamp <= now - 5000) {
      showToast('Please choose a future date and time.', 'error');
      return;
    }

    const currentContent = editorRef.current ? editorRef.current.innerHTML : htmlContent;
    const formattedAttachments = attachments
      .filter((att) => att.status === 'ready' && att.content)
      .map((att) => ({
        name: att.name,
        filename: att.name,
        contentType: att.type,
        size: att.size,
        content: att.content,
      }));

    const payload = {
      sender: selectedSender,
      from: selectedSender,
      recipients: toChips.join(', '),
      to: toChips,
      cc: ccChips.join(', '),
      bcc: bccChips.join(', '),
      subject,
      html: currentContent,
      attachments: formattedAttachments,
      scheduled_at: new Date(scheduledIsoString).toISOString(),
      timezone: scheduleTimezone,
    };

    setIsSchedulingSubmit(true);
    try {
      if (editingScheduledId) {
        const res = await scheduledEmailApi.updateScheduled(editingScheduledId, payload);
        if (res.data && res.data.success) {
          showToast('✓ Scheduled email updated successfully!', 'success');
          setEditingScheduledId(null);
        }
      } else {
        const res = await scheduledEmailApi.createScheduled(payload);
        if (res.data && res.data.success) {
          showToast('📅 Email scheduled successfully!', 'success');
        }
      }

      setToChips([]);
      setCcChips([]);
      setBccChips([]);
      setSubject('');
      setHtmlContent('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      setAttachments([]);
      localStorage.removeItem(draftKey);
      setIsScheduleModalOpen(false);
      loadScheduledLogs('all');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to schedule email.', 'error');
    } finally {
      setIsSchedulingSubmit(false);
    }
  };

  const handleEditScheduledItem = (item: any) => {
    setIsScheduledListModalOpen(false);
    setEditingScheduledId(item.id);
    setSelectedSender(item.from_email || 'contact@zenemoo.in');

    const toArr = Array.isArray(item.to_emails) ? item.to_emails : (item.to_emails ? [item.to_emails] : []);
    setToChips(toArr);

    const ccArr = Array.isArray(item.cc_emails) ? item.cc_emails : [];
    setCcChips(ccArr);
    if (ccArr.length > 0) setShowCC(true);

    const bccArr = Array.isArray(item.bcc_emails) ? item.bcc_emails : [];
    setBccChips(bccArr);
    if (bccArr.length > 0) setShowBCC(true);

    setSubject(item.subject || '');
    setHtmlContent(item.body_html || '');
    if (editorRef.current) editorRef.current.innerHTML = item.body_html || '';

    if (Array.isArray(item.attachments)) {
      const restored = item.attachments.map((att: any, idx: number) => ({
        id: `att-restored-${idx}`,
        file: new File([], att.name || 'attachment'),
        name: att.name || att.filename || 'attachment',
        size: att.size || 1024,
        type: att.contentType || 'application/octet-stream',
        content: att.content || '',
        progress: 100,
        status: 'ready' as const,
      }));
      setAttachments(restored);
    }

    if (item.scheduled_at) {
      const dt = new Date(item.scheduled_at);
      setScheduleDate(dt.toISOString().split('T')[0]);
      setScheduleTime(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`);
    }
    if (item.timezone) setScheduleTimezone(item.timezone);

    showToast(`Editing scheduled email "${item.subject}". Click "Schedule Send" to update.`, 'success');
  };

  const handleCancelScheduledItem = async (id: string) => {
    if (!window.confirm('Cancel scheduled email?\n\nThis email will not be sent.')) return;

    try {
      const res = await scheduledEmailApi.cancelScheduled(id);
      if (res.data && res.data.success) {
        showToast('✓ Scheduled email cancelled.', 'success');
        loadScheduledLogs('all');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to cancel scheduled email.', 'error');
    }
  };

  const handleRetryScheduledItem = async (id: string) => {
    try {
      const res = await scheduledEmailApi.retryScheduled(id);
      if (res.data && res.data.success) {
        showToast('🚀 Scheduled email re-queued for sending.', 'success');
        loadScheduledLogs('all');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to retry scheduled email.', 'error');
    }
  };

  // Roster Quick Picker State
  const [rosterMembers, setRosterMembers] = useState<any[]>([]);
  const [activePickerField, setActivePickerField] = useState<'to' | 'cc' | 'bcc' | null>(null);

  // Authorized Senders based on role and RBAC permissions
  const getAuthorizedSenders = () => {
    const role = (userProfile?.role || '').toLowerCase();
    const userEmail = (userProfile?.email || '').toLowerCase();
    const isSuperAdmin =
      role === 'admin' ||
      role === 'super_admin' ||
      Boolean(userProfile?.isSuperAdmin) ||
      userEmail === 'mr.prem2006@gmail.com' ||
      userEmail === 'zenemootech@gmail.com' ||
      userEmail === 'contact@zenemoo.in';
    const senders = new Set<string>();

    if (isSuperAdmin) {
      senders.add('noreply@zenemoo.in');
      senders.add('info@zenemoo.in');
      senders.add('support@zenemoo.in');
      senders.add('prem@zenemoo.in');
      senders.add('contact@zenemoo.in');
      senders.add('hr@zenemoo.in');
      senders.add('careers@zenemoo.in');
      senders.add('zenemootech@gmail.com');
      if (userEmail) senders.add(userEmail);
    } else {
      // Non-admin (HR, Marketing Lead, PM, Tech Lead, etc.): NO static defaults! Fetches strictly assigned allowed_senders + user email!
      const customAllowed = userProfile?.allowed_senders || userProfile?.allowedSenders;
      if (customAllowed) {
        const customList = Array.isArray(customAllowed)
          ? customAllowed
          : String(customAllowed).split(/[,;\s]+/);
        customList.forEach((em: string) => {
          const clean = em.trim().toLowerCase();
          if (clean && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
            senders.add(clean);
          }
        });
      }

      if (userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        senders.add(userEmail);
      }
    }

    if (senders.size === 0 && userEmail) {
      senders.add(userEmail);
    }

    return Array.from(senders);
  };

  const authorizedSenders = getAuthorizedSenders();

  // Load team roster members on initial mount
  useEffect(() => {
    const loadRoster = async () => {
      try {
        const res = await userManagementApi.searchRoster('');
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          setRosterMembers(res.data.data.filter((m: any) => m.email));
        }
      } catch (e) {}
    };
    loadRoster();
  }, []);

  // Auto-fill initial default sender
  useEffect(() => {
    if (authorizedSenders.length > 0 && !authorizedSenders.includes(selectedSender)) {
      setSelectedSender(authorizedSenders[0]);
    }
  }, [userProfile]);

  // Sync contenteditable editor when htmlContent changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== htmlContent) {
      editorRef.current.innerHTML = htmlContent;
    }
  }, [htmlContent]);

  // User-scoped localStorage draft key
  const draftKey = `zenemoo_email_draft_${userProfile?.id || userProfile?.email || 'default'}`;

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (toChips.length > 0 || subject || htmlContent) {
        const draftData = {
          selectedSender,
          toChips,
          ccChips,
          bccChips,
          subject,
          htmlContent,
          updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        setLastSavedTime(draftData.updatedAt);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [selectedSender, toChips, ccChips, bccChips, subject, htmlContent, draftKey]);

  // Load Saved Draft on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.toChips) setToChips(d.toChips);
        if (d.ccChips) setCcChips(d.ccChips);
        if (d.bccChips) setBccChips(d.bccChips);
        if (d.subject) setSubject(d.subject);
        if (d.htmlContent) setHtmlContent(d.htmlContent);
        if (d.updatedAt) setLastSavedTime(d.updatedAt);
      }
    } catch (e) {}
  }, [draftKey]);

  const handleDiscardDraft = () => {
    setToChips([]);
    setCcChips([]);
    setBccChips([]);
    setSubject('');
    setHtmlContent('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setAttachments([]);
    localStorage.removeItem(draftKey);
    setLastSavedTime(null);
    showToast('Draft discarded and cleared.', 'success');
  };

  // Helper to validate email syntax
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  // Process typed email input into chips
  const handleAddChip = (
    value: string,
    chips: string[],
    setChips: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const rawTokens = value.split(/[,;\s]+/);
    const validEmailsToAdd: string[] = [];

    rawTokens.forEach((token) => {
      const clean = token.trim();
      if (!clean) return;
      if (isValidEmail(clean)) {
        if (!chips.includes(clean) && !validEmailsToAdd.includes(clean)) {
          validEmailsToAdd.push(clean);
        }
      } else {
        showToast(`Invalid email syntax: "${clean}"`, 'error');
      }
    });

    if (validEmailsToAdd.length > 0) {
      setChips([...chips, ...validEmailsToAdd]);
      setInput('');
    }
  };

  const handleKeyDownRecipient = (
    e: React.KeyboardEvent<HTMLInputElement>,
    inputVal: string,
    chips: string[],
    setChips: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      handleAddChip(inputVal, chips, setChips, setInput);
    } else if (e.key === 'Backspace' && !inputVal && chips.length > 0) {
      setChips(chips.slice(0, -1));
    }
  };

  const handlePasteRecipient = (
    e: React.ClipboardEvent<HTMLInputElement>,
    chips: string[],
    setChips: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    handleAddChip(pastedText, chips, setChips, setInput);
  };

  // Rich Text Editor Commands
  const execFormatCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  // Dynamic Sender-based Signature Generator (derives signature from selected FROM email)
  const getSignatureForSender = (senderEmail: string) => {
    const cleanSender = (senderEmail || '').toLowerCase();

    // 1. Check if matching roster member exists
    const rosterMatch = Array.isArray(rosterMembers)
      ? rosterMembers.find((m) => m.email && m.email.toLowerCase() === cleanSender)
      : null;

    if (rosterMatch) {
      return {
        name: rosterMatch.name,
        title: rosterMatch.designation || 'Specialist',
        department: rosterMatch.department || 'Operations',
        email: cleanSender,
      };
    }

    // 2. Check if logged-in user profile matches
    if (userProfile && userProfile.email && userProfile.email.toLowerCase() === cleanSender) {
      return {
        name: userProfile.name || 'Enterprise User',
        title: userProfile.designation || 'Specialist',
        department: userProfile.department || 'Operations',
        email: cleanSender,
      };
    }

    // 3. Preset fallbacks for official corporate emails
    if (cleanSender.includes('support')) {
      return {
        name: 'Zenemoo Support Team',
        title: 'Enterprise Customer Operations',
        department: 'Client Partner Support',
        email: cleanSender,
      };
    }

    if (cleanSender.includes('prem')) {
      return {
        name: 'Prem Prasad Pradhan',
        title: 'Founder & CEO',
        department: 'Leadership & AI Platform',
        email: cleanSender,
      };
    }

    if (cleanSender.includes('info') || cleanSender.includes('contact') || cleanSender.includes('noreply')) {
      return {
        name: userProfile?.name || 'Zenemoo Enterprise Team',
        title: userProfile?.designation || 'Corporate Operations',
        department: userProfile?.department || 'Executive Office',
        email: cleanSender,
      };
    }

    if (cleanSender.includes('hr') || cleanSender.includes('careers')) {
      return {
        name: userProfile?.name || 'Zenemoo HR Team',
        title: userProfile?.designation || 'Human Resources & Talent Lead',
        department: userProfile?.department || 'People & Culture',
        email: cleanSender,
      };
    }

    // 4. Dynamic Fallback using userProfile or email prefix
    const nameFromEmail = cleanSender.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = nameFromEmail.replace(/\b\w/g, (l) => l.toUpperCase());

    return {
      name: userProfile?.name || formattedName || 'Zenemoo Executive',
      title: userProfile?.designation || 'Enterprise Specialist',
      department: userProfile?.department || 'Operations',
      email: cleanSender,
    };
  };

  const handleApplyTemplate = (template: HRTemplate) => {
    setSubject(template.subject);
    const sig = getSignatureForSender(selectedSender);
    let fullHtml = template.body;
    if (sig) {
      fullHtml += `<br/><div style="margin-top:20px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.15); font-family: sans-serif;"><p style="color:#06b6d4; font-size:14px; font-weight:bold; margin:0 0 3px 0;">${sig.name}</p><p style="color:#94a3b8; font-size:12px; margin:0 0 2px 0;">${sig.title} &bull; ${sig.department}</p><p style="color:#64748b; font-size:11px; margin:0;">Zenemoo AI Solutions | <a href="https://www.zenemoo.in" target="_blank" style="color:#06b6d4; text-decoration:none;">www.zenemoo.in</a> | ${sig.email}</p></div>`;
    }
    setHtmlContent(fullHtml);
    setIsTemplateModalOpen(false);
    showToast(`Template "${template.name}" applied with signature!`, 'success');
  };

  const handleAppendSignature = () => {
    const sig = getSignatureForSender(selectedSender);
    if (!sig) return;
    const sigHtml = `<br/><div style="margin-top:20px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.15); font-family: sans-serif;"><p style="color:#06b6d4; font-size:14px; font-weight:bold; margin:0 0 3px 0;">${sig.name}</p><p style="color:#94a3b8; font-size:12px; margin:0 0 2px 0;">${sig.title} &bull; ${sig.department}</p><p style="color:#64748b; font-size:11px; margin:0;">Zenemoo AI Solutions | <a href="https://www.zenemoo.in" target="_blank" style="color:#06b6d4; text-decoration:none;">www.zenemoo.in</a> | ${sig.email}</p></div>`;
    setHtmlContent((prev) => prev + sigHtml);
    showToast(`Signature for ${sig.name} (${sig.email}) appended!`, 'success');
  };

  // AI Email Generator Simulation
  const handleGenerateAiEmail = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      let aiSubj = `${aiPurpose} — Zenemoo AI Solutions`;
      let recipientText = aiRecipientName ? aiRecipientName : 'Team Member / Valued Client';
      let customPara = aiCustomPrompt.trim()
        ? `<p>${aiCustomPrompt.trim().replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
        : `<p>I am writing to share an important communication regarding <strong>${aiPurpose}</strong> at Zenemoo AI Solutions. Our enterprise teams are dedicated to maintaining standard-setting quality, security, and continuous innovation across all operations.</p>`;

      let aiBody = `<p>Dear ${recipientText},</p>
${customPara}
<p><strong>Key Highlights & Summary:</strong></p>
<ul>
  <li><strong>Communication Purpose:</strong> ${aiPurpose}</li>
  <li><strong>Tone & Protocol:</strong> ${aiTone} Standard</li>
  <li><strong>Next Action Step:</strong> Please review the details above and confirm receipt or feedback at your earliest convenience.</li>
</ul>
<p>If you have any questions or require further clarification, please feel free to reach out to our team.</p>
<p>Best regards,</p>`;

      if (aiPurpose.includes('Offer')) {
        aiSubj = `Official Employment Offer — Zenemoo AI Solutions`;
        aiBody = `<p>Dear ${recipientText},</p>
<p>On behalf of <strong>Zenemoo AI Solutions</strong>, I am delighted to extend a formal offer of employment for you to join our Engineering & AI Operations team!</p>
${customPara}
<p><strong>Offer Highlights & Details:</strong></p>
<ul>
  <li><strong>Role:</strong> Technical Specialist / Operations Lead</li>
  <li><strong>Department:</strong> AI Platform & Quality Engineering</li>
  <li><strong>Work Location:</strong> Zenemoo Headquarters / Hybrid Remote</li>
</ul>
<p>Please review the details attached and return your signed acceptance within three business days.</p>
<p>Warm regards,</p>`;
      } else if (aiPurpose.includes('Annotation') || aiPurpose.includes('Data')) {
        aiSubj = `Data Annotation Project Progress Update — Zenemoo AI Solutions`;
        aiBody = `<p>Dear ${recipientText},</p>
<p>We are pleased to present the latest milestone progress update for the ongoing <strong>Speech & Data Annotation Program</strong> at Zenemoo AI Solutions.</p>
${customPara}
<p><strong>Milestone Metrics & Quality Audit:</strong></p>
<ul>
  <li><strong>Quality Audit Score:</strong> 99.4% Accuracy Compliance</li>
  <li><strong>Transcriptions Completed:</strong> Multi-dialect speech datasets processed</li>
  <li><strong>Pipeline Security:</strong> Encrypted dataset delivery verified</li>
</ul>
<p>Please let us know if additional linguistic tags or metadata classifications are required for your dataset pipeline.</p>
<p>Best regards,</p>`;
      } else if (aiPurpose.includes('Performance')) {
        aiSubj = `Performance Evaluation & Growth Feedback — Zenemoo AI Solutions`;
        aiBody = `<p>Dear ${recipientText},</p>
<p>As part of our commitment to continuous growth and excellence at <strong>Zenemoo AI Solutions</strong>, your performance evaluation summary is ready for review.</p>
${customPara}
<p><strong>Evaluation Summary:</strong></p>
<ul>
  <li><strong>Core Strengths:</strong> Consistently high quality output & reliable execution</li>
  <li><strong>Growth Target:</strong> Expansion into automated AI verification tools</li>
</ul>
<p>Let's schedule a 1-on-1 session this week to discuss your goals for the upcoming quarter.</p>
<p>Best regards,</p>`;
      }

      setSubject(aiSubj);
      setHtmlContent(aiBody);
      setIsGeneratingAi(false);
      setIsAiModalOpen(false);
      showToast('✨ High quality structured email generated!', 'success');
    }, 1000);
  };

  // Attachment Upload Handler with Size Validation & Base64 Reader
  const processFiles = (files: File[]) => {
    let currentTotalSize = attachments.reduce((sum, item) => sum + item.size, 0);

    for (const file of files) {
      // Rule 1: Max 10 MB per individual file
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum 10 MB per file limit.`, 'error');
        continue;
      }
      // Rule 2: Max 25 MB total across all attachments
      if (currentTotalSize + file.size > 25 * 1024 * 1024) {
        showToast(`Adding "${file.name}" exceeds the maximum 25 MB total email attachment limit.`, 'error');
        break;
      }

      currentTotalSize += file.size;
      const fileId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const newItem: AttachmentItem = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        content: '',
        progress: 0,
        status: 'uploading',
      };

      setAttachments((prev) => [...prev, newItem]);

      const reader = new FileReader();
      reader.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setAttachments((prev) =>
            prev.map((item) => (item.id === fileId ? { ...item, progress: pct } : item))
          );
        }
      };

      reader.onload = () => {
        const result = reader.result as string;
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, content: result, progress: 100, status: 'ready' }
              : item
          )
        );
      };

      reader.onerror = () => {
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: 'error', errorMsg: 'Failed to read attachment file.' }
              : item
          )
        );
        showToast(`Failed to load file ${file.name}.`, 'error');
      };

      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Send Email Final Submission
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    let currentTo = [...toChips];
    if (toInput && isValidEmail(toInput) && !currentTo.includes(toInput)) {
      currentTo.push(toInput);
      setToChips(currentTo);
      setToInput('');
    }

    if (currentTo.length === 0) {
      showToast('Please specify at least one valid recipient in the "To" field.', 'error');
      return;
    }

    if (!subject) {
      showToast('Please enter an email subject line.', 'error');
      return;
    }

    const currentContent = editorRef.current ? editorRef.current.innerHTML : htmlContent;
    if (!currentContent || currentContent === '<br>') {
      showToast('Please enter message body content.', 'error');
      return;
    }

    // Check if any attachment is still uploading
    const isStillUploading = attachments.some((att) => att.status === 'uploading');
    if (isStillUploading) {
      showToast('Please wait for all attachments to finish loading before sending.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const formattedAttachments = attachments
        .filter((att) => att.status === 'ready' && att.content)
        .map((att) => ({
          name: att.name,
          filename: att.name,
          contentType: att.type,
          size: att.size,
          content: att.content,
        }));

      const payload = {
        sender: selectedSender,
        recipients: currentTo.join(', '),
        cc: ccChips.join(', '),
        bcc: bccChips.join(', '),
        subject,
        html: currentContent,
        attachments: formattedAttachments,
      };

      const res = await emailApi.send(payload);
      if (res.data && res.data.success) {
        showToast('🚀 Email dispatched successfully with all attachments!', 'success');
        setToChips([]);
        setCcChips([]);
        setBccChips([]);
        setSubject('');
        setHtmlContent('');
        if (editorRef.current) editorRef.current.innerHTML = '';
        setAttachments([]);
        localStorage.removeItem(draftKey);
        localStorage.removeItem('zenemoo_hr_email_draft');
        setLastSavedTime(null);
        onEmailSentSuccess();
      } else {
        showToast(res.data?.message || 'Email delivery failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Email delivery failed.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden glass-panel p-3.5 sm:p-7 rounded-2xl sm:rounded-3xl border border-emerald-500/30 space-y-5 font-mono text-xs shadow-2xl relative">
      {/* 1. Mobile-First Header Bar with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-lg font-bold font-display text-white flex items-center gap-2">
              <Mail className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400 shrink-0" /> Zenemoo Enterprise Email System
            </h2>
            {lastSavedTime && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono">
                  Draft saved {lastSavedTime}
                </span>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-mono font-bold cursor-pointer transition-all"
                  title="Discard current draft"
                >
                  Discard Draft
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Compose and dispatch verified company communications via Brevo SMTP.</p>
        </div>

        {/* Header Action Buttons (Full-Width Stack on Mobile) */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setIsHistoryModalOpen(true);
              loadUserHistory();
            }}
            className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Sent History ({historyLogs.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setIsScheduledListModalOpen(true);
              loadScheduledLogs('all');
            }}
            className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Scheduled ({activeScheduledCount})
          </button>

          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" /> Templates
          </button>

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> ✨ AI Writer
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" /> Preview
          </button>
        </div>
      </div>

      {/* 2. Main Compose Form (Mobile Vertical Stack) */}
      <form onSubmit={handleSendEmail} className="space-y-4 font-mono w-full max-w-full">
        {/* Row A: Authorized Sender Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <div className="sm:col-span-1">
            <label className="block text-slate-300 font-bold mb-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
              From Sender Identity *
            </label>
            <div className="relative">
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-400 appearance-none cursor-pointer pr-10"
              >
                {authorizedSenders.map((email) => (
                  <option key={email} value={email} className="bg-[#090d16] text-white">
                    {email}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end justify-between gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] text-slate-400 mb-1">
              Sender Access: <strong className="text-emerald-400">{userProfile?.role || 'Staff Member'}</strong>
            </span>
            <div className="flex items-center gap-3 mb-1 font-mono text-xs">
              {!showCC && (
                <button
                  type="button"
                  onClick={() => setShowCC(true)}
                  className="text-cyan-400 hover:underline cursor-pointer font-bold"
                >
                  + CC
                </button>
              )}
              {!showBCC && (
                <button
                  type="button"
                  onClick={() => setShowBCC(true)}
                  className="text-cyan-400 hover:underline cursor-pointer font-bold"
                >
                  + BCC
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row B: TO Recipient Chips Input & Quick Picker */}
        <div className="w-full relative">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-slate-300 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">
              To Recipients *
            </label>
            {rosterMembers.length > 0 && (
              <button
                type="button"
                onClick={() => setActivePickerField(activePickerField === 'to' ? null : 'to')}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3 h-3" /> Select Team Member ▾
              </button>
            )}
          </div>

          {activePickerField === 'to' && (
            <div className="absolute right-0 top-7 z-30 w-72 bg-[#090d16] border border-emerald-500/40 rounded-2xl p-2 shadow-2xl space-y-1 max-h-56 overflow-y-auto">
              <div className="text-[10px] text-slate-400 px-2 py-1 border-b border-white/10 font-bold uppercase">
                Enterprise Team Roster
              </div>
              {rosterMembers.map((m) => (
                <div
                  key={m.id || m.email}
                  onClick={() => {
                    if (m.email && !toChips.includes(m.email)) {
                      setToChips([...toChips, m.email]);
                    }
                    setActivePickerField(null);
                  }}
                  className="p-2 rounded-xl hover:bg-white/[0.08] cursor-pointer space-y-0.5"
                >
                  <div className="font-bold text-white text-xs truncate">{m.name}</div>
                  <div className="text-[10px] text-emerald-300 truncate">{m.email}</div>
                  <div className="text-[9px] text-slate-400 truncate">{m.designation || m.department || 'Team Member'}</div>
                </div>
              ))}
            </div>
          )}
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-emerald-400 flex flex-wrap items-center gap-1.5 min-h-[44px] max-w-full overflow-x-hidden">
            {toChips.map((email, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 max-w-full truncate"
              >
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => setToChips(toChips.filter((_, i) => i !== idx))}
                  className="hover:text-red-400 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <input
              type="text"
              placeholder={toChips.length === 0 ? 'Type email & press Enter...' : 'Add more...'}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={(e) => handleKeyDownRecipient(e, toInput, toChips, setToChips, setToInput)}
              onPaste={(e) => handlePasteRecipient(e, toChips, setToChips, setToInput)}
              onBlur={() => handleAddChip(toInput, toChips, setToChips, setToInput)}
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-[140px] sm:min-w-[200px]"
            />
          </div>
        </div>

        {/* Row C: CC Recipient Chips Input */}
        {showCC && (
          <div className="w-full relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">CC Recipients</label>
              <div className="flex items-center gap-3">
                {rosterMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePickerField(activePickerField === 'cc' ? null : 'cc')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Users className="w-3 h-3" /> Select Member ▾
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowCC(false);
                    setCcChips([]);
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-400 cursor-pointer"
                >
                  Remove CC
                </button>
              </div>
            </div>

            {activePickerField === 'cc' && (
              <div className="absolute right-0 top-7 z-30 w-72 bg-[#090d16] border border-cyan-500/40 rounded-2xl p-2 shadow-2xl space-y-1 max-h-56 overflow-y-auto">
                <div className="text-[10px] text-slate-400 px-2 py-1 border-b border-white/10 font-bold uppercase">
                  Select CC Recipient
                </div>
                {rosterMembers.map((m) => (
                  <div
                    key={m.id || m.email}
                    onClick={() => {
                      if (m.email && !ccChips.includes(m.email)) {
                        setCcChips([...ccChips, m.email]);
                      }
                      setActivePickerField(null);
                    }}
                    className="p-2 rounded-xl hover:bg-white/[0.08] cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-white text-xs truncate">{m.name}</div>
                    <div className="text-[10px] text-cyan-300 truncate">{m.email}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-cyan-400 flex flex-wrap items-center gap-1.5 min-h-[44px] max-w-full overflow-x-hidden">
              {ccChips.map((email, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 max-w-full truncate"
                >
                  <span className="truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => setCcChips(ccChips.filter((_, i) => i !== idx))}
                    className="hover:text-red-400 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder="Type CC email..."
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => handleKeyDownRecipient(e, ccInput, ccChips, setCcChips, setCcInput)}
                onPaste={(e) => handlePasteRecipient(e, ccChips, setCcChips, setCcInput)}
                onBlur={() => handleAddChip(ccInput, ccChips, setCcChips, setCcInput)}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-[140px] sm:min-w-[200px]"
              />
            </div>
          </div>
        )}

        {/* Row D: BCC Recipient Chips Input */}
        {showBCC && (
          <div className="w-full relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">BCC Recipients</label>
              <div className="flex items-center gap-3">
                {rosterMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivePickerField(activePickerField === 'bcc' ? null : 'bcc')}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Users className="w-3 h-3" /> Select Member ▾
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowBCC(false);
                    setBccChips([]);
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-400 cursor-pointer"
                >
                  Remove BCC
                </button>
              </div>
            </div>

            {activePickerField === 'bcc' && (
              <div className="absolute right-0 top-7 z-30 w-72 bg-[#090d16] border border-purple-500/40 rounded-2xl p-2 shadow-2xl space-y-1 max-h-56 overflow-y-auto">
                <div className="text-[10px] text-slate-400 px-2 py-1 border-b border-white/10 font-bold uppercase">
                  Select BCC Recipient
                </div>
                {rosterMembers.map((m) => (
                  <div
                    key={m.id || m.email}
                    onClick={() => {
                      if (m.email && !bccChips.includes(m.email)) {
                        setBccChips([...bccChips, m.email]);
                      }
                      setActivePickerField(null);
                    }}
                    className="p-2 rounded-xl hover:bg-white/[0.08] cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-white text-xs truncate">{m.name}</div>
                    <div className="text-[10px] text-purple-300 truncate">{m.email}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-purple-400 flex flex-wrap items-center gap-1.5 min-h-[44px] max-w-full overflow-x-hidden">
              {bccChips.map((email, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 max-w-full truncate"
                >
                  <span className="truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => setBccChips(bccChips.filter((_, i) => i !== idx))}
                    className="hover:text-red-400 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder="Type BCC email..."
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                onKeyDown={(e) => handleKeyDownRecipient(e, bccInput, bccChips, setBccChips, setBccInput)}
                onPaste={(e) => handlePasteRecipient(e, bccChips, setBccChips, setBccInput)}
                onBlur={() => handleAddChip(bccInput, bccChips, setBccChips, setBccInput)}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-[140px] sm:min-w-[200px]"
              />
            </div>
          </div>
        )}

        {/* Row E: Email Subject Input */}
        <div className="w-full">
          <label className="block text-slate-300 font-bold mb-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
            Email Subject Line *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Zenemoo HR Operations & Opportunity Follow-up"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
          />
        </div>
        {/* Row F: Responsive Formatting Toolbar & Editor */}
        <div className="space-y-2 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-slate-300 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">
              Email Body Content *
            </label>
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={handleAppendSignature}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm font-mono"
              >
                <span>+ Insert Signature</span>
              </button>
            </div>
          </div>

          {/* Adaptive Scrollable Formatting Toolbar (Zero Overflow on 320px) */}
          <div className="w-full bg-[#090d16] border border-white/10 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
            <button
              type="button"
              onClick={() => execFormatCommand('bold')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('italic')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('underline')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('strikeThrough')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-0.5" />
            <button
              type="button"
              onClick={() => execFormatCommand('formatBlock', '<h2>')}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer shrink-0"
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('formatBlock', '<h3>')}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer shrink-0"
              title="Heading 3"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('formatBlock', '<p>')}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer shrink-0"
              title="Paragraph"
            >
              P
            </button>
            <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-0.5" />
            <button
              type="button"
              onClick={() => execFormatCommand('insertUnorderedList')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('insertOrderedList')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-0.5" />
            <button
              type="button"
              onClick={() => execFormatCommand('justifyLeft')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('justifyCenter')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('justifyRight')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter Hyperlink URL:', 'https://');
                if (url) execFormatCommand('createLink', url);
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Insert Link"
            >
              <Link className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('insertHorizontalRule')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Horizontal Line"
            >
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('removeFormat')}
              className="px-2 py-1 rounded-lg hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-all cursor-pointer shrink-0 ml-auto"
              title="Clear Formatting"
            >
              Clear
            </button>
          </div>

          {/* WYSIWYG Content Editable Area */}
          <div
            ref={editorRef}
            contentEditable
            onInput={() => {
              if (editorRef.current) {
                setHtmlContent(editorRef.current.innerHTML);
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              const formattedHtml = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\r\n/g, '\n')
                .replace(/\n{2,}/g, '</p><p style="margin-top:12px; margin-bottom:12px;">')
                .replace(/\n/g, '<br/>');
              const wrap = `<p style="margin-top:0; margin-bottom:12px;">${formattedHtml}</p>`;
              document.execCommand('insertHTML', false, wrap);
              if (editorRef.current) {
                setHtmlContent(editorRef.current.innerHTML);
              }
            }}
            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
            className="w-full min-h-[180px] sm:min-h-[220px] max-h-[360px] overflow-y-auto p-3.5 sm:p-4 rounded-b-2xl bg-white/[0.03] border border-white/10 text-white font-sans text-xs sm:text-sm focus:outline-none focus:border-emerald-400 leading-relaxed overflow-x-hidden"
          />
        </div>

        {/* Row G: Responsive File Attachments with Drag & Drop */}
        <div className="space-y-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <label className="block text-slate-300 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">
                📎 Attachments (Images, PDFs, Word, Excel, ZIP)
              </label>
              <span className="text-[10px] text-slate-500 font-mono block">
                Max 10 MB per file &bull; 25 MB total limit
              </span>
            </div>

            <label
              htmlFor="email-file-attachment"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-all shadow-md"
            >
              <Paperclip className="w-3.5 h-3.5" /> Browse Files
            </label>
            <input
              id="email-file-attachment"
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            />
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center font-mono text-xs space-y-1 ${
              isDraggingOver
                ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 scale-[1.01]'
                : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-center gap-2 font-bold text-white text-xs">
              <Paperclip className="w-4 h-4 text-cyan-400" /> Drag &amp; Drop Files Here or Click Browse
            </div>
            <div className="text-[10px] text-slate-500">
              Supports Images (PNG, JPG, SVG), PDFs, Word, Excel, PowerPoint &amp; ZIP files
            </div>
          </div>

          {/* Attachment Preview List */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full pt-1">
              {attachments.map((att) => {
                const formattedSize =
                  att.size > 1024 * 1024
                    ? `${(att.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${Math.round(att.size / 1024)} KB`;

                return (
                  <div
                    key={att.id}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <Paperclip className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-white font-bold truncate text-xs">{att.name}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                        className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{formattedSize}</span>
                      {att.status === 'uploading' && (
                        <span className="text-cyan-400 font-bold">Uploading {att.progress}%...</span>
                      )}
                      {att.status === 'ready' && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          ✓ Ready
                        </span>
                      )}
                      {att.status === 'error' && (
                        <span className="text-red-400 font-bold">Error</span>
                      )}
                    </div>

                    {att.status === 'uploading' && (
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-200"
                          style={{ width: `${att.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Row H: Full-Width Mobile Action Controls */}
        <div className="pt-2 w-full flex flex-col sm:flex-row items-center gap-3">
          <button
            type="submit"
            disabled={isSending || isSchedulingSubmit}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold font-display text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-600/20 min-h-[44px] disabled:opacity-50"
          >
            {isSending ? <RefreshCw className="w-4.5 h-4.5 animate-spin text-black" /> : <Send className="w-4.5 h-4.5 text-black" />}
            Dispatch Email via Brevo
          </button>

          <button
            type="button"
            onClick={handleOpenScheduleModal}
            disabled={isSending || isSchedulingSubmit}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold font-display text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-amber-500/10 min-h-[44px] transition-all disabled:opacity-50"
          >
            <Clock className="w-4.5 h-4.5 text-amber-400" />
            {editingScheduledId ? 'Update Schedule Send ▼' : 'Schedule Send ▼'}
          </button>

          {editingScheduledId && (
            <button
              type="button"
              onClick={() => {
                setEditingScheduledId(null);
                setToChips([]);
                setCcChips([]);
                setBccChips([]);
                setSubject('');
                setHtmlContent('');
                if (editorRef.current) editorRef.current.innerHTML = '';
                setAttachments([]);
              }}
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs flex items-center justify-center cursor-pointer min-h-[44px]"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* 3. TEMPLATES SELECTION MODAL & MOBILE BOTTOM SHEET */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-2xl bg-[#090d16] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> HR Email Templates
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {PRESET_HR_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/50 space-y-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white group-hover:text-cyan-300 text-xs">{tmpl.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{tmpl.subject}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. AI EMAIL WRITER MODAL & MOBILE BOTTOM SHEET */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-xl bg-[#090d16] border-t sm:border border-purple-500/40 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" /> ✨ AI Email Assistant (Groq Engine)
              </h3>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-mono">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Email Purpose / Category</label>
                <select
                  value={aiPurpose}
                  onChange={(e) => setAiPurpose(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="Interview Invitation" className="bg-[#090d16]">Interview Invitation</option>
                  <option value="Job Offer Letter" className="bg-[#090d16]">Job Offer Letter</option>
                  <option value="Welcome & Onboarding" className="bg-[#090d16]">Welcome & Onboarding</option>
                  <option value="Project Assignment & Deliverables" className="bg-[#090d16]">Project Assignment & Deliverables</option>
                  <option value="Data Annotation Project Update" className="bg-[#090d16]">Data Annotation Project Update</option>
                  <option value="Performance Review & Feedback" className="bg-[#090d16]">Performance Review & Feedback</option>
                  <option value="Client Business Proposal" className="bg-[#090d16]">Client Business Proposal</option>
                  <option value="Meeting Request & Schedule" className="bg-[#090d16]">Meeting Request & Schedule</option>
                  <option value="General Update / Announcement" className="bg-[#090d16]">General Update / Announcement</option>
                  <option value="Urgent Notice / Security Alert" className="bg-[#090d16]">Urgent Notice / Security Alert</option>
                  <option value="Follow-Up & Reminder" className="bg-[#090d16]">Follow-Up & Reminder</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Desired Tone</label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="Professional & Executive" className="bg-[#090d16]">Professional & Executive</option>
                  <option value="Warm, Welcoming & Friendly" className="bg-[#090d16]">Warm, Welcoming & Friendly</option>
                  <option value="Direct, Firm & Urgent" className="bg-[#090d16]">Direct, Firm & Urgent</option>
                  <option value="Persuasive & Engaging" className="bg-[#090d16]">Persuasive & Engaging</option>
                  <option value="Formal Corporate" className="bg-[#090d16]">Formal Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Recipient Name / Context</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera (Data Annotation Specialist / Client Lead)"
                  value={aiRecipientName}
                  onChange={(e) => setAiRecipientName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span>Describe Details or Write a Paragraph Prompt</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Write details or a full paragraph here (e.g. Mention that the speech dataset annotation project is 99% complete, final accuracy audit passed, and request scheduling a review meeting for Friday at 3 PM)..."
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-purple-400 leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateAiEmail}
                disabled={isGeneratingAi}
                className="w-full min-h-[44px] py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-display text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-purple-600/20"
              >
                {isGeneratingAi ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Wand2 className="w-4 h-4 text-white" />} Generate High Quality Structured Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. REAL-TIME RESPONSIVE HTML EMAIL PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="w-full max-w-4xl bg-[#090d16] border border-white/15 rounded-3xl p-4 sm:p-6 flex flex-col shadow-2xl font-mono text-xs max-h-[92vh] sm:max-h-[88vh] h-[850px] max-w-full overflow-hidden">
            {/* Modal Top Navigation Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Live Email Preview</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold hidden sm:inline-block">
                  {previewDevice === 'mobile' ? 'Mobile View (360px)' : 'Desktop View (Full Width)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all ${
                      previewDevice === 'desktop' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all ${
                      previewDevice === 'mobile' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer transition-all"
                  title="Close Live Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Email Canvas Container (Scrollable Frame) */}
            <div className="flex-1 min-h-0 bg-[#050505] p-3 sm:p-6 rounded-2xl border border-white/10 my-2 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <div
                className={`bg-white text-slate-900 rounded-2xl p-4 sm:p-8 space-y-4 shadow-2xl font-sans text-xs sm:text-sm transition-all duration-300 my-auto min-h-fit max-w-full overflow-hidden border border-slate-200 ${
                  previewDevice === 'mobile' ? 'w-[320px] sm:w-[365px]' : 'w-full max-w-2xl'
                }`}
              >
                {/* Email Envelope Header */}
                <div className="border-b border-slate-200 pb-3 space-y-1 font-mono text-xs">
                  <div className="text-[11px] text-slate-500 truncate">From: <strong className="text-slate-800">{selectedSender}</strong></div>
                  <div className="text-[11px] text-slate-500 truncate">To: <strong className="text-slate-800">{toChips.join(', ') || 'recipients@domain.com'}</strong></div>
                  {ccChips.length > 0 && <div className="text-[11px] text-slate-500 truncate">CC: {ccChips.join(', ')}</div>}
                  {bccChips.length > 0 && <div className="text-[11px] text-slate-500 truncate">BCC: {bccChips.join(', ')}</div>}
                  <div className="text-sm font-bold text-slate-900 pt-1.5 break-words font-display">{subject || 'No Subject'}</div>
                </div>

                {/* Email Body Content */}
                <div
                  dangerouslySetInnerHTML={{ __html: editorRef.current ? editorRef.current.innerHTML : (htmlContent || '<p>No content entered yet.</p>') }}
                  className="leading-relaxed text-slate-800 font-sans space-y-3 text-xs sm:text-sm break-words [word-break:break-word] overflow-wrap-break-word max-w-full overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full [&_table]:block [&_table]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words"
                />

                {/* Attachments Preview if any */}
                {attachments.length > 0 && (
                  <div className="border-t border-slate-200 pt-3 space-y-2 font-mono">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <span>📎 Attachments ({attachments.length}):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {attachments.map((att) => (
                        <div key={att.id} className="p-2 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between text-slate-700 truncate">
                          <span className="truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-500 shrink-0 font-bold">{(att.size / 1024).toFixed(0)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SENT HISTORY LOGS MODAL */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="w-full max-w-3xl bg-[#090d16] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl font-mono text-xs max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Sent Email History Logs</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                  {historyLogs.length} Dispatched Records
                </span>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-cyan-400 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Fetching sent history logs...
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="font-bold text-white text-sm">No Sent History Logs Found</div>
                  <p className="text-xs">Emails sent from your portal session will be recorded here.</p>
                </div>
              ) : (
                historyLogs.map((log, idx) => {
                  const r = (userProfile?.role || '').toLowerCase();
                  const isPrivileged = r === 'admin' || r === 'super_admin' || r === 'hr' || Boolean(userProfile?.isSuperAdmin);

                  const maskEmailAddress = (emailStr: string) => {
                    if (!emailStr) return '';
                    if (isPrivileged) return emailStr;
                    const parts = emailStr.split('@');
                    if (parts.length !== 2) return emailStr;
                    const local = parts[0];
                    const domain = parts[1];
                    const maskedLocal = local.length <= 3 ? local[0] + '***' : local.slice(0, 3) + '***';
                    const domainParts = domain.split('.');
                    const dName = domainParts[0];
                    const ext = domainParts.slice(1).join('.');
                    const maskedDomain = dName.length <= 3 ? dName[0] + '***' : dName.slice(0, 2) + '***';
                    return `${maskedLocal}@${maskedDomain}.${ext}`;
                  };

                  const maskTextPreview = (textStr: string) => {
                    if (!textStr) return '';
                    if (isPrivileged) return textStr;
                    const clean = textStr.replace(/<[^>]*>/g, '').trim();
                    if (clean.length <= 4) return clean[0] + '***';
                    return clean.slice(0, 2) + '***' + clean.slice(-1);
                  };

                  const displaySender = maskEmailAddress(log.sender || '');
                  const displayRecipients = Array.isArray(log.recipients)
                    ? log.recipients.map(maskEmailAddress).join(', ')
                    : maskEmailAddress(log.recipients || '');
                  const displaySubject = isPrivileged ? (log.subject || '(No Subject)') : maskTextPreview(log.subject || 'Subject');
                  const displayHtml = isPrivileged
                    ? (log.html || '<p>(No content)</p>')
                    : `<p>${maskTextPreview(log.html || 'Content')}</p>`;

                  const realAttachments = Array.isArray(log.attachments_meta)
                    ? log.attachments_meta.filter(
                        (a: any) => a && typeof a === 'object' && !a._sender_account_email && (a.name || a.filename || a.type || a.content)
                      )
                    : [];

                  return (
                    <div
                      key={log.id || log.messageId || idx}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 hover:border-cyan-500/30 transition-all font-mono"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-2">
                        <div className="font-bold text-cyan-300 text-xs truncate">
                          From: <span className="text-white">{displaySender}</span> &bull; To: <span className="text-white">{displayRecipients}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-white text-xs">{displaySubject}</div>
                        <div
                          dangerouslySetInnerHTML={{ __html: displayHtml }}
                          className="text-[11px] text-slate-300 line-clamp-2 max-h-12 overflow-hidden text-ellipsis [&_p]:m-0"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                          ✓ {log.status || 'SENT'}
                        </span>
                        {realAttachments.length > 0 && (
                          <span className="text-cyan-400 font-bold">📎 {realAttachments.length} Attachment(s)</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. SCHEDULE SEND DATE/TIME POPOVER MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#090d16] border border-amber-500/40 rounded-3xl p-6 space-y-5 shadow-2xl font-mono text-xs text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                {editingScheduledId ? 'Edit Scheduled Time' : 'Schedule Email'}
              </h3>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                  Send On Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={scheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                  Time *
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                  Timezone
                </label>
                <select
                  value={scheduleTimezone}
                  onChange={(e) => setScheduleTimezone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 font-bold focus:outline-none focus:border-amber-400 cursor-pointer appearance-none pr-8"
                >
                  <option value="Asia/Kolkata" className="bg-[#090d16]">Asia/Kolkata (IST - UTC+05:30)</option>
                  <option value="UTC" className="bg-[#090d16]">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York" className="bg-[#090d16]">America/New_York (EST / EDT)</option>
                  <option value="Europe/London" className="bg-[#090d16]">Europe/London (GMT / BST)</option>
                  <option value="Asia/Dubai" className="bg-[#090d16]">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore" className="bg-[#090d16]">Asia/Singapore (SGT)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={isSchedulingSubmit}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-display transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isSchedulingSubmit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-black" />
                    <span>{editingScheduledId ? 'Update Schedule' : 'Schedule Email'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. SCHEDULED EMAILS MANAGEMENT MODAL */}
      {isScheduledListModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-3xl bg-[#090d16] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" /> Scheduled Emails
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Emails waiting to be sent automatically.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadScheduledLogs(scheduledFilter)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingScheduled ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button
                  onClick={() => setIsScheduledListModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
              {['scheduled', 'processing', 'sent', 'failed', 'cancelled', 'all'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setScheduledFilter(st);
                    loadScheduledLogs(st);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all shrink-0 cursor-pointer ${
                    scheduledFilter === st
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Cards List */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {isLoadingScheduled ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span>Loading scheduled email records...</span>
                </div>
              ) : scheduledLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-1">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="font-bold text-slate-300">No Scheduled Emails Found</div>
                  <div>No emails found matching status filter "{scheduledFilter}".</div>
                </div>
              ) : (
                scheduledLogs.map((item) => {
                  const toDisplay = Array.isArray(item.to_emails) ? item.to_emails.join(', ') : item.to_emails;
                  const attCount = Array.isArray(item.attachments) ? item.attachments.length : 0;
                  const scheduledDateFormatted = new Date(item.scheduled_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                  let statusBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  if (item.status === 'sent') statusBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  if (item.status === 'failed') statusBadgeClass = 'bg-red-500/20 text-red-300 border-red-500/40';
                  if (item.status === 'cancelled') statusBadgeClass = 'bg-slate-500/20 text-slate-400 border-slate-500/40';
                  if (item.status === 'processing') statusBadgeClass = 'bg-amber-500/30 text-amber-200 border-amber-500/50 animate-pulse';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 font-mono text-xs relative"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate text-xs">{item.from_email}</div>
                          <div className="text-[11px] text-slate-400 truncate">To: <span className="text-cyan-300 font-bold">{toDisplay}</span></div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${statusBadgeClass}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-amber-200 text-xs">{item.subject}</div>
                        {item.body_text && (
                          <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {item.body_text}
                          </div>
                        )}
                      </div>

                      {item.failure_reason && (
                        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[10px]">
                          <strong>Failure:</strong> {item.failure_reason}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5 text-[11px]">
                        <div className="flex items-center gap-3 text-slate-400">
                          <span className="flex items-center gap-1 text-amber-300 font-bold">
                            <Clock className="w-3.5 h-3.5" /> Scheduled: {scheduledDateFormatted} ({item.timezone || 'IST'})
                          </span>
                          {attCount > 0 && (
                            <span className="text-cyan-400 font-bold">📎 {attCount} attachment(s)</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'scheduled' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditScheduledItem(item)}
                                className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold cursor-pointer transition-all"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancelScheduledItem(item.id)}
                                className="px-3 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold cursor-pointer transition-all"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {item.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => handleRetryScheduledItem(item.id)}
                              className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold cursor-pointer transition-all"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. PROFESSIONAL FOOTER */}
      <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-mono gap-2">
        <div>© 2026 Zenemoo Enterprise Email System. All Rights Reserved.</div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold">✓ Verified Brevo SMTP Gateway</span>
          <span>&bull;</span>
          <span className="text-cyan-400">AES-256 Encrypted Audit Trail</span>
        </div>
      </div>
    </div>
  );
};
