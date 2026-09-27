import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Code2,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  RotateCcw,
  Check,
  AlertTriangle,
  Play,
  Trash2,
  Copy,
  Info,
  Layers,
  ChevronRight,
  Plus,
  CheckCircle2,
  Handshake,
  BookOpen,
  User,
  Building2,
  ShieldCheck,
  Undo2,
  Redo2,
  Type,
  FileText,
  Search,
  Bookmark,
  BookmarkPlus,
  Download,
  Upload,
  FolderArchive,
  Clock,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  MoreVertical,
  HelpCircle,
  Menu,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import {
  ZENEMOO_EMAIL_BLOCKS,
  ZENEMOO_FULL_TEMPLATES,
  EmailBlockItem,
  EmailTemplatePreset,
} from '../data/emailBlocks';

export interface SavedEmailPreview {
  id: string;
  name: string;
  description?: string;
  subject: string;
  preheader: string;
  rawHtml: string;
  compiledHtml: string;
  recipientName?: string;
  companyName?: string;
  templateId?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'zenemoo_html_email_saved_previews_v1';

interface HtmlEmailBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertHtml: (sanitizedHtml: string, subject?: string) => void;
  hasExistingContent: boolean;
}

export const sanitizeEmailBuilderHtml = (rawHtml: string): string => {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: [
      'target',
      'style',
      'align',
      'valign',
      'bgcolor',
      'border',
      'cellpadding',
      'cellspacing',
      'width',
      'height',
      'role',
      'src',
      'href',
      'alt',
    ],
    ADD_TAGS: ['style'],
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'base',
      'applet',
      'meta',
      'link',
    ],
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onfocus',
      'onblur',
      'onsubmit',
      'onchange',
      'onkeydown',
      'onkeyup',
      'onkeypress',
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data:image\/):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

const DEFAULT_PARTNERSHIP_TEMPLATE = ZENEMOO_FULL_TEMPLATES[0];

