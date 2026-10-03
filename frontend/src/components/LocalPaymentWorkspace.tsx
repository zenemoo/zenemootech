import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  QrCode,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Edit,
  Trash2,
  X,
  Upload,
  FileSpreadsheet,
  Download,
  DollarSign,
  TrendingUp,
  Calendar,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Layers,
  ArrowUpDown,
  Lock,
  Copy,
  Share2,
  Database,
  ArrowRight,
  Eye,
  CheckCheck,
  HelpCircle,
  FolderArchive,
  Save,
  RotateCcw,
  Sparkles,
  Link2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  localPaymentDb,
  LocalPaymentRecord,
  LocalPaymentBatch,
  LocalPaymentSummary,
  generateZenemooPaymentId,
  generatePaymentProofLink,
} from '../services/localPaymentDb';
import { paymentWorkerApi } from '../services/paymentWorkerApi';
import {
  validateUpiId,
  generateUpiIntentUrl,
  generateQrDataUrl,
  formatInr,
  getIstCurrentDate,
  getIstCurrentDateTimeString,
} from '../utils/upiQrUtils';
import { ExportModal } from './ExportModal';

interface LocalPaymentWorkspaceProps {
  addToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }
  ) => void;
}

interface ParsedPreviewRow {
  name: string;
  upiId: string;
  email: string;
  amount: number;
  workType: string;
  sourceRowNumber: number;
  isValid: boolean;
  errors: string[];
  originalRowData: Record<string, any>;
}

// ── Standard Accepted Column Aliases ──────────────────────────────────────────
const ALIAS_MAP = {
  name: [
    'name',
    'full name',
    'annotator',
    'annotator name',
    'worker',
    'worker name',
    'contributor',
    'contributor name',
    'talent name',
    'employee name',
    'candidate name',
    'member name',
  ],
  upiId: [
    'upi',
    'upi id',
    'upi id.',
    'upi address',
    'vpa',
    'vpa id',
    'payment upi',
    'worker upi',
    'contributor upi',
    'upi_id',
    'upi_address',
  ],
  email: [
    'email',
    'email id',
    'e mail',
    'email address',
    'worker email',
    'contributor email',
    'talent email',
    'employee email',
    'email_id',
    'mail',
  ],
  amount: [
    'price',
    'amount',
    'payment',
    'payment amount',
    'payout',
    'payout amount',
    'rate',
    'earnings',
    'total',
    'total amount',
    'pay',
    'net amount',
    'paid amount',
    'topay',
    'to pay',
  ],
  workType: [
    'work type',
    'worktype',
    'task type',
    'task',
    'job type',
    'work',
    'category',
    'job',
    'role',
    'activity',
    'work_type',
  ],
};

const SUGGESTED_WORK_TYPES = [
  'Annotator',
  'Reviewer',
  'Transcriber',
  'Verifier',
  'Audio Collector',
  'Data Collector',
  'Transcription',
  'Translation',
  'Annotation',
  'Quality Analyst',
  'Other',
];

const ISSUE_TYPES = [
  'UPI Invalid',
  'Payment Failed',
  'Wrong Amount',
  'Beneficiary Problem',
  'Technical Problem',
  'Other',
];

