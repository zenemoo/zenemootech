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
  ArrowLeft,
  ShieldCheck,
  Globe,
  Briefcase,
  Mic,
  Languages,
  Mail,
  Zap,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  Info,
  Search,
  Plus,
  Menu,
  X,
  ThumbsUp,
  ThumbsDown,
  Share2,
  ExternalLink,
  Edit2,
  Pin,
  Clock,
  CheckCircle,
  Sliders,
  Sparkle,
} from 'lucide-react';
import { aiApi } from '../services/api';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

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
  intent?: string;
  actionButtons?: { label: string; icon: string; action: string }[];
}

const FEATURED_PROMPTS = [
  {
    icon: <Mic className="w-5 h-5 text-cyan-400" />,
    title: 'Multilingual Audio Data',
    prompt: 'What regional languages does Zenemoo support for speech transcription and audio datasets?',
    tag: 'Speech AI',
  },
  {
    icon: <Globe className="w-5 h-5 text-purple-400" />,
    title: 'DesiCrew Alliance',
    prompt: 'How does Zenemoo partner with DesiCrew Solutions for enterprise projects?',
    tag: 'Partnership',
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    title: 'Accuracy & Capacity',
    prompt: "What is Zenemoo's daily audio processing capacity and Super QC accuracy rating?",
    tag: 'Telemetry',
  },
  {
    icon: <Briefcase className="w-5 h-5 text-amber-400" />,
    title: 'Careers & Jobs',
    prompt: 'How can I apply for language annotator and contributor job opportunities at Zenemoo?',
    tag: 'Careers',
  },
  {
    icon: <Zap className="w-5 h-5 text-pink-400" />,
    title: 'Enterprise Annotation',
    prompt: 'How can an enterprise hire Zenemoo for AI dataset collection and data validation?',
    tag: 'Enterprise',
  },
  {
    icon: <Mail className="w-5 h-5 text-blue-400" />,
    title: 'Contact Operations',
    prompt: "How can I contact Zenemoo's lead engineering and operations team?",
    tag: 'Support',
  },
];

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
    <div className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#0b0f19] shadow-2xl font-mono text-xs">
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>(() => getStoredAiConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [tempConvTitle, setTempConvTitle] = useState('');

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'info' }>>([]);
  const [likedMessageIds, setLikedMessageIds] = useState<Record<string, 'like' | 'dislike'>>({});

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = `toast-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am **Zenemoo AI**, the official intelligent assistant for **Zenemoo** (formerly known as QuantumCoders Data Solution).

I am grounded in verified company knowledge and live database records. I can assist you with:
* 🎙️ **Multilingual Audio Transcription & Speech Data**
* 🤝 **DesiCrew Enterprise Alliance**
* 💼 **Job & Program Opportunities**
* 🛡️ **Super QC Accuracy Ratings & Production Capacity**
* 📞 **Contacting Our Operations & Lead Engineering Team**

*How can I assist you today?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
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
    setIsSidebarOpen(false);
    showToast('Started new conversation');
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
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      handleNewChat();
    }
    showToast('Conversation deleted', 'info');
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

    // Check language switch intent ("Switch to Hindi", "ଓଡ଼ିଆରେ କୁହ")
    const switchCheck = detectLanguageSwitchIntent(query);
    if (switchCheck.isSwitch && switchCheck.targetLang) {
      handleSelectLanguage(switchCheck.targetLang);
      const systemConfirmMsg: Message = {
        id: `sys-lang-${Date.now()}`,
        role: 'assistant',
        content: switchCheck.confirmMessage || `✅ Language changed to ${LANGUAGE_LABEL_MAP[switchCheck.targetLang].name}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, systemConfirmMsg]);
      if (!textToSend) setInput('');
      return;
    }

    const userMsgId = `user-${Date.now()}`;
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        currentLanguage
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

      // Save/Update Conversation History in LocalStorage
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

        const res = await aiApi.chat(apiPayload, currentLanguage);
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

  const handleExportChat = () => {
    const chatText = messages.map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenemoo-ai-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    showToast('Exported chat history');
  };

  const handleToggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      showToast('Voice input stopped', 'info');
    } else {
      setIsListening(true);
      showToast('Listening... Speak now 🎙️', 'info');
      setTimeout(() => {
        setIsListening(false);
      }, 4000);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchHistory.toLowerCase())
  );

  const isOnlyWelcome = messages.length <= 1;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden flex flex-col">
      {/* Floating Toast System */}
      <div className="fixed top-20 right-5 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-4 py-2.5 rounded-2xl bg-[#0e1320]/90 border border-cyan-500/30 text-cyan-300 font-mono text-xs shadow-2xl backdrop-blur-xl flex items-center gap-2 pointer-events-auto"
            >
              <CheckCircle className="w-4 h-4 text-cyan-400" />
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Main Navbar */}
      <Navbar onBack={onBack} showBackButton={true} />

      {/* Main Page Layout Container with Collapsible Sidebar */}
      <div className="pt-20 flex-1 flex relative">
        {/* SIDEBAR DRAWER (COLLAPSIBLE DESKTOP & MOBILE OVERLAY) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Mobile backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
              />

              {/* Sidebar Content Panel */}
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed lg:static top-20 bottom-0 left-0 w-80 bg-[#090d16] border-r border-white/10 z-40 flex flex-col justify-between p-4 shadow-2xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-cyan-400" />
                      <span>New Conversation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search Conversations Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search history..."
                      value={searchHistory}
                      onChange={(e) => setSearchHistory(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Saved Conversations List */}
                  <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin pr-1">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> Saved Chats ({filteredConversations.length})
                    </div>

                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 font-mono text-xs">
                        No saved chats yet.
                      </div>
                    ) : (
                      filteredConversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs font-mono ${
                            activeConvId === conv.id
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 font-bold'
                              : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <MessageSquare className="w-4 h-4 shrink-0 text-cyan-400" />
                            {editingConvId === conv.id ? (
                              <input
                                type="text"
                                value={tempConvTitle}
                                onChange={(e) => setTempConvTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameConversation(conv.id, tempConvTitle, e as any);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/50 border border-cyan-400 px-2 py-0.5 rounded text-white text-xs"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{conv.title}</span>
                            )}
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                            {editingConvId === conv.id ? (
                              <button
                                type="button"
                                onClick={(e) => handleRenameConversation(conv.id, tempConvTitle, e)}
                                className="p-1 hover:text-emerald-400"
                              >
                                <Check className="w-3.5 h-3.5" />
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
                                title="Rename Chat"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              className="p-1 hover:text-red-400"
                              title="Delete Chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sidebar Footer Info */}
                <div className="pt-3 border-t border-white/10 font-mono text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> RAG Engine Active
                  </span>
                  <span className="text-[10px] text-slate-500">v2.5</span>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          {/* Top Sticky Bar inside Chat Area */}
          <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-white/10 mb-6 flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-all cursor-pointer"
                title="Toggle Conversation Drawer"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20">
                  <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white font-display flex items-center gap-2">
                    Zenemoo AI Assistant
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                      Live RAG
                    </span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Grounded strictly in verified Zenemoo knowledge</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-cyan-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-mono"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{LANGUAGE_LABEL_MAP[currentLanguage].flag} {LANGUAGE_LABEL_MAP[currentLanguage].nativeName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0e1017] border border-white/10 shadow-2xl p-1.5 z-50 space-y-1">
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

              <button
                type="button"
                onClick={handleExportChat}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                title="Export Conversation"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CHAT MESSAGES & HERO EMPTY STATE CONTAINER */}
          <div className="flex-1 min-h-[500px] flex flex-col justify-between glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-cyan-950/20 relative">
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 max-h-[600px] scrollbar-thin">
              {isOnlyWelcome && (
                /* HERO EMPTY STATE WITH FEATURED PROMPT CARDS */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-8 px-2 text-center max-w-3xl mx-auto space-y-8"
                >
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono shadow-lg shadow-cyan-500/10">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      GROUNDED IN VERIFIED ZENEMOO KNOWLEDGE
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight">
                      How can <span className="text-gradient-hero">Zenemoo AI</span> assist you?
                    </h1>
                    <p className="text-slate-300 text-xs sm:text-sm font-mono max-w-xl mx-auto leading-relaxed">
                      Ask about audio transcription capacity, regional Odia datasets, DesiCrew alliance, Super QC accuracy ratings, or job opportunities.
                    </p>
                  </div>

                  {/* 6 Interactive Featured Prompt Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
                    {FEATURED_PROMPTS.map((item, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSend(item.prompt)}
                        className="p-4 rounded-2xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer space-y-2 group shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-cyan-500/20 transition-colors">
                            {item.icon}
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 group-hover:text-cyan-300">
                            {item.tag}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white font-display group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono line-clamp-2 leading-relaxed">
                          {item.prompt}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* MESSAGES TRAJECTORY */}
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 sm:gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 mt-1 shadow-lg shadow-cyan-500/20">
                      <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                    </div>
                  )}

                  <div className={`max-w-[90%] sm:max-w-[80%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span>{m.role === 'user' ? 'You' : 'Zenemoo AI'}</span>
                      <span>•</span>
                      <span>{m.timestamp}</span>
                    </div>

                    <div
                      className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm font-sans leading-relaxed relative shadow-xl ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-tr-none shadow-cyan-900/20'
                          : 'bg-white/[0.04] text-slate-200 border border-white/10 rounded-tl-none font-sans'
                      }`}
                    >
                      {m.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      ) : (
                        /* MARKDOWN FORMATTED ASSISTANT RESPONSES (Clean typography, no raw **, ##, or *** symbols) */
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: CodeBlock,
                            h1: ({ children }) => <h1 className="text-lg sm:text-xl font-bold text-white font-display mt-4 mb-2 pb-1 border-b border-white/10">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base sm:text-lg font-bold text-cyan-300 font-display mt-3 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm sm:text-base font-bold text-purple-300 font-display mt-2 mb-1">{children}</h3>,
                            p: ({ children }) => <p className="mb-3 leading-relaxed text-slate-200 text-xs sm:text-sm">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 my-2.5 pl-2 text-slate-200 text-xs sm:text-sm">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 my-2.5 pl-2 text-slate-200 text-xs sm:text-sm">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-cyan-400 pl-4 py-1.5 my-3 italic text-slate-300 bg-cyan-500/5 rounded-r-xl">{children}</blockquote>,
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300 inline-flex items-center gap-1 font-medium">
                                {children} <ExternalLink className="w-3 h-3" />
                              </a>
                            ),
                            table: ({ children }) => (
                              <div className="my-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
                                <table className="w-full text-left border-collapse text-xs sm:text-sm">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-white/5 border-b border-white/10 text-cyan-300 font-mono">{children}</thead>,
                            th: ({ children }) => <th className="p-3 font-bold">{children}</th>,
                            td: ({ children }) => <td className="p-3 border-b border-white/5 text-slate-300">{children}</td>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )}

                      {/* Action Tokens / Interactive Quick Buttons */}
                      {m.actionButtons && m.actionButtons.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10 mt-3">
                          {m.actionButtons.map((btn, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (btn.action.startsWith('navigate:')) {
                                  window.location.pathname = btn.action.replace('navigate:', '');
                                } else if (btn.action.startsWith('scroll:')) {
                                  const el = document.querySelector(btn.action.replace('scroll:', ''));
                                  el?.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span>{btn.icon}</span>
                              <span>{btn.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ASSISTANT MESSAGE ACTION TOOLBAR (Copy, Regenerate, Like, Dislike) */}
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-3 pt-1 font-mono text-[10px] text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleCopy(m.content, m.id)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          title="Copy Message"
                        >
                          {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRegenerate(m.id)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          title="Regenerate Response"
                        >
                          <RefreshCw className="w-3 h-3 text-cyan-400" />
                          <span>Regenerate</span>
                        </button>

                        <div className="h-3 w-[1px] bg-white/10" />

                        <button
                          type="button"
                          onClick={() => handleRateMessage(m.id, 'like')}
                          className={`hover:text-emerald-400 transition-colors cursor-pointer ${likedMessageIds[m.id] === 'like' ? 'text-emerald-400' : ''}`}
                          title="Helpful Response"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRateMessage(m.id, 'dislike')}
                          className={`hover:text-rose-400 transition-colors cursor-pointer ${likedMessageIds[m.id] === 'dislike' ? 'text-rose-400' : ''}`}
                          title="Unhelpful Response"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-1 font-mono font-bold text-xs">
                      U
                    </div>
                  )}
                </motion.div>
              ))}

              {/* ANIMATED TYPING / SKELETON LOADER STATE */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 animate-pulse">
                    <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 font-mono text-xs text-slate-300 flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    <div className="flex items-center gap-1.5">
                      <span>Zenemoo AI is processing live database context</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-200"></span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* INPUT CONTROLS CONTAINER */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-black/80 backdrop-blur-2xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center gap-2"
              >
                <div className="relative flex-1">
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
                    className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm font-sans focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all leading-relaxed resize-none overflow-hidden max-h-32"
                  />

                  {/* Voice Mic Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`absolute right-3 top-3 p-1 rounded-lg transition-colors cursor-pointer ${
                      isListening ? 'text-rose-400 animate-pulse' : 'text-slate-400 hover:text-cyan-300'
                    }`}
                    title="Voice Input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-5 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-3 px-1">
                <span>Languages: English • Hindi (हिंदी) • Odia (ଓଡ଼ିଆ)</span>
                <span>Press Enter to send, Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <Footer />
    </div>
  );
};

export default ZenemooAiPage;
