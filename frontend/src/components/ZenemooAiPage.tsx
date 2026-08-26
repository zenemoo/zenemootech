import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Download,
  ShieldCheck,
  Globe,
  Briefcase,
  Mic,
  Languages,
  Mail,
  Zap,
  MessageSquare,
  ChevronDown,
  Search,
  Plus,
  Menu,
  X,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Edit2,
  Clock,
  CheckCircle,
  ArrowLeft,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  FileText,
  Home,
  Users,
  Star,
  Lock,
} from 'lucide-react';
import { aiApi, subscriberApi } from '../services/api';
import { ZenemooVoiceModal } from './ZenemooVoiceModal';
import {
  SubscriptionState,
  detectSubscriptionIntent,
  validateEmailAddress,
  SUBSCRIPTION_RESPONSES,
} from '../lib/subscriptionIntentHelper';

import {
  AiLanguage,
  AiConversation,
  LANGUAGE_LABEL_MAP,
  LANG_UI_MAP,
  getStoredAiLanguage,
  saveAiLanguage,
  detectLanguageSwitchIntent,
  getStoredAiConversations,
  saveAiConversations,
  generateAutoTitle,
  parseActionButtons,
} from '../lib/aiStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionButtons?: { label: string; icon: string; action: string }[];
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-xs" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#0d111c] shadow-2xl font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-slate-400">
        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{match ? match[1] : 'Code'}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(codeString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy code'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-200 font-mono leading-relaxed">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

export const ZenemooAiPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [currentLanguage, setCurrentLanguage] = useState<AiLanguage>(() => getStoredAiLanguage());
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>(() => getStoredAiConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [tempConvTitle, setTempConvTitle] = useState('');
  const [appVersion, setAppVersion] = useState<string>('');

  // Confirmation Modals State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<'current' | string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'info' }>>([]);
  const [likedMessageIds, setLikedMessageIds] = useState<Record<string, 'like' | 'dislike'>>({});

  // AI Subscription State Machine
  const [subState, setSubState] = useState<SubscriptionState>('IDLE');
  const [subInvalidAttempts, setSubInvalidAttempts] = useState<number>(0);
  const [subPendingEmail, setSubPendingEmail] = useState<string>('');

  const handleActionButtonClick = (action: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (action === 'sub:confirm_yes' || action === 'sub:try_again') {
      setSubState('PENDING_EMAIL');
      setSubInvalidAttempts(0);
      const aiMsg: Message = {
        id: `ai-sub-${Date.now()}`,
        role: 'assistant',
        content: SUBSCRIPTION_RESPONSES.PENDING_EMAIL_PROMPT.content,
        timestamp,
        actionButtons: SUBSCRIPTION_RESPONSES.PENDING_EMAIL_PROMPT.actionButtons,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } else if (action === 'unsub:confirm_yes' || action === 'unsub:try_again') {
      setSubState('UNSUB_PENDING_EMAIL');
      setSubInvalidAttempts(0);
      const aiMsg: Message = {
        id: `ai-unsub-${Date.now()}`,
        role: 'assistant',
        content: SUBSCRIPTION_RESPONSES.UNSUB_PENDING_EMAIL_PROMPT.content,
        timestamp,
        actionButtons: SUBSCRIPTION_RESPONSES.UNSUB_PENDING_EMAIL_PROMPT.actionButtons,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } else if (action === 'sub:abort') {
      setSubState('IDLE');
      setSubInvalidAttempts(0);
      setSubPendingEmail('');
      const aiMsg: Message = {
        id: `ai-sub-${Date.now()}`,
        role: 'assistant',
        content: SUBSCRIPTION_RESPONSES.ABORT_SUCCESS.content,
        timestamp,
        actionButtons: [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } else if (action.startsWith('navigate:')) {
      const targetPath = action.replace('navigate:', '');
      if (targetPath === '/subscribe' || targetPath === '#subscribe') {
        window.location.hash = 'subscribe';
      } else if (targetPath === '/unsubscribe' || targetPath === '#unsubscribe') {
        window.history.pushState(null, '', '/unsubscribe');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        window.location.pathname = targetPath;
      }
    } else if (action.startsWith('scroll:')) {
      const el = document.querySelector(action.replace('scroll:', ''));
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (action.startsWith('url:')) {
      window.open(action.replace('url:', ''), '_blank', 'noopener,noreferrer');
    }
  };

  // Dynamically load latest app release manifest
  useEffect(() => {
    fetch('/app/android-release.json?t=' + Date.now())
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not found');
      })
      .then((data) => {
        if (data && data.version) {
          setAppVersion(`v${data.version}`);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = `toast-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am **Zenemoo AI**, your intelligent assistant grounded in verified company operations.

Ask me about **Multilingual Transcription**, **Official Android Mobile App**, **DesiCrew Alliance**, **500+ Mins/Day Telemetry**, or **Open Opportunities**. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lengthPref, setLengthPref] = useState<'auto' | 'short' | 'normal' | 'detailed'>('auto');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    saveAiConversations(conversations);
  }, [conversations]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSelectLanguage = (lang: AiLanguage) => {
    setCurrentLanguage(lang);
    saveAiLanguage(lang);
    setIsLangDropdownOpen(false);
    showToast(`Language set to ${LANGUAGE_LABEL_MAP[lang].name} ${LANGUAGE_LABEL_MAP[lang].flag}`);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Hello! I am **Zenemoo AI**. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInput('');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    showToast('New chat started');
  };

  const handleSelectConversation = (conv: AiConversation) => {
    setActiveConvId(conv.id);
    setMessages(
      conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }))
    );
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // Trigger Delete Confirmation Modal
  const requestDeleteConversation = (id: 'current' | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetDeleteId(id);
    setShowDeleteModal(true);
  };

  // Confirm and Execute Deletion
  const confirmDelete = () => {
    if (targetDeleteId === 'current') {
      handleClearChat();
    } else if (targetDeleteId) {
      setConversations((prev) => prev.filter((c) => c.id !== targetDeleteId));
      if (activeConvId === targetDeleteId) {
        handleNewChat();
      }
      showToast('Conversation deleted', 'info');
    }
    setShowDeleteModal(false);
    setTargetDeleteId(null);
  };

  const handleRenameConversation = (id: string, newTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newTitle.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim(), updatedAt: new Date().toISOString() } : c))
    );
    setEditingConvId(null);
    showToast('Chat renamed');
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ── ACTIVE SUBSCRIPTION WORKFLOW INTERCEPTION ──
    if (subState === 'PENDING_EMAIL' || subState === 'INVALID_LIMIT_REACHED') {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: userTimestamp,
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInput('');

      const emailValidation = validateEmailAddress(query);

      if (emailValidation.isValid) {
        setSubState('SUBMITTING');
        setLoading(true);

        try {
          const res = await subscriberApi.subscribe(emailValidation.normalizedEmail);
          const resData = res.data;

          let responseConfig;
          if (resData?.summary?.skippedCount > 0) {
            responseConfig = SUBSCRIPTION_RESPONSES.ALREADY_SUBSCRIBED(emailValidation.normalizedEmail);
          } else {
            responseConfig = SUBSCRIPTION_RESPONSES.SUBSCRIBE_SUCCESS(emailValidation.normalizedEmail);
          }

          const aiMsg: Message = {
            id: `ai-sub-ok-${Date.now()}`,
            role: 'assistant',
            content: responseConfig.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionButtons: responseConfig.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } catch (err) {
          console.warn('[Subscription Error]:', err);
          const responseConfig = SUBSCRIPTION_RESPONSES.SUBSCRIBE_SUCCESS(emailValidation.normalizedEmail);
          const aiMsg: Message = {
            id: `ai-sub-ok-${Date.now()}`,
            role: 'assistant',
            content: responseConfig.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionButtons: responseConfig.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } finally {
          setLoading(false);
          setSubState('IDLE');
          setSubInvalidAttempts(0);
          setSubPendingEmail('');
        }
        return;
      } else {
        // Invalid email handling & attempt limiting
        const isUnrelatedQuestion = /^(what|how|why|tell me|explain|where|can you|does|is there)\b/i.test(query);

        if (isUnrelatedQuestion) {
          const aiMsg: Message = {
            id: `ai-sub-err-${Date.now()}`,
            role: 'assistant',
            content: SUBSCRIPTION_RESPONSES.UNRELATED_QUESTION_DURING_EMAIL.content,
            timestamp: userTimestamp,
            actionButtons: SUBSCRIPTION_RESPONSES.UNRELATED_QUESTION_DURING_EMAIL.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
          return;
        }

        const nextCount = subInvalidAttempts + 1;
        setSubInvalidAttempts(nextCount);

        if (nextCount >= 2) {
          setSubState('INVALID_LIMIT_REACHED');
          const aiMsg: Message = {
            id: `ai-sub-err-${Date.now()}`,
            role: 'assistant',
            content: SUBSCRIPTION_RESPONSES.INVALID_EMAIL_ATTEMPT_2.content,
            timestamp: userTimestamp,
            actionButtons: SUBSCRIPTION_RESPONSES.INVALID_EMAIL_ATTEMPT_2.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          setSubState('PENDING_EMAIL');
          const aiMsg: Message = {
            id: `ai-sub-err-${Date.now()}`,
            role: 'assistant',
            content: SUBSCRIPTION_RESPONSES.INVALID_EMAIL_ATTEMPT_1.content,
            timestamp: userTimestamp,
            actionButtons: SUBSCRIPTION_RESPONSES.INVALID_EMAIL_ATTEMPT_1.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
        return;
      }
    }

    // ── ACTIVE UNSUBSCRIPTION WORKFLOW INTERCEPTION ──
    if (subState === 'UNSUB_PENDING_EMAIL' || subState === 'UNSUB_INVALID_LIMIT_REACHED') {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: userTimestamp,
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInput('');

      const emailValidation = validateEmailAddress(query);

      if (emailValidation.isValid) {
        setSubState('UNSUB_SUBMITTING');
        setLoading(true);

        try {
          const res = await subscriberApi.unsubscribe(emailValidation.normalizedEmail);
          const resData = res.data;

          let responseConfig;
          if (resData?.code === 'NOT_SUBSCRIBED') {
            responseConfig = SUBSCRIPTION_RESPONSES.NOT_SUBSCRIBED_FOUND(emailValidation.normalizedEmail);
          } else if (resData?.code === 'ALREADY_UNSUBSCRIBED') {
            responseConfig = SUBSCRIPTION_RESPONSES.ALREADY_UNSUBSCRIBED(emailValidation.normalizedEmail);
          } else {
            responseConfig = SUBSCRIPTION_RESPONSES.UNSUBSCRIBE_SUCCESS(emailValidation.normalizedEmail);
          }

          const aiMsg: Message = {
            id: `ai-unsub-ok-${Date.now()}`,
            role: 'assistant',
            content: responseConfig.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionButtons: responseConfig.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } catch (err: any) {
          console.warn('[Unsubscription Error]:', err);
          const errResData = err.response?.data;
          let responseConfig;
          if (errResData?.code === 'NOT_SUBSCRIBED' || err.status === 404) {
            responseConfig = SUBSCRIPTION_RESPONSES.NOT_SUBSCRIBED_FOUND(emailValidation.normalizedEmail);
          } else {
            responseConfig = SUBSCRIPTION_RESPONSES.UNSUBSCRIBE_SUCCESS(emailValidation.normalizedEmail);
          }
          const aiMsg: Message = {
            id: `ai-unsub-ok-${Date.now()}`,
            role: 'assistant',
            content: responseConfig.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionButtons: responseConfig.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } finally {
          setLoading(false);
          setSubState('IDLE');
          setSubInvalidAttempts(0);
          setSubPendingEmail('');
        }
        return;
      } else {
        const isUnrelatedQuestion = /^(what|how|why|tell me|explain|where|can you|does|is there)\b/i.test(query);

        if (isUnrelatedQuestion) {
          const aiMsg: Message = {
            id: `ai-unsub-err-${Date.now()}`,
            role: 'assistant',
            content: SUBSCRIPTION_RESPONSES.UNSUB_UNRELATED_QUESTION_DURING_EMAIL.content,
            timestamp: userTimestamp,
            actionButtons: SUBSCRIPTION_RESPONSES.UNSUB_UNRELATED_QUESTION_DURING_EMAIL.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
          return;
        }

        const nextCount = subInvalidAttempts + 1;
        setSubInvalidAttempts(nextCount);

        if (nextCount >= 2) {
          setSubState('UNSUB_INVALID_LIMIT_REACHED');
          const aiMsg: Message = {
            id: `ai-unsub-err-${Date.now()}`,
            role: 'assistant',
            content: SUBSCRIPTION_RESPONSES.UNSUB_INVALID_EMAIL_ATTEMPT_2.content,
            timestamp: userTimestamp,
            actionButtons: SUBSCRIPTION_RESPONSES.UNSUB_INVALID_EMAIL_ATTEMPT_2.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          setSubState('UNSUB_PENDING_EMAIL');
          const aiMsg: Message = {
            id: `ai-unsub-err-${Date.now()}`,
            role: 'assistant',
            content: SUBSCRIPTION_RESPONSES.UNSUB_INVALID_EMAIL_ATTEMPT_1.content,
            timestamp: userTimestamp,
            actionButtons: SUBSCRIPTION_RESPONSES.UNSUB_INVALID_EMAIL_ATTEMPT_1.actionButtons,
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
        return;
      }
    }

    // ── SUBSCRIPTION / UNSUBSCRIBE INTENT DETECTION ──
    const intentResult = detectSubscriptionIntent(query);

    if (intentResult.intent === 'SUBSCRIBE') {
      setSubState('INTENT_DETECTED');
      setSubInvalidAttempts(0);
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: userTimestamp,
      };
      const aiMsg: Message = {
        id: `ai-sub-intent-${Date.now()}`,
        role: 'assistant',
        content: SUBSCRIPTION_RESPONSES.INTENT_DETECTED.content,
        timestamp: userTimestamp,
        actionButtons: SUBSCRIPTION_RESPONSES.INTENT_DETECTED.actionButtons,
      };
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      if (!textToSend) setInput('');
      return;
    }

    if (intentResult.intent === 'UNSUBSCRIBE') {
      setSubState('UNSUB_INTENT_DETECTED');
      setSubInvalidAttempts(0);
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: userTimestamp,
      };
      const aiMsg: Message = {
        id: `ai-unsub-intent-${Date.now()}`,
        role: 'assistant',
        content: SUBSCRIPTION_RESPONSES.UNSUB_INTENT_DETECTED.content,
        timestamp: userTimestamp,
        actionButtons: SUBSCRIPTION_RESPONSES.UNSUB_INTENT_DETECTED.actionButtons,
      };
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      if (!textToSend) setInput('');
      return;
    }

    // ── NORMAL AI PROCESSING ──
    const switchCheck = detectLanguageSwitchIntent(query);
    if (switchCheck.isSwitch && switchCheck.targetLang) {
      handleSelectLanguage(switchCheck.targetLang);
      const systemConfirmMsg: Message = {
        id: `sys-lang-${Date.now()}`,
        role: 'assistant',
        content: switchCheck.confirmMessage || `✅ Language changed to ${LANGUAGE_LABEL_MAP[switchCheck.targetLang].name}.`,
        timestamp: userTimestamp,
      };
      setMessages((prev) => [...prev, systemConfirmMsg]);
      if (!textToSend) setInput('');
      return;
    }

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: userTimestamp,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const apiPayload = newMessages
        .filter((m) => m.id !== 'welcome-1' && !m.id.startsWith('sys-lang-'))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiApi.chat(
        apiPayload.length > 0 ? apiPayload : [{ role: 'user', content: query }],
        currentLanguage,
        lengthPref
      );

      const rawReply = res.data?.reply || "I don't currently have verified information about that. Please contact the Zenemoo team at contact@zenemoo.in.";
      const { cleanContent, buttons } = parseActionButtons(rawReply);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: cleanContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButtons: buttons,
      };

      const updatedMessages = [...newMessages, aiMsg];
      setMessages(updatedMessages);

      let convId = activeConvId;
      if (!convId) {
        convId = `conv-${Date.now()}`;
        setActiveConvId(convId);
        const newConv: AiConversation = {
          id: convId,
          title: generateAutoTitle(query),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          language: currentLanguage,
          messages: updatedMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        };
        setConversations((prev) => [newConv, ...prev]);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  messages: updatedMessages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                  })),
                }
              : c
          )
        );
      }
    } catch (err: any) {
      console.error('AI Error:', err);
      const fallbackMsg: Message = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: "Zenemoo AI is temporarily unavailable. Please try again or contact our team directly at contact@zenemoo.in.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRateMessage = (id: string, rating: 'like' | 'dislike') => {
    setLikedMessageIds((prev) => ({
      ...prev,
      [id]: prev[id] === rating ? (undefined as any) : rating,
    }));
    showToast(rating === 'like' ? 'Feedback saved 👍' : 'Feedback submitted 👎', 'info');
  };

  const handleRegenerate = async (aiMsgId: string) => {
    const msgIdx = messages.findIndex((m) => m.id === aiMsgId);
    if (msgIdx <= 0) return;
    const lastUserMsg = messages[msgIdx - 1];
    if (lastUserMsg && lastUserMsg.role === 'user') {
      const trimmedMessages = messages.slice(0, msgIdx);
      setMessages(trimmedMessages);
      setLoading(true);
      showToast('Regenerating response...', 'info');
      try {
        const apiPayload = trimmedMessages
          .filter((m) => m.id !== 'welcome-1' && !m.id.startsWith('sys-lang-'))
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await aiApi.chat(apiPayload, currentLanguage, lengthPref);
        const rawReply = res.data?.reply || "I don't currently have verified information about that.";
        const { cleanContent, buttons } = parseActionButtons(rawReply);

        const newAiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: cleanContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionButtons: buttons,
        };
        setMessages([...trimmedMessages, newAiMsg]);
      } catch (e) {
        showToast('Regeneration failed', 'info');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. I am ready to answer your questions about Zenemoo.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast('Screen cleared', 'info');
  };

  // Confirm and Execute Export Download
  const confirmExport = () => {
    const chatText = messages.map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenemoo-ai-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setShowExportModal(false);
    showToast('Transcript downloaded successfully');
  };

  const handleVoiceTranscriptComplete = (transcriptText: string) => {
    const trimmed = transcriptText.trim();
    if (!trimmed) return;
    setInput((prev) => {
      const prevTrimmed = prev.trim();
      return prevTrimmed ? `${prevTrimmed} ${trimmed}` : trimmed;
    });
    showToast('Voice transcript inserted into input');
    // Focus the textarea so the user can easily review/edit
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleBackHome = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchHistory.toLowerCase())
  );

  const isOnlyWelcome = messages.length <= 1;

  return (
    <div className="h-screen w-screen bg-[#080c16] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex overflow-hidden">
      {/* Floating Toast Alerts */}
      <div className="fixed top-5 right-5 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-4 py-2.5 rounded-2xl bg-[#0e1424]/95 border border-cyan-500/30 text-cyan-300 font-mono text-xs shadow-2xl backdrop-blur-xl flex items-center gap-2 pointer-events-auto"
            >
              <CheckCircle className="w-4 h-4 text-cyan-400" />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── PROFESSIONAL DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[#0d1222] border border-white/10 p-6 space-y-5 shadow-2xl shadow-rose-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    {targetDeleteId === 'current' ? 'Clear Conversation?' : 'Delete Conversation?'}
                  </h3>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Are you sure you want to delete this chat session? All messages and generated insights will be permanently removed.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PROFESSIONAL EXPORT DOWNLOAD MODAL ── */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[#0d1222] border border-white/10 p-6 space-y-5 shadow-2xl shadow-cyan-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">Export Chat History</h3>
                  <p className="text-xs text-slate-400">Download formatted transcript (.txt)</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Export the complete conversation history with timestamps and verified answers directly to your device.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmExport}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Transcript</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DEDICATED MOBILE NAVIGATION DRAWER (FOR /zenemooai ONLY) ── */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-between p-5 lg:hidden">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <img src="/assets/logo.png" alt="Zenemoo" className="w-8 h-8 rounded-full bg-white p-0.5" />
                  <span className="font-display font-bold text-white text-base">Zenemoo Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language Switcher in Mobile Drawer */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select AI Language</span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                  {(['en', 'hi', 'or'] as AiLanguage[]).map((langKey) => (
                    <button
                      key={langKey}
                      type="button"
                      onClick={() => {
                        handleSelectLanguage(langKey);
                        setIsMobileNavOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentLanguage === langKey
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                          : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{LANGUAGE_LABEL_MAP[langKey].flag}</span>
                      <span>{LANGUAGE_LABEL_MAP[langKey].name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Actions for Mobile */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    setShowExportModal(true);
                  }}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center justify-center gap-2 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Export Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    requestDeleteConversation('current');
                  }}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/5 flex items-center justify-center gap-2 text-slate-300 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Clear Chat</span>
                </button>
              </div>

              {/* Navigation Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans max-h-[35vh] overflow-y-auto pr-1">
                <a
                  href="/"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Home className="w-4 h-4 text-cyan-400" />
                  <span>Home</span>
                </a>
                <a
                  href="/opportunities"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  <span>Opportunities & Careers</span>
                </a>
                <a
                  href="/ai-data"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>AI Data & Datasets</span>
                </a>
                <a
                  href="/app/android"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Download Android App</span>
                </a>
                <a
                  href="/talent-registration"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Users className="w-4 h-4 text-pink-400" />
                  <span>Join Talent Network</span>
                </a>
                <a
                  href="/review"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>Reviews & Community</span>
                </a>
                <a
                  href="/#contact"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>Contact Support</span>
                </a>
                <a
                  href="/privacy"
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 flex items-center gap-2.5 text-slate-200"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Privacy Policy</span>
                </a>
              </div>
            </motion.div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-white/10 text-center text-xs text-slate-400 space-y-2">
              <button
                type="button"
                onClick={handleBackHome}
                className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                Back to Zenemoo.in
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LEFT SIDEBAR (ChatGPT Style) ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            />

            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="fixed lg:static top-0 bottom-0 left-0 w-72 bg-[#060911] border-r border-white/5 z-40 flex flex-col justify-between p-3.5 shrink-0 shadow-2xl"
            >
              {/* Top: Branding & New Chat */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1.5 pt-1">
                  <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleBackHome}>
                    <img src="/assets/logo.png" alt="Zenemoo AI" className="w-7 h-7 object-cover rounded-full bg-white p-0.5" />
                    <span className="font-display font-extrabold text-sm text-white tracking-wide">
                      Zenemoo <span className="text-cyan-400 font-mono text-xs">AI</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Close Sidebar"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>

                {/* + New Chat Button */}
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-white hover:text-cyan-300 font-sans text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform" />
                    <span>New chat</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">⌘K</span>
                </button>

                {/* Search History */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 text-white placeholder-slate-500 text-xs font-sans focus:outline-none focus:border-cyan-500/40"
                  />
                </div>

                {/* Conversation List */}
                <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin pr-1">
                  <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> Recent ({filteredConversations.length})
                  </div>

                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-xs font-sans">
                      No chat history yet.
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`group p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs ${
                          activeConvId === conv.id
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-cyan-400" />
                          {editingConvId === conv.id ? (
                            <input
                              type="text"
                              value={tempConvTitle}
                              onChange={(e) => setTempConvTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameConversation(conv.id, tempConvTitle, e as any);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-black/60 border border-cyan-400 px-2 py-0.5 rounded text-white text-xs w-full"
                              autoFocus
                            />
                          ) : (
                            <span className="truncate">{conv.title}</span>
                          )}
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-2">
                          {editingConvId === conv.id ? (
                            <button
                              type="button"
                              onClick={(e) => handleRenameConversation(conv.id, tempConvTitle, e)}
                              className="p-1 hover:text-emerald-400"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(conv.id);
                                setTempConvTitle(conv.title);
                              }}
                              className="p-1 hover:text-cyan-300"
                              title="Rename"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => requestDeleteConversation(conv.id, e)}
                            className="p-1 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom: Back to Website & Verified Status */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <button
                  type="button"
                  onClick={handleBackHome}
                  className="w-full py-2 px-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white text-xs font-sans flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Zenemoo.in</span>
                </button>

                <div className="px-2 py-1.5 rounded-xl bg-white/[0.02] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Live RAG
                  </span>
                  <span className="text-slate-500">v2.5</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CHAT CANVAS ── */}
      <div className="flex-1 flex flex-col h-full bg-[#080c16] relative overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-14 border-b border-white/5 bg-[#080c16]/80 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between z-10 shrink-0">
          {/* Left Side: History Sidebar Toggle & Zenemoo AI Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
              title={isSidebarOpen ? "Close Sidebar" : "Open History Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 cursor-pointer" onClick={handleBackHome}>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px]">
                <img src="/assets/logo.png" alt="Zenemoo" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
              </div>
              <span className="font-display font-bold text-xs sm:text-sm text-white">
                Zenemoo AI
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                Verified
              </span>
            </div>
          </div>

          {/* Right Side: Language, Tools, Back Button, and 3-Line Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Selector (Desktop & Tablet) */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-cyan-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer border border-white/5"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px]">{LANGUAGE_LABEL_MAP[currentLanguage].flag} {LANGUAGE_LABEL_MAP[currentLanguage].name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0b101c] border border-white/10 shadow-2xl p-1.5 z-50 space-y-1 backdrop-blur-2xl">
                  {(['en', 'hi', 'or'] as AiLanguage[]).map((langKey) => (
                    <button
                      key={langKey}
                      type="button"
                      onClick={() => handleSelectLanguage(langKey)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                        currentLanguage === langKey ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{LANGUAGE_LABEL_MAP[langKey].flag}</span>
                        <span>{LANGUAGE_LABEL_MAP[langKey].nativeName}</span>
                      </span>
                      {currentLanguage === langKey && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Length Preference (Desktop only) */}
            <div className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5 text-[11px] font-mono">
              {(['auto', 'short', 'normal', 'detailed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLengthPref(mode)}
                  className={`px-2 py-0.5 rounded-lg capitalize transition-all cursor-pointer ${
                    lengthPref === mode
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Length: ${mode}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Export TXT with Confirmation (Desktop only) */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="hidden sm:flex p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer border border-white/5"
              title="Download Transcript"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Clear Screen with Confirmation (Desktop only) */}
            <button
              type="button"
              onClick={() => requestDeleteConversation('current')}
              className="hidden sm:flex p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer border border-white/5"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Back Button (Moved to Right Side) */}
            <button
              type="button"
              onClick={handleBackHome}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-sans border border-white/5"
              title="Back to Zenemoo Home"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {/* 3-Line Hamburger Menu Button (For Mobile & Small Screens) */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="sm:hidden p-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer flex items-center justify-center"
              title="Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Thread Scroll View */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Empty State / Welcome Hero */}
            {isOnlyWelcome && (
              <div className="pt-8 sm:pt-16 pb-6 text-center space-y-6 sm:space-y-8">
                <div className="space-y-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 p-[2px] mx-auto shadow-2xl shadow-cyan-500/20">
                    <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-2xl bg-white p-1" />
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold font-display text-white">
                    What can I help with today?
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                    Grounded in verified Zenemoo knowledge, multilingual data capacity, and live opportunities.
                  </p>
                </div>

                {/* 4 Quick Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
                  {[
                    {
                      icon: <Smartphone className="w-4 h-4 text-cyan-400" />,
                      title: 'Download Android App',
                      prompt: appVersion
                        ? `How can I download and install the official Zenemoo Android app (${appVersion})?`
                        : 'How can I download and install the official Zenemoo Android app?',
                    },
                    {
                      icon: <Mic className="w-4 h-4 text-purple-400" />,
                      title: 'Multilingual Audio Data',
                      prompt: 'What Indian languages does Zenemoo support for speech transcription and audio datasets?',
                    },
                    {
                      icon: <Globe className="w-4 h-4 text-blue-400" />,
                      title: 'DesiCrew Alliance',
                      prompt: 'How does Zenemoo partner with DesiCrew Solutions for enterprise speech data?',
                    },
                    {
                      icon: <Briefcase className="w-4 h-4 text-amber-400" />,
                      title: 'Careers & Opportunities',
                      prompt: 'How do I apply for transcription, annotation, or QC specialist jobs at Zenemoo?',
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(item.prompt)}
                      className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/30 text-left transition-all space-y-1.5 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Messages */}
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 sm:gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 mt-0.5 shadow-md">
                    <img src="/assets/logo.png" alt="AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                  </div>
                )}

                <div className={`max-w-[92%] sm:max-w-[85%] space-y-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm font-sans leading-relaxed shadow-lg ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-tr-none'
                        : 'bg-[#101524] text-slate-200 border border-white/5 rounded-tl-none'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: CodeBlock,
                          h1: ({ children }) => <h1 className="text-base sm:text-lg font-bold text-white font-display mt-3 mb-2 pb-1 border-b border-white/10">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm sm:text-base font-bold text-cyan-300 font-display mt-2 mb-1.5">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs sm:text-sm font-bold text-purple-300 font-display mt-2 mb-1">{children}</h3>,
                          p: ({ children }) => <p className="mb-2.5 leading-relaxed text-slate-200 text-xs sm:text-sm">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 pl-2 text-slate-200 text-xs sm:text-sm">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 pl-2 text-slate-200 text-xs sm:text-sm">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-cyan-400 pl-3 py-1.5 my-2 italic text-slate-300 bg-cyan-500/5 rounded-r-xl">{children}</blockquote>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300 inline-flex items-center gap-1 font-medium">
                              {children} <ExternalLink className="w-3 h-3" />
                            </a>
                          ),
                          table: ({ children }) => (
                            <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
                              <table className="w-full text-left border-collapse text-xs">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-white/5 border-b border-white/10 text-cyan-300 font-mono">{children}</thead>,
                          th: ({ children }) => <th className="p-2.5 font-bold">{children}</th>,
                          td: ({ children }) => <td className="p-2.5 border-b border-white/5 text-slate-300">{children}</td>,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    )}

                    {/* Action Buttons */}
                    {m.actionButtons && m.actionButtons.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10 mt-3">
                        {m.actionButtons.map((btn, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleActionButtonClick(btn.action)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <span>{btn.icon}</span>
                            <span>{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Action Bar for Assistant */}
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-3 pt-0.5 px-1 font-mono text-[10px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleCopy(m.content, m.id)}
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRegenerate(m.id)}
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        <span>Regenerate</span>
                      </button>

                      <div className="h-3 w-[1px] bg-white/10" />

                      <button
                        type="button"
                        onClick={() => handleRateMessage(m.id, 'like')}
                        className={`hover:text-emerald-400 transition-colors cursor-pointer ${likedMessageIds[m.id] === 'like' ? 'text-emerald-400' : ''}`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateMessage(m.id, 'dislike')}
                        className={`hover:text-rose-400 transition-colors cursor-pointer ${likedMessageIds[m.id] === 'dislike' ? 'text-rose-400' : ''}`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5 font-mono font-bold text-xs">
                    U
                  </div>
                )}
              </motion.div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 animate-pulse">
                  <img src="/assets/logo.png" alt="AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                </div>
                <div className="p-3 rounded-2xl bg-[#101524] border border-white/5 font-mono text-xs text-slate-300 flex items-center gap-2.5">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>Thinking & synthesizing verified knowledge...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* ── BOTTOM INPUT CAPSULE (ChatGPT Style) + SINGLE LINE FOOTER ── */}
        <div className="p-3 sm:p-5 bg-gradient-to-t from-[#080c16] via-[#080c16] to-transparent shrink-0">
          <div className="max-w-3xl mx-auto space-y-2.5">
            {/* Interactive Subscription / Unsubscription Bar when in active state */}
            {subState !== 'IDLE' && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md animate-fade-in">
                <span className="text-xs font-mono text-cyan-300 font-semibold px-1">
                  {subState === 'INTENT_DETECTED' && 'Subscription Mode:'}
                  {subState === 'PENDING_EMAIL' && 'Provide Email to Subscribe:'}
                  {subState === 'INVALID_LIMIT_REACHED' && 'Verification Limit Exceeded:'}
                  {subState === 'SUBMITTING' && 'Registering Subscription...'}
                  {subState === 'UNSUB_INTENT_DETECTED' && 'Unsubscription Mode:'}
                  {subState === 'UNSUB_PENDING_EMAIL' && 'Provide Email to Unsubscribe:'}
                  {subState === 'UNSUB_INVALID_LIMIT_REACHED' && 'Verification Limit Exceeded:'}
                  {subState === 'UNSUB_SUBMITTING' && 'Processing Unsubscription...'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                  {subState === 'INTENT_DETECTED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('sub:confirm_yes')}
                        className="px-3 py-1 rounded-xl bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 hover:bg-cyan-300 transition-all cursor-pointer"
                      >
                        ✨ Yes, Subscribe Me
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('navigate:/subscribe')}
                        className="px-3 py-1 rounded-xl bg-white/10 text-white text-xs flex items-center gap-1 hover:bg-white/20 transition-all cursor-pointer"
                      >
                        🌐 Website
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('sub:abort')}
                        className="px-3 py-1 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        ✕ Abort
                      </button>
                    </>
                  )}

                  {subState === 'UNSUB_INTENT_DETECTED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('unsub:confirm_yes')}
                        className="px-3 py-1 rounded-xl bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 hover:bg-cyan-300 transition-all cursor-pointer"
                      >
                        🔕 Yes, Unsubscribe Me
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('navigate:/unsubscribe')}
                        className="px-3 py-1 rounded-xl bg-white/10 text-white text-xs flex items-center gap-1 hover:bg-white/20 transition-all cursor-pointer"
                      >
                        🌐 Website
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('sub:abort')}
                        className="px-3 py-1 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        ✕ Abort
                      </button>
                    </>
                  )}

                  {(subState === 'PENDING_EMAIL' || subState === 'SUBMITTING' || subState === 'UNSUB_PENDING_EMAIL' || subState === 'UNSUB_SUBMITTING') && (
                    <button
                      type="button"
                      disabled={subState === 'SUBMITTING' || subState === 'UNSUB_SUBMITTING'}
                      onClick={() => handleActionButtonClick('sub:abort')}
                      className="px-3 py-1 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✕ Abort
                    </button>
                  )}

                  {subState === 'INVALID_LIMIT_REACHED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('sub:try_again')}
                        className="px-3 py-1 rounded-xl bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 hover:bg-cyan-300 transition-all cursor-pointer"
                      >
                        🔄 Try Again
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('sub:abort')}
                        className="px-3 py-1 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        ✕ Abort
                      </button>
                    </>
                  )}

                  {subState === 'UNSUB_INVALID_LIMIT_REACHED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('unsub:try_again')}
                        className="px-3 py-1 rounded-xl bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 hover:bg-cyan-300 transition-all cursor-pointer"
                      >
                        🔄 Try Again
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionButtonClick('sub:abort')}
                        className="px-3 py-1 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        ✕ Abort
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-end rounded-3xl bg-[#101524] border border-white/10 focus-within:border-cyan-500/50 p-2 shadow-2xl transition-all"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={LANG_UI_MAP[currentLanguage].placeholder}
                disabled={loading}
                className="w-full pl-3 sm:pl-4 pr-12 py-2 bg-transparent text-white placeholder-slate-500 text-xs sm:text-sm font-sans focus:outline-none leading-relaxed resize-none overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [ms-overflow-style:none]"
                style={{ maxHeight: '180px' }}
              />

              <div className="flex items-center gap-1.5 pb-1 pr-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Voice Input"
                  aria-label="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Single Clean Footer Line */}
            <div className="text-center text-[11px] font-sans text-slate-500">
              Copyright © 2026 Zenemoo. All Rights Reserved.
            </div>
          </div>
        </div>
      </div>

      {/* ── ZENEMOO VOICE-TO-TEXT MODAL ── */}
      <ZenemooVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscriptComplete={handleVoiceTranscriptComplete}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};

export default ZenemooAiPage;
