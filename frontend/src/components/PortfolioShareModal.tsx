import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  QrCode,
  X,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Mail,
  Send,
  Smartphone,
} from 'lucide-react';
import QRCode from 'qrcode';

interface PortfolioShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl?: string;
}

export const PortfolioShareModal: React.FC<PortfolioShareModalProps> = ({
  isOpen,
  onClose,
  publicUrl = 'https://www.zenemoo.in/portfolio',
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);

  const defaultMessage = `Hello,

Please find the latest Zenemoo Company Portfolio below.

It provides an overview of Zenemoo, our capabilities, language and data services, team, and company information.

View the Portfolio:
${publicUrl}

Thank you,
Zenemoo AI Solutions
www.zenemoo.in`;

  const [shareText, setShareText] = useState<string>(defaultMessage);

  // Generate QR Code on mount / url change (100% Client-Side)
  useEffect(() => {
    let isMounted = true;
    setIsGeneratingQr(true);

    QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGeneratingQr(false);
        }
      })
      .catch((err) => {
        console.warn('QR generation notice:', err);
        if (isMounted) setIsGeneratingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [publicUrl]);

  if (!isOpen) return null;

  // Copy Public Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy Full Message
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Native Share (if supported)
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Zenemoo Company Portfolio',
          text: shareText,
          url: publicUrl,
        });
      } catch (e) {
        // Dismissed or cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl my-auto rounded-3xl bg-[#080912] border border-cyan-500/30 p-5 sm:p-6 shadow-2xl text-slate-100 relative space-y-4">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white">Share Zenemoo Portfolio</h3>
              <p className="text-[11px] font-mono text-cyan-400">Official Company Resource</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR CODE & URL CARD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 items-center">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center space-y-1.5 sm:border-r sm:border-white/10 sm:pr-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center overflow-hidden">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Zenemoo Portfolio QR Code" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-12 h-12 text-slate-400 animate-pulse" />
              )}
            </div>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download="zenemoo-company-portfolio-qr.png"
                className="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Download QR</span>
              </a>
            )}
          </div>

          {/* Public Link Details */}
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-[11px] font-mono text-slate-400">Public Portfolio URL</label>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-white/10">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full bg-transparent text-xs font-mono text-cyan-300 focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer active:scale-95"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[10px] font-mono text-slate-500">
              Scan QR code on mobile or share the direct link with clients, partners, and investors.
            </p>
          </div>
        </div>

        {/* EDITABLE MESSAGE PREVIEW */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono text-slate-300 font-semibold">
            Share Message <span className="text-slate-500 font-normal">(Editable before sending)</span>
          </label>
          <textarea
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            rows={5}
            className="w-full p-3 rounded-xl bg-slate-900/90 border border-white/10 focus:border-cyan-400 text-xs font-mono text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>

        {/* QUICK SHARING ACTIONS */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>

          <a
            href={`mailto:?subject=${encodeURIComponent('Zenemoo Company Portfolio')}&body=${encodeURIComponent(shareText)}`}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-bold font-mono transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Client</span>
          </a>
        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            onClick={handleCopyMessage}
            className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/10 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedMessage ? 'Message Copied!' : 'Copy Full Message'}</span>
          </button>

          <div className="flex items-center gap-2">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span>Native Share</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
