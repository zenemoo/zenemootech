import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  PlusCircle,
  History,
  Building,
  CreditCard,
  LayoutDashboard,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  Invoice,
  InvoiceSettings,
  BankAccount,
  InvoiceClient,
  InvoiceDashboardMetrics,
  invoiceApi,
} from '../../services/invoiceApi';
import { InvoiceDashboardView } from './InvoiceDashboardView';
import { CreateInvoiceView } from './CreateInvoiceView';
import { InvoiceHistoryView } from './InvoiceHistoryView';
import { CompanyInvoiceSettingsView } from './CompanyInvoiceSettingsView';
import { BankAccountsSettingsView } from './BankAccountsSettingsView';
import { InvoiceDetailModal } from './InvoiceDetailModal';

export type InvoiceSubTab = 'dashboard' | 'create' | 'history' | 'settings' | 'banks';

interface AdminInvoicesTabProps {
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }
  ) => void;
}

export const AdminInvoicesTab: React.FC<AdminInvoicesTabProps> = ({
  showToast,
  showConfirm,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InvoiceSubTab>('dashboard');

  // Shared Data State
  const [metrics, setMetrics] = useState<InvoiceDashboardMetrics | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [clients, setClients] = useState<InvoiceClient[]>([]);

  // History State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Editing & Detail Modal State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load All Core Invoice Dependencies
  const loadCoreData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [m, s, b, c] = await Promise.all([
        invoiceApi.getMetrics().catch(() => null),
        invoiceApi.getSettings().catch(() => null),
        invoiceApi.getBankAccounts().catch(() => []),
        invoiceApi.getClients().catch(() => []),
      ]);

      if (m) setMetrics(m);
      if (s) setSettings(s);
      if (b) setBankAccounts(b);
      if (c) setClients(c);
    } catch (err: any) {
      console.warn('[AdminInvoicesTab] Core load note:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load Invoices for History
  const loadInvoices = useCallback(async () => {
    try {
      const res = await invoiceApi.getInvoices({
        page,
        pageSize,
        status: statusFilter,
        search,
        startDate,
        endDate,
      });
      setInvoices(res.data || []);
      setTotalInvoices(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.warn('[AdminInvoicesTab] Invoices fetch note:', err.message);
    }
  }, [page, pageSize, statusFilter, search, startDate, endDate]);

  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Actions
  const handleViewInvoice = (inv: Invoice) => {
    setViewingInvoice(inv);
  };

  const handleEditDraft = (inv: Invoice) => {
    setEditingInvoice(inv);
    setActiveSubTab('create');
  };

  const handleDownloadPdf = async (inv: Invoice) => {
    try {
      await invoiceApi.downloadPdf(inv.id, inv.invoice_number);
      showToast?.('Download Started', `Downloading PDF for ${inv.invoice_number}`, 'info');
    } catch (err: any) {
      showToast?.('Download Error', err.message || 'Could not download PDF', 'error');
    }
  };

  const handleDownloadDocx = async (inv: Invoice) => {
    try {
      await invoiceApi.downloadDocx(inv.id, inv.invoice_number);
      showToast?.('Download Started', `Downloading Word (.docx) for ${inv.invoice_number}`, 'info');
    } catch (err: any) {
      showToast?.('Download Error', err.message || 'Could not download Word document', 'error');
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    try {
      await invoiceApi.deleteInvoice(inv.id);
      showToast?.('Invoice Deleted', `Invoice ${inv.invoice_number} has been permanently deleted.`, 'info');
      if (viewingInvoice?.id === inv.id) {
        setViewingInvoice(null);
      }
      loadInvoices();
      loadCoreData();
    } catch (err: any) {
      showToast?.('Delete Error', err.response?.data?.message || err.message || 'Could not delete invoice', 'error');
    }
  };

  const handleInvoiceSaved = (saved: Invoice) => {
    setEditingInvoice(null);
    loadCoreData();
    loadInvoices();
    setActiveSubTab('history');
  };

  const handleInvoiceUpdatedInHistory = (updated: Invoice) => {
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (viewingInvoice?.id === updated.id) {
      setViewingInvoice(updated);
    }
    loadCoreData();
  };

  const navTabs: Array<{ id: InvoiceSubTab; label: string; icon: React.FC<any>; count?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'create',
      label: editingInvoice ? (editingInvoice.status === 'draft' ? 'Edit Draft' : 'Edit Invoice') : 'Create Invoice',
      icon: PlusCircle,
    },
    { id: 'history', label: 'Invoice History', icon: History, count: totalInvoices },
    { id: 'settings', label: 'Company & Settings', icon: Building },
    { id: 'banks', label: 'Bank Accounts', icon: CreditCard, count: bankAccounts.length },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-2.5 rounded-xl border border-white/10 backdrop-blur-md">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {navTabs.map((t) => {
            const Icon = t.icon;
            const isSelected = activeSubTab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === 'create' && activeSubTab !== 'create') {
                    // reset editing invoice if clicking create fresh
                    setEditingInvoice(null);
                  }
                  setActiveSubTab(t.id);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Brand Domicile Pill */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 px-3 py-1.5 bg-slate-950/70 rounded-lg border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Zenemoo</span>
          <span className="text-slate-500">|</span>
          <span className="text-[11px] text-slate-400">Corporate Invoicing Gateway</span>
        </div>
      </div>

      {/* Sub-Tab View Rendering */}
      <div>
        {activeSubTab === 'dashboard' && (
          <InvoiceDashboardView
            metrics={metrics}
            recentInvoices={invoices}
            isLoading={isLoading}
            onRefresh={() => {
              loadCoreData();
              loadInvoices();
            }}
            onNavigateTab={(tab) => {
              if (tab === 'create') setEditingInvoice(null);
              setActiveSubTab(tab);
            }}
            onViewInvoice={handleViewInvoice}
            onDownloadPdf={handleDownloadPdf}
          />
        )}

        {activeSubTab === 'create' && (
          <CreateInvoiceView
            key={editingInvoice?.id || 'new'}
            settings={settings}
            bankAccounts={bankAccounts}
            clients={clients}
            editingInvoice={editingInvoice}
            onSaved={handleInvoiceSaved}
            onCancel={() => {
              setEditingInvoice(null);
              setActiveSubTab('history');
            }}
            showToast={showToast}
          />
        )}

        {activeSubTab === 'history' && (
          <InvoiceHistoryView
            invoices={invoices}
            total={totalInvoices}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            isLoading={isLoading}
            search={search}
            statusFilter={statusFilter}
            startDate={startDate}
            endDate={endDate}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            onStatusChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            onStartDateChange={(val) => {
              setStartDate(val);
              setPage(1);
            }}
            onEndDateChange={(val) => {
              setEndDate(val);
              setPage(1);
            }}
            onPageChange={(p) => setPage(p)}
            onRefresh={loadInvoices}
            onViewInvoice={handleViewInvoice}
            onEditDraft={handleEditDraft}
            onEditInvoice={handleEditDraft}
            onDownloadPdf={handleDownloadPdf}
            onDownloadDocx={handleDownloadDocx}
            onDeleteInvoice={handleDeleteInvoice}
            onInvoiceUpdated={handleInvoiceUpdatedInHistory}
            showToast={showToast}
          />
        )}

        {activeSubTab === 'settings' && (
          <CompanyInvoiceSettingsView
            initialSettings={settings}
            onSaved={(updated) => {
              setSettings(updated);
              loadCoreData();
            }}
            showToast={showToast}
          />
        )}

        {activeSubTab === 'banks' && (
          <BankAccountsSettingsView
            bankAccounts={bankAccounts}
            onRefresh={loadCoreData}
            showToast={showToast}
          />
        )}
      </div>

      {/* Detail Audit Modal */}
      {viewingInvoice && (
        <InvoiceDetailModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onEditInvoice={handleEditDraft}
          onDownloadPdf={handleDownloadPdf}
          onDownloadDocx={handleDownloadDocx}
          onDeleteInvoice={handleDeleteInvoice}
        />
      )}
    </div>
  );
};
