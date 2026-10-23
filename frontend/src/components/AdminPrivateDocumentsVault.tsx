import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  Lock,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Archive,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Building,
  Briefcase,
  Tag,
  Copy,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileCheck,
  History,
  Sparkles,
  X,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Edit,
  Layers,
  ArrowUpDown,
  Image as ImageIcon,
  File as FileIcon,
} from 'lucide-react';
import { privateDocumentApi } from '../services/api';

// Supported file extensions across PDF, Office, Sheets, and Images
export const ALLOWED_VAULT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
];

export const getVaultFileExtension = (filename?: string): string => {
  if (!filename) return '';
  const idx = filename.lastIndexOf('.');
  return idx !== -1 ? filename.substring(idx).toLowerCase() : '';
};

export const getVaultFileTypeCategory = (
  filename?: string
): 'pdf' | 'word' | 'sheet' | 'image' | 'file' => {
  const ext = getVaultFileExtension(filename);
  if (ext === '.pdf') return 'pdf';
  if (['.doc', '.docx'].includes(ext)) return 'word';
  if (['.xls', '.xlsx', '.csv'].includes(ext)) return 'sheet';
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return 'image';
  return 'file';
};

export const getVaultPreviewLabel = (doc?: PrivateDocItem | null) => {
  if (!doc) return 'Preview';
  const cat = getVaultFileTypeCategory(doc.stored_filename || doc.original_filename);
  if (cat === 'pdf') return 'Preview PDF';
  if (cat === 'image') return 'Preview Image';
  if (cat === 'sheet') return 'Preview Sheet';
  if (cat === 'word') return 'Preview Document';
  return 'Preview File';
};

