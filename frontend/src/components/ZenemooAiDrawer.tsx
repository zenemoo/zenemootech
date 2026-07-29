import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Download,
  Globe,
  Plus,
  History,
  Pin,
  Edit2,
  Search,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  Square,
  MessageSquare,
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  Mail,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import {
  AiLanguage,
  AiChatMessage,
  AiConversation,
  LANGUAGE_LABEL_MAP,
  getStoredAiLanguage,
  saveAiLanguage,
  getStoredAiConversations,
  saveAiConversations,
  generateAutoTitle,
  detectLanguageSwitchIntent,
} from '../lib/aiStore';
import { aiApi } from '../services/api';

interface ZenemooAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateContact?: () => void;
  onNavigateOpportunities?: () => void;
}

const WELCOME_PROMPTS = [
  "Tell me about Zenemoo",
  "What services do you provide?",
  "How can I partner with Zenemoo?",
  "How do I submit a project?",
  "Show your AI Image Enhancement service.",
];

export const ZenemooAiDrawer: React.FC<ZenemooAiDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateContact,
  onNavigateOpportunities,
}) => {
  // State
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<AiLanguage>('en');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Edit / Delete Conversation Modals
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initial Load from Local Storage
  useEffect(() => {
    const lang = getStoredAiLanguage();
    setCurrentLanguage(lang);

    const stored = getStoredAiConversations();
    setConversations(stored);

    if (stored.length > 0) {
      setActiveConvId(stored[0].id);
    } else {
      startNewChat(lang);
    }
  }, []);

  // Save to Local Storage when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      saveAiConversations(conversations);
    }
  }, [conversations]);

  // Scroll to bottom
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, conversations, activeConvId, loading]);

  // Active Conversation helper
  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  // Language Change Handler
  const handleSelectLanguage = (lang: AiLanguage) => {
    setCurrentLanguage(lang);
    saveAiLanguage(lang);
    setIsLangDropdownOpen(false);

    if (activeConv) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConv.id ? { ...c, language: lang, updatedAt: new Date().toISOString() } : c))
      );
    }
  };

  // Start New Chat
  const startNewChat = (langToUse = currentLanguage) => {
    const newId = `conv-${Date.now()}`;
    const newConv: AiConversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      language: langToUse,
      isPinned: false,
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Hello 👋 I'm **Zenemoo AI**, your Official AI Assistant.

How can I help you today? You can ask me about:
- 🎙️ **Multilingual Audio Transcription** (Odia, Hindi, English)
- 🖼️ **AI Image Enhancement & Dataset Annotation**
- 🤝 **DesiCrew Enterprise Partnership**
- 💼 **Careers & Job Opportunities**
- 📞 **Getting Custom Enterprise Quotes**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          language: langToUse,
        },
      ],
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
    setInput('');
  };

  // Send Message Handler
  const handleSendMessage = async (customPrompt?: string) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText || loading) return;

    if (!activeConv) {
      startNewChat();
      return;
    }

    // Check if prompt is a language switch intent ("Switch to Hindi", "ଓଡ଼ିଆରେ କୁହ")
    const switchCheck = detectLanguageSwitchIntent(promptText);
    if (switchCheck.isSwitch && switchCheck.targetLang) {
      handleSelectLanguage(switchCheck.targetLang);
      const systemConfirmMsg: AiChatMessage = {
        id: `sys-lang-${Date.now()}`,
        role: 'assistant',
        content: switchCheck.confirmMessage || `✅ Language changed to ${LANGUAGE_LABEL_MAP[switchCheck.targetLang].name}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: switchCheck.targetLang,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, messages: [...c.messages, systemConfirmMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );
      if (!customPrompt) setInput('');
      return;
    }

    const userMsgId = `user-${Date.now()}`;
    const userMsg: AiChatMessage = {
      id: userMsgId,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: currentLanguage,
    };

    // Auto-generate title if conversation title is default
    const isFirstUserMsg = activeConv.messages.filter((m) => m.role === 'user').length === 0;
    const updatedTitle = isFirstUserMsg ? generateAutoTitle(promptText) : activeConv.title;

    const updatedMessages = [...activeConv.messages, userMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              title: updatedTitle,
              messages: updatedMessages,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      // API Payload
      const apiPayload = updatedMessages
        .filter((m) => !m.id.startsWith('welcome-') && !m.id.startsWith('sys-lang-'))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiApi.chat(
        apiPayload.length > 0 ? apiPayload : [{ role: 'user', content: promptText }],
        currentLanguage
      );

      const aiReply =
        res.data?.reply ||
        "I don't currently have verified information about that specific request. Please contact our team at contact@zenemoo.in.";

      const aiMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentLanguage,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, messages: [...c.messages, aiMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      console.error('AI Request Failure:', err);
      const errReply: AiChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content:
          "Zenemoo AI is temporarily unavailable. Please try again or contact our team directly at contact@zenemoo.in.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentLanguage,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id ? { ...c, messages: [...c.messages, errReply] } : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Copy Message
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Pin
  const handleTogglePin = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  // Rename Conversation
  const handleSaveRename = (convId: string) => {
    if (!editingTitle.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: editingTitle.trim() } : c))
    );
    setEditingConvId(null);
    setEditingTitle('');
  };

  // Delete Conversation
  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const remaining = conversations.filter((c) => c.id !== deleteConfirmId);
    setConversations(remaining);
    if (activeConvId === deleteConfirmId) {
      if (remaining.length > 0) setActiveConvId(remaining[0].id);
      else startNewChat();
    }
    setDeleteConfirmId(null);
  };

  // Clear Active Chat Messages Only
  const handleClearCurrentMessages = () => {
    if (!activeConv) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages: [
                {
                  id: `welcome-${Date.now()}`,
                  role: 'assistant',
                  content: 'Chat cleared. How else can I assist you?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            }
          : c
      )
    );
  };

  // Export Active Chat
  const handleExportChat = (format: 'txt' | 'md') => {
    if (!activeConv) return;
    const content = activeConv.messages
      .map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const mime = format === 'md' ? 'text/markdown' : 'text/plain';
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConv.title.toLowerCase().replace(/\s+/g, '-')}.${format}`;
    a.click();
  };

  if (!isOpen) return null;

  // Filtered Conversations for History Sidebar
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(historySearch.toLowerCase())
  );
  const pinnedConvs = filteredConversations.filter((c) => c.isPinned);
  const recentConvs = filteredConversations.filter((c) => !c.isPinned);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex justify-end font-sans">
        {/* Dark Glass Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
        />

        {/* Slide-Over Drawer Container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative z-10 w-full sm:w-[90%] md:w-[620px] lg:w-[680px] h-full bg-[#08090e] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200"
        >
          {/* 1. DRAWER TOP HEADER */}
          <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/20">
                <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm font-display flex items-center gap-2">
                  Zenemoo AI <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Official</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Grok / Llama-3.3-70B • RAG Grounded</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Dropdown Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-cyan-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{LANGUAGE_LABEL_MAP[currentLanguage].flag} {LANGUAGE_LABEL_MAP[currentLanguage].nativeName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-[#0e1017] border border-white/10 shadow-2xl p-1.5 z-50 space-y-1">
                    {(['en', 'hi', 'or'] as AiLanguage[]).map((langKey) => (
                      <button
                        key={langKey}
                        onClick={() => handleSelectLanguage(langKey)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
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

              {/* History Toggle */}
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isHistoryOpen ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
                title="Conversation History"
              >
                <History className="w-4 h-4" />
              </button>

              {/* New Chat Button */}
              <button
                onClick={() => startNewChat()}
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-md cursor-pointer"
                title="Start New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Close Drawer Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                title="Close AI Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. MAIN BODY (HISTORY SIDEBAR OR CHAT FEED) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* History Sidebar */}
            {isHistoryOpen && (
              <div className="w-72 bg-[#050609] border-r border-white/10 flex flex-col p-3 space-y-3 z-20 shadow-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1 font-mono text-xs">
                  {/* Pinned Section */}
                  {pinnedConvs.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </div>
                      {pinnedConvs.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setActiveConvId(c.id);
                            setIsHistoryOpen(false);
                          }}
                          className={`group p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            activeConvId === c.id
                              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-bold'
                              : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                            <span className="truncate">{c.title}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(c.id);
                              }}
                              className="p-1 text-amber-400 hover:bg-white/10 rounded"
                            >
                              <Pin className="w-3 h-3 fill-amber-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(c.id);
                              }}
                              className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent Section */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                      Recent Conversations
                    </div>
                    {recentConvs.length === 0 ? (
                      <div className="text-[11px] text-slate-500 px-2 py-4 text-center">No history records found.</div>
                    ) : (
                      recentConvs.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setActiveConvId(c.id);
                            setIsHistoryOpen(false);
                          }}
                          className={`group p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            activeConvId === c.id
                              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-bold'
                              : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{c.title}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(c.id);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-400 rounded"
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(c.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages Feed Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#08090e] to-[#040508]">
              {/* Chat Content Scrollable */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin">
                {activeConv?.messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 sm:gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 mt-1">
                        <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[80%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span>{m.role === 'user' ? 'You' : 'Zenemoo AI'}</span>
                        <span>•</span>
                        <span>{m.timestamp}</span>
                      </div>

                      <div
                        className={`p-4 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed relative ${
                          m.role === 'user'
                            ? 'bg-cyan-500 text-black font-medium shadow-lg shadow-cyan-500/20 rounded-tr-none font-sans'
                            : 'bg-white/[0.04] text-slate-200 border border-white/10 rounded-tl-none font-mono whitespace-pre-wrap'
                        }`}
                      >
                        {m.content}
                      </div>

                      {m.role === 'assistant' && (
                        <div className="flex items-center gap-3 pt-1 font-mono text-[10px] text-slate-400">
                          <button
                            onClick={() => handleCopy(m.content, m.id)}
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedId === m.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>

                    {m.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-1 font-mono font-bold text-xs">
                        U
                      </div>
                    )}
                  </div>
                ))}

                {/* Suggested Starter Prompts Pill Bar */}
                {activeConv?.messages.length <= 1 && (
                  <div className="pt-4 space-y-3">
                    <div className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Suggested Starter Questions:
                    </div>
                    <div className="flex flex-wrap gap-2 font-mono text-xs">
                      {WELCOME_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer text-left text-[11px] flex items-center gap-2"
                        >
                          <span>{prompt}</span>
                          <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 animate-pulse">
                      <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 font-mono text-xs text-slate-400 flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span>Thinking and retrieving verified Supabase knowledge...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* 3. INPUT FOOTER BOX */}
              <div className="p-4 border-t border-white/10 bg-black/80 backdrop-blur-xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      currentLanguage === 'hi'
                        ? 'जेनेमू AI से कुछ भी पूछें (उदा. ऑडियो ट्रांसक्रिप्शन)...'
                        : currentLanguage === 'or'
                        ? 'ଜେନେମୁ AI କୁ ପଚାରନ୍ତୁ (ଉଦା. ଅଡିଓ ଟ୍ରାନ୍ସକ୍ରିପସନ୍)...'
                        : 'Ask Zenemoo AI (e.g. Audio Transcription, DesiCrew alliance)...'
                    }
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2.5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleExportChat('txt')}
                      className="hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Export TXT
                    </button>
                    <button
                      onClick={handleClearCurrentMessages}
                      className="hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Screen
                    </button>
                  </div>
                  <div>
                    {input.length}/2000 chars
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className="glass-panel p-6 rounded-3xl border border-red-500/30 max-w-sm w-full space-y-4 text-center shadow-2xl shadow-red-500/10">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white font-display">Delete Conversation?</h4>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this AI conversation history?
            </p>
            <div className="flex items-center justify-center gap-3 font-mono text-xs pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors cursor-pointer shadow-lg shadow-red-500/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
