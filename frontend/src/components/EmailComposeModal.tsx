import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  CornerUpLeft,
  Forward as ForwardIcon,
  ChevronDown,
  Paperclip,
  Loader2,
  AlertCircle,
  FileText,
  Trash2,
  Sliders
} from 'lucide-react';
import { emailApi, emailInboxApi } from '../services/api';
import { EmailMessageRecord } from './AdminEmailInboxTab';
import {
  decodeMimeHeader,
  normalizeMojibake,
  formatReplySubject,
  formatForwardSubject,
  getSignatureForSender,
  SIGNATURE_PRESETS,
  EmailSignatureOption,
} from '../utils/emailEncodingHelper';

const VERIFIED_SENDERS = [
  { email: 'contact@zenemoo.in', label: 'Zenemoo Business Team (contact@zenemoo.in)' },
  { email: 'support@zenemoo.in', label: 'Zenemoo Customer Support (support@zenemoo.in)' },
  { email: 'info@zenemoo.in', label: 'Zenemoo Information Desk (info@zenemoo.in)' },
  { email: 'prem@zenemoo.in', label: 'Prem Founder (prem@zenemoo.in)' },
  { email: 'hemanta@zenemoo.in', label: 'Hemanta Kumar Sahu (hemanta@zenemoo.in)' },
  { email: 'sangita@zenemoo.in', label: 'Sangita HR (sangita@zenemoo.in)' },
  { email: 'noreply@zenemoo.in', label: 'Zenemoo System (noreply@zenemoo.in)' },
];

export interface AttachmentFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

export interface ComposerDraft {
  fromSender: string;
  toRecipients: string;
  showCc: boolean;
  ccRecipients: string;
  showBcc: boolean;
  bccRecipients: string;
  subject: string;
  messageText: string;
  selectedSignatureId: string; // 'auto' | 'none' | signatureId
  appliedSignatureText: string;
  attachments: AttachmentFileItem[];
  errorMsg: string | null;
}