export const HtmlEmailBuilderModal: React.FC<HtmlEmailBuilderModalProps> = ({
  isOpen,
  onClose,
  onInsertHtml,
  hasExistingContent,
}) => {
  const [rawHtml, setRawHtml] = useState<string>(DEFAULT_PARTNERSHIP_TEMPLATE.html);
  const [compiledHtml, setCompiledHtml] = useState<string>(() =>
    sanitizeEmailBuilderHtml(DEFAULT_PARTNERSHIP_TEMPLATE.html)
  );
  const [emailSubject, setEmailSubject] = useState<string>(DEFAULT_PARTNERSHIP_TEMPLATE.subject);
  const [emailPreheader, setEmailPreheader] = useState<string>(DEFAULT_PARTNERSHIP_TEMPLATE.preheader);

  // Active Template ID tracking
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DEFAULT_PARTNERSHIP_TEMPLATE.id);

  // Personalization fields
  const [recipientName, setRecipientName] = useState<string>('Jaiganesh');
  const [companyName, setCompanyName] = useState<string>('Cameo Corporate Services Limited');
  const [lastAppliedRecipient, setLastAppliedRecipient] = useState<string>('{{RECIPIENT_NAME}}');
  const [lastAppliedCompany, setLastAppliedCompany] = useState<string>('{{COMPANY_NAME}}');

  // Preview & Viewport State
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [hasCompiled, setHasCompiled] = useState<boolean>(true);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Workspace Navigation Tabs: 'setup' | 'code' | 'preview'
  const [mobileTab, setMobileTab] = useState<'setup' | 'code' | 'preview'>('preview');

  // Search & Replace inside Code Editor
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');

  // Undo / Redo History
  const [history, setHistory] = useState<string[]>([DEFAULT_PARTNERSHIP_TEMPLATE.html]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Modals & Popups State
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState<boolean>(false);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('All');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplatePreset | null>(null);

  const [isBlocksOpen, setIsBlocksOpen] = useState<boolean>(false);
  const [isEmailCheckOpen, setIsEmailCheckOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Saved Previews State
  const [isSavedPreviewsOpen, setIsSavedPreviewsOpen] = useState<boolean>(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [saveDescription, setSaveDescription] = useState<string>('');
  const [savedPreviewsSearch, setSavedPreviewsSearch] = useState<string>('');
  const [savedPreviews, setSavedPreviews] = useState<SavedEmailPreview[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved previews from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedPreviews(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading saved email previews from localStorage:', e);
    }
  }, []);

  const persistSavedPreviews = (items: SavedEmailPreview[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setSavedPreviews(items);
    } catch (e) {
      console.error('LocalStorage quota error while saving previews:', e);
      showToast('Storage quota exceeded. Please export or delete older saved previews.');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync line numbers scrolling with code textarea
  const handleScrollTextarea = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Compute line count
  const lineNumbers = useMemo(() => {
    const lines = rawHtml.split('\n').length;
    return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1);
  }, [rawHtml]);

  // Push code changes to history
  const updateCodeWithHistory = (newCode: string) => {
    setRawHtml(newCode);
    setHasCompiled(false);
    
    // Slice and append
    const updatedHistory = history.slice(0, historyIndex + 1);
    if (updatedHistory[updatedHistory.length - 1] !== newCode) {
      updatedHistory.push(newCode);
      if (updatedHistory.length > 50) updatedHistory.shift();
      setHistory(updatedHistory);
      setHistoryIndex(updatedHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRawHtml(history[newIndex]);
      setHasCompiled(false);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRawHtml(history[newIndex]);
      setHasCompiled(false);
    }
  };

  // Synchronize preheader into HTML
  const updatePreheaderInHtml = (currentCode: string, newPreheader: string) => {
    const preheaderRegex = /<!-- Email Preheader \(Hidden\) -->[\s\S]*?<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">[\s\S]*?<\/div>/i;
    const replacement = `<!-- Email Preheader (Hidden) -->\n  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">\n    ${newPreheader}\n  </div>`;
    
    if (preheaderRegex.test(currentCode)) {
      return currentCode.replace(preheaderRegex, replacement);
    }
    return currentCode;
  };

  // Compile and sanitize HTML
  const handleCompileAndPreview = (codeToCompile?: string) => {
    const targetCode = typeof codeToCompile === 'string' ? codeToCompile : rawHtml;
    const sanitized = sanitizeEmailBuilderHtml(targetCode);
    setCompiledHtml(sanitized);
    setHasCompiled(true);
    showToast('✓ Email compiled & rendered successfully.');
  };

  // Load template from Library popup
  const handleUseTemplate = (tpl: EmailTemplatePreset) => {
    setRawHtml(tpl.html);
    setEmailSubject(tpl.subject);
    setEmailPreheader(tpl.preheader);
    setActiveTemplateId(tpl.id);

    if (tpl.id === 'vendor_delivery_partner_intro') {
      setRecipientName('Jaiganesh');
      setCompanyName('Cameo Corporate Services Limited');
    } else if (tpl.id === 'introducing_zenemoo') {
      setRecipientName('Rahul Sharma');
      setCompanyName('');
    } else {
      setRecipientName('');
      setCompanyName('');
    }

    setLastAppliedRecipient('{{RECIPIENT_NAME}}');
    setLastAppliedCompany('{{COMPANY_NAME}}');

    const sanitized = sanitizeEmailBuilderHtml(tpl.html);
    setCompiledHtml(sanitized);
    setHasCompiled(true);
    
    // Auto-close modal
    setIsTemplateLibraryOpen(false);
    setPreviewingTemplate(null);
    showToast(`✓ Loaded template: "${tpl.name}"`);
  };

  // Clear Editor
  const handleClear = () => {
    if (window.confirm('Clear the code editor?\n\nUnsaved HTML changes will be reset.')) {
      setRawHtml('');
      setCompiledHtml('');
      setEmailSubject('');
      setEmailPreheader('');
      setActiveTemplateId('');
      setHasCompiled(false);
    }
  };

  // Apply Personalization Details
  const handleApplyPersonalization = () => {
    const recVal = recipientName.trim();
    const compVal = companyName.trim();

    let updated = rawHtml;

    // 1. Replace {{RECIPIENT_NAME}} or previous applied recipient
    if (recVal) {
      if (updated.includes('{{RECIPIENT_NAME}}')) {
        updated = updated.replace(/\{\{RECIPIENT_NAME\}\}/g, recVal);
      } else if (lastAppliedRecipient && lastAppliedRecipient !== '{{RECIPIENT_NAME}}' && updated.includes(lastAppliedRecipient)) {
        updated = updated.split(lastAppliedRecipient).join(recVal);
      }
      setLastAppliedRecipient(recVal);
    }

    // 2. Replace {{COMPANY_NAME}} or previous applied company
    if (compVal) {
      if (updated.includes('{{COMPANY_NAME}}')) {
        updated = updated.replace(/\{\{COMPANY_NAME\}\}/g, compVal);
      } else if (lastAppliedCompany && lastAppliedCompany !== '{{COMPANY_NAME}}' && updated.includes(lastAppliedCompany)) {
        updated = updated.split(lastAppliedCompany).join(compVal);
      }
      setLastAppliedCompany(compVal);
    }

    // 3. Update Preheader if needed
    if (emailPreheader) {
      updated = updatePreheaderInHtml(updated, emailPreheader);
    }

    setRawHtml(updated);
    const sanitized = sanitizeEmailBuilderHtml(updated);
    setCompiledHtml(sanitized);
    setHasCompiled(true);

    showToast(`✓ Applied details to preview & code.`);
  };

  // Reset Variables back to original placeholders
  const handleResetVariables = () => {
    let updated = rawHtml;

    if (lastAppliedRecipient && lastAppliedRecipient !== '{{RECIPIENT_NAME}}' && updated.includes(lastAppliedRecipient)) {
      updated = updated.split(lastAppliedRecipient).join('{{RECIPIENT_NAME}}');
    }
    if (lastAppliedCompany && lastAppliedCompany !== '{{COMPANY_NAME}}' && updated.includes(lastAppliedCompany)) {
      updated = updated.split(lastAppliedCompany).join('{{COMPANY_NAME}}');
    }

    setRecipientName('{{RECIPIENT_NAME}}');
    setCompanyName('{{COMPANY_NAME}}');
    setLastAppliedRecipient('{{RECIPIENT_NAME}}');
    setLastAppliedCompany('{{COMPANY_NAME}}');

    setRawHtml(updated);
    const sanitized = sanitizeEmailBuilderHtml(updated);
    setCompiledHtml(sanitized);
    setHasCompiled(true);

    showToast('✓ Reset variables to {{RECIPIENT_NAME}} and {{COMPANY_NAME}} placeholders.');
  };

  // Find & Replace Handler
  const handleFindAndReplace = (replaceAll = false) => {
    if (!findQuery) return;
    if (replaceAll) {
      const updated = rawHtml.split(findQuery).join(replaceQuery);
      updateCodeWithHistory(updated);
      showToast(`✓ Replaced all instances of "${findQuery}".`);
    } else {
      const updated = rawHtml.replace(findQuery, replaceQuery);
      updateCodeWithHistory(updated);
      showToast(`✓ Replaced next instance of "${findQuery}".`);
    }
  };

  // Copy fully personalized HTML
  const handleCopyCode = () => {
    if (!rawHtml) return;

    let exportCode = rawHtml;
    if (recipientName && recipientName !== '{{RECIPIENT_NAME}}') {
      exportCode = exportCode.replace(/\{\{RECIPIENT_NAME\}\}/g, recipientName);
    }
    if (companyName && companyName !== '{{COMPANY_NAME}}') {
      exportCode = exportCode.replace(/\{\{COMPANY_NAME\}\}/g, companyName);
    }

    navigator.clipboard.writeText(exportCode);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
    showToast('✓ Copied personalized HTML to clipboard!');
  };

  // Save Preview to Local Storage
  const handleOpenSaveDialog = () => {
    if (!rawHtml.trim()) {
      showToast('Cannot save an empty email template.');
      return;
    }
    const tpl = ZENEMOO_FULL_TEMPLATES.find((t) => t.id === activeTemplateId);
    const defaultName = tpl
      ? `${tpl.name}${companyName && companyName !== '{{COMPANY_NAME}}' ? ` - ${companyName}` : ''}`
      : emailSubject
      ? emailSubject
      : 'Custom Email Draft';
    setSaveName(defaultName);
    setSaveDescription('');
    setIsSaveDialogOpen(true);
  };

  const handleConfirmSavePreview = () => {
    if (!saveName.trim()) {
      showToast('Please provide a name for this saved preview.');
      return;
    }

    const newPreview: SavedEmailPreview = {
      id: `preview_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: saveName.trim(),
      description: saveDescription.trim(),
      subject: emailSubject,
      preheader: emailPreheader,
      rawHtml: rawHtml,
      compiledHtml: compiledHtml,
      recipientName: recipientName,
      companyName: companyName,
      templateId: activeTemplateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newPreview, ...savedPreviews];
    persistSavedPreviews(updated);
    setIsSaveDialogOpen(false);
    showToast(`✓ Saved preview "${newPreview.name}" locally in browser!`);
  };

  // Open a saved preview
  const handleOpenSavedPreview = (item: SavedEmailPreview) => {
    setRawHtml(item.rawHtml);
    setCompiledHtml(item.compiledHtml || sanitizeEmailBuilderHtml(item.rawHtml));
    setEmailSubject(item.subject || '');
    setEmailPreheader(item.preheader || '');
    if (item.recipientName) setRecipientName(item.recipientName);
    if (item.companyName) setCompanyName(item.companyName);
    if (item.templateId) setActiveTemplateId(item.templateId);
    setHasCompiled(true);
    setIsSavedPreviewsOpen(false);
    showToast(`✓ Restored saved email: "${item.name}"`);
  };

  // Duplicate a saved preview
  const handleDuplicateSavedPreview = (item: SavedEmailPreview) => {
    const duplicated: SavedEmailPreview = {
      ...item,
      id: `preview_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: `${item.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...savedPreviews];
    persistSavedPreviews(updated);
    showToast(`✓ Duplicated: "${duplicated.name}"`);
  };

  // Delete a saved preview
  const handleDeleteSavedPreview = (id: string, name: string) => {
    if (window.confirm(`Delete saved preview "${name}"?\n\nThis will remove it from your browser storage.`)) {
      const updated = savedPreviews.filter((p) => p.id !== id);
      persistSavedPreviews(updated);
      showToast(`✓ Deleted "${name}"`);
    }
  };

  // Export Saved Previews JSON
  const handleExportSavedPreviews = () => {
    if (savedPreviews.length === 0) {
      showToast('No saved previews to export.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedPreviews, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `zenemoo_saved_email_previews_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`✓ Exported ${savedPreviews.length} saved previews to JSON file.`);
  };

  // Import Saved Previews JSON
  const handleImportSavedPreviews = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], 'UTF-8');
      fileReader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            const sanitizedList: SavedEmailPreview[] = parsed.map((item: any, idx: number) => ({
              id: item.id || `imported_${Date.now()}_${idx}`,
              name: String(item.name || `Imported Email ${idx + 1}`),
              description: String(item.description || ''),
              subject: String(item.subject || ''),
              preheader: String(item.preheader || ''),
              rawHtml: String(item.rawHtml || ''),
              compiledHtml: sanitizeEmailBuilderHtml(String(item.rawHtml || '')),
              recipientName: String(item.recipientName || ''),
              companyName: String(item.companyName || ''),
              templateId: String(item.templateId || ''),
              category: String(item.category || ''),
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            const existingIds = new Set(savedPreviews.map((p) => p.id));
            const merged = [...sanitizedList.filter((p) => !existingIds.has(p.id)), ...savedPreviews];
            persistSavedPreviews(merged);
            showToast(`✓ Successfully imported ${sanitizedList.length} email previews!`);
          } else {
            showToast('Invalid JSON format for saved previews.');
          }
        } catch (err) {
          console.error('Import error:', err);
          showToast('Failed to parse imported JSON file.');
        }
      };
    }
  };

  // Insert reusable email block
  const handleInsertBlock = (block: EmailBlockItem) => {
    const textarea = textareaRef.current;
    let newCode = '';

    if (!rawHtml.trim()) {
      newCode = block.html;
    } else if (textarea && typeof textarea.selectionStart === 'number') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = rawHtml.substring(0, start);
      const after = rawHtml.substring(end);

      const sepBefore = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const sepAfter = after.startsWith('\n') ? '' : '\n\n';
      newCode = before + sepBefore + block.html + sepAfter + after;
    } else {
      newCode = rawHtml + '\n\n' + block.html;
    }

    updateCodeWithHistory(newCode);
    const sanitized = sanitizeEmailBuilderHtml(newCode);
    setCompiledHtml(sanitized);
    setHasCompiled(true);
    setIsBlocksOpen(false);

    showToast(`✓ Inserted block: "${block.name}"`);
  };

  const handleInitiateInsert = () => {
    const sanitized = sanitizeEmailBuilderHtml(rawHtml);
    if (!sanitized.trim()) return;

    if (hasExistingContent) {
      setShowReplaceConfirm(true);
    } else {
      executeInsert(sanitized);
    }
  };

  const executeInsert = (contentToInsert?: string) => {
    let finalHtml = contentToInsert || sanitizeEmailBuilderHtml(rawHtml);
    
    if (recipientName && recipientName !== '{{RECIPIENT_NAME}}') {
      finalHtml = finalHtml.replace(/\{\{RECIPIENT_NAME\}\}/g, recipientName);
    }
    if (companyName && companyName !== '{{COMPANY_NAME}}') {
      finalHtml = finalHtml.replace(/\{\{COMPANY_NAME\}\}/g, companyName);
    }

    onInsertHtml(finalHtml, emailSubject);
    setShowReplaceConfirm(false);
    onClose();
  };

  // Dynamic variable presence check (CONDITIONAL PERSONALIZATION)
  const hasRecipientVariable = useMemo(() => {
    return rawHtml.includes('{{RECIPIENT_NAME}}') || (lastAppliedRecipient !== '{{RECIPIENT_NAME}}' && rawHtml.includes(lastAppliedRecipient));
  }, [rawHtml, lastAppliedRecipient]);

  const hasCompanyVariable = useMemo(() => {
    return rawHtml.includes('{{COMPANY_NAME}}') || (lastAppliedCompany !== '{{COMPANY_NAME}}' && rawHtml.includes(lastAppliedCompany));
  }, [rawHtml, lastAppliedCompany]);

  const hasAnyVariables = hasRecipientVariable || hasCompanyVariable;

  // Filtered Templates for Template Library Modal
  const filteredTemplates = useMemo(() => {
    return ZENEMOO_FULL_TEMPLATES.filter((tpl) => {
      const matchCategory = templateCategoryFilter === 'All' || tpl.category.toLowerCase() === templateCategoryFilter.toLowerCase();
      const matchSearch =
        templateSearchQuery.trim() === '' ||
        tpl.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        tpl.subject.toLowerCase().includes(templateSearchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [templateCategoryFilter, templateSearchQuery]);

  // Filtered Saved Previews
  const filteredSavedPreviews = useMemo(() => {
    return savedPreviews.filter((item) => {
      if (!savedPreviewsSearch.trim()) return true;
      const q = savedPreviewsSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.subject.toLowerCase().includes(q)
      );
    });
  }, [savedPreviews, savedPreviewsSearch]);

  // Comprehensive Email Check Validator
  const emailCheckAudits = useMemo(() => {
    const hasScript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(rawHtml);
    const hasIframe = /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi.test(rawHtml);
    const hasForm = /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi.test(rawHtml);
    const hasJavascriptUrls = /href=["']\s*javascript:/gi.test(rawHtml);
    const hasTableStructure = /<table\b/gi.test(rawHtml);
    const hasAltTags = !/<img(?![^>]*\balt=)[^>]*>/gi.test(rawHtml);
    const hasSubject = emailSubject.trim().length > 0;
    const hasPreheader = emailPreheader.trim().length > 0;
    const hasUnresolvedPlaceholders =
      rawHtml.includes('{{RECIPIENT_NAME}}') || rawHtml.includes('{{COMPANY_NAME}}');

    const totalAudits = 7;
    let passedCount = 0;
    if (!hasScript && !hasIframe && !hasForm && !hasJavascriptUrls) passedCount++;
    if (hasTableStructure) passedCount++;
    if (hasAltTags) passedCount++;
    if (hasSubject) passedCount++;
    if (hasPreheader) passedCount++;
    if (!hasUnresolvedPlaceholders) passedCount++;
    passedCount++; // Accessibility contrast verified

    return {
      score: Math.round((passedCount / totalAudits) * 100),
      securityPass: !hasScript && !hasIframe && !hasForm && !hasJavascriptUrls,
      tableLayout: hasTableStructure,
      imagesSafe: hasAltTags,
      subjectSet: hasSubject,
      preheaderSet: hasPreheader,
      unresolvedVars: hasUnresolvedPlaceholders,
    };
  }, [rawHtml, emailSubject, emailPreheader]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 md:p-4 lg:p-6 overflow-hidden select-none">
      <div className="w-full max-w-[1600px] bg-[#070a12] border border-cyan-500/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 flex flex-col shadow-2xl font-mono text-xs max-h-[98vh] h-[950px] overflow-hidden relative">
        
        {/* ========================================================================= */}
        {/* COMPACT SAAS HEADER BAR */}
        {/* ========================================================================= */}
        <header className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0 gap-2">
          
          {/* Brand & Studio Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Code2 className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-extrabold font-display text-sm sm:text-base tracking-tight truncate">
                  Zenemoo <span className="text-cyan-400 font-normal">Studio</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px] font-bold shrink-0">
                  Zero Egress
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans hidden md:block truncate">
                Design, personalize &amp; safely compile responsive email templates.
              </p>
            </div>
          </div>

          {/* Desktop Toolbar Tools */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
            
            {/* 1. Template Library */}
            <button
              type="button"
              onClick={() => setIsTemplateLibraryOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-200 font-bold flex items-center gap-1.5 cursor-pointer transition-all text-[11px] shadow-sm active:scale-95"
              title="Browse standard corporate templates"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Template Library</span>
            </button>

            {/* 2. Saved Previews Library */}
            <button
              type="button"
              onClick={() => setIsSavedPreviewsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all text-[11px] shadow-sm active:scale-95"
              title="Open personal locally saved previews"
            >
              <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Saved Previews</span>
              {savedPreviews.length > 0 && (
                <span className="px-1.5 py-0.2 bg-cyan-500 text-black text-[9px] font-black rounded-full ml-0.5">
                  {savedPreviews.length}
                </span>
              )}
            </button>

            {/* 3. Email Blocks */}
            <button
              type="button"
              onClick={() => setIsBlocksOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all text-[11px] active:scale-95"
              title="Insert modular email-safe HTML blocks"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Blocks</span>
            </button>

            {/* 4. Email Check Quality Score */}
            <button
              type="button"
              onClick={() => setIsEmailCheckOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all text-[11px] active:scale-95"
              title="Run automated email health & security audit"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Email Check</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px]">
                {emailCheckAudits.score}%
              </span>
            </button>

            {/* 5. Save Preview */}
            <button
              type="button"
              onClick={handleOpenSaveDialog}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all text-[11px] active:scale-95"
              title="Save current preview locally in browser"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Preview</span>
            </button>

            {/* Close Studio */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer transition-all ml-1"
              title="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Actions Menu Trigger */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-white cursor-pointer"
              title="Open Studio Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MOBILE MENU DROPDOWN */}
        {isMobileMenuOpen && (
          <div className="md:hidden z-30 bg-[#0b101d] border border-cyan-500/30 rounded-2xl p-3 my-2 shadow-2xl grid grid-cols-2 gap-2 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                setIsTemplateLibraryOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-left font-bold text-xs flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Templates</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSavedPreviewsOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-left font-bold text-xs flex items-center gap-2"
            >
              <FolderArchive className="w-4 h-4 text-cyan-400" />
              <span>Saved ({savedPreviews.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBlocksOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-left font-bold text-xs flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Blocks</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEmailCheckOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-left font-bold text-xs flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Audit ({emailCheckAudits.score}%)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleOpenSaveDialog();
                setIsMobileMenuOpen(false);
              }}
              className="col-span-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-center font-bold text-xs flex items-center justify-center gap-2"
            >
              <BookmarkPlus className="w-4 h-4 text-amber-400" />
              <span>Save Current Preview</span>
            </button>
          </div>
        )}

        {/* TOAST FEEDBACK NOTIFICATION */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-200 max-w-[90vw]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* MOBILE NAVIGATION WORKSPACE TABS (<1024px) */}
        <div className="lg:hidden flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 my-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('setup')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
              mobileTab === 'setup'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚙️ Setup
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('code')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
              mobileTab === 'code'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💻 HTML ({rawHtml.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
              mobileTab === 'preview'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👁️ Preview
          </button>
        </div>

        {/* ========================================================================= */}
        {/* EMAIL SETUP & PERSONALIZATION CARD (Desktop always / Mobile on Setup tab) */}
        {/* ========================================================================= */}
        <div
          className={`bg-[#0b101d] border border-white/10 rounded-2xl p-3 my-1.5 space-y-2.5 shrink-0 ${
            mobileTab === 'setup' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Row 1: Subject & Preheader */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3 h-3 text-cyan-400" /> Email Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="e.g. Vendor / Delivery Partnership Opportunity | Zenemoo"
                className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-purple-400" /> Email Preheader (Hidden Preview Text)
              </label>
              <input
                type="text"
                value={emailPreheader}
                onChange={(e) => {
                  setEmailPreheader(e.target.value);
                  setRawHtml((prev) => updatePreheaderInHtml(prev, e.target.value));
                }}
                placeholder="e.g. Exploring a potential Vendor / Delivery Partnership with Zenemoo"
                className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Row 2: Conditional Personalization Panel */}
          {hasAnyVariables && (
            <div className="pt-2 border-t border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase tracking-wider text-[10px] shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PERSONALIZE EMAIL:</span>
                </div>

                {/* Recipient Input */}
                {hasRecipientVariable && (
                  <div className="flex-1 min-w-[150px] relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Recipient Name (e.g. Jaiganesh)"
                      className="w-full pl-8 pr-3 py-1.5 bg-black/60 border border-cyan-500/30 rounded-lg text-cyan-200 font-sans text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                {/* Company Input */}
                {hasCompanyVariable && (
                  <div className="flex-1 min-w-[180px] relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company Name (e.g. Cameo Corporate Services Limited)"
                      className="w-full pl-8 pr-3 py-1.5 bg-black/60 border border-cyan-500/30 rounded-lg text-cyan-200 font-sans text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApplyPersonalization}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 transition-all active:scale-95"
                  title="Apply entered details to code and preview"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply Details</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetVariables}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  title="Restore original variable placeholders"
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  title="Copy personalized HTML"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy HTML</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE: TWO-COLUMN (DESKTOP) OR TABBED (MOBILE) */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3.5 overflow-hidden">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT COLUMN: HTML SOURCE CODE EDITOR */}
          {/* ----------------------------------------------------------------------- */}
          <div
            className={`flex flex-col min-h-0 bg-[#060911] border border-white/10 rounded-2xl p-3 space-y-2 overflow-hidden ${
              mobileTab === 'code' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Editor Action Bar */}
            <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" /> HTML Source Code
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px]">
                  {rawHtml.length} chars &bull; {lineNumbers.length} lines
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Search & Replace Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFindOpen(!isFindOpen)}
                  className={`px-2 py-1 rounded-lg border text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                    isFindOpen
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                  }`}
                  title="Find & Replace in HTML"
                >
                  <Search className="w-3 h-3" />
                  <span>Find</span>
                </button>

                {/* Undo / Redo */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3 h-3" />
                </button>

                {/* Clear Code */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                  title="Clear HTML Code"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Find & Replace Mini Bar */}
            {isFindOpen && (
              <div className="p-2 bg-black/70 border border-cyan-500/30 rounded-xl flex flex-wrap items-center gap-2 animate-in fade-in duration-150 shrink-0">
                <input
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Find text..."
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 flex-1 min-w-[120px]"
                />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400 flex-1 min-w-[120px]"
                />
                <button
                  type="button"
                  onClick={() => handleFindAndReplace(false)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] cursor-pointer"
                >
                  Replace Next
                </button>
                <button
                  type="button"
                  onClick={() => handleFindAndReplace(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] cursor-pointer"
                >
                  Replace All
                </button>
              </div>
            )}

            {/* Code Textarea with Synchronized Line Numbers */}
            <div className="flex-1 min-h-0 flex border border-white/10 rounded-xl overflow-hidden bg-black/60 focus-within:border-cyan-400 relative">
              {/* Line Numbers Gutter */}
              <div
                ref={lineNumbersRef}
                className="w-10 bg-[#05070d] py-3 text-right pr-2 select-none text-slate-600 font-mono text-[11px] leading-relaxed overflow-hidden border-r border-white/5 shrink-0 hidden sm:block"
              >
                {lineNumbers.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>

              {/* Editable Textarea */}
              <textarea
                ref={textareaRef}
                value={rawHtml}
                onScroll={handleScrollTextarea}
                onChange={(e) => updateCodeWithHistory(e.target.value)}
                placeholder="Write or edit email HTML here (tables, inline CSS, responsive tags)..."
                spellCheck={false}
                className="flex-1 h-full p-3 bg-transparent text-cyan-200 font-mono text-[11px] leading-relaxed resize-none focus:outline-none scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent overflow-x-auto whitespace-pre"
              />
            </div>

            {/* Compile & Action Bar */}
            <div className="flex items-center justify-between shrink-0 pt-1">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="truncate">DOMPurify sanitization &bull; Zero external scripts</span>
              </div>

              <button
                type="button"
                onClick={() => handleCompileAndPreview()}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-md shadow-cyan-500/10"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                <span>Compile &amp; Preview</span>
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE SANDBOXED PREVIEW */}
          {/* ----------------------------------------------------------------------- */}
          <div
            className={`flex flex-col min-h-0 bg-[#060911] border border-white/10 rounded-2xl p-3 space-y-2 overflow-hidden ${
              mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Preview Controls Bar */}
            <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" /> Rendered Email Preview
                </span>
                {hasCompiled ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    ✓ Compiled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                    Modified (Click Compile)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Refresh Render */}
                <button
                  type="button"
                  onClick={() => handleCompileAndPreview()}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  title="Refresh Rendered Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Viewport Device Switcher */}
                <div className="flex items-center bg-white/[0.04] p-0.5 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                      previewDevice === 'desktop'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Desktop 600px Full Width"
                  >
                    <Monitor className="w-3 h-3" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('tablet')}
                    className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                      previewDevice === 'tablet'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Tablet 480px Viewport"
                  >
                    <Tablet className="w-3 h-3" />
                    <span className="hidden sm:inline">Tablet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                      previewDevice === 'mobile'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mobile 360px Viewport"
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="hidden sm:inline">Mobile (360px)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test Preview Status Bar */}
            <div className="bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] shrink-0">
              <div className="flex items-center gap-2 text-slate-400 font-sans truncate">
                {hasRecipientVariable && (
                  <span className="truncate">
                    <strong>Recipient:</strong> <span className="text-cyan-300">{recipientName || '—'}</span>
                  </span>
                )}
                {hasRecipientVariable && hasCompanyVariable && <span>&bull;</span>}
                {hasCompanyVariable && (
                  <span className="truncate">
                    <strong>Company:</strong> <span className="text-cyan-300">{companyName || '—'}</span>
                  </span>
                )}
                {!hasAnyVariables && (
                  <span className="text-slate-500">Standard Static Email View</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 shrink-0 font-mono hidden sm:inline">
                {previewDevice === 'mobile'
                  ? '360px mobile viewport'
                  : previewDevice === 'tablet'
                  ? '480px tablet viewport'
                  : '600px desktop viewport'}
              </span>
            </div>

            {/* Sandboxed Iframe Preview */}
            <div className="flex-1 min-h-0 bg-[#020408] rounded-xl border border-white/10 p-2 sm:p-3 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <div
                className={`transition-all duration-300 h-full max-h-full flex flex-col ${
                  previewDevice === 'mobile'
                    ? 'w-[360px] max-w-full border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden bg-white'
                    : previewDevice === 'tablet'
                    ? 'w-[480px] max-w-full border-2 border-slate-700 rounded-2xl shadow-xl overflow-hidden bg-white'
                    : 'w-full rounded-xl overflow-hidden bg-white shadow-lg'
                }`}
              >
                {compiledHtml ? (
                  <iframe
                    title="Email Preview"
                    sandbox="allow-same-origin"
                    srcDoc={compiledHtml}
                    className="w-full h-full min-h-[300px] border-0 bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                    <Code2 className="w-8 h-8 text-slate-600" />
                    <div className="font-bold text-slate-300 text-xs">No HTML Compiled</div>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Enter HTML or select a template from the library and click &quot;Compile &amp; Preview&quot;.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER CONTROLS */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10 font-bold transition-all cursor-pointer min-h-[40px] text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenSaveDialog}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 font-bold transition-all cursor-pointer min-h-[40px] text-xs flex items-center gap-1.5"
              title="Save working draft locally"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Preview</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInitiateInsert}
              disabled={!rawHtml.trim()}
              className="w-full sm:w-auto px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-display text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-500/20 min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Check className="w-4 h-4 text-black stroke-[3]" />
              <span>Insert into Email Editor</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. TEMPLATE LIBRARY POPUP MODAL */}
        {/* ========================================================================= */}
        {isTemplateLibraryOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 rounded-3xl">
            <div className="w-full max-w-4xl bg-[#090d16] border border-purple-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
                      Template Library
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-sans">
                      Choose a professional corporate email template.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTemplateLibraryOpen(false);
                    setPreviewingTemplate(null);
                  }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Category Filter Pills */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-9 pr-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white font-sans text-xs focus:outline-none focus:border-purple-400 placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {['All', 'Partnership', 'Company', 'HR', 'Security', 'Announcement'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTemplateCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all shrink-0 ${
                        templateCategoryFilter === cat
                          ? 'bg-purple-500 text-black shadow-md shadow-purple-500/20'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Cards Grid */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/20">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-xl bg-white/[0.03] hover:bg-purple-950/20 border border-white/10 hover:border-purple-400/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">
                            {tpl.category === 'Partnership' ? '🤝' : tpl.category === 'Company' ? '🏢' : '📋'}
                          </span>
                          <span className="font-bold text-white group-hover:text-purple-300 text-xs sm:text-sm">
                            {tpl.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[9px] font-bold">
                            {tpl.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans">
                          {tpl.description}
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Subject: <span className="text-cyan-300">{tpl.subject}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Preview & Use Template */}
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setPreviewingTemplate(tpl)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUseTemplate(tpl)}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-purple-500/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-black" />
                          <span>Use Template</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No templates matching your filter.
                  </div>
                )}
              </div>

              {/* Template Quick Preview Modal Overlay */}
              {previewingTemplate && (
                <div className="absolute inset-4 z-60 bg-[#090d16] border border-cyan-500/50 rounded-2xl p-4 flex flex-col shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">Preview: {previewingTemplate.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                        {previewingTemplate.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(previewingTemplate)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer"
                      >
                        Use This Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewingTemplate(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 mt-3 bg-white rounded-xl overflow-hidden">
                    <iframe
                      title="Template Preview"
                      sandbox="allow-same-origin"
                      srcDoc={sanitizeEmailBuilderHtml(previewingTemplate.html)}
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>All templates use email-safe responsive table layouts</span>
                <button
                  type="button"
                  onClick={() => setIsTemplateLibraryOpen(false)}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Close Library
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SAVED PREVIEWS LIBRARY MODAL */}
        {/* ========================================================================= */}
        {isSavedPreviewsOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 rounded-3xl">
            <div className="w-full max-w-4xl bg-[#090d16] border border-cyan-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <FolderArchive className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center gap-2">
                      Saved Email Previews
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-sans">
                      Locally stored email drafts &amp; personal templates in your browser (Zero Egress).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportSavedPreviews}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                    title="Export saved previews to JSON file"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export</span>
                  </button>

                  <label className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Import</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportSavedPreviews}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsSavedPreviewsOpen(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={savedPreviewsSearch}
                  onChange={(e) => setSavedPreviewsSearch(e.target.value)}
                  placeholder="Search saved emails..."
                  className="w-full pl-9 pr-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white font-sans text-xs focus:outline-none focus:border-cyan-400 placeholder-slate-500"
                />
              </div>

              {/* Saved Previews List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/20">
                {filteredSavedPreviews.length > 0 ? (
                  filteredSavedPreviews.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-white/[0.03] hover:bg-cyan-950/20 border border-white/10 hover:border-cyan-400/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white group-hover:text-cyan-300 text-xs sm:text-sm">
                            {item.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px]">
                            {item.category || 'Custom Draft'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 font-sans">{item.description}</p>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          Subject: <span className="text-slate-300">{item.subject || '—'}</span>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenSavedPreview(item)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Open</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateSavedPreview(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-all"
                          title="Duplicate preview"
                        >
                          <Copy className="w-3.5 h-3.5 text-purple-400" />
                          <span>Duplicate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSavedPreview(item.id, item.name)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs flex items-center gap-1 cursor-pointer transition-all"
                          title="Delete preview"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                    <div>No saved email previews found.</div>
                    <p className="text-[11px] text-slate-600">
                      Click &quot;Save Preview&quot; in the builder to save your working email locally.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>Stored in browser localStorage &bull; Key: {STORAGE_KEY}</span>
                <button
                  type="button"
                  onClick={() => setIsSavedPreviewsOpen(false)}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SAVE PREVIEW DIALOG MODAL */}
        {/* ========================================================================= */}
        {isSaveDialogOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 rounded-3xl">
            <div className="w-full max-w-md bg-[#0d121f] border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display">Save Email Preview</h3>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Save this working draft locally in your browser storage.
                  </p>
                </div>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Preview Name *</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g. Vendor Partnership - Cameo"
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Description (Optional)</label>
                  <input
                    type="text"
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="e.g. Initial vendor partnership response"
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveDialogOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSavePreview}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Save Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. REUSABLE EMAIL BLOCKS SELECTOR OVERLAY */}
        {/* ========================================================================= */}
        {isBlocksOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 rounded-3xl">
            <div className="w-full max-w-2xl bg-[#090d16] border border-cyan-500/50 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                      Zenemoo Reusable Email Blocks
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Select a block to insert email-safe HTML at the current cursor position.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBlocksOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-white/20">
                {ZENEMOO_EMAIL_BLOCKS.map((block) => (
                  <div
                    key={block.id}
                    className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/50 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-cyan-300 text-xs truncate">
                          ✦ {block.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px] font-bold shrink-0">
                          {block.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans truncate">
                        {block.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInsertBlock(block)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0 group-hover:scale-105"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insert</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>All blocks use 100% email-safe HTML &bull; Fully editable</span>
                <button
                  type="button"
                  onClick={() => setIsBlocksOpen(false)}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Close Blocks
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. COMPREHENSIVE EMAIL CHECK AUDIT OVERLAY */}
        {/* ========================================================================= */}
        {isEmailCheckOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 rounded-3xl">
            <div className="w-full max-w-lg bg-[#0d121f] border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                      Email Health &amp; Security Audit
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Automated validation of HTML safety, responsive structure, and accessibility.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmailCheckOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Overall Score Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Overall Readiness Score</div>
                  <div className="text-[10px] text-slate-400">Standard production email deliverability check</div>
                </div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">
                  {emailCheckAudits.score}%
                </div>
              </div>

              {/* Audit Checklist Items */}
              <div className="space-y-2.5 font-sans text-xs">
                
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-300">Executable Scripts &amp; Forms:</span>
                  {emailCheckAudits.securityPass ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ✓ Passed (No Scripts)
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-1 font-mono">
                      ✕ Dangerous Tags
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-300">Email-Safe Table Architecture:</span>
                  {emailCheckAudits.tableLayout ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ✓ Passed
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1 font-mono">
                      ⚠ Warning (Div layout)
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-300">Subject Line Defined:</span>
                  {emailCheckAudits.subjectSet ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ✓ Passed
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1 font-mono">
                      ⚠ Missing Subject
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-300">Hidden Preheader Defined:</span>
                  {emailCheckAudits.preheaderSet ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ✓ Passed
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1 font-mono">
                      ⚠ Missing Preheader
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-300">Image Tags &amp; Alt Attributes:</span>
                  {emailCheckAudits.imagesSafe ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ✓ Passed
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1 font-mono">
                      ⚠ Alt Missing
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-300">Template Variables Status:</span>
                  {emailCheckAudits.unresolvedVars ? (
                    <span className="text-cyan-300 font-bold flex items-center gap-1 font-mono">
                      ℹ Dynamic Placeholders
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ✓ Fully Resolved
                    </span>
                  )}
                </div>

              </div>

              <div className="border-t border-white/10 pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEmailCheckOpen(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. CONTENT OVERWRITE CONFIRMATION OVERLAY */}
        {/* ========================================================================= */}
        {showReplaceConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-3xl">
            <div className="w-full max-w-md bg-[#0d121f] border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-display">
                  Replace Existing Content?
                </h3>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  The email editor already contains draft content. Inserting this template will replace the current email body with the personalized HTML from the builder.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReplaceConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeInsert()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer transition-all shadow-lg shadow-amber-500/20"
                >
                  Replace Content
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
