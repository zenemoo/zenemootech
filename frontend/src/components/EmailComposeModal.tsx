import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CornerUpLeft,
  Forward as ForwardIcon,
  ChevronDown,
  Paperclip,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { emailInboxApi } from '../services/api';
import { EmailMessageRecord } from './AdminEmailInboxTab';

const VERIFIED_SENDERS = [
  { email: 'contact@zenemoo.in', label: 'Zenemoo Business Team (contact@zenemoo.in)' },
  { email: 'support@zenemoo.in', label: 'Zenemoo Customer Support (support@zenemoo.in)' },
  { email: 'info@zenemoo.in', label: 'Zenemoo Information Desk (info@zenemoo.in)' },
  { email: 'prem@zenemoo.in', label: 'Prem Founder (prem@zenemoo.in)' },
  { email: 'hemanta@zenemoo.in', label: 'Hemanta Kumar Sahu (hemanta@zenemoo.in)' },
  { email: 'sangita@zenemoo.in', label: 'Sangita HR (sangita@zenemoo.in)' },
  { email: 'noreply@zenemoo.in', label: 'Zenemoo System (noreply@zenemoo.in)' },
];

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
  const [fromSender, setFromSender] = useState<string>('contact@zenemoo.in');
  const [toRecipients, setToRecipients] = useState<string>('');
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [ccRecipients, setCcRecipients] = useState<string>('');
  const [bccRecipients, setBccRecipients] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-populate fields on modal open or when selected email changes
  useEffect(() => {
    if (!isOpen || !originalEmail) return;

    // Determine From Sender: use matching mailbox_email if verified, else contact@zenemoo.in
    const matchingSender = VERIFIED_SENDERS.find(
      (s) => s.email.toLowerCase() === (originalEmail.mailbox_email || '').toLowerCase()
    );
    setFromSender(matchingSender ? matchingSender.email : 'contact@zenemoo.in');

    if (mode === 'reply') {
      const replyTo = originalEmail.reply_to || originalEmail.sender_email;
      setToRecipients(replyTo || '');

      const rawSub = originalEmail.subject || '';
      const formattedSubject = rawSub.toLowerCase().startsWith('re:') ? rawSub : `Re: ${rawSub}`;
      setSubject(formattedSubject);
      setMessageText('');
    } else {
      // Forward Mode: To is empty
      setToRecipients('');

      const rawSub = originalEmail.subject || '';
      const formattedSubject = rawSub.toLowerCase().startsWith('fwd:') || rawSub.toLowerCase().startsWith('fw:')
        ? rawSub
        : `Fwd: ${rawSub}`;
      setSubject(formattedSubject);
      setMessageText('');
    }

    setShowCc(false);
    setShowBcc(false);
    setCcRecipients('');
    setBccRecipients('');
    setErrorMsg(null);
  }, [isOpen, mode, originalEmail]);

  if (!isOpen || !originalEmail) return null;

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
      setErrorMsg(`Invalid email address: ${invalidTo.join(', ')}`);
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

    // Construct Quoted / Forwarded Content
    let fullHtml = '';
    const cleanUserText = messageText.trim();
    const escapedUserText = cleanUserText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formattedUserMessage = `<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${escapedUserText}</div>`;

    const formattedDate = new Date(originalEmail.received_at).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    if (mode === 'reply') {
      const origSnippet = originalEmail.body_text || originalEmail.snippet || '';
      const quotedBlock = `<br/><br/><div style="border-left: 2px solid #06b6d4; padding-left: 12px; margin-top: 16px; color: #64748b; font-family: system-ui, sans-serif; font-size: 13px;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 6px;">On ${formattedDate}, ${escapeHtml(originalEmail.sender_name)} &lt;${escapeHtml(originalEmail.sender_email)}&gt; wrote:</div>
        <blockquote style="margin: 0; padding: 0; color: #475569; white-space: pre-wrap;">${escapeHtml(origSnippet)}</blockquote>
      </div>`;
      fullHtml = `${formattedUserMessage}${quotedBlock}`;
    } else {
      // Forward mode
      const origBody = originalEmail.body_html || `<div style="white-space: pre-wrap;">${escapeHtml(originalEmail.body_text || originalEmail.snippet)}</div>`;
      const fwdHeader = `<br/><br/><div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 16px; font-family: system-ui, sans-serif; font-size: 13px; color: #475569;">
        <div style="font-weight: bold; color: #0f172a; margin-bottom: 6px;">---------- Forwarded message ----------</div>
        <div><strong>From:</strong> ${escapeHtml(originalEmail.sender_name)} &lt;${escapeHtml(originalEmail.sender_email)}&gt;</div>
        <div><strong>Date:</strong> ${formattedDate}</div>
        <div><strong>Subject:</strong> ${escapeHtml(originalEmail.subject)}</div>
        <div><strong>To:</strong> ${escapeHtml(originalEmail.recipient_email)}</div>
        <br/>
        <div>${origBody}</div>
      </div>`;
      fullHtml = `${formattedUserMessage}${fwdHeader}`;
    }

    try {
      const response = await emailInboxApi.sendEmail({
        mode,
        originalEmailId: originalEmail.id || originalEmail.message_id,
        from: fromSender,
        to: validTo,
        cc: validCc,
        bcc: validBcc,
        subject,
        html: fullHtml,
        text: cleanUserText,
      });

      if (response.data?.success) {
        addToast(
          'Email Sent',
          `✓ Email ${mode === 'reply' ? 'reply' : 'forward'} sent successfully via Brevo.`,
          'success'
        );
        if (response.data.entry) {
          onSendSuccess(response.data.entry);
        }
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#0b0f19] border border-white/10 w-full sm:w-[680px] lg:w-[740px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] font-sans text-xs">
        
        {/* MODAL HEADER */}
        <div className="p-4 bg-[#070a11] border-b border-white/10 flex items-center justify-between font-mono shrink-0">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            {mode === 'reply' ? (
              <>
                <CornerUpLeft className="w-4 h-4 text-cyan-400" />
                <span>Reply to {originalEmail.sender_name}</span>
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
                onChange={(e) => setFromSender(e.target.value)}
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

          {/* MESSAGE EDITOR TEXTAREA */}
          <div className="pt-2">
            <textarea
              rows={8}
              placeholder={mode === 'reply' ? 'Write your reply message here...' : 'Write an optional introductory message...'}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-200 placeholder-slate-500 text-sm font-sans focus:outline-none focus:border-cyan-400 leading-relaxed resize-y"
            />
          </div>

          {/* QUOTED / FORWARDED MESSAGE COLLAPSIBLE PREVIEW */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>{mode === 'reply' ? 'Original Message Quote' : 'Forwarded Message Header'}</span>
              <span className="text-slate-500 font-normal">{new Date(originalEmail.received_at).toLocaleDateString()}</span>
            </div>

            <div className="text-slate-300 font-mono line-clamp-3 leading-relaxed opacity-80 break-words">
              {mode === 'reply' ? (
                <>On {new Date(originalEmail.received_at).toLocaleString()}, {originalEmail.sender_name} wrote:<br />&gt; {originalEmail.snippet || originalEmail.body_text}</>
              ) : (
                <>---------- Forwarded message ----------<br />From: {originalEmail.sender_name} &lt;{originalEmail.sender_email}&gt;<br />Subject: {originalEmail.subject}</>
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
