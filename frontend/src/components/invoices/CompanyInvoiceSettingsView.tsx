import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { InvoiceSettings, invoiceApi } from '../../services/invoiceApi';

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
    </div>
  );
};
