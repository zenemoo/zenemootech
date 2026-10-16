import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Building,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Invoice, InvoiceDashboardMetrics } from '../../services/invoiceApi';

interface InvoiceDashboardViewProps {
  metrics: InvoiceDashboardMetrics | null;
  recentInvoices: Invoice[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: 'dashboard' | 'create' | 'history' | 'settings' | 'banks') => void;
  onViewInvoice: (inv: Invoice) => void;
  onDownloadPdf: (inv: Invoice) => void;
}

export const InvoiceDashboardView: React.FC<InvoiceDashboardViewProps> = ({
  metrics,
  recentInvoices,
  isLoading,
  onRefresh,
  onNavigateTab,
  onViewInvoice,
  onDownloadPdf,
}) => {
  const formatCurrency = (amount: number, curr = 'INR') => {
    const symbol = curr === 'INR' ? '₹' : curr === 'USD' ? '$' : `${curr} `;
    return `${symbol}${Number(amount || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Invoicing & Financial Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time billing analytics, authoritative document generation, and client remittance tracking.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => onNavigateTab('create')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* 2. STATS KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Invoices</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">
              {metrics ? metrics.totalInvoices : '—'}
            </span>
            <span className="text-xs text-slate-400">
              {metrics ? `${metrics.drafts} Drafts` : ''}
            </span>
          </div>
        </div>

        {/* Issued & Active */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Issued Invoices</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-300 tracking-tight">
              {metrics ? metrics.issued : '—'}
            </span>
            <span className="text-xs text-amber-400">
              {metrics && metrics.overdue > 0 ? `${metrics.overdue} Overdue` : 'Up to date'}
            </span>
          </div>
        </div>

        {/* Paid & Realized */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Settled & Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">
              {metrics ? metrics.paid : '—'}
            </span>
            <span className="text-xs text-emerald-300">
              {metrics ? formatCurrency(metrics.totalRevenue) : ''}
            </span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding Receivables</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-300 tracking-tight">
              {metrics ? formatCurrency(metrics.totalOutstanding) : '—'}
            </span>
            <span className="text-xs text-slate-400">Pending Remittance</span>
          </div>
        </div>
      </div>

      {/* 3. QUICK SHORTCUT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateTab('create')}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900/40 border border-blue-500/20 hover:border-blue-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">Generate New Invoice</h3>
          <p className="mt-1 text-xs text-slate-400">
            Create an itemized invoice with zero-padded sequencing, live preview, and snapshot locks.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('banks')}
          className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900/40 border border-emerald-500/20 hover:border-emerald-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">Bank Accounts & Remittance</h3>
          <p className="mt-1 text-xs text-slate-400">
            Configure multiple company settlement accounts, IFSC details, and SWIFT instructions.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('settings')}
          className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 hover:border-indigo-500/50 text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Building className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">Company Profile & Legal IDs</h3>
          <p className="mt-1 text-xs text-slate-400">
            Maintain Zenemoo registered address, PAN, Udyam registration, and default payment terms.
          </p>
        </button>
      </div>

      {/* 4. RECENT INVOICES LEDGER PREVIEW */}
      <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Invoices</h3>
            <p className="text-xs text-slate-400">Latest authoritative financial records generated</p>
          </div>
          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View All Invoices
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No invoices generated yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by creating your first billable invoice using the Create Invoice form.
            </p>
            <button
              onClick={() => onNavigateTab('create')}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 uppercase tracking-wider font-medium border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {recentInvoices.slice(0, 5).map((inv) => {
                  const statusColors: Record<string, string> = {
                    draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                    issued: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    partially_paid: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  };

                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-200">
                          {inv.client_snapshot?.company_name || '—'}
                        </span>
                        {inv.project_name && (
                          <span className="block text-[11px] text-slate-400">
                            {inv.project_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{inv.invoice_date}</td>
                      <td className="px-4 py-3 text-slate-400">{inv.due_date}</td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatCurrency(inv.outstanding_balance ?? inv.total_amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${
                            statusColors[inv.status] || 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDownloadPdf(inv)}
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
