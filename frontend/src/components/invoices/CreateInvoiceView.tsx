import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Download,
  Building,
  CreditCard,
  Calendar,
  AlertCircle,
  Eye,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  Percent,
} from 'lucide-react';
import {
  Invoice,
  InvoiceSettings,
  BankAccount,
  InvoiceClient,
  InvoiceLineItem,
  invoiceApi,
} from '../../services/invoiceApi';
import { formatAmountInWords, generateInvoicePdfDoc } from '../../utils/invoicePdfGenerator';

interface CreateInvoiceViewProps {
  settings: InvoiceSettings | null;
  bankAccounts: BankAccount[];
  clients: InvoiceClient[];
  editingInvoice?: Invoice | null;
  onSaved: (inv: Invoice) => void;
  onCancel: () => void;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({
  settings,
  bankAccounts,
  clients,
  editingInvoice,
  onSaved,
  onCancel,
  showToast,
}) => {
  const isEditing = Boolean(editingInvoice && editingInvoice.id);

  // Form State
  const [invoiceDate, setInvoiceDate] = useState(() => {
    return editingInvoice?.invoice_date || new Date().toISOString().split('T')[0];
  });

  const [paymentTerms, setPaymentTerms] = useState(() => {
    return editingInvoice?.payment_terms || settings?.default_payment_terms || 'Net 15 Days';
  });

  const calculateDueDate = (fromDate: string, terms: string): string => {
    const base = new Date(fromDate || new Date());
    let daysToAdd = 15;
    if (terms.includes('30')) daysToAdd = 30;
    else if (terms.includes('60')) daysToAdd = 60;
    else if (terms.includes('7')) daysToAdd = 7;
    else if (terms.includes('Receipt')) daysToAdd = 0;

    base.setDate(base.getDate() + daysToAdd);
    return base.toISOString().split('T')[0];
  };

  const [dueDate, setDueDate] = useState(() => {
    return editingInvoice?.due_date || calculateDueDate(invoiceDate, paymentTerms);
  });

  const [serviceStart, setServiceStart] = useState(() => editingInvoice?.service_period_start || '');
  const [serviceEnd, setServiceEnd] = useState(() => editingInvoice?.service_period_end || '');
  const [invoicePeriod, setInvoicePeriod] = useState(() => editingInvoice?.invoice_period || '');
  const [poReference, setPoReference] = useState(() => editingInvoice?.po_reference || '');

  // Currency & Project
  const [currency, setCurrency] = useState(() => editingInvoice?.currency || settings?.default_currency || 'INR');
  const [projectName, setProjectName] = useState(() => editingInvoice?.project_name || 'AI Speech & Data Services');
  const [projectDescription, setProjectDescription] = useState(() => editingInvoice?.project_description || '');

  // Client Details
  const [selectedClientId, setSelectedClientId] = useState(() => editingInvoice?.client_id || '');
  const [clientCompanyName, setClientCompanyName] = useState(() => editingInvoice?.client_snapshot?.company_name || '');
  const [clientContactPerson, setClientContactPerson] = useState(() => editingInvoice?.client_snapshot?.contact_person || '');
  const [clientBillingEmail, setClientBillingEmail] = useState(() => editingInvoice?.client_snapshot?.billing_email || '');
  const [clientPhone, setClientPhone] = useState(() => editingInvoice?.client_snapshot?.phone || '');
  const [clientAddress, setClientAddress] = useState(() => editingInvoice?.client_snapshot?.address || '');
  const [clientCity, setClientCity] = useState(() => editingInvoice?.client_snapshot?.city || '');
  const [clientState, setClientState] = useState(() => editingInvoice?.client_snapshot?.state || '');
  const [clientPostalCode, setClientPostalCode] = useState(() => editingInvoice?.client_snapshot?.postal_code || '');
  const [clientCountry, setClientCountry] = useState(() => editingInvoice?.client_snapshot?.country || 'India');
  const [clientPan, setClientPan] = useState(() => editingInvoice?.client_snapshot?.pan_number || '');
  const [clientGstin, setClientGstin] = useState(() => editingInvoice?.client_snapshot?.gstin || '');
  const [saveClientForFuture, setSaveClientForFuture] = useState(false);

  // Bank Account Selection
  const activeBanks = useMemo(() => bankAccounts.filter((b) => b.is_active), [bankAccounts]);
  const defaultBank = useMemo(
    () => activeBanks.find((b) => b.is_default) || activeBanks[0],
    [activeBanks]
  );
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    return editingInvoice?.bank_account_id || defaultBank?.id || '';
  });

  const selectedBankAccount = useMemo(() => {
    return activeBanks.find((b) => b.id === selectedBankId) || defaultBank || ({} as BankAccount);
  }, [activeBanks, selectedBankId, defaultBank]);

  // Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => {
    if (editingInvoice?.line_items && editingInvoice.line_items.length > 0) {
      return editingInvoice.line_items;
    }
    return [
      {
        id: 'item_1',
        serial_number: 1,
        description: 'AI Dataset Annotation & Speech Data Processing',
        quantity: 1,
        unit: 'Milestone',
        rate: 25000,
        amount: 25000,
      },
    ];
  });

  // Financial Discounts & Tax
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(
    editingInvoice?.discount_type || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState<number>(editingInvoice?.discount_value || 0);

  const [taxEnabled, setTaxEnabled] = useState<boolean>(() => {
    if (editingInvoice?.tax_enabled !== undefined) return Boolean(editingInvoice.tax_enabled);
    return Boolean(settings?.default_tax_enabled);
  });
  const [taxLabel, setTaxLabel] = useState<string>(
    editingInvoice?.tax_label || settings?.default_tax_label || 'GST'
  );
  const [taxRate, setTaxRate] = useState<number>(
    editingInvoice?.tax_rate !== undefined ? editingInvoice.tax_rate : settings?.default_tax_rate || 18
  );

  // Notes & Signatory
  const [invoiceNotes, setInvoiceNotes] = useState(() => {
    return editingInvoice?.invoice_notes || settings?.default_invoice_notes || '';
  });
  const [signatoryName, setSignatoryName] = useState(() => {
    return settings?.authorized_signatory_name || 'Prem Prasad';
  });

  // Loading & View States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Recalculate due date when terms change
  const handleTermsChange = (newTerms: string) => {
    setPaymentTerms(newTerms);
    setDueDate(calculateDueDate(invoiceDate, newTerms));
  };

  // Autofill client when selected from saved list
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClientCompanyName(found.company_name);
      setClientContactPerson(found.contact_person || '');
      setClientBillingEmail(found.billing_email);
      setClientPhone(found.phone || '');
      setClientAddress(found.address);
      setClientCity(found.city);
      setClientState(found.state);
      setClientPostalCode(found.postal_code);
      setClientCountry(found.country || 'India');
      setClientPan(found.pan_number || '');
      setClientGstin(found.gstin || '');
    }
  };

  // Line item manipulation
  const updateLineItem = (index: number, field: keyof InvoiceLineItem, val: any) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: val };

      const qty = Math.max(0, Number(field === 'quantity' ? val : item.quantity) || 0);
      const rate = Math.max(0, Number(field === 'rate' ? val : item.rate) || 0);
      item.amount = Math.round(qty * rate * 100) / 100;

      copy[index] = item;
      return copy;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        serial_number: prev.length + 1,
        description: '',
        quantity: 1,
        unit: 'Units',
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, serial_number: idx + 1 }))
    );
  };

  // Financial Totals Calculation
  const subtotal = useMemo(() => {
    const sum = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [lineItems]);

  const discountAmount = useMemo(() => {
    const val = Math.max(0, Number(discountValue) || 0);
    if (val <= 0) return 0;
    if (discountType === 'percentage') {
      return Math.round(((subtotal * val) / 100) * 100) / 100;
    }
    return Math.min(subtotal, Math.round(val * 100) / 100);
  }, [subtotal, discountType, discountValue]);

  const discountedSubtotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const taxAmount = useMemo(() => {
    if (!taxEnabled) return 0;
    const rate = Math.max(0, Number(taxRate) || 0);
    return Math.round(((discountedSubtotal * rate) / 100) * 100) / 100;
  }, [taxEnabled, taxRate, discountedSubtotal]);

  const totalAmount = useMemo(() => {
    return Math.round((discountedSubtotal + taxAmount) * 100) / 100;
  }, [discountedSubtotal, taxAmount]);

  const amountInWords = useMemo(() => {
    return formatAmountInWords(totalAmount, currency);
  }, [totalAmount, currency]);

  // Construct current preview invoice object
  const previewInvoiceData: Partial<Invoice> = useMemo(() => {
    return {
      invoice_number: editingInvoice?.invoice_number || 'ZEN-INV-2026-PREVIEW',
      invoice_date: invoiceDate,
      due_date: dueDate,
      service_period_start: serviceStart || undefined,
      service_period_end: serviceEnd || undefined,
      invoice_period: invoicePeriod || undefined,
      po_reference: poReference || undefined,
      currency,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      tax_enabled: taxEnabled,
      tax_label: taxLabel,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_in_words: amountInWords,
      project_name: projectName,
      project_description: projectDescription,
      line_items: lineItems,
      client_snapshot: {
        company_name: clientCompanyName || 'Client Company Name',
        contact_person: clientContactPerson,
        billing_email: clientBillingEmail,
        phone: clientPhone,
        address: clientAddress,
        city: clientCity,
        state: clientState,
        postal_code: clientPostalCode,
        country: clientCountry,
        pan_number: clientPan,
        gstin: clientGstin,
      },
      company_snapshot: {
        legal_name: settings?.legal_name || 'Zenemoo',
        display_name: 'Zenemoo', // Never modified
        registered_address: settings?.registered_address || 'K. Barida, Main Road',
        city: settings?.city || 'Ganjam',
        state: settings?.state || 'Odisha',
        postal_code: settings?.postal_code || '761031',
        country: settings?.country || 'India',
        official_email: settings?.official_email || 'contact@zenemoo.in',
        contact_number: settings?.contact_number || '+91 9827775230',
        pan_number: settings?.pan_number || '',
        udyam_registration: settings?.udyam_registration || '',
        gstin: settings?.gstin || '',
        authorized_signatory_name: signatoryName,
        default_invoice_notes: invoiceNotes,
      },
      bank_snapshot: selectedBankAccount,
      payment_terms: paymentTerms,
      invoice_notes: invoiceNotes,
      status: editingInvoice?.status || 'draft',
    };
  }, [
    editingInvoice,
    invoiceDate,
    dueDate,
    serviceStart,
    serviceEnd,
    invoicePeriod,
    poReference,
    currency,
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxEnabled,
    taxLabel,
    taxRate,
    taxAmount,
    totalAmount,
    amountInWords,
    projectName,
    projectDescription,
    lineItems,
    clientCompanyName,
    clientContactPerson,
    clientBillingEmail,
    clientPhone,
    clientAddress,
    clientCity,
    clientState,
    clientPostalCode,
    clientCountry,
    clientPan,
    clientGstin,
    settings,
    signatoryName,
    invoiceNotes,
    selectedBankAccount,
    paymentTerms,
  ]);

  // Client PDF Preview Downloader
  const handleDownloadPreviewPdf = () => {
    try {
      const doc = generateInvoicePdfDoc(previewInvoiceData);
      doc.save(`PREVIEW-${previewInvoiceData.invoice_number || 'Zenemoo-Invoice'}.pdf`);
      showToast?.('Preview Downloaded', 'PDF preview generated successfully.', 'info');
    } catch (err: any) {
      showToast?.('Error', err.message || 'Could not generate PDF preview', 'error');
    }
  };

  // Build Payload
  const buildPayload = () => {
    return {
      id: editingInvoice?.id,
      invoice_date: invoiceDate,
      due_date: dueDate,
      service_period_start: serviceStart || null,
      service_period_end: serviceEnd || null,
      invoice_period: invoicePeriod,
      po_reference: poReference,
      currency,
      project_name: projectName,
      project_description: projectDescription,
      payment_terms: paymentTerms,
      invoice_notes: invoiceNotes,
      line_items: lineItems,
      discount_type: discountType,
      discount_value: discountValue,
      tax_enabled: taxEnabled,
      tax_label: taxLabel,
      tax_rate: taxRate,
      client_id: selectedClientId || undefined,
      client_snapshot: {
        company_name: clientCompanyName,
        contact_person: clientContactPerson,
        billing_email: clientBillingEmail,
        phone: clientPhone,
        address: clientAddress,
        city: clientCity,
        state: clientState,
        postal_code: clientPostalCode,
        country: clientCountry,
        pan_number: clientPan,
        gstin: clientGstin,
      },
      bank_account_id: selectedBankId,
      bank_snapshot: selectedBankAccount,
      company_snapshot: {
        legal_name: settings?.legal_name || 'Zenemoo',
        display_name: 'Zenemoo',
        registered_address: settings?.registered_address || 'K. Barida, Main Road',
        city: settings?.city || 'Ganjam',
        state: settings?.state || 'Odisha',
        postal_code: settings?.postal_code || '761031',
        country: settings?.country || 'India',
        official_email: settings?.official_email || 'contact@zenemoo.in',
        contact_number: settings?.contact_number || '+91 9827775230',
        pan_number: settings?.pan_number || '',
        udyam_registration: settings?.udyam_registration || '',
        gstin: settings?.gstin || '',
        authorized_signatory_name: signatoryName,
        default_invoice_notes: invoiceNotes,
      },
    };
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      const saved = await invoiceApi.saveDraft(payload);

      if (saveClientForFuture && clientCompanyName && clientBillingEmail) {
        try {
          await invoiceApi.saveClient({
            company_name: clientCompanyName,
            contact_person: clientContactPerson,
            billing_email: clientBillingEmail,
            phone: clientPhone,
            address: clientAddress,
            city: clientCity,
            state: clientState,
            postal_code: clientPostalCode,
            country: clientCountry,
            pan_number: clientPan,
            gstin: clientGstin,
          });
        } catch (e) {}
      }

      showToast?.('Draft Saved', `Invoice draft ${saved.invoice_number} saved.`, 'success');
      onSaved(saved);
    } catch (err: any) {
      showToast?.('Error', err.response?.data?.message || err.message || 'Failed to save draft', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Issue Invoice
  const handleIssueInvoice = async () => {
    if (!clientCompanyName.trim()) {
      showToast?.('Validation Error', 'Client company name is required.', 'warning');
      return;
    }
    if (!lineItems || lineItems.length === 0 || !lineItems[0].description) {
      showToast?.('Validation Error', 'At least one line item with a description is required.', 'warning');
      return;
    }
    if (serviceStart && serviceEnd && serviceEnd < serviceStart) {
      showToast?.('Validation Error', 'Service end date cannot be earlier than start date.', 'warning');
      return;
    }

    if (!window.confirm('Are you sure you want to officially ISSUE this invoice? Once issued, its number, company details, and bank account snapshot will be permanently locked.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload();

      // If draft doesn't exist yet, save as draft first then issue
      let draftId = editingInvoice?.id;
      if (!draftId) {
        const draft = await invoiceApi.saveDraft(payload);
        draftId = draft.id;
      }

      const issued = await invoiceApi.issueInvoice(draftId, payload);

      if (saveClientForFuture && clientCompanyName && clientBillingEmail) {
        try {
          await invoiceApi.saveClient({
            company_name: clientCompanyName,
            contact_person: clientContactPerson,
            billing_email: clientBillingEmail,
            phone: clientPhone,
            address: clientAddress,
            city: clientCity,
            state: clientState,
            postal_code: clientPostalCode,
            country: clientCountry,
            pan_number: clientPan,
            gstin: clientGstin,
          });
        } catch (e) {}
      }

      showToast?.('Invoice Issued', `Invoice ${issued.invoice_number} has been officially issued and PDF stored.`, 'success');
      onSaved(issued);
    } catch (err: any) {
      showToast?.('Issuance Failed', err.response?.data?.message || err.message || 'Failed to issue invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currSymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              {isEditing ? `Edit Draft ${editingInvoice?.invoice_number}` : 'Create New Invoice'}
            </h2>
            <p className="text-xs text-slate-400">
              Interactive document builder with synchronized A4 live preview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Preview Toggle Button */}
          <button
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="lg:hidden px-3 py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            {showMobilePreview ? 'Edit Form' : 'Live Preview'}
          </button>

          <button
            onClick={handleDownloadPreviewPdf}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Download Live PDF Preview"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            Download Preview
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            onClick={handleIssueInvoice}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Issue Invoice
          </button>
        </div>
      </div>

      {/* Main Split Grid: Left Editor | Right Live A4 Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FORM CONTROLS (7 Cols) */}
        <div className={`lg:col-span-7 space-y-6 ${showMobilePreview ? 'hidden lg:block' : 'block'}`}>
          {/* Card 1: Identification & Timing */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Invoice Timing & References
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => {
                    setInvoiceDate(e.target.value);
                    setDueDate(calculateDueDate(e.target.value, paymentTerms));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => handleTermsChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                  <option value="Custom">Custom Date</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">PO / Reference # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-991"
                  value={poReference}
                  onChange={(e) => setPoReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Service Start Date</label>
                <input
                  type="date"
                  value={serviceStart}
                  onChange={(e) => setServiceStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Service End Date</label>
                <input
                  type="date"
                  value={serviceEnd}
                  onChange={(e) => setServiceEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Billed-To / Client Information */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" />
                Client / Billed-To Details
              </h3>
              {clients.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Load Saved:</span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="px-2.5 py-1 bg-slate-950 border border-white/10 rounded text-xs text-white focus:outline-none"
                  >
                    <option value="">— Select Client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Client / Company Legal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme AI Systems Pvt Ltd"
                  value={clientCompanyName}
                  onChange={(e) => setClientCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={clientContactPerson}
                  onChange={(e) => setClientContactPerson(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Billing Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. accounts@acme.ai"
                  value={clientBillingEmail}
                  onChange={(e) => setClientBillingEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="e.g. 102, Innovation Hub, Tech City"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">State / Province</label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={clientState}
                  onChange={(e) => setClientState(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Postal / PIN Code</label>
                <input
                  type="text"
                  placeholder="e.g. 560100"
                  value={clientPostalCode}
                  onChange={(e) => setClientPostalCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Country</label>
                <input
                  type="text"
                  placeholder="e.g. India"
                  value={clientCountry}
                  onChange={(e) => setClientCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Client PAN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={clientPan}
                  onChange={(e) => setClientPan(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Client GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={clientGstin}
                  onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={saveClientForFuture}
                  onChange={(e) => setSaveClientForFuture(e.target.checked)}
                  className="rounded border-white/20 bg-slate-950 text-blue-500"
                />
                Save this client to address book for quick reuse
              </label>
            </div>
          </div>

          {/* Card 3: Project & Settlement Bank */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Project Scope & Remittance Account
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Indic Speech Audio Annotation - Phase 1"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Settlement Bank Account <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {activeBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.account_display_name} — {b.bank_name} (A/C: ••••{b.account_number.slice(-4)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  This bank account will be permanently snapshotted on the issued invoice.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Service Line Items */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Service Line Items
              </h3>
              <button
                type="button"
                onClick={addLineItem}
                className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-lg bg-slate-950/70 border border-white/10 grid grid-cols-12 gap-2.5 items-center"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Description</label>
                    <input
                      type="text"
                      placeholder="Service details..."
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Unit (Opt)</label>
                    <input
                      type="text"
                      placeholder="Hours / Units"
                      value={item.unit || ''}
                      onChange={(e) => updateLineItem(idx, 'unit', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Rate ({currSymbol})</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.rate}
                      onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-blue-500 text-right"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-1 flex items-center justify-between sm:justify-center pt-2 sm:pt-4">
                    <span className="sm:hidden text-xs font-semibold text-white">
                      Amount: {currSymbol}
                      {item.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      disabled={lineItems.length <= 1}
                      className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                      title="Remove Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal, Discount & Tax Controls */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              {/* Discount Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-300">Discount:</span>
                  <div className="inline-flex rounded-lg border border-white/10 p-0.5 bg-slate-950">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2 py-0.5 text-[11px] rounded ${
                        discountType === 'percentage' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'
                      }`}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-2 py-0.5 text-[11px] rounded ${
                        discountType === 'fixed' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'
                      }`}
                    >
                      Fixed Amount
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-24 px-2.5 py-1 bg-slate-950 border border-white/10 rounded text-xs text-white text-right focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400">
                    {discountType === 'percentage' ? '%' : currSymbol}
                  </span>
                </div>
              </div>

              {/* Tax Toggle Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="rounded border-white/20 bg-slate-950 text-blue-500"
                  />
                  Enable Tax Breakdown (Optional)
                </label>

                {taxEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={taxLabel}
                      onChange={(e) => setTaxLabel(e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-950 border border-white/10 rounded text-xs text-white text-center"
                      placeholder="GST"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-20 px-2.5 py-1 bg-slate-950 border border-white/10 rounded text-xs text-white text-right focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                )}
              </div>

              {/* Live Calculations Summary */}
              <div className="p-3 rounded-lg bg-slate-950 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>
                    {currSymbol}
                    {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>
                      -{currSymbol}
                      {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {taxEnabled && taxAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>
                      {taxLabel} ({taxRate}%):
                    </span>
                    <span>
                      +{currSymbol}
                      {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm text-white">
                  <span>Total Due:</span>
                  <span className="text-blue-400">
                    {currSymbol}
                    {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 italic pt-1">
                  Words: {amountInWords}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Notes & Signatory */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white">Invoice Notes & Authorization</h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Notes & Terms</label>
              <textarea
                rows={2}
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="Payment instructions, bank wire remarks, milestone notes..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Authorized Signatory</label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE A4 PAPER PREVIEW (5 Cols) */}
        <div className={`lg:col-span-5 ${showMobilePreview ? 'block' : 'hidden lg:block'}`}>
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                Live A4 Print Preview
              </span>
              <span className="text-[11px] text-blue-400">Real-time synchronized</span>
            </div>

            {/* A4 Paper Mockup Container */}
            <div className="w-full bg-white text-slate-900 rounded-lg shadow-2xl p-6 border border-slate-200 text-[10px] leading-tight select-none font-sans overflow-hidden">
              {/* Top Accent */}
              <div className="h-1 bg-blue-600 rounded-full mb-3" />

              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {settings?.display_name || 'Zenemoo'}
                  </h1>
                  <p className="text-[8px] text-slate-500 mt-0.5 max-w-[160px]">
                    {settings?.registered_address || 'K. Barida, Main Road'}, {settings?.city || 'Ganjam'}, {settings?.state || 'Odisha'} {settings?.postal_code || '761031'}
                  </p>
                  <p className="text-[8px] text-slate-500">Email: {settings?.official_email || 'contact@zenemoo.in'}</p>
                  {settings?.pan_number && (
                    <p className="text-[8px] text-slate-600 font-medium">PAN: {settings.pan_number}</p>
                  )}
                  {settings?.udyam_registration && (
                    <p className="text-[8px] text-slate-600 font-medium">Udyam: {settings.udyam_registration}</p>
                  )}
                </div>

                <div className="text-right">
                  <h2 className="text-sm font-extrabold text-blue-600 tracking-wider">INVOICE</h2>
                  <p className="font-mono font-bold text-slate-800 text-[9px] mt-0.5">
                    {previewInvoiceData.invoice_number}
                  </p>
                  <div className="mt-1 space-y-0.5 text-[8px] text-slate-600">
                    <div>Date: <span className="font-semibold text-slate-800">{invoiceDate}</span></div>
                    <div>Due: <span className="font-semibold text-slate-800">{dueDate}</span></div>
                    <div>Status: <span className="font-bold text-blue-600 uppercase">{editingInvoice?.status || 'DRAFT'}</span></div>
                  </div>
                </div>
              </div>

              {/* Bill To & Project Meta */}
              <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-200">
                <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                  <div className="text-[8px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                    Billed To
                  </div>
                  <div className="font-bold text-slate-900 text-[9px]">
                    {clientCompanyName || 'Client Company Name'}
                  </div>
                  {clientContactPerson && <div className="text-slate-600">Attn: {clientContactPerson}</div>}
                  <div className="text-slate-600 text-[8px]">
                    {[clientAddress, clientCity, clientState, clientPostalCode].filter(Boolean).join(', ')}
                  </div>
                  {clientBillingEmail && <div className="text-slate-600">Email: {clientBillingEmail}</div>}
                  {clientGstin && <div className="text-slate-700 font-medium">GSTIN: {clientGstin}</div>}
                </div>

                <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                  <div className="text-[8px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                    Project & Terms
                  </div>
                  <div className="font-bold text-slate-900 text-[9px]">{projectName}</div>
                  <div className="text-slate-600">Terms: {paymentTerms}</div>
                  <div className="text-slate-600">Currency: {currency}</div>
                  {serviceStart && serviceEnd && (
                    <div className="text-slate-600">
                      Period: {serviceStart} to {serviceEnd}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2">
                <table className="w-full text-left text-[8px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-1 text-center w-5">#</th>
                      <th className="p-1">Description</th>
                      <th className="p-1 text-center w-12">Qty</th>
                      <th className="p-1 text-right w-14">Rate</th>
                      <th className="p-1 text-right w-16">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="p-1 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-1 font-medium text-slate-800">{item.description || '—'}</td>
                        <td className="p-1 text-center text-slate-600">
                          {item.quantity} {item.unit || ''}
                        </td>
                        <td className="p-1 text-right text-slate-600">
                          {currSymbol}
                          {Number(item.rate || 0).toFixed(2)}
                        </td>
                        <td className="p-1 text-right font-semibold text-slate-900">
                          {currSymbol}
                          {Number(item.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Bottom */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-12 gap-3 items-start">
                <div className="col-span-6 space-y-1 text-[8px]">
                  <div>
                    <span className="font-bold text-blue-600">Amount in Words:</span>
                    <p className="font-medium text-slate-800 italic mt-0.5">{amountInWords}</p>
                  </div>

                  {selectedBankAccount?.bank_name && (
                    <div className="p-1.5 rounded bg-slate-50 border border-slate-200 mt-2 text-[7.5px] leading-tight">
                      <div className="font-bold text-blue-600 mb-0.5">Remittance Account</div>
                      <div>Bank: {selectedBankAccount.bank_name}</div>
                      <div>A/C: {selectedBankAccount.account_number}</div>
                      <div>IFSC: {selectedBankAccount.ifsc_code}</div>
                    </div>
                  )}
                </div>

                <div className="col-span-6 space-y-1 text-[8.5px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>
                      {currSymbol}
                      {subtotal.toFixed(2)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount:</span>
                      <span>
                        -{currSymbol}
                        {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {taxEnabled && taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {taxLabel} ({taxRate}%):
                      </span>
                      <span>
                        +{currSymbol}
                        {taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="p-1.5 rounded bg-slate-900 text-white font-extrabold flex justify-between mt-1 text-[9.5px]">
                    <span>TOTAL:</span>
                    <span>
                      {currSymbol}
                      {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatory Footer */}
              <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-end text-[7.5px] text-slate-500">
                <span>Computer-generated official invoice by Zenemoo.</span>
                <div className="text-right">
                  <div className="border-b border-slate-400 pb-0.5 font-bold text-slate-800">
                    {signatoryName}
                  </div>
                  <span>Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
