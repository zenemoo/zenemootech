import React, { useState, useEffect, useId, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  FileCode2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  SlidersHorizontal,
  Database,
  Filter,
  Search,
  RotateCcw,
  Layers,
  FileEdit,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  BarChart3,
} from 'lucide-react';
import {
  EXPORT_SECTION_METADATA,
  getAvailableNonEmptyColumns,
  formatFieldValue,
  exportCSV,
  exportXLSX,
  exportPDF,
  generateClientCSV,
  generateClientExcel,
  generateClientPDF,
  triggerFileDownload,
  ColumnOption,
} from '../utils/exportUtils';
import { exportApi } from '../services/api';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName?: string;
  dataset: any[];
  filteredDataset?: any[];
  defaultColumns?: ColumnOption[];
  filterSummary?: string;
  showToast?: (msg: string, type?: any) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  dataset = [],
  filteredDataset = [],
  defaultColumns,
  filterSummary,
  showToast,
}) => {
  const registeredMeta = EXPORT_SECTION_METADATA[sectionId];
  const meta = useMemo(() => ({
    sectionId,
    sectionName:
      sectionName ||
      registeredMeta?.sectionName ||
      sectionId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    defaultColumns: defaultColumns || registeredMeta?.defaultColumns || [],
  }), [sectionId, sectionName, defaultColumns, registeredMeta]);

  const titleId = useId();
  const descId = useId();

  // State
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('filtered');
  const [availableColumns, setAvailableColumns] = useState<ColumnOption[]>([]);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isChipsExpanded, setIsChipsExpanded] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    format: false,
    records: false,
    columns: false,
  });

  // Track previous open state to only initialize when modal transitions from closed -> open
  const wasOpenRef = useRef(false);

  const hasFiltered = Array.isArray(filteredDataset) && filteredDataset.length > 0;
  const activeDataset = useMemo(() => {
    return exportScope === 'filtered' && hasFiltered
      ? filteredDataset
      : Array.isArray(dataset) && dataset.length > 0
      ? dataset
      : filteredDataset;
  }, [exportScope, hasFiltered, filteredDataset, dataset]);

  // Extension helper
  const fileExtension = exportFormat === 'xlsx' ? 'xlsx' : exportFormat === 'pdf' ? 'pdf' : 'csv';

  // Default filename calculation
  const defaultSlug = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanSlug = sectionId
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
    return `zenemoo-${cleanSlug}-${todayStr}`;
  }, [sectionId]);

  // Load saved preferences if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`zenemoo_export_pref_${sectionId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.format && ['csv', 'xlsx', 'pdf'].includes(parsed.format)) {
          setExportFormat(parsed.format);
        }
      }
    } catch (_) {}
  }, [sectionId]);

  // Save preference on change
  useEffect(() => {
    try {
      localStorage.setItem(`zenemoo_export_pref_${sectionId}`, JSON.stringify({ format: exportFormat }));
    } catch (_) {}
  }, [sectionId, exportFormat]);

  // Initialize once when the modal is opened
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setExportError(null);
      setColumnSearchQuery('');
      setCustomFilename('');
      setIsChipsExpanded(false);

      const initialScope = hasFiltered ? 'filtered' : 'all';
      setExportScope(initialScope);

      const targetSet = initialScope === 'filtered' && hasFiltered ? filteredDataset : dataset;
      const nonEmpties = getAvailableNonEmptyColumns(targetSet, meta.defaultColumns);
      setAvailableColumns(nonEmpties);
      setSelectedColumnKeys(nonEmpties.map((c) => c.key));
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, hasFiltered, sectionId, meta.defaultColumns]);

  // Handle Scope toggle changes without losing user's custom deselection
  const handleScopeChange = useCallback((newScope: 'all' | 'filtered') => {
    setExportScope(newScope);
    const targetSet = newScope === 'filtered' && hasFiltered ? filteredDataset : dataset;
    const nonEmpties = getAvailableNonEmptyColumns(targetSet, meta.defaultColumns);
    setAvailableColumns(nonEmpties);

    const validKeySet = new Set(nonEmpties.map((c) => c.key));
    setSelectedColumnKeys((prev) => {
      const retained = prev.filter((k) => validKeySet.has(k));
      return retained.length > 0 ? retained : nonEmpties.map((c) => c.key);
    });
  }, [hasFiltered, filteredDataset, dataset, meta.defaultColumns]);

  // Toggle single column selection
  const toggleColumnKey = useCallback((key: string) => {
    setSelectedColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  // Quick selection tools
  const handleSelectAllColumns = useCallback(() => {
    setSelectedColumnKeys(availableColumns.map((c) => c.key));
  }, [availableColumns]);

  const handleClearAllColumns = useCallback(() => {
    setSelectedColumnKeys([]);
  }, []);

  const handleInvertColumns = useCallback(() => {
    const selectedSet = new Set(selectedColumnKeys);
    const inverted = availableColumns
      .map((c) => c.key)
      .filter((k) => !selectedSet.has(k));
    setSelectedColumnKeys(inverted);
  }, [availableColumns, selectedColumnKeys]);

  const handleResetDefaultColumns = useCallback(() => {
    const defaultKeys = new Set(meta.defaultColumns.map((c) => c.key));
    const matched = availableColumns
      .map((c) => c.key)
      .filter((k) => defaultKeys.has(k));
    setSelectedColumnKeys(matched.length > 0 ? matched : availableColumns.map((c) => c.key));
  }, [availableColumns, meta.defaultColumns]);

  // Toggle collapsible section
  const toggleSectionCollapse = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Filter columns list by search term
  const displayedColumns = useMemo(() => {
    const q = columnSearchQuery.trim().toLowerCase();
    if (!q) return availableColumns;
    return availableColumns.filter(
      (col) =>
        col.label.toLowerCase().includes(q) ||
        col.key.toLowerCase().includes(q)
    );
  }, [availableColumns, columnSearchQuery]);

  // Column Grouping Classifier
  const groupedColumns = useMemo(() => {
    const groups: Record<string, ColumnOption[]> = {
      'Basic Information': [],
      'Application Details': [],
      'Location': [],
      'Language': [],
      'Timestamps & Status': [],
      'Custom Fields': [],
    };

    displayedColumns.forEach((col) => {
      const k = col.key.toLowerCase();
      const l = col.label.toLowerCase();

      if (k.includes('id') || k.includes('name') || k.includes('email') || k.includes('phone') || k.includes('code') || k.includes('gender') || k.includes('age')) {
        groups['Basic Information'].push(col);
      } else if (k.includes('lang') || l.includes('lang') || k.includes('dialect')) {
        groups['Language'].push(col);
      } else if (k.includes('state') || k.includes('city') || k.includes('district') || k.includes('location') || k.includes('pincode') || k.includes('address')) {
        groups['Location'].push(col);
      } else if (k.includes('at') || k.includes('date') || k.includes('time') || k.includes('status') || k.includes('sync')) {
        groups['Timestamps & Status'].push(col);
      } else if (k.includes('opp') || k.includes('role') || k.includes('title') || k.includes('avail') || k.includes('exp') || k.includes('cap') || k.includes('score')) {
        groups['Application Details'].push(col);
      } else {
        groups['Custom Fields'].push(col);
      }
    });

    // Return only groups that have columns
    return Object.entries(groups).filter(([_, cols]) => cols.length > 0);
  }, [displayedColumns]);

  // Single source of truth for selected columns, strictly preserving selection order
  const selectedColumns = useMemo(() => {
    const keySet = new Set(selectedColumnKeys);
    return availableColumns.filter((col) => keySet.has(col.key));
  }, [availableColumns, selectedColumnKeys]);

  const totalCells = activeDataset.length * selectedColumns.length;

  // Estimated file size calculation
  const estimatedSizeStr = useMemo(() => {
    const cells = activeDataset.length * selectedColumns.length;
    if (cells === 0) return '~ 0 KB';
    if (exportFormat === 'csv') {
      const kb = Math.max(1, Math.round((cells * 40) / 1024));
      return `~ ${kb} KB (CSV)`;
    } else if (exportFormat === 'xlsx') {
      const kb = Math.max(5, Math.round((cells * 25) / 1024 + 10));
      return `~ ${kb} KB (XLSX)`;
    } else {
      const kb = Math.max(15, Math.round((cells * 80) / 1024 + 20));
      return `~ ${kb} KB (PDF)`;
    }
  }, [activeDataset.length, selectedColumns.length, exportFormat]);

  // Execute export download
  const handleDownload = async () => {
    // 1. Strict Validation Before Download
    if (selectedColumns.length === 0) {
      setExportError('Please select at least one column to export.');
      return;
    }

    if (activeDataset.length === 0) {
      setExportError('No records available for export in the selected scope.');
      return;
    }

    // Validate that every selected column exists in column definition
    const availableKeySet = new Set(availableColumns.map((c) => c.key));
    const missing = selectedColumns.filter((c) => !availableKeySet.has(c.key));
    if (missing.length > 0) {
      setExportError(`Unrecognized column selection: ${missing.map((c) => c.label).join(', ')}`);
      return;
    }

    setIsExporting(true);
    setExportError(null);

    const baseFilename = (customFilename.trim() || defaultSlug)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-');

    try {
      // 2. Asynchronously notify backend audit logger (non-blocking)
      exportApi.exportData({
        section: sectionId,
        format: exportFormat,
        columns: selectedColumns.map((c) => c.key),
        data: activeDataset,
        scope: exportScope,
      }).catch((auditErr: any) => {
        console.warn('[Export Audit Logger Warning]:', auditErr?.message);
      });

      // 3. Direct Client-Side Multilingual Export Engine with full columns & raw data
      if (exportFormat === 'csv') {
        const csvStr = exportCSV(activeDataset, selectedColumns, meta.sectionName);
        const filename = `${baseFilename}.csv`;
        triggerFileDownload(csvStr, filename, 'text/csv;charset=utf-8;');
      } else if (exportFormat === 'xlsx') {
        const buffer = await exportXLSX(activeDataset, selectedColumns, meta.sectionName);
        const filename = `${baseFilename}.xlsx`;
        triggerFileDownload(
          buffer,
          filename,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else if (exportFormat === 'pdf') {
        const scopeLabel =
          exportScope === 'filtered' ? 'Current Filtered View' : 'All Database Records';
        const pdfBuffer = await exportPDF(activeDataset, selectedColumns, meta.sectionName, {
          scopeLabel,
          filterSummary: exportScope === 'filtered' ? filterSummary : undefined,
        });
        const filename = `${baseFilename}.pdf`;
        triggerFileDownload(pdfBuffer, filename, 'application/pdf');
      }

      if (showToast) {
        showToast(
          `🚀 ${meta.sectionName} exported successfully (${activeDataset.length} records, ${selectedColumns.length} columns)`,
          'success'
        );
      }
      onClose();
    } catch (err: any) {
      console.error('Data Export Error:', err);
      setExportError('Unable to generate the export document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Close modal on ESC keypress or trigger export on Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isExporting && selectedColumns.length > 0 && activeDataset.length > 0) {
        handleDownload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose, selectedColumns.length, activeDataset.length]);

  if (!isOpen) return null;

  // Step scroll helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Glassmorphic Modal Content rendered directly to document.body via Portal
  const modalContent = (
    <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto font-sans text-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-7xl bg-[#090d16]/95 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl relative my-auto max-h-[94vh] flex flex-col overflow-hidden text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* ── TOP HEADER ── */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 shrink-0 bg-[#090d16]/80">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id={titleId} className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Download Center
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                  {meta.sectionName}
                </span>
              </div>
              <p id={descId} className="text-xs text-slate-400 mt-0.5">
                Export candidate applications with your preferred format, records and columns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block border-r border-white/10 pr-4">
              <div className="font-bold text-white text-sm tracking-wide">Zenemoo</div>
              <div className="text-[10px] text-slate-400">People • Data • AI</div>
            </div>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              aria-label="Close export dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── STEP PROGRESS INDICATOR ── */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#0c1220]/60 shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[580px] max-w-4xl mx-auto">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => scrollToSection('section-format')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center text-xs shadow-md shadow-cyan-500/20">
                1
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-300">Format</div>
                <div className="text-[10px] text-slate-400">Choose file type</div>
              </div>
            </button>

            <div className="h-[1px] flex-1 mx-3 bg-cyan-500/40" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => scrollToSection('section-records')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold flex items-center justify-center text-xs">
                2
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Records</div>
                <div className="text-[10px] text-slate-400">Select data scope</div>
              </div>
            </button>

            <div className="h-[1px] flex-1 mx-3 bg-white/10" />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => scrollToSection('section-columns')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold flex items-center justify-center text-xs">
                3
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Columns</div>
                <div className="text-[10px] text-slate-400">Pick fields to export</div>
              </div>
            </button>

            <div className="h-[1px] flex-1 mx-3 bg-white/10" />

            {/* Step 4 */}
            <button
              type="button"
              onClick={() => scrollToSection('section-file')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 text-slate-300 font-bold flex items-center justify-center text-xs">
                4
              </div>
              <div>
                <div className="text-xs font-bold text-slate-300">File</div>
                <div className="text-[10px] text-slate-400">Name & download</div>
              </div>
            </button>
          </div>
        </div>

        {/* ── TWO-PANEL MAIN CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {/* Error Alert */}
          {exportError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="text-xs">{exportError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── LEFT PANEL: CONFIGURATION (7 cols on desktop) ── */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-6">
              {/* 1. Select Download Format */}
              <div id="section-format" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 tracking-wide uppercase">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>1. Select Download Format</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse('format')}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    {collapsedSections.format ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections.format && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* CSV Card */}
                    <button
                      type="button"
                      onClick={() => setExportFormat('csv')}
                      className={`relative p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                        exportFormat === 'csv'
                          ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <FileCode2 className="w-5 h-5" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          exportFormat === 'csv'
                            ? 'border-cyan-400 bg-cyan-500 text-black'
                            : 'border-white/20 bg-transparent'
                        }`}>
                          {exportFormat === 'csv' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">CSV</div>
                        <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Universal • UTF-8 Compatible
                        </div>
                        <div className="text-[10px] text-cyan-400/80 font-medium mt-0.5">
                          Best for data analysis
                        </div>
                      </div>
                    </button>

                    {/* Excel (XLSX) Card */}
                    <button
                      type="button"
                      onClick={() => setExportFormat('xlsx')}
                      className={`relative p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                        exportFormat === 'xlsx'
                          ? 'bg-emerald-500/10 border-emerald-400 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/40'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          exportFormat === 'xlsx'
                            ? 'border-emerald-400 bg-emerald-500 text-black'
                            : 'border-white/20 bg-transparent'
                        }`}>
                          {exportFormat === 'xlsx' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">Excel (XLSX)</div>
                        <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Styled spreadsheet • Auto-filters
                        </div>
                        <div className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                          Best for advanced analysis
                        </div>
                      </div>
                    </button>

                    {/* PDF Card */}
                    <button
                      type="button"
                      onClick={() => setExportFormat('pdf')}
                      className={`relative p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                        exportFormat === 'pdf'
                          ? 'bg-rose-500/10 border-rose-400 text-white shadow-lg shadow-rose-500/10 ring-1 ring-rose-400/40'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          exportFormat === 'pdf'
                            ? 'border-rose-400 bg-rose-500 text-black'
                            : 'border-white/20 bg-transparent'
                        }`}>
                          {exportFormat === 'pdf' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                          <span>PDF</span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">
                            Landscape
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          A4 document • Wide layout
                        </div>
                        <div className="text-[10px] text-rose-400/80 font-medium mt-0.5">
                          Best for sharing & printing
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Select Record Scope */}
              <div id="section-records" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 tracking-wide uppercase">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>2. Select Record Scope</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse('records')}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    {collapsedSections.records ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections.records && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Filtered View Card */}
                    <button
                      type="button"
                      onClick={() => handleScopeChange('filtered')}
                      className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                        exportScope === 'filtered'
                          ? 'bg-cyan-500/10 border-cyan-400 text-white ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/5'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Filter className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white truncate">Current Filtered View</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            exportScope === 'filtered'
                              ? 'border-cyan-400 bg-cyan-500 text-black'
                              : 'border-white/20 bg-transparent'
                          }`}>
                            {exportScope === 'filtered' && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="text-xs text-cyan-300/90 font-mono mt-1">
                          {hasFiltered ? filteredDataset.length : activeDataset.length} active matching records
                        </div>
                      </div>
                    </button>

                    {/* All Records Card */}
                    <button
                      type="button"
                      onClick={() => handleScopeChange('all')}
                      className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                        exportScope === 'all'
                          ? 'bg-purple-500/10 border-purple-400 text-white ring-1 ring-purple-400/40 shadow-lg shadow-purple-500/5'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white truncate">All Records</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            exportScope === 'all'
                              ? 'border-purple-400 bg-purple-500 text-black'
                              : 'border-white/20 bg-transparent'
                          }`}>
                            {exportScope === 'all' && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="text-xs text-purple-300/90 font-mono mt-1">
                          {dataset.length || activeDataset.length} total database records
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Select Columns */}
              <div id="section-columns" className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">3. Select Columns</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                      {selectedColumns.length} of {availableColumns.length} selected
                    </span>
                  </div>

                  {/* Quick select buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllColumns}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllColumns}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={handleInvertColumns}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                    >
                      Invert
                    </button>
                  </div>
                </div>

                {/* Column Search Box */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={columnSearchQuery}
                    onChange={(e) => setColumnSearchQuery(e.target.value)}
                    placeholder="Search columns by name or keyword..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60 focus:bg-white/[0.05] transition-all"
                  />
                  {columnSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setColumnSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Grouped Columns Selection Grid */}
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                  {groupedColumns.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 italic bg-white/[0.01] rounded-2xl border border-white/5">
                      No columns match "{columnSearchQuery}".
                    </div>
                  ) : (
                    groupedColumns.map(([groupName, cols]) => (
                      <div key={groupName} className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>{groupName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({cols.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cols.map((col) => {
                            const isSelected = selectedColumnKeys.includes(col.key);
                            return (
                              <button
                                key={col.key}
                                type="button"
                                onClick={() => toggleColumnKey(col.key)}
                                className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 shadow-sm shadow-cyan-500/5'
                                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                                }`}
                              >
                                <span className="font-medium text-xs truncate max-w-[190px]" title={col.label}>
                                  {col.label}
                                </span>
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-cyan-400 bg-cyan-500 text-black'
                                    : 'border-white/20 bg-transparent'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Selected Columns Chips */}
                {selectedColumns.length > 0 && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Selected Columns ({selectedColumns.length})</span>
                      {selectedColumns.length > 8 && (
                        <button
                          type="button"
                          onClick={() => setIsChipsExpanded(!isChipsExpanded)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer"
                        >
                          {isChipsExpanded ? 'Show less' : `+${selectedColumns.length - 8} more`}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                      {(isChipsExpanded ? selectedColumns : selectedColumns.slice(0, 8)).map((col) => (
                        <span
                          key={col.key}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-mono"
                        >
                          <span className="truncate max-w-[140px]">{col.label}</span>
                          <button
                            type="button"
                            onClick={() => toggleColumnKey(col.key)}
                            className="text-cyan-400/60 hover:text-rose-400 transition-colors cursor-pointer"
                            title={`Deselect ${col.label}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {!isChipsExpanded && selectedColumns.length > 8 && (
                        <button
                          type="button"
                          onClick={() => setIsChipsExpanded(true)}
                          className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-[11px] font-mono cursor-pointer"
                        >
                          +{selectedColumns.length - 8} more
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT PANEL: EXPORT SUMMARY & PREVIEW (5 cols on desktop) ── */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-5 flex flex-col">
              {/* Card 1: Export Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3.5 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Export Summary</h3>
                    <p className="text-[10px] text-slate-400">Review your export configuration</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1 border-t border-white/5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" /> Format
                    </span>
                    <span className="font-bold text-white uppercase font-mono">{exportFormat.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-purple-400" /> Records
                    </span>
                    <span className="font-bold text-white font-mono">
                      {activeDataset.length.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({exportScope === 'filtered' ? 'Current Filtered View' : 'All Database Records'})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" /> Columns
                    </span>
                    <span className="font-bold text-cyan-300 font-mono">
                      {selectedColumns.length} selected
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Total Cells
                    </span>
                    <span className="font-bold text-white font-mono">
                      {totalCells.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({activeDataset.length} × {selectedColumns.length})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" /> Estimated Size
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">{estimatedSizeStr}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Export File Name */}
              <div id="section-file" className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileEdit className="w-3.5 h-3.5 text-slate-400" /> Export File Name (Optional)
                  </label>
                  {customFilename && (
                    <button
                      type="button"
                      onClick={() => setCustomFilename('')}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder={`${defaultSlug}.${fileExtension}`}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 font-mono focus:outline-none focus:border-cyan-400/60"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  If empty, a default name will be generated.
                </p>
              </div>

              {/* Card 3: Data Preview (First 5 records) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 flex-1 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-white">Preview (First 5 records)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Showing all {selectedColumns.length} selected {selectedColumns.length === 1 ? 'column' : 'columns'}
                  </span>
                </div>

                <div className="flex-1 min-h-[140px] max-h-[220px] overflow-auto rounded-xl border border-white/10 bg-black/40 text-[11px] custom-scrollbar">
                  {selectedColumns.length === 0 ? (
                    <div className="h-full min-h-[130px] flex items-center justify-center p-4 text-slate-500 italic">
                      Select at least one column to preview data.
                    </div>
                  ) : activeDataset.length === 0 ? (
                    <div className="h-full min-h-[130px] flex items-center justify-center p-4 text-slate-500 italic">
                      No records available in this scope.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#0c1424] border-b border-white/10 z-10">
                        <tr>
                          {selectedColumns.map((col) => (
                            <th
                              key={col.key}
                              className="px-3 py-2 text-[10px] font-bold text-cyan-400 font-mono uppercase tracking-wider whitespace-nowrap border-r border-white/5 last:border-r-0"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {activeDataset.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                            {selectedColumns.map((col) => {
                              const val = formatFieldValue(row, col.key);
                              return (
                                <td
                                  key={col.key}
                                  className="px-3 py-2 text-slate-300 text-[11px] whitespace-nowrap truncate max-w-[160px] border-r border-white/5 last:border-r-0"
                                  title={val}
                                >
                                  {val || <span className="text-slate-600 italic">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-cyan-300/90 flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Preview shows first 5 records only. Your export will include all {activeDataset.length.toLocaleString()} records with {selectedColumns.length} columns.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STICKY FOOTER ── */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#090d16]/95 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {/* Live Data Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 text-slate-300 text-[11px]">
            <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> {activeDataset.length.toLocaleString()} Records
            </span>
            <span className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${
              selectedColumns.length > 0
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}>
              <Layers className="w-3.5 h-3.5" /> {selectedColumns.length} Columns
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px] inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {totalCells.toLocaleString()} Cells
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[10px] hidden md:inline-flex items-center gap-1">
              💾 {estimatedSizeStr}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || selectedColumns.length === 0 || activeDataset.length === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-cyan-500/30 active:scale-95"
              title={selectedColumns.length === 0 ? 'Select at least one column to download' : 'Click to download (or Ctrl+Enter)'}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    Download {exportFormat === 'xlsx' ? 'Excel' : exportFormat.toUpperCase()}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
