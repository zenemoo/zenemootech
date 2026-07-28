import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Key, Database, Cloud, Activity, CheckCircle, ShieldAlert, ArrowLeft, Save, Plus, Edit, Trash2, Upload, RefreshCw, Eye, Lock, X, Mail, MessageSquare, Phone, Building, ArrowUp, ArrowDown, Search, Filter, EyeOff, Hash, FileText, Handshake, Globe, ExternalLink, Briefcase, FileCheck, Linkedin, FileSpreadsheet, HelpCircle, CheckSquare, PlusCircle, UserCheck, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamMember, getStoredTeamMembers, saveTeamMemberToApi, deleteTeamMemberFromApi, reorderTeamMemberInApi } from '../lib/teamStore';
import { PartnerCompany, getStoredPartners, savePartnerToApi, deletePartnerFromApi, reorderPartnerInApi } from '../lib/partnerStore';
import { OpportunityProgram, CustomQuestion, getStoredOpportunities, saveOpportunityToApi, deleteOpportunityFromApi, reorderOpportunityInApi } from '../lib/opportunityStore';
import { CandidateApplication, getStoredCandidateApplications, updateCandidateApplicationStatus, deleteCandidateApplication } from '../lib/opportunityApplicationStore';
import { SiteConfig, TelemetryConfig, ContactInquiry, getSiteConfig, saveSiteConfig, getTelemetryConfig, saveTelemetryConfig, uploadImageToCloudinary, getContactInquiries, updateContactInquiry } from '../lib/adminStore';
import { contactApi, subscriberApi } from '../services/api';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  const [activeTab, setActiveTab] = useState<'team' | 'partners' | 'opportunities' | 'inquiries' | 'subscribers' | 'telemetry' | 'keys'>('team');

  // Team State
  const [teamList, setTeamList] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [skillsInput, setSkillsInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Partners State
  const [partnersList, setPartnersList] = useState<PartnerCompany[]>([]);
  const [editingPartner, setEditingPartner] = useState<PartnerCompany | null>(null);
  const [isPartnerUploading, setIsPartnerUploading] = useState(false);

  // Opportunities & Candidate Applications State
  const [opportunitiesList, setOpportunitiesList] = useState<OpportunityProgram[]>([]);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityProgram | null>(null);
  const [featuresInput, setFeaturesInput] = useState('');
  const [requirementsInput, setRequirementsInput] = useState('');
  const [languageSkillsInput, setLanguageSkillsInput] = useState('');
  const [eligibilityInput, setEligibilityInput] = useState('');
  const [linkedinPostUrl, setLinkedinPostUrl] = useState('');
  const [pdfLink, setPdfLink] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Custom Questions Builder State
  const [customQuestionsList, setCustomQuestionsList] = useState<CustomQuestion[]>([]);
  const [newQLabel, setNewQLabel] = useState('');
  const [newQType, setNewQType] = useState<'text' | 'textarea' | 'select'>('text');
  const [newQOptions, setNewQOptions] = useState('');
  const [newQRequired, setNewQRequired] = useState(true);

  // Candidate Applications Table Modal View State
  const [allCandidateApps, setAllCandidateApps] = useState<CandidateApplication[]>([]);
  const [selectedOppForApps, setSelectedOppForApps] = useState<OpportunityProgram | null>(null);
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'shortlisted' | 'accepted' | 'rejected'>('all');
  const [isOpportunityUploading, setIsOpportunityUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // Search & Filter State for Team
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Inquiries State
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // Subscribers State
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; subscribed_at: string }[]>([]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [editingSub, setEditingSub] = useState<{ id: string; email: string } | null>(null);

  // Config State
  const [config, setConfig] = useState<SiteConfig>(getSiteConfig());
  const [telemetry, setTelemetry] = useState<TelemetryConfig>(getTelemetryConfig());
  const [statusMessage, setStatusMessage] = useState('');

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const loadSubscribers = async () => {
    try {
      const res = await subscriberApi.getAll();
      if (res.data && res.data.data) {
        setSubscribers(res.data.data);
      }
    } catch (e) {}
  };

  const loadTeamData = async () => {
    const members = await getStoredTeamMembers();
    setTeamList(members);
  };

  const loadPartnersData = async () => {
    const partners = await getStoredPartners();
    setPartnersList(partners);
  };

  const loadOpportunitiesData = async () => {
    const ops = await getStoredOpportunities();
    setOpportunitiesList(ops);
    const apps = await getStoredCandidateApplications();
    setAllCandidateApps(apps);
  };

  useEffect(() => {
    const loadData = async () => {
      await loadTeamData();
      await loadPartnersData();
      await loadOpportunitiesData();
      const contactData = await getContactInquiries();
      setInquiries(contactData);
      await loadSubscribers();
    };
    loadData();
  }, []);

  // Question Builder Handlers
  const handleAddQuestion = () => {
    if (!newQLabel.trim()) {
      alert('Please enter a question prompt/label');
      return;
    }
    const newQ: CustomQuestion = {
      id: `q_${Date.now()}`,
      label: newQLabel.trim(),
      type: newQType,
      options: newQType === 'select' ? newQOptions.split('\n').map((s) => s.trim()).filter((s) => s.length > 0) : undefined,
      required: newQRequired,
    };
    setCustomQuestionsList([...customQuestionsList, newQ]);
    setNewQLabel('');
    setNewQOptions('');
  };

  const handleDeleteQuestion = (qId: string) => {
    setCustomQuestionsList(customQuestionsList.filter((q) => q.id !== qId));
  };

  // Opportunity CRUD & Cloudinary Upload Handlers
  const handleCreateOpportunity = () => {
    setEditingOpportunity({
      id: `temp_${Date.now()}`,
      position: opportunitiesList.length + 1,
      title: '',
      partner_name: 'DesiCrew Solutions',
      badge: 'ACTIVE',
      status: 'active',
      description: '',
      company_logo: '',
      poster_url: '',
      public_id: '',
      features: ['1.5+ Years Verified Collaboration', 'Advanced Audio Transcription Tasks'],
      requirements: ['Windows 10/11 or Mac PC', 'Aegisub / Subtitle Edit'],
      language_skills: ['Odia (Native)', 'Indian English', 'Aegisub', 'Subtitle Edit'],
      eligibility_criteria: ['PC/Laptop Hardware Required', 'Fast Internet Connection', 'Native Listening & Typing Accuracy'],
      linkedin_post_url: '',
      pdf_link: '',
      contact_details: { contact_person: 'Operations Lead', email: 'zenemootech@gmail.com', phone: '+91 9827775230' },
      custom_questions: [
        { id: 'q1', label: 'What is your Odia typing speed (words per minute)?', type: 'text', required: true },
        { id: 'q2', label: 'How many hours daily can you dedicate to transcription work?', type: 'select', options: ['2-3 Hours', '4-5 Hours (Recommended)', '6+ Hours (Full-Time)'], required: true },
        { id: 'q3', label: 'Briefly mention any past speech annotation or audio editing experience:', type: 'textarea', required: false },
      ],
      action_url: '#desicrew-contributors',
    });
    setFeaturesInput('1.5+ Years Verified Collaboration\nAdvanced Audio Transcription Tasks\nEnterprise SLA Requirements');
    setRequirementsInput('Windows 10/11 or Mac PC\nAegisub / Subtitle Edit Software\nNative Odia Speaker Proficiency');
    setLanguageSkillsInput('Odia (Native)\nIndian English\nAegisub Tool\nSubtitle Edit');
    setEligibilityInput('PC/Laptop Hardware Required\nFast Internet Connection\nNative Listening & Typing Accuracy');
    setLinkedinPostUrl('');
    setPdfLink('');
    setContactPerson('Operations Lead');
    setContactEmail('zenemootech@gmail.com');
    setContactPhone('+91 9827775230');
    setCustomQuestionsList([
      { id: 'q1', label: 'What is your Odia typing speed (words per minute)?', type: 'text', required: true },
      { id: 'q2', label: 'How many hours daily can you dedicate to transcription work?', type: 'select', options: ['2-3 Hours', '4-5 Hours (Recommended)', '6+ Hours (Full-Time)'], required: true },
      { id: 'q3', label: 'Briefly mention any past speech annotation or audio editing experience:', type: 'textarea', required: false },
    ]);
  };

  const handleEditOpportunityClick = (op: OpportunityProgram) => {
    setEditingOpportunity(op);
    setFeaturesInput(op.features?.join('\n') || '');
    setRequirementsInput(op.requirements?.join('\n') || '');
    setLanguageSkillsInput(op.language_skills?.join('\n') || '');
    setEligibilityInput(op.eligibility_criteria?.join('\n') || '');
    setLinkedinPostUrl(op.linkedin_post_url || '');
    setPdfLink(op.pdf_link || '');
    setContactPerson(op.contact_details?.contact_person || '');
    setContactEmail(op.contact_details?.email || '');
    setContactPhone(op.contact_details?.phone || '');
    setCustomQuestionsList(op.custom_questions || []);
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpportunity) return;
    try {
      const parsedFeatures = featuresInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      const parsedReqs = requirementsInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      const parsedSkills = languageSkillsInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      const parsedElig = eligibilityInput.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);

      const payload: OpportunityProgram = {
        ...editingOpportunity,
        features: parsedFeatures.length > 0 ? parsedFeatures : editingOpportunity.features,
        requirements: parsedReqs.length > 0 ? parsedReqs : editingOpportunity.requirements,
        language_skills: parsedSkills,
        eligibility_criteria: parsedElig,
        linkedin_post_url: linkedinPostUrl,
        pdf_link: pdfLink,
        contact_details: {
          contact_person: contactPerson,
          email: contactEmail,
          phone: contactPhone,
        },
        custom_questions: customQuestionsList,
      };

      const updated = await saveOpportunityToApi(payload);
      setOpportunitiesList(updated);
      setEditingOpportunity(null);
      showStatus(`Saved program opportunity "${payload.title}" with custom form questions!`);
    } catch (err: any) {
      alert('Error saving opportunity: ' + (err.message || 'Server error'));
    }
  };

  const handleDeleteOpportunity = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete opportunity "${title}"?`)) return;
    try {
      const updated = await deleteOpportunityFromApi(id);
      setOpportunitiesList(updated);
      showStatus(`Deleted opportunity program "${title}"!`);
    } catch (err: any) {
      alert('Error deleting opportunity: ' + (err.message || 'Server error'));
    }
  };

  const handleOpportunityPositionChange = async (op: OpportunityProgram, newPosStr: string) => {
    const newPos = parseInt(newPosStr, 10);
    if (isNaN(newPos) || newPos < 1 || newPos > opportunitiesList.length) return;
    try {
      const updated = await reorderOpportunityInApi(op.id, newPos);
      setOpportunitiesList(updated);
      showStatus(`Reordered "${op.title}" to position #${newPos}`);
    } catch (err: any) {
      alert('Error reordering opportunity: ' + (err.message || 'Server error'));
    }
  };

  const handleOpportunityPosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOpportunity) return;
    setIsOpportunityUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file, 'zenemoo/opportunities');
      setEditingOpportunity({
        ...editingOpportunity,
        poster_url: uploadedUrl,
      });
      showStatus('Poster banner uploaded successfully via Cloudinary!');
    } catch (err: any) {
      alert('Poster upload failed: ' + (err.message || 'Error'));
    } finally {
      setIsOpportunityUploading(false);
    }
  };

  const handleOpportunityLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOpportunity) return;
    setIsLogoUploading(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file, 'zenemoo/opportunities/logos');
      setEditingOpportunity({
        ...editingOpportunity,
        company_logo: uploadedUrl,
      });
      showStatus('Company logo uploaded successfully via Cloudinary!');
    } catch (err: any) {
      alert('Logo upload failed: ' + (err.message || 'Error'));
    } finally {
      setIsLogoUploading(false);
    }
  };

  // Partner CRUD & Cloudinary Logo Handlers
  const handleCreatePartner = () => {
    setEditingPartner({
      id: `temp_${Date.now()}`,
      position: partnersList.length + 1,
      name: '',
      role: 'Language Data & AI Partner',
      badge: 'AI Partner',
      image_url: '',
      public_id: '',
      website_url: '',
      status: 'active',
    });
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    try {
      const updated = await savePartnerToApi(editingPartner);
      setPartnersList(updated);
      setEditingPartner(null);
      showStatus(`Saved partner company "${editingPartner.name}"!`);
    } catch (err: any) {
      alert('Error saving partner company: ' + (err.message || 'Server error'));
    }
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPartner) return;
    setIsPartnerUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'zenemoo/partners');
      setEditingPartner({ ...editingPartner, image_url: url });
      showStatus('Partner logo uploaded to Cloudinary CDN (zenemoo/partners)!');
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Error uploading file'));
    } finally {
      setIsPartnerUploading(false);
    }
  };

  const handlePartnerPositionChange = async (partner: PartnerCompany, targetPosInput: string) => {
    const targetPos = parseInt(targetPosInput, 10);
    if (isNaN(targetPos) || targetPos < 1) return;
    if (targetPos === partner.position) return;
    const clampedPos = Math.max(1, Math.min(targetPos, partnersList.length));

    const targetIndex = partnersList.findIndex((p) => p.id === partner.id);
    if (targetIndex === -1) return;
    const updated = [...partnersList];
    const [moved] = updated.splice(targetIndex, 1);
    updated.splice(clampedPos - 1, 0, moved);

    const renumbered = updated.map((item, index) => ({
      ...item,
      position: index + 1,
    }));
    setPartnersList(renumbered);

    try {
      const apiResult = await reorderPartnerInApi(partner.id, clampedPos);
      if (apiResult && apiResult.length > 0) {
        setPartnersList(apiResult);
      }
      showStatus(`Moved "${partner.name}" to position #${clampedPos}`);
    } catch (err) {
      showStatus('Error updating position in database');
      await loadPartnersData();
    }
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (confirm(`Delete partner company "${name}"?`)) {
      try {
        const updated = await deletePartnerFromApi(id);
        setPartnersList(updated);
        showStatus(`Deleted partner "${name}" from database`);
      } catch (err) {
        showStatus('Error deleting partner company');
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === config.adminPasscode || passcode === 'admin' || passcode === 'zenemoo2026') {
      setIsAuthenticated(true);
      setPassError('');
    } else {
      setPassError('Incorrect passcode. Use: zenemoo2026');
    }
  };

  // Team Reordering & Position Handlers
  const handlePositionChange = async (member: TeamMember, targetPosInput: string) => {
    const targetPos = parseInt(targetPosInput, 10);
    if (isNaN(targetPos) || targetPos < 1) return;
    if (targetPos === member.position) return;

    const clampedPos = Math.max(1, Math.min(targetPos, teamList.length));
    const updated = await reorderTeamMemberInApi(member.id, clampedPos);
    setTeamList(updated);
    showStatus(`Moved ${member.name} to Position #${clampedPos}! All positions reordered 1..${updated.length}`);
  };

  const handleMoveUp = async (member: TeamMember) => {
    if (member.position <= 1) return;
    const targetPos = member.position - 1;
    const updated = await reorderTeamMemberInApi(member.id, targetPos);
    setTeamList(updated);
    showStatus(`Moved ${member.name} up to Position #${targetPos}`);
  };

  const handleMoveDown = async (member: TeamMember) => {
    if (member.position >= teamList.length) return;
    const targetPos = member.position + 1;
    const updated = await reorderTeamMemberInApi(member.id, targetPos);
    setTeamList(updated);
    showStatus(`Moved ${member.name} down to Position #${targetPos}`);
  };

  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === 'inactive' ? 'active' : 'inactive';
    const updatedMember = { ...member, status: newStatus as 'active' | 'inactive' };
    const updatedList = await saveTeamMemberToApi(updatedMember);
    setTeamList(updatedList);
    showStatus(`Updated ${member.name} status to ${newStatus.toUpperCase()}`);
  };

  const handleCreateMember = () => {
    const nextPos = teamList.length + 1;
    const newMember: TeamMember = {
      id: '',
      position: nextPos,
      name: '',
      designation: 'Audio Transcription Specialist',
      role: 'Audio Transcription Specialist',
      image_url: '',
      image: '',
      fallback: '/assets/executive.png',
      bio: '',
      skills: ['Transcription', 'Data Annotation', 'Quality Focus'],
      badge: 'Specialist',
      email: 'zenemootech@gmail.com',
      status: 'active',
      category: 'Engineering',
    };
    setEditingMember(newMember);
    setSkillsInput(newMember.skills ? newMember.skills.join(', ') : '');
  };

  const handleEditMember = (m: TeamMember) => {
    setEditingMember({ ...m });
    setSkillsInput(m.skills ? m.skills.join(', ') : '');
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (confirm(`Delete "${name}" from Supabase database? Remaining team members will be renumbered 1..N automatically.`)) {
      const updated = await deleteTeamMemberFromApi(id);
      setTeamList(updated);
      showStatus('Team member deleted and remaining positions renumbered!');
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const memberToSave = {
      ...editingMember,
      designation: editingMember.designation || editingMember.role || 'Specialist',
      role: editingMember.designation || editingMember.role || 'Specialist',
      badge: editingMember.badge || 'Specialist',
      email: editingMember.email || '',
      image_url: editingMember.image_url || editingMember.image || '/assets/executive.png',
      image: editingMember.image_url || editingMember.image || '/assets/executive.png',
      skills: parsedSkills.length > 0 ? parsedSkills : ['Specialist'],
    };

    try {
      const updatedList = await saveTeamMemberToApi(memberToSave);
      setTeamList(updatedList);
      setEditingMember(null);
      showStatus('Team member saved live to Supabase PostgreSQL database!');
    } catch (err: any) {
      alert('Error saving team member: ' + (err.message || 'Server error'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;
    setIsUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'zenemoo/team');
      setEditingMember({ ...editingMember, image_url: url, image: url });
      showStatus('Image uploaded to Cloudinary CDN (zenemoo/team)!');
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Error uploading file'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefreshInquiries = async () => {
    const contactData = await getContactInquiries();
    setInquiries(contactData);
    showStatus('Contact inquiries refreshed!');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSiteConfig(config);
    showStatus('Supabase & Cloudinary credentials updated locally!');
  };

  const handleSaveTelemetry = (e: React.FormEvent) => {
    e.preventDefault();
    saveTelemetryConfig(telemetry);
    showStatus('Telemetry capacity metrics updated!');
  };

  // Filtered team list
  const filteredTeam = teamList.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.designation || m.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : m.status === statusFilter;

    const matchesCategory =
      categoryFilter === 'all' ? true : m.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative z-50 font-sans">
        <div className="glass-panel p-8 rounded-3xl border border-white/10 max-w-md w-full space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] mx-auto shadow-lg shadow-cyan-500/25">
            <img src="/assets/logo.png" alt="Zenemoo Logo" className="w-full h-full object-cover rounded-full bg-white p-0.5" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
              Zenemoo Admin Control Center
            </h2>
            <p className="text-xs font-mono text-cyan-400 mt-1">Supabase &amp; Cloudinary Ecosystem Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Admin Passcode Required
              </label>
              <input
                type="password"
                required
                placeholder="Enter passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-sm"
              />
              {passError && <div className="text-xs font-mono text-red-400 mt-1">{passError}</div>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold font-display text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              Authenticate &amp; Access Admin <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </form>

          <button
            onClick={onExit}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Main Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 p-4 sm:p-8 relative z-50 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Admin Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-display text-white tracking-tight">
                Zenemoo Admin Control Center
              </h1>
              <p className="text-xs font-mono text-slate-400">
                Automatic Sequential Reordering Engine • Supabase &amp; Cloudinary Live Storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {statusMessage && (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fade-in flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> {statusMessage}
              </div>
            )}
            <button
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Exit to Website
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'team'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Team Roster ({teamList.length})
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'partners'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Handshake className="w-4 h-4" /> Enterprise Partners ({partnersList.length})
          </button>

          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'opportunities'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Program Opportunities ({opportunitiesList.length})
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'inquiries'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" /> Contact Inquiries ({inquiries.length})
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'subscribers'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Newsletter Subscribers ({subscribers.length})
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'telemetry'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" /> Metrics &amp; Capacity
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shrink-0 ${
              activeTab === 'keys'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" /> API Keys &amp; Credentials
          </button>
        </div>

        {/* TAB 1: TEAM MEMBERS MANAGEMENT WITH AUTOMATIC REORDERING ENGINE */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            {/* Top Bar: Stats Metrics & Add Team Member */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Current Team Members</div>
                <div className="text-3xl font-extrabold font-display text-cyan-300">{teamList.length}</div>
                <div className="text-[11px] font-mono text-slate-500">Ordered 1..{teamList.length} (0 Gaps)</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Next Available Position</div>
                <div className="text-3xl font-extrabold font-display text-purple-300">#{teamList.length + 1}</div>
                <div className="text-[11px] font-mono text-slate-500">Auto-assigned on new upload</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Reordering Engine</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">Sequential 1..N Active</div>
                  <div className="text-[11px] font-mono text-slate-500">Auto-shifts &amp; auto-renumbers</div>
                </div>

                <button
                  onClick={handleCreateMember}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Team Member
                </button>
              </div>
            </div>

            {/* Search Bar & Category/Status Filters */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, designation, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="all">All Categories</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Quality">Quality Control</option>
                  </select>
                </div>

                <button
                  onClick={loadTeamData}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5"
                  title="Refresh Team List"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh
                </button>
              </div>
            </div>

            {/* Editing Member Modal Form */}
            {editingMember && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 space-y-6 bg-black/80">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h4 className="text-lg font-bold font-display text-white">
                    {editingMember.id && !editingMember.id.startsWith('temp_') ? 'Edit Team Member' : `Add New Team Member (Auto Position #${teamList.length + 1})`}
                  </h4>
                  <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveMember} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Chandan Biswal"
                        value={editingMember.name}
                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Designation *</label>
                      <input
                        type="text"
                        required
                        placeholder="Data Annotation Specialist"
                        value={editingMember.designation || editingMember.role}
                        onChange={(e) => setEditingMember({ ...editingMember, designation: e.target.value, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Category</label>
                      <select
                        value={editingMember.category || 'Engineering'}
                        onChange={(e) => setEditingMember({ ...editingMember, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Leadership">Leadership</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Quality">Quality Control</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Badge Title</label>
                      <select
                        value={editingMember.badge}
                        onChange={(e) => setEditingMember({ ...editingMember, badge: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      >
                        <option>Founder</option>
                        <option>Senior Annotator</option>
                        <option>Specialist</option>
                        <option>Annotator</option>
                        <option>QC Lead</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Visibility Status</label>
                      <select
                        value={editingMember.status || 'active'}
                        onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as any })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      >
                        <option value="active">Active (Visible on Site)</option>
                        <option value="inactive">Inactive (Hidden)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">Skills (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Transcription, Annotation, Quality Focus"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Cloudinary Image Upload */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <label className="block text-xs font-mono text-cyan-300 font-bold flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Cloudinary Image Uploader (Folder: zenemoo/team)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                        {editingMember.image_url || editingMember.image ? (
                          <img src={editingMember.image_url || editingMember.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">No Image</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="url"
                          placeholder="https://res.cloudinary.com/rwoe0mm9/image/upload/zenemoo/team/..."
                          value={editingMember.image_url || editingMember.image}
                          onChange={(e) => setEditingMember({ ...editingMember, image_url: e.target.value, image: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                        />
                        <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono cursor-pointer hover:bg-purple-500/30 transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          {isUploading ? 'Uploading to Cloudinary CDN...' : 'Upload Image File'}
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">Bio Description</label>
                    <textarea
                      rows={3}
                      placeholder="Works on audio transcription and file processing..."
                      value={editingMember.bio}
                      onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400 resize-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" /> Contact Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="founder@zenemoo.com"
                        value={editingMember.email || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-400" /> Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 9827775230"
                        value={editingMember.phone || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-amber-400" /> LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={editingMember.linkedin || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, linkedin: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20"
                    >
                      Save Team Member
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Team Cards Grid with Framer Motion Animation */}
            {filteredTeam.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Users className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Team Members Found</h4>
                <p className="text-xs font-mono text-slate-400">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No team members match your filter criteria.'
                    : 'Click "Add Team Member" above to create your first team record.'}
                </p>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredTeam.map((m) => (
                    <motion.div
                      layout
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className={`glass-panel p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                        m.status === 'inactive' ? 'border-amber-500/30 opacity-60' : 'border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      {/* Top Bar: Position Dropdown & Status Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {/* Up / Down Arrow Quick Action Buttons */}
                          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                            <button
                              onClick={() => handleMoveUp(m)}
                              disabled={m.position <= 1}
                              className="p-1 rounded-lg hover:bg-cyan-500/20 text-cyan-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                              title="Move Up 1 Position"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(m)}
                              disabled={m.position >= teamList.length}
                              className="p-1 rounded-lg hover:bg-cyan-500/20 text-cyan-400 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                              title="Move Down 1 Position"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bulletproof Position Dropdown Selector */}
                        <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Pos:</span>
                          <select
                            value={m.position}
                            onChange={(e) => handlePositionChange(m, e.target.value)}
                            className="bg-transparent text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer"
                            title="Select target position to move member"
                          >
                            {teamList.map((_, idx) => (
                              <option key={idx + 1} value={idx + 1} className="bg-[#0b0c14] text-white">
                                #{idx + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="flex items-start gap-3">
                        <img
                          src={m.image_url || m.image || m.fallback || '/assets/executive.png'}
                          onError={(e) => { (e.target as HTMLImageElement).src = m.fallback || '/assets/executive.png'; }}
                          alt={m.name}
                          className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base font-display truncate">{m.name}</h4>
                          </div>
                          <div className="text-xs font-mono text-purple-400 truncate">{m.designation || m.role}</div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-cyan-300">
                              {m.badge}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-slate-400">
                              {m.category || 'Engineering'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10 font-mono text-xs">
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                            m.status === 'inactive'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title="Toggle Visibility Status"
                        >
                          {m.status === 'inactive' ? (
                            <>
                              <EyeOff className="w-3 h-3" /> INACTIVE (HIDDEN)
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" /> ACTIVE
                            </>
                          )}
                        </button>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditMember(m)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10"
                            title="Edit Member Specs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id, m.name)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                            title="Delete Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}

        {/* TAB: ENTERPRISE PARTNERS MANAGEMENT */}
        {activeTab === 'partners' && (
          <div className="space-y-8">
            {/* Stats Metrics & Add Partner Button */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Enterprise Partners</div>
                <div className="text-3xl font-extrabold font-display text-emerald-300">{partnersList.length}</div>
                <div className="text-[11px] font-mono text-slate-500">Active Marquee Slider</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Next Position</div>
                <div className="text-3xl font-extrabold font-display text-cyan-300">#{partnersList.length + 1}</div>
                <div className="text-[11px] font-mono text-slate-500">Auto-assigned on creation</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Cloudinary CDN</div>
                  <div className="text-sm font-bold text-purple-300 font-mono">zenemoo/partners</div>
                  <div className="text-[11px] font-mono text-slate-500">Logo image uploads active</div>
                </div>

                <button
                  onClick={handleCreatePartner}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:opacity-95 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Partner Company
                </button>
              </div>
            </div>

            {/* Editing Partner Modal Form */}
            {editingPartner && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 space-y-6 bg-black/90">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h4 className="text-lg font-bold font-display text-white flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-emerald-400" />
                    {editingPartner.id && !editingPartner.id.startsWith('temp_')
                      ? 'Edit Partner Company'
                      : `Add New Partner Company (Position #${partnersList.length + 1})`}
                  </h4>
                  <button onClick={() => setEditingPartner(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePartner} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Company Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., DesiCrew Solutions, Karya AI, Disha AI"
                        value={editingPartner.name}
                        onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Category / Role *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Certified Vendor Partner (1.5+ Yrs)"
                        value={editingPartner.role || ''}
                        onChange={(e) => setEditingPartner({ ...editingPartner, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Badge Tag</label>
                      <select
                        value={editingPartner.badge || 'AI Partner'}
                        onChange={(e) => setEditingPartner({ ...editingPartner, badge: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      >
                        <option value="Primary Partner">Primary Partner</option>
                        <option value="AI Partner">AI Partner</option>
                        <option value="Data Partner">Data Partner</option>
                        <option value="Speech Tech">Speech Tech</option>
                        <option value="NLP Framework">NLP Framework</option>
                        <option value="Indic AI">Indic AI</option>
                        <option value="Research Data">Research Data</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Website Link (URL)</label>
                      <input
                        type="url"
                        placeholder="https://www.desicrew.in"
                        value={editingPartner.website_url || ''}
                        onChange={(e) => setEditingPartner({ ...editingPartner, website_url: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">Status</label>
                      <select
                        value={editingPartner.status || 'active'}
                        onChange={(e) => setEditingPartner({ ...editingPartner, status: e.target.value as any })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white font-sans text-sm focus:outline-none focus:border-emerald-400"
                      >
                        <option value="active">Active (Visible in Marquee)</option>
                        <option value="inactive">Inactive (Hidden)</option>
                      </select>
                    </div>
                  </div>

                  {/* Cloudinary Logo Uploader */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <label className="block text-xs font-mono text-emerald-300 font-bold flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Cloudinary Logo Uploader (Folder: zenemoo/partners)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 p-2 overflow-hidden shrink-0 flex items-center justify-center">
                        {editingPartner.image_url ? (
                          <img src={editingPartner.image_url} alt="Logo Preview" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-[10px] text-slate-500 font-mono text-center">No Logo</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="url"
                          placeholder="https://res.cloudinary.com/rwoe0mm9/image/upload/zenemoo/partners/..."
                          value={editingPartner.image_url || ''}
                          onChange={(e) => setEditingPartner({ ...editingPartner, image_url: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                        />
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            {isPartnerUploading ? 'Uploading to Cloudinary...' : 'Upload Logo File'}
                            <input type="file" accept="image/*" onChange={handlePartnerLogoUpload} className="hidden" />
                          </label>
                          <span className="text-[10px] font-mono text-slate-500">Supports PNG, SVG, JPG, WebP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingPartner(null)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      Save Partner Company
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Partners Cards Grid */}
            {partnersList.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Handshake className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Partner Companies Added Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Click "Add Partner Company" above to add partner records. They will appear live in the website marquee slider once created.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {partnersList.map((p) => (
                <div
                  key={p.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                    p.status === 'inactive' ? 'border-amber-500/30 opacity-60' : 'border-white/10 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Position Selector & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">Position:</span>
                        <select
                          value={p.position}
                          onChange={(e) => handlePartnerPositionChange(p, e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                        >
                          {partnersList.map((_, idx) => (
                            <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                              #{idx + 1}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            disabled={p.position === 1}
                            onClick={() => handlePartnerPositionChange(p, String(p.position - 1))}
                            className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 text-slate-300 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            disabled={p.position === partnersList.length}
                            onClick={() => handlePartnerPositionChange(p, String(p.position + 1))}
                            className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 text-slate-300 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          p.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    {/* Logo & Company Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 p-1.5 shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                        ) : (
                          <Globe className="w-6 h-6 text-emerald-400" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-base text-white">{p.name}</div>
                        {p.badge && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      {p.role || 'Language Data & AI Partner'}
                    </p>

                    {p.website_url && (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:underline"
                      >
                        {p.website_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingPartner(p)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeletePartner(p.id, p.name)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                      title="Delete Partner Company"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* TAB 1.5: PROGRAM OPPORTUNITIES MANAGEMENT */}
        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" /> Program Opportunities Portal Engine
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Manage live project opportunities, status pills, Cloudinary posters, and eligibility checklists listed on <code className="text-cyan-300">/#opportunities</code>.
                </p>
              </div>

              <button
                onClick={handleCreateOpportunity}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white font-mono font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Program Opportunity
              </button>
            </div>

            {/* Opportunities List Cards */}
            {opportunitiesList.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Briefcase className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Program Opportunities Created Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Click "Add Program Opportunity" above to create program listings. They will appear live on the Opportunities Portal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {opportunitiesList.map((op) => (
                  <div
                    key={op.id}
                    className={`glass-panel p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                      op.status === 'stopped'
                        ? 'border-red-500/30 opacity-75'
                        : op.status === 'coming_soon'
                        ? 'border-amber-500/30'
                        : 'border-white/10 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header Controls */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">Position:</span>
                          <select
                            value={op.position}
                            onChange={(e) => handleOpportunityPositionChange(op, e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                          >
                            {opportunitiesList.map((_, idx) => (
                              <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                                #{idx + 1}
                              </option>
                            ))}
                          </select>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
                            op.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : op.status === 'stopped'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {op.status}
                        </span>
                      </div>

                      {/* Title & Partner */}
                      <div className="flex items-start gap-3">
                        {op.poster_url ? (
                          <img
                            src={op.poster_url}
                            alt={op.title}
                            className="w-12 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 shrink-0">
                            <Briefcase className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-base text-white">{op.title}</h4>
                          <div className="text-xs font-mono text-cyan-400 mt-0.5">{op.partner_name}</div>
                          {op.badge && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                              {op.badge}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 leading-relaxed">
                        {op.description}
                      </p>

                      {/* Features Highlights */}
                      {op.features && op.features.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono uppercase text-slate-400">Highlights</div>
                          <div className="flex flex-wrap gap-1">
                            {op.features.map((f, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                                • {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedOppForApps(op)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer font-bold"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Applications (
                        {allCandidateApps.filter((a) => a.opportunity_id === op.id).length})
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditOpportunityClick(op)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOpportunity(op.id, op.title)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                          title="Delete Opportunity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONTACT INQUIRIES FROM WEBSITE FORM */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" /> Website Contact Form Submissions
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Submissions stored in Supabase PostgreSQL database <code className="text-cyan-300">contacts</code> table.
                </p>
              </div>

              <button
                onClick={handleRefreshInquiries}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh Inquiries
              </button>
            </div>

            {inquiries.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <MessageSquare className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Contact Inquiries Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Submissions from the public website contact form will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inquiries.map((inq) => {
                  const code =
                    inq.inquiry_code ||
                    (inq as any).inquiry_id ||
                    (inq as any).code ||
                    `ZNM-${inq.id.substring(0, 6).toUpperCase()}`;
                  const lang = inq.language || (inq as any).lang || (inq as any).languages || 'Hindi';
                  const serviceName = inq.service || 'Data Solutions';

                  const replySubject = `[Zenemoo Inquiry #${code}] Response regarding ${serviceName}`;
                  const replyBody = `Dear ${inq.name},\n\nThank you for contacting Zenemoo Data Solutions regarding your project inquiry.\n\n- Inquiry Reference Code: ${code}\n- Requested Service: ${serviceName}\n- Target Language(s): ${lang}\n- Your Message: "${inq.message}"\n\nOur operations and lead engineering team has reviewed your specifications. We are pleased to confirm team capacity for your project.\n\nPlease let us know if you have additional audio/data files or benchmark instructions.\n\nBest regards,\nPrem Prasad Pradhan\nFounder & Vendor Manager | Zenemoo Tech Team\nEmail: contact@mrprem.in | zenemootech@gmail.com\nWebsite: https://zenemoo.com`;

                  return (
                    <div
                      key={inq.id}
                      className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 relative flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top Header: Client Name, Ticket Code, Status Toggle & Delete */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-base text-white">{inq.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                                Ticket: #{code}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Clickable Read/Unread Status Toggle Badge */}
                            <button
                              onClick={async () => {
                                const newStatus = inq.status === 'read' ? 'unread' : 'read';
                                setInquiries(
                                  inquiries.map((i) => (i.id === inq.id ? { ...i, status: newStatus } : i))
                                );
                                const updated = await updateContactInquiry(inq.id, { status: newStatus });
                                if (updated) {
                                  showStatus(`Marked inquiry #${code} as ${newStatus.toUpperCase()}`);
                                }
                              }}
                              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                                inq.status === 'read'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              }`}
                              title="Click to toggle Read / Unread status"
                            >
                              {inq.status === 'read' ? '✓ READ' : '● UNREAD'}
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Delete contact inquiry #${code}?`)) {
                                  setInquiries(inquiries.filter((i) => i.id !== inq.id));
                                  try {
                                    await contactApi.delete(inq.id);
                                  } catch (e) {}
                                  showStatus('Inquiry deleted from database!');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                              title="Delete Inquiry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Contact Info: Email, Phone, Company */}
                        <div className="space-y-1 text-xs font-mono text-slate-300">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-cyan-400" />
                            <a href={`mailto:${inq.email}`} className="hover:underline text-cyan-300">
                              {inq.email}
                            </a>
                          </div>
                          {inq.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-purple-400" />
                              <span>{inq.phone}</span>
                            </div>
                          )}
                          {inq.company && (
                            <div className="flex items-center gap-2">
                              <Building className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{inq.company}</span>
                            </div>
                          )}
                        </div>

                        {/* Service & Language Badges */}
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-cyan-300">
                          <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-1">
                            <span className="text-slate-400">Service:</span>{' '}
                            <strong className="text-white">{serviceName}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-1">
                            <span className="text-slate-400">Lang:</span>{' '}
                            <strong className="text-cyan-300">{lang}</strong>
                          </span>
                        </div>

                        {/* Message Box */}
                        <p className="text-xs text-slate-300 bg-black/40 p-3.5 rounded-xl border border-white/5 italic font-sans leading-relaxed">
                          "{inq.message}"
                        </p>

                        {/* Internal Admin Notes Section */}
                        <div className="space-y-2 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="flex items-center gap-1.5 font-bold text-slate-300">
                              <FileText className="w-3.5 h-3.5 text-purple-400" /> Internal Admin Notes
                            </span>
                            {editingNotesId === inq.id ? (
                              <button
                                onClick={async () => {
                                  setInquiries(
                                    inquiries.map((i) => (i.id === inq.id ? { ...i, notes: tempNoteText } : i))
                                  );
                                  await updateContactInquiry(inq.id, { notes: tempNoteText });
                                  showStatus(`Saved internal note for inquiry #${code}`);
                                  setEditingNotesId(null);
                                }}
                                className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[10px] font-bold cursor-pointer transition-all"
                              >
                                Save Note
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingNotesId(inq.id);
                                  setTempNoteText(inq.notes || '');
                                }}
                                className="text-cyan-400 hover:underline text-[10px] font-mono cursor-pointer"
                              >
                                {inq.notes ? 'Edit Note' : '+ Add Note'}
                              </button>
                            )}
                          </div>

                          {editingNotesId === inq.id ? (
                            <textarea
                              rows={2}
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Type internal notes (e.g., Spoke on phone 28th July, quote sent for 50 hrs audio)..."
                              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-purple-500/40 text-white text-xs font-sans focus:outline-none focus:border-cyan-400"
                            />
                          ) : inq.notes ? (
                            <div className="text-xs font-sans text-purple-200 bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/20">
                              {inq.notes}
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-500 italic">No internal admin notes yet.</div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer: Reply Email Button & Received Timestamp */}
                      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs mt-3">
                        <a
                          href={`mailto:${inq.email}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(
                            replyBody
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md group cursor-pointer"
                          title="Click to open email client with pre-filled subject, inquiry code, and response template"
                        >
                          <Mail className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                          Reply via Pre-defined Email
                        </a>

                        <div className="text-[10px] font-mono text-slate-500 text-right shrink-0">
                          Received: {new Date(inq.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NEWSLETTER SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" /> Zenemoo Dispatch Newsletter Subscribers ({subscribers.length})
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Subscribers registered via the website footer dispatch box. Stored in Supabase PostgreSQL <code className="text-cyan-300">subscribers</code> table.
                </p>
              </div>

              <button
                onClick={loadSubscribers}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh Subscribers
              </button>
            </div>

            {/* Add New Subscriber Form */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <h4 className="text-sm font-bold font-display text-white">Add New Newsletter Subscriber</h4>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newSubEmail || !newSubEmail.includes('@')) return;
                  try {
                    await subscriberApi.subscribe(newSubEmail);
                    setNewSubEmail('');
                    await loadSubscribers();
                    showStatus('Subscriber added successfully!');
                  } catch (err: any) {
                    showStatus(err.response?.data?.message || 'Error adding subscriber');
                  }
                }}
                className="flex gap-3 max-w-lg"
              >
                <input
                  type="email"
                  required
                  placeholder="subscriber@company.com"
                  value={newSubEmail}
                  onChange={(e) => setNewSubEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Email
                </button>
              </form>
            </div>

            {/* Editing Subscriber Modal */}
            {editingSub && (
              <div className="glass-panel p-6 rounded-2xl border border-cyan-500/40 space-y-4 bg-black/80">
                <h4 className="text-sm font-bold text-white">Modify Subscriber Email</h4>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await subscriberApi.update(editingSub.id, editingSub.email);
                      setEditingSub(null);
                      await loadSubscribers();
                      showStatus('Subscriber email updated!');
                    } catch (err: any) {
                      showStatus(err.response?.data?.message || 'Error updating subscriber');
                    }
                  }}
                  className="flex gap-3 max-w-lg"
                >
                  <input
                    type="email"
                    required
                    value={editingSub.email}
                    onChange={(e) => setEditingSub({ ...editingSub, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSub(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-mono"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {/* Subscriber List Grid */}
            {subscribers.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                <Sparkles className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Newsletter Subscribers Yet</h4>
                <p className="text-xs font-mono text-slate-400">
                  Subscribers joining via the website footer form will be listed here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscribers.map((sub) => (
                  <div key={sub.id} className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-mono text-xs text-white font-bold truncate">{sub.email}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Subscribed: {new Date(sub.subscribed_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditingSub({ id: sub.id, email: sub.email })}
                        className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10"
                        title="Edit Subscriber"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete subscriber ${sub.email}?`)) {
                            setSubscribers(subscribers.filter((s) => s.id !== sub.id));
                            try {
                              await subscriberApi.delete(sub.id);
                            } catch (e) {}
                            showStatus('Subscriber deleted!');
                          }
                        }}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                        title="Delete Subscriber"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TELEMETRY & CAPACITY */}
        {activeTab === 'telemetry' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-2xl mx-auto space-y-6">
            <h3 className="text-xl font-bold font-display text-white">Update Site Telemetry Metrics</h3>

            <form onSubmit={handleSaveTelemetry} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Daily Output (Minutes)</label>
                <input
                  type="number"
                  value={telemetry.dailyOutput}
                  onChange={(e) => setTelemetry({ ...telemetry, dailyOutput: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Monthly Target Output (Minutes)</label>
                <input
                  type="number"
                  value={telemetry.monthlyOutput}
                  onChange={(e) => setTelemetry({ ...telemetry, monthlyOutput: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Accuracy SLA Rate (%)</label>
                <input
                  type="number"
                  value={telemetry.accuracyRate}
                  onChange={(e) => setTelemetry({ ...telemetry, accuracyRate: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Active Team Specialists</label>
                <input
                  type="number"
                  value={telemetry.activeSpecialists}
                  onChange={(e) => setTelemetry({ ...telemetry, activeSpecialists: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-sans text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20"
              >
                Save Telemetry Metrics
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: LIVE API KEYS & CREDENTIALS */}
        {activeTab === 'keys' && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-display text-white">Supabase &amp; Cloudinary Live Config</h3>
              <p className="text-xs font-mono text-slate-400">
                View live ecosystem credentials configured in project build.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-cyan-300 font-bold mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  readOnly
                  value={config.supabaseUrl}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold mb-1">Supabase Public Anon Key</label>
                <textarea
                  readOnly
                  rows={2}
                  value={config.supabaseAnonKey}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 text-[11px] font-mono resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Cloudinary Cloud Name</label>
                <input
                  type="text"
                  readOnly
                  value={config.cloudinaryCloudName || 'rwoe0mm9'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">Cloudinary Unsigned Upload Preset</label>
                <input
                  type="text"
                  readOnly
                  value={config.cloudinaryUploadPreset || 'zenemoo_preset'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono"
                />
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs leading-relaxed">
                ✅ Live Supabase PostgreSQL &amp; Cloudinary CDN ecosystem are fully connected.
              </div>
            </form>
          </div>
        )}

        {/* EDIT / CREATE OPPORTUNITY PROGRAM MODAL */}
        <AnimatePresence>
          {editingOpportunity && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-xl w-full my-8 space-y-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    {editingOpportunity.id.startsWith('temp_') ? 'Add New Program Opportunity' : 'Edit Program Opportunity'}
                  </h3>
                  <button
                    onClick={() => setEditingOpportunity(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveOpportunity} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Program Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ZENEMOO × DesiCrew"
                        value={editingOpportunity.title}
                        onChange={(e) => setEditingOpportunity({ ...editingOpportunity, title: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Partner / Brand Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DesiCrew Solutions"
                        value={editingOpportunity.partner_name}
                        onChange={(e) => setEditingOpportunity({ ...editingOpportunity, partner_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Program Status</label>
                      <select
                        value={editingOpportunity.status}
                        onChange={(e) => setEditingOpportunity({ ...editingOpportunity, status: e.target.value as any })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      >
                        <option value="active">ACTIVE</option>
                        <option value="stopped">STOPPED</option>
                        <option value="coming_soon">COMING SOON</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Badge Text</label>
                      <input
                        type="text"
                        placeholder="ACTIVE, STOPPED, OPEN"
                        value={editingOpportunity.badge || ''}
                        onChange={(e) => setEditingOpportunity({ ...editingOpportunity, badge: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Position Order</label>
                      <select
                        value={editingOpportunity.position}
                        onChange={(e) => setEditingOpportunity({ ...editingOpportunity, position: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d0e15] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      >
                        {Array.from({ length: Math.max(opportunitiesList.length + 1, editingOpportunity.position) }).map((_, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            Position #{idx + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Short Program Description</label>
                    <textarea
                      rows={2}
                      placeholder="Professional enterprise transcription, annotation, and translation services..."
                      value={editingOpportunity.description}
                      onChange={(e) => setEditingOpportunity({ ...editingOpportunity, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Action Link Target (URL or Hash Route)</label>
                    <input
                      type="text"
                      placeholder="#desicrew-contributors or https://..."
                      value={editingOpportunity.action_url}
                      onChange={(e) => setEditingOpportunity({ ...editingOpportunity, action_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* Company Logo & Poster Banner Uploaders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Company Logo (Cloudinary CDN)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Logo URL..."
                          value={editingOpportunity.company_logo || ''}
                          onChange={(e) => setEditingOpportunity({ ...editingOpportunity, company_logo: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                        />
                        <label className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer flex items-center gap-1 shrink-0 font-bold">
                          <Upload className="w-3.5 h-3.5" />
                          {isLogoUploading ? '...' : 'Logo'}
                          <input type="file" accept="image/*" onChange={handleOpportunityLogoUpload} className="hidden" disabled={isLogoUploading} />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Poster Banner (Cloudinary CDN)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Poster URL..."
                          value={editingOpportunity.poster_url || ''}
                          onChange={(e) => setEditingOpportunity({ ...editingOpportunity, poster_url: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                        />
                        <label className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 cursor-pointer flex items-center gap-1 shrink-0 font-bold">
                          <Upload className="w-3.5 h-3.5" />
                          {isOpportunityUploading ? '...' : 'Poster'}
                          <input type="file" accept="image/*" onChange={handleOpportunityPosterUpload} className="hidden" disabled={isOpportunityUploading} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* LinkedIn & PDF Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1 flex items-center gap-1">
                        <Linkedin className="w-3.5 h-3.5 text-blue-400" /> LinkedIn Post Link (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/posts/..."
                        value={linkedinPostUrl}
                        onChange={(e) => setLinkedinPostUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" /> PDF Guideline Document Link (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="https://.../guidelines.pdf"
                        value={pdfLink}
                        onChange={(e) => setPdfLink(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Opportunity Contact Details */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                      <Mail className="w-4 h-4" /> Opportunity Direct Contact Info (For Inquiry)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Contact Person (e.g. Viji M.P.)"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white"
                      />
                      <input
                        type="email"
                        placeholder="Contact Email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white"
                      />
                      <input
                        type="tel"
                        placeholder="WhatsApp / Phone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white"
                      />
                    </div>
                  </div>

                  {/* Language Skills & Eligibility Lists */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1">Language &amp; Skills Requirements (1 per line)</label>
                      <textarea
                        rows={3}
                        placeholder="Odia (Native)&#10;Indian English&#10;Aegisub Tool&#10;Subtitle Edit"
                        value={languageSkillsInput}
                        onChange={(e) => setLanguageSkillsInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Eligibility Criteria (1 per line)</label>
                      <textarea
                        rows={3}
                        placeholder="PC/Laptop Hardware Required&#10;Fast Internet Connection&#10;Native Listening &amp; Typing Accuracy"
                        value={eligibilityInput}
                        onChange={(e) => setEligibilityInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Highlights Features (Line Separated) */}
                  <div>
                    <label className="block text-slate-300 mb-1">Highlights &amp; Features (1 per line)</label>
                    <textarea
                      rows={2}
                      placeholder="1.5+ Years Verified Collaboration&#10;Advanced Audio Transcription Tasks&#10;Enterprise SLA Requirements"
                      value={featuresInput}
                      onChange={(e) => setFeaturesInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* CUSTOM APPLICATION FORM QUESTION BUILDER */}
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-purple-300 flex items-center gap-1.5 text-sm">
                        <HelpCircle className="w-4 h-4" /> Custom Application Form Question Builder
                      </div>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">
                        {customQuestionsList.length} Questions Defined
                      </span>
                    </div>

                    {/* Question List */}
                    {customQuestionsList.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {customQuestionsList.map((q, idx) => (
                          <div key={q.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span className="text-cyan-400">Q{idx + 1}.</span> {q.label}
                                {q.required && <span className="text-red-400 font-bold">*</span>}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Type: <span className="text-purple-300 uppercase">{q.type}</span>
                                {q.options && q.options.length > 0 && ` • Options: ${q.options.join(', ')}`}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Question Sub-form */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <div className="text-xs font-bold text-slate-300">Add New Form Question:</div>
                      <input
                        type="text"
                        placeholder="e.g. What is your Odia typing speed (words per minute)?"
                        value={newQLabel}
                        onChange={(e) => setNewQLabel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={newQType}
                          onChange={(e) => setNewQType(e.target.value as any)}
                          className="px-3 py-2 rounded-xl bg-[#0d0e15] border border-white/10 text-white"
                        >
                          <option value="text">Short Text Answer</option>
                          <option value="textarea">Long Paragraph Answer</option>
                          <option value="select">Dropdown Options Select</option>
                        </select>

                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newQRequired}
                            onChange={(e) => setNewQRequired(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          <span>Required Question</span>
                        </label>
                      </div>

                      {newQType === 'select' && (
                        <textarea
                          rows={2}
                          placeholder="Options (1 per line)&#10;e.g. 2-3 Hours&#10;4-5 Hours&#10;6+ Hours"
                          value={newQOptions}
                          onChange={(e) => setNewQOptions(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                        />
                      )}

                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="w-full py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" /> Add Question to Opportunity Form
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingOpportunity(null)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Save Program Opportunity
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CANDIDATE APPLICATIONS TABLE MODAL VIEW */}
        <AnimatePresence>
          {selectedOppForApps && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-5xl w-full my-8 space-y-6 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-cyan-400" /> Candidate Applications Table
                    </h3>
                    <p className="text-xs font-mono text-cyan-300 mt-0.5">
                      Program: <span className="text-white font-bold">{selectedOppForApps.title}</span> ({selectedOppForApps.partner_name})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOppForApps(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center justify-between gap-4 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Filter Status:</span>
                    <select
                      value={appStatusFilter}
                      onChange={(e) => setAppStatusFilter(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-bold focus:outline-none"
                    >
                      <option value="all" className="bg-slate-900">ALL APPLICATIONS</option>
                      <option value="pending" className="bg-slate-900">PENDING</option>
                      <option value="shortlisted" className="bg-slate-900">SHORTLISTED</option>
                      <option value="accepted" className="bg-slate-900">ACCEPTED</option>
                      <option value="rejected" className="bg-slate-900">REJECTED</option>
                    </select>
                  </div>

                  <span className="text-cyan-400 font-bold">
                    Total: {allCandidateApps.filter((a) => a.opportunity_id === selectedOppForApps.id).length} Applicants
                  </span>
                </div>

                {/* Table View */}
                {allCandidateApps.filter((a) => a.opportunity_id === selectedOppForApps.id).length === 0 ? (
                  <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 space-y-3">
                    <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
                    <h4 className="text-base font-bold text-white">No Candidate Applications Submitted Yet</h4>
                    <p className="text-xs font-mono text-slate-400">
                      When candidates apply to this opportunity on <code className="text-cyan-300">/#opportunities</code>, their entries will populate in this table automatically.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.01]">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-white/[0.03] text-slate-300 border-b border-white/10 uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                          <th className="p-3.5">Applicant ID</th>
                          <th className="p-3.5">Applicant Name</th>
                          <th className="p-3.5">Contact Info</th>
                          <th className="p-3.5">Custom Form Answers</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-200">
                        {allCandidateApps
                          .filter((a) => a.opportunity_id === selectedOppForApps.id)
                          .filter((a) => appStatusFilter === 'all' || a.status === appStatusFilter)
                          .map((app) => (
                            <tr key={app.id} className="hover:bg-white/[0.02]">
                              <td className="p-3.5 font-bold font-mono text-cyan-400 text-xs">
                                {app.applicant_id || `APP-2026-${app.id.substring(0, 4)}`}
                              </td>
                              <td className="p-3.5 font-bold text-white font-sans">{app.applicant_name}</td>
                              <td className="p-3.5 space-y-0.5 text-[11px]">
                                <div className="text-cyan-300">{app.applicant_email}</div>
                                <div className="text-slate-400">{app.applicant_phone}</div>
                              </td>
                              <td className="p-3.5 max-w-xs">
                                <div className="space-y-1 text-[11px]">
                                  {Object.entries(app.answers || {}).map(([key, val]) => (
                                    <div key={key} className="bg-white/[0.03] p-1.5 rounded border border-white/5">
                                      <span className="text-slate-400 font-bold">{key}:</span>{' '}
                                      <span className="text-emerald-300">{String(val)}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <select
                                  value={app.status}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value as any;
                                    const updatedList = await updateCandidateApplicationStatus(app.id, { status: newStatus });
                                    setAllCandidateApps(updatedList);
                                    showStatus(`Updated candidate "${app.applicant_name}" status to ${newStatus.toUpperCase()}`);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase focus:outline-none cursor-pointer ${
                                    app.status === 'accepted'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : app.status === 'shortlisted'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : app.status === 'rejected'
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  }`}
                                >
                                  <option value="pending" className="bg-slate-900 text-amber-400">PENDING</option>
                                  <option value="shortlisted" className="bg-slate-900 text-cyan-400">SHORTLISTED</option>
                                  <option value="accepted" className="bg-slate-900 text-emerald-400">ACCEPTED</option>
                                  <option value="rejected" className="bg-slate-900 text-red-400">REJECTED</option>
                                </select>
                              </td>
                              <td className="p-3.5 text-[10px] text-slate-400">
                                {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Today'}
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={async () => {
                                    if (confirm(`Delete application for ${app.applicant_name}?`)) {
                                      const updated = await deleteCandidateApplication(app.id);
                                      setAllCandidateApps(updated);
                                      showStatus('Candidate application deleted');
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                                  title="Delete Application"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