interface AdminPrivateDocumentsVaultProps {
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export interface PrivateDocItem {
  id: string;
  document_reference: string;
  title: string;
  document_type: string;
  access_classification: string;
  company_name: string;
  company_ref_number?: string;
  project_name?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  effective_date?: string;
  expiry_date?: string;
  signed_date?: string;
  renewal_date?: string;
  nda_type?: string;
  signing_status: string;
  document_status: string;
  current_version: number;
  file_size: number;
  original_filename?: string;
  stored_filename?: string;
  checksum_sha256?: string;
  internal_notes?: string;
  tags?: string[];
  external_reference_url?: string;
  uploader_email: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface DocVersionItem {
  id: string;
  document_id: string;
  version_number: number;
  stored_filename: string;
  original_filename: string;
  file_size: number;
  checksum_sha256?: string;
  drive_file_id: string;
  change_note?: string;
  uploader_email: string;
  created_at: string;
}

export interface DocAuditItem {
  id: string;
  document_id?: string;
  actor_email: string;
  action: string;
  status: string;
  details?: any;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'nda', label: 'Non-Disclosure Agreement (NDA)' },
  { value: 'master_services_agreement', label: 'Master Services Agreement (MSA)' },
  { value: 'statement_of_work', label: 'Statement of Work (SOW)' },
  { value: 'service_contract', label: 'Service Contract' },
  { value: 'data_processing_agreement', label: 'Data Processing Agreement (DPA)' },
  { value: 'vendor_agreement', label: 'Vendor Agreement' },
  { value: 'partnership_agreement', label: 'Partnership Agreement' },
  { value: 'compliance_certificate', label: 'Compliance & Security Certificate' },
  { value: 'other', label: 'Other Confidential Document' },
];

export const AdminPrivateDocumentsVault: React.FC<AdminPrivateDocumentsVaultProps> = ({
  addToast,
  showConfirm,
}) => {
  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    awaitingSignature: 0,
    expiringSoon: 0,
    expired: 0,
    archived: 0,
  });

  // Listing state
  const [documents, setDocuments] = useState<PrivateDocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [isExpiringSoonFilter, setIsExpiringSoonFilter] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Active document in detail/edit/preview
  const [selectedDoc, setSelectedDoc] = useState<PrivateDocItem | null>(null);
  const [selectedDocVersions, setSelectedDocVersions] = useState<DocVersionItem[]>([]);
  const [selectedDocAudits, setSelectedDocAudits] = useState<DocAuditItem[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'versions' | 'audit'>('info');

  // Preview state
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<number | undefined>(undefined);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Upload form state
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formType, setFormType] = useState('nda');
  const [formClassification, setFormClassification] = useState('confidential');
  const [formNdaType, setFormNdaType] = useState('mutual');
  const [formSigningStatus, setFormSigningStatus] = useState('draft');
  const [formProject, setFormProject] = useState('');
  const [formCompanyRef, setFormCompanyRef] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formSignedDate, setFormSignedDate] = useState('');
  const [formRenewalDate, setFormRenewalDate] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);

  // Version upload state
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionChangeNote, setVersionChangeNote] = useState('');
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);

  // Edit metadata form state
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editSigningStatus, setEditSigningStatus] = useState('draft');
  const [editClassification, setEditClassification] = useState('confidential');
  const [editEffectiveDate, setEditEffectiveDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editSignedDate, setEditSignedDate] = useState('');
  const [editRenewalDate, setEditRenewalDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Clipboard copy state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const versionFileInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Load Dashboard Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await privateDocumentApi.getStats();
      if (res.data?.success && res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (_) {}
  }, []);

  // Load Documents List
  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await privateDocumentApi.getDocuments({
        search: searchQuery.trim() || undefined,
        document_type: typeFilter !== 'all' ? typeFilter : undefined,
        document_status: statusFilter !== 'all' ? statusFilter : undefined,
        access_classification: classificationFilter !== 'all' ? classificationFilter : undefined,
        expiring_soon: isExpiringSoonFilter ? true : undefined,
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
      });

      if (res.data?.success) {
        setDocuments(res.data.documents || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err: any) {
      addToast('Error loading documents', err?.response?.data?.message || err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    typeFilter,
    statusFilter,
    classificationFilter,
    isExpiringSoonFilter,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    addToast,
  ]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Copy document reference (strictly reference, never public download links)
  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(refText);
    addToast('Reference Copied', `Document ID ${refText} copied to clipboard.`, 'info');
    setTimeout(() => setCopiedRef(null), 3000);
  };

  // Open Document Details Modal
  const handleOpenDetails = async (doc: PrivateDocItem) => {
    setSelectedDoc(doc);
    setActiveDetailTab('info');
    setIsDetailModalOpen(true);

    try {
      const res = await privateDocumentApi.getDocumentById(doc.id);
      if (res.data?.success) {
        setSelectedDoc(res.data.document);
        setSelectedDocVersions(res.data.versions || []);
        setSelectedDocAudits(res.data.auditLogs || []);
      }
    } catch (err: any) {
      addToast('Note', 'Could not fetch full audit history.', 'warning');
    }
  };

  // Open Edit Metadata Modal
  const handleOpenEdit = (doc: PrivateDocItem) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditCompany(doc.company_name);
    setEditProject(doc.project_name || '');
    setEditStatus(doc.document_status);
    setEditSigningStatus(doc.signing_status);
    setEditClassification(doc.access_classification);
    setEditEffectiveDate(doc.effective_date ? doc.effective_date.split('T')[0] : '');
    setEditExpiryDate(doc.expiry_date ? doc.expiry_date.split('T')[0] : '');
    setEditSignedDate(doc.signed_date ? doc.signed_date.split('T')[0] : '');
    setEditRenewalDate(doc.renewal_date ? doc.renewal_date.split('T')[0] : '');
    setEditNotes(doc.internal_notes || '');
    setEditTags(Array.isArray(doc.tags) ? doc.tags.join(', ') : '');
    setIsEditModalOpen(true);
  };

  // Submit Edit Metadata
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setIsSubmittingEdit(true);
    try {
      const parsedTags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await privateDocumentApi.updateDocument(selectedDoc.id, {
        title: editTitle,
        company_name: editCompany,
        project_name: editProject || null,
        document_status: editStatus,
        signing_status: editSigningStatus,
        access_classification: editClassification,
        effective_date: editEffectiveDate || null,
        expiry_date: editExpiryDate || null,
        signed_date: editSignedDate || null,
        renewal_date: editRenewalDate || null,
        internal_notes: editNotes || null,
        tags: parsedTags,
      });

      if (res.data?.success) {
        addToast('Success', 'Document metadata updated.', 'success');
        setIsEditModalOpen(false);
        loadDocuments();
        loadStats();
      }
    } catch (err: any) {
      addToast('Error', err?.response?.data?.message || 'Update failed', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async (doc: PrivateDocItem, versionNum?: number) => {
    setSelectedDoc(doc);
    setPreviewVersion(versionNum);
    setIsPreviewModalOpen(true);
    setIsLoadingPreview(true);

    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const res = await privateDocumentApi.previewBlob(doc.id, versionNum);
      const rawContentType = res.headers['content-type'];
      const mime = typeof rawContentType === 'string' ? rawContentType : 'application/pdf';
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    } catch (err: any) {
      addToast('Preview Error', 'Could not stream document preview.', 'error');
      setIsPreviewModalOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Close Preview Modal & clean up blob URL
  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  // Handle Download (Server-mediated authenticated stream with live download progress)
  const handleDownload = async (doc: PrivateDocItem, versionNum?: number) => {
    const downloadKey = versionNum ? `${doc.id}_v${versionNum}` : doc.id;
    setDownloadingDocId(downloadKey);
    try {
      addToast(
        'Download Initiated',
        `Streaming securely from vault for ${doc.document_reference}...`,
        'info'
      );
      const res = await privateDocumentApi.downloadBlob(doc.id, versionNum);
      const rawContentType = res.headers['content-type'];
      const mime = typeof rawContentType === 'string' ? rawContentType : 'application/octet-stream';
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.stored_filename || `${doc.document_reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('Download Complete', `${a.download} successfully saved to device.`, 'success');
    } catch (err: any) {
      addToast('Download Error', 'Could not stream document for download.', 'error');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Handle Archive / Unarchive
  const handleToggleArchive = (doc: PrivateDocItem) => {
    const isArchived = doc.document_status === 'archived';
    const actionLabel = isArchived ? 'Restore to Active' : 'Archive Document';
    const promptMsg = isArchived
      ? `Restore document ${doc.document_reference} (${doc.title}) back to active status?`
      : `Archive document ${doc.document_reference} (${doc.title})? It will be safely retained in the vault.`;

    showConfirm(actionLabel, promptMsg, async () => {
      try {
        const res = await privateDocumentApi.archiveDocument(doc.id, isArchived);
        if (res.data?.success) {
          addToast('Success', res.data.message, 'success');
          loadDocuments();
          loadStats();
          if (selectedDoc?.id === doc.id) {
            setSelectedDoc(res.data.document);
          }
        }
      } catch (err: any) {
        addToast('Error', err?.response?.data?.message || 'Archival operation failed', 'error');
      }
    });
  };

  // Handle Delete with strict confirmation
  const handleDelete = (doc: PrivateDocItem) => {
    showConfirm(
      'PERMANENT DELETION WARNING',
      `Are you completely sure you want to permanently delete ${doc.document_reference} ("${doc.title}") and all its version history? This action cannot be reversed.`,
      async () => {
        try {
          const res = await privateDocumentApi.deleteDocument(doc.id);
          if (res.data?.success) {
            addToast('Deleted', res.data.message, 'success');
            loadDocuments();
            loadStats();
            if (isDetailModalOpen && selectedDoc?.id === doc.id) {
              setIsDetailModalOpen(false);
            }
          }
        } catch (err: any) {
          addToast('Deletion Error', err?.response?.data?.message || 'Could not delete document', 'error');
        }
      }
    );
  };

  // Handle File Selection with client-side format & signature inspection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');

    // Extension check
    const ext = getVaultFileExtension(file.name);
    if (!ALLOWED_VAULT_EXTENSIONS.includes(ext)) {
      setFileError(
        'Invalid file type: Supported formats are PDF (.pdf), Word (.doc, .docx), Sheets (.xls, .xlsx, .csv), and Images (.png, .jpg, .jpeg, .webp).'
      );
      setSelectedFile(null);
      return;
    }

    // Size check (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setFileError(`File size exceeds 25 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      setSelectedFile(null);
      return;
    }

    // Client-side magic bytes validation where applicable
    try {
      const slice = file.slice(0, 8);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (ext === '.pdf') {
        const text = new TextDecoder().decode(bytes.slice(0, 5));
        if (text !== '%PDF-') {
          setFileError('File verification failed: The file does not contain a valid PDF binary signature.');
          setSelectedFile(null);
          return;
        }
      } else if (ext === '.png') {
        if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
          setFileError('File verification failed: The file does not contain a valid PNG image header.');
          setSelectedFile(null);
          return;
        }
      } else if (ext === '.jpg' || ext === '.jpeg') {
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
          setFileError('File verification failed: The file does not contain a valid JPEG image header.');
          setSelectedFile(null);
          return;
        }
      }
    } catch (_) {}

    setSelectedFile(file);
    if (!formTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setFormTitle(cleanName);
    }
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Submit Upload Document
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      addToast('Validation', 'Document title is required.', 'warning');
      return;
    }
    if (!formCompany.trim()) {
      addToast('Validation', 'Company / client name is required.', 'warning');
      return;
    }
    if (!selectedFile) {
      addToast('Validation', 'Please select a document file to archive.', 'warning');
      return;
    }

    setIsSubmittingUpload(true);
    try {
      const base64Data = await fileToBase64(selectedFile);
      const parsedTags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await privateDocumentApi.createDocument({
        title: formTitle.trim(),
        company_name: formCompany.trim(),
        document_type: formType,
        access_classification: formClassification,
        nda_type: formType === 'nda' ? formNdaType : undefined,
        signing_status: formSigningStatus,
        project_name: formProject.trim() || undefined,
        company_ref_number: formCompanyRef.trim() || undefined,
        contact_person: formContactPerson.trim() || undefined,
        contact_email: formContactEmail.trim() || undefined,
        contact_phone: formContactPhone.trim() || undefined,
        effective_date: formEffectiveDate || undefined,
        expiry_date: formExpiryDate || undefined,
        signed_date: formSignedDate || undefined,
        renewal_date: formRenewalDate || undefined,
        tags: parsedTags,
        internal_notes: formNotes.trim() || undefined,
        external_reference_url: formExternalUrl.trim() || undefined,
        file_base64: base64Data,
        pdf_base64: base64Data,
        original_filename: selectedFile.name,
      });

      if (res.data?.success) {
        addToast(
          'Vault Saved',
          `Document ${res.data.document.document_reference} successfully archived.`,
          'success'
        );
        setIsUploadModalOpen(false);
        resetUploadForm();
        loadDocuments();
        loadStats();
      }
    } catch (err: any) {
      addToast('Upload Failed', err?.response?.data?.message || err.message, 'error');
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  const resetUploadForm = () => {
    setFormTitle('');
    setFormCompany('');
    setFormType('nda');
    setFormClassification('confidential');
    setFormNdaType('mutual');
    setFormSigningStatus('draft');
    setFormProject('');
    setFormCompanyRef('');
    setFormContactPerson('');
    setFormContactEmail('');
    setFormContactPhone('');
    setFormEffectiveDate('');
    setFormExpiryDate('');
    setFormSignedDate('');
    setFormRenewalDate('');
    setFormTags('');
    setFormNotes('');
    setFormExternalUrl('');
    setSelectedFile(null);
    setFileError('');
  };

  // Open Version Upload Modal
  const handleOpenVersionModal = (doc: PrivateDocItem) => {
    setSelectedDoc(doc);
    setVersionFile(null);
    setVersionChangeNote('');
    setIsVersionModalOpen(true);
  };

  // Submit Version Upload
  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !versionFile) {
      addToast('Validation', 'Please select a document file.', 'warning');
      return;
    }

    const ext = getVaultFileExtension(versionFile.name);
    if (!ALLOWED_VAULT_EXTENSIONS.includes(ext)) {
      addToast(
        'Validation',
        'Invalid file type. Supported: PDF, Word, Excel, Sheets, Images.',
        'warning'
      );
      return;
    }

    setIsSubmittingVersion(true);
    try {
      const base64Data = await fileToBase64(versionFile);
      const res = await privateDocumentApi.uploadVersion(selectedDoc.id, {
        file_base64: base64Data,
        pdf_base64: base64Data,
        original_filename: versionFile.name,
        change_note: versionChangeNote.trim() || undefined,
      });

      if (res.data?.success) {
        addToast(
          'Version Uploaded',
          `New version created for ${selectedDoc.document_reference}.`,
          'success'
        );
        setIsVersionModalOpen(false);
        setVersionFile(null);
        setVersionChangeNote('');
        loadDocuments();
        loadStats();
        if (isDetailModalOpen) {
          handleOpenDetails(selectedDoc);
        }
      }
    } catch (err: any) {
      addToast('Version Upload Failed', err?.response?.data?.message || err.message, 'error');
    } finally {
      setIsSubmittingVersion(false);
    }
  };

  // Metadata Export (CSV or JSON)
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      addToast('Exporting Metadata', `Preparing ${format.toUpperCase()} export...`, 'info');
      const res = await privateDocumentApi.exportMetadata(format);
      const mime = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8';
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zenemoo_Private_Vault_Export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('Export Complete', 'Metadata export downloaded.', 'success');
    } catch (err: any) {
      addToast('Export Error', 'Could not export metadata.', 'error');
    }
  };

  // Format File Size
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
          </span>
        );
      case 'signed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-2.5 h-2.5" /> Signed
          </span>
        );
      case 'awaiting_signature':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1 w-fit">
            <Clock className="w-2.5 h-2.5" /> Awaiting Signature
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 w-fit">
            Draft
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-2.5 h-2.5" /> Expiring Soon
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit">
            Expired
          </span>
        );
      case 'archived':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 w-fit">
            <Archive className="w-2.5 h-2.5" /> Archived
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 w-fit">
            {status}
          </span>
        );
    }
  };

  // Classification Badge
  const renderClassificationBadge = (cls: string) => {
    switch (cls) {
      case 'strictly_confidential':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/40">
            Strictly Confidential
          </span>
        );
      case 'confidential':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
            Confidential
          </span>
        );
      case 'internal_restricted':
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase font-semibold bg-slate-800/60 text-slate-300 border border-slate-700">
            Internal Restricted
          </span>
        );
      default:
        return <span className="text-[10px] text-slate-400">{cls}</span>;
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* 1. VAULT HEADER & HERO SECTION */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0d121f] via-[#090d18] to-[#120f24] border border-cyan-500/20 p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight">
                    Private Documents & NDA Vault
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Enterprise Tier
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Secure, role-governed archive for client agreements, mutual NDAs, and corporate contracts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Export metadata button */}
            <div className="relative group">
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2 transition cursor-pointer"
                title="Export Document Records"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => {
                loadStats();
                loadDocuments();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
              title="Refresh Vault Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Upload Document Primary CTA */}
            <button
              onClick={() => {
                resetUploadForm();
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold font-mono tracking-wide flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Upload Document
            </button>
          </div>
        </div>
      </div>

      {/* 2. DASHBOARD SUMMARY STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="modern-dashboard-card p-4 rounded-xl border border-white/10 bg-[#06080e]/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Vault</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">{stats.total}</span>
          <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">Archived Records</span>
        </div>

        <div className="modern-dashboard-card p-4 rounded-xl border border-white/10 bg-[#06080e]/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Active Agreements</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{stats.active}</span>
          <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 block">In Effect</span>
        </div>

        <div className="modern-dashboard-card p-4 rounded-xl border border-white/10 bg-[#06080e]/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Awaiting Signature</span>
          <span className="text-2xl font-extrabold text-amber-300 mt-1 block">{stats.awaitingSignature}</span>
          <span className="text-[10px] text-amber-400/80 font-mono mt-0.5 block">Pending Client/Zenemoo</span>
        </div>

        <div className="modern-dashboard-card p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <span className="text-[10px] font-mono text-amber-300 uppercase tracking-wider block">Expiring Soon</span>
          <span className="text-2xl font-extrabold text-amber-300 mt-1 block">{stats.expiringSoon}</span>
          <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">Next 30 Days</span>
        </div>

        <div className="modern-dashboard-card p-4 rounded-xl border border-white/10 bg-[#06080e]/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Expired</span>
          <span className="text-2xl font-extrabold text-rose-400 mt-1 block">{stats.expired}</span>
          <span className="text-[10px] text-rose-400/80 font-mono mt-0.5 block">Past Expiry Date</span>
        </div>

        <div className="modern-dashboard-card p-4 rounded-xl border border-white/10 bg-[#06080e]/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Archived</span>
          <span className="text-2xl font-extrabold text-purple-400 mt-1 block">{stats.archived}</span>
          <span className="text-[10px] text-purple-400/80 font-mono mt-0.5 block">Retired Records</span>
        </div>
      </div>

      {/* 3. SEARCH, FILTERS & ACTION BAR */}
      <div className="modern-dashboard-card p-4 rounded-2xl border border-white/10 bg-[#070913]/90 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference (ZEN-NDA-...), title, company, or contact..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Document Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Document Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="awaiting_signature">Awaiting Signature</option>
              <option value="signed">Signed</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* Classification Filter */}
            <select
              value={classificationFilter}
              onChange={(e) => {
                setClassificationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Classifications</option>
              <option value="strictly_confidential">Strictly Confidential</option>
              <option value="confidential">Confidential</option>
              <option value="internal_restricted">Internal Restricted</option>
            </select>

            {/* Expiring Soon Toggle */}
            <button
              onClick={() => {
                setIsExpiringSoonFilter(!isExpiringSoonFilter);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 transition cursor-pointer border ${
                isExpiringSoonFilter
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Expiring in 30d
            </button>
          </div>
        </div>
      </div>

      {/* 4. DOCUMENTS TABLE */}
      <div className="modern-dashboard-card rounded-2xl border border-white/10 bg-[#070913]/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Reference & Title</th>
                <th className="py-3.5 px-4 font-semibold">Company / Engagement</th>
                <th className="py-3.5 px-4 font-semibold">Classification</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Expiry Date</th>
                <th className="py-3.5 px-4 font-semibold">Version</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                    <p className="text-xs font-mono">Decrypting and loading private vault records...</p>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Lock className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-white">No Private Documents Found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                        ? 'No vault records match your active search filters.'
                        : 'Your private document repository is currently empty. Upload your first NDA or agreement to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isExpired =
                    doc.expiry_date && new Date(doc.expiry_date).getTime() < Date.now();
                  const isExpiringSoon =
                    doc.expiry_date &&
                    !isExpired &&
                    new Date(doc.expiry_date).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000;

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(doc)}
                    >
                      {/* Ref & Title */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-cyan-400 tracking-wide">
                              {doc.document_reference}
                            </span>
                            <button
                              onClick={() => handleCopyRef(doc.document_reference)}
                              className="text-slate-500 hover:text-cyan-300 transition"
                              title="Copy Reference Number"
                            >
                              {copiedRef === doc.document_reference ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <p className="font-semibold text-white text-xs truncate max-w-xs md:max-w-md">
                            {doc.title}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            Type: {doc.document_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Company & Project */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-200 block truncate max-w-[180px]">
                            {doc.company_name}
                          </span>
                          {doc.project_name && (
                            <span className="text-[10px] font-mono text-purple-300 block truncate max-w-[180px]">
                              {doc.project_name}
                            </span>
                          )}
                          {doc.contact_person && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                              Attn: {doc.contact_person}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-3.5 px-4">
                        {renderClassificationBadge(doc.access_classification)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{renderStatusBadge(doc.document_status)}</td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4">
                        {doc.expiry_date ? (
                          <div className="space-y-0.5">
                            <span
                              className={`font-mono text-xs block ${
                                isExpired
                                  ? 'text-rose-400 font-bold'
                                  : isExpiringSoon
                                  ? 'text-amber-300 font-bold'
                                  : 'text-slate-300'
                              }`}
                            >
                              {doc.expiry_date.split('T')[0]}
                            </span>
                            {isExpired && (
                              <span className="text-[9px] font-mono text-rose-400 uppercase tracking-wider block">
                                Expired
                              </span>
                            )}
                            {isExpiringSoon && (
                              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider block">
                                Renews Soon
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-600">No Expiry (Perpetual)</span>
                        )}
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-cyan-300">
                          v{doc.current_version}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                          {formatBytes(doc.file_size)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Preview */}
                        <button
                          onClick={() => handleOpenPreview(doc)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-300 border border-white/10 text-slate-400 transition"
                          title={getVaultPreviewLabel(doc)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Download */}
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingDocId === doc.id}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-300 border border-white/10 text-slate-400 transition disabled:opacity-50"
                          title={downloadingDocId === doc.id ? 'Preparing download...' : 'Download Document'}
                        >
                          {downloadingDocId === doc.id ? (
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Upload Version */}
                        <button
                          onClick={() => handleOpenVersionModal(doc)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/10 hover:text-purple-300 border border-white/10 text-slate-400 transition"
                          title="Upload Replacement Version"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Metadata */}
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition"
                          title="Edit Metadata"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Archive Toggle */}
                        <button
                          onClick={() => handleToggleArchive(doc)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/10 hover:text-amber-300 border border-white/10 text-slate-400 transition"
                          title={doc.document_status === 'archived' ? 'Unarchive' : 'Archive'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 text-slate-400 transition"
                          title="Permanently Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="py-3 px-4 border-t border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>
              Showing {documents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} documents
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="ml-2 px-2 py-1 rounded bg-[#0d121f] border border-white/10 text-xs text-slate-300 focus:outline-none"
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Page {currentPage} of {Math.max(1, Math.ceil(totalCount / pageSize))}
            </span>
            <button
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. UPLOAD DOCUMENT MODAL (Phase 3) */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0a0d16] border border-cyan-500/30 shadow-2xl text-slate-200 overflow-hidden">
            {/* Modal Header - Pinned at top */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#070a12] border-b border-white/10 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Secure Document Ingestion
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload and cryptographically archive an agreement into the Private Vault.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Mandatory Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Mandatory Document Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Document Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Master Non-Disclosure Agreement 2026"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  {/* Company / Client Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Company / Counterparty Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Technologies Inc."
                      required
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Document Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Document Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Access Classification */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Access Classification <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formClassification}
                      onChange={(e) => setFormClassification(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="confidential">Confidential (Default)</option>
                      <option value="strictly_confidential">Strictly Confidential (Executive Only)</option>
                      <option value="internal_restricted">Internal Restricted</option>
                    </select>
                  </div>

                  {/* Signing Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Initial Signing Status <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formSigningStatus}
                      onChange={(e) => setFormSigningStatus(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="draft">Draft Agreement</option>
                      <option value="awaiting_signature">Awaiting Signature</option>
                      <option value="signed">Fully Executed / Signed</option>
                    </select>
                  </div>
                </div>

                {/* Specifics for NDA */}
                {formType === 'nda' && (
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-cyan-300">NDA Binding Structure</label>
                      <select
                        value={formNdaType}
                        onChange={(e) => setFormNdaType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0d121f] border border-cyan-500/30 text-xs text-white focus:outline-none"
                      >
                        <option value="mutual">Mutual Non-Disclosure Agreement</option>
                        <option value="one_way_zenemoo">One-Way (Zenemoo Disclosing)</option>
                        <option value="one_way_client">One-Way (Client Disclosing)</option>
                      </select>
                    </div>
                    <div className="flex items-center text-[11px] text-slate-400 font-sans pt-4">
                      <span>Standard mutual confidentiality protections apply to both parties.</span>
                    </div>
                  </div>
                )}

                {/* File Upload Zone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>Document File</span>
                      <span className="text-rose-400">*</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        PDF • Word • Sheets • Images
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Max size: 25 MB</span>
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                      selectedFile
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : fileError
                        ? 'border-rose-500/50 bg-rose-500/5'
                        : 'border-white/15 hover:border-cyan-500/50 bg-white/[0.02]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="space-y-1.5">
                        <FileCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                        <p className="text-xs font-semibold text-white break-all">{selectedFile.name}</p>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                          <span className="text-cyan-400 font-bold uppercase">
                            {getVaultFileTypeCategory(selectedFile.name)}
                          </span>
                          <span>•</span>
                          <span>{formatBytes(selectedFile.size)}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">Integrity Verified</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
                        <p className="text-xs font-semibold text-white">
                          Click or drag and drop document agreement here
                        </p>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap text-[10px] text-slate-400 font-mono pt-1">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">
                            PDF (.pdf)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-blue-300">
                            Word (.doc, .docx)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-300">
                            Excel / CSV (.xlsx, .csv)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-amber-300">
                            Images (.png, .jpg, .webp)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {fileError && (
                    <p className="text-xs text-rose-400 font-mono flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {fileError}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Section */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Optional Metadata & Dates
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Project / Engagement</label>
                    <input
                      type="text"
                      placeholder="e.g. Speech Data Ingestion 2026"
                      value={formProject}
                      onChange={(e) => setFormProject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Company Ref / Reg No.</label>
                    <input
                      type="text"
                      placeholder="e.g. CIN / Tax ID / Ref"
                      value={formCompanyRef}
                      onChange={(e) => setFormCompanyRef(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">External Ref / DocuSign URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formExternalUrl}
                      onChange={(e) => setFormExternalUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={formContactPerson}
                      onChange={(e) => setFormContactPerson(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Contact Email</label>
                    <input
                      type="email"
                      placeholder="jane@partner.com"
                      value={formContactEmail}
                      onChange={(e) => setFormContactEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={formContactPhone}
                      onChange={(e) => setFormContactPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Effective Date</label>
                    <input
                      type="date"
                      value={formEffectiveDate}
                      onChange={(e) => setFormEffectiveDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Expiry Date</label>
                    <input
                      type="date"
                      value={formExpiryDate}
                      onChange={(e) => setFormExpiryDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Signed Date</label>
                    <input
                      type="date"
                      value={formSignedDate}
                      onChange={(e) => setFormSignedDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Renewal Date</label>
                    <input
                      type="date"
                      value={formRenewalDate}
                      onChange={(e) => setFormRenewalDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="nda, tier1, client, legal"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Internal Vault Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Approved by legal counsel on 10/20"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
              </div>

              {/* Modal Footer - Pinned at bottom */}
              <div className="flex items-center justify-end gap-3.5 px-6 py-4 bg-[#070a12] border-t border-white/10 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpload}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold font-mono tracking-wide flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {isSubmittingUpload ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting & Securing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Save to Private Vault
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DOCUMENT DETAIL & VERSION HISTORY MODAL */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0a0d16] border border-white/15 shadow-2xl text-slate-200 overflow-hidden">
            {/* Header & Tabs - Pinned at top */}
            <div className="px-6 py-4.5 bg-[#070a12] border-b border-white/10 shrink-0 z-10">
              <div className="flex items-start justify-between pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {selectedDoc.document_reference}
                    </span>
                    {renderClassificationBadge(selectedDoc.access_classification)}
                    {renderStatusBadge(selectedDoc.document_status)}
                  </div>
                  <h3 className="text-lg font-bold text-white font-display">{selectedDoc.title}</h3>
                  <p className="text-xs text-slate-400">Counterparty: {selectedDoc.company_name}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenPreview(selectedDoc)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> {getVaultPreviewLabel(selectedDoc)}
                  </button>
                  <button
                    onClick={() => handleDownload(selectedDoc)}
                    disabled={downloadingDocId === selectedDoc.id}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                  >
                    {downloadingDocId === selectedDoc.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Preparing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-3 pt-2 text-xs font-mono">
                <button
                  onClick={() => setActiveDetailTab('info')}
                  className={`py-2 px-3 border-b-2 font-semibold transition cursor-pointer ${
                    activeDetailTab === 'info'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Metadata Details
                </button>
                <button
                  onClick={() => setActiveDetailTab('versions')}
                  className={`py-2 px-3 border-b-2 font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'versions'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Version History{' '}
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10">
                  {selectedDocVersions.length || selectedDoc.current_version}
                </span>
              </button>
              <button
                onClick={() => setActiveDetailTab('audit')}
                className={`py-2 px-3 border-b-2 font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeDetailTab === 'audit'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Audit Activity Log
              </button>
            </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 pb-12">
              {/* Tab 1: Info */}
              {activeDetailTab === 'info' && (
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Stored Filename</span>
                    <span className="text-white font-mono break-all text-[11px] mt-0.5 block">
                      {selectedDoc.stored_filename}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">File Size</span>
                    <span className="text-white font-mono text-[11px] mt-0.5 block">
                      {formatBytes(selectedDoc.file_size)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Current Version</span>
                    <span className="text-cyan-400 font-mono text-[11px] mt-0.5 block">
                      v{selectedDoc.current_version}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Archived By</span>
                    <span className="text-slate-300 font-mono text-[11px] mt-0.5 block truncate">
                      {selectedDoc.uploader_email}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Effective Date</span>
                    <span className="text-slate-200 font-mono mt-0.5 block">
                      {selectedDoc.effective_date ? selectedDoc.effective_date.split('T')[0] : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Expiry Date</span>
                    <span className="text-slate-200 font-mono mt-0.5 block">
                      {selectedDoc.expiry_date ? selectedDoc.expiry_date.split('T')[0] : 'Perpetual'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Signed Date</span>
                    <span className="text-slate-200 font-mono mt-0.5 block">
                      {selectedDoc.signed_date ? selectedDoc.signed_date.split('T')[0] : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Renewal Date</span>
                    <span className="text-slate-200 font-mono mt-0.5 block">
                      {selectedDoc.renewal_date ? selectedDoc.renewal_date.split('T')[0] : '—'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-4 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Contact Person</span>
                    <span className="text-slate-200 mt-0.5 block">{selectedDoc.contact_person || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Contact Email</span>
                    <span className="text-slate-200 mt-0.5 block">{selectedDoc.contact_email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Contact Phone</span>
                    <span className="text-slate-200 mt-0.5 block">{selectedDoc.contact_phone || '—'}</span>
                  </div>
                </div>

                {selectedDoc.checksum_sha256 && (
                  <div className="p-3.5 rounded-xl bg-black/50 border border-emerald-500/20 text-[11px] font-mono shadow-inner mb-6">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" /> Cryptographic SHA-256 Checksum
                      </span>
                      <span className="text-[10px] text-emerald-500/80 font-mono">Immutable Hash</span>
                    </div>
                    <span className="text-emerald-400 break-all select-all block font-mono text-[11px] bg-black/40 px-2.5 py-1.5 rounded border border-emerald-500/10">
                      {selectedDoc.checksum_sha256}
                    </span>
                  </div>
                )}

                {selectedDoc.internal_notes && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block mb-1">
                      Internal Legal Notes
                    </span>
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedDoc.internal_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Versions */}
            {activeDetailTab === 'versions' && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Prior versions are preserved immutably. Every upload retains its unique checksum.
                  </p>
                  <button
                    onClick={() => handleOpenVersionModal(selectedDoc)}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload New Version
                  </button>
                </div>

                <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                  {selectedDocVersions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-mono">
                      v1 is currently active. No replacement versions recorded.
                    </div>
                  ) : (
                    selectedDocVersions.map((v) => (
                      <div
                        key={v.id}
                        className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.02] transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Version {v.version_number}
                            </span>
                            {v.version_number === selectedDoc.current_version && (
                              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                                (Current Active)
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 font-mono text-[11px]">{v.stored_filename}</p>
                          {v.change_note && (
                            <p className="text-slate-400 text-xs italic">"{v.change_note}"</p>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono block">
                            Uploaded by {v.uploader_email} on {new Date(v.created_at).toLocaleString()} •{' '}
                            {formatBytes(v.file_size)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenPreview(selectedDoc, v.version_number)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-300 border border-white/10 text-slate-400 transition"
                            title={`Preview v${v.version_number}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownload(selectedDoc, v.version_number)}
                            disabled={downloadingDocId === `${selectedDoc.id}_v${v.version_number}`}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-300 border border-white/10 text-slate-400 transition disabled:opacity-50"
                            title={
                              downloadingDocId === `${selectedDoc.id}_v${v.version_number}`
                                ? 'Preparing download...'
                                : `Download v${v.version_number}`
                            }
                          >
                            {downloadingDocId === `${selectedDoc.id}_v${v.version_number}` ? (
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Audit Activity */}
            {activeDetailTab === 'audit' && (
              <div className="space-y-3 mt-6">
                <p className="text-xs text-slate-400">
                  Immutable audit records tracking access, previews, downloads, and revisions.
                </p>

                <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/30 max-h-96 overflow-y-auto">
                  {selectedDocAudits.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-mono">
                      No audit activity records yet.
                    </div>
                  ) : (
                    selectedDocAudits.map((a) => (
                      <div key={a.id} className="p-3 text-xs flex items-center justify-between gap-4 font-mono">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/5 text-cyan-300 border border-white/10">
                              {a.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-slate-300">{a.actor_email}</span>
                          </div>
                          {a.details && Object.keys(a.details).length > 0 && (
                            <span className="text-[10px] text-slate-500 block mt-0.5 truncate max-w-md">
                              {JSON.stringify(a.details)}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. AUTHENTICATED PREVIEW MODAL (Phase 9) */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-5xl h-[92vh] rounded-2xl bg-[#0a0d16] border border-cyan-500/30 flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between bg-[#06080e] shrink-0">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="truncate">
                  <h4 className="text-xs md:text-sm font-bold text-white font-mono truncate">
                    {selectedDoc.document_reference} — {selectedDoc.title}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    {previewVersion ? `Viewing Version ${previewVersion}` : `Version ${selectedDoc.current_version}`} • Verified In-Memory Streaming Preview
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(selectedDoc, previewVersion)}
                  disabled={
                    downloadingDocId ===
                    (previewVersion ? `${selectedDoc.id}_v${previewVersion}` : selectedDoc.id)
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  {downloadingDocId ===
                  (previewVersion ? `${selectedDoc.id}_v${previewVersion}` : selectedDoc.id) ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Preparing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleClosePreview}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 bg-black/80 flex items-center justify-center relative overflow-auto p-4">
              {isLoadingPreview ? (
                <div className="text-center space-y-3">
                  <RefreshCw className="w-9 h-9 animate-spin text-cyan-400 mx-auto" />
                  <p className="text-xs font-mono text-slate-300">Decrypting & Streaming securely from vault...</p>
                  <p className="text-[10px] font-mono text-slate-500">Checking cryptographic integrity...</p>
                </div>
              ) : previewBlobUrl ? (
                (() => {
                  const cat = getVaultFileTypeCategory(
                    selectedDoc.stored_filename || selectedDoc.original_filename
                  );
                  if (cat === 'image') {
                    return (
                      <div className="max-h-full max-w-full flex items-center justify-center p-2">
                        <img
                          src={previewBlobUrl}
                          alt={selectedDoc.title}
                          className="max-h-[78vh] max-w-full object-contain rounded-xl border border-white/10 shadow-2xl"
                        />
                      </div>
                    );
                  }
                  if (cat === 'pdf') {
                    return (
                      <iframe
                        src={`${previewBlobUrl}#toolbar=0`}
                        title="Document Preview"
                        className="w-full h-full border-0 rounded-b-xl"
                      />
                    );
                  }
                  // Word / Excel / CSV / Other office documents
                  return (
                    <div className="max-w-md w-full p-6 rounded-2xl bg-[#0f1422] border border-cyan-500/20 shadow-2xl text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                        {cat === 'sheet' ? (
                          <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                        ) : (
                          <FileText className="w-8 h-8 text-blue-400" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white font-mono break-all">
                          {selectedDoc.stored_filename || selectedDoc.title}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          Format: {cat.toUpperCase()} • Size: {formatBytes(selectedDoc.file_size)}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 text-left space-y-1">
                        <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Zero-Trust Document Security
                        </p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          To protect confidential business documents, Office spreadsheets and Word agreements are never sent to third-party public cloud converters.
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(selectedDoc, previewVersion)}
                        disabled={
                          downloadingDocId ===
                          (previewVersion ? `${selectedDoc.id}_v${previewVersion}` : selectedDoc.id)
                        }
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-60 transition cursor-pointer"
                      >
                        {downloadingDocId ===
                        (previewVersion ? `${selectedDoc.id}_v${previewVersion}` : selectedDoc.id) ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Preparing Document Download...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download & Open Genuine File</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center p-6 space-y-3 text-slate-400">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs">Document preview could not be streamed from the vault.</p>
                  <button
                    onClick={() => handleDownload(selectedDoc, previewVersion)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono"
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. UPLOAD NEW VERSION MODAL (Phase 9) */}
      {/* ========================================================================= */}
      {isVersionModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-[#0a0d16] border border-purple-500/30 shadow-2xl text-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#070a12] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    Upload Replacement Version
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {selectedDoc.document_reference} (Next: v{selectedDoc.current_version + 1})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVersionSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-purple-300">
                  Notice: Previous versions are permanently retained in history and will not be overwritten.
                </div>

                {/* Version File Picker */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                    <span>New Document File</span>
                    <span className="text-[10px] font-mono text-purple-300">PDF, Word, Excel, Sheets, Images</span>
                  </label>
                  <input
                    ref={versionFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/*"
                    required
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const ext = getVaultFileExtension(f.name);
                      if (ALLOWED_VAULT_EXTENSIONS.includes(ext)) {
                        setVersionFile(f);
                      } else {
                        addToast('Error', 'Unsupported file type. Allowed: PDF, Word, Excel, Sheets, Images.', 'error');
                      }
                    }}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 cursor-pointer"
                  />
                  {versionFile && (
                    <p className="text-[11px] font-mono text-emerald-400 pt-1">
                      Selected: {versionFile.name} ({formatBytes(versionFile.size)})
                    </p>
                  )}
                </div>

                {/* Change Note */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Change Note (Optional)</label>
                  <textarea
                    placeholder="e.g. Countersigned version returned by client counsel."
                    rows={2}
                    value={versionChangeNote}
                    onChange={(e) => setVersionChangeNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-[#070a12] border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVersion || !versionFile}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold font-mono disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingVersion ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting New Version...
                    </>
                  ) : (
                    'Publish New Version'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. EDIT METADATA MODAL */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0a0d16] border border-white/15 shadow-2xl text-slate-200 overflow-hidden">
            {/* Header - Pinned at top */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#070a12] border-b border-white/10 shrink-0 z-10">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-display">
                  Edit Metadata: {selectedDoc.document_reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Document Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Document Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                  >
                    <option value="active">Active</option>
                    <option value="awaiting_signature">Awaiting Signature</option>
                    <option value="signed">Signed</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Signing Status</label>
                  <select
                    value={editSigningStatus}
                    onChange={(e) => setEditSigningStatus(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="awaiting_signature">Awaiting Signature</option>
                    <option value="signed">Signed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Classification</label>
                  <select
                    value={editClassification}
                    onChange={(e) => setEditClassification(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                  >
                    <option value="confidential">Confidential</option>
                    <option value="strictly_confidential">Strictly Confidential</option>
                    <option value="internal_restricted">Internal Restricted</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Effective Date</label>
                  <input
                    type="date"
                    value={editEffectiveDate}
                    onChange={(e) => setEditEffectiveDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#0d121f] border border-white/10 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#0d121f] border border-white/10 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Signed Date</label>
                  <input
                    type="date"
                    value={editSignedDate}
                    onChange={(e) => setEditSignedDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#0d121f] border border-white/10 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Renewal Date</label>
                  <input
                    type="date"
                    value={editRenewalDate}
                    onChange={(e) => setEditRenewalDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#0d121f] border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Internal Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d121f] border border-white/10 text-xs text-white"
                />
              </div>
              </div>

              {/* Edit Modal Footer - Pinned at bottom */}
              <div className="flex items-center justify-end gap-2 px-6 py-3.5 bg-[#070a12] border-t border-white/10 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-400 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold font-mono shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Metadata Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
