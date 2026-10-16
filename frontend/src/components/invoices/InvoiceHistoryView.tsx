import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Edit,
  DollarSign,
  Ban,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  X,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { Invoice, invoiceApi } from '../../services/invoiceApi';
import { InvoiceConfirmationModal } from './InvoiceConfirmationModal';

interface InvoiceHistoryViewProps {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  onSearchChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onPageChange: (newPage: number) => void;
  onRefresh: () => void;
  onViewInvoice: (inv: Invoice) => void;
  onEditDraft: (inv: Invoice) => void;
  onDownloadPdf: (inv: Invoice) => void;
  onDownloadDocx?: (inv: Invoice) => void;
  onDeleteInvoice?: (inv: Invoice) => Promise<void> | void;
  onInvoiceUpdated: (updated: Invoice) => void;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  invoices,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  search,
  statusFilter,
  startDate,
  endDate,
  onSearchChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
  onPageChange,
  onRefresh,
  onViewInvoice,
  onEditDraft,
  onDownloadPdf,
  onDownloadDocx,
  onDeleteInvoice,
  onInvoiceUpdated,
  showToast,
}) => {
  // Modal states
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [cancelModalInvoice, setCancelModalInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Delete invoice state
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Status Colors
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    issued: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    partially_paid: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const formatCurrency = (amount: number, curr = 'INR') => {
    const symbol = curr === 'INR' ? '₹' : curr === 'USD' ? '$' : `${curr} `;
    return `${symbol}${Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Open Payment Modal
  const openPaymentModal = (inv: Invoice) => {
    setPaymentModalInvoice(inv);
    const outstanding = inv.outstanding_balance ?? (inv.total_amount - (inv.amount_paid || 0));
    setPaymentAmount(Math.max(0, outstanding));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Bank Transfer');
    setPaymentRef('');
    setPaymentNotes('');
  };

  // Handle Record Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    if (paymentAmount <= 0) {
      showToast?.('Invalid Amount', 'Please enter a payment amount greater than zero.', 'warning');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await invoiceApi.recordPayment(paymentModalInvoice.id, {
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: paymentRef,
        notes: paymentNotes,
      });

      showToast?.('Payment Recorded', `Payment of ${formatCurrency(paymentAmount, paymentModalInvoice.currency)} recorded.`, 'success');
      onInvoiceUpdated(res.data);
      setPaymentModalInvoice(null);
    } catch (err: any) {
      showToast?.('Payment Failed', err.response?.data?.message || err.message || 'Could not record payment', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Cancel Submit
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalInvoice) return;
    if (!cancelReason.trim()) {
      showToast?.('Reason Required', 'A reason is required for financial audit tracking.', 'warning');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await invoiceApi.cancelInvoice(cancelModalInvoice.id, cancelReason);
      showToast?.('Invoice Cancelled', `Invoice ${res.invoice_number} has been cancelled.`, 'info');
      onInvoiceUpdated(res);
      setCancelModalInvoice(null);
      setCancelReason('');
    } catch (err: any) {
      showToast?.('Cancellation Failed', err.response?.data?.message || err.message || 'Could not cancel invoice', 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & SEARCH / FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Invoice History & Financial Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of drafted, issued, settled, and cancelled invoices.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice #, client, project..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Dropdown */}
        <div className="lg:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts Only</option>
            <option value="issued">Issued / Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Fully Settled (Paid)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="lg:col-span-2">
          <input
            type="date"
            placeholder="From Date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            title="Start Date"
          />
        </div>

        {/* End Date */}
        <div className="lg:col-span-2">
          <input
            type="date"
            placeholder="To Date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            title="End Date"
          />
        </div>

        {/* Clear Filters */}
        <div className="lg:col-span-1">
          <button
            onClick={() => {
              onSearchChange('');
              onStatusChange('all');
              onStartDateChange('');
              onEndDateChange('');
            }}
            className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-center"
            title="Reset Filters"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 2. INVOICE TABLE */}
      <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-xs">Loading invoice records...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No matching invoices found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or date filters to find older records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 uppercase tracking-wider font-medium border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {invoices.map((inv) => {
                  const outstanding = inv.outstanding_balance ?? (inv.total_amount - (inv.amount_paid || 0));

                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        {inv.invoice_number}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-200">
                          {inv.client_snapshot?.company_name || '—'}
                        </span>
                        {inv.project_name && (
                          <span className="block text-[11px] text-slate-400 truncate max-w-[180px]">
                            {inv.project_name}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-400">
                        <div>Inv: <span className="text-slate-300 font-medium">{inv.invoice_date}</span></div>
                        <div>Due: <span className="text-slate-400">{inv.due_date}</span></div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-white">
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`font-semibold ${outstanding > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {formatCurrency(outstanding, inv.currency)}
                        </span>
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

                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        <div>{inv.created_by || 'admin'}</div>
                        <div className="text-[10px] text-slate-500">
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Audit Details */}
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => onDownloadPdf(inv)}
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                            title="Download Authoritative PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Word (.docx) */}
                          {onDownloadDocx && (
                            <button
                              onClick={() => onDownloadDocx(inv)}
                              className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded transition-colors"
                              title="Download Word (.docx)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Draft */}
                          {inv.status === 'draft' && (
                            <button
                              onClick={() => onEditDraft(inv)}
                              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded transition-colors"
                              title="Edit Draft"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Record Payment */}
                          {(inv.status === 'issued' || inv.status === 'partially_paid') && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel Invoice */}
                          {inv.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancelModalInvoice(inv)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                              title="Cancel Invoice"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Invoice */}
                          {onDeleteInvoice && (
                            !((inv.payments && inv.payments.length > 0) || (Number(inv.amount_paid) || 0) > 0) ? (
                              <button
                                onClick={() => setInvoiceToDelete(inv)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                                title="Delete Invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                className="p-1.5 text-slate-600 cursor-not-allowed opacity-30"
                                title="Invoices with recorded payments cannot be deleted"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {invoices.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, total)} of {total} invoices
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-200">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. RECORD PAYMENT MODAL */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Record Payment for {paymentModalInvoice.invoice_number}
              </h3>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-white/10 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Client:</span>
                  <span className="font-medium text-white">{paymentModalInvoice.client_snapshot?.company_name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(paymentModalInvoice.total_amount, paymentModalInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Already Paid:</span>
                  <span>{formatCurrency(paymentModalInvoice.amount_paid || 0, paymentModalInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold pt-1 border-t border-white/10">
                  <span>Outstanding Balance:</span>
                  <span>
                    {formatCurrency(
                      paymentModalInvoice.outstanding_balance ??
                        (paymentModalInvoice.total_amount - (paymentModalInvoice.amount_paid || 0)),
                      paymentModalInvoice.currency
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment Amount ({paymentModalInvoice.currency}) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Wire Transfer">International Wire</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Transaction / UTR Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UTR10293812739"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Milestone settlement remark..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CANCEL INVOICE MODAL */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Cancel Invoice {cancelModalInvoice.invoice_number}
              </h3>
              <button
                onClick={() => setCancelModalInvoice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-slate-300">
                Are you sure you want to cancel this invoice? This will invalidate the invoice and preserve an audit log. The record will not be deleted.
              </p>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Cancellation Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Scope revised by client, milestone replaced by amendment..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalInvoice(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg disabled:opacity-50"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      <InvoiceConfirmationModal
        isOpen={!!invoiceToDelete}
        onClose={() => !isDeletingInvoice && setInvoiceToDelete(null)}
        onConfirm={async () => {
          if (!invoiceToDelete) return;
          setIsDeletingInvoice(true);
          try {
            await onDeleteInvoice?.(invoiceToDelete);
            setInvoiceToDelete(null);
          } finally {
            setIsDeletingInvoice(false);
          }
        }}
        title="Delete Invoice Record"
        message={`Are you sure you want to permanently delete invoice ${invoiceToDelete?.invoice_number}?`}
        description="This will permanently delete this invoice record from the database and remove the PDF document from Cloudflare R2. This action cannot be undone."
        details={
          invoiceToDelete
            ? [
                { label: 'Invoice Number', value: invoiceToDelete.invoice_number },
                { label: 'Client', value: invoiceToDelete.client_snapshot?.company_name || 'N/A' },
                {
                  label: 'Total Amount',
                  value: formatCurrency(invoiceToDelete.total_amount, invoiceToDelete.currency),
                },
                { label: 'Status', value: invoiceToDelete.status.toUpperCase() },
              ]
            : []
        }
        confirmText="Delete Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingInvoice}
      />
    </div>
  );
};
