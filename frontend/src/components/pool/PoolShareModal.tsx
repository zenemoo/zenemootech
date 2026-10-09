import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Sparkles,
  Link2,
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
      handleCopyMessage();
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-pool-title"
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-[calc(100vw-24px)] max-w-xl max-h-[calc(100dvh-32px)] sm:max-h-[88vh] bg-gradient-to-b from-[#0c1024] to-[#070a18] border border-cyan-500/30 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 flex flex-col box-border overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Fixed Header ── */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 shrink-0 bg-[#0c1024]/90 backdrop-blur-md">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 shrink-0">
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="share-pool-title"
                  className="text-sm sm:text-base font-bold text-white font-display truncate leading-tight"
                >
                  Share Pool with 1-Click Option Links
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 font-mono truncate mt-0.5">
                  Direct answer links for 1-tap participation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white bg-white/5 transition-colors cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Single Unified Scrollable Body ── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 overscroll-contain">
            {/* Message Live Preview Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Message Preview</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {pool.options?.length || 0} options
                </span>
              </div>

              <div
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/60 border border-white/10 font-mono text-[11px] sm:text-xs text-slate-200 whitespace-pre-wrap leading-relaxed border-l-2 border-l-cyan-400 select-text overflow-hidden"
                style={{
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {shareMessage}
              </div>
            </div>

            {/* Individual Answer Links Section */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-cyan-400" />
                  <span>Individual Answer Links</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Tap to copy single link
                </span>
              </div>

              <div className="space-y-2">
                {(pool.options || []).map((opt, idx) => {
                  const bullet = OPTION_EMOJI_BULLETS[idx % OPTION_EMOJI_BULLETS.length];
                  const isCopied = copiedOptionId === opt.id;
                  const optionUrl = generatePoolOptionUrl(pool.public_id, opt.id);

                  return (
                    <div
                      key={opt.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 text-xs mt-0.5">{bullet}</span>
                          <span
                            className="text-xs sm:text-sm text-slate-100 font-medium leading-snug break-words"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                          >
                            {opt.option_text}
                          </span>
                        </div>
                        <p
                          className="text-[10px] font-mono text-cyan-400/80 truncate pl-5"
                          title={optionUrl}
                        >
                          {optionUrl}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyOptionLink(opt.id)}
                        className={`h-9 sm:h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 self-stretch sm:self-center transition-all cursor-pointer active:scale-95 ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                        aria-label={`Copy link for ${opt.option_text}`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Fixed Action Footer ── */}
          <div className="p-3.5 sm:p-5 border-t border-white/10 bg-[#080b18] shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {/* Copy Message */}
              <button
                type="button"
                onClick={handleCopyMessage}
                className="h-11 sm:h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs tracking-wide transition-all border border-white/15 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
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
                className="h-11 sm:h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>WhatsApp</span>
              </button>

              {/* Native Share / General Share */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="h-11 sm:h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-cyan-500/20"
              >
                <Share2 className="w-4 h-4" />
                <span>{canNativeShare ? 'Share' : 'Share Pool'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
