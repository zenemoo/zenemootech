import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
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
} from 'lucide-react';
import { aiApi } from '../services/api';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
}

const SUGGESTED_QUESTIONS = [
  "What regional languages does Zenemoo support for audio transcription?",
  "How does Zenemoo partner with DesiCrew Solutions?",
  "What is Zenemoo's daily audio processing capacity and accuracy rating?",
  "How can I apply for job opportunities at Zenemoo?",
  "How can an enterprise hire Zenemoo for AI dataset annotation?",
];

export const ZenemooAiPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am **Zenemoo AI**, the official intelligent assistant for **Zenemoo** (formerly known as QuantumCoders Data Solution).

I can answer any questions regarding:
- 🎙️ **Multilingual Audio Transcription & Speech Data**
- 🤝 **DesiCrew Enterprise Partnership**
- 💼 **Job & Program Opportunities**
- 🛡️ **Super QC Accuracy Ratings & Production Capacity**
- 📞 **Contacting Our Operations & Lead Engineering Team**

*How can I assist you today?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Prepare payload for backend Express API -> Groq RAG Engine
      const apiPayload = newMessages
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiApi.chat(apiPayload.length > 0 ? apiPayload : [{ role: 'user', content: query }]);

      const aiReply = res.data?.reply || "I don't currently have verified information about that. Please contact the Zenemoo team at contact@zenemoo.in.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
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
    setTimeout(() => setCopiedId(null), 2000);
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
  };

  const handleExportChat = () => {
    const chatText = messages.map((m) => `[${m.timestamp}] ${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenemoo-ai-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar onBack={onBack} showBackButton={true} />

      {/* Main Container */}
      <main className="pt-28 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-4 shadow-lg shadow-cyan-500/10">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            OFFICIAL ZENEMOO AI ASSISTANT
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight text-white mb-4">
            Zenemoo <span className="text-gradient-hero">AI</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg font-mono leading-relaxed">
            "Ask anything about Zenemoo." Grounded strictly in verified company knowledge and live database records.
          </p>

          {/* Quick Capability Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-cyan-400" /> Audio Transcription
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-purple-400" /> Odia &amp; Regional Speech
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" /> DesiCrew Partnership
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Career Opportunities
            </span>
          </div>
        </div>

        {/* ChatGPT / Claude / Perplexity Inspired Glass Interface */}
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-cyan-950/20 relative flex flex-col min-h-[620px]">
          {/* Panel Top Bar */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20">
                <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
              </div>
              <div>
                <div className="text-white font-bold flex items-center gap-2">
                  Zenemoo AI Engine <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <div className="text-[10px] text-slate-400">Grok / Llama-3.3-70B • RAG Verified</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportChat}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                title="Export Conversation"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearChat}
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Suggested Questions Bar */}
          <div className="p-4 bg-white/[0.02] border-b border-white/5 overflow-x-auto scrollbar-none flex items-center gap-2 font-mono text-xs">
            <span className="text-cyan-400 font-bold shrink-0 flex items-center gap-1 text-[11px]">
              <HelpCircle className="w-3.5 h-3.5" /> Suggested:
            </span>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer text-[11px]"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[500px] scrollbar-thin">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 sm:gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 mt-1">
                    <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>{m.role === 'user' ? 'You' : 'Zenemoo AI'}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm font-sans leading-relaxed relative ${
                      m.role === 'user'
                        ? 'bg-cyan-500 text-black font-medium shadow-lg shadow-cyan-500/20 rounded-tr-none'
                        : 'bg-white/[0.04] text-slate-200 border border-white/10 rounded-tl-none font-mono whitespace-pre-wrap'
                    }`}
                  >
                    {m.content}
                  </div>

                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-400">
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

            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shrink-0 animate-pulse">
                  <img src="/assets/logo.png" alt="Zenemoo AI" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 font-mono text-xs text-slate-400 flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>Zenemoo AI is processing live database context...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 backdrop-blur-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Zenemoo services, languages, team, or opportunities..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="text-[10px] font-mono text-slate-500 text-center mt-3">
              Languages Supported: English • Hindi (हिंदी) • Odia (ଓଡ଼ିଆ) | Zenemoo AI may display verified database records.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ZenemooAiPage;