export const LocalPaymentWorkspace: React.FC<LocalPaymentWorkspaceProps> = ({
  addToast = (title, msg) => console.log(title, msg),
  showConfirm,
}) => {
  // --- Workspace State ---
  const [batches, setBatches] = useState<LocalPaymentBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('All');
  const [records, setRecords] = useState<LocalPaymentRecord[]>([]);
  const [summary, setSummary] = useState<LocalPaymentSummary>({
    totalBatches: 0,
    totalRecords: 0,
    totalAmount: 0,
    totalPaidAmount: 0,
    statusCounts: { Pending: 0, Processing: 0, Paid: 0, Issue: 0, Cancelled: 0 },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // --- Filtering & Pagination State ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'createdAt' | 'paymentDate' | 'amount' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // --- Modals State ---
  const [isAliasInfoModalOpen, setIsAliasInfoModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    nameCol: number | null;
    upiCol: number | null;
    emailCol: number | null;
    amountCol: number | null;
    workTypeCol: number | null;
  }>({
    nameCol: null,
    upiCol: null,
    emailCol: null,
    amountCol: null,
    workTypeCol: null,
  });
  const [batchNameInput, setBatchNameInput] = useState<string>('');
  const [parsedPreviewRows, setParsedPreviewRows] = useState<ParsedPreviewRow[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // --- Single Payment & QR Modal State ---
  const [activePaymentRecord, setActivePaymentRecord] = useState<LocalPaymentRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<'pay' | 'details' | 'confirm'>('pay');

  // Payment Settlement Form State
  const [paymentFormStatus, setPaymentFormStatus] = useState<'Paid' | 'Issue' | 'Pending' | 'Processing' | 'Cancelled'>('Paid');
  const [paymentFormUtr, setPaymentFormUtr] = useState<string>('');
  const [paymentFormDate, setPaymentFormDate] = useState<string>(getIstCurrentDate());
  const [paymentFormWorkType, setPaymentFormWorkType] = useState<string>('');
  const [paymentFormCustomWorkType, setPaymentFormCustomWorkType] = useState<string>('');
  const [paymentFormIssueType, setPaymentFormIssueType] = useState<string>('Payment Failed');
  const [paymentFormIssueNotes, setPaymentFormIssueNotes] = useState<string>('');
  const [isSavingPayment, setIsSavingPayment] = useState<boolean>(false);
  const [isCreatingLinks, setIsCreatingLinks] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // --- Export Modal State ---
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [allExportRecords, setAllExportRecords] = useState<LocalPaymentRecord[]>([]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Batches & Metrics
  const loadWorkspaceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchesList, summaryMetrics] = await Promise.all([
        localPaymentDb.getBatches(),
        localPaymentDb.getLocalSummary(selectedBatchId),
      ]);
      setBatches(batchesList);
      setSummary(summaryMetrics);

      const recordsRes = await localPaymentDb.getPaymentRecords({
        batchId: selectedBatchId,
        search: debouncedSearch,
        status: selectedStatus,
        workType: selectedWorkType,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder,
      });

      setRecords(recordsRes.records);
      setTotalPages(recordsRes.totalPages);
      setTotalCount(recordsRes.total);
    } catch (err: any) {
      console.error('[IndexedDB Load Error]:', err);
      addToast('IndexedDB Error', 'Could not load local payment data: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBatchId, debouncedSearch, selectedStatus, selectedWorkType, currentPage, pageSize, sortBy, sortOrder, addToast]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Unique work types in current batch / workspace
  const uniqueWorkTypes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.workType) set.add(r.workType);
    });
    return Array.from(set);
  }, [records]);

  // --- NORMALIZATION HELPER ---
  const normalizeHeader = (raw: string): string => {
    return raw
      .toLowerCase()
      .trim()
      .replace(/[\._\-]/g, ' ')
      .replace(/\s+/g, ' ');
  };

  // --- COLUMN AUTO-DETECTOR ---
  const autoDetectColumns = (headers: string[]) => {
    let nameCol: number | null = null;
    let upiCol: number | null = null;
    let emailCol: number | null = null;
    let amountCol: number | null = null;
    let workTypeCol: number | null = null;

    headers.forEach((h, idx) => {
      const norm = normalizeHeader(h || '');

      if (nameCol === null && ALIAS_MAP.name.includes(norm)) {
        nameCol = idx;
      }
      if (upiCol === null && ALIAS_MAP.upiId.includes(norm)) {
        upiCol = idx;
      }
      if (emailCol === null && ALIAS_MAP.email.includes(norm)) {
        emailCol = idx;
      }
      if (amountCol === null && ALIAS_MAP.amount.includes(norm)) {
        amountCol = idx;
      }
      if (workTypeCol === null && ALIAS_MAP.workType.includes(norm)) {
        workTypeCol = idx;
      }
    });

    return { nameCol, upiCol, emailCol, amountCol, workTypeCol };
  };

  // --- CSV TEXT PARSER (RFC-4180 COMPLIANT) ---
  const parseCsvText = (text: string): string[][] => {
    const cleanText = text.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (insideQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            insideQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\r') {
          if (nextChar === '\n') i++;
          currentRow.push(currentField.trim());
          currentField = '';
          if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
          currentRow = [];
        } else if (char === '\n') {
          currentRow.push(currentField.trim());
          currentField = '';
          if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
          currentRow = [];
        } else {
          currentField += char;
        }
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
    }

    return rows;
  };

  // --- FILE PARSE & DETECT ---
  const handleFileSelected = async (file: File) => {
    setUploadedFile(file);
    setIsParsing(true);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setBatchNameInput(baseName || `Payout Batch ${new Date().toLocaleDateString()}`);

    try {
      let headers: string[] = [];
      let rowsData: string[][] = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const csvRows = parseCsvText(text);
        if (csvRows.length < 2) {
          throw new Error('CSV file must have a header row and at least one data row.');
        }
        headers = csvRows[0];
        rowsData = csvRows.slice(1);
      } else {
        // Excel (.xlsx, .xls)
        const { default: ExcelJS } = await import('exceljs');
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('Excel file contains no readable worksheets.');
        }

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber - 1] = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
        });

        for (let r = 2; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!row || row.cellCount === 0) continue;
          const rowArr: string[] = [];
          for (let c = 1; c <= headers.length; c++) {
            const val = row.getCell(c).value;
            rowArr.push(val !== null && val !== undefined ? String(val) : '');
          }
          if (rowArr.some((f) => f.trim().length > 0)) {
            rowsData.push(rowArr);
          }
        }
      }

      setRawHeaders(headers);
      setRawRows(rowsData);

      const detected = autoDetectColumns(headers);
      setColumnMapping(detected);

      // Check if all primary columns were detected with confidence
      const hasMissingPrimary =
        detected.nameCol === null ||
        detected.upiCol === null ||
        detected.amountCol === null;

      if (hasMissingPrimary) {
        // Direct to mapping screen for manual assignment
        setUploadStep('mapping');
        addToast(
          'Column Mapping Needed',
          'Some required columns could not be identified automatically. Please review the mappings.',
          'info'
        );
      } else {
        // Build preview directly
        buildPreviewRows(headers, rowsData, detected);
        setUploadStep('preview');
      }
    } catch (err: any) {
      console.error('[File Ingest Error]:', err);
      addToast('File Error', err.message || 'Could not parse spreadsheet file.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // --- BUILD PREVIEW ROWS FROM MAPPING ---
  const buildPreviewRows = (
    headers: string[],
    dataRows: string[][],
    mapping: {
      nameCol: number | null;
      upiCol: number | null;
      emailCol: number | null;
      amountCol: number | null;
      workTypeCol: number | null;
    }
  ) => {
    const previewList: ParsedPreviewRow[] = dataRows.map((row, idx) => {
      const rawName = mapping.nameCol !== null && row[mapping.nameCol] ? row[mapping.nameCol].trim() : '';
      const rawUpi = mapping.upiCol !== null && row[mapping.upiCol] ? row[mapping.upiCol].trim() : '';
      const rawEmail = mapping.emailCol !== null && row[mapping.emailCol] ? row[mapping.emailCol].trim() : '';
      const rawAmountStr = mapping.amountCol !== null && row[mapping.amountCol] ? row[mapping.amountCol].trim() : '';
      const rawWorkType = mapping.workTypeCol !== null && row[mapping.workTypeCol] ? row[mapping.workTypeCol].trim() : '';

      // Clean amount: strip ₹, $, INR, commas
      const cleanAmtStr = rawAmountStr.replace(/[₹$]|inr/gi, '').replace(/,/g, '').trim();
      const numAmount = Number(cleanAmtStr);

      const errors: string[] = [];

      // Validate Name
      if (!rawName) errors.push('Name is missing');

      // Validate UPI ID
      const upiValidation = validateUpiId(rawUpi);
      if (!upiValidation.isValid) {
        errors.push(upiValidation.error || 'Invalid UPI ID');
      }

      // Validate Amount
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.push('Amount must be greater than ₹0');
      }

      // Validate Email (optional format check if provided)
      if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        errors.push('Malformed email address');
      }

      // Preserve all original source columns in a dictionary
      const originalRowData: Record<string, any> = {};
      headers.forEach((h, hIdx) => {
        if (h && h.trim()) {
          originalRowData[h.trim()] = row[hIdx] ?? '';
        }
      });

      return {
        name: rawName,
        upiId: upiValidation.cleanUpi || rawUpi,
        email: rawEmail.toLowerCase(),
        amount: isNaN(numAmount) ? 0 : numAmount,
        workType: rawWorkType || 'Annotator',
        sourceRowNumber: idx + 2,
        isValid: errors.length === 0,
        errors,
        originalRowData,
      };
    });

    setParsedPreviewRows(previewList);
  };

  const handleUpdatePreviewCell = (
    index: number,
    field: 'name' | 'upiId' | 'email' | 'amount' | 'workType',
    value: string
  ) => {
    setParsedPreviewRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'amount') {
        const cleanVal = value.replace(/[₹$]|inr/gi, '').replace(/,/g, '').trim();
        target.amount = Number(cleanVal) || 0;
      } else {
        (target as any)[field] = value;
      }

      // Re-validate
      const errors: string[] = [];
      if (!target.name.trim()) errors.push('Name is missing');
      const upiRes = validateUpiId(target.upiId);
      if (!upiRes.isValid) errors.push(upiRes.error || 'Invalid UPI ID');
      if (target.amount <= 0) errors.push('Amount must be greater than ₹0');
      if (target.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.email.trim())) {
        errors.push('Malformed email address');
      }

      target.isValid = errors.length === 0;
      target.errors = errors;
      updated[index] = target;
      return updated;
    });
  };

  const handleDeletePreviewRow = (index: number) => {
    setParsedPreviewRows((prev) => prev.filter((_, i) => i !== index));
  };

  // --- SAVE BATCH TO INDEXEDDB ---
  const handleConfirmSaveBatch = async () => {
    const validRows = parsedPreviewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      addToast('No Valid Records', 'Please correct the highlighted errors before saving.', 'warning');
      return;
    }

    setIsSavingBatch(true);
    try {
      const batchTitle = batchNameInput.trim() || `Payout Batch ${new Date().toLocaleDateString()}`;
      const sourceFile = uploadedFile?.name || 'spreadsheet_upload.csv';
      const now = new Date().toISOString();

      const recordsToInsert = validRows.map((r) => ({
        name: r.name.trim(),
        upiId: r.upiId.trim().toLowerCase(),
        email: r.email.trim().toLowerCase(),
        amount: r.amount,
        currency: 'INR',
        workType: r.workType.trim() || 'Annotator',
        status: 'Pending' as const,
        utr: null,
        paymentDate: null,
        issueType: null,
        issueNotes: null,
        sourceFileName: sourceFile,
        sourceRowNumber: r.sourceRowNumber,
        originalRowData: r.originalRowData,
      }));

      const res = await localPaymentDb.createBatch(
        {
          name: batchTitle,
          sourceFileName: sourceFile,
          uploadDate: now,
        },
        recordsToInsert
      );

      addToast(
        'Batch Created Locally',
        `Successfully saved batch "${res.batch.name}" with ${res.recordsCount} worker payments to IndexedDB.`,
        'success'
      );

      setIsUploadModalOpen(false);
      setUploadStep('upload');
      setUploadedFile(null);
      setParsedPreviewRows([]);
      setSelectedBatchId(res.batch.id);
      loadWorkspaceData();
    } catch (err: any) {
      console.error('[IndexedDB Save Error]:', err);
      addToast('Save Failed', err.message || 'Could not save batch to IndexedDB', 'error');
    } finally {
      setIsSavingBatch(false);
    }
  };

  // --- OPEN PAYMENT MODAL & GENERATE LOCAL QR ---
  const handleOpenPaymentModal = async (record: LocalPaymentRecord) => {
    setActivePaymentRecord(record);
    setPaymentFormStatus(record.status || 'Pending');
    setPaymentFormUtr(record.utr || '');
    setPaymentFormDate(record.paymentDate || getIstCurrentDate());
    setPaymentFormWorkType(record.workType || 'Annotator');
    setPaymentFormCustomWorkType(
      SUGGESTED_WORK_TYPES.includes(record.workType) ? '' : record.workType || ''
    );
    setPaymentFormIssueType(record.issueType || 'Payment Failed');
    setPaymentFormIssueNotes(record.issueNotes || '');
    setPaymentStep('pay');
    setIsPaymentModalOpen(true);
    setIsGeneratingQr(true);

    try {
      const upiUrl = generateUpiIntentUrl({
        upiId: record.upiId,
        payeeName: record.name,
        amount: record.amount,
        note: `Zenemoo Payout - ${record.workType || 'Work'}`,
      });

      const qrData = await generateQrDataUrl(upiUrl);
      setQrCodeDataUrl(qrData);
    } catch (err: any) {
      console.error('[QR Gen Error]:', err);
      addToast('QR Error', 'Could not generate QR: ' + err.message, 'error');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    addToast('Copied', `Copied ${fieldName} to clipboard`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Download QR helper
  const handleDownloadQr = () => {
    if (!qrCodeDataUrl || !activePaymentRecord) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    const cleanName = activePaymentRecord.name.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Zenemoo_QR_${cleanName}_₹${activePaymentRecord.amount}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('QR Downloaded', 'Saved QR Code image locally.', 'success');
  };

  // --- SAVE PAYMENT SETTLEMENT TO INDEXEDDB ---
  const handleSavePaymentSettlement = async () => {
    if (!activePaymentRecord) return;

    if (paymentFormStatus === 'Paid' && !paymentFormUtr.trim()) {
      addToast('UTR Required', 'Please enter the Transaction ID / UTR before marking as Paid.', 'warning');
      return;
    }

    setIsSavingPayment(true);
    try {
      const finalWorkType =
        paymentFormWorkType === 'Other' && paymentFormCustomWorkType.trim()
          ? paymentFormCustomWorkType.trim()
          : paymentFormWorkType || activePaymentRecord.workType;

      // Ensure permanent Zenemoo Payment ID and public proof link exist
      let zPaymentId = activePaymentRecord.zenemooPaymentId;
      let proofLink = activePaymentRecord.proofLink;
      if (!zPaymentId) {
        zPaymentId = generateZenemooPaymentId();
        proofLink = generatePaymentProofLink(zPaymentId);
      }

      // Exact payment date: only assign upon marking Paid if not already set, or preserve manually confirmed date
      const recordedPaymentDate =
        paymentFormStatus === 'Paid'
          ? (paymentFormDate || activePaymentRecord.paymentDate || getIstCurrentDate())
          : activePaymentRecord.paymentDate;

      const updates: Partial<LocalPaymentRecord> = {
        status: paymentFormStatus,
        workType: finalWorkType,
        utr: paymentFormStatus === 'Paid' ? paymentFormUtr.trim() : activePaymentRecord.utr,
        paymentDate: recordedPaymentDate,
        issueType: paymentFormStatus === 'Issue' ? paymentFormIssueType : null,
        issueNotes: paymentFormStatus === 'Issue' ? paymentFormIssueNotes.trim() : null,
        zenemooPaymentId: zPaymentId,
        proofLink: proofLink,
      };

      const updated = await localPaymentDb.updatePaymentRecord(activePaymentRecord.id, updates);
      setActivePaymentRecord(updated);

      // Publish safe public receipt record to Cloudflare D1 for public shareable access
      if (updated.zenemooPaymentId) {
        try {
          await paymentWorkerApi.publishPublicReceipts([
            {
              zenemooPaymentId: updated.zenemooPaymentId,
              status: updated.status,
              name: updated.name,
              upiId: updated.upiId,
              amount: updated.amount,
              currency: updated.currency || 'INR',
              workType: updated.workType,
              utr: updated.utr,
              paymentDate: updated.paymentDate,
              batchId: updated.batchId,
            },
          ]);
        } catch (pubErr) {
          console.warn('[Publish Public Receipt Warning]:', pubErr);
        }
      }

      addToast(
        'Payment Updated',
        `Payment for ${updated.name} (₹${updated.amount}) marked as "${updated.status}" in IndexedDB.`,
        'success'
      );

      loadWorkspaceData();
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      console.error('[Update Record Error]:', err);
      addToast('Update Failed', err.message || 'Could not update payment record', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // --- CREATE ALL LINKS HANDLER ---
  const handleCreateAllLinks = async () => {
    setIsCreatingLinks(true);
    try {
      const activeBatch = selectedBatchId !== 'All' ? selectedBatchId : undefined;
      const res = await localPaymentDb.createAllPaymentLinks(activeBatch);

      // Publish all payment records with Zenemoo IDs to Cloudflare D1
      try {
        const allRecords = await localPaymentDb.getAllPaymentRecords(activeBatch);
        const publishPayload = allRecords
          .filter((r) => r.zenemooPaymentId)
          .map((r) => ({
            zenemooPaymentId: r.zenemooPaymentId!,
            status: r.status,
            name: r.name,
            upiId: r.upiId,
            amount: r.amount,
            currency: r.currency || 'INR',
            workType: r.workType,
            utr: r.utr,
            paymentDate: r.paymentDate,
            batchId: r.batchId,
          }));

        if (publishPayload.length > 0) {
          await paymentWorkerApi.publishPublicReceipts(publishPayload);
        }
      } catch (pubErr) {
        console.warn('[Publish All Receipts Warning]:', pubErr);
      }

      if (res.createdCount === 0) {
        addToast(
          'Payment Links Up-to-Date',
          `${res.alreadyExistingCount} payment links already exist. 0 new links created.`,
          'info'
        );
      } else {
        addToast(
          'Payment Links Created',
          `Created ${res.createdCount} of ${res.totalCount} payment links. ${res.totalCount} payment links ready.`,
          'success'
        );
      }

      loadWorkspaceData();
    } catch (err: any) {
      console.error('[Create All Links Error]:', err);
      addToast('Error Creating Links', err.message || 'Failed to generate payment links', 'error');
    } finally {
      setIsCreatingLinks(false);
    }
  };

  // --- SHARE RECEIPT LINK HELPER ---
  const handleShareLink = async (record: LocalPaymentRecord) => {
    const url = record.proofLink || (record.zenemooPaymentId ? generatePaymentProofLink(record.zenemooPaymentId) : '');
    if (!url) {
      addToast('No Link Available', 'Please click "Create All Links" first.', 'warning');
      return;
    }

    const shareData = {
      title: 'Zenemoo Payment Receipt',
      text: `Zenemoo payment receipt for ${record.name}`,
      url: url,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        addToast('Receipt Shared', 'Payment link shared successfully.', 'success');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[Web Share API Error]:', err);
        }
      }
    }

    // Fallback: Copy link
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      addToast('Link Copied', 'Payment receipt link copied to clipboard.', 'success');
    }
  };

  // Delete batch handler
  const handleDeleteBatch = (batch: LocalPaymentBatch) => {
    const doDelete = async () => {
      try {
        await localPaymentDb.deleteBatch(batch.id);
        addToast('Batch Deleted', `Deleted "${batch.name}" and all associated payment records from IndexedDB.`, 'info');
        setSelectedBatchId('All');
        loadWorkspaceData();
      } catch (err: any) {
        addToast('Delete Failed', err.message, 'error');
      }
    };

    if (showConfirm) {
      showConfirm(
        'Delete Local Batch',
        `Are you sure you want to permanently delete "${batch.name}" (${batch.totalWorkers} workers)? This local action cannot be undone.`,
        doDelete,
        { confirmText: 'Delete Batch', intent: 'danger' }
      );
    } else {
      if (window.confirm(`Delete batch "${batch.name}"?`)) doDelete();
    }
  };

  // Single Record Delete
  const handleDeleteRecord = (record: LocalPaymentRecord) => {
    const doDelete = async () => {
      try {
        await localPaymentDb.deletePaymentRecord(record.id);
        addToast('Record Deleted', `Removed record for ${record.name} from IndexedDB.`, 'info');
        loadWorkspaceData();
      } catch (err: any) {
        addToast('Delete Failed', err.message, 'error');
      }
    };

    if (showConfirm) {
      showConfirm(
        'Delete Record',
        `Remove payment record for "${record.name}" (₹${record.amount})?`,
        doDelete,
        { confirmText: 'Delete', intent: 'danger' }
      );
    } else {
      if (window.confirm(`Delete payment record for ${record.name}?`)) doDelete();
    }
  };

  // --- BACKUP EXPORT & RESTORE ---
  const handleExportBackup = async () => {
    try {
      const backup = await localPaymentDb.exportLocalBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      a.href = url;
      a.download = `zenemoo-payment-backup-${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Backup Created', `Exported ${backup.batches.length} batches and ${backup.records.length} records.`, 'success');
    } catch (err: any) {
      addToast('Backup Failed', err.message, 'error');
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await localPaymentDb.restoreLocalBackup(parsed);
      addToast('Backup Restored', `Restored ${res.batchesCount} batches and ${res.recordsCount} payment records to IndexedDB!`, 'success');
      loadWorkspaceData();
    } catch (err: any) {
      console.error('[Restore Error]:', err);
      addToast('Restore Failed', 'Invalid backup format or corrupt file: ' + err.message, 'error');
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  // Export Modal trigger
  const handleOpenExportModal = async () => {
    try {
      const exportList = await localPaymentDb.getAllPaymentRecordsForExport(
        selectedBatchId !== 'All' ? selectedBatchId : undefined
      );
      setAllExportRecords(exportList);
      setIsExportModalOpen(true);
    } catch (err: any) {
      addToast('Export Error', err.message, 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case 'Issue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Issue
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <X className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Alert / Local Workspace Notice ── */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/70 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                QR Payout & Local Payment Workspace
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Persistent IndexedDB
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Upload spreadsheets, auto-extract UPI IDs, generate instant UPI QR codes, pay via Google Pay/PhonePe, record UTRs, and track settlement statuses. All records survive page refresh, logout, and browser restarts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          <button
            onClick={() => setIsAliasInfoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm"
            title="View supported spreadsheet header aliases"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Supported Headers</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm"
            title="Download full JSON backup of local payment workspace"
          >
            <FolderArchive className="w-4 h-4 text-amber-400" />
            <span>Backup JSON</span>
          </button>

          <button
            onClick={() => backupInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm"
            title="Restore workspace from JSON backup"
          >
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <span>Restore</span>
          </button>
          <input
            type="file"
            ref={backupInputRef}
            accept=".json"
            onChange={handleRestoreBackupFile}
            className="hidden"
          />

          <button
            onClick={handleCreateAllLinks}
            disabled={isCreatingLinks || summary.totalRecords === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
            title="Generate unique public Zenemoo payment receipt links for all records"
          >
            {isCreatingLinks ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Link2 className="w-4 h-4 text-white" />
            )}
            <span>{isCreatingLinks ? 'Creating Links...' : 'Create All Links'}</span>
          </button>

          <button
            onClick={handleOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition-all shadow-sm"
            title="Export payments table to CSV / Excel / PDF"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Table</span>
          </button>

          <button
            onClick={() => {
              setUploadStep('upload');
              setUploadedFile(null);
              setParsedPreviewRows([]);
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Import Payout Sheet</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Batches</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {summary.totalBatches}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">In IndexedDB</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Workers</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {summary.totalRecords.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Payment intents</p>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400/80 text-xs font-medium">
            <span>Total Amount</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">
            {formatInr(summary.totalAmount)}
          </p>
          <p className="text-[11px] text-emerald-500/70 mt-0.5">
            Paid: {formatInr(summary.totalPaidAmount)}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400/80 text-xs font-medium">
            <span>Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">
            {summary.statusCounts.Paid}
          </p>
          <p className="text-[11px] text-emerald-500/70 mt-0.5">UTR confirmed</p>
        </div>

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-amber-400/80 text-xs font-medium">
            <span>Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2 tracking-tight">
            {summary.statusCounts.Pending}
          </p>
          <p className="text-[11px] text-amber-500/70 mt-0.5">Awaiting QR pay</p>
        </div>

        <div className="bg-slate-900/60 border border-rose-500/20 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-rose-400/80 text-xs font-medium">
            <span>Issues</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-2 tracking-tight">
            {summary.statusCounts.Issue}
          </p>
          <p className="text-[11px] text-rose-500/70 mt-0.5">Need attention</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cancelled</span>
            <X className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-300 mt-2 tracking-tight">
            {summary.statusCounts.Cancelled}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Voided payouts</p>
        </div>
      </div>

      {/* ── Batch Selector & Search Controls ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Batch Selector */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-slate-400">Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              <option value="All" className="bg-slate-900 text-white">All Batches ({batches.length})</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.name} ({b.totalWorkers} workers - ₹{b.totalAmount.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
            {selectedBatchId !== 'All' && (
              <button
                onClick={() => {
                  const b = batches.find((x) => x.id === selectedBatchId);
                  if (b) handleDeleteBatch(b);
                }}
                className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded"
                title="Delete this batch and its records"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Name, UPI, Email, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-white">All Statuses</option>
              <option value="Pending" className="bg-slate-900 text-white">Pending</option>
              <option value="Paid" className="bg-slate-900 text-white">Paid</option>
              <option value="Processing" className="bg-slate-900 text-white">Processing</option>
              <option value="Issue" className="bg-slate-900 text-white">Issue</option>
              <option value="Cancelled" className="bg-slate-900 text-white">Cancelled</option>
            </select>
          </div>

          {/* Work Type Filter */}
          {uniqueWorkTypes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <span className="text-xs text-slate-400">Work:</span>
              <select
                value={selectedWorkType}
                onChange={(e) => {
                  setSelectedWorkType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="All" className="bg-slate-900 text-white">All Roles</option>
                {uniqueWorkTypes.map((wt) => (
                  <option key={wt} value={wt} className="bg-slate-900 text-white">
                    {wt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                setSortBy(sb as any);
                setSortOrder(so as any);
              }}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="createdAt:DESC" className="bg-slate-900 text-white">Newest First</option>
              <option value="createdAt:ASC" className="bg-slate-900 text-white">Oldest First</option>
              <option value="amount:DESC" className="bg-slate-900 text-white">Amount (High to Low)</option>
              <option value="amount:ASC" className="bg-slate-900 text-white">Amount (Low to High)</option>
              <option value="name:ASC" className="bg-slate-900 text-white">Name (A-Z)</option>
            </select>
          </div>

          {/* Page size */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
            <span className="text-xs text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-slate-900 text-white">10</option>
              <option value={25} className="bg-slate-900 text-white">25</option>
              <option value={50} className="bg-slate-900 text-white">50</option>
            </select>
          </div>
          {/* Create All Links prominent button */}
          <button
            onClick={handleCreateAllLinks}
            disabled={isCreatingLinks || summary.totalRecords === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
            title="Generate permanent Zenemoo Payment IDs and public receipt links"
          >
            {isCreatingLinks ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Link2 className="w-3.5 h-3.5 text-white" />
            )}
            <span>{isCreatingLinks ? 'Creating Links...' : 'Create All Links'}</span>
          </button>
        </div>
      </div>

      {/* ── Payments Records Table ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[68vh] min-h-[300px] relative">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400 shadow-sm">
              <tr>
                <th className="py-3.5 px-4 w-12">#</th>
                <th className="py-3.5 px-4">Worker / Payee</th>
                <th className="py-3.5 px-4">UPI ID (VPA)</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Work Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Transaction / UTR</th>
                <th className="py-3.5 px-4">Payment Date</th>
                <th className="py-3.5 px-4">Payment Link</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
                    <p className="text-sm">Loading local payment records from IndexedDB...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <QrCode className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-semibold text-white">No Local Payment Records Found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {searchQuery || selectedStatus !== 'All' || selectedWorkType !== 'All'
                        ? 'No payment records match your active search filters.'
                        : 'Upload a CSV or Excel sheet containing worker names, UPI IDs, and amounts to start generating payout QR codes.'}
                    </p>
                    <button
                      onClick={() => {
                        setUploadStep('upload');
                        setUploadedFile(null);
                        setParsedPreviewRows([]);
                        setIsUploadModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Import Your First Sheet
                    </button>
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{r.name}</div>
                      {r.email && (
                        <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[200px]" title={r.email}>
                          {r.email}
                        </div>
                      )}
                      {r.sourceFileName && (
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]" title={r.sourceFileName}>
                          File: {r.sourceFileName}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-cyan-300 font-medium">
                        <span>{r.upiId}</span>
                        <button
                          onClick={() => handleCopyText(r.upiId, `UPI (${r.upiId})`)}
                          className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded transition-all"
                          title="Copy UPI ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap text-base">
                      {formatInr(r.amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {r.workType || 'Annotator'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                      {r.status === 'Issue' && r.issueType && (
                        <div className="text-[10px] text-rose-400 mt-1 font-medium truncate max-w-[140px]" title={r.issueNotes || r.issueType}>
                          {r.issueType}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                      {r.utr ? (
                        <span className="font-semibold text-emerald-300">{r.utr}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.paymentDate || '-'}</span>
                      </div>
                    </td>

                    {/* Payment Link Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      {r.zenemooPaymentId ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                              {r.zenemooPaymentId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <a
                              href={`/payment/${r.zenemooPaymentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
                              title="Open public payment receipt in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </a>
                            <span className="text-slate-600">|</span>
                            <button
                              onClick={() => {
                                const url = r.proofLink || generatePaymentProofLink(r.zenemooPaymentId!);
                                navigator.clipboard.writeText(url);
                                addToast('Copied', 'Payment link copied to clipboard', 'info');
                              }}
                              className="inline-flex items-center gap-0.5 text-slate-300 hover:text-white font-medium"
                              title="Copy receipt link"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              onClick={() => handleShareLink(r)}
                              className="inline-flex items-center gap-0.5 text-slate-300 hover:text-white font-medium"
                              title="Share receipt via WhatsApp / SMS / Telegram / etc."
                            >
                              <Share2 className="w-3 h-3" />
                              Share
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Not created</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPaymentModal(r)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
                          title="Open UPI QR & Settle Payment"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay / Show QR</span>
                        </button>

                        <button
                          onClick={() => handleDeleteRecord(r)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && records.length > 0 && (
          <div className="bg-white/[0.02] border-t border-white/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-white">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-white">{totalCount}</span> local records
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40 transition-all font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40 transition-all font-medium"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: SUPPORTED ALIASES INFO MODAL ── */}
      <AnimatePresence>
        {isAliasInfoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Supported Column Header Aliases</h2>
                    <p className="text-xs text-slate-400">
                      The system automatically detects, sanitizes, and normalizes these header variations:
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAliasInfoModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    1. Name (Worker / Payee)
                  </div>
                  <p className="text-slate-400 pl-4">
                    {ALIAS_MAP.name.map((a) => `"${a}"`).join(', ')}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    2. UPI ID (Virtual Payment Address)
                  </div>
                  <p className="text-slate-400 pl-4">
                    {ALIAS_MAP.upiId.map((a) => `"${a}"`).join(', ')}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    3. Email
                  </div>
                  <p className="text-slate-400 pl-4">
                    {ALIAS_MAP.email.map((a) => `"${a}"`).join(', ')}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    4. Price / Amount (₹)
                  </div>
                  <p className="text-slate-400 pl-4">
                    {ALIAS_MAP.amount.map((a) => `"${a}"`).join(', ')}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    5. Work Type / Task
                  </div>
                  <p className="text-slate-400 pl-4">
                    {ALIAS_MAP.workType.map((a) => `"${a}"`).join(', ')}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/90 px-6 py-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setIsAliasInfoModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Close Reference
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: SHEET UPLOAD, MAPPING & PREVIEW MODAL ── */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {uploadStep === 'upload' && 'Import Payout Sheet (CSV / Excel)'}
                      {uploadStep === 'mapping' && 'Verify & Map Spreadsheet Columns'}
                      {uploadStep === 'preview' && 'Review & Edit Payout Preview'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Extracts Name, UPI ID, Email, Amount, and Work Type for local QR processing.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {uploadStep === 'upload' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Batch Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Odia Speech Annotation Phase 2"
                        value={batchNameInput}
                        onChange={(e) => setBatchNameInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 hover:border-indigo-500/50 rounded-2xl p-10 text-center cursor-pointer bg-white/[0.02] hover:bg-indigo-500/[0.03] transition-all group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv, .xlsx, .xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelected(file);
                        }}
                        className="hidden"
                      />
                      <Upload className="w-12 h-12 mx-auto text-indigo-400 group-hover:scale-110 transition-transform mb-3" />
                      <p className="text-base font-semibold text-white">
                        Click to browse or drop CSV / Excel file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports .CSV, .XLSX, and .XLS files with any extra columns
                      </p>
                      {isParsing && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-indigo-400 text-sm">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Parsing spreadsheet and detecting headers...
                        </div>
                      )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-slate-400 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">5 Primary Columns Detected:</span>
                        <button
                          onClick={() => setIsAliasInfoModalOpen(true)}
                          className="text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <Info className="w-3.5 h-3.5" /> View All Aliases
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1 text-[11px]">
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <strong className="text-white block">1. Name</strong>
                          <span className="text-slate-400">Name, Annotator, Worker, Contributor...</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <strong className="text-white block">2. UPI ID</strong>
                          <span className="text-slate-400">UPI, VPA, Payment UPI, UPI ID...</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <strong className="text-white block">3. Email</strong>
                          <span className="text-slate-400">Email, Email ID, E-mail...</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <strong className="text-white block">4. Price / Amount</strong>
                          <span className="text-slate-400">Price, Amount, Payment, Payout...</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <strong className="text-white block">5. Work Type</strong>
                          <span className="text-slate-400">Work Type, Task, Role, Category...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {uploadStep === 'mapping' && (
                  <div className="space-y-5">
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-300">
                      Please confirm the mapping of your file's columns to the 5 primary payment fields:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Name Column */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
                        <label className="block text-xs font-bold text-white">
                          Name Column <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={columnMapping.nameCol !== null ? columnMapping.nameCol : ''}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              nameCol: e.target.value !== '' ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Select Column --</option>
                          {rawHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              Col {i + 1}: {h || `(Column ${i + 1})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* UPI ID Column */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
                        <label className="block text-xs font-bold text-white">
                          UPI ID Column <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={columnMapping.upiCol !== null ? columnMapping.upiCol : ''}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              upiCol: e.target.value !== '' ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Select Column --</option>
                          {rawHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              Col {i + 1}: {h || `(Column ${i + 1})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount Column */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
                        <label className="block text-xs font-bold text-white">
                          Price / Amount Column <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={columnMapping.amountCol !== null ? columnMapping.amountCol : ''}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              amountCol: e.target.value !== '' ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Select Column --</option>
                          {rawHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              Col {i + 1}: {h || `(Column ${i + 1})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Email Column */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
                        <label className="block text-xs font-bold text-white">Email Column (Optional)</label>
                        <select
                          value={columnMapping.emailCol !== null ? columnMapping.emailCol : ''}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              emailCol: e.target.value !== '' ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- None / Skip --</option>
                          {rawHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              Col {i + 1}: {h || `(Column ${i + 1})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Work Type Column */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
                        <label className="block text-xs font-bold text-white">Work Type Column (Optional)</label>
                        <select
                          value={columnMapping.workTypeCol !== null ? columnMapping.workTypeCol : ''}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              workTypeCol: e.target.value !== '' ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Default to "Annotator" --</option>
                          {rawHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              Col {i + 1}: {h || `(Column ${i + 1})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          if (
                            columnMapping.nameCol === null ||
                            columnMapping.upiCol === null ||
                            columnMapping.amountCol === null
                          ) {
                            addToast('Missing Mapping', 'Please map Name, UPI ID, and Amount columns.', 'warning');
                            return;
                          }
                          buildPreviewRows(rawHeaders, rawRows, columnMapping);
                          setUploadStep('preview');
                        }}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Proceed to Preview →
                      </button>
                    </div>
                  </div>
                )}

                {uploadStep === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                          {parsedPreviewRows.length} Rows Loaded
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                          Valid: {parsedPreviewRows.filter((r) => r.isValid).length}
                        </span>
                        {parsedPreviewRows.some((r) => !r.isValid) && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Invalid: {parsedPreviewRows.filter((r) => !r.isValid).length}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setUploadStep('mapping')}
                          className="text-indigo-400 hover:underline"
                        >
                          Edit Column Mapping
                        </button>
                        <button
                          onClick={() => {
                            setUploadStep('upload');
                            setUploadedFile(null);
                            setParsedPreviewRows([]);
                          }}
                          className="text-cyan-400 hover:underline"
                        >
                          Upload Different File
                        </button>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-white/10 rounded-xl overflow-y-auto overflow-x-auto max-h-[50vh] relative bg-slate-950/60 shadow-inner">
                      <table className="w-full text-left text-xs text-slate-300 min-w-[900px]">
                        <thead className="bg-slate-900/95 backdrop-blur-md border-b border-white/10 font-semibold uppercase text-slate-400 sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="py-2.5 px-3 w-12">#</th>
                            <th className="py-2.5 px-3">Name *</th>
                            <th className="py-2.5 px-3">UPI ID *</th>
                            <th className="py-2.5 px-3">Amount (₹) *</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Work Type</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsedPreviewRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className={`transition-colors ${
                                !row.isValid ? 'bg-rose-500/10' : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) => handleUpdatePreviewCell(idx, 'name', e.target.value)}
                                  className="w-36 bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.upiId}
                                  onChange={(e) => handleUpdatePreviewCell(idx, 'upiId', e.target.value)}
                                  className="w-44 bg-white/5 border border-white/10 rounded px-2 py-1 text-cyan-300 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.amount}
                                  onChange={(e) => handleUpdatePreviewCell(idx, 'amount', e.target.value)}
                                  className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="email"
                                  value={row.email}
                                  onChange={(e) => handleUpdatePreviewCell(idx, 'email', e.target.value)}
                                  className="w-36 bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.workType}
                                  onChange={(e) => handleUpdatePreviewCell(idx, 'workType', e.target.value)}
                                  className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              <td className="py-2 px-3">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                                    <Check className="w-3.5 h-3.5" /> Valid
                                  </span>
                                ) : (
                                  <div className="text-rose-400 text-[10px] space-y-0.5">
                                    {row.errors.map((err, eIdx) => (
                                      <p key={eIdx}>• {err}</p>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleDeletePreviewRow(idx)}
                                  className="text-rose-400 hover:text-rose-300 p-1"
                                  title="Remove row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-900/90 px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-all"
                >
                  Cancel
                </button>

                {uploadStep === 'preview' && (
                  <button
                    onClick={handleConfirmSaveBatch}
                    disabled={isSavingBatch || parsedPreviewRows.filter((r) => r.isValid).length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingBatch && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>
                      Save {parsedPreviewRows.filter((r) => r.isValid).length} Workers to Local Workspace
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: SINGLE WORKER PAYMENT & UPI QR MODAL ── */}
      <AnimatePresence>
        {isPaymentModalOpen && activePaymentRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/20 text-cyan-400 border border-cyan-500/30">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      UPI Payout & Settlement
                    </h2>
                    <p className="text-xs text-slate-400">
                      Scan with Google Pay, PhonePe, Paytm, or BHIM to disburse payout.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {paymentStep === 'pay' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white border border-white/20 shadow-2xl">
                      {isGeneratingQr ? (
                        <div className="py-24 text-slate-600 text-center">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                          <p className="text-xs font-semibold">Generating UPI QR...</p>
                        </div>
                      ) : qrCodeDataUrl ? (
                        <div className="text-center space-y-2">
                          <img
                            src={qrCodeDataUrl}
                            alt="UPI Payment QR"
                            className="w-56 h-56 mx-auto rounded-lg shadow-sm"
                          />
                          <div className="text-[11px] text-slate-600 font-medium pt-1">
                            Scan to pay <strong className="text-black">{formatInr(activePaymentRecord.amount)}</strong>
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              onClick={handleDownloadQr}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all"
                            >
                              <Download className="w-3 h-3" /> Download QR
                            </button>
                            <a
                              href={generateUpiIntentUrl({
                                upiId: activePaymentRecord.upiId,
                                payeeName: activePaymentRecord.name,
                                amount: activePaymentRecord.amount,
                                note: `Zenemoo Payout - ${activePaymentRecord.workType}`,
                              })}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold flex items-center gap-1 transition-all"
                            >
                              <ExternalLink className="w-3 h-3" /> Open UPI App
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Payee Info & Quick Actions */}
                    <div className="space-y-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Payee Name
                          </span>
                          <span className="text-base font-bold text-white block mt-0.5">
                            {activePaymentRecord.name}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            UPI ID (VPA)
                          </span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-sm font-mono text-cyan-300 font-semibold break-all">
                              {activePaymentRecord.upiId}
                            </span>
                            <button
                              onClick={() => handleCopyText(activePaymentRecord.upiId, 'UPI ID')}
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-xs flex items-center gap-1 font-medium transition-all shrink-0 ml-2"
                            >
                              {copiedField === 'UPI ID' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              Copy
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Payout Amount
                          </span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-2xl font-black text-emerald-400">
                              {formatInr(activePaymentRecord.amount)}
                            </span>
                            <button
                              onClick={() => handleCopyText(activePaymentRecord.amount.toString(), 'Amount')}
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-xs flex items-center gap-1 font-medium transition-all shrink-0 ml-2"
                            >
                              {copiedField === 'Amount' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              Copy
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Work Type
                            </span>
                            <span className="text-slate-200 font-medium">
                              {activePaymentRecord.workType || 'Annotator'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Current Status
                            </span>
                            <div className="mt-0.5">{getStatusBadge(activePaymentRecord.status)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Status Selection */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-white">Select Payout Outcome:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentFormStatus('Paid');
                              setPaymentStep('details');
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Mark as Paid</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPaymentFormStatus('Issue');
                              setPaymentStep('details');
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all shadow-sm"
                          >
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span>Report Issue</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentStep === 'details' && (
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">Settlement Details for {activePaymentRecord.name}</span>
                        <span className="text-emerald-400 font-black text-base">{formatInr(activePaymentRecord.amount)}</span>
                      </div>
                    </div>

                    {paymentFormStatus === 'Paid' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                            Transaction ID / UTR Number <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 403819284729 or UPI Reference No."
                            value={paymentFormUtr}
                            onChange={(e) => setPaymentFormUtr(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Found in Google Pay / PhonePe / Paytm payment success receipt.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                            Payment Date <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={paymentFormDate}
                            onChange={(e) => setPaymentFormDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                            Work Type Confirmation
                          </label>
                          <select
                            value={paymentFormWorkType}
                            onChange={(e) => setPaymentFormWorkType(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                          >
                            {SUGGESTED_WORK_TYPES.map((wt) => (
                              <option key={wt} value={wt}>
                                {wt}
                              </option>
                            ))}
                          </select>
                          {paymentFormWorkType === 'Other' && (
                            <input
                              type="text"
                              placeholder="Enter custom work type..."
                              value={paymentFormCustomWorkType}
                              onChange={(e) => setPaymentFormCustomWorkType(e.target.value)}
                              className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                            Issue Category <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={paymentFormIssueType}
                            onChange={(e) => setPaymentFormIssueType(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                          >
                            {ISSUE_TYPES.map((it) => (
                              <option key={it} value={it}>
                                {it}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                            Issue Remarks & Notes
                          </label>
                          <textarea
                            rows={3}
                            placeholder="e.g. Bank declined UPI transaction with error code VPA_INVALID"
                            value={paymentFormIssueNotes}
                            onChange={(e) => setPaymentFormIssueNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setPaymentStep('pay')}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                      >
                        ← Back to QR
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (paymentFormStatus === 'Paid' && !paymentFormUtr.trim()) {
                            addToast('UTR Missing', 'Please enter the Transaction ID / UTR before proceeding.', 'warning');
                            return;
                          }
                          setPaymentStep('confirm');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25"
                      >
                        Review Confirmation →
                      </button>
                    </div>
                  </div>
                )}

                {paymentStep === 'confirm' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/80 border border-white/15 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/10 text-xs font-bold text-slate-300 uppercase tracking-wider">
                        <CheckCheck className="w-4 h-4 text-emerald-400" />
                        Final Payment Details Confirmation
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Payee Name</span>
                          <span className="font-bold text-white block">{activePaymentRecord.name}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Amount</span>
                          <span className="font-black text-emerald-400 text-sm block">
                            {formatInr(activePaymentRecord.amount)}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[11px]">UPI ID</span>
                          <span className="font-mono text-cyan-300 font-semibold block">{activePaymentRecord.upiId}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Work Type</span>
                          <span className="text-slate-200 block">
                            {paymentFormWorkType === 'Other' && paymentFormCustomWorkType
                              ? paymentFormCustomWorkType
                              : paymentFormWorkType || activePaymentRecord.workType}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Outcome Status</span>
                          <div className="mt-0.5">{getStatusBadge(paymentFormStatus)}</div>
                        </div>

                        {paymentFormStatus === 'Paid' ? (
                          <>
                            <div>
                              <span className="text-slate-500 block text-[11px]">UTR / Transaction ID</span>
                              <span className="font-mono font-bold text-emerald-300 block">{paymentFormUtr}</span>
                            </div>

                            <div>
                              <span className="text-slate-500 block text-[11px]">Payment Date</span>
                              <span className="text-slate-300 block">{paymentFormDate}</span>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-2">
                            <span className="text-slate-500 block text-[11px]">Issue Description</span>
                            <span className="text-rose-300 block font-semibold">{paymentFormIssueType}</span>
                            {paymentFormIssueNotes && (
                              <p className="text-slate-400 text-[11px] mt-0.5">{paymentFormIssueNotes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentStep('details')}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                      >
                        ← Back / Edit
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPaymentModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium"
                        >
                          Abort
                        </button>
                        <button
                          type="button"
                          disabled={isSavingPayment}
                          onClick={handleSavePaymentSettlement}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 disabled:opacity-50"
                        >
                          {isSavingPayment && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          Save Payment Record
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ZENEMOO EXPORT MODAL ── */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sectionId="local-payments"
        sectionName="Local Payment Workspace"
        dataset={allExportRecords.length > 0 ? allExportRecords : records}
        filteredDataset={records}
        filterSummary={
          [
            selectedBatchId !== 'All' ? `Batch: ${batches.find((b) => b.id === selectedBatchId)?.name || selectedBatchId}` : '',
            selectedStatus !== 'All' ? `Status: ${selectedStatus}` : '',
            selectedWorkType !== 'All' ? `Work: ${selectedWorkType}` : '',
            searchQuery ? `Search: "${searchQuery}"` : '',
          ]
            .filter(Boolean)
            .join(', ') || 'All active filters'
        }
        showToast={(msg, type) => addToast('Export Completed', msg, type || 'success')}
      />
    </div>
  );
};
