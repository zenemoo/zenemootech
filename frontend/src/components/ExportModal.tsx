import React, { useState, useEffect, useId } from 'react';
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
  dataset: any[];
  filteredDataset?: any[];
  showToast?: (msg: string, type?: any) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sectionId,
  dataset = [],
  filteredDataset = [],
  showToast,
}) => {
  const meta = EXPORT_SECTION_METADATA[sectionId] || {
    sectionId,
    sectionName: sectionId.replace(/-/g, ' ').toUpperCase(),
    defaultColumns: [],
  };

  const titleId = useId();
  const descId = useId();

  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('filtered');
  const [availableColumns, setAvailableColumns] = useState<ColumnOption[]>([]);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const activeDataset =
    exportScope === 'filtered' && Array.isArray(filteredDataset) && filteredDataset.length > 0
      ? filteredDataset
      : dataset;

  // Initialize available non-empty columns whenever modal opens or dataset changes
  useEffect(() => {
    if (!isOpen) return;

    setExportError(null);
    const nonEmpties = getAvailableNonEmptyColumns(activeDataset, meta.defaultColumns);
    setAvailableColumns(nonEmpties);
    setSelectedColumnKeys(nonEmpties.map((c) => c.key));

    // Default scope logic: if filtering is active, default to filtered view
    if (Array.isArray(filteredDataset) && filteredDataset.length > 0 && filteredDataset.length < dataset.length) {
      setExportScope('filtered');
    } else {
      setExportScope('all');
    }
  }, [isOpen, sectionId, activeDataset.length, dataset.length]);

  // Re-evaluate columns if scope toggles
  const handleScopeChange = (newScope: 'all' | 'filtered') => {
    setExportScope(newScope);
    const targetSet =
      newScope === 'filtered' && Array.isArray(filteredDataset) && filteredDataset.length > 0
        ? filteredDataset
        : dataset;
    const nonEmpties = getAvailableNonEmptyColumns(targetSet, meta.defaultColumns);
    setAvailableColumns(nonEmpties);
    // Retain user's existing selections if still non-empty
    const validKeySet = new Set(nonEmpties.map((c) => c.key));
    const retained = selectedColumnKeys.filter((k) => validKeySet.has(k));
    setSelectedColumnKeys(retained.length > 0 ? retained : nonEmpties.map((c) => c.key));
  };

  // Close modal on ESC keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  const handleSelectAllColumns = () => {
    setSelectedColumnKeys(availableColumns.map((c) => c.key));
  };

  const handleClearAllColumns = () => {
    setSelectedColumnKeys([]);
  };

  const toggleColumnKey = (key: string) => {
    setSelectedColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleDownload = async () => {
    if (selectedColumnKeys.length === 0) {
      setExportError('Please select at least one column to export.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    const activeCols = availableColumns.filter((c) => selectedColumnKeys.includes(c.key));
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanName = meta.sectionName.replace(/[^a-zA-Z0-9\s&_-]/g, '').trim();

    try {
      // 1. Attempt Backend Server-Side Export (Primary for audit logging & security)
      try {
        const response = await exportApi.exportData({
          section: sectionId,
          format: exportFormat,
          columns: selectedColumnKeys,
          data: activeDataset,
          scope: exportScope,
        });

        if (response.data) {
          const extension = exportFormat === 'xlsx' ? 'xlsx' : exportFormat === 'pdf' ? 'pdf' : 'csv';
          const mimeType =
            exportFormat === 'xlsx'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : exportFormat === 'pdf'
              ? 'application/pdf'
              : 'text/csv;charset=utf-8;';
          const filename = `Zenemoo - ${cleanName} - ${todayStr}.${extension}`;

          triggerFileDownload(response.data, filename, mimeType);

          if (showToast) {
            showToast(`🚀 Export completed! ${activeDataset.length} records saved to ${filename}`, 'success');
          }
          onClose();
          return;
        }
      } catch (backendErr: any) {
        console.warn('Backend export notice (falling back to client engine):', backendErr.message);
      }

      // 2. Client-Side Fallback Export Engine
      if (exportFormat === 'csv') {
        const csvStr = generateClientCSV(activeDataset, activeCols, meta.sectionName);
        const filename = `Zenemoo - ${cleanName} - ${todayStr}.csv`;
        triggerFileDownload(csvStr, filename, 'text/csv;charset=utf-8;');
      } else if (exportFormat === 'xlsx') {
        const buffer = await generateClientExcel(activeDataset, activeCols, meta.sectionName);
        const filename = `Zenemoo - ${cleanName} - ${todayStr}.xlsx`;
        triggerFileDownload(
          buffer,
          filename,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else if (exportFormat === 'pdf') {
        const pdfBuffer = generateClientPDF(activeDataset, activeCols, meta.sectionName);
        const filename = `Zenemoo - ${cleanName} - ${todayStr}.pdf`;
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
      setExportError('Unable to generate the export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-mono text-xs">
      <div
        className="w-full max-w-2xl bg-[#090d16] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 id={titleId} className="text-base font-bold text-white font-display">
                Export Data — {meta.sectionName}
              </h2>
            </div>
            <p id={descId} className="text-xs text-slate-400">
              Configure export format, scope, and column selections. Completely empty columns are automatically omitted.
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

        {/* Error Alert */}
        {exportError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Step 1: Select Format */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            1. Select Export Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CSV */}
            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                exportFormat === 'csv'
                  ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileCode2 className={`w-6 h-6 ${exportFormat === 'csv' ? 'text-cyan-400' : 'text-slate-500'}`} />
                {exportFormat === 'csv' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <div>
                <div className="font-bold text-sm text-white">CSV</div>
                <div className="text-[10px] opacity-75 mt-0.5">UTF-8 BOM • Universal</div>
              </div>
            </button>

            {/* Excel / XLSX */}
            <button
              type="button"
              onClick={() => setExportFormat('xlsx')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                exportFormat === 'xlsx'
                  ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet className={`w-6 h-6 ${exportFormat === 'xlsx' ? 'text-emerald-400' : 'text-slate-500'}`} />
                {exportFormat === 'xlsx' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <div>
                <div className="font-bold text-sm text-white">Excel (XLSX)</div>
                <div className="text-[10px] opacity-75 mt-0.5">Formatted • Filters Enabled</div>
              </div>
            </button>

            {/* PDF */}
            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                exportFormat === 'pdf'
                  ? 'bg-purple-500/15 border-purple-400 text-white shadow-lg shadow-purple-500/10'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileText className={`w-6 h-6 ${exportFormat === 'pdf' ? 'text-purple-400' : 'text-slate-500'}`} />
                {exportFormat === 'pdf' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
              </div>
              <div>
                <div className="font-bold text-sm text-white">PDF Document</div>
                <div className="text-[10px] opacity-75 mt-0.5">Print Ready • Confidential Header</div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Select Scope (Current Filtered vs All) */}
        {Array.isArray(filteredDataset) && filteredDataset.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              2. Select Record Scope
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleScopeChange('filtered')}
                className={`px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  exportScope === 'filtered'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs">Current Filtered View</div>
                  <div className="text-[10px] opacity-70">{filteredDataset.length} active records</div>
                </div>
                {exportScope === 'filtered' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleScopeChange('all')}
                className={`px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  exportScope === 'all'
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs">All Records</div>
                  <div className="text-[10px] opacity-70">{dataset.length} total records</div>
                </div>
                {exportScope === 'all' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Column Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              3. Select Columns ({selectedColumnKeys.length} of {availableColumns.length})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllColumns}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllColumns}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-300 text-[11px] font-bold transition-all cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {availableColumns.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-xs">
              No non-empty data columns available in the selected record set.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 pr-2 custom-scrollbar">
              {availableColumns.map((col) => {
                const isSelected = selectedColumnKeys.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumnKey(col.key)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                    }`}
                  >
                    <span className="font-semibold text-xs truncate pr-2">{col.label}</span>
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Footer & Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-300 text-[11px]">
            <span className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold">
              📊 {activeDataset.length} Records
            </span>
            <span className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold">
              📑 {selectedColumnKeys.length} Columns
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
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
              disabled={isExporting || selectedColumnKeys.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Preparing export...</span>
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
};
