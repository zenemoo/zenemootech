import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Download,
  Globe,
  Plus,
  History,
  Pin,
  Search,
  MessageSquare,
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Mic,
} from 'lucide-react';
import { ZenemooVoiceModal } from './ZenemooVoiceModal';
import {
  AiLanguage,
  AiChatMessage,
  AiConversation,
  AiActionButton,
  LANGUAGE_LABEL_MAP,
  LANG_UI_MAP,
  getStoredAiLanguage,
  saveAiLanguage,
  getStoredAiConversations,
  saveAiConversations,
  generateAutoTitle,
  detectLanguageSwitchIntent,
  parseActionButtons,
} from '../lib/aiStore';
import { aiApi } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ZenemooAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ─────────────────────────────────────────────────────────── */
/*  Navigation helper                                          */
/* ─────────────────────────────────────────────────────────── */
const executeAction = (action: string) => {
  if (action.startsWith('navigate:')) {
    const path = action.replace('navigate:', '');
    window.location.hash = path.replace('/', '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    setTimeout(() => { window.location.href = path; }, 50);
  } else if (action.startsWith('scroll:')) {
    const selector = action.replace('scroll:', '');
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (action.startsWith('url:')) {
    window.open(action.replace('url:', ''), '_blank', 'noopener,noreferrer');
  }
};

/* ─────────────────────────────────────────────────────────── */
/*  Action Buttons Bar                                         */
/* ─────────────────────────────────────────────────────────── */
const ActionButtonsBar: React.FC<{ buttons: AiActionButton[]; onClose: () => void }> = ({ buttons, onClose }) => {
  if (!buttons || buttons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={() => {
            executeAction(btn.action);
            onClose();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-500/20 transition-all text-[11px] font-mono font-bold cursor-pointer shadow-sm"
        >
          <span>{btn.icon}</span>
          <span>{btn.label}</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </button>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  Main Drawer Component                                      */
/* ─────────────────────────────────────────────────────────── */
export const ZenemooAiDrawer: React.FC<ZenemooAiDrawerProps> = ({ isOpen, onClose }) => {
  // ── State ──
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<AiLanguage>('en');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [lengthPref, setLengthPref] = useState<'auto' | 'short' | 'normal' | 'detailed'>('auto');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // ── Refs ──
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ui = LANG_UI_MAP[currentLanguage];

  const handleVoiceTranscript = (transcriptText: string) => {
    const trimmed = transcriptText.trim();
    if (!trimmed) return;
    setInput((prev) => {
      const prevTrimmed = prev.trim();
      return prevTrimmed ? `${prevTrimmed} ${trimmed}` : trimmed;
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // ── Load from storage ──
  useEffect(() => {
    const lang = getStoredAiLanguage();
    setCurrentLanguage(lang);
    const stored = getStoredAiConversations();
    setConversations(stored);
    if (stored.length > 0) setActiveConvId(stored[0].id);
    else startNewChatWith(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist to storage ──
  useEffect(() => {
    if (conversations.length > 0) saveAiConversations(conversations);
  }, [conversations]);

  // ── Scroll to bottom ──
  useEffect(() => {
    if (isOpen) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, conversations, activeConvId, loading]);

  // ── Focus input on open ──
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // ── Close lang dropdown on click-outside & ESC ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLangDropdownOpen(false);
        if (!isHistoryOpen) onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isHistoryOpen, onClose]);

  // ── Active conversation ──
  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  // ── Language change ──
  const handleSelectLanguage = useCallback((lang: AiLanguage) => {
    setCurrentLanguage(lang);
    saveAiLanguage(lang);
    setIsLangDropdownOpen(false);
    if (activeConv) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConv.id ? { ...c, language: lang, updatedAt: new Date().toISOString() } : c))
      );
    }
  }, [activeConv]);

  // ── Build welcome message ──
  const buildWelcomeMessage = (lang: AiLanguage): AiChatMessage => ({
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    content: `${LANG_UI_MAP[lang].welcomeTitle}\n\n${LANG_UI_MAP[lang].welcomeSubtitle}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    language: lang,
  });

  // ── Start new chat ──
  const startNewChatWith = (lang: AiLanguage = currentLanguage) => {
    const newId = `conv-${Date.now()}`;
    const newConv: AiConversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      language: lang,
      isPinned: false,
      messages: [buildWelcomeMessage(lang)],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
    setInput('');
    setIsHistoryOpen(false);
  };

  // ── Send message ──
  const handleSendMessage = async (customPrompt?: string) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText || loading) return;

    // Language switch intent detection
    const switchCheck = detectLanguageSwitchIntent(promptText);
    if (switchCheck.isSwitch && switchCheck.targetLang) {
      handleSelectLanguage(switchCheck.targetLang);
      const confirmMsg: AiChatMessage = {
        id: `sys-lang-${Date.now()}`,
        role: 'assistant',
        content: switchCheck.confirmMessage || LANG_UI_MAP[switchCheck.targetLang].langChanged(LANGUAGE_LABEL_MAP[switchCheck.targetLang].name),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: switchCheck.targetLang,
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv?.id
            ? { ...c, messages: [...c.messages, confirmMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );
      if (!customPrompt) setInput('');
      return;
    }

    // Add user message
    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: currentLanguage,
    };

    const isFirstUserMsg = (activeConv?.messages || []).filter((m) => m.role === 'user').length === 0;
    const updatedTitle = isFirstUserMsg ? generateAutoTitle(promptText) : (activeConv?.title || 'Conversation');
    const updatedMessages = [...(activeConv?.messages || []), userMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv?.id
          ? { ...c, title: updatedTitle, messages: updatedMessages, updatedAt: new Date().toISOString() }
          : c
      )
    );
    if (!customPrompt) {
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
    setLoading(true);

    try {
      const apiPayload = updatedMessages
        .filter((m) => !m.id.startsWith('welcome-') && !m.id.startsWith('sys-lang-'))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiApi.chat(
        apiPayload.length > 0 ? apiPayload : [{ role: 'user', content: promptText }],
        currentLanguage,
        lengthPref
      );

      const rawReply: string =
        res.data?.reply ||
        "I don't currently have verified information about that. Please contact our team at [contact@zenemoo.in](mailto:contact@zenemoo.in).";

      // Parse action buttons from response
      const { cleanContent, buttons } = parseActionButtons(rawReply);

      const aiMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: cleanContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentLanguage,
        actionButtons: buttons,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv?.id
            ? { ...c, messages: [...c.messages, aiMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('AI Request Failure:', err);
      const errMsg: AiChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: "Zenemoo AI is temporarily unavailable. Please try again or contact us at [contact@zenemoo.in](mailto:contact@zenemoo.in).",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentLanguage,
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv?.id ? { ...c, messages: [...c.messages, errMsg] } : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePin = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const remaining = conversations.filter((c) => c.id !== deleteConfirmId);
    setConversations(remaining);
    if (activeConvId === deleteConfirmId) {
      if (remaining.length > 0) setActiveConvId(remaining[0].id);
      else startNewChatWith();
    }
    setDeleteConfirmId(null);
  };

  const handleClearCurrentMessages = () => {
    if (!activeConv) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages: [{
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                content: ui.clearConfirm,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }],
            }
          : c
      )
    );
  };

  const handleExportChat = (format: 'txt' | 'md') => {
    if (!activeConv) return;
    const content = activeConv.messages
      .map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}:\n${m.content}`)
      .join('\n\n---\n\n');
    const mime = format === 'md' ? 'text/markdown' : 'text/plain';
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConv.title.toLowerCase().replace(/\s+/g, '-')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(historySearch.toLowerCase())
  );
  const pinnedConvs = filteredConversations.filter((c) => c.isPinned);
  const recentConvs = filteredConversations.filter((c) => !c.isPinned);

  return (
    <AnimatePresence>
      {/* Portal Root */}
      <div className="fixed inset-0 z-[200] flex justify-end font-sans" style={{ isolation: 'isolate' }}>

        {/* Dark Glass Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        />

        {/* Slide-Over Drawer — responsive widths */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          className="relative z-10 w-full sm:w-[82%] md:w-[600px] lg:w-[660px] flex flex-col bg-[#07080f] border-l border-white/[0.08] shadow-2xl overflow-hidden text-slate-100 selection:bg-cyan-500/30"
          style={{
            height: '100dvh',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >

          {/* ── HEADER ── */}
          <div className="flex-none px-3 sm:px-5 py-3 border-b border-white/[0.08] bg-black/60 backdrop-blur-xl flex items-center justify-between gap-2">
            {/* Logo + Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/20 shrink-0">
                <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#07080f] animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-sm font-display flex items-center gap-1.5 truncate">
                  Zenemoo AI
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">Official</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono hidden sm:block">Llama-3.3-70B · RAG Grounded</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

              {/* Language Dropdown — fixed z-index + click outside */}
              <div ref={langDropdownRef} className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-cyan-300 border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer text-xs font-mono"
                  aria-label="Select Language"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="hidden xs:inline sm:inline">{LANGUAGE_LABEL_MAP[currentLanguage].flag}</span>
                  <span className="hidden sm:inline">{LANGUAGE_LABEL_MAP[currentLanguage].nativeName}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isLangDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0d0e17]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 p-1.5 space-y-0.5"
                      style={{ zIndex: 9999 }}
                    >
                      {(['en', 'hi', 'or'] as AiLanguage[]).map((langKey) => (
                        <button
                          key={langKey}
                          onClick={() => handleSelectLanguage(langKey)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer font-mono ${
                            currentLanguage === langKey
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                              : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm">{LANGUAGE_LABEL_MAP[langKey].flag}</span>
                            <span>{LANGUAGE_LABEL_MAP[langKey].nativeName}</span>
                          </span>
                          {currentLanguage === langKey && (
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* History Toggle */}
              <button
                onClick={() => setIsHistoryOpen((v) => !v)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isHistoryOpen
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:bg-white/10 hover:text-slate-200'
                }`}
                title="Conversation History"
              >
                <History className="w-4 h-4" />
              </button>

              {/* New Chat */}
              <button
                onClick={() => startNewChatWith()}
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                title="Start New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/[0.08] transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── BODY (History Sidebar | Chat) ── */}
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* History Sidebar */}
            <AnimatePresence>
              {isHistoryOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 256, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#050609] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0"
                >
                  <div className="p-3 space-y-2 flex flex-col h-full">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder={ui.searchPlaceholder}
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>

                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                      {/* Pinned */}
                      {pinnedConvs.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider px-2 flex items-center gap-1">
                            <Pin className="w-3 h-3" /> {ui.pinned}
                          </div>
                          {pinnedConvs.map((c) => (
                            <ConvItem
                              key={c.id}
                              conv={c}
                              isActive={activeConvId === c.id}
                              isPinned
                              onSelect={() => { setActiveConvId(c.id); setIsHistoryOpen(false); }}
                              onPin={() => handleTogglePin(c.id)}
                              onDelete={() => setDeleteConfirmId(c.id)}
                            />
                          ))}
                        </div>
                      )}

                      {/* Recent */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">{ui.recent}</div>
                        {recentConvs.length === 0 ? (
                          <div className="text-[11px] text-slate-600 text-center py-6 px-2">{ui.noHistory}</div>
                        ) : (
                          recentConvs.map((c) => (
                            <ConvItem
                              key={c.id}
                              conv={c}
                              isActive={activeConvId === c.id}
                              isPinned={false}
                              onSelect={() => { setActiveConvId(c.id); setIsHistoryOpen(false); }}
                              onPin={() => handleTogglePin(c.id)}
                              onDelete={() => setDeleteConfirmId(c.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">

              {/* Scrollable messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-5 overscroll-contain">

                {activeConv?.messages.map((m) => (
                  <div key={m.id} className={`flex gap-2 sm:gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>

                    {/* AI Avatar */}
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 mt-1">
                        <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                      </div>
                    )}

                    <div className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end max-w-[88%]' : 'items-start max-w-[92%] sm:max-w-[88%]'}`}>
                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <span>{m.role === 'user' ? 'You' : 'Zenemoo AI'}</span>
                        <span>·</span>
                        <span>{m.timestamp}</span>
                      </div>

                      {/* Bubble */}
                      {m.role === 'user' ? (
                        <div className="px-4 py-2.5 rounded-2xl rounded-tr-none bg-gradient-to-br from-cyan-500 to-cyan-600 text-black font-medium text-xs sm:text-sm leading-relaxed shadow-lg shadow-cyan-500/20 max-w-full break-words">
                          {m.content}
                        </div>
                      ) : (
                        <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white/[0.04] border border-white/[0.08] text-slate-200 max-w-full">
                          <MarkdownRenderer content={m.content} />
                          {/* Action Buttons */}
                          {m.actionButtons && m.actionButtons.length > 0 && (
                            <ActionButtonsBar buttons={m.actionButtons} onClose={onClose} />
                          )}
                        </div>
                      )}

                      {/* Copy button for AI messages */}
                      {m.role === 'assistant' && (
                        <button
                          onClick={() => handleCopy(m.content, m.id)}
                          className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        >
                          {copiedId === m.id ? (
                            <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copy</>
                          )}
                        </button>
                      )}
                    </div>

                    {/* User Avatar */}
                    {m.role === 'user' && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-1 font-mono font-bold text-xs">
                        U
                      </div>
                    )}
                  </div>
                ))}

                {/* Starter Prompts */}
                {activeConv && activeConv.messages.filter((m) => m.role === 'user').length === 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-[11px] font-mono text-cyan-400/80 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      {currentLanguage === 'en' ? 'Try asking:' : currentLanguage === 'hi' ? 'पूछकर देखें:' : 'ଜିଜ୍ଞାସା କରନ୍ତୁ:'}
                    </div>
                    <div className="flex flex-col gap-2">
                      {ui.suggestions.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(prompt)}
                          className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 border border-white/[0.07] hover:border-cyan-500/30 transition-all cursor-pointer text-left text-[11px] font-mono group"
                        >
                          <span>{prompt}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex gap-2 sm:gap-3 justify-start items-start">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 animate-pulse">
                      <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-slate-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span>{ui.thinking}</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* ── INPUT BAR — sticky at bottom, above keyboard ── */}
              <div className="flex-none border-t border-white/[0.08] bg-[#07080f]/95 backdrop-blur-xl px-3 sm:px-4 pt-3 pb-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex gap-2 items-end"
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value.slice(0, 2000));
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !loading) {
                          handleSendMessage();
                        }
                      }
                    }}
                    placeholder={ui.placeholder}
                    disabled={loading}
                    maxLength={2000}
                    className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 text-xs sm:text-sm font-sans focus:outline-none focus:border-cyan-500/60 focus:bg-white/[0.06] transition-all disabled:opacity-60 min-w-0 resize-none overflow-y-auto max-h-[120px] leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer border border-white/[0.08] flex items-center justify-center shrink-0 mb-[1px]"
                    title="Voice Input"
                    aria-label="Voice input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-4 sm:px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0 mb-[1px]"
                  >
                    <span className="hidden sm:inline">{ui.sendBtn}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Footer micro-bar */}
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-600">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleExportChat('txt')}
                      className="hover:text-slate-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> {ui.exportTxt}
                    </button>
                    <button
                      onClick={handleClearCurrentMessages}
                      className="hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> {ui.clearBtn}
                    </button>
                  </div>
                  <span>{input.length}/2000</span>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0d0e1a] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl shadow-red-500/10"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">{ui.deleteTitle}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{ui.deleteBody}</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-300 font-bold text-xs font-mono transition-colors cursor-pointer"
                >
                  {ui.cancel}
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs font-mono transition-colors cursor-pointer shadow-lg shadow-red-500/20"
                >
                  {ui.confirmDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ZENEMOO VOICE-TO-TEXT MODAL ── */}
      <ZenemooVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscriptComplete={handleVoiceTranscript}
        currentLanguage={currentLanguage}
      />
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  Conversation List Item                                     */
/* ─────────────────────────────────────────────────────────── */
const ConvItem: React.FC<{
  conv: AiConversation;
  isActive: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}> = ({ conv, isActive, isPinned, onSelect, onPin, onDelete }) => (
  <div
    onClick={onSelect}
    className={`group p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
      isActive
        ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300 font-bold'
        : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
    }`}
  >
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
      <span className="truncate text-[11px] font-mono">{conv.title}</span>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); onPin(); }}
        className={`p-1 rounded hover:bg-white/10 transition-colors ${isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
      >
        <Pin className={`w-3 h-3 ${isPinned ? 'fill-amber-400' : ''}`} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  </div>
);
