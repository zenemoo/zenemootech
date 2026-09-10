import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  Building2,
  Calendar,
  CreditCard,
  User,
  Mail,
  Receipt,
  Sparkles,
  AlertCircle,
  Search,
  Share2,
} from 'lucide-react';
import {
  PaymentReceiptData,
  downloadPaymentReceiptPdf,
  printPaymentReceipt,
  generateDeterministicReceiptNo,
  formatReceiptDate,
} from '../services/receiptService';

interface ZenemooReceiptVerifyPageProps {
  receiptNo?: string;
  onBackToHome?: () => void;
  onOpenAiDrawer?: () => void;
}

export function ZenemooReceiptVerifyPage({
  receiptNo: propReceiptNo,
  onBackToHome,
  onOpenAiDrawer,
}: ZenemooReceiptVerifyPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Extract receipt number from props, URL path (/receipt/verify/:id or /receipt/:id), query (?receiptNo=...), or hash
  const getInitialReceiptNo = (): string => {
    if (propReceiptNo) return propReceiptNo;

    if (typeof window === 'undefined') return '';

    const path = window.location.pathname;
    const match = path.match(/\/receipt\/(?:verify\/)?([^/?#]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]);

    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('receiptNo') || urlParams.get('orderId') || urlParams.get('id');
    if (queryParam) return queryParam;

    const hash = window.location.hash;
    const hashMatch = hash.match(/#\/?receipt\/(?:verify\/)?([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]);

    return '';
  };

  const [activeReceiptNo, setActiveReceiptNo] = useState<string>(getInitialReceiptNo());

  const fetchReceiptData = async (queryId: string) => {
    if (!queryId || !queryId.trim()) {
      setLoading(false);
      setError('Please provide a valid Receipt Number or Order ID.');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanId = queryId.trim();
    // Support normalized 7NM / ZNM
    const searchId = cleanId.replace(/^RCPT-7NM-/i, 'RCPT-ZNM-');

    try {
      // 1. First attempt dedicated backend verification API
      const res = await fetch(`/api/support/receipt/verify/${encodeURIComponent(searchId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.receipt) {
          setReceipt(data.receipt);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: Check /api/support/verify-payment/:orderId if query is an order ID
      const orderRes = await fetch(`/api/support/verify-payment/${encodeURIComponent(searchId)}`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        if (orderData && orderData.success) {
          const generatedRNo = generateDeterministicReceiptNo(
            orderData.orderId,
            orderData.paymentTime || new Date()
          );
          setReceipt({
            receiptNo: generatedRNo,
            orderId: orderData.orderId,
            paymentId: orderData.paymentId,
            transactionId: orderData.paymentId,
            amount: Number(orderData.amount || 0),
            currency: 'INR',
            customerName: orderData.customerName || 'Zenemoo Supporter',
            customerEmail: orderData.customerEmail || '',
            purpose: orderData.purpose || 'Support Zenemoo — Platform & Technology',
            status: (orderData.status || 'SUCCESS').toUpperCase(),
            paymentDate: orderData.paymentTime || new Date().toISOString(),
          });
          setLoading(false);
          return;
        }
      }

      setError('No verified payment record was found matching this receipt or order reference.');
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching receipt:', err);
      setError('Could not connect to the verification ledger. Please check your connection and try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReceiptNo) {
      fetchReceiptData(activeReceiptNo);
    } else {
      setLoading(false);
      setError('No receipt identifier specified in the URL.');
    }
  }, [activeReceiptNo]);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!receipt) return;
    setIsGeneratingPdf(true);
    try {
      await downloadPaymentReceiptPdf(receipt);
    } catch (e) {
      console.error('Download PDF error:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!receipt) return;
    printPaymentReceipt(receipt);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveReceiptNo(searchQuery.trim());
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `/receipt/verify/${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#080e1a]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800/60 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Back</span>
            </button>

            <a href="/" className="flex items-center space-x-2.5">
              <img src="/logo.png" alt="Zenemoo Logo" className="h-7 w-auto object-contain" />
              <span className="font-bold tracking-tight text-white text-base hidden sm:inline">
                ZENEMOO
              </span>
            </a>
          </div>

          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Verification Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        
        {loading ? (
          <div className="w-full max-w-lg mx-auto text-center py-20">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping"></div>
              <div className="w-20 h-20 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center">
                <Receipt className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verifying Payment Authenticity</h2>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Connecting to Zenemoo secure transaction verification ledger...
            </p>
          </div>
        ) : error || !receipt ? (
          <div className="w-full max-w-xl mx-auto">
            <div className="bg-[#0b1329] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Receipt Verification Failed</h2>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                {error || 'The requested receipt could not be located in our ledger.'}
              </p>

              {/* Manual Search Form */}
              <form onSubmit={handleManualSearch} className="mb-6">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter Receipt No (e.g. RCPT-ZNM-...) or Order ID"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/20"
                  >
                    Verify
                  </button>
                </div>
              </form>

              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                <span>Need support?</span>
                <a
                  href="mailto:support@zenemoo.in"
                  className="text-cyan-400 hover:underline font-medium"
                >
                  support@zenemoo.in
                </a>
                <span>&bull;</span>
                <a
                  href="/support-zenemooindia"
                  className="text-cyan-400 hover:underline font-medium"
                >
                  Support Zenemoo
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl mx-auto space-y-6">
            
            {/* Verified Header Banner */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold shadow-inner">
                <CheckCircle2 className="w-4 h-4" />
                <span>Officially Verified & Authenticated</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Zenemoo Payment Receipt
              </h1>
              <p className="text-sm text-slate-400">
                Official transaction record verified by Zenemoo Data Solutions
              </p>
            </div>

            {/* Receipt Main Card */}
            <div className="relative bg-gradient-to-b from-[#0c162e] to-[#080e1e] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
              
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Amount & Status Block */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="text-center sm:text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Amount Paid
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center sm:justify-start gap-1">
                    <span>₹</span>
                    <span>{Number(receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center sm:items-end">
                  <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>SUCCESSFUL PAYMENT</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 font-mono">
                    {formatReceiptDate(receipt.paymentDate)}
                  </span>
                </div>
              </div>

              {/* Receipt Number Badge */}
              <div className="my-5 p-3.5 bg-slate-900/90 border border-cyan-500/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <Receipt className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="truncate">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Receipt Number
                    </div>
                    <div className="text-sm sm:text-base font-mono font-bold text-cyan-200 truncate">
                      {receipt.receiptNo}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(receipt.receiptNo, 'receiptNo')}
                  className="shrink-0 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-medium"
                  title="Copy Receipt No"
                >
                  {copiedField === 'receiptNo' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Itemized Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm my-6">
                
                {/* Supporter / Contributor */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Contributor / Supporter</span>
                  </div>
                  <div className="font-bold text-white text-sm sm:text-base break-words">
                    {receipt.customerName || 'Zenemoo Supporter'}
                  </div>
                  {receipt.customerEmail && (
                    <div className="text-xs text-slate-400 truncate flex items-center space-x-1 pt-0.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>{receipt.customerEmail}</span>
                    </div>
                  )}
                </div>

                {/* Purpose */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Purpose / Contribution</span>
                  </div>
                  <div className="font-bold text-cyan-300 text-sm sm:text-base break-words">
                    {receipt.purpose || 'Support Zenemoo — Platform & Technology'}
                  </div>
                  <div className="text-xs text-slate-400 pt-0.5">
                    Zenemoo Ecosystem Development
                  </div>
                </div>

                {/* Order ID */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-1">
                  <div className="text-slate-400 text-xs font-medium">Order Reference</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-slate-200 break-all">
                    {receipt.orderId}
                  </div>
                </div>

                {/* Payment Reference (UPI / Cashfree) */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-1">
                  <div className="text-slate-400 text-xs font-medium">Payment ID / Reference</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-slate-200 break-all">
                    {receipt.paymentId || receipt.transactionId || 'Verified via Cashfree PG'}
                  </div>
                </div>

              </div>

              {/* Legal & Registered Business Badge */}
              <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                  <Building2 className="w-4 h-4" />
                  <span>Zenemoo Data Solutions</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11.5px]">
                  Registered MSME Entity (UDYAM-OD-11-0124893) &bull; Verified Payment Gateway Infrastructure powered by Cashfree Payments India.
                </p>
              </div>

              {/* Action Buttons: Download PDF & Print */}
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2 transition-all shadow-xl shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Official PDF Receipt'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition-all border border-slate-700 active:scale-[0.98]"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Print</span>
                </button>
              </div>

            </div>

            {/* Support Zenemoo Callout */}
            <div className="text-center py-4 space-y-2">
              <a
                href="/support-zenemooindia"
                className="inline-flex items-center space-x-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                <span>Make another contribution or support Zenemoo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="text-xs text-slate-500">
                People &bull; Opportunities &bull; A Brighter Tomorrow
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Zenemoo Data Solutions. All rights reserved.</p>
      </footer>

    </div>
  );
}
