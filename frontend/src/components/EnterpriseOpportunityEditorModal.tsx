import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  Sparkles,
  Upload,
  Link,
  MessageCircle,
  Linkedin,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Save,
  Send,
  X,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Layers,
  Image as ImageIcon,
  Globe,
  Share2,
  DollarSign,
  Shield,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { OpportunityProgram, CustomQuestion, isTempId } from '../lib/opportunityStore';

export interface EnterpriseOpportunityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityProgram | null;
  onSave: (payload: Partial<OpportunityProgram>) => Promise<void>;
  onUploadImage: (file: File, folder: string) => Promise<string>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const EnterpriseOpportunityEditorModal: React.FC<EnterpriseOpportunityEditorModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onSave,
  onUploadImage,
  showToast
}) => {
  // Active Form Section Tab
  const [activeTab, setActiveTab] = useState<'basic' | 'branding' | 'communication' | 'details' | 'benefits' | 'form' | 'ai'>('basic');
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Core Form State
  const [title, setTitle] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [badge, setBadge] = useState('ACTIVE');
  const [status, setStatus] = useState<'active' | 'stopped' | 'coming_soon' | 'draft'>('active');
  const [position, setPosition] = useState(1);
  const [actionUrl, setActionUrl] = useState('#desicrew-contributors');
  const [description, setDescription] = useState('');

  // Branding & Media
  const [companyLogo, setCompanyLogo] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isPosterUploading, setIsPosterUploading] = useState(false);

  // Communication Links
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [contactSupportUrl, setContactSupportUrl] = useState('');

  // Social & Promo Links
  const [linkedinPostUrl, setLinkedinPostUrl] = useState('');
  const [facebookPostUrl, setFacebookPostUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [otherSocialUrl, setOtherSocialUrl] = useState('');
  const [applicationPostUrl, setApplicationPostUrl] = useState('');
  const [pdfLink, setPdfLink] = useState('');

  // Contact Details
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Project Details & Requirements (New line separated strings)
  const [aboutProject, setAboutProject] = useState('');
  const [whatYouWillDoInput, setWhatYouWillDoInput] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');
  const [requirementsInput, setRequirementsInput] = useState('');
  const [languageSkillsInput, setLanguageSkillsInput] = useState('');
  const [eligibilityInput, setEligibilityInput] = useState('');

  const [experienceRequirements, setExperienceRequirements] = useState('');
  const [equipmentRequirements, setEquipmentRequirements] = useState('');
  const [internetRequirements, setInternetRequirements] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [projectDuration, setProjectDuration] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('');
  const [workMode, setWorkMode] = useState<'remote' | 'hybrid' | 'onsite'>('remote');
  const [availabilityRequirement, setAvailabilityRequirement] = useState('');

  // Highlights & Benefits
  const [highlightsInput, setHighlightsInput] = useState('');
  const [benefitsInput, setBenefitsInput] = useState('');
  const [whyJoin, setWhyJoin] = useState('');
  const [importantNotes, setImportantNotes] = useState('');

  // Custom Form Builder
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  // AI Assistant State
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'corporate' | 'recruitment'>('recruitment');
  const [aiLength, setAiLength] = useState<'short' | 'medium' | 'detailed'>('detailed');
  const [aiFocus, setAiFocus] = useState<'complete' | 'overview' | 'benefits' | 'responsibilities'>('complete');
  const [aiOutput, setAiOutput] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Saving & Mode State
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const isEditMode = Boolean(opportunity && opportunity.id && !isTempId(opportunity.id));

  // Initialize form state when editing or opening
  useEffect(() => {
    if (opportunity) {
      setTitle(opportunity.title || '');
      setPartnerName(opportunity.partner_name || '');
      setBadge(opportunity.badge || 'ACTIVE');
      setStatus(opportunity.status || 'active');
      setPosition(opportunity.position || 1);
      setActionUrl(opportunity.action_url || '#desicrew-contributors');
      setDescription(opportunity.description || '');

      setCompanyLogo(opportunity.company_logo || '');
      setPosterUrl(opportunity.poster_url || '');

      setWhatsappGroupUrl(opportunity.whatsapp_group_url || '');
      setWhatsappChannelUrl(opportunity.whatsapp_channel_url || '');
      setTelegramUrl(opportunity.telegram_url || '');
      setContactSupportUrl(opportunity.contact_support_url || '');

      setLinkedinPostUrl(opportunity.linkedin_post_url || '');
      setFacebookPostUrl(opportunity.facebook_post_url || '');
      setInstagramUrl(opportunity.instagram_url || '');
      setYoutubeUrl(opportunity.youtube_url || '');
      setOtherSocialUrl(opportunity.other_social_url || '');
      setApplicationPostUrl(opportunity.application_post_url || '');
      setPdfLink(opportunity.pdf_link || '');

      setContactPerson(opportunity.contact_details?.contact_person || '');
      setContactEmail(opportunity.contact_details?.email || '');
      setContactPhone(opportunity.contact_details?.phone || '');

      setAboutProject(opportunity.about_project || '');
      setWhatYouWillDoInput(opportunity.what_you_will_do?.join('\n') || '');
      setFeaturesInput(opportunity.features?.join('\n') || '');
      setRequirementsInput(opportunity.requirements?.join('\n') || '');
      setLanguageSkillsInput(opportunity.language_skills?.join('\n') || '');
      setEligibilityInput(opportunity.eligibility_criteria?.join('\n') || '');

      setExperienceRequirements(opportunity.experience_requirements || '');
      setEquipmentRequirements(opportunity.equipment_requirements || '');
      setInternetRequirements(opportunity.internet_requirements || '');
      setWorkingHours(opportunity.working_hours || '');
      setProjectDuration(opportunity.project_duration || '');
      setPaymentInfo(opportunity.payment_info || '');
      setPaymentFrequency(opportunity.payment_frequency || '');
      setWorkMode((opportunity.work_mode as any) || 'remote');
      setAvailabilityRequirement(opportunity.availability_requirement || '');

      setHighlightsInput(opportunity.project_highlights?.join('\n') || '');
      setBenefitsInput(opportunity.benefits?.join('\n') || '');
      setWhyJoin(opportunity.why_join || '');
      setImportantNotes(opportunity.important_notes || '');

      setCustomQuestions(opportunity.custom_questions || []);
    } else {
      // Default new program values
      setTitle('');
      setPartnerName('DesiCrew Solutions');
      setBadge('ACTIVE');
      setStatus('active');
      setPosition(1);
      setActionUrl('#desicrew-contributors');
      setDescription('');
      setCompanyLogo('');
      setPosterUrl('');
      setWhatsappGroupUrl('');
      setWhatsappChannelUrl('');
      setTelegramUrl('');
      setContactSupportUrl('');
      setLinkedinPostUrl('');
      setFacebookPostUrl('');
      setInstagramUrl('');
      setYoutubeUrl('');
      setOtherSocialUrl('');
      setApplicationPostUrl('');
      setPdfLink('');
      setContactPerson('Operations Lead');
      setContactEmail('zenemootech@gmail.com');
      setContactPhone('+91 9827775230');
      setAboutProject('');
      setWhatYouWillDoInput('');
      setFeaturesInput('');
      setRequirementsInput('');
      setLanguageSkillsInput('');
      setEligibilityInput('');
      setExperienceRequirements('');
      setEquipmentRequirements('');
      setInternetRequirements('');
      setWorkingHours('');
      setProjectDuration('');
      setPaymentInfo('');
      setPaymentFrequency('');
      setWorkMode('remote');
      setAvailabilityRequirement('');
      setHighlightsInput('');
      setBenefitsInput('');
      setWhyJoin('');
      setImportantNotes('');
      setCustomQuestions([
        { id: `q_${Date.now()}_1`, label: 'What is your primary language typing speed?', type: 'text', required: true },
        { id: `q_${Date.now()}_2`, label: 'How many daily hours can you commit?', type: 'select', options: ['2-3 Hours', '4-5 Hours (Recommended)', '6+ Hours (Full Time)'], required: true },
      ]);
    }
  }, [opportunity, isOpen]);

  // Cloudinary Upload Handlers
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLogoUploading(true);
    try {
      showToast('Uploading company logo CDN...', 'info');
      const url = await onUploadImage(file, 'zenemoo/opportunities/logos');
      setCompanyLogo(url);
      showToast('Company logo uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(`Logo upload failed: ${err.message}`, 'error');
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPosterUploading(true);
    try {
      showToast('Uploading poster banner CDN...', 'info');
      const url = await onUploadImage(file, 'zenemoo/opportunities/posters');
      setPosterUrl(url);
      showToast('Poster banner uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(`Poster upload failed: ${err.message}`, 'error');
    } finally {
      setIsPosterUploading(false);
    }
  };

  // Custom Question Form Builder Actions
  const handleAddQuestion = () => {
    const newQ: CustomQuestion = {
      id: `q_${Date.now()}`,
      label: '',
      type: 'text',
      required: true,
      options: [],
    };
    setCustomQuestions([...customQuestions, newQ]);
  };

  const handleUpdateQuestion = (id: string, updated: Partial<CustomQuestion>) => {
    setCustomQuestions(customQuestions.map((q) => (q.id === id ? { ...q, ...updated } : q)));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === customQuestions.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...customQuestions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCustomQuestions(updated);
  };

  const handleAddQuestionOption = (questionId: string) => {
    setCustomQuestions(
      customQuestions.map((q) => {
        if (q.id === questionId) {
          const opts = Array.isArray(q.options) ? [...q.options] : [];
          opts.push(`Option ${opts.length + 1}`);
          return { ...q, options: opts };
        }
        return q;
      })
    );
  };

  const handleRemoveQuestionOption = (questionId: string, optIndex: number) => {
    setCustomQuestions(
      customQuestions.map((q) => {
        if (q.id === questionId) {
          const opts = (q.options || []).filter((_, i) => i !== optIndex);
          return { ...q, options: opts };
        }
        return q;
      })
    );
  };

  const handleUpdateQuestionOptionText = (questionId: string, optIndex: number, text: string) => {
    setCustomQuestions(
      customQuestions.map((q) => {
        if (q.id === questionId) {
          const opts = Array.isArray(q.options) ? [...q.options] : [];
          opts[optIndex] = text;
          return { ...q, options: opts };
        }
        return q;
      })
    );
  };

  // AI Description Generator (Admin Only)
  const handleGenerateAiDescription = async () => {
    setIsGeneratingAi(true);
    showToast('Generating AI Opportunity Description...', 'info');
    try {
      // Simulate/Generate high quality professional recruitment description based on form inputs
      await new Promise((res) => setTimeout(res, 1200));

      const skillsList = languageSkillsInput.split('\n').filter(Boolean).join(', ') || 'Professional Communication, Technical Expertise';
      const reqsList = requirementsInput.split('\n').filter(Boolean).join('; ') || 'Verified Experience, High Accuracy';
      const partner = partnerName || 'Zenemoo Enterprise Network';
      const pTitle = title || 'Program Opportunity';

      let gen = `🚀 **${pTitle.toUpperCase()}** — Powered by **${partner}**\n\n`;

      if (aiTone === 'recruitment' || aiTone === 'professional') {
        gen += `Join our exclusive enterprise collaboration team at ${partner}. We are seeking dedicated project contributors to execute critical workflow operations with competitive remuneration and verified industry recognition.\n\n`;
      } else if (aiTone === 'friendly') {
        gen += `Welcome to the ${pTitle} initiative! We are excited to collaborate with passionate contributors working alongside ${partner} to build high-quality project deliverables.\n\n`;
      } else {
        gen += `Official Program Announcement: ${partner} has opened public contributor applications for ${pTitle}. Eligible candidates will participate in structured project deliverables under strict SLA guidelines.\n\n`;
      }

      gen += `📌 **Key Responsibilities & Scope**:\n`;
      if (whatYouWillDoInput) {
        whatYouWillDoInput.split('\n').filter(Boolean).forEach((item) => {
          gen += `• ${item}\n`;
        });
      } else {
        gen += `• Deliver high-precision task execution in compliance with program benchmarks.\n`;
        gen += `• Maintain weekly availability and submit structured project outputs.\n`;
      }

      gen += `\n💡 **Requirements & Skills**:\n`;
      gen += `• Required Proficiency: ${skillsList}\n`;
      gen += `• System/Equipment: ${equipmentRequirements || 'Windows/Mac Computer with High-Speed Internet'}\n`;
      gen += `• Prerequisites: ${reqsList}\n\n`;

      if (paymentInfo) {
        gen += `💰 **Compensation & Hours**: ${paymentInfo} (${paymentFrequency || 'Per Task/Project'}). Estimated Working Hours: ${workingHours || 'Flexible Daily Commitment'}.\n\n`;
      }

      gen += `🌟 **Why Join?** Direct collaboration badge, verified completion credentials, and fast-track evaluation for future enterprise tier opportunities.`;

      setAiOutput(gen);
      showToast('AI Description Generated! Click "Use This Description" to apply.', 'success');
    } catch (err: any) {
      showToast('AI Generation error: ' + err.message, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyAiDescription = () => {
    if (!aiOutput) return;
    setDescription(aiOutput);
    showToast('Applied AI Generated Description to Opportunity Form!', 'success');
  };

  // Build Payload & Save Handler
  const handleSaveForm = async (targetStatus?: 'active' | 'stopped' | 'coming_soon' | 'draft') => {
    if (!title.trim()) {
      showToast('Program Title is required!', 'error');
      setActiveTab('basic');
      return;
    }
    if (!partnerName.trim()) {
      showToast('Partner / Brand Name is required!', 'error');
      setActiveTab('basic');
      return;
    }

    try {
      setIsSaving(true);
      const parsedFeatures = featuresInput.split('\n').map((s) => s.trim()).filter(Boolean);
      const parsedReqs = requirementsInput.split('\n').map((s) => s.trim()).filter(Boolean);
      const parsedSkills = languageSkillsInput.split('\n').map((s) => s.trim()).filter(Boolean);
      const parsedElig = eligibilityInput.split('\n').map((s) => s.trim()).filter(Boolean);
      const parsedWhatYouDo = whatYouWillDoInput.split('\n').map((s) => s.trim()).filter(Boolean);
      const parsedHighlights = highlightsInput.split('\n').map((s) => s.trim()).filter(Boolean);
      const parsedBenefits = benefitsInput.split('\n').map((s) => s.trim()).filter(Boolean);

      const payload: Partial<OpportunityProgram> = {
        id: opportunity?.id,
        position,
        title,
        partner_name: partnerName,
        badge,
        status: targetStatus || status,
        description,
        company_logo: companyLogo,
        poster_url: posterUrl,
        features: parsedFeatures,
        requirements: parsedReqs,
        language_skills: parsedSkills,
        eligibility_criteria: parsedElig,

        whatsapp_group_url: whatsappGroupUrl,
        whatsapp_channel_url: whatsappChannelUrl,
        telegram_url: telegramUrl,
        contact_support_url: contactSupportUrl,

        linkedin_post_url: linkedinPostUrl,
        facebook_post_url: facebookPostUrl,
        instagram_url: instagramUrl,
        youtube_url: youtubeUrl,
        other_social_url: otherSocialUrl,
        application_post_url: applicationPostUrl,
        pdf_link: pdfLink,

        contact_details: {
          contact_person: contactPerson,
          email: contactEmail,
          phone: contactPhone,
        },

        about_project: aboutProject,
        what_you_will_do: parsedWhatYouDo,
        experience_requirements: experienceRequirements,
        equipment_requirements: equipmentRequirements,
        internet_requirements: internetRequirements,
        working_hours: workingHours,
        project_duration: projectDuration,
        payment_info: paymentInfo,
        payment_frequency: paymentFrequency,
        work_mode: workMode,
        availability_requirement: availabilityRequirement,

        project_highlights: parsedHighlights,
        benefits: parsedBenefits,
        why_join: whyJoin,
        important_notes: importantNotes,

        custom_questions: customQuestions,
        action_url: actionUrl,
      };

      await onSave(payload);
      const actionMsg = isEditMode
        ? targetStatus === 'draft' ? 'saved as draft' : 'updated'
        : targetStatus === 'draft' ? 'saved as draft' : 'published';
      showToast(`Program Opportunity "${title}" ${actionMsg} successfully!`, 'success');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onClose();
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Absolutely no hooks below this line! Safe early return when modal is closed
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-full h-full min-h-screen bg-[#080c14] text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* WORKSPACE HEADER BAR                                                      */}
      {/* ========================================================================= */}
      <header className="px-4 sm:px-6 lg:px-8 py-3.5 bg-[#0c101c] border-b border-white/10 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2 flex-wrap">
              <span>{isEditMode ? 'Edit Program Opportunity' : 'Add New Program Opportunity'}</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                {isEditMode ? `EDIT MODE (ID: ${opportunity?.id})` : 'CREATE MODE'}
              </span>
            </h2>
            <p className="text-xs font-mono text-slate-400">
              Configure program metadata, branding CDN, social links, custom questions &amp; AI generation
            </p>
          </div>
        </div>

        {/* Top Header Workspace Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Preview Toggle */}
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all border ${
              showLivePreview
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{showLivePreview ? 'Live Preview On' : 'Live Preview Off'}</span>
          </button>

          {/* Save as Draft */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveForm('draft')}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{isEditMode ? 'Save Changes as Draft' : 'Save Draft'}</span>
          </button>

          {/* Primary Action Button (Update Opportunity vs Publish Opportunity) */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveForm(status || 'active')}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs font-mono flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSaving
                ? isEditMode ? '⟳ Updating Opportunity...' : '⟳ Publishing Opportunity...'
                : justSaved
                ? '✓ Updated'
                : isEditMode ? 'Update Opportunity' : 'Publish Opportunity'}
            </span>
          </button>

          {/* Close Workspace */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 ml-1 cursor-pointer"
            aria-label="Close workspace"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* SECTION NAVIGATION TABS BAR                                               */}
      {/* ========================================================================= */}
      <div className="px-4 sm:px-6 lg:px-8 py-2 bg-[#0a0e18] border-b border-white/10 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'basic' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Basic Info *
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'branding' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Branding & Media
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('communication')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'communication' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageCircle className="w-4 h-4" /> Social & Comm Links
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'details' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" /> Project Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('benefits')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'benefits' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-4 h-4" /> Highlights & Benefits
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'form' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" /> Form Builder ({customQuestions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai' ? 'bg-purple-500 text-white shadow-md font-extrabold' : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-300" /> AI Assistant
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT — SPLIT SCREEN VIEW WITH LIVE PREVIEW             */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: FORM EDITORS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === 'basic' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f] space-y-6 shadow-sm">
              <h3 className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2 border-b border-white/10 pb-3">
                <Briefcase className="w-5 h-5" /> Basic Opportunity Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Program Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1">
                    Program Title <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ZENEMOO × DesiCrew Solutions"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Partner / Brand Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1">
                    Partner / Brand Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. DesiCrew Solutions"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Program Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Program Status <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer font-bold"
                  >
                    <option value="active" className="bg-slate-900 text-emerald-400">ACTIVE (Accepting Applications)</option>
                    <option value="stopped" className="bg-slate-900 text-red-400">STOPPED (Closed)</option>
                    <option value="coming_soon" className="bg-slate-900 text-amber-400">COMING SOON</option>
                    <option value="draft" className="bg-slate-900 text-purple-400">DRAFT (Admin Only)</option>
                  </select>
                </div>

                {/* Badge Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Badge Tagline</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. ACTIVE, VERIFIED, HOT"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Position Order */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Display Order Position</label>
                  <input
                    type="number"
                    min={1}
                    value={position}
                    onChange={(e) => setPosition(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Action URL Route */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-mono font-bold text-slate-300">Action Link Target / Hash Route</label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="#desicrew-contributors or https://..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Short Program Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <label className="font-bold text-slate-300">Main Description & Summary</label>
                    <span className="text-slate-500">{description.length} characters</span>
                  </div>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter detailed opportunity description or generate using the AI Assistant tab..."
                    className="w-full p-4 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING & MEDIA CDN */}
          {activeTab === 'branding' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f] space-y-6 shadow-sm">
              <h3 className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2 border-b border-white/10 pb-3">
                <ImageIcon className="w-5 h-5" /> Branding Assets & Media CDN
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Company Logo Upload & URL */}
                <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 space-y-4">
                  <h4 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" /> Partner / Company Logo
                  </h4>

                  {companyLogo ? (
                    <div className="relative group p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <img src={companyLogo} alt="Logo preview" className="max-h-24 object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-white/15 rounded-xl space-y-2">
                      <ImageIcon className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-xs font-mono text-slate-400">No logo uploaded</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-slate-400 block">Cloudinary CDN Image Upload:</label>
                    <label className="w-full px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>{isLogoUploading ? 'Uploading Logo...' : 'Upload Logo File'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block">Direct Image URL:</label>
                    <input
                      type="url"
                      value={companyLogo}
                      onChange={(e) => setCompanyLogo(e.target.value)}
                      placeholder="https://res.cloudinary.com/..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Poster Banner Upload & URL */}
                <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 space-y-4">
                  <h4 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-400" /> Program Poster Banner
                  </h4>

                  {posterUrl ? (
                    <div className="relative group p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <img src={posterUrl} alt="Poster banner preview" className="max-h-36 object-cover rounded-lg w-full" />
                      <button
                        type="button"
                        onClick={() => setPosterUrl('')}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white cursor-pointer"
                        title="Remove Poster Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-white/15 rounded-xl space-y-2">
                      <ImageIcon className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-xs font-mono text-slate-400">No poster banner uploaded</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-slate-400 block">Cloudinary CDN Poster Upload:</label>
                    <label className="w-full px-4 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>{isPosterUploading ? 'Uploading Poster...' : 'Upload Poster Banner'}</span>
                      <input type="file" accept="image/*" onChange={handlePosterFileChange} className="hidden" />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block">Direct Poster URL:</label>
                    <input
                      type="url"
                      value={posterUrl}
                      onChange={(e) => setPosterUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMUNICATION & SOCIAL LINKS */}
          {activeTab === 'communication' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f] space-y-6 shadow-sm">
              <h3 className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2 border-b border-white/10 pb-3">
                <MessageCircle className="w-5 h-5" /> Communication & Social Links (Optional)
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Only filled link fields will be rendered on the public website. Empty fields are silently hidden.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp Group Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" /> WhatsApp Group Link
                  </label>
                  <input
                    type="url"
                    value={whatsappGroupUrl}
                    onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* WhatsApp Channel Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" /> WhatsApp Channel Link
                  </label>
                  <input
                    type="url"
                    value={whatsappChannelUrl}
                    onChange={(e) => setWhatsappChannelUrl(e.target.value)}
                    placeholder="https://whatsapp.com/channel/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* LinkedIn Post URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <Linkedin className="w-4 h-4" /> LinkedIn Post / Page Link
                  </label>
                  <input
                    type="url"
                    value={linkedinPostUrl}
                    onChange={(e) => setLinkedinPostUrl(e.target.value)}
                    placeholder="https://linkedin.com/posts/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* PDF Guideline Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-purple-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> PDF Guidelines Link
                  </label>
                  <input
                    type="url"
                    value={pdfLink}
                    onChange={(e) => setPdfLink(e.target.value)}
                    placeholder="https://drive.google.com/file/... or PDF URL"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Facebook Post Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" /> Facebook Link
                  </label>
                  <input
                    type="url"
                    value={facebookPostUrl}
                    onChange={(e) => setFacebookPostUrl(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Instagram Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-pink-400 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" /> Instagram Link
                  </label>
                  <input
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Contact Email & Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Support Contact Person / Email</label>
                  <input
                    type="text"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="zenemootech@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Support Phone Number</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 9827775230"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROJECT DETAILS */}
          {activeTab === 'details' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f] space-y-6 shadow-sm">
              <h3 className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2 border-b border-white/10 pb-3">
                <Layers className="w-5 h-5" /> Scope, Requirements & Work Specifications
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Work Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Location / Work Mode</label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="remote" className="bg-slate-900 text-cyan-400">REMOTE (Work From Anywhere)</option>
                    <option value="hybrid" className="bg-slate-900 text-purple-400">HYBRID</option>
                    <option value="onsite" className="bg-slate-900 text-emerald-400">ON-SITE (Office)</option>
                  </select>
                </div>

                {/* Working Hours */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Working Hours / Daily Commitment</label>
                  <input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="e.g. 3-4 Hours Daily Flexible"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Payment Information */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Payment Information / Compensation</label>
                  <input
                    type="text"
                    value={paymentInfo}
                    onChange={(e) => setPaymentInfo(e.target.value)}
                    placeholder="e.g. Competitive Per-Hour / Per-Audio Rate"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Payment Frequency */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">Payment Frequency</label>
                  <input
                    type="text"
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value)}
                    placeholder="e.g. Weekly / Bi-Weekly Direct Bank Transfer"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Required Skills (One per line) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-mono font-bold text-cyan-400">Required Skills & Tools (One per line)</label>
                  <textarea
                    rows={3}
                    value={languageSkillsInput}
                    onChange={(e) => setLanguageSkillsInput(e.target.value)}
                    placeholder="Odia (Native Listening & Typing)&#10;Aegisub Tool&#10;Subtitle Edit"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Equipment & Internet Requirements */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-mono font-bold text-slate-300">Hardware & Equipment Requirements (One per line)</label>
                  <textarea
                    rows={3}
                    value={requirementsInput}
                    onChange={(e) => setRequirementsInput(e.target.value)}
                    placeholder="Windows 10/11 or Mac PC&#10;Stable Internet Connection&#10;Quality Headphones for Audio Annotation"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HIGHLIGHTS & BENEFITS */}
          {activeTab === 'benefits' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f] space-y-6 shadow-sm">
              <h3 className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2 border-b border-white/10 pb-3">
                <Zap className="w-5 h-5" /> Project Highlights & Candidate Benefits
              </h3>

              <div className="space-y-4">
                {/* Project Highlights */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-emerald-400">Project Highlights (One per line)</label>
                  <textarea
                    rows={4}
                    value={highlightsInput}
                    onChange={(e) => setHighlightsInput(e.target.value)}
                    placeholder="1.5+ Years Verified Enterprise Collaboration&#10;Verified Completion Certificate&#10;High Volume Project Pipeline"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                {/* Candidate Benefits */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-purple-400">Candidate Benefits (One per line)</label>
                  <textarea
                    rows={4}
                    value={benefitsInput}
                    onChange={(e) => setBenefitsInput(e.target.value)}
                    placeholder="Flexible Working Hours&#10;Direct Payouts to Bank/UPI&#10;Priority Access to Future AI Annotation Campaigns"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FORM BUILDER */}
          {activeTab === 'form' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f] space-y-6 shadow-sm">
              {/* Locked Standard Applicant Information Banner */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold font-mono text-xs text-cyan-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-400" /> Standard Applicant Information (Locked &amp; Always Required)
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                    SYSTEM REQUIRED
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-300">
                  Every applicant form automatically includes these 3 core candidate contact fields. They cannot be edited, reordered, or deleted by admin.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold">1. Full Legal Name *</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold">2. Email Address *</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold">3. WhatsApp / Phone *</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Custom Questions Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 pt-2">
                <div>
                  <h3 className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Custom Application Questions ({customQuestions.length})
                  </h3>
                  <p className="text-xs font-mono text-slate-400">Add opportunity-specific questions for applicants</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Question
                </button>
              </div>

              <div className="space-y-4">
                {customQuestions.length === 0 ? (
                  <div className="p-8 text-center border border-white/10 rounded-2xl bg-slate-900/50 space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-mono text-slate-400">
                      No custom questions added yet. Applicants will only fill standard contact information.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold inline-flex items-center gap-1 cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create First Custom Question
                    </button>
                  </div>
                ) : (
                  customQuestions.map((q, idx) => (
                    <div key={q.id} className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-slate-900 space-y-4 relative shadow-md">
                      {/* Question Card Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Q{idx + 1}
                          </span>
                          <span className="text-xs font-mono text-slate-300 font-bold">
                            Question #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Reorder Buttons */}
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/10">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Question Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === customQuestions.length - 1}
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Question Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Required Toggle */}
                          <label className="flex items-center gap-1.5 text-xs font-mono text-slate-300 cursor-pointer bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                              className="rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-0"
                            />
                            <span>Required</span>
                          </label>

                          {/* Delete Question Trigger */}
                          <button
                            type="button"
                            onClick={() => setDeletingQuestionId(q.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-red-500/10 border border-red-500/30 cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text & Input Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-8 space-y-1">
                          <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Question Text Label *</label>
                          <input
                            type="text"
                            value={q.label}
                            onChange={(e) => handleUpdateQuestion(q.id, { label: e.target.value })}
                            placeholder="e.g. What is your Odia typing speed (WPM)?"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Question Input Type</label>
                          <select
                            value={q.type}
                            onChange={(e) => handleUpdateQuestion(q.id, { type: e.target.value as any })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs focus:outline-none font-bold cursor-pointer"
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="number">Number</option>
                            <option value="select">Dropdown / Single Choice</option>
                            <option value="multiselect">Multiple Choice / Multi Select</option>
                            <option value="yesno">Yes / No</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="date">Date</option>
                            <option value="checkbox">Checkbox Confirmation</option>
                          </select>
                        </div>
                      </div>

                      {/* DEDICATED OPTION BUILDER (For Dropdown & Multi Select) */}
                      {(q.type === 'select' || q.type === 'multiselect') && (
                        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                              <span>Options List ({q.options?.length || 0})</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddQuestionOption(q.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Option
                            </button>
                          </div>

                          {/* Individual Option Rows */}
                          {q.options && q.options.length > 0 ? (
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-slate-400 w-6 text-right font-bold">{optIdx + 1}.</span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateQuestionOptionText(q.id, optIdx, e.target.value)}
                                    placeholder={`Option ${optIdx + 1}`}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-emerald-300 font-mono text-xs focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestionOption(q.id, optIdx)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 cursor-pointer"
                                    title="Delete Option"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] font-mono text-amber-400 italic">
                              No options added yet. Click "+ Add Option" or paste below.
                            </div>
                          )}

                          {/* Bulk Paste Fallback Box */}
                          <div className="pt-2 border-t border-white/10 space-y-1">
                            <label className="text-[10px] font-mono text-slate-400">Bulk Paste Options (Comma or Newline separated):</label>
                            <textarea
                              rows={2}
                              value={Array.isArray(q.options) ? q.options.join(', ') : q.options || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
                                handleUpdateQuestion(q.id, { options: parsed });
                              }}
                              placeholder="Option 1, Option 2, Option 3 (or 1 per line)"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-slate-300 font-mono text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DELETE QUESTION CONFIRMATION MODAL */}
          {deletingQuestionId && (
            <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="glass-panel p-6 rounded-2xl border border-red-500/40 max-w-md w-full space-y-4 bg-[#0d0a14]">
                <div className="flex items-center gap-3 text-red-400 font-bold font-mono text-base">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <span>Delete Custom Question?</span>
                </div>

                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  Are you sure you want to delete this question? This action cannot be undone and will remove it from future candidate application forms.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingQuestionId(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-mono text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomQuestions(customQuestions.filter((q) => q.id !== deletingQuestionId));
                      setDeletingQuestionId(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-mono text-xs font-extrabold cursor-pointer shadow-lg shadow-red-500/20"
                  >
                    Delete Question
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AI ASSISTANT (ADMIN ONLY) */}
          {activeTab === 'ai' && (
            <div className="p-6 rounded-2xl border border-purple-500/30 bg-[#0e0a1a] space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                <h3 className="text-base font-bold font-mono text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" /> Admin AI Description Generator
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ADMIN ONLY
                </span>
              </div>

              <p className="text-xs font-mono text-slate-300">
                Generate tailored recruitment descriptions based on your current form inputs. Click <strong>"Use This Description"</strong> to copy the output to your opportunity description.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Tone Profile:</label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-white font-mono text-xs"
                  >
                    <option value="recruitment">Recruitment Focused</option>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly & Engaging</option>
                    <option value="corporate">Corporate & Formal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Description Length:</label>
                  <select
                    value={aiLength}
                    onChange={(e) => setAiLength(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-white font-mono text-xs"
                  >
                    <option value="detailed">Detailed & Comprehensive</option>
                    <option value="medium">Medium Length</option>
                    <option value="short">Short Overview</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Primary Focus:</label>
                  <select
                    value={aiFocus}
                    onChange={(e) => setAiFocus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-white font-mono text-xs"
                  >
                    <option value="complete">Complete Opportunity</option>
                    <option value="overview">Project Overview</option>
                    <option value="benefits">Candidate Benefits</option>
                    <option value="responsibilities">Responsibilities Focus</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={handleGenerateAiDescription}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Generating AI Description...' : 'Generate AI Description'}</span>
              </button>

              {aiOutput && (
                <div className="space-y-3 pt-4 border-t border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-purple-300">Generated Description Output:</span>
                    <button
                      type="button"
                      onClick={handleApplyAiDescription}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Use This Description
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                    {aiOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW PANEL */}
        {showLivePreview && (
          <div className="hidden lg:block w-96 xl:w-[440px] border-l border-white/10 bg-[#050811] p-6 overflow-y-auto shrink-0 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Live Public Preview
              </h3>
              <span className="text-[10px] font-mono text-slate-400">WYSIWYG Mode</span>
            </div>

            {/* Simulated Opportunity Public Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0d121f] p-5 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white/5 p-1 border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold font-mono text-xs">
                      {partnerName.substring(0, 2).toUpperCase() || 'ZM'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{title || 'Untitled Opportunity'}</h4>
                    <p className="text-xs font-mono text-cyan-300">{partnerName || 'Partner Brand'}</p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {badge || status}
                </span>
              </div>

              {posterUrl && (
                <img src={posterUrl} alt="Poster preview" className="w-full h-32 object-cover rounded-xl border border-white/10" />
              )}

              <p className="text-xs font-mono text-slate-300 line-clamp-3 leading-relaxed">
                {description || 'No description entered yet. Fill in the description or use the AI generator.'}
              </p>

              {/* Work mode & Payment tags */}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2 py-1 rounded bg-white/5 text-cyan-300 border border-white/10 uppercase">
                  ⚡ {workMode}
                </span>
                {paymentInfo && (
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    💳 {paymentInfo}
                  </span>
                )}
              </div>

              {/* Action & Communication Links */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                <button type="button" className="flex-1 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs font-mono text-center">
                  Apply Now
                </button>
                {whatsappGroupUrl && (
                  <a href={whatsappGroupUrl} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                {linkedinPostUrl && (
                  <a href={linkedinPostUrl} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
