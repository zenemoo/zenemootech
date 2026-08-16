import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mail,
  MessageSquare,
  Users,
  Briefcase,
  Building,
  UserCheck,
  ShieldCheck,
  Send,
  Copy,
  Check,
  RefreshCw,
  Edit3,
  Globe,
  Sliders,
  FileText,
  Bookmark,
  CheckCircle2,
  Clock,
  ArrowRight,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { adminHrAiApi } from '../services/api';

interface AdminHrAiPageProps {
  onShowStatus?: (msg: string) => void;
  activeAdminEmail?: string;
}

interface SavedSignature {
  name: string;
  designation: string;
  company: string;
  email: string;
  phone: string;
  website: string;
}

const DEFAULT_SIGNATURE: SavedSignature = {
  name: 'Prem Prasad Pradhan',
  designation: 'Operations Manager',
  company: 'Zenemoo Data Solutions',
  email: 'prem@zenemoo.in',
  phone: '+91 9827775230',
  website: 'www.zenemoo.in',
};

const TEMPLATE_LIBRARY = [
  {
    id: 'tmpl-1',
    category: 'Client',
    title: 'Quotation Follow-Up',
    description: 'Polite follow-up asking client for update on submitted project quotation.',
    prompt: 'Write a polite follow-up email to [Client Name] regarding our submitted AI data project quotation for [Project Name]. Ask if they need any clarification.',
  },
  {
    id: 'tmpl-2',
    category: 'Vendor',
    title: '50 Odia Speakers Request',
    description: 'Urgent request to regional data partner for 50 native Odia speakers.',
    prompt: 'Write a WhatsApp message to vendor [Vendor Name] asking if they can arrange 50 native Odia speakers for an upcoming audio collection project by [Deadline Date].',
  },
  {
    id: 'tmpl-3',
    category: 'Candidate',
    title: 'Interview Invitation',
    description: 'Official invitation for transcriptionist or QC specialist role.',
    prompt: 'Write an email to candidate [Candidate Name] inviting them for an online interview for the position of [Job Title] on [Date] at [Time].',
  },
  {
    id: 'tmpl-4',
    category: 'Client',
    title: 'Payment Follow-Up',
    description: 'Professional reminder regarding upcoming or overdue milestone invoice.',
    prompt: 'Write a professional email to client [Client Name] following up on invoice [Invoice Number] for [Project Name]. Ask for the expected payment date.',
  },
  {
    id: 'tmpl-5',
    category: 'HR',
    title: 'Team Announcement',
    description: 'Internal notice regarding new policy or upcoming team holiday.',
    prompt: 'Write an internal team message announcing [Announcement Subject] effective from [Date]. Keep it clear and encouraging.',
  },
];

