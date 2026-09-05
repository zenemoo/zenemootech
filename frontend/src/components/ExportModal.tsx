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
  CheckSquare,
  Square,
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
} from 'lucide-react';
import {
  EXPORT_SECTION_METADATA,
  getAvailableNonEmptyColumns,
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

  // Default filename calculation
  const defaultSlug = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanSlug = sectionId
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-');
    return `zenemoo-${cleanSlug}-${todayStr}`;
  }, [sectionId]);

  // Initialize once when the modal is opened
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setExportError(null);
      setColumnSearchQuery('');
      setCustomFilename('');

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
      // If none retained, default to all valid
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

  // Close modal on ESC keypress or trigger export on Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isExporting && selectedColumnKeys.length > 0 && activeDataset.length > 0) {
        handleDownload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose, selectedColumnKeys.length, activeDataset.length]);

  if (!isOpen) return null;

  // Execute export download
  const handleDownload = async () => {
    if (activeDataset.length === 0) {
      setExportError('No records available for export in the selected scope.');
      return;
    }

    if (selectedColumnKeys.length === 0) {
      setExportError('Please select at least one column to export.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    const activeCols = availableColumns.filter((c) => selectedColumnKeys.includes(c.key));
    const baseFilename = (customFilename.trim() || defaultSlug)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-');

    try {
      // 1. Primary Attempt: Server-Side Export Endpoint (Authenticates RBAC & Audits)
      try {
        const response = await exportApi.exportData({
          section: sectionId,
          format: exportFormat,
          columns: selectedColumnKeys,
          data: activeDataset,
          scope: exportScope,
        });

        if (response.data && response.status === 200) {
          const extension = exportFormat === 'xlsx' ? 'xlsx' : exportFormat === 'pdf' ? 'pdf' : 'csv';
          const mimeType =
            exportFormat === 'xlsx'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : exportFormat === 'pdf'
              ? 'application/pdf'
              : 'text/csv;charset=utf-8;';
          const filename = `${baseFilename}.${extension}`;

          triggerFileDownload(response.data, filename, mimeType);

          if (showToast) {
            showToast(`🚀 Export completed! ${activeDataset.length} records exported to ${filename}`, 'success');
          }
          onClose();
          return;
        }
      } catch (backendErr: any) {
        if (backendErr.response && backendErr.response.status === 403) {
          setExportError('Access Denied: You do not have RBAC authorization to export this data section.');
          setIsExporting(false);
          return;
        }
        // Graceful fallback to client generation engine
      }

      // 2. Client-Side Multilingual Export Engine
      if (exportFormat === 'csv') {
        const csvStr = generateClientCSV(activeDataset, activeCols, meta.sectionName);
        const filename = `${baseFilename}.csv`;
        triggerFileDownload(csvStr, filename, 'text/csv;charset=utf-8;');
      } else if (exportFormat === 'xlsx') {
        const buffer = await generateClientExcel(activeDataset, activeCols, meta.sectionName);
        const filename = `${baseFilename}.xlsx`;
        triggerFileDownload(
          buffer,
          filename,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else if (exportFormat === 'pdf') {
        const scopeLabel =
          exportScope === 'filtered' ? 'Current Filtered View' : 'All Database Records';
        const pdfBuffer = await generateClientPDF(activeDataset, activeCols, meta.sectionName, {
          scopeLabel,
          filterSummary: exportScope === 'filtered' ? filterSummary : undefined,
        });
        const filename = `${baseFilename}.pdf`;
        triggerFileDownload(pdfBuffer, filename, 'application/pdf');
      }

      if (showToast) {
        showToast(
          `🚀 ${meta.sectionName} exported successfully (${activeDataset.length} records, ${activeCols.length} columns)`,
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

  const totalCells = activeDataset.length * selectedColumnKeys.length;
  const isDefaultSelected = meta.defaultColumns.length > 0 &&
    meta.defaultColumns.every((c) => selectedColumnKeys.includes(c.key)) &&
    selectedColumnKeys.length === meta.defaultColumns.filter((c) => availableColumns.some((a) => a.key === c.key)).length;

  // Glassmorphic Modal Content rendered directly to document.body via Portal
  const modalContent = (
    <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-mono text-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#090d16]/95 border border-cyan-500/30 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl relative my-auto max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              <h2 id={titleId} className="text-base sm:text-lg font-bold text-white font-display">
                Download Center — {meta.sectionName}
              </h2>
            </div>
            <p id={descId} className="text-xs text-slate-400">
              Select your preferred download format, record scope, and non-empty columns.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="space-y-5 overflow-y-auto pr-1 custom-scrollbar flex-1">
          {/* Error Alert */}
          {exportError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="text-xs">{exportError}</span>
            </div>
          )}

          {/* Step 1: Select Format */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" /> 1. Select Download Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CSV */}
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileCode2 className={`w-5 h-5 ${exportFormat === 'csv' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {exportFormat === 'csv' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">CSV</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Universal • UTF-8 Compatible</div>
                </div>
              </button>

              {/* Excel / XLSX */}
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                  exportFormat === 'xlsx'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/50'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className={`w-5 h-5 ${exportFormat === 'xlsx' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {exportFormat === 'xlsx' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Excel (XLSX)</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Styled spreadsheet • Auto-filters</div>
                </div>
              </button>

              {/* PDF */}
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                  exportFormat === 'pdf'
                    ? 'bg-purple-500/15 border-purple-400 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-400/50'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileText className={`w-5 h-5 ${exportFormat === 'pdf' ? 'text-purple-400' : 'text-slate-500'}`} />
                  {exportFormat === 'pdf' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>PDF</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 font-normal">
                      {selectedColumnKeys.length <= 5
                        ? 'Portrait'
                        : selectedColumnKeys.length > 22
                        ? 'A2 Wide'
                        : selectedColumnKeys.length > 14
                        ? 'A3 Wide'
                        : 'Landscape'}
                    </span>
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">
                    {selectedColumnKeys.length <= 5
                      ? 'Portrait A4 document • Clean & compact'
                      : selectedColumnKeys.length > 14
                      ? `Adaptive ${selectedColumnKeys.length > 22 ? 'A2' : 'A3'} Landscape • More space for ${selectedColumnKeys.length} cols`
                      : 'Landscape A4 document • Wide layout'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Select Scope */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" /> 2. Select Record Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleScopeChange('filtered')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  exportScope === 'filtered'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 font-bold ring-1 ring-cyan-400/40'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" /> Current Filtered View
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {hasFiltered ? filteredDataset.length : dataset.length} active matching records
                  </div>
                </div>
                {exportScope === 'filtered' && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleScopeChange('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  exportScope === 'all'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 font-bold ring-1 ring-cyan-400/40'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-purple-400" /> All Records
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">{dataset.length} total database records</div>
                </div>
                {exportScope === 'all' && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Step 3: Column Selection with Search and Quick Presets */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> 3. Select Columns
                </label>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  selectedColumnKeys.length > 0
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                }`}>
                  {selectedColumnKeys.length} of {availableColumns.length} selected
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-bold transition-all cursor-pointer hover:border-cyan-500/30 border border-white/5"
                  title="Select all available columns"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleInvertColumns}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 text-purple-300 text-[10px] font-bold transition-all cursor-pointer hover:border-purple-500/30 border border-white/5"
                  title="Invert current column selection"
                >
                  Invert
                </button>
                {meta.defaultColumns.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetDefaultColumns}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      isDefaultSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                    }`}
                    title="Reset to recommended default columns"
                  >
                    Defaults
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAllColumns}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[10px] font-bold transition-all cursor-pointer hover:border-rose-500/30 border border-white/5"
                  title="Clear all selected columns"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Column Search Bar */}
            {availableColumns.length > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  placeholder="Filter column fields by name or keyword..."
                  className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60 transition-all font-mono"
                />
                {columnSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setColumnSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Columns Grid */}
            {availableColumns.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-xs">
                {activeDataset.length === 0
                  ? 'No records available for export.'
                  : 'No exportable data is available for the selected records.'}
              </div>
            ) : displayedColumns.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-xs space-y-1">
                <div>No columns match "{columnSearchQuery}"</div>
                <button
                  type="button"
                  onClick={() => setColumnSearchQuery('')}
                  className="text-cyan-400 hover:underline text-[11px] font-bold cursor-pointer"
                >
                  Clear column search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 pr-2 custom-scrollbar">
                {displayedColumns.map((col) => {
                  const isSelected = selectedColumnKeys.includes(col.key);
                  const isStandard = meta.defaultColumns.some((d) => d.key === col.key);

                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleColumnKey(col.key)}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 ring-1 ring-cyan-500/20'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2 flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate">{col.label}</span>
                        {!isStandard && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 font-sans">
                            Custom
                          </span>
                        )}
                      </div>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded bg-cyan-500/30 border border-cyan-400 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-cyan-300 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded bg-white/5 border border-white/20 shrink-0 group-hover:border-white/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 4: Custom Filename Prefix (Optional / Professional) */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FileEdit className="w-3 h-3 text-cyan-400" /> Export File Name Prefix (Optional)
              </label>
              <span className="text-[10px] text-cyan-400/80 font-mono">
                .{exportFormat}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder={defaultSlug}
                className="w-full px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60 font-mono"
              />
              {customFilename && (
                <button
                  type="button"
                  onClick={() => setCustomFilename('')}
                  className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-bold cursor-pointer"
                  title="Reset to default file name"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions & Live Export Insights */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {/* Live Data Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 text-slate-300 text-[11px]">
            <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1">
              📊 {activeDataset.length} Records
            </span>
            <span className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 ${
              selectedColumnKeys.length > 0
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}>
              📄 {selectedColumnKeys.length} Cols
            </span>
            <span className="px-2 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[10px] hidden sm:inline-flex items-center gap-1" title="Estimated total data cells to export">
              ⚡ {totalCells.toLocaleString()} cells
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || selectedColumnKeys.length === 0 || activeDataset.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-cyan-500/30 active:scale-95"
              title={selectedColumnKeys.length === 0 ? 'Select at least one column to download' : 'Click to download (or Ctrl+Enter)'}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};


