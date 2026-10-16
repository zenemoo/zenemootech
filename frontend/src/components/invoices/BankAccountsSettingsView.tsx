import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Star,
  StarOff,
  Building,
  RefreshCw,
  X,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { BankAccount, invoiceApi } from '../../services/invoiceApi';
import { InvoiceConfirmationModal } from './InvoiceConfirmationModal';

interface BankAccountsSettingsViewProps {
  bankAccounts: BankAccount[];
  onRefresh: () => void;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const BankAccountsSettingsView: React.FC<BankAccountsSettingsViewProps> = ({
  bankAccounts,
  onRefresh,
  showToast,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [holderName, setHolderName] = useState('Zenemoo');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('Current');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingAccount(null);
    setDisplayName('');
    setHolderName('Zenemoo');
    setBankName('');
    setAccountNumber('');
    setAccountType('Current');
    setIfscCode('');
    setBranchName('');
    setBranchAddress('');
    setSwiftCode('');
    setInstructions('Please include the invoice number in transaction remarks.');
    setIsActive(true);
    setIsDefault(bankAccounts.length === 0);
    setModalOpen(true);
  };

  const openEditModal = (acc: BankAccount) => {
    setEditingAccount(acc);
    setDisplayName(acc.account_display_name);
    setHolderName(acc.account_holder_name);
    setBankName(acc.bank_name);
    setAccountNumber(acc.account_number);
    setAccountType(acc.account_type);
    setIfscCode(acc.ifsc_code);
    setBranchName(acc.branch_name);
    setBranchAddress(acc.branch_address || '');
    setSwiftCode(acc.swift_bic_code || '');
    setInstructions(acc.payment_instructions || '');
    setIsActive(acc.is_active);
    setIsDefault(acc.is_default);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !bankName || !accountNumber || !ifscCode) {
      showToast?.('Validation Error', 'Display Name, Bank, Account Number, and IFSC are required.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<BankAccount> = {
        account_display_name: displayName.trim(),
        account_holder_name: holderName.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_type: accountType,
        ifsc_code: ifscCode.trim().toUpperCase(),
        branch_name: branchName.trim(),
        branch_address: branchAddress.trim(),
        swift_bic_code: swiftCode.trim().toUpperCase(),
        payment_instructions: instructions.trim(),
        is_active: isActive,
        is_default: isDefault,
      };

      if (editingAccount) {
        await invoiceApi.updateBankAccount(editingAccount.id, payload);
        showToast?.('Account Updated', 'Bank account details updated.', 'success');
      } else {
        await invoiceApi.createBankAccount(payload);
        showToast?.('Account Added', 'New remittance bank account added.', 'success');
      }

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast?.('Save Error', err.response?.data?.message || err.message || 'Failed to save bank account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (acc: BankAccount) => {
    try {
      await invoiceApi.updateBankAccount(acc.id, { is_default: true });
      showToast?.('Default Updated', `${acc.account_display_name} is now the default settlement account.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast?.('Error', err.message || 'Could not set default account', 'error');
    }
  };

  const handleDelete = (acc: BankAccount) => {
    setAccountToDelete(acc);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    try {
      await invoiceApi.deleteBankAccount(accountToDelete.id);
      showToast?.('Account Removed', 'Bank account removed from active selection.', 'info');
      setAccountToDelete(null);
      onRefresh();
    } catch (err: any) {
      showToast?.('Delete Error', err.message || 'Could not delete bank account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Bank Accounts & Remittance Profiles
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain multiple corporate settlement accounts. Selected account details are snapshotted permanently on invoice issuance.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Bank Account
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((acc) => (
          <div
            key={acc.id}
            className={`p-5 rounded-xl border transition-all relative flex flex-col justify-between ${
              acc.is_default
                ? 'bg-slate-900/80 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                : 'bg-slate-900/50 border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white truncate max-w-[170px]">
                      {acc.account_display_name}
                    </h3>
                    <span className="text-[11px] text-slate-400">{acc.bank_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {acc.is_default && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      DEFAULT
                    </span>
                  )}
                  {!acc.is_active && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      INACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Account Details Table */}
              <div className="p-3 rounded-lg bg-slate-950 border border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Holder:</span>
                  <span className="font-medium text-white">{acc.account_holder_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Number:</span>
                  <span className="font-mono text-slate-200">
                    •••• {acc.account_number.slice(-4)} ({acc.account_type})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="font-mono font-medium text-blue-400">{acc.ifsc_code}</span>
                </div>
                {acc.branch_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Branch:</span>
                    <span className="text-slate-300 truncate max-w-[140px]">{acc.branch_name}</span>
                  </div>
                )}
                {acc.swift_bic_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">SWIFT / BIC:</span>
                    <span className="font-mono text-slate-200">{acc.swift_bic_code}</span>
                  </div>
                )}
              </div>

              {acc.payment_instructions && (
                <p className="mt-3 text-[11px] text-slate-400 italic">
                  "{acc.payment_instructions}"
                </p>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              {!acc.is_default ? (
                <button
                  onClick={() => handleSetDefault(acc)}
                  className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                  Set Default
                </button>
              ) : (
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Default for new invoices
                </span>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(acc)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Edit Account"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(acc)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                  title="Remove Account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Bank Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-white/10 shadow-2xl my-8 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">Account Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary Corporate Current Account - SBI"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zenemoo"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 40928172615"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="Escrow">Escrow Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">SWIFT / BIC (International)</label>
                  <input
                    type="text"
                    placeholder="e.g. SBININBB123"
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Branch, Ganjam"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Branch Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Road, Odisha 761031"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">Payment Instructions / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Please mention Invoice Number in remittance remarks."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-white/20 bg-slate-950 text-emerald-500"
                    />
                    Active for new invoices
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded border-white/20 bg-slate-950 text-emerald-500"
                    />
                    Set as default account
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal for Bank Account Deletion */}
      <InvoiceConfirmationModal
        isOpen={!!accountToDelete}
        onClose={() => !isDeleting && setAccountToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Bank Account"
        message={`Are you sure you want to remove the bank account "${accountToDelete?.account_display_name}"?`}
        description="This account profile will be removed from future invoice creation. Historical invoices that recorded this snapshot remain intact."
        details={
          accountToDelete
            ? [
                { label: 'Bank Name', value: accountToDelete.bank_name },
                { label: 'Account Number', value: accountToDelete.account_number },
                { label: 'IFSC Code', value: accountToDelete.ifsc_code },
              ]
            : []
        }
        confirmText="Remove Account"
        cancelText="Keep Account"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
