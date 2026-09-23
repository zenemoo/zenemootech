import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
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
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Receipt,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  paymentWorkerApi,
  PaymentRecord,
  PaymentSummary,
  AdminLeaderboardItem,
} from '../services/paymentWorkerApi';

interface AdminPaymentManagementPageProps {
  addToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }
  ) => void;
}

interface ImportRow {
  email: string;
  project_name: string;
  amount: number | string;
  currency: string;
  status: string;
  payment_date: string;
  reference_number: string;
  reference_link: string;
  notes: string;
  talent_id: string;
  isValid: boolean;
  error?: string;
}

export const AdminPaymentManagementPage: React.FC<AdminPaymentManagementPageProps> = ({
  addToast = (title, message) => console.log(title, message),
  showConfirm,
}) => {
  // Top level view tab: 'transactions' or 'leaderboard'
  const [adminViewTab, setAdminViewTab] = useState<'transactions' | 'leaderboard'>('transactions');

  // --- Transactions Data State ---
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    total_records: 0,
    total_paid: 0,
    status_counts: { Pending: 0, Processing: 0, Paid: 0, Failed: 0, Cancelled: 0 },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // --- Filtering & Pagination State for Transactions ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('payment_date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // --- Leaderboard State for Admin ---
  const [leaderboardItems, setLeaderboardItems] = useState<AdminLeaderboardItem[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState<string>('');
  const [debouncedLeaderboardSearch, setDebouncedLeaderboardSearch] = useState<string>('');
  const [leaderboardPage, setLeaderboardPage] = useState<number>(1);
  const [leaderboardTotalPages, setLeaderboardTotalPages] = useState<number>(1);
  const [leaderboardTotalCount, setLeaderboardTotalCount] = useState<number>(0);
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<string>('total_paid');
  const [leaderboardSortOrder, setLeaderboardSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // --- Modal States ---
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // --- Form State (Add / Edit) ---
  const [formData, setFormData] = useState({
    email: '',
    project_name: '',
    amount: '',
    currency: 'INR',
    status: 'Paid',
    payment_date: new Date().toISOString().split('T')[0],
    talent_id: '',
    reference_number: '',
    reference_link: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // --- Import State ---
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [defaultProjectName, setDefaultProjectName] = useState<string>('');
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input for Transactions
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Debounce search input for Leaderboard
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLeaderboardSearch(leaderboardSearch);
      setLeaderboardPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [leaderboardSearch]);

  // Load Transactions Data from Worker
  const loadPaymentData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setIsRefreshing(true);
      try {
        const [listRes, summaryRes] = await Promise.allSettled([
          paymentWorkerApi.getAdminPayments({
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch,
            status: selectedStatus !== 'All' ? selectedStatus : undefined,
            project: selectedProject !== 'All' ? selectedProject : undefined,
            sortBy,
            sortOrder,
          }),
          paymentWorkerApi.getAdminSummary(),
        ]);

        if (listRes.status === 'fulfilled' && listRes.value?.success) {
          setPayments(listRes.value.data || []);
          setTotalPages(listRes.value.pagination?.totalPages || 1);
          setTotalCount(listRes.value.pagination?.total || 0);
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value?.success) {
          setSummary(summaryRes.value.summary);
        }
      } catch (err: any) {
        console.error('[AdminPaymentManagement Load Error]:', err.message);
        addToast('Error loading payments', 'Could not reach the Cloudflare Payment API', 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, selectedStatus, selectedProject, sortBy, sortOrder, addToast]
  );

  // Load Leaderboard Data for Admin
  const loadLeaderboardData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLeaderboardLoading(true);
      try {
        const res = await paymentWorkerApi.getAdminLeaderboard({
          page: leaderboardPage,
          limit: 25,
          search: debouncedLeaderboardSearch,
          sortBy: leaderboardSortBy,
          sortOrder: leaderboardSortOrder,
        });

        if (res?.success) {
          setLeaderboardItems(res.data || []);
          setLeaderboardTotalPages(res.pagination?.totalPages || 1);
          setLeaderboardTotalCount(res.pagination?.total || 0);
        }
      } catch (err: any) {
        console.error('[AdminLeaderboard Load Error]:', err.message);
        addToast('Error loading leaderboard', 'Failed to retrieve rankings from D1', 'error');
      } finally {
        setIsLeaderboardLoading(false);
      }
    },
    [leaderboardPage, debouncedLeaderboardSearch, leaderboardSortBy, leaderboardSortOrder, addToast]
  );

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  useEffect(() => {
    if (adminViewTab === 'leaderboard') {
      loadLeaderboardData();
    }
  }, [adminViewTab, loadLeaderboardData]);

  // Extract unique projects list for filter dropdown
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.project_name) set.add(p.project_name);
    });
    return Array.from(set);
  }, [payments]);

  // --- Form Validation ---
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Valid email is required';
    }
    if (!formData.project_name.trim()) {
      errors.project_name = 'Project or work name is required';
    }
    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    if (!formData.payment_date) {
      errors.payment_date = 'Payment date is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Save / Edit Payment Handler ---
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (editingPayment) {
        await paymentWorkerApi.updatePayment(editingPayment.id, {
          email: formData.email.trim().toLowerCase(),
          project_name: formData.project_name.trim(),
          amount: Number(formData.amount),
          currency: formData.currency,
          status: formData.status as any,
          payment_date: formData.payment_date,
          talent_id: formData.talent_id.trim() || undefined,
          reference_number: formData.reference_number.trim() || undefined,
          reference_link: formData.reference_link.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
        addToast('Payment updated', 'Payment record updated in D1', 'success');
      } else {
        await paymentWorkerApi.createPayment({
          email: formData.email.trim().toLowerCase(),
          project_name: formData.project_name.trim(),
          amount: Number(formData.amount),
          currency: formData.currency,
          status: formData.status,
          payment_date: formData.payment_date,
          talent_id: formData.talent_id.trim() || undefined,
          reference_number: formData.reference_number.trim() || undefined,
          reference_link: formData.reference_link.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
        addToast('Payment added', 'New payment record created in D1', 'success');
      }

      setIsAddModalOpen(false);
      setEditingPayment(null);
      resetForm();
      loadPaymentData(false);
      if (adminViewTab === 'leaderboard') {
        loadLeaderboardData(false);
      }
    } catch (err: any) {
      console.error('[Admin Save Payment Error]:', err.message);
      addToast('Failed to save payment', err.response?.data?.message || err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      project_name: defaultProjectName || '',
      amount: '',
      currency: 'INR',
      status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0],
      talent_id: '',
      reference_number: '',
      reference_link: '',
      notes: '',
    });
    setFormErrors({});
  };

  const openAddModal = () => {
    setEditingPayment(null);
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setFormData({
      email: payment.email,
      project_name: payment.project_name,
      amount: payment.amount.toString(),
      currency: payment.currency || 'INR',
      status: payment.status || 'Paid',
      payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      talent_id: payment.talent_id || '',
      reference_number: payment.reference_number || '',
      reference_link: payment.reference_link || '',
      notes: payment.notes || '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // --- Delete Handler ---
  const handleDeletePayment = (payment: PaymentRecord) => {
    const confirmDelete = async () => {
      try {
        await paymentWorkerApi.deletePayment(payment.id);
        addToast('Payment deleted', `Payment for ${payment.email} removed from D1`, 'info');
        loadPaymentData(false);
        if (adminViewTab === 'leaderboard') {
          loadLeaderboardData(false);
        }
      } catch (err: any) {
        console.error('[Admin Delete Payment Error]:', err.message);
        addToast('Delete failed', err.response?.data?.message || err.message, 'error');
      }
    };

    if (showConfirm) {
      showConfirm(
        'Delete Payment Record',
        `Are you sure you want to delete the payment record of ₹${payment.amount} for "${payment.email}"? This action cannot be undone.`,
        confirmDelete,
        { confirmText: 'Delete Payment', intent: 'danger' }
      );
    } else {
      if (window.confirm(`Delete payment of ₹${payment.amount} for ${payment.email}?`)) {
        confirmDelete();
      }
    }
  };

  // --- Header & CSV/Excel Import Utilities ---
  const normalizeHeader = (raw: string): string => {
    return raw
      .toLowerCase()
      .trim()
      .replace(/[\._\-]/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const EMAIL_ALIASES = ['email', 'e mail', 'email address', 'mail'];
  const AMOUNT_P1_ALIASES = ['price', 'to pay', 'topay', 'net amount', 'paid amount', 'payment amount'];
  const AMOUNT_P2_ALIASES = ['amount', 'total amount'];
  const AMOUNT_EXCLUDED = ['total raw amount', 'raw amount', 'gross amount', 'gross'];
  const REFERENCE_ALIASES = [
    'ref no',
    'ref. no',
    'ref.no',
    'ref no.',
    'reference',
    'reference number',
    'reference no',
    'reference id',
    'utr',
    'utr number',
    'txn id',
    'transaction id',
  ];
  const STATUS_ALIASES = ['status', 'payment status', 'payout status'];
  const DATE_ALIASES = ['date', 'payment date', 'paid date', 'txn date', 'transaction date'];
  const TALENT_ID_ALIASES = ['talent id', 'talent_id', 'contributor id', 'worker id', 'member code', 'user id'];
  const PROJECT_ALIASES = ['project', 'project name', 'campaign', 'campaign name', 'task name'];

  interface ColumnMapping {
    emailCol?: number;
    amountCol?: number;
    hasAmountHeader: boolean;
    referenceCol?: number;
    statusCol?: number;
    dateCol?: number;
    talentIdCol?: number;
    projectCol?: number;
  }

  const detectColumns = (headers: string[]): ColumnMapping => {
    let emailCol: number | undefined;
    let p1AmountCol: number | undefined;
    let p2AmountCol: number | undefined;
    let referenceCol: number | undefined;
    let statusCol: number | undefined;
    let dateCol: number | undefined;
    let talentIdCol: number | undefined;
    let projectCol: number | undefined;

    headers.forEach((h, colIndex) => {
      const norm = normalizeHeader(h || '');

      // Email mapping
      if (emailCol === undefined && (EMAIL_ALIASES.includes(norm) || norm === 'email')) {
        emailCol = colIndex;
      }

      // Amount Priority mapping (Explicitly ignores Total Raw Amount, Raw Amount, Gross Amount)
      if (!AMOUNT_EXCLUDED.includes(norm)) {
        if (p1AmountCol === undefined && AMOUNT_P1_ALIASES.includes(norm)) {
          p1AmountCol = colIndex;
        } else if (p2AmountCol === undefined && AMOUNT_P2_ALIASES.includes(norm)) {
          p2AmountCol = colIndex;
        }
      }

      // Reference mapping
      if (referenceCol === undefined && REFERENCE_ALIASES.includes(norm)) {
        referenceCol = colIndex;
      }

      // Status mapping
      if (statusCol === undefined && STATUS_ALIASES.includes(norm)) {
        statusCol = colIndex;
      }

      // Date mapping
      if (dateCol === undefined && DATE_ALIASES.includes(norm)) {
        dateCol = colIndex;
      }

      // Talent ID mapping
      if (talentIdCol === undefined && TALENT_ID_ALIASES.includes(norm)) {
        talentIdCol = colIndex;
      }

      // Project mapping
      if (projectCol === undefined && PROJECT_ALIASES.includes(norm)) {
        projectCol = colIndex;
      }
    });

    const amountCol = p1AmountCol !== undefined ? p1AmountCol : p2AmountCol;
    const hasAmountHeader = amountCol !== undefined;

    return {
      emailCol,
      amountCol,
      hasAmountHeader,
      referenceCol,
      statusCol,
      dateCol,
      talentIdCol,
      projectCol,
    };
  };

  const validateEmailValue = (raw: any): { email: string; isValid: boolean; error?: string } => {
    if (raw === undefined || raw === null) {
      return { email: '', isValid: false, error: 'Invalid or missing email' };
    }
    const str = String(raw).trim();
    if (!str) {
      return { email: '', isValid: false, error: 'Invalid or missing email' };
    }
    // Strict rejection of #N/A, N/A, n/a, null, undefined
    if (/^#n\/a$/i.test(str) || /^n\/a$/i.test(str) || /^na$/i.test(str) || /^null$/i.test(str) || /^undefined$/i.test(str)) {
      return { email: str, isValid: false, error: 'Invalid or missing email (#N/A)' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(str)) {
      return { email: str, isValid: false, error: 'Invalid email syntax' };
    }
    return { email: str.toLowerCase(), isValid: true };
  };

  const parseAmountValue = (raw: any, hasAmountHeader: boolean): { amount: number; isValid: boolean; error?: string } => {
    if (!hasAmountHeader) {
      return { amount: 0, isValid: false, error: 'Payment amount column not found' };
    }
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return { amount: 0, isValid: false, error: 'Missing or invalid amount' };
    }
    let str = String(raw).trim();
    // Strip currency symbols (₹, $, INR) and commas (thousands separators)
    str = str.replace(/[₹$]|inr/gi, '').replace(/,/g, '').trim();
    const num = Number(str);
    if (isNaN(num) || num <= 0) {
      return { amount: isNaN(num) ? 0 : num, isValid: false, error: 'Amount must be greater than 0' };
    }
    return { amount: num, isValid: true };
  };

  const normalizeStatusValue = (raw: any, hasStatusHeader: boolean): { status: string; isValid: boolean; error?: string } => {
    if (!hasStatusHeader || raw === undefined || raw === null || String(raw).trim() === '') {
      return { status: 'Paid', isValid: true };
    }
    const clean = String(raw).trim().toLowerCase();
    if (clean === 'done' || clean === 'completed' || clean === 'success' || clean === 'paid') {
      return { status: 'Paid', isValid: true };
    }
    if (clean === 'pending') {
      return { status: 'Pending', isValid: true };
    }
    if (clean === 'processing') {
      return { status: 'Processing', isValid: true };
    }
    if (clean === 'failed') {
      return { status: 'Failed', isValid: true };
    }
    if (clean === 'cancelled' || clean === 'canceled') {
      return { status: 'Cancelled', isValid: true };
    }
    return { status: String(raw).trim(), isValid: false, error: `Unrecognized status: "${raw}"` };
  };

  const validateImportRow = (
    row: {
      email?: any;
      amount?: any;
      status?: any;
      project_name?: any;
      payment_date?: any;
      reference_number?: any;
      talent_id?: any;
      hasAmountHeader?: boolean;
      hasStatusHeader?: boolean;
    },
    defaultProject: string
  ): {
    isValid: boolean;
    error?: string;
    validatedEmail: string;
    validatedAmount: number;
    validatedStatus: string;
    validatedProject: string;
  } => {
    const emailRes = validateEmailValue(row.email);
    const amountRes = parseAmountValue(row.amount, row.hasAmountHeader !== false);
    const statusRes = normalizeStatusValue(row.status, row.hasStatusHeader !== false);

    const project = (row.project_name || '').trim() || defaultProject.trim();
    const projectValid = !!project;

    const errors: string[] = [];
    if (!emailRes.isValid) errors.push(emailRes.error || 'Invalid email');
    if (!amountRes.isValid) errors.push(amountRes.error || 'Invalid amount');
    if (!statusRes.isValid) errors.push(statusRes.error || 'Invalid status');
    if (!projectValid) errors.push('Project name is required');

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      validatedEmail: emailRes.email || row.email,
      validatedAmount: amountRes.amount,
      validatedStatus: statusRes.status,
      validatedProject: project,
    };
  };

  const getCellValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      if (val.result !== undefined) return String(val.result);
      if (val.text !== undefined) return String(val.text);
      if (val instanceof Date) return val.toISOString().split('T')[0];
    }
    return String(val);
  };

  // --- Robust Browser CSV Parser (supports quotes, commas in quotes, escaped quotes, CRLF/LF, BOM) ---
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
            i++; // Skip escaped quote
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
          if (nextChar === '\n') {
            i++;
          }
          currentRow.push(currentField.trim());
          currentField = '';
          if (currentRow.some((f) => f.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else if (char === '\n') {
          currentRow.push(currentField.trim());
          currentField = '';
          if (currentRow.some((f) => f.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else {
          currentField += char;
        }
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  // --- File Parsing & Import Handler ---
  const handleFileUpload = async (file: File) => {
    setIsParsingFile(true);
    try {
      const parsedRows: ImportRow[] = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        // --- NATIVE BROWSER CSV PARSING ---
        const text = await file.text();
        const csvRows = parseCsvText(text);

        if (csvRows.length < 2) {
          throw new Error('CSV file must contain a header row and at least one data row');
        }

        const headers = csvRows[0];
        const colMap = detectColumns(headers);

        for (let r = 1; r < csvRows.length; r++) {
          const row = csvRows[r];
          if (!row || row.length === 0 || row.every((c) => !c || c.trim() === '')) continue;

          const rawEmail = colMap.emailCol !== undefined ? String(row[colMap.emailCol] ?? '').trim() : '';
          const rawAmount = colMap.amountCol !== undefined ? row[colMap.amountCol] : undefined;
          const rawProject = colMap.projectCol !== undefined
            ? String(row[colMap.projectCol] ?? '').trim()
            : defaultProjectName.trim();
          const rawRef = colMap.referenceCol !== undefined ? String(row[colMap.referenceCol] ?? '').trim() : '';
          const rawDate = colMap.dateCol !== undefined && String(row[colMap.dateCol] ?? '').trim()
            ? String(row[colMap.dateCol]).trim()
            : new Date().toISOString().split('T')[0];
          const rawStatus = colMap.statusCol !== undefined ? row[colMap.statusCol] : undefined;
          const rawTalentId = colMap.talentIdCol !== undefined ? String(row[colMap.talentIdCol] ?? '').trim() : '';

          const validation = validateImportRow(
            {
              email: rawEmail,
              amount: rawAmount,
              status: rawStatus,
              project_name: rawProject,
              payment_date: rawDate,
              reference_number: rawRef,
              talent_id: rawTalentId,
              hasAmountHeader: colMap.hasAmountHeader,
              hasStatusHeader: colMap.statusCol !== undefined,
            },
            defaultProjectName
          );

          parsedRows.push({
            email: validation.validatedEmail,
            project_name: validation.validatedProject,
            amount: validation.validatedAmount,
            currency: 'INR',
            status: validation.validatedStatus,
            payment_date: rawDate,
            reference_number: rawRef,
            reference_link: '',
            notes: '',
            talent_id: rawTalentId,
            isValid: validation.isValid,
            error: validation.error,
          });
        }
      } else {
        // --- EXCEL (.XLSX / .XLS) PARSING ---
        const { default: ExcelJS } = await import('exceljs');
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('Excel file contains no readable sheets');
        }

        const headers: string[] = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber - 1] = getCellValue(cell.value);
        });

        const colMap = detectColumns(headers);

        for (let r = 2; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!row || row.cellCount === 0) continue;

          const rawEmail = colMap.emailCol !== undefined ? getCellValue(row.getCell(colMap.emailCol + 1).value).trim() : '';
          const rawAmount = colMap.amountCol !== undefined ? getCellValue(row.getCell(colMap.amountCol + 1).value) : undefined;
          const rawProject = colMap.projectCol !== undefined
            ? getCellValue(row.getCell(colMap.projectCol + 1).value).trim()
            : defaultProjectName.trim();
          const rawRef = colMap.referenceCol !== undefined ? getCellValue(row.getCell(colMap.referenceCol + 1).value).trim() : '';
          const rawDate = colMap.dateCol !== undefined && getCellValue(row.getCell(colMap.dateCol + 1).value).trim()
            ? getCellValue(row.getCell(colMap.dateCol + 1).value).trim()
            : new Date().toISOString().split('T')[0];
          const rawStatus = colMap.statusCol !== undefined ? getCellValue(row.getCell(colMap.statusCol + 1).value) : undefined;
          const rawTalentId = colMap.talentIdCol !== undefined ? getCellValue(row.getCell(colMap.talentIdCol + 1).value).trim() : '';

          if (!rawEmail && rawAmount === undefined && !rawRef && !rawTalentId) continue;

          const validation = validateImportRow(
            {
              email: rawEmail,
              amount: rawAmount,
              status: rawStatus,
              project_name: rawProject,
              payment_date: rawDate,
              reference_number: rawRef,
              talent_id: rawTalentId,
              hasAmountHeader: colMap.hasAmountHeader,
              hasStatusHeader: colMap.statusCol !== undefined,
            },
            defaultProjectName
          );

          parsedRows.push({
            email: validation.validatedEmail,
            project_name: validation.validatedProject,
            amount: validation.validatedAmount,
            currency: 'INR',
            status: validation.validatedStatus,
            payment_date: rawDate,
            reference_number: rawRef,
            reference_link: '',
            notes: '',
            talent_id: rawTalentId,
            isValid: validation.isValid,
            error: validation.error,
          });
        }
      }

      if (parsedRows.length === 0) {
        throw new Error('No readable data rows found in the uploaded file');
      }

      setImportRows(parsedRows);
      setImportStep('preview');
      const validCount = parsedRows.filter((r) => r.isValid).length;
      const invalidCount = parsedRows.length - validCount;
      addToast(
        'File parsed',
        `Loaded ${parsedRows.length} rows (${validCount} valid, ${invalidCount} invalid)`,
        invalidCount > 0 ? 'warning' : 'info'
      );
    } catch (err: any) {
      console.error('[File Parse Error]:', err.message);
      addToast('Failed to parse file', err.message || 'Check CSV/Excel formatting', 'error');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleUpdateImportRow = (index: number, field: keyof ImportRow, value: any) => {
    setImportRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };
      const validation = validateImportRow(
        {
          email: String(row.email || ''),
          amount: row.amount,
          status: String(row.status || ''),
          project_name: String(row.project_name || ''),
          payment_date: String(row.payment_date || ''),
          reference_number: String(row.reference_number || ''),
          talent_id: String(row.talent_id || ''),
          hasAmountHeader: true,
          hasStatusHeader: true,
        },
        defaultProjectName
      );

      row.isValid = validation.isValid;
      row.error = validation.error;
      updated[index] = row;
      return updated;
    });
  };

  const handleDeleteImportRow = (index: number) => {
    setImportRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      addToast('No valid rows', 'Fix highlighted errors before importing', 'warning');
      return;
    }

    // Ensure all valid rows have a non-empty project name
    for (const r of validRows) {
      if (!r.project_name.trim() && !defaultProjectName.trim()) {
        addToast('Project name required', 'Project name is required for all rows.', 'error');
        return;
      }
    }

    if (validRows.length > 500) {
      addToast('Batch limit exceeded', 'Maximum 500 records per import batch.', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      const payload = validRows.map((r) => ({
        email: r.email.trim().toLowerCase(),
        project_name: r.project_name.trim() || defaultProjectName.trim() || 'General Project',
        amount: Number(r.amount),
        currency: r.currency || 'INR',
        status: r.status || 'Paid',
        payment_date: r.payment_date || new Date().toISOString().split('T')[0],
        talent_id: r.talent_id ? r.talent_id.trim() : undefined,
        reference_number: r.reference_number ? r.reference_number.trim() : undefined,
        reference_link: r.reference_link ? r.reference_link.trim() : undefined,
        notes: r.notes ? r.notes.trim() : undefined,
      }));

      const res = await paymentWorkerApi.importPayments(payload);
      addToast('Import successful', res.message || `Imported ${res.count} records to D1`, 'success');
      setIsImportModalOpen(false);
      setImportRows([]);
      setImportFile(null);
      setImportStep('upload');
      loadPaymentData(false);
      if (adminViewTab === 'leaderboard') {
        loadLeaderboardData(false);
      }
    } catch (err: any) {
      console.error('[Import API Error]:', err.message);
      addToast('Import failed', err.response?.data?.message || err.message, 'error');
    } finally {
      setIsImporting(false);
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
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Failed
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
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-[#0B0F19] to-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Payment Management
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Cloudflare D1
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Manage talent payouts, import batches, and track live contributor leaderboard rankings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              if (adminViewTab === 'transactions') loadPaymentData(false);
              else loadLeaderboardData(false);
            }}
            disabled={isRefreshing || isLeaderboardLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isRefreshing || isLeaderboardLoading ? 'animate-spin text-cyan-400' : ''
              }`}
            />
            Refresh
          </button>

          <button
            onClick={() => {
              setImportStep('upload');
              setImportRows([]);
              setImportFile(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 hover:text-white transition-all text-sm font-medium shadow-lg shadow-indigo-500/10"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            Import CSV / Excel
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition-all text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            + Add Payment
          </button>
        </div>
      </div>

      {/* ── Summary Statistics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Records</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {summary.total_records.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">In D1 database</p>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400/80 text-xs font-medium">
            <span>Total Paid</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">
            ₹{summary.total_paid.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-500/70 mt-0.5">
            {summary.status_counts.Paid} completed
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-amber-400/80 text-xs font-medium">
            <span>Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2 tracking-tight">
            {summary.status_counts.Pending.toLocaleString()}
          </p>
          <p className="text-[11px] text-amber-500/70 mt-0.5">Awaiting payout</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-cyan-400/80 text-xs font-medium">
            <span>Processing</span>
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400 mt-2 tracking-tight">
            {summary.status_counts.Processing.toLocaleString()}
          </p>
          <p className="text-[11px] text-cyan-500/70 mt-0.5">In flight</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-rose-400/80 text-xs font-medium">
            <span>Failed</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-2 tracking-tight">
            {summary.status_counts.Failed.toLocaleString()}
          </p>
          <p className="text-[11px] text-rose-500/70 mt-0.5">Need attention</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cancelled</span>
            <X className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-300 mt-2 tracking-tight">
            {summary.status_counts.Cancelled.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Voided</p>
        </div>
      </div>

      {/* ── Sub-Tab Switcher: Transactions vs Leaderboard ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setAdminViewTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            adminViewTab === 'transactions'
              ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Receipt className="w-4 h-4" />
          All Payment Records ({totalCount})
        </button>

        <button
          onClick={() => setAdminViewTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            adminViewTab === 'leaderboard'
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-300" />
          Contributor Leaderboard
        </button>
      </div>

      {/* ── VIEW 1: TRANSACTIONS TABLE ── */}
      {adminViewTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters & Search Controls */}
          <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search email, project, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
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

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
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
                  <option value="Paid" className="bg-slate-900 text-white">Paid</option>
                  <option value="Pending" className="bg-slate-900 text-white">Pending</option>
                  <option value="Processing" className="bg-slate-900 text-white">Processing</option>
                  <option value="Failed" className="bg-slate-900 text-white">Failed</option>
                  <option value="Cancelled" className="bg-slate-900 text-white">Cancelled</option>
                </select>
              </div>

              {uniqueProjects.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs text-slate-400">Project:</span>
                  <select
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer max-w-[140px] truncate"
                  >
                    <option value="All" className="bg-slate-900 text-white">All Projects</option>
                    {uniqueProjects.map((proj) => (
                      <option key={proj} value={proj} className="bg-slate-900 text-white">
                        {proj}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(e) => {
                    const [sb, so] = e.target.value.split(':');
                    setSortBy(sb);
                    setSortOrder(so as 'ASC' | 'DESC');
                  }}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="payment_date:DESC" className="bg-slate-900 text-white">Date (Newest First)</option>
                  <option value="payment_date:ASC" className="bg-slate-900 text-white">Date (Oldest First)</option>
                  <option value="amount:DESC" className="bg-slate-900 text-white">Amount (High to Low)</option>
                  <option value="amount:ASC" className="bg-slate-900 text-white">Amount (Low to High)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">Talent Email / ID</th>
                    <th className="py-3.5 px-4">Project / Work</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment Date</th>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2" />
                        <p className="text-sm">Loading payment records from Cloudflare D1...</p>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <CreditCard className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                        <p className="text-base font-semibold text-white">No payment records found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {searchQuery || selectedStatus !== 'All'
                            ? 'No records match your search filters.'
                            : 'No payments have been recorded yet.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white truncate max-w-[220px]" title={p.email}>
                            {p.email}
                          </div>
                          {p.talent_id && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              ID: {p.talent_id}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          <span className="truncate max-w-[180px] block" title={p.project_name}>
                            {p.project_name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap">
                          ₹{p.amount.toLocaleString('en-IN')}
                          <span className="text-[10px] text-slate-500 font-normal ml-1">{p.currency}</span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(p.status)}</td>

                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {p.payment_date || '-'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          {p.reference_number ? (
                            <div className="font-mono text-slate-300 flex items-center gap-1.5">
                              <span>{p.reference_number}</span>
                              {p.reference_link && (
                                <a
                                  href={p.reference_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300"
                                  title="Open link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ) : p.reference_link ? (
                            <a
                              href={p.reference_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              View Link
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 capitalize">
                            {p.source || 'manual'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
                              title="Edit Payment"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                              title="Delete Payment"
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
            {!isLoading && payments.length > 0 && (
              <div className="bg-white/[0.02] border-t border-white/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div>
                  Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-semibold text-white">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-semibold text-white">{totalCount}</span> records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 2: ADMIN CONTRIBUTOR LEADERBOARD ── */}
      {adminViewTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Search & Sort Controls */}
          <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search email, talent ID..."
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              {leaderboardSearch && (
                <button
                  onClick={() => setLeaderboardSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={`${leaderboardSortBy}:${leaderboardSortOrder}`}
                  onChange={(e) => {
                    const [sb, so] = e.target.value.split(':');
                    setLeaderboardSortBy(sb);
                    setLeaderboardSortOrder(so as 'ASC' | 'DESC');
                  }}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="total_paid:DESC" className="bg-slate-900 text-white">Total Paid (High to Low)</option>
                  <option value="total_paid:ASC" className="bg-slate-900 text-white">Total Paid (Low to High)</option>
                  <option value="payment_count:DESC" className="bg-slate-900 text-white">Payment Count (High to Low)</option>
                  <option value="last_payment_date:DESC" className="bg-slate-900 text-white">Recent Payment Date</option>
                </select>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4 w-16">Rank</th>
                    <th className="py-3.5 px-4">Talent Email</th>
                    <th className="py-3.5 px-4">Talent ID</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4">Payments Count</th>
                    <th className="py-3.5 px-4">Last Payment Date</th>
                    <th className="py-3.5 px-4 text-right">Total Paid (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLeaderboardLoading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-2" />
                        <p className="text-sm">Calculating D1 leaderboard rankings...</p>
                      </td>
                    </tr>
                  ) : leaderboardItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <Trophy className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                        <p className="text-base font-semibold text-white">No ranked contributors found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Completed payouts will automatically aggregate rankings here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    leaderboardItems.map((item) => (
                      <tr key={item.rank} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-black">
                          <div className="flex items-center gap-1.5">
                            {item.rank === 1 ? (
                              <Crown className="w-4 h-4 text-amber-300" />
                            ) : item.rank === 2 ? (
                              <Medal className="w-4 h-4 text-slate-300" />
                            ) : item.rank === 3 ? (
                              <Award className="w-4 h-4 text-amber-600" />
                            ) : (
                              <span className="text-slate-500 text-xs w-4 text-center">#{item.rank}</span>
                            )}
                            <span>#{item.rank}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-white">
                          <div>{item.email}</div>
                          <div className="text-[11px] text-slate-500">{item.name}</div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                          {item.talent_id || '-'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium">
                            {item.grade}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-300">
                          {item.payment_count} payouts
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {item.last_payment_date || '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-base whitespace-nowrap">
                          ₹{item.total_paid.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Leaderboard */}
            {!isLeaderboardLoading && leaderboardItems.length > 0 && (
              <div className="bg-white/[0.02] border-t border-white/10 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing <span className="font-semibold text-white">{(leaderboardPage - 1) * 25 + 1}</span> to{' '}
                  <span className="font-semibold text-white">
                    {Math.min(leaderboardPage * 25, leaderboardTotalCount)}
                  </span>{' '}
                  of <span className="font-semibold text-white">{leaderboardTotalCount}</span> contributors
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}
                    disabled={leaderboardPage === 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                    Page {leaderboardPage} of {leaderboardTotalPages || 1}
                  </span>
                  <button
                    onClick={() => setLeaderboardPage((p) => Math.min(leaderboardTotalPages, p + 1))}
                    disabled={leaderboardPage >= leaderboardTotalPages}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Payment Modal ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {editingPayment ? 'Edit Payment Record' : 'Add New Payment Record'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Talent Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. talent@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    {formErrors.email && (
                      <p className="text-xs text-rose-400 mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Project / Work Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Odia Audio Collection Phase 1"
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    {formErrors.project_name && (
                      <p className="text-xs text-rose-400 mt-1">{formErrors.project_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 1500"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    {formErrors.amount && (
                      <p className="text-xs text-rose-400 mt-1">{formErrors.amount}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Failed">Failed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Talent ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TAL-1234-ABCD"
                      value={formData.talent_id}
                      onChange={(e) => setFormData({ ...formData, talent_id: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Reference / UTR (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TXN987654321"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Proof Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.reference_link}
                      onChange={(e) => setFormData({ ...formData, reference_link: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Notes / Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Approved by HR"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {editingPayment ? 'Update Payment' : 'Save Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CSV / Excel Batch Import Modal ── */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Import Payments from CSV / Excel</h2>
                    <p className="text-xs text-slate-400">
                      Auto-detects columns, provides inline editable preview, and batch-inserts to D1.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {importStep === 'upload' ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Default Project Name (Used if not specified in file)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AI Data Annotation 2026"
                        value={defaultProjectName}
                        onChange={(e) => setDefaultProjectName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer bg-white/[0.02] hover:bg-indigo-500/[0.03] transition-all group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv, .xlsx, .xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                      />
                      <Upload className="w-12 h-12 mx-auto text-indigo-400 group-hover:scale-110 transition-transform mb-3" />
                      <p className="text-base font-semibold text-white">
                        Click to browse or drop CSV / Excel file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports .CSV, .XLSX, and .XLS files (up to 500 records per batch)
                      </p>
                      {isParsingFile && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-indigo-400 text-sm">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Parsing spreadsheet rows...
                        </div>
                      )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
                      <p className="font-semibold text-slate-300">Supported Spreadsheet Headers:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400">
                        <li><strong className="text-white">Email:</strong> Email, E-mail, Email Address, email_id</li>
                        <li><strong className="text-white">Amount:</strong> Amount, Payment, Paid Amount, Payment Amount</li>
                        <li><strong className="text-white">Reference:</strong> Reference Number, Transaction ID, UTR</li>
                        <li><strong className="text-white">Proof:</strong> Reference Link, Payment Link, Receipt URL</li>
                        <li><strong className="text-white">Date:</strong> Payment Date, Date, Paid Date</li>
                        <li><strong className="text-white">Status:</strong> Status (Paid, Pending, Processing, Failed, Cancelled)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                          {importRows.length} Rows Loaded
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                          Valid rows: {importRows.filter((r) => r.isValid).length}
                        </span>
                        {importRows.some((r) => !r.isValid) && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Invalid rows: {importRows.filter((r) => !r.isValid).length}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setImportStep('upload');
                          setImportRows([]);
                        }}
                        className="text-cyan-400 hover:underline"
                      >
                        Upload different file
                      </button>
                    </div>

                    <div className="border border-white/10 rounded-xl overflow-hidden overflow-x-auto max-h-[350px]">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-white/5 border-b border-white/10 font-semibold uppercase text-slate-400 sticky top-0 bg-slate-900 z-10">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Email *</th>
                            <th className="py-2.5 px-3">Project *</th>
                            <th className="py-2.5 px-3">Amount (₹) *</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Reference</th>
                            <th className="py-2.5 px-3">Talent ID</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {importRows.map((row, idx) => (
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
                                  value={row.email}
                                  onChange={(e) => handleUpdateImportRow(idx, 'email', e.target.value)}
                                  className="w-40 bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500"
                                />
                                {row.error && <p className="text-[10px] text-rose-400 mt-0.5">{row.error}</p>}
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.project_name}
                                  onChange={(e) => handleUpdateImportRow(idx, 'project_name', e.target.value)}
                                  className="w-32 bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.amount}
                                  onChange={(e) => handleUpdateImportRow(idx, 'amount', e.target.value)}
                                  className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <select
                                  value={row.status}
                                  onChange={(e) => handleUpdateImportRow(idx, 'status', e.target.value)}
                                  className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                                >
                                  <option value="Paid">Paid</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Failed">Failed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="date"
                                  value={row.payment_date}
                                  onChange={(e) => handleUpdateImportRow(idx, 'payment_date', e.target.value)}
                                  className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="Ref No"
                                  value={row.reference_number}
                                  onChange={(e) => handleUpdateImportRow(idx, 'reference_number', e.target.value)}
                                  className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono text-[11px] focus:outline-none"
                                />
                              </td>

                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="Talent ID"
                                  value={row.talent_id}
                                  onChange={(e) => handleUpdateImportRow(idx, 'talent_id', e.target.value)}
                                  className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono text-[11px] focus:outline-none"
                                />
                              </td>

                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleDeleteImportRow(idx)}
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

              <div className="bg-slate-900/90 px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all"
                >
                  Cancel
                </button>

                {importStep === 'preview' && (
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting || importRows.filter((r) => r.isValid).length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isImporting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Confirm & Save {importRows.filter((r) => r.isValid).length} Records to D1
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