// Module-level persistent drafts store (Survives inbox polling & component re-renders)
const composerDraftsStore: Record<string, ComposerDraft> = {};

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'reply' | 'forward';
  originalEmail: EmailMessageRecord;
  onSendSuccess: (sentRecord: EmailMessageRecord) => void;
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const EmailComposeModal: React.FC<EmailComposeModalProps> = ({
  isOpen,
  onClose,
  mode,
  originalEmail,
  onSendSuccess,
  addToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Stable draft key for current email + mode
  const emailId = originalEmail ? originalEmail.id || originalEmail.message_id : '';
  const draftKey = `${mode}_${emailId}`;

  const [fromSender, setFromSenderState] = useState<string>('contact@zenemoo.in');
  const [toRecipients, setToRecipientsState] = useState<string>('');
  const [showCc, setShowCcState] = useState<boolean>(false);
  const [showBcc, setShowBccState] = useState<boolean>(false);
  const [ccRecipients, setCcRecipientsState] = useState<string>('');
  const [bccRecipients, setBccRecipientsState] = useState<string>('');
  const [subject, setSubjectState] = useState<string>('');
  const [messageText, setMessageTextState] = useState<string>('');
  const [selectedSignatureId, setSelectedSignatureIdState] = useState<string>('auto');
  const [appliedSignatureText, setAppliedSignatureTextState] = useState<string>('');
  const [attachments, setAttachmentsState] = useState<AttachmentFileItem[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsgState] = useState<string | null>(null);

  // Helper to sync local states into persistent draft store
  const updateDraft = (updates: Partial<ComposerDraft>) => {
    if (!draftKey) return;
    const existing = composerDraftsStore[draftKey] || {
      fromSender,
      toRecipients,
      showCc,
      ccRecipients,
      showBcc,
      bccRecipients,
      subject,
      messageText,
      selectedSignatureId,
      appliedSignatureText,
      attachments,
      errorMsg,
    };
    composerDraftsStore[draftKey] = { ...existing, ...updates };
  };

  // State setters that automatically sync to persistent draft store
  const setFromSender = (val: string) => {
    setFromSenderState(val);
    updateDraft({ fromSender: val });
  };
  const setToRecipients = (val: string) => {
    setToRecipientsState(val);
    updateDraft({ toRecipients: val });
  };
  const setShowCc = (val: boolean) => {
    setShowCcState(val);
    updateDraft({ showCc: val });
  };
  const setShowBcc = (val: boolean) => {
    setShowBccState(val);
    updateDraft({ showBcc: val });
  };
  const setCcRecipients = (val: string) => {
    setCcRecipientsState(val);
    updateDraft({ ccRecipients: val });
  };
  const setBccRecipients = (val: string) => {
    setBccRecipientsState(val);
    updateDraft({ bccRecipients: val });
  };
  const setSubject = (val: string) => {
    setSubjectState(val);
    updateDraft({ subject: val });
  };
  const setMessageText = (val: string) => {
    setMessageTextState(val);
    updateDraft({ messageText: val });
  };
  const setSelectedSignatureId = (val: string) => {
    setSelectedSignatureIdState(val);
    updateDraft({ selectedSignatureId: val });
  };
  const setAppliedSignatureText = (val: string) => {
    setAppliedSignatureTextState(val);
    updateDraft({ appliedSignatureText: val });
  };
  const setAttachments = (val: AttachmentFileItem[]) => {
    setAttachmentsState(val);
    updateDraft({ attachments: val });
  };
  const setErrorMsg = (val: string | null) => {
    setErrorMsgState(val);
    updateDraft({ errorMsg: val });
  };

  // Initialize or restore draft when modal opens or emailId/mode changes
  useEffect(() => {
    if (!isOpen || !originalEmail || !draftKey) return;

    // Check if a draft already exists for this emailId + mode
    const existingDraft = composerDraftsStore[draftKey];

    if (existingDraft) {
      // Restore existing user draft without resetting typing!
      setFromSenderState(existingDraft.fromSender);
      setToRecipientsState(existingDraft.toRecipients);
      setShowCcState(existingDraft.showCc);
      setShowBccState(existingDraft.showBcc);
      setCcRecipientsState(existingDraft.ccRecipients);
      setBccRecipientsState(existingDraft.bccRecipients);
      setSubjectState(existingDraft.subject);
      setMessageTextState(existingDraft.messageText);
      setSelectedSignatureIdState(existingDraft.selectedSignatureId);
      setAppliedSignatureTextState(existingDraft.appliedSignatureText);
      setAttachmentsState(existingDraft.attachments || []);
      setErrorMsgState(existingDraft.errorMsg);
    } else {
      // Initialize brand new draft once
      const matchingSender = VERIFIED_SENDERS.find(
        (s) => s.email.toLowerCase() === (originalEmail.mailbox_email || '').toLowerCase()
      );
      const initFrom = matchingSender ? matchingSender.email : 'contact@zenemoo.in';

      let initTo = '';
      if (mode === 'reply') {
        initTo = originalEmail.reply_to || originalEmail.sender_email || '';
      }

      const rawSub = originalEmail.subject || '';
      const initSubject = mode === 'reply' ? formatReplySubject(rawSub) : formatForwardSubject(rawSub);

      // Smart Default Signature setup
      const defaultSig = getSignatureForSender(initFrom);
      const initSigText = defaultSig ? defaultSig.signatureText : '';
      const initMessageText = initSigText ? `\n\n${initSigText}` : '';

      const newDraft: ComposerDraft = {
        fromSender: initFrom,
        toRecipients: initTo,
        showCc: false,
        ccRecipients: '',
        showBcc: false,
        bccRecipients: '',
        subject: initSubject,
        messageText: initMessageText,
        selectedSignatureId: 'auto',
        appliedSignatureText: initSigText,
        attachments: [],
        errorMsg: null,
      };

      composerDraftsStore[draftKey] = newDraft;

      setFromSenderState(newDraft.fromSender);
      setToRecipientsState(newDraft.toRecipients);
      setShowCcState(newDraft.showCc);
      setShowBccState(newDraft.showBcc);
      setCcRecipientsState(newDraft.ccRecipients);
      setBccRecipientsState(newDraft.bccRecipients);
      setSubjectState(newDraft.subject);
      setMessageTextState(newDraft.messageText);
      setSelectedSignatureIdState(newDraft.selectedSignatureId);
      setAppliedSignatureTextState(newDraft.appliedSignatureText);
      setAttachmentsState([]);
      setErrorMsgState(null);
    }
  }, [isOpen, draftKey]);

  if (!isOpen || !originalEmail) return null;

  // Handle changing signature selection (Signature ▾ dropdown)
  const handleSignatureChange = (newSigId: string) => {
    const targetSig = getSignatureForSender(fromSender, newSigId);
    const newSigText = targetSig ? targetSig.signatureText : '';

    let updatedMsg = messageText;

    if (appliedSignatureText && updatedMsg.includes(appliedSignatureText)) {
      // Replace existing signature block
      if (newSigText) {
        updatedMsg = updatedMsg.replace(appliedSignatureText, newSigText);
      } else {
        // Remove signature block
        updatedMsg = updatedMsg.replace(appliedSignatureText, '').trimEnd();
      }
    } else {
      // If signature text wasn't found (user edited it), append new signature at bottom
      if (newSigText) {
        updatedMsg = updatedMsg.trimEnd() + `\n\n${newSigText}`;
      }
    }

    setMessageText(updatedMsg);
    setSelectedSignatureId(newSigId);
    setAppliedSignatureText(newSigText);
  };

  // Handle changing FROM sender (Auto-updates signature in smart mode)
  const handleFromSenderChange = (newSender: string) => {
    setFromSender(newSender);

    if (selectedSignatureId === 'auto') {
      const targetSig = getSignatureForSender(newSender);
      const newSigText = targetSig ? targetSig.signatureText : '';

      let updatedMsg = messageText;
      if (appliedSignatureText && updatedMsg.includes(appliedSignatureText)) {
        if (newSigText) {
          updatedMsg = updatedMsg.replace(appliedSignatureText, newSigText);
        } else {
          updatedMsg = updatedMsg.replace(appliedSignatureText, '').trimEnd();
        }
      } else if (newSigText) {
        updatedMsg = updatedMsg.trimEnd() + `\n\n${newSigText}`;
      }

      setMessageText(updatedMsg);
      setAppliedSignatureText(newSigText);
    }
  };

  // Attachment File Upload Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    const newAttachments: AttachmentFileItem[] = selectedFiles.map((file) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(attachments.filter((a) => a.id !== attId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate email address array
  const parseAndValidateEmails = (input: string): { valid: string[]; invalid: string[] } => {
    const tokens = input
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    tokens.forEach((t) => {
      if (emailRegex.test(t)) {
        valid.push(t.toLowerCase());
      } else {
        invalid.push(t);
      }
    });

    return { valid, invalid };
  };

  const handleSend = async () => {
    setErrorMsg(null);

    // Validate To Recipients
    const { valid: validTo, invalid: invalidTo } = parseAndValidateEmails(toRecipients);
    if (invalidTo.length > 0) {
      setErrorMsg(`Invalid recipient email address: ${invalidTo.join(', ')}`);
      return;
    }
    if (validTo.length === 0) {
      setErrorMsg('Please specify at least one valid recipient email address.');
      return;
    }

    // Validate CC
    const { valid: validCc, invalid: invalidCc } = parseAndValidateEmails(ccRecipients);
    if (invalidCc.length > 0) {
      setErrorMsg(`Invalid CC email address: ${invalidCc.join(', ')}`);
      return;
    }

    // Validate BCC
    const { valid: validBcc, invalid: invalidBcc } = parseAndValidateEmails(bccRecipients);
    if (invalidBcc.length > 0) {
      setErrorMsg(`Invalid BCC email address: ${invalidBcc.join(', ')}`);
      return;
    }

    if (!subject.trim()) {
      setErrorMsg('Please enter a subject.');
      return;
    }

    if (!messageText.trim() && mode === 'reply') {
      setErrorMsg('Please write a message response.');
      return;
    }

    setIsSending(true);

    // Clean human-readable values for quote
    const decodedOriginalSenderName = decodeMimeHeader(originalEmail.sender_name);
    const decodedOriginalSubject = decodeMimeHeader(originalEmail.subject);
    const cleanUserText = normalizeMojibake(messageText.trim());
    const escapedUserText = cleanUserText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formattedUserMessage = `<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${escapedUserText}</div>`;

    const formattedDate = new Date(originalEmail.received_at).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let fullHtml = '';
    if (mode === 'reply') {
      const origSnippet = normalizeMojibake(originalEmail.body_text || originalEmail.snippet || '');
      const quotedBlock = `<br/><br/><div style="border-left: 2px solid #06b6d4; padding-left: 12px; margin-top: 16px; color: #64748b; font-family: system-ui, sans-serif; font-size: 13px;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 6px;">On ${formattedDate}, ${escapeHtml(decodedOriginalSenderName)} &lt;${escapeHtml(originalEmail.sender_email)}&gt; wrote:</div>
        <blockquote style="margin: 0; padding: 0; color: #475569; white-space: pre-wrap;">${escapeHtml(origSnippet)}</blockquote>
      </div>`;
      fullHtml = `${formattedUserMessage}${quotedBlock}`;
    } else {
      // Forward mode
      const origBody = originalEmail.body_html || `<div style="white-space: pre-wrap;">${escapeHtml(normalizeMojibake(originalEmail.body_text || originalEmail.snippet))}</div>`;
      const fwdHeader = `<br/><br/><div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 16px; font-family: system-ui, sans-serif; font-size: 13px; color: #475569;">
        <div style="font-weight: bold; color: #0f172a; margin-bottom: 6px;">---------- Forwarded message ----------</div>
        <div><strong>From:</strong> ${escapeHtml(decodedOriginalSenderName)} &lt;${escapeHtml(originalEmail.sender_email)}&gt;</div>
        <div><strong>Date:</strong> ${formattedDate}</div>
        <div><strong>Subject:</strong> ${escapeHtml(decodedOriginalSubject)}</div>
        <div><strong>To:</strong> ${escapeHtml(originalEmail.recipient_email)}</div>
        <br/>
        <div>${origBody}</div>
      </div>`;
      fullHtml = `${formattedUserMessage}${fwdHeader}`;
    }

    try {
      const payload = {
        sender: fromSender,
        from: fromSender,
        recipients: validTo.join(', '),
        to: validTo,
        cc: validCc.join(', '),
        bcc: validBcc.join(', '),
        subject,
        html: fullHtml,
        text: cleanUserText,
        mode,
        originalEmailId: originalEmail.id || originalEmail.message_id,
        attachmentCount: attachments.length,
      };

      let response: any;
      try {
        response = await emailApi.send(payload);
      } catch (e: any) {
        if (e.response && (e.response.status === 404 || e.response.status === 405)) {
          response = await emailInboxApi.sendEmail(payload);
        } else {
          throw e;
        }
      }

      if (response.data?.success) {
        addToast(
          'Email Sent',
          `✓ Email ${mode === 'reply' ? 'reply' : 'forward'} sent successfully via Brevo.`,
          'success'
        );

        const createdRecord: EmailMessageRecord = {
          id: String(response.data.entry?.id || response.data.messageId || `sent_${Date.now()}`),
          message_id: response.data.messageId || `msg_sent_${Date.now()}`,
          mailbox_email: fromSender,
          sender_name: 'Zenemoo',
          sender_email: fromSender,
          recipient_email: validTo.join(', '),
          reply_to: fromSender,
          subject,
          body_text: cleanUserText,
          body_html: fullHtml,
          snippet: cleanUserText.substring(0, 160) || 'Sent email',
          category: 'general',
          is_read: true,
          is_starred: false,
          is_archived: false,
          is_trashed: false,
          status: 'sent',
          sent_at: new Date().toISOString(),
          received_at: new Date().toISOString(),
          attachments: attachments.map((a) => ({
            id: a.id,
            filename: a.name,
            contentType: a.type,
            size: a.size,
          })),
        };

        // Clear sent draft from persistent store
        delete composerDraftsStore[draftKey];

        onSendSuccess(createdRecord);
        onClose();
      } else {
        setErrorMsg(response.data?.message || '✕ Failed to send email via Brevo.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message || '✕ Network error while sending email.';
      setErrorMsg(serverMsg);
    } finally {
      setIsSending(false);
    }
  };

  function escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const decodedSenderName = decodeMimeHeader(originalEmail.sender_name);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b0f19] border border-white/10 w-full sm:w-[680px] lg:w-[740px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] font-sans text-xs">
        
        {/* MODAL HEADER */}
        <div className="p-4 bg-[#070a11] border-b border-white/10 flex items-center justify-between font-mono shrink-0">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            {mode === 'reply' ? (
              <>
                <CornerUpLeft className="w-4 h-4 text-cyan-400" />
                <span>Reply to {decodedSenderName}</span>
              </>
            ) : (
              <>
                <ForwardIcon className="w-4 h-4 text-purple-400" />
                <span>Forward Message</span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY FORM */}
        <div className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 font-mono text-xs">
          
          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2.5 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
              <X className="w-3.5 h-3.5 cursor-pointer hover:text-white" onClick={() => setErrorMsg(null)} />
            </div>
          )}

          {/* FROM FIELD */}
          <div className="flex items-center gap-3">
            <span className="w-16 text-slate-400 font-bold shrink-0">From:</span>
            <div className="flex-1 relative min-w-0">
              <select
                value={fromSender}
                onChange={(e) => handleFromSenderChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none pr-8"
              >
                {VERIFIED_SENDERS.map((s) => (
                  <option key={s.email} value={s.email} className="bg-[#0b0f19] text-white">
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* TO FIELD */}
          <div className="flex items-center gap-3">
            <span className="w-16 text-slate-400 font-bold shrink-0">To:</span>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                type="text"
                placeholder="recipient@example.com, manager@org.io..."
                value={toRecipients}
                onChange={(e) => setToRecipients(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 min-w-0"
              />
              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CC FIELD */}
          {showCc && (
            <div className="flex items-center gap-3 animate-fade-in">
              <span className="w-16 text-slate-400 font-bold shrink-0">Cc:</span>
              <input
                type="text"
                placeholder="cc@example.com..."
                value={ccRecipients}
                onChange={(e) => setCcRecipients(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          {/* BCC FIELD */}
          {showBcc && (
            <div className="flex items-center gap-3 animate-fade-in">
              <span className="w-16 text-slate-400 font-bold shrink-0">Bcc:</span>
              <input
                type="text"
                placeholder="bcc@example.com..."
                value={bccRecipients}
                onChange={(e) => setBccRecipients(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          {/* SUBJECT FIELD */}
          <div className="flex items-center gap-3">
            <span className="w-16 text-slate-400 font-bold shrink-0">Subject:</span>
            <input
              type="text"
              placeholder="Subject title..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-bold"
            />
          </div>

          {/* TOOLBAR FOR SIGNATURE & ATTACHMENTS */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs font-mono">
            {/* SIGNATURE SELECTOR DROPDOWN (Signature ▾) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px]">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Signature:
              </span>
              <div className="relative">
                <select
                  value={selectedSignatureId}
                  onChange={(e) => handleSignatureChange(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none pr-7"
                >
                  <option value="auto" className="bg-[#0b0f19] text-cyan-300">
                    Auto (Sender Default)
                  </option>
                  <option value="none" className="bg-[#0b0f19] text-slate-400">
                    None (No Signature)
                  </option>
                  {SIGNATURE_PRESETS.map((sig) => (
                    <option key={sig.id} value={sig.id} className="bg-[#0b0f19] text-white">
                      {sig.name}
                    </option>
                  ))}
                  {typeof window !== 'undefined' && localStorage.getItem('zenemoo_admin_ai_signature') && (
                    <option value="custom" className="bg-[#0b0f19] text-amber-300">
                      Saved Custom Signature
                    </option>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>

            {/* ATTACH FILE BUTTON */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                <span>Attach Files</span>
              </button>
            </div>
          </div>

          {/* ATTACHMENTS LIST CHIPS */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-slate-200 text-[11px] font-mono flex items-center gap-2"
                >
                  <Paperclip className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[180px] font-bold">{att.name}</span>
                  <span className="text-slate-400 text-[10px]">({formatFileSize(att.size)})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-0.5 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* MESSAGE EDITOR TEXTAREA */}
          <div className="pt-1">
            <textarea
              ref={textareaRef}
              rows={8}
              placeholder={mode === 'reply' ? 'Write your reply message here...' : 'Write an optional introductory message...'}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-200 placeholder-slate-500 text-sm font-sans focus:outline-none focus:border-cyan-400 leading-relaxed resize-y"
            />
          </div>

          {/* QUOTED / FORWARDED MESSAGE PREVIEW */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>{mode === 'reply' ? 'Original Message Quote' : 'Forwarded Message Header'}</span>
              <span className="text-slate-500 font-normal">{new Date(originalEmail.received_at).toLocaleDateString()}</span>
            </div>

            <div className="text-slate-300 font-mono line-clamp-3 leading-relaxed opacity-80 break-words">
              {mode === 'reply' ? (
                <>On {new Date(originalEmail.received_at).toLocaleString()}, {decodedSenderName} wrote:<br />&gt; {normalizeMojibake(originalEmail.snippet || originalEmail.body_text || '')}</>
              ) : (
                <>---------- Forwarded message ----------<br />From: {decodedSenderName} &lt;{originalEmail.sender_email}&gt;<br />Subject: {decodeMimeHeader(originalEmail.subject)}</>
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#070a11] border-t border-white/10 flex items-center justify-between font-mono shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send {mode === 'reply' ? 'Reply' : 'Forward'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
