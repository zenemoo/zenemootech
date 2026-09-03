import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AdminSeoImageUploader } from './AdminSeoImageUploader';
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
  ArrowDown,
  Smartphone,
  Wifi,
  Battery,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileCheck2,
  Cpu,
  Mail,
  Phone,
  Award,
  Download,
  UserCheck,
  LayoutGrid,
  FileSpreadsheet,
  Maximize2
} from 'lucide-react';
import { FaXTwitter, FaInstagram, FaYoutube, FaWhatsapp, FaTelegram, FaLinkedin } from 'react-icons/fa6';
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
  const [previewViewMode, setPreviewViewMode] = useState<'mobile' | 'card' | 'form'>('mobile');
  const [previewFormStep, setPreviewFormStep] = useState<1 | 2 | 3>(1);

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
  const [xPostUrl, setXPostUrl] = useState('');
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
      setXPostUrl(opportunity.x_post_url || opportunity.facebook_post_url || '');
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
      const initialReqs = (opportunity.requirements && opportunity.requirements.length > 0)
        ? opportunity.requirements
        : (opportunity.eligibility_criteria || []);
      setRequirementsInput(initialReqs.join('\n'));
      setLanguageSkillsInput(opportunity.language_skills?.join('\n') || '');
      setEligibilityInput(initialReqs.join('\n'));

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
      setXPostUrl('');
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
        eligibility_criteria: parsedReqs.length > 0 ? parsedReqs : parsedElig,

        whatsapp_group_url: whatsappGroupUrl,
        whatsapp_channel_url: whatsappChannelUrl,
        telegram_url: telegramUrl,
        contact_support_url: contactSupportUrl,

        linkedin_post_url: linkedinPostUrl,
        x_post_url: xPostUrl,
        facebook_post_url: xPostUrl,
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
                    placeholder="e.g. ZENEMOO Data Solutions"
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

                  <AdminSeoImageUploader
                    folder="zenemoo/opportunities/logos"
                    entityType="partner"
                    entityTitle={partnerName || title || 'Company Logo'}
                    assetType="logo"
                    currentImageUrl={companyLogo}
                    onUploadSuccess={(res) => {
                      setCompanyLogo(res.imageUrl);
                      showToast(`Company logo uploaded with SEO filename: ${res.seoFilename}`, 'success');
                    }}
                    label="Automatic SEO Logo Upload"
                  />

                  <div className="space-y-1 pt-2">
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

                  <AdminSeoImageUploader
                    folder="zenemoo/opportunities/posters"
                    entityType="opportunity"
                    entityTitle={title || partnerName || 'Opportunity Poster Banner'}
                    assetType="banner"
                    currentImageUrl={posterUrl}
                    onUploadSuccess={(res) => {
                      setPosterUrl(res.imageUrl);
                      showToast(`Poster banner uploaded with SEO alt text: "${res.altText}"`, 'success');
                    }}
                    label="Automatic SEO Poster Banner Upload"
                  />

                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-mono text-slate-400 block">Direct Image URL:</label>
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

                {/* X (Twitter) Post Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                    <FaXTwitter className="w-3.5 h-3.5 text-white" /> X (Twitter) Link
                  </label>
                  <input
                    type="url"
                    value={xPostUrl}
                    onChange={(e) => setXPostUrl(e.target.value)}
                    placeholder="https://x.com/... or https://twitter.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
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
          <div className="hidden lg:flex flex-col w-[390px] xl:w-[460px] 2xl:w-[500px] border-l border-white/10 bg-[#04060d] p-4 sm:p-5 overflow-hidden shrink-0 space-y-3">
            {/* Header & View Mode Switcher */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> Live Mobile Preview
                </h3>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setPreviewViewMode('mobile')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 font-bold ${
                    previewViewMode === 'mobile' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Full Mobile Webpage View"
                >
                  <Smartphone className="w-3 h-3" /> Page
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewMode('card')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 font-bold ${
                    previewViewMode === 'card' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Portal Card View"
                >
                  <LayoutGrid className="w-3 h-3" /> Card
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewMode('form')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 font-bold ${
                    previewViewMode === 'form' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Application Form View"
                >
                  <FileSpreadsheet className="w-3 h-3" /> Form
                </button>
              </div>
            </div>

            {/* REALISTIC SMARTPHONE MOCKUP FRAME */}
            <div className="w-full max-w-[400px] mx-auto rounded-[36px] border-[5px] border-slate-800 bg-[#070b14] shadow-2xl shadow-cyan-500/5 overflow-hidden flex flex-col relative flex-1 min-h-0 border-t-[8px]">
              {/* Phone Status Bar (Speaker, Notch & Icons) */}
              <div className="px-5 pt-2 pb-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-[#050810] border-b border-white/5 shrink-0 select-none">
                <span className="font-bold text-slate-300">9:41</span>
                <div className="w-20 h-3.5 bg-slate-900 rounded-full border border-white/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-800 mr-1"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40"></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>

              {/* Mock Browser URL Bar */}
              <div className="px-3 py-1.5 bg-[#090e1a] border-b border-white/5 flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0">
                <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span className="truncate text-slate-300">
                  zenemoo.in/opportunities/{title ? title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 24) : 'program'}
                </span>
              </div>

              {/* SCROLLABLE PHONE SCREEN VIEWPORT */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-slate-200 text-xs font-sans">
                {/* 1. FULL MOBILE PAGE VIEW */}
                {previewViewMode === 'mobile' && (
                  <div className="space-y-4">
                    {/* Top Breadcrumb & Share */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1 border-b border-white/5">
                      <span className="flex items-center gap-1 text-cyan-400 font-bold truncate">
                        <ArrowLeft className="w-3 h-3 shrink-0" /> Portal / {partnerName || 'Partner'}
                      </span>
                      <span className="p-1 rounded-md bg-white/5 text-slate-300">
                        <Share2 className="w-3 h-3" />
                      </span>
                    </div>

                    {/* Program Header Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 shadow-lg">
                      <div className="flex items-start gap-3">
                        {companyLogo ? (
                          <img
                            src={companyLogo}
                            alt="Logo"
                            className="w-12 h-12 object-contain bg-white p-1 rounded-xl border border-white/10 shrink-0 shadow"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-extrabold font-mono text-sm shrink-0">
                            {(partnerName || 'ZM').slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider truncate">
                            {partnerName || 'Partner Organization'}
                          </div>
                          <h2 className="text-sm font-bold font-display text-white leading-snug">
                            {title || 'Untitled Opportunity Program'}
                          </h2>
                        </div>
                      </div>

                      {/* Status & Work Mode Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> {workMode.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : status === 'stopped'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {status === 'active' ? badge || 'ACTIVE' : status === 'stopped' ? '🔴 CLOSED' : 'COMING SOON'}
                        </span>
                      </div>
                    </div>

                    {/* Poster Graphic Banner */}
                    {posterUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-md">
                        <img src={posterUrl} alt="Banner" className="w-full h-36 object-cover" />
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 via-cyan-900/20 to-slate-900 border border-white/5 text-center space-y-1">
                        <Briefcase className="w-6 h-6 text-cyan-400/60 mx-auto" />
                        <div className="text-[11px] font-mono font-bold text-slate-300">{title || 'Official Program Banner'}</div>
                        <div className="text-[9px] font-mono text-slate-500">Poster graphic preview placeholder</div>
                      </div>
                    )}

                    {/* Scope & Executive Overview */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                      <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-cyan-400" /> Program Scope & Overview
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                        {description || 'No overview description added yet. Fill the Scope field or use AI Assistant.'}
                      </p>
                    </div>

                    {/* Responsibilities & Daily Tasks */}
                    {whatYouWillDoInput.trim() && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                        <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-cyan-400" /> Responsibilities & Tasks
                        </div>
                        <div className="space-y-1.5">
                          {whatYouWillDoInput.split('\n').map((s) => s.trim()).filter(Boolean).map((task, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5"></span>
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Language & Technical Skills */}
                    {languageSkillsInput.trim() && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                        <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                          <Award className="w-3 h-3 text-cyan-400" /> Required Skills & Languages
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {languageSkillsInput.split('\n').map((s) => s.trim()).filter(Boolean).map((skill, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hardware & System Prerequisites */}
                    {(equipmentRequirements || internetRequirements || experienceRequirements) && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                        <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                          <Cpu className="w-3 h-3 text-cyan-400" /> Hardware & Prerequisites
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          {equipmentRequirements && (
                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[9px] font-mono text-slate-400 uppercase block">Equipment</span>
                              <span className="text-slate-200">{equipmentRequirements}</span>
                            </div>
                          )}
                          {internetRequirements && (
                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[9px] font-mono text-slate-400 uppercase block">Internet Speed</span>
                              <span className="text-slate-200">{internetRequirements}</span>
                            </div>
                          )}
                          {experienceRequirements && (
                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[9px] font-mono text-slate-400 uppercase block">Experience</span>
                              <span className="text-slate-200">{experienceRequirements}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Compensation & Work Schedule */}
                    {(paymentInfo || workingHours || projectDuration) && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                        <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3 text-emerald-400" /> Compensation & Schedule
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {paymentInfo && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 col-span-2 space-y-0.5">
                              <span className="text-[9px] font-mono text-emerald-400 uppercase block">Remuneration</span>
                              <span className="font-bold text-emerald-300 text-xs">{paymentInfo} ({paymentFrequency || 'Per Task'})</span>
                            </div>
                          )}
                          {workingHours && (
                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[9px] font-mono text-slate-400 uppercase block">Working Hours</span>
                              <span className="text-slate-200 font-bold">{workingHours}</span>
                            </div>
                          )}
                          {projectDuration && (
                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[9px] font-mono text-slate-400 uppercase block">Duration</span>
                              <span className="text-slate-200 font-bold">{projectDuration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Why Join & Benefits */}
                    {(benefitsInput.trim() || whyJoin.trim()) && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                        <div className="text-[11px] font-mono font-bold text-purple-400 uppercase flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-purple-400" /> Why Join & Benefits
                        </div>
                        {whyJoin && <p className="text-xs text-slate-300 leading-relaxed">{whyJoin}</p>}
                        {benefitsInput.trim() && (
                          <div className="space-y-1 pt-1">
                            {benefitsInput.split('\n').map((s) => s.trim()).filter(Boolean).map((benefit, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[11px] text-purple-300">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
                                <span>{benefit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Important Notes Alert */}
                    {importantNotes.trim() && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1.5 font-mono uppercase text-[10px]">
                          <AlertCircle className="w-3.5 h-3.5" /> Important Guidelines
                        </div>
                        <p className="leading-relaxed opacity-90">{importantNotes}</p>
                      </div>
                    )}

                    {/* Official Channels & Social Links */}
                    {(whatsappGroupUrl || whatsappChannelUrl || telegramUrl || linkedinPostUrl || xPostUrl || pdfLink || contactSupportUrl) && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                        <div className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-cyan-400" /> Official Channels & Links
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {whatsappGroupUrl && (
                            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] flex items-center gap-1 font-bold">
                              <FaWhatsapp className="w-3 h-3" /> WhatsApp Group
                            </span>
                          )}
                          {whatsappChannelUrl && (
                            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] flex items-center gap-1 font-bold">
                              <FaWhatsapp className="w-3 h-3" /> Channel
                            </span>
                          )}
                          {telegramUrl && (
                            <span className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono text-[10px] flex items-center gap-1 font-bold">
                              <FaTelegram className="w-3 h-3" /> Telegram
                            </span>
                          )}
                          {linkedinPostUrl && (
                            <span className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-[10px] flex items-center gap-1 font-bold">
                              <FaLinkedin className="w-3 h-3" /> LinkedIn
                            </span>
                          )}
                          {xPostUrl && (
                            <span className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white border border-white/20 font-mono text-[10px] flex items-center gap-1 font-bold">
                              <FaXTwitter className="w-3 h-3" /> X / Twitter
                            </span>
                          )}
                          {pdfLink && (
                            <span className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px] flex items-center gap-1 font-bold">
                              <FileText className="w-3 h-3" /> PDF Doc
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sticky Mobile Apply CTA Bar */}
                    <div className="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-[#070b14] via-[#070b14]/95 to-transparent">
                      <button
                        type="button"
                        onClick={() => setPreviewViewMode('form')}
                        className={`w-full py-3 rounded-xl font-bold font-mono text-xs text-center flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                          status === 'active'
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-cyan-500/20'
                            : status === 'stopped'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {status === 'active' ? (
                          <>
                            Apply Now (Step 1 of 3) <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : status === 'stopped' ? (
                          <>
                            Applications Closed <Lock className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Opening Soon <Clock className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. OPPORTUNITIES PORTAL LISTING CARD VIEW */}
                {previewViewMode === 'card' && (
                  <div className="space-y-3 pt-2">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Portal Listing Card:</div>
                    <div className="rounded-2xl border border-white/10 bg-[#0d121f] p-4 space-y-3 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {companyLogo ? (
                            <img src={companyLogo} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-white/10" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold font-mono text-xs">
                              {(partnerName || 'ZM').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{title || 'Untitled Opportunity'}</h4>
                            <p className="text-[10px] font-mono text-cyan-400">{partnerName || 'Partner Brand'}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                          status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {badge || status}
                        </span>
                      </div>

                      {posterUrl && (
                        <img src={posterUrl} alt="Poster" className="w-full h-28 object-cover rounded-xl border border-white/10" />
                      )}

                      <p className="text-[11px] font-mono text-slate-300 line-clamp-3 leading-relaxed">
                        {description || 'No overview description entered yet.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <span className="text-slate-400 block text-[8px] uppercase">Work Mode</span>
                          <span className="text-cyan-300 font-bold uppercase">{workMode}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <span className="text-slate-400 block text-[8px] uppercase">Pay</span>
                          <span className="text-emerald-300 font-bold truncate block">{paymentInfo || 'Competitive'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewViewMode('mobile')}
                          className="flex-1 py-1.5 rounded-lg bg-white/5 text-slate-300 text-[10px] font-mono font-bold hover:bg-white/10"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewViewMode('form')}
                          className="flex-1 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-[10px] font-mono font-bold hover:bg-cyan-400"
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CANDIDATE APPLICATION FORM VIEW */}
                {previewViewMode === 'form' && (
                  <div className="space-y-3 pt-1">
                    {/* Step Tabs */}
                    <div className="grid grid-cols-3 gap-1 font-mono text-[9px] text-center">
                      <button
                        type="button"
                        onClick={() => setPreviewFormStep(1)}
                        className={`py-1 rounded border font-bold ${
                          previewFormStep === 1 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-slate-400 border-white/5'
                        }`}
                      >
                        ① Personal
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFormStep(2)}
                        className={`py-1 rounded border font-bold ${
                          previewFormStep === 2 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-slate-400 border-white/5'
                        }`}
                      >
                        ② Questions ({customQuestions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFormStep(3)}
                        className={`py-1 rounded border font-bold ${
                          previewFormStep === 3 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-slate-400 border-white/5'
                        }`}
                      >
                        ③ Terms
                      </button>
                    </div>

                    {/* Step 1: Personal Details */}
                    {previewFormStep === 1 && (
                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5 text-xs">
                        <div className="font-mono text-[10px] text-cyan-400 font-bold uppercase">Step 1: Contact Information</div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">Full Name *</label>
                          <input type="text" readOnly placeholder="e.g. John Doe" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">Email Address *</label>
                          <input type="email" readOnly placeholder="candidate@example.com" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400">Phone Number *</label>
                          <input type="tel" readOnly placeholder="+91 9876543210" className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300" />
                        </div>
                        <button type="button" onClick={() => setPreviewFormStep(2)} className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1 mt-2">
                          Next: Questions <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Step 2: Custom Application Questions */}
                    {previewFormStep === 2 && (
                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 text-xs">
                        <div className="font-mono text-[10px] text-cyan-400 font-bold uppercase">Step 2: Custom Questions ({customQuestions.length})</div>
                        {customQuestions.length === 0 ? (
                          <div className="p-3 text-center font-mono text-[11px] text-slate-400 bg-white/[0.01] rounded-xl border border-white/5">
                            No custom questions configured yet. Add them in the "Form Builder" tab.
                          </div>
                        ) : (
                          customQuestions.map((q, idx) => (
                            <div key={q.id} className="space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                              <label className="text-[11px] font-semibold text-slate-200 block">
                                {idx + 1}. {q.label || 'Untitled Question'} {q.required && <span className="text-red-400">*</span>}
                              </label>
                              {q.type === 'textarea' ? (
                                <textarea readOnly rows={2} placeholder="Candidate answer..." className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] text-slate-400" />
                              ) : q.type === 'select' ? (
                                <select disabled className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] text-slate-400">
                                  <option>Select an option...</option>
                                  {q.options?.map((opt, oIdx) => <option key={oIdx}>{opt}</option>)}
                                </select>
                              ) : (
                                <input type="text" readOnly placeholder="Enter answer..." className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] text-slate-400" />
                              )}
                            </div>
                          ))
                        )}
                        <button type="button" onClick={() => setPreviewFormStep(3)} className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1 mt-2">
                          Next: Review & Terms <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Step 3: Terms & Final Submit */}
                    {previewFormStep === 3 && (
                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 text-xs">
                        <div className="font-mono text-[10px] text-cyan-400 font-bold uppercase">Step 3: Review & Terms</div>
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-slate-400 leading-relaxed">
                          By applying, candidate agrees to Zenemoo Contributor Terms & Data Annotation Standards.
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <input type="checkbox" checked readOnly className="rounded text-cyan-500" />
                          <span>I accept Zenemoo Terms & Conditions</span>
                        </div>
                        <button type="button" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold font-mono text-xs shadow-lg flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Submit Application
                        </button>
                      </div>
                    )}
                  </div>
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
