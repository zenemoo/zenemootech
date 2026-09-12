import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3,
  Check,
  Users,
  Eye,
  Download,
  Info,
} from 'lucide-react';
import { emailApi, emailInboxApi } from '../services/api';
import { EmailMessageRecord } from './AdminEmailInboxTab';
import {
  decodeMimeHeader,
  normalizeMojibake,
  normalizeEmailBody,
  formatReplySubject,
  formatForwardSubject,
  getSignatureForSender,
  SIGNATURE_PRESETS,
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
  file?: File;
  name: string;
  size: number;
  type: string;
  url?: string;
  isOriginal?: boolean;
}

export interface ComposerDraft {
  fromSender: string;
  toRecipients: string[];
  showCc: boolean;
  ccRecipients: string[];
  showBcc: boolean;
  bccRecipients: string[];
  subject: string;
  messageHtml: string;
  messageText: string;
  selectedSignatureId: string;
  appliedSignatureText: string;
  attachments: AttachmentFileItem[];
  forwardOriginalAttachments: boolean;
  errorMsg: string | null;
}

// Module-level persistent drafts store (Survives inbox polling & component re-renders)
const composerDraftsStore: Record<string, ComposerDraft> = {};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

function parseEmailTokens(input: string): string[] {
  return input
    .split(/[,;\s\n\r]+/)
    .map((t) => t.trim().toLowerCase().replace(/^[<"']+|[>"']+$/g, ''))
    .filter(Boolean);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// RECIPIENT CHIP INPUT COMPONENT (To / CC / BCC)
// ============================================================================
interface RecipientChipInputProps {
  label: string;
  recipients: string[];
  onChange: (recipients: string[]) => void;
  placeholder?: string;
  onCcClick?: () => void;
  onBccClick?: () => void;
  showCcButton?: boolean;
  showBccButton?: boolean;
}

const RecipientChipInput: React.FC<RecipientChipInputProps> = ({
  label,
  recipients,
  onChange,
  placeholder = 'Type email and press Enter...',
  onCcClick,
  onBccClick,
  showCcButton,
  showBccButton,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addRecipients = (raw: string) => {
    const tokens = parseEmailTokens(raw);
    if (tokens.length === 0) return;

    const currentSet = new Set(recipients.map((r) => r.toLowerCase()));
    const updated = [...recipients];

    tokens.forEach((t) => {
      if (!currentSet.has(t)) {
        currentSet.add(t);
        updated.push(t);
      }
    });

    onChange(updated);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      e.preventDefault();
      if (inputValue.trim()) {
        addRecipients(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      e.preventDefault();
      onChange(recipients.slice(0, recipients.length - 1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('text');
    if (pasteData && (pasteData.includes(',') || pasteData.includes(';') || pasteData.includes(' ') || pasteData.includes('\n'))) {
      e.preventDefault();
      addRecipients(pasteData);
    }
  };

  const handleRemove = (idxToRemove: number) => {
    onChange(recipients.filter((_, idx) => idx !== idxToRemove));
  };

  return (
    <div className="flex items-start gap-3 py-1">
      <span className="w-14 text-slate-400 font-bold shrink-0 pt-2 font-mono text-xs">{label}:</span>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.04] border border-white/10 min-h-[38px] cursor-text focus-within:border-cyan-400 transition-colors"
      >
        {recipients.map((email, idx) => {
          const valid = isValidEmail(email);
          return (
            <span
              key={`${email}_${idx}`}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono transition-all ${
                valid
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
              title={valid ? email : `Invalid email format: ${email}`}
            >
              <span>{email}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                className="p-0.5 rounded hover:bg-white/20 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) addRecipients(inputValue);
          }}
          placeholder={recipients.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[140px] bg-transparent text-white placeholder-slate-500 text-xs font-mono outline-none px-1 py-0.5"
        />

        <div className="flex items-center gap-2 ml-auto pr-1 text-[11px] font-mono shrink-0">
          {showCcButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCcClick?.();
              }}
              className="text-slate-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Cc
            </button>
          )}
          {showBccButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBccClick?.();
              }}
              className="text-slate-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Bcc
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN EMAIL COMPOSE MODAL (REPLY / REPLY ALL / FORWARD / NEW)
// ============================================================================
interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'reply' | 'replyAll' | 'forward' | 'new';
  originalEmail?: EmailMessageRecord | null;
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
  const editorRef = useRef<HTMLDivElement>(null);

  const effectiveMode = mode || (originalEmail ? 'reply' : 'new');
  const emailId = originalEmail ? originalEmail.id || originalEmail.message_id : 'new';
  const draftKey = `${effectiveMode}_${emailId}`;

  const [fromSender, setFromSenderState] = useState<string>('contact@zenemoo.in');
  const [toRecipients, setToRecipientsState] = useState<string[]>([]);
  const [showCc, setShowCcState] = useState<boolean>(false);
  const [showBcc, setShowBccState] = useState<boolean>(false);
  const [ccRecipients, setCcRecipientsState] = useState<string[]>([]);
  const [bccRecipients, setBccRecipientsState] = useState<string[]>([]);
  const [subject, setSubjectState] = useState<string>('');
  const [messageHtml, setMessageHtmlState] = useState<string>('');
  const [selectedSignatureId, setSelectedSignatureIdState] = useState<string>('auto');
  const [appliedSignatureText, setAppliedSignatureTextState] = useState<string>('');
  const [attachments, setAttachmentsState] = useState<AttachmentFileItem[]>([]);
  const [forwardOriginalAttachments, setForwardOriginalAttachmentsState] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsgState] = useState<string | null>(null);

  // Link Dialog Modal State
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>('https://');
  const [linkText, setLinkText] = useState<string>('');

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
      messageHtml,
      messageText: '',
      selectedSignatureId,
      appliedSignatureText,
      attachments,
      forwardOriginalAttachments,
      errorMsg,
    };
    composerDraftsStore[draftKey] = { ...existing, ...updates };
  };

  const setFromSender = (val: string) => {
    setFromSenderState(val);
    updateDraft({ fromSender: val });
  };
  const setToRecipients = (val: string[]) => {
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
  const setCcRecipients = (val: string[]) => {
    setCcRecipientsState(val);
    updateDraft({ ccRecipients: val });
  };
  const setBccRecipients = (val: string[]) => {
    setBccRecipientsState(val);
    updateDraft({ bccRecipients: val });
  };
  const setSubject = (val: string) => {
    setSubjectState(val);
    updateDraft({ subject: val });
  };
  const setMessageHtml = (val: string) => {
    setMessageHtmlState(val);
    updateDraft({ messageHtml: val });
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
  const setForwardOriginalAttachments = (val: boolean) => {
    setForwardOriginalAttachmentsState(val);
    updateDraft({ forwardOriginalAttachments: val });
  };
  const setErrorMsg = (val: string | null) => {
    setErrorMsgState(val);
    updateDraft({ errorMsg: val });
  };

  // Original email normalized body representation
  const normalizedOriginalBody = useMemo(() => {
    if (!originalEmail) return null;
    return normalizeEmailBody(originalEmail.body_text, originalEmail.body_html);
  }, [originalEmail?.body_text, originalEmail?.body_html]);

  // Initialize or restore draft when modal opens
  useEffect(() => {
    if (!isOpen || !draftKey) return;

    const existingDraft = composerDraftsStore[draftKey];

    if (existingDraft) {
      setFromSenderState(existingDraft.fromSender);
      setToRecipientsState(existingDraft.toRecipients || []);
      setShowCcState(existingDraft.showCc);
      setShowBccState(existingDraft.showBcc);
      setCcRecipientsState(existingDraft.ccRecipients || []);
      setBccRecipientsState(existingDraft.bccRecipients || []);
      setSubjectState(existingDraft.subject);
      setMessageHtmlState(existingDraft.messageHtml || '');
      setSelectedSignatureIdState(existingDraft.selectedSignatureId);
      setAppliedSignatureTextState(existingDraft.appliedSignatureText);
      setAttachmentsState(existingDraft.attachments || []);
      setForwardOriginalAttachmentsState(existingDraft.forwardOriginalAttachments ?? true);
      setErrorMsgState(existingDraft.errorMsg);

      if (editorRef.current) {
        editorRef.current.innerHTML = existingDraft.messageHtml || '';
      }
    } else {
      const matchingSender = originalEmail
        ? VERIFIED_SENDERS.find((s) => s.email.toLowerCase() === (originalEmail.mailbox_email || '').toLowerCase())
        : null;
      const initFrom = matchingSender ? matchingSender.email : 'contact@zenemoo.in';

      let initTo: string[] = [];
      let initCc: string[] = [];
      let showCcInit = false;

      if (effectiveMode === 'reply' && originalEmail) {
        const replyEmail = originalEmail.reply_to || originalEmail.sender_email;
        if (replyEmail) initTo = [replyEmail.trim().toLowerCase()];
      } else if (effectiveMode === 'replyAll' && originalEmail) {
        const replyEmail = originalEmail.reply_to || originalEmail.sender_email;
        const allOriginalRecipients = parseEmailTokens(originalEmail.recipient_email || '');
        const myMailbox = (originalEmail.mailbox_email || initFrom).toLowerCase();

        const toSet = new Set<string>();
        if (replyEmail) toSet.add(replyEmail.toLowerCase());
        allOriginalRecipients.forEach((addr) => {
          if (addr !== myMailbox && addr !== replyEmail.toLowerCase()) {
            toSet.add(addr);
          }
        });
        initTo = Array.from(toSet);
      } else if (effectiveMode === 'forward') {
        initTo = []; // Forward mode starts with empty recipient field for user entry
      }

      let initSubject = '';
      if (originalEmail) {
        const rawSub = originalEmail.subject || '';
        initSubject = effectiveMode === 'forward' ? formatForwardSubject(rawSub) : formatReplySubject(rawSub);
      }

      const defaultSig = getSignatureForSender(initFrom);
      const initSigText = defaultSig ? defaultSig.signatureText : '';

      // Prepare original attachments in forward mode
      let initAttachments: AttachmentFileItem[] = [];
      if (effectiveMode === 'forward' && originalEmail && Array.isArray(originalEmail.attachments) && originalEmail.attachments.length > 0) {
        initAttachments = originalEmail.attachments.map((att, idx) => ({
          id: att.id || `orig_att_${idx}`,
          name: att.filename,
          size: att.size,
          type: att.contentType,
          isOriginal: true,
        }));
      }

      const newDraft: ComposerDraft = {
        fromSender: initFrom,
        toRecipients: initTo,
        showCc: showCcInit,
        ccRecipients: initCc,
        showBcc: false,
        bccRecipients: [],
        subject: initSubject,
        messageHtml: '',
        messageText: '',
        selectedSignatureId: 'auto',
        appliedSignatureText: initSigText,
        attachments: initAttachments,
        forwardOriginalAttachments: true,
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
      setMessageHtmlState('');
      setSelectedSignatureIdState(newDraft.selectedSignatureId);
      setAppliedSignatureTextState(newDraft.appliedSignatureText);
      setAttachmentsState(initAttachments);
      setForwardOriginalAttachmentsState(true);
      setErrorMsgState(null);

      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [isOpen, draftKey]);

  // Rich Text Command Handlers
  const execFormat = useCallback((command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setMessageHtml(editorRef.current.innerHTML);
    }
  }, []);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        execFormat('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        execFormat('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        execFormat('underline');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleOpenLinkDialog();
      }
    }
  };

  const handleOpenLinkDialog = () => {
    const selection = window.getSelection();
    const selected = selection ? selection.toString() : '';
    setLinkText(selected);
    setLinkUrl('https://');
    setIsLinkDialogOpen(true);
  };

  const handleInsertLink = () => {
    let cleanUrl = linkUrl.trim();
    if (!cleanUrl) return;

    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (/^(javascript|vbscript|data):/i.test(cleanUrl)) {
      setErrorMsg('Unsafe link URL scheme.');
      return;
    }

    if (editorRef.current) {
      editorRef.current.focus();
    }

    if (linkText.trim()) {
      const linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #06b6d4; text-decoration: underline;">${escapeHtml(linkText)}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
    } else {
      document.execCommand('createLink', false, cleanUrl);
    }

    if (editorRef.current) {
      setMessageHtml(editorRef.current.innerHTML);
    }

    setIsLinkDialogOpen(false);
  };

  const handleSignatureChange = (newSigId: string) => {
    const targetSig = getSignatureForSender(fromSender, newSigId);
    const newSigText = targetSig ? targetSig.signatureText : '';
    setSelectedSignatureId(newSigId);
    setAppliedSignatureText(newSigText);
  };

  const handleFromSenderChange = (newSender: string) => {
    setFromSender(newSender);
    if (selectedSignatureId === 'auto') {
      const targetSig = getSignatureForSender(newSender);
      const newSigText = targetSig ? targetSig.signatureText : '';
      setAppliedSignatureText(newSigText);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    const newAttachments: AttachmentFileItem[] = selectedFiles.map((file) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      isOriginal: false,
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

  const handleSend = async () => {
    setErrorMsg(null);

    // Validate Recipients
    if (toRecipients.length === 0) {
      setErrorMsg('Please specify at least one recipient email address.');
      return;
    }

    const invalidTo = toRecipients.filter((e) => !isValidEmail(e));
    if (invalidTo.length > 0) {
      setErrorMsg(`Invalid recipient address: ${invalidTo.join(', ')}`);
      return;
    }

    const invalidCc = ccRecipients.filter((e) => !isValidEmail(e));
    if (invalidCc.length > 0) {
      setErrorMsg(`Invalid CC address: ${invalidCc.join(', ')}`);
      return;
    }

    const invalidBcc = bccRecipients.filter((e) => !isValidEmail(e));
    if (invalidBcc.length > 0) {
      setErrorMsg(`Invalid BCC address: ${invalidBcc.join(', ')}`);
      return;
    }

    if (!subject.trim()) {
      setErrorMsg('Please enter an email subject.');
      return;
    }

    const userHtml = editorRef.current ? editorRef.current.innerHTML.trim() : messageHtml.trim();
    const userPlainText = editorRef.current ? (editorRef.current.textContent || '').trim() : '';

    if (!userPlainText && (effectiveMode === 'reply' || effectiveMode === 'replyAll')) {
      setErrorMsg('Please write a message response.');
      return;
    }

    setIsSending(true);

    const decodedOriginalSenderName = originalEmail ? decodeMimeHeader(originalEmail.sender_name) : '';
    const decodedOriginalSubject = originalEmail ? decodeMimeHeader(originalEmail.subject) : '';

    const formattedDate = originalEmail
      ? new Date(originalEmail.received_at).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '';

    // Signature formatting
    const signatureHtml = appliedSignatureText
      ? `<div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #475569; white-space: pre-line;">${escapeHtml(appliedSignatureText)}</div>`
      : '';

    let fullHtml = '';
    if ((effectiveMode === 'reply' || effectiveMode === 'replyAll') && originalEmail) {
      const origSnippet = normalizedOriginalBody
        ? normalizedOriginalBody.plainText || originalEmail.snippet || ''
        : originalEmail.snippet || '';
      const quotedBlock = `<br/><br/><div style="border-left: 3px solid #0891b2; padding-left: 14px; margin-top: 20px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px;">
        <div style="font-weight: 600; color: #334155; margin-bottom: 6px;">On ${formattedDate}, ${escapeHtml(decodedOriginalSenderName)} &lt;${escapeHtml(originalEmail.sender_email)}&gt; wrote:</div>
        <blockquote style="margin: 0; padding: 0; color: #475569; line-height: 1.55; white-space: pre-wrap;">${escapeHtml(origSnippet)}</blockquote>
      </div>`;
      fullHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #1e293b; background-color: #ffffff;">${userHtml}${signatureHtml}${quotedBlock}</div>`;
    } else if (effectiveMode === 'forward' && originalEmail) {
      // Forward mode: robust sanitized HTML preservation
      const origContentHtml = normalizedOriginalBody
        ? normalizedOriginalBody.isHtml && normalizedOriginalBody.sanitizedHtml
          ? normalizedOriginalBody.sanitizedHtml
          : `<div style="white-space: pre-wrap; font-family: sans-serif; color: #1e293b;">${escapeHtml(normalizedOriginalBody.plainText || originalEmail.snippet)}</div>`
        : `<div style="white-space: pre-wrap; color: #1e293b;">${escapeHtml(originalEmail.snippet)}</div>`;

      const fwdHeader = `<br/><br/><div style="border-top: 1px solid #cbd5e1; padding-top: 14px; margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #334155;">
        <div style="font-weight: bold; color: #0f172a; margin-bottom: 8px;">---------- Forwarded message ---------</div>
        <div style="margin-bottom: 3px;"><strong>From:</strong> ${escapeHtml(decodedOriginalSenderName)} &lt;${escapeHtml(originalEmail.sender_email)}&gt;</div>
        <div style="margin-bottom: 3px;"><strong>Date:</strong> ${formattedDate}</div>
        <div style="margin-bottom: 3px;"><strong>Subject:</strong> ${escapeHtml(decodedOriginalSubject)}</div>
        <div style="margin-bottom: 3px;"><strong>To:</strong> ${escapeHtml(originalEmail.recipient_email)}</div>
        ${originalEmail.reply_to ? `<div style="margin-bottom: 3px;"><strong>Reply-To:</strong> ${escapeHtml(originalEmail.reply_to)}</div>` : ''}
        <br/>
        <div style="color: #1e293b; margin-top: 8px;">${origContentHtml}</div>
      </div>`;
      fullHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #1e293b; background-color: #ffffff;">${userHtml}${signatureHtml}${fwdHeader}</div>`;
    } else {
      // New compose email
      fullHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #1e293b; background-color: #ffffff;">${userHtml}${signatureHtml}</div>`;
    }

    // Filter attachments if user chose not to forward original attachments
    const finalAttachments = attachments.filter((att) => {
      if (att.isOriginal && !forwardOriginalAttachments) return false;
      return true;
    });

    try {
      const payload = {
        sender: fromSender,
        from: fromSender,
        recipients: toRecipients.join(', '),
        to: toRecipients,
        cc: ccRecipients.length > 0 ? ccRecipients.join(', ') : undefined,
        bcc: bccRecipients.length > 0 ? bccRecipients.join(', ') : undefined,
        subject,
        html: fullHtml,
        text: userPlainText || userHtml.replace(/<[^>]+>/g, ' ').trim(),
        mode: effectiveMode,
        originalEmailId: originalEmail ? originalEmail.id || originalEmail.message_id : undefined,
        attachmentCount: finalAttachments.length,
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
        const modeLabel = effectiveMode === 'forward' ? 'forward' : effectiveMode === 'replyAll' ? 'reply all' : 'reply';
        addToast(
          'Email Sent',
          `✓ Email ${modeLabel} sent successfully via Brevo.`,
          'success'
        );

        const createdRecord: EmailMessageRecord = {
          id: String(response.data.entry?.id || response.data.messageId || `sent_${Date.now()}`),
          message_id: response.data.messageId || `msg_sent_${Date.now()}`,
          mailbox_email: fromSender,
          sender_name: 'Zenemoo',
          sender_email: fromSender,
          recipient_email: toRecipients.join(', '),
          reply_to: fromSender,
          subject,
          body_text: userPlainText,
          body_html: fullHtml,
          snippet: userPlainText.substring(0, 160) || 'Sent email',
          category: 'general',
          is_read: true,
          is_starred: false,
          is_archived: false,
          is_trashed: false,
          status: 'sent',
          sent_at: new Date().toISOString(),
          received_at: new Date().toISOString(),
          attachments: finalAttachments.map((a) => ({
            id: a.id,
            filename: a.name,
            contentType: a.type,
            size: a.size,
          })),
        };

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

  if (!isOpen) return null;

  const decodedSenderName = originalEmail ? decodeMimeHeader(originalEmail.sender_name) : '';
  const decodedOriginalSubject = originalEmail ? decodeMimeHeader(originalEmail.subject) : '';
  const formattedDate = originalEmail
    ? new Date(originalEmail.received_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b0f19] border border-white/10 w-full sm:w-[760px] lg:w-[860px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh] font-sans text-xs">
        {/* MODAL HEADER */}
        <div className="p-4 bg-[#070a11] border-b border-white/10 flex items-center justify-between font-mono shrink-0">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            {effectiveMode === 'reply' && originalEmail ? (
              <>
                <CornerUpLeft className="w-4 h-4 text-cyan-400" />
                <span>Reply: {decodedSenderName || originalEmail.sender_email}</span>
              </>
            ) : effectiveMode === 'replyAll' && originalEmail ? (
              <>
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Reply All: {decodedSenderName || originalEmail.sender_email}</span>
              </>
            ) : effectiveMode === 'forward' && originalEmail ? (
              <>
                <ForwardIcon className="w-4 h-4 text-purple-400" />
                <span>Forward: {decodedOriginalSubject || '(No Subject)'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-cyan-400" />
                <span>New Message</span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY FORM */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1 font-mono text-xs">
          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2.5 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
              <X className="w-3.5 h-3.5 cursor-pointer hover:text-white" onClick={() => setErrorMsg(null)} />
            </div>
          )}

          {/* FROM SENDER FIELD */}
          <div className="flex items-center gap-3">
            <span className="w-14 text-slate-400 font-bold shrink-0">From:</span>
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

          {/* TO RECIPIENTS FIELD (Multi-Chip) */}
          <RecipientChipInput
            label="To"
            recipients={toRecipients}
            onChange={setToRecipients}
            placeholder={
              effectiveMode === 'forward'
                ? 'Type forwarding recipients and press Enter...'
                : 'Type recipient email and press Enter...'
            }
            showCcButton={!showCc}
            showBccButton={!showBcc}
            onCcClick={() => setShowCc(true)}
            onBccClick={() => setShowBcc(true)}
          />

          {/* CC FIELD (Multi-Chip) */}
          {showCc && (
            <RecipientChipInput
              label="Cc"
              recipients={ccRecipients}
              onChange={setCcRecipients}
              placeholder="Add Cc recipients..."
            />
          )}

          {/* BCC FIELD (Multi-Chip) */}
          {showBcc && (
            <RecipientChipInput
              label="Bcc"
              recipients={bccRecipients}
              onChange={setBccRecipients}
              placeholder="Add Bcc recipients..."
            />
          )}

          {/* SUBJECT FIELD */}
          <div className="flex items-center gap-3">
            <span className="w-14 text-slate-400 font-bold shrink-0">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-medium text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* RICH TEXT FORMATTING TOOLBAR */}
          <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300">
            <button
              type="button"
              onClick={() => execFormat('bold')}
              title="Bold (Ctrl+B)"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('italic')}
              title="Italic (Ctrl+I)"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('underline')}
              title="Underline (Ctrl+U)"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('strikeThrough')}
              title="Strikethrough"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => execFormat('formatBlock', '<h1>')}
              title="Heading 1"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('formatBlock', '<h2>')}
              title="Heading 2"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('formatBlock', '<h3>')}
              title="Heading 3"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('insertUnorderedList')}
              title="Bulleted List"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('insertOrderedList')}
              title="Numbered List"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('formatBlock', '<blockquote>')}
              title="Quote"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={handleOpenLinkDialog}
              title="Insert Link (Ctrl+K)"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('unlink')}
              title="Remove Link"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('removeFormat')}
              title="Clear Formatting"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => execFormat('undo')}
              title="Undo"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execFormat('redo')}
              title="Redo"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* RICH TEXT CONTENTEDITABLE MESSAGE AREA */}
          <div className="space-y-1">
            <div
              ref={editorRef}
              contentEditable
              onKeyDown={handleEditorKeyDown}
              onInput={() => {
                if (editorRef.current) setMessageHtml(editorRef.current.innerHTML);
              }}
              data-placeholder={
                effectiveMode === 'forward'
                  ? 'Type your message above forwarded content...'
                  : effectiveMode === 'reply' || effectiveMode === 'replyAll'
                  ? 'Type your response here...'
                  : 'Compose your email message here...'
              }
              className="w-full min-h-[160px] max-h-[260px] p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-100 font-sans text-sm leading-relaxed overflow-y-auto focus:outline-none focus:border-cyan-400 focus:bg-white/[0.05] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none"
            />
          </div>

          {/* SENDER SIGNATURE SELECTOR & PREVIEW */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400" /> Signature:
              </span>
              <select
                value={selectedSignatureId}
                onChange={(e) => handleSignatureChange(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300 text-xs focus:outline-none cursor-pointer"
              >
                <option value="auto" className="bg-[#0b0f19] text-white">● Auto (Sender Default)</option>
                {SIGNATURE_PRESETS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0b0f19] text-white">
                    {s.name}
                  </option>
                ))}
                <option value="none" className="bg-[#0b0f19] text-slate-400">No Signature</option>
              </select>
            </div>
            {appliedSignatureText && selectedSignatureId !== 'none' && (
              <div className="text-[11px] text-slate-400 font-mono whitespace-pre-line pl-2 border-l-2 border-cyan-500/30">
                {appliedSignatureText}
              </div>
            )}
          </div>

          {/* GMAIL / OUTLOOK STYLE FORWARDED EMAIL PREVIEW CARD */}
          {effectiveMode === 'forward' && originalEmail && (
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 font-bold border-b border-white/5 pb-2">
                <div className="flex items-center gap-1.5 text-purple-300">
                  <ForwardIcon className="w-3.5 h-3.5" />
                  <span>Quoted Forwarded Message</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Appended below your message</span>
              </div>

              <div className="text-[11px] text-slate-300 space-y-0.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                <div><strong className="text-slate-400">From:</strong> {decodedSenderName} &lt;{originalEmail.sender_email}&gt;</div>
                <div><strong className="text-slate-400">Date:</strong> {formattedDate}</div>
                <div><strong className="text-slate-400">Subject:</strong> {decodedOriginalSubject}</div>
                <div><strong className="text-slate-400">To:</strong> {originalEmail.recipient_email}</div>
                {originalEmail.reply_to && <div><strong className="text-slate-400">Reply-To:</strong> {originalEmail.reply_to}</div>}
              </div>

              {/* Forward Original Attachments Toggle */}
              {originalEmail.attachments && originalEmail.attachments.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={forwardOriginalAttachments}
                      onChange={(e) => setForwardOriginalAttachments(e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-0 cursor-pointer"
                    />
                    <span>Include original attachments ({originalEmail.attachments.length})</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ATTACHMENT MANAGER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-cyan-400" /> Attachments ({attachments.length})
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Paperclip className="w-3 h-3" /> Attach Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      att.isOriginal ? 'bg-purple-500/[0.04] border-purple-500/20' : 'bg-white/[0.04] border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className={`w-4 h-4 shrink-0 ${att.isOriginal ? 'text-purple-400' : 'text-cyan-400'}`} />
                      <div className="min-w-0">
                        <p className="text-white truncate font-medium">{att.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(att.size)} {att.isOriginal ? '• Original Attachment' : '• Added Attachment'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#070a11] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Gateway: <strong className="text-cyan-300">Brevo SMTP Relay</strong></span>
            <span>&bull;</span>
            <span>SSL / TLS Encrypted</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {effectiveMode === 'forward'
                      ? 'Send Forward'
                      : effectiveMode === 'replyAll'
                      ? 'Send Reply All'
                      : effectiveMode === 'reply'
                      ? 'Send Reply'
                      : 'Send Message'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* INSERT LINK MODAL PROMPT */}
      {isLinkDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0b0f19] border border-white/15 p-6 rounded-2xl w-full max-w-md space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-cyan-400" /> Insert Web Link
              </h4>
              <button
                type="button"
                onClick={() => setIsLinkDialogOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Display Text (optional):</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Zenemoo Portal"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Link URL (http / https):</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://zenemoo.in/portal"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLinkDialogOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
