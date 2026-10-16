import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X, Loader2 } from 'lucide-react';

export interface ConfirmationDetailItem {
  label: string;
  value: React.ReactNode;
}

export interface InvoiceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  description?: string;
  variant?: 'danger' | 'warning' | 'primary';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  details?: ConfirmationDetailItem[];
}

export const InvoiceConfirmationModal: React.FC<InvoiceConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  variant = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  details = [],
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen || isLoading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 className="w-5 h-5 text-rose-400" />,
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      confirmButton:
        'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500 text-white shadow-lg shadow-rose-900/30',
      badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      confirmButton:
        'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 text-white shadow-lg shadow-amber-900/30',
      badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    primary: {
      icon: <HelpCircle className="w-5 h-5 text-blue-400" />,
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      confirmButton:
        'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500 text-white shadow-lg shadow-blue-900/30',
      badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
  }[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden transition-all transform scale-100">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}
          >
            {variantStyles.icon}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3
              id="confirmation-modal-title"
              className="text-base font-semibold text-white tracking-tight leading-snug"
            >
              {title}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 -mr-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Context Details (e.g., Invoice #, Client Name, Amount) */}
        {details.length > 0 && (
          <div className="px-6 py-3 mx-6 mb-2 rounded-xl bg-slate-950/70 border border-white/5 space-y-1.5">
            {details.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{item.label}</span>
                <span className="text-slate-200 font-semibold text-right">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Optional Warning / Extra Info */}
        {description && (
          <div className="px-6 pb-2 text-[11px] text-slate-400 leading-relaxed">
            {description}
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors border border-white/5 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${variantStyles.confirmButton}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
