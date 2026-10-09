import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Link,
} from 'lucide-react';
import { PoolItem } from '../../services/poolApi';
import {
  generatePoolShareMessage,
  openWhatsAppShare,
  copyPoolShareMessage,
  sharePoolNative,
  generatePoolOptionUrl,
  OPTION_EMOJI_BULLETS,
} from '../../lib/poolShareHelper';

interface PoolShareModalProps {
  isOpen: boolean;
  pool: PoolItem | null;
  onClose: () => void;
}

export const PoolShareModal: React.FC<PoolShareModalProps> = ({ isOpen, pool, onClose }) => {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedOptionId, setCopiedOptionId] = useState<string | null>(null);

  if (!isOpen || !pool) return null;

  const shareMessage = generatePoolShareMessage(pool);

  const handleCopyMessage = async () => {
    const success = await copyPoolShareMessage(shareMessage);
    if (success) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  const handleCopyOptionLink = async (optionId: string) => {
    const url = generatePoolOptionUrl(pool.public_id, optionId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOptionId(optionId);
      setTimeout(() => setCopiedOptionId(null), 2500);
    } catch (_) {}
  };

  const handleWhatsApp = () => {
    openWhatsAppShare(shareMessage);
  };

  const handleNativeShare = async () => {
    const shared = await sharePoolNative(pool, shareMessage);
    if (!shared) {
      // Fallback to copy message if native share is not supported or was dismissed
      handleCopyMessage();
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-xl bg-gradient-to-b from-[#0c1024] to-[#070a18] border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-display">
                  Share Pool with 1-Click Option Links
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Recipients can tap their direct answer to participate instantly
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Share Message Live Preview Box */}
          <div className="space-y-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Message Preview</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {pool.options?.length || 0} direct answer links
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-64 selection:bg-cyan-500/30 border-l-2 border-l-cyan-400">
              {shareMessage}
            </div>
          </div>

          {/* Quick Option Link Shortcuts */}
          <div className="space-y-2 pt-1 border-t border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Individual Answer Links:
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {(pool.options || []).map((opt, idx) => {
                const bullet = OPTION_EMOJI_BULLETS[idx % OPTION_EMOJI_BULLETS.length];
                const isCopied = copiedOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{bullet}</span>
                      <span className="text-slate-200 truncate font-medium">{opt.option_text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyOptionLink(opt.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-cyan-300 flex items-center gap-1 shrink-0 cursor-pointer transition-all active:scale-95"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
            {/* Copy Message */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs tracking-wide transition-all border border-white/15 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
            >
              {copiedMessage ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Message Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>

            {/* Native Share / Copy */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-cyan-500/25"
            >
              <Share2 className="w-4 h-4" />
              <span>{canNativeShare ? 'Share' : 'Share Pool'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
