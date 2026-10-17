import React, { useState, useEffect, useRef } from 'react';
import {
  Building,
  Save,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Info,
  PenTool,
  UploadCloud,
  Trash2,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';
import { InvoiceSettings, InvoiceSignatureData, InvoiceDiagnostics, invoiceApi } from '../../services/invoiceApi';

interface CompanyInvoiceSettingsViewProps {
  initialSettings: InvoiceSettings | null;
  onSaved: (updated: InvoiceSettings) => void;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CompanyInvoiceSettingsView: React.FC<CompanyInvoiceSettingsViewProps> = ({
  initialSettings,
  onSaved,
  showToast,
}) => {
  const [legalName, setLegalName] = useState(initialSettings?.legal_name || 'Zenemoo');
  const [displayName] = useState('Zenemoo'); // Strictly "Zenemoo". Never "Zenemoo AI Solutions"
  const [registeredAddress, setRegisteredAddress] = useState(initialSettings?.registered_address || 'K. Barida, Main Road');
  const [city, setCity] = useState(initialSettings?.city || 'Ganjam');
  const [state, setState] = useState(initialSettings?.state || 'Odisha');
  const [postalCode, setPostalCode] = useState(initialSettings?.postal_code || '761031');
  const [country, setCountry] = useState(initialSettings?.country || 'India');

  const [officialEmail, setOfficialEmail] = useState(initialSettings?.official_email || 'contact@zenemoo.in');
  const [contactNumber, setContactNumber] = useState(initialSettings?.contact_number || '+91 9827775230');

  const [panNumber, setPanNumber] = useState(initialSettings?.pan_number || '');
  const [udyamRegistration, setUdyamRegistration] = useState(initialSettings?.udyam_registration || '');
  const [gstin, setGstin] = useState(initialSettings?.gstin || '');

  const [authorizedSignatory, setAuthorizedSignatory] = useState(
    initialSettings?.authorized_signatory_name || 'Prem Prasad'
  );
  const [defaultCurrency, setDefaultCurrency] = useState(initialSettings?.default_currency || 'INR');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(
    initialSettings?.default_payment_terms || 'Net 15 Days'
  );
  const [defaultInvoiceNotes, setDefaultInvoiceNotes] = useState(
    initialSettings?.default_invoice_notes ||
      'Thank you for partnering with Zenemoo. Payment is expected within the agreed terms.'
  );

  const [defaultTaxEnabled, setDefaultTaxEnabled] = useState(
    initialSettings?.default_tax_enabled || false
  );
  const [defaultTaxLabel, setDefaultTaxLabel] = useState(initialSettings?.default_tax_label || 'GST');
  const [defaultTaxRate, setDefaultTaxRate] = useState(initialSettings?.default_tax_rate || 18.0);

  const [isSaving, setIsSaving] = useState(false);
  const [diagnostics, setDiagnostics] = useState<InvoiceDiagnostics | null>(null);

  // Handwritten Original Signature State
  const [signatureData, setSignatureData] = useState<InvoiceSignatureData | null>(null);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [isUploadingSig, setIsUploadingSig] = useState(false);
  const [isDeletingSig, setIsDeletingSig] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSignature = async () => {
    setIsLoadingSignature(true);
    try {
      const sig = await invoiceApi.getSignature();
      setSignatureData(sig);
    } catch (err: any) {
      console.warn('[CompanyInvoiceSettingsView] Could not fetch signature:', err);
    } finally {
      setIsLoadingSignature(false);
    }
  };

  useEffect(() => {
    fetchSignature();
    invoiceApi.getDiagnostics().then(setDiagnostics).catch(() => null);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validTypes = ['image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      setSigError('Invalid file format. Please upload a genuine PNG (recommended with transparent background) or JPEG image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSigError(`File size is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed size is 2.0 MB.`);
      return;
    }

    setSigError(null);
    setIsUploadingSig(true);
    try {
      const updated = await invoiceApi.uploadSignature(file);
      setSignatureData(updated);
      showToast?.('Signature Uploaded', 'Original handwritten signature securely saved to Cloudflare R2.', 'success');
      if (initialSettings) {
        onSaved({
          ...initialSettings,
          signature_configured: true,
          signature_key: updated.storage_key,
          signature_file_name: updated.file_name,
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to upload signature';
      setSigError(msg);
      showToast?.('Upload Failed', msg, 'error');
    } finally {
      setIsUploadingSig(false);
    }
  };

  const handleDeleteSignature = async () => {
    setIsDeletingSig(true);
    try {
      await invoiceApi.deleteSignature();
      setSignatureData({ configured: false, data_url: null });
      setShowDeleteModal(false);
      showToast?.('Signature Removed', 'Authorized signature removed from invoice settings. Historical invoices remain safely preserved.', 'info');
      if (initialSettings) {
        onSaved({
          ...initialSettings,
          signature_configured: false,
          signature_key: null,
          signature_file_name: null,
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete signature';
      showToast?.('Delete Failed', msg, 'error');
    } finally {
      setIsDeletingSig(false);
    }
  };

  useEffect(() => {
    if (initialSettings) {
      setLegalName(initialSettings.legal_name || 'Zenemoo');
      setRegisteredAddress(initialSettings.registered_address || 'K. Barida, Main Road');
      setCity(initialSettings.city || 'Ganjam');
      setState(initialSettings.state || 'Odisha');
      setPostalCode(initialSettings.postal_code || '761031');
      setCountry(initialSettings.country || 'India');
      setOfficialEmail(initialSettings.official_email || 'contact@zenemoo.in');
      setContactNumber(initialSettings.contact_number || '+91 9827775230');
      setPanNumber(initialSettings.pan_number || '');
      setUdyamRegistration(initialSettings.udyam_registration || '');
      setGstin(initialSettings.gstin || '');
      setAuthorizedSignatory(initialSettings.authorized_signatory_name || 'Prem Prasad');
      setDefaultCurrency(initialSettings.default_currency || 'INR');
      setDefaultPaymentTerms(initialSettings.default_payment_terms || 'Net 15 Days');
      setDefaultInvoiceNotes(
        initialSettings.default_invoice_notes ||
          'Thank you for partnering with Zenemoo. Payment is expected within the agreed terms.'
      );
      setDefaultTaxEnabled(initialSettings.default_tax_enabled || false);
      setDefaultTaxLabel(initialSettings.default_tax_label || 'GST');
      setDefaultTaxRate(initialSettings.default_tax_rate || 18.0);
    }
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Partial<InvoiceSettings> = {
        legal_name: legalName.trim(),
        display_name: 'Zenemoo', // Always strictly "Zenemoo"
        registered_address: registeredAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        country: country.trim(),
        official_email: officialEmail.trim(),
        contact_number: contactNumber.trim(),
        pan_number: panNumber.trim().toUpperCase(),
        udyam_registration: udyamRegistration.trim().toUpperCase(),
        gstin: gstin.trim().toUpperCase(),
        authorized_signatory_name: authorizedSignatory.trim(),
        default_currency: defaultCurrency.trim().toUpperCase(),
        default_payment_terms: defaultPaymentTerms.trim(),
        default_invoice_notes: defaultInvoiceNotes.trim(),
        default_tax_enabled: defaultTaxEnabled,
        default_tax_label: defaultTaxLabel.trim(),
        default_tax_rate: Number(defaultTaxRate) || 0,
      };

      const updated = await invoiceApi.updateSettings(payload);
      showToast?.('Settings Saved', 'Company profile and invoice defaults updated successfully.', 'success');
      onSaved(updated);
    } catch (err: any) {
      showToast?.('Save Error', err.response?.data?.message || err.message || 'Could not save invoice settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-400" />
            Company & Global Invoice Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure legal identifiers, registered domicile, and default financial rules for all generated invoices.
          </p>
        </div>
        {diagnostics && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                diagnostics.persistenceMode === 'd1' && diagnostics.isD1Configured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : diagnostics.persistenceMode === 'd1'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
              title={`Persistence Mode: ${diagnostics.persistenceMode.toUpperCase()} | Env: ${diagnostics.environment}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  diagnostics.persistenceMode === 'd1' && diagnostics.isD1Configured
                    ? 'bg-emerald-400'
                    : diagnostics.persistenceMode === 'd1'
                    ? 'bg-rose-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              {diagnostics.persistenceMode === 'd1' && diagnostics.isD1Configured
                ? 'Cloudflare D1 (Durable)'
                : diagnostics.persistenceMode === 'd1'
                ? 'D1 Missing Credentials'
                : 'Local Disk Store (Dev)'}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Official Identity & Domicile */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Official Identity & Registered Address
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company Legal Name</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Official Display Name <span className="text-emerald-400 font-bold">(Locked: Zenemoo)</span>
              </label>
              <input
                type="text"
                disabled
                value={displayName}
                className="w-full px-3 py-2 bg-slate-950/60 border border-white/5 rounded-lg text-xs text-slate-400 cursor-not-allowed font-semibold"
                title="Official brand standard: Zenemoo"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Official Billing Email</label>
              <input
                type="email"
                required
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Contact Phone</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Registered Address</label>
              <input
                type="text"
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">PIN / Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Statutory & Government Registrations */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Statutory & Tax Registrations
          </h3>
          <p className="text-xs text-slate-400">
            Legal identifiers are automatically included on generated invoices when configured.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">PAN Number</label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white uppercase focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Udyam Registration #</label>
              <input
                type="text"
                placeholder="e.g. UDYAM-OD-00-0000000"
                value={udyamRegistration}
                onChange={(e) => setUdyamRegistration(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white uppercase focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 21ABCDE1234F1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white uppercase focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Default Terms & Signatures */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-400" />
            Default Invoice Parameters & Signatory
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Default Payment Terms</label>
              <input
                type="text"
                value={defaultPaymentTerms}
                onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="Net 15 Days"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Authorized Signatory Name</label>
              <input
                type="text"
                value={authorizedSignatory}
                onChange={(e) => setAuthorizedSignatory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="Prem Prasad"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">Default Invoice Notes</label>
              <textarea
                rows={2}
                value={defaultInvoiceNotes}
                onChange={(e) => setDefaultInvoiceNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tax Defaults */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={defaultTaxEnabled}
                onChange={(e) => setDefaultTaxEnabled(e.target.checked)}
                className="rounded border-white/20 bg-slate-950 text-blue-500"
              />
              Enable Tax By Default
            </label>

            {defaultTaxEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={defaultTaxLabel}
                  onChange={(e) => setDefaultTaxLabel(e.target.value)}
                  className="w-24 px-2.5 py-1 bg-slate-950 border border-white/10 rounded text-xs text-white text-center"
                  placeholder="GST"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 bg-slate-950 border border-white/10 rounded text-xs text-white text-right"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Authorized Handwritten Signature Management */}
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-400" />
                Section 4: Authorized Handwritten Signature
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload your genuine handwritten signature image to appear on signed invoices. Zenemoo never fabricates, generates, or font-renders signatures.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  signatureData?.configured
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {signatureData?.configured ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Configured & Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not Configured
                  </>
                )}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-400 bg-white/5 border border-white/10">
                <Lock className="w-3 h-3 text-blue-400" />
                Cloudflare R2
              </span>
            </div>
          </div>

          {/* Validation or error display */}
          {sigError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{sigError}</span>
            </div>
          )}

          {/* Preview and Controls Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
            {/* Visual Preview Box */}
            <div className="relative rounded-lg border border-white/10 bg-slate-950 p-4 min-h-[140px] flex flex-col items-center justify-center text-center overflow-hidden">
              {isLoadingSignature ? (
                <div className="flex flex-col items-center gap-2 text-slate-400 text-xs py-6">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                  <span>Loading signature preview...</span>
                </div>
              ) : signatureData?.configured && signatureData?.data_url ? (
                <div className="w-full flex flex-col items-center">
                  {/* Subtle checkered canvas backdrop for transparent PNGs */}
                  <div
                    className="w-full max-w-[280px] h-28 rounded border border-white/10 p-3 flex items-center justify-center"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      backgroundColor: '#0f172a',
                    }}
                  >
                    <img
                      src={signatureData.data_url}
                      alt="Authorized Handwritten Signature"
                      className="max-h-20 max-w-full object-contain filter drop-shadow"
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {signatureData.file_name && (
                      <span className="font-mono text-slate-300">{signatureData.file_name}</span>
                    )}
                    {signatureData.updated_at && (
                      <span className="block text-[10px] text-slate-500">
                        Updated {new Date(signatureData.updated_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 px-4 flex flex-col items-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 text-slate-500">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">No original signature configured</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                    Upload your authentic signature image to enable the "Include authorized signature" option when creating invoices.
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons and guidelines */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingSig || isDeletingSig}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isUploadingSig ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  {signatureData?.configured ? 'Replace Signature' : 'Upload Original Signature'}
                </button>

                {signatureData?.configured && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isUploadingSig || isDeletingSig}
                    className="px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Signature
                  </button>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>Signature Guidelines</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-400">
                  <li>Format: <strong className="text-slate-300">PNG</strong> with transparent background (recommended) or JPEG.</li>
                  <li>Max file size: <strong className="text-slate-300">2.0 MB</strong>.</li>
                  <li>Storage: Stored securely in Cloudflare R2 (<code className="text-blue-300 text-[10px]">zenemoo-invoice-storage</code>).</li>
                  <li>Integrity: Raw image binaries are never stored in D1. Only versioned storage keys are mapped.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Settings...' : 'Save Company Profile'}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Remove Authorized Signature?
              </h4>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove your configured signature?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10">
              New invoices will not include a signature until a new one is uploaded. Previously issued invoices are snapshot-locked and will safely retain their historical signed state.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingSig}
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSig}
                onClick={handleDeleteSignature}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition-all"
              >
                {isDeletingSig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeletingSig ? 'Deleting...' : 'Yes, Delete Signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
