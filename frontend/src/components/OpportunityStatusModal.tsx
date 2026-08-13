import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Clock } from 'lucide-react';

interface OpportunityStatusModalProps {
  isOpen: boolean;
  type: 'closed' | 'coming_soon' | null;
  onClose: () => void;
}

export const OpportunityStatusModal: React.FC<OpportunityStatusModalProps> = ({
  isOpen,
  type,
  onClose,
}) => {
  // Lock body scrolling when modal is open & handle Escape key press
  useEffect(() => {
    if (!isOpen || !type) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, type, onClose]);

  if (!isOpen || !type) return null;

  const isClosed = type === 'closed';

  const handleSubscribeClick = () => {
    onClose();
    // Smoothly route to /subscribe and dispatch event so SubscribeModal activates
    window.history.pushState(null, '', '/subscribe');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-all duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#090d16]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden font-mono text-slate-100 backdrop-blur-xl animate-scaleUp space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Gradient Glow Blobs */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div
          className={`absolute -bottom-24 -left-24 w-56 h-56 ${
            isClosed ? 'bg-rose-500/15' : 'bg-amber-500/15'
          } rounded-full blur-3xl pointer-events-none animate-pulse`}
          style={{ animationDelay: '1s' }}
        ></div>

        {/* Close Button (×) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer z-10"
          aria-label="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header Badge & Icon */}
        <div className="space-y-4 text-center pt-2">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-inner">
            {isClosed ? (
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Lock className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              {isClosed ? 'Applications Closed' : 'Coming Soon'}
            </h3>
            <p className="text-sm font-sans font-medium text-slate-300 leading-relaxed px-2">
              {isClosed
                ? 'Applications for this opportunity are currently closed.'
                : 'This opportunity is not open for applications yet.'}
            </p>
          </div>
        </div>

        {/* Subtext Card */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1 text-center">
          <p className="text-xs font-sans text-slate-400 leading-relaxed">
            {isClosed
              ? 'Please subscribe to Zenemoo to receive updates when new projects and opportunities are available.'
              : 'Subscribe to Zenemoo to get notified when this project opens and when new opportunities are launched.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSubscribeClick}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 hover:opacity-95 text-slate-950 font-mono font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 hover:scale-[1.01] transition-all cursor-pointer"
          >
            {isClosed ? 'Subscribe for New Opportunities →' : 'Subscribe for Updates →'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-xs font-bold text-center border border-white/10 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