export const AdminHrAiPage: React.FC<AdminHrAiPageProps> = ({ onShowStatus, activeAdminEmail }) => {
  const [activeCategory, setActiveCategory] = useState<'quick' | 'email' | 'whatsapp' | 'hr' | 'client' | 'vendor' | 'candidate' | 'templates' | 'settings'>('quick');

  // Form State
  const [recipientType, setRecipientType] = useState('Client');
  const [purpose, setPurpose] = useState('General Follow-up');
  const [userPrompt, setUserPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('normal');
  const [language, setLanguage] = useState('en');
  const [useSignature, setUseSignature] = useState(true);

  // Signature state
  const [signature, setSignature] = useState<SavedSignature>(() => {
    try {
      const saved = localStorage.getItem('zenemoo_admin_ai_signature');
      return saved ? JSON.parse(saved) : DEFAULT_SIGNATURE;
    } catch (_) {
      return DEFAULT_SIGNATURE;
    }
  });

  // Output State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastAction, setLastAction] = useState('');

  const showNotification = (msg: string) => {
    if (onShowStatus) onShowStatus(msg);
  };

  const handleSaveSignature = () => {
    try {
      localStorage.setItem('zenemoo_admin_ai_signature', JSON.stringify(signature));
      showNotification('Signature settings saved successfully.');
    } catch (_) {}
  };

  const handleGenerate = async (customPromptStr?: string, overrideCategory?: string) => {
    const finalPrompt = (customPromptStr || userPrompt).trim();
    if (!finalPrompt) {
      showNotification('Please enter your prompt or message instruction.');
      return;
    }

    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await adminHrAiApi.generate({
        category: overrideCategory || activeCategory,
        recipientType,
        purpose,
        userPrompt: finalPrompt,
        tone,
        length,
        language,
        signature: useSignature ? signature : null,
      });

      if (res.data?.success && res.data?.data) {
        setGeneratedOutput(res.data.data);
        showNotification('Communication drafted successfully!');
      } else {
        showNotification('Failed to generate message. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Error generating AI communication.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModify = async (action: string) => {
    if (!generatedOutput.trim()) {
      showNotification('No existing message to modify.');
      return;
    }

    setIsGenerating(true);
    setCopied(false);
    setLastAction(action);

    try {
      const res = await adminHrAiApi.modify({
        existingMessage: generatedOutput,
        action,
      });

      if (res.data?.success && res.data?.data) {
        setGeneratedOutput(res.data.data);
        showNotification(`Message updated (${action.replace('_', ' ')})`);
      } else {
        showNotification('Modification failed. Try again.');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Error modifying message.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    showNotification('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-32 h-32 text-cyan-400" />
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>ADMIN • HR • INTERNAL ASSISTANT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Zenemoo Admin &amp; HR AI
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-mono mt-1">
              Private Communication Workspace — Turn rough notes into professional ready-to-send messages.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SECURE • AUTHORIZED
            </span>
            {activeAdminEmail && (
              <span className="text-slate-400 text-xs truncate max-w-[180px]">
                {activeAdminEmail}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* WORKSPACE NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
        {[
          { id: 'quick', label: 'Quick Assistant', icon: Sparkles },
          { id: 'email', label: 'Email Writer', icon: Mail },
          { id: 'whatsapp', label: 'WhatsApp Writer', icon: MessageSquare },
          { id: 'hr', label: 'HR Tools', icon: Users },
          { id: 'client', label: 'Client Messages', icon: Briefcase },
          { id: 'vendor', label: 'Vendor Requests', icon: Building },
          { id: 'candidate', label: 'Candidate Recruitment', icon: UserCheck },
          { id: 'templates', label: 'Template Library', icon: Bookmark },
          { id: 'settings', label: 'Signature Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl font-mono text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/[0.03] text-slate-400 border border-white/5 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUT & CONTROL PANEL (LEFT 7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {activeCategory === 'settings' ? (
            /* SIGNATURE SETTINGS FORM */
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Default Sender Signature Settings
              </h3>
              <p className="text-slate-400 text-xs font-mono">
                Configure your official signature to automatically append to generated emails and documents.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={signature.name}
                    onChange={(e) => setSignature({ ...signature, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Designation / Title</label>
                  <input
                    type="text"
                    value={signature.designation}
                    onChange={(e) => setSignature({ ...signature, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={signature.company}
                    onChange={(e) => setSignature({ ...signature, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={signature.email}
                    onChange={(e) => setSignature({ ...signature, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={signature.phone}
                    onChange={(e) => setSignature({ ...signature, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={signature.website}
                    onChange={(e) => setSignature({ ...signature, website: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSignature}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Signature Settings</span>
              </button>
            </div>
          ) : activeCategory === 'templates' ? (
            /* TEMPLATE LIBRARY */
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-cyan-400" />
                Communication Template Library
              </h3>
              <p className="text-slate-400 text-xs font-mono">
                Click any pre-configured template to load it directly into the AI message generator.
              </p>

              <div className="space-y-3">
                {TEMPLATE_LIBRARY.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setUserPrompt(tmpl.prompt);
                      setActiveCategory('quick');
                      showNotification(`Template "${tmpl.title}" loaded`);
                    }}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-white group-hover:text-cyan-300">{tmpl.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px]">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs font-mono leading-relaxed">{tmpl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* GENERAL GENERATOR FORM */
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl">
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-white capitalize">
                    {activeCategory === 'quick'
                      ? 'Universal AI Communication Assistant'
                      : `${activeCategory} Generator`}
                  </h3>
                  <p className="text-slate-400 text-xs font-mono mt-0.5">
                    {activeCategory === 'quick'
                      ? 'Enter rough notes or broken English — AI turns it into professional communication.'
                      : 'Customize recipient, tone, and length parameters for instant output.'}
                  </p>
                </div>
              </div>

              {/* QUICK CONTROLS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Recipient</label>
                  <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Client" className="bg-[#090d16]">Client</option>
                    <option value="Vendor" className="bg-[#090d16]">Vendor</option>
                    <option value="Candidate" className="bg-[#090d16]">Candidate</option>
                    <option value="Employee" className="bg-[#090d16]">Employee</option>
                    <option value="Manager" className="bg-[#090d16]">Manager</option>
                    <option value="Partner" className="bg-[#090d16]">Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="professional" className="bg-[#090d16]">Professional</option>
                    <option value="friendly" className="bg-[#090d16]">Friendly</option>
                    <option value="formal" className="bg-[#090d16]">Formal</option>
                    <option value="polite" className="bg-[#090d16]">Polite</option>
                    <option value="firm" className="bg-[#090d16]">Firm</option>
                    <option value="urgent" className="bg-[#090d16]">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Length</label>
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="short" className="bg-[#090d16]">Short (1-4 lines)</option>
                    <option value="normal" className="bg-[#090d16]">Normal (Standard)</option>
                    <option value="detailed" className="bg-[#090d16]">Detailed (Full)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="en" className="bg-[#090d16]">English</option>
                    <option value="hi" className="bg-[#090d16]">Hindi (हिंदी)</option>
                    <option value="or" className="bg-[#090d16]">Odia (ଓଡ଼ିଆ)</option>
                  </select>
                </div>
              </div>

              {/* USER PROMPT INPUT TEXTAREA */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-mono text-xs text-slate-300 font-bold">
                    What do you need to write? (Instructions / Rough Notes)
                  </label>
                  <label className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSignature}
                      onChange={(e) => setUseSignature(e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    <span>Attach Signature</span>
                  </label>
                </div>

                <textarea
                  rows={5}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder='e.g., "mam ask them if they can give 50 odia speakers tomorrow" or "write payment follow-up email for Odia transcription project"'
                  className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 font-sans text-sm focus:outline-none focus:border-cyan-400 leading-relaxed resize-none"
                />
              </div>

              {/* GENERATE BUTTON */}
              <button
                type="button"
                disabled={isGenerating || !userPrompt.trim()}
                onClick={() => handleGenerate()}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-extrabold font-mono text-sm transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Zenemoo AI is drafting communication...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-black" />
                    <span>Generate Communication</span>
                  </>
                )}
              </button>

              {/* AI QUICK PROMPT CHIPS */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[11px] font-mono text-slate-400 font-bold">Quick Prompt Starters:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Ask a vendor for 50 Odia speakers',
                    'Write a client payment follow-up',
                    'Send interview reminder to candidate',
                    'Introduce Zenemoo AI to a company',
                    'Write project completion announcement',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setUserPrompt(chip);
                        handleGenerate(chip);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 font-mono text-[11px] transition-all cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OUTPUT & 1-CLICK MODIFIERS CARD (RIGHT 5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-2xl flex flex-col justify-between min-h-[500px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Ready-to-Send Message Output
                </span>
                {copied && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                )}
              </div>

              {generatedOutput ? (
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto scrollbar-thin">
                  {generatedOutput}
                </div>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl space-y-3 font-mono text-xs text-slate-500">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                  <p>Your generated message will appear here ready to copy and send.</p>
                </div>
              )}
            </div>

            {/* 1-CLICK MODIFIERS TOOLBAR */}
            {generatedOutput && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-400">1-Click Message Modifiers:</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Message'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  {[
                    { action: 'make_shorter', label: 'Shorter' },
                    { action: 'make_longer', label: 'Longer' },
                    { action: 'make_professional', label: 'Professional' },
                    { action: 'make_friendly', label: 'Friendly' },
                    { action: 'make_formal', label: 'Formal' },
                    { action: 'fix_grammar', label: 'Fix Grammar' },
                    { action: 'translate_or', label: 'Translate Odia' },
                    { action: 'translate_hi', label: 'Translate Hindi' },
                    { action: 'translate_en', label: 'Translate English' },
                  ].map((item) => (
                    <button
                      key={item.action}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleModify(item.action)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer text-center truncate disabled:opacity-50"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHrAiPage;
