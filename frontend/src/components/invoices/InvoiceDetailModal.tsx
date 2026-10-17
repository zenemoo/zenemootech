import React, { useState } from 'react';
import {
  FileText,
  X,
  Download,
  Trash2,
  Building,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  User,
  Edit,
} from 'lucide-react';
import { Invoice } from '../../services/invoiceApi';
import { formatCurrency } from '../../utils/invoicePdfGenerator';
import { InvoiceConfirmationModal } from './InvoiceConfirmationModal';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onEditInvoice?: (inv: Invoice) => void;
  onDownloadPdf: (inv: Invoice) => void;
  onDownloadDocx?: (inv: Invoice) => void;
  onDeleteInvoice?: (inv: Invoice) => Promise<void> | void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onEditInvoice,
  onDownloadPdf,
  onDownloadDocx,
  onDeleteInvoice,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!invoice) return null;

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    issued: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    partially_paid: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const client = invoice.client_snapshot || {};
  const company = invoice.company_snapshot || {};
  const bank = invoice.bank_snapshot || {};
  const outstanding = invoice.outstanding_balance ?? (invoice.total_amount - (invoice.amount_paid || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-slate-900 border border-white/10 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">{invoice.invoice_number}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                    statusColors[invoice.status] || 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {invoice.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{invoice.project_name || 'Service Engagement'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditInvoice && (
              <button
                onClick={() => {
                  onClose();
                  onEditInvoice(invoice);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/30 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                title="Edit this invoice"
              >
                <Edit className="w-3.5 h-3.5 text-amber-400" />
                Edit Invoice
              </button>
            )}

            <button
              onClick={() => onDownloadPdf(invoice)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20"
              title="Download Authoritative PDF"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>

            {onDownloadDocx && (
              <button
                onClick={() => onDownloadDocx(invoice)}
                className="px-3 py-1.5 text-xs font-semibold text-sky-200 bg-sky-950/70 hover:bg-sky-900 border border-sky-500/30 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                title="Download Editable Word (.docx) Document"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Word (.docx)
              </button>
            )}

            {onDeleteInvoice && (
              !((invoice.payments && invoice.payments.length > 0) || (Number(invoice.amount_paid) || 0) > 0) ? (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg flex items-center gap-1.5 transition-all"
                  title="Permanently delete invoice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              ) : (
                <span
                  className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-800/50 rounded-lg border border-white/5 cursor-not-allowed flex items-center gap-1"
                  title="Invoices with recorded payments cannot be deleted to preserve financial audit trail."
                >
                  <ShieldCheck className="w-3 h-3 text-slate-500" />
                  Protected
                </span>
              )
            )}

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {/* Cancellation Alert if Cancelled */}
          {invoice.status === 'cancelled' && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300">
              <Ban className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-rose-200">Invoice Cancelled</h4>
                <p className="text-[11px] mt-0.5">
                  Reason: "{invoice.cancellation_reason || 'Administrative cancellation'}"
                </p>
                <p className="text-[10px] text-rose-400 mt-1">
                  Cancelled by {invoice.cancelled_by} on{' '}
                  {invoice.cancelled_at ? new Date(invoice.cancelled_at).toLocaleString() : ''}
                </p>
              </div>
            </div>
          )}

          {/* Timing & Dates Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-950 border border-white/5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Invoice Date</span>
              <p className="text-sm font-semibold text-white mt-0.5">{invoice.invoice_date}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Due Date</span>
              <p className="text-sm font-semibold text-white mt-0.5">{invoice.due_date}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Payment Terms</span>
              <p className="text-sm font-semibold text-white mt-0.5">{invoice.payment_terms || 'Net 15 Days'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Currency</span>
              <p className="text-sm font-semibold text-blue-400 mt-0.5">{invoice.currency}</p>
            </div>
          </div>

          {/* Snapshots Comparison (Client vs Company vs Bank) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Snapshot */}
            <div className="p-4 rounded-lg bg-slate-950 border border-white/5 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Building className="w-4 h-4" />
                <span>Billed-To Client (Snapshot)</span>
              </div>
              <div className="text-slate-300 space-y-1">
                <p className="font-bold text-white text-sm">{client.company_name || '—'}</p>
                {client.contact_person && <p>Attn: {client.contact_person}</p>}
                <p className="text-slate-400">
                  {[client.address, client.city, client.state, client.postal_code, client.country].filter(Boolean).join(', ')}
                </p>
                <p className="text-slate-400">Email: {client.billing_email || '—'}</p>
                {client.pan_number && <p className="font-mono text-slate-300">PAN: {client.pan_number}</p>}
                {client.gstin && <p className="font-mono text-slate-300">GSTIN: {client.gstin}</p>}
              </div>
            </div>

            {/* Bank Snapshot */}
            <div className="p-4 rounded-lg bg-slate-950 border border-white/5 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <CreditCard className="w-4 h-4" />
                <span>Remittance Account (Frozen Snapshot)</span>
              </div>
              <div className="text-slate-300 space-y-1">
                <p className="font-bold text-white text-sm">{bank.account_display_name || bank.bank_name || '—'}</p>
                <p>Bank: {bank.bank_name}</p>
                <p className="font-mono text-slate-200">A/C: {bank.account_number} ({bank.account_type || 'Current'})</p>
                <p className="font-mono text-blue-400">IFSC: {bank.ifsc_code}</p>
                {bank.branch_name && <p className="text-slate-400">Branch: {bank.branch_name}</p>}
                {bank.swift_bic_code && <p className="font-mono text-slate-400">SWIFT: {bank.swift_bic_code}</p>}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white">Itemized Services</h4>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-slate-400 font-medium">
                  <tr>
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5">Service Description</th>
                    <th className="p-2.5 text-right w-24">Quantity</th>
                    <th className="p-2.5 text-right w-28">Rate</th>
                    <th className="p-2.5 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {(invoice.line_items || []).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-white">{item.description}</td>
                      <td className="p-2.5 text-right text-slate-400">
                        {item.quantity} {item.unit || ''}
                      </td>
                      <td className="p-2.5 text-right text-slate-300">
                        {formatCurrency(item.rate, invoice.currency)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-white">
                        {formatCurrency(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 font-medium">Amount in Words:</span>
                <p className="text-white font-semibold italic mt-0.5">{invoice.amount_in_words}</p>
              </div>
              {invoice.invoice_notes && (
                <div className="pt-2">
                  <span className="text-slate-400 font-medium">Invoice Notes:</span>
                  <p className="text-slate-300 mt-0.5">{invoice.invoice_notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-white/5 space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-medium text-white">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {(invoice.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>-{formatCurrency(invoice.discount_amount || 0, invoice.currency)}</span>
                </div>
              )}
              {invoice.tax_enabled && (
                <div className="flex justify-between text-slate-400">
                  <span>{invoice.tax_label} ({invoice.tax_rate}%):</span>
                  <span>+{formatCurrency(invoice.tax_amount || 0, invoice.currency)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm text-white">
                <span>Total Due:</span>
                <span className="text-blue-400">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Amount Paid:</span>
                <span>{formatCurrency(invoice.amount_paid || 0, invoice.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-400 border-t border-white/5 pt-1">
                <span>Outstanding Balance:</span>
                <span>{formatCurrency(outstanding, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment History Ledger */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Payment Remittance Ledger
              </h4>
              <div className="rounded-lg border border-white/10 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-slate-400">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {invoice.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2 font-medium">{p.payment_date}</td>
                        <td className="p-2">{p.payment_method}</td>
                        <td className="p-2 font-mono text-slate-400">{p.reference_number || '—'}</td>
                        <td className="p-2 text-right font-semibold text-emerald-400">
                          {formatCurrency(p.amount, p.currency)}
                        </td>
                        <td className="p-2 text-slate-400">{p.recorded_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Lifecycle Footer */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <div>
              Created by <span className="text-slate-300">{invoice.created_by}</span> on{' '}
              {invoice.created_at ? new Date(invoice.created_at).toLocaleString() : '—'}
            </div>
            {invoice.include_signature ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Authorized Signature Attached</span>
              </div>
            ) : (
              <div className="text-slate-500 italic">No signature requested</div>
            )}
            {invoice.issued_at && (
              <div>
                Issued by <span className="text-blue-400">{invoice.issued_by}</span> on{' '}
                {new Date(invoice.issued_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Invoice Confirmation Modal */}
      <InvoiceConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onDeleteInvoice?.(invoice);
            setShowDeleteModal(false);
            onClose();
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Invoice Record"
        message={`Are you sure you want to permanently delete invoice ${invoice.invoice_number}?`}
        description="This will permanently delete this invoice record from the database and remove the PDF document from Cloudflare R2. This action cannot be undone."
        details={[
          { label: 'Invoice Number', value: invoice.invoice_number },
          { label: 'Client', value: client.company_name || 'N/A' },
          { label: 'Total Amount', value: formatCurrency(invoice.total_amount, invoice.currency) },
          { label: 'Status', value: invoice.status.toUpperCase() },
        ]}
        confirmText="Delete Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
