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
  Heading1,
  Heading2,
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
} from 'lucide-react';
import { emailApi } from '../services/api';

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
<p>We would like to invite you for a 45-minute technical and cultural discussion with our engineering leadership team.</p>
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
<p>On behalf of <strong>Zenemoo AI Solutions Pvt. Ltd.</strong>, I am delighted to offer you the position of <strong>Team Specialist</strong> in our engineering division!</p>
<p>We believe your skills and expertise will be valuable additions to our AI engine team.</p>
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
    id: 'sangita',
    name: 'Sangita Sahoo',
    title: 'HR & Quality Assurance Lead',
    department: 'Human Resources & QA',
    email: 'sangita@zenemoo.in',
    phone: '+91 (080) 4920-1100',
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
    id: 'support',
    name: 'Zenemoo Support Team',
    title: 'Enterprise Customer Operations',
    department: 'Client Partner Support',
    email: 'support@zenemoo.in',
    phone: '+91 (080) 4920-1200',
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
  const [attachments, setAttachments] = useState<File[]>([]);

  // 5. Signature State
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('sangita');

  // 6. UI Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // 7. AI Assistant State
  const [aiPurpose, setAiPurpose] = useState('Interview Invitation');
  const [aiTone, setAiTone] = useState('Professional');
  const [aiRecipientName, setAiRecipientName] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // 8. Auto-Save Draft State
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Auto-fill sender if user email is authorized
  useEffect(() => {
    if (userProfile && userProfile.email && AUTHORIZED_SENDER_EMAILS.includes(userProfile.email)) {
      setSelectedSender(userProfile.email);
    }
  }, [userProfile]);

  // Sync contenteditable editor when htmlContent changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== htmlContent) {
      editorRef.current.innerHTML = htmlContent;
    }
  }, [htmlContent]);

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
        localStorage.setItem('zenemoo_hr_email_draft', JSON.stringify(draftData));
        setLastSavedTime(draftData.updatedAt);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [selectedSender, toChips, ccChips, bccChips, subject, htmlContent]);

  // Load Saved Draft on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zenemoo_hr_email_draft');
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
  }, []);

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

  const handleApplyTemplate = (template: HRTemplate) => {
    setSubject(template.subject);
    const sig = PRESET_SIGNATURES.find((s) => s.id === selectedSignatureId);
    let fullHtml = template.body;
    if (sig) {
      fullHtml += `<br/><hr/><p style="color:#06b6d4; font-weight:bold; margin-bottom:2px;">${sig.name}</p><p style="color:#94a3b8; font-size:12px; margin:0;">${sig.title} &bull; ${sig.department}</p><p style="color:#64748b; font-size:11px; margin:0;">Zenemoo AI Solutions Pvt. Ltd.</p>`;
    }
    setHtmlContent(fullHtml);
    setIsTemplateModalOpen(false);
    showToast(`Template "${template.name}" applied!`, 'success');
  };

  const handleAppendSignature = () => {
    const sig = PRESET_SIGNATURES.find((s) => s.id === selectedSignatureId);
    if (!sig) return;
    const sigHtml = `<br/><div style="margin-top:16px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.1);"><p style="color:#06b6d4; font-weight:bold; margin-bottom:2px;">${sig.name}</p><p style="color:#94a3b8; font-size:12px; margin:0;">${sig.title} &bull; ${sig.department}</p><p style="color:#64748b; font-size:11px; margin:0;">Zenemoo AI Solutions Pvt. Ltd. | ${sig.email}</p></div>`;
    setHtmlContent((prev) => prev + sigHtml);
    showToast(`Signature for ${sig.name} appended.`, 'success');
  };

  // AI Email Generator Simulation / Groq call
  const handleGenerateAiEmail = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      let aiSubj = `${aiPurpose} — Zenemoo AI Solutions`;
      let aiBody = `<p>Dear ${aiRecipientName || 'Candidate/Partner'},</p><p>I am writing to reach out regarding <strong>${aiPurpose}</strong> at Zenemoo AI Solutions.</p><p>We are dedicated to building state-of-the-art enterprise AI systems and would love to move forward with our collaboration seamlessly.</p><p>Please let us know your preferred availability or any questions you may have.</p><p>Best regards,</p>`;

      if (aiPurpose.toLowerCase().includes('offer')) {
        aiSubj = `Official Employment Offer — Zenemoo AI Solutions`;
        aiBody = `<p>Dear ${aiRecipientName || 'Candidate'},</p><p>We are delighted to extend a formal offer of employment to join <strong>Zenemoo AI Solutions</strong> as part of our Engineering & HR operations team!</p><p>Please find attached the official offer summary details. We look forward to welcoming you aboard.</p><p>Warm regards,</p>`;
      }

      setSubject(aiSubj);
      setHtmlContent(aiBody);
      setIsGeneratingAi(false);
      setIsAiModalOpen(false);
      showToast('✨ Email generated via AI successfully!', 'success');
    }, 1200);
  };

  // Attachment Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  // Send Email Final Submission
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    // Process any remaining recipient inputs
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

    setIsSending(true);
    try {
      const payload = {
        sender: selectedSender,
        recipients: currentTo.join(', '),
        cc: ccChips.join(', '),
        bcc: bccChips.join(', '),
        subject,
        html: currentContent,
      };

      const res = await emailApi.send(payload);
      if (res.data && res.data.success) {
        showToast('🚀 Email dispatched successfully via Brevo SMTP Engine!', 'success');
        // Clear composer state & draft
        setToChips([]);
        setCcChips([]);
        setBccChips([]);
        setSubject('');
        setHtmlContent('');
        if (editorRef.current) editorRef.current.innerHTML = '';
        setAttachments([]);
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
    <div className="glass-panel p-4 sm:p-7 rounded-3xl border border-emerald-500/30 space-y-6 font-mono text-xs shadow-2xl relative">
      {/* 1. Header Bar with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" /> Enterprise HR Email Composer
            </h2>
            {lastSavedTime && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px]">
                Draft saved {lastSavedTime}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Compose and dispatch verified company communications via Brevo SMTP.</p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" /> Templates
          </button>

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> ✨ AI Writer
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" /> Preview
          </button>
        </div>
      </div>

      {/* 2. Main Compose Form */}
      <form onSubmit={handleSendEmail} className="space-y-4 font-mono">
        {/* Row A: Authorized Sender Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-slate-300 font-bold mb-1.5 text-[11px] uppercase tracking-wider">
              From Sender Identity *
            </label>
            <div className="relative">
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-400 appearance-none cursor-pointer pr-10"
              >
                {AUTHORIZED_SENDER_EMAILS.map((email) => (
                  <option key={email} value={email} className="bg-[#090d16] text-white">
                    {email}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end justify-between">
            <span className="text-[11px] text-slate-400 mb-2">
              Assigned Permissions: <strong className="text-emerald-400">Authorized HR Dispatcher</strong>
            </span>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs">
              {!showCC && (
                <button
                  type="button"
                  onClick={() => setShowCC(true)}
                  className="text-cyan-400 hover:underline cursor-pointer font-bold"
                >
                  + Add CC
                </button>
              )}
              {!showBCC && (
                <button
                  type="button"
                  onClick={() => setShowBCC(true)}
                  className="text-cyan-400 hover:underline cursor-pointer font-bold"
                >
                  + Add BCC
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row B: TO Recipient Chips Input */}
        <div>
          <label className="block text-slate-300 font-bold mb-1.5 text-[11px] uppercase tracking-wider">
            To Recipients *
          </label>
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-emerald-400 flex flex-wrap items-center gap-2 min-h-[44px]">
            {toChips.map((email, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5"
              >
                {email}
                <button
                  type="button"
                  onClick={() => setToChips(toChips.filter((_, i) => i !== idx))}
                  className="hover:text-red-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <input
              type="text"
              placeholder={toChips.length === 0 ? 'Type email addresses and press Enter or Comma...' : 'Add more...'}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={(e) => handleKeyDownRecipient(e, toInput, toChips, setToChips, setToInput)}
              onPaste={(e) => handlePasteRecipient(e, toChips, setToChips, setToInput)}
              onBlur={() => handleAddChip(toInput, toChips, setToChips, setToInput)}
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-[200px]"
            />
          </div>
        </div>

        {/* Row C: CC Recipient Chips Input */}
        {showCC && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wider">CC Recipients</label>
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
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-cyan-400 flex flex-wrap items-center gap-2 min-h-[44px]">
              {ccChips.map((email, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => setCcChips(ccChips.filter((_, i) => i !== idx))}
                    className="hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder="Type CC email address..."
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => handleKeyDownRecipient(e, ccInput, ccChips, setCcChips, setCcInput)}
                onPaste={(e) => handlePasteRecipient(e, ccChips, setCcChips, setCcInput)}
                onBlur={() => handleAddChip(ccInput, ccChips, setCcChips, setCcInput)}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-[200px]"
              />
            </div>
          </div>
        )}

        {/* Row D: BCC Recipient Chips Input */}
        {showBCC && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wider">BCC Recipients</label>
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
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-purple-400 flex flex-wrap items-center gap-2 min-h-[44px]">
              {bccChips.map((email, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1.5"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => setBccChips(bccChips.filter((_, i) => i !== idx))}
                    className="hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder="Type BCC email address..."
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                onKeyDown={(e) => handleKeyDownRecipient(e, bccInput, bccChips, setBccChips, setBccInput)}
                onPaste={(e) => handlePasteRecipient(e, bccChips, setBccChips, setBccInput)}
                onBlur={() => handleAddChip(bccInput, bccChips, setBccChips, setBccInput)}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-[200px]"
              />
            </div>
          </div>
        )}

        {/* Row E: Email Subject Input */}
        <div>
          <label className="block text-slate-300 font-bold mb-1.5 text-[11px] uppercase tracking-wider">
            Email Subject Line *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Zenemoo HR Operations & Opportunity Follow-up"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-400 min-h-[44px]"
          />
        </div>

        {/* Row F: Rich Text Formatting Toolbar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wider">
              Email Message Body Content *
            </label>
            <div className="flex items-center gap-3">
              <label className="text-[10px] text-slate-400">Append Signature:</label>
              <select
                value={selectedSignatureId}
                onChange={(e) => setSelectedSignatureId(e.target.value)}
                className="bg-white/[0.04] border border-white/10 text-cyan-300 text-[11px] font-mono rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                {PRESET_SIGNATURES.map((sig) => (
                  <option key={sig.id} value={sig.id} className="bg-[#090d16] text-white">
                    {sig.name} ({sig.title})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAppendSignature}
                className="text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                + Insert
              </button>
            </div>
          </div>

          {/* Formatting Controls Toolbar */}
          <div className="p-2 rounded-t-2xl bg-white/[0.06] border border-white/10 border-b-0 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => execFormatCommand('bold')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('italic')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('underline')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('strikeThrough')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => execFormatCommand('formatBlock', '<h2>')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer font-bold text-xs"
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('formatBlock', '<h3>')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer font-bold text-xs"
              title="Heading 3"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('formatBlock', '<p>')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer text-xs"
              title="Normal Paragraph"
            >
              P
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => execFormatCommand('insertUnorderedList')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('insertOrderedList')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => execFormatCommand('justifyLeft')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('justifyCenter')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('justifyRight')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter link URL:');
                if (url) execFormatCommand('createLink', url);
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Insert Link"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execFormatCommand('insertHorizontalRule')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Horizontal Line"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => execFormatCommand('removeFormat')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-red-400 hover:text-red-300 cursor-pointer text-xs"
              title="Clear Formatting"
            >
              Clear
            </button>
          </div>

          {/* Editable HTML Content Area */}
          <div
            ref={editorRef}
            contentEditable
            onInput={() => {
              if (editorRef.current) {
                setHtmlContent(editorRef.current.innerHTML);
              }
            }}
            className="w-full min-h-[220px] max-h-[400px] overflow-y-auto p-4 rounded-b-2xl bg-white/[0.03] border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-emerald-400 leading-relaxed"
          />
        </div>

        {/* Row G: Attachments UI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-slate-300 font-bold text-[11px] uppercase tracking-wider">
              File Attachments
            </label>
            <label
              htmlFor="email-file-attachment"
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-cyan-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Paperclip className="w-3.5 h-3.5" /> Attach File (PDF, DOCX, Images)
            </label>
            <input
              id="email-file-attachment"
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs font-mono"
                >
                  <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-white truncate max-w-[150px]">{file.name}</span>
                  <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row H: Send Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSending}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold font-display text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-600/20 min-h-[44px]"
          >
            {isSending ? <RefreshCw className="w-4.5 h-4.5 animate-spin text-black" /> : <Send className="w-4.5 h-4.5 text-black" />} Dispatch Email via Brevo
          </button>
        </div>
      </form>

      {/* 3. TEMPLATES SELECTION MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#090d16] border border-white/15 rounded-3xl p-6 space-y-5 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Pre-loaded HR Email Templates
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

      {/* 4. AI EMAIL WRITER MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#090d16] border border-purple-500/40 rounded-3xl p-6 space-y-5 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
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
                <label className="block text-slate-300 font-bold mb-1.5">Email Purpose / Type</label>
                <select
                  value={aiPurpose}
                  onChange={(e) => setAiPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="Interview Invitation" className="bg-[#090d16]">Interview Invitation</option>
                  <option value="Job Offer Letter" className="bg-[#090d16]">Job Offer Letter</option>
                  <option value="Project Assignment" className="bg-[#090d16]">Project Assignment</option>
                  <option value="Client Follow-up" className="bg-[#090d16]">Client Follow-up</option>
                  <option value="Performance Feedback" className="bg-[#090d16]">Performance Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Desired Tone</label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="Professional" className="bg-[#090d16]">Professional & Executive</option>
                  <option value="Warm & Welcoming" className="bg-[#090d16]">Warm & Welcoming</option>
                  <option value="Direct & Urgent" className="bg-[#090d16]">Direct & Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Recipient Name / Context</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera (Senior Developer Candidate)"
                  value={aiRecipientName}
                  onChange={(e) => setAiRecipientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateAiEmail}
                disabled={isGeneratingAi}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-display text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-purple-600/20"
              >
                {isGeneratingAi ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Wand2 className="w-4 h-4 text-white" />} Generate Email with Groq AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. REAL-TIME HTML EMAIL PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#090d16] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Live Email Preview</h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Device Switcher */}
                <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer ${
                      previewDevice === 'desktop' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer ${
                      previewDevice === 'mobile' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </button>
                </div>

                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Email Container Frame */}
            <div className="flex justify-center bg-[#050505] p-4 rounded-2xl border border-white/10 max-h-[500px] overflow-y-auto">
              <div
                className={`bg-white text-slate-900 rounded-2xl p-6 space-y-4 shadow-2xl font-sans text-xs transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-[360px]' : 'w-full max-w-2xl'
                }`}
              >
                <div className="border-b border-slate-200 pb-3 space-y-1 font-mono">
                  <div className="text-[11px] text-slate-500">From: <strong className="text-slate-800">{selectedSender}</strong></div>
                  <div className="text-[11px] text-slate-500">To: <strong className="text-slate-800">{toChips.join(', ') || 'recipients@domain.com'}</strong></div>
                  {ccChips.length > 0 && <div className="text-[11px] text-slate-500">CC: {ccChips.join(', ')}</div>}
                  <div className="text-sm font-bold text-slate-900 pt-1">{subject || 'No Subject'}</div>
                </div>

                {/* Render HTML Body */}
                <div
                  dangerouslySetInnerHTML={{ __html: editorRef.current ? editorRef.current.innerHTML : (htmlContent || '<p>No content entered yet.</p>') }}
                  className="leading-relaxed text-slate-800 font-sans space-y-2"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
