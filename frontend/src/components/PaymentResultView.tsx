import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  Printer,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Heart,
  Share2,
  ExternalLink,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supportApi } from '../services/api';
import {
  downloadPaymentReceiptPdf,
  printPaymentReceipt,
  generateDeterministicReceiptNo,
  PaymentReceiptData,
} from '../services/receiptService';

export interface VerifiedReceipt {
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  purpose: string;
  paymentMethod?: string;
  paymentTime: string;
  createdAt?: string;
}

interface PaymentResultViewProps {
  orderId: string;
  onClose?: () => void;
  onRetry?: () => void;
}

export const PaymentResultView: React.FC<PaymentResultViewProps> = ({
  orderId,
  onClose,
  onRetry,
}) => {
  const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'pending' | 'failed' | 'cancelled'>('verifying');
  const [receipt, setReceipt] = useState<VerifiedReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const isMountedRef = useRef<boolean>(true);

  const verifyPayment = async (attempt = 0) => {
    if (!orderId) return;
    setVerificationState('verifying');
    setErrorMessage(null);

    try {
      const res = await supportApi.verifyPayment(orderId);
      const data = res?.data || res;

      if (!isMountedRef.current) return;

      if (data?.status === 'SUCCESS') {
        setReceipt({
          orderId: data.orderId || orderId,
          paymentId: data.paymentId || `CF_${orderId}`,
          amount: Number(data.amount) || 0,
          currency: data.currency || 'INR',
          status: 'SUCCESS',
          customerName: data.customerName || 'Zenemoo Supporter',
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone || '',
          purpose: data.purpose || 'Support Zenemoo — Platform & Technology',
          paymentMethod: data.paymentMethod || 'UPI / Cashfree',
          paymentTime: data.paymentTime || data.createdAt || new Date().toISOString(),
        });
        setVerificationState('success');
      } else if (data?.status === 'FAILED') {
        setVerificationState('failed');
        setErrorMessage('The payment could not be completed by your bank or payment method.');
      } else if (data?.status === 'CANCELLED') {
        setVerificationState('cancelled');
      } else {
        // Pending state - retry up to 3 times with a 2.5s delay
        if (attempt < 3) {
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(attempt + 1);
              verifyPayment(attempt + 1);
            }
          }, 2500);
        } else {
          setVerificationState('pending');
        }
      }
    } catch (err: any) {
      console.warn('Payment verification error:', err);
      if (isMountedRef.current) {
        if (attempt < 2) {
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(attempt + 1);
              verifyPayment(attempt + 1);
            }
          }, 2000);
        } else {
          setVerificationState('pending');
          setErrorMessage('Unable to verify payment status immediately. If money was deducted, your receipt will be confirmed shortly.');
        }
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    verifyPayment(0);
    return () => {
      isMountedRef.current = false;
    };
  }, [orderId]);

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  // Generate and download verified PDF receipt matching Image 2
  const handleDownloadReceiptPdf = async () => {
    if (!receipt || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const receiptNo = generateDeterministicReceiptNo(receipt.orderId, receipt.paymentTime);
      const receiptData: PaymentReceiptData = {
        receiptNo,
        paymentDate: receipt.paymentTime,
        receiptGeneratedDate: new Date(),
        linkId: (receipt as any).linkId || null,
        orderId: receipt.orderId,
        transactionId: receipt.paymentId || null,
        customerName: receipt.customerName || 'Zenemoo Supporter',
        customerEmail: receipt.customerEmail || '',
        customerPhone: receipt.customerPhone || null,
        purpose: receipt.purpose || 'Support Zenemoo — Platform & Technology',
        paymentType: receipt.purpose?.toLowerCase().includes('support') ? 'Support Payment' : 'Client Payment',
        gateway: 'Cashfree Payments',
        paymentMethod: receipt.paymentMethod || 'UPI / Cashfree',
        amount: Number(receipt.amount),
        currency: receipt.currency || 'INR',
        bankReferenceNo: receipt.paymentId || null,
        gatewayResponse: 'Payment completed successfully',
        status: 'SUCCESS',
      };

      await downloadPaymentReceiptPdf(receiptData);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!receipt) return;
    try {
      const receiptNo = generateDeterministicReceiptNo(receipt.orderId, receipt.paymentTime);
      const receiptData: PaymentReceiptData = {
        receiptNo,
        paymentDate: receipt.paymentTime,
        receiptGeneratedDate: new Date(),
        linkId: (receipt as any).linkId || null,
        orderId: receipt.orderId,
        transactionId: receipt.paymentId || null,
        customerName: receipt.customerName || 'Zenemoo Supporter',
        customerEmail: receipt.customerEmail || '',
        customerPhone: receipt.customerPhone || null,
        purpose: receipt.purpose || 'Support Zenemoo — Platform & Technology',
        paymentType: receipt.purpose?.toLowerCase().includes('support') ? 'Support Payment' : 'Client Payment',
        gateway: 'Cashfree Payments',
        paymentMethod: receipt.paymentMethod || 'UPI / Cashfree',
        amount: Number(receipt.amount),
        currency: receipt.currency || 'INR',
        bankReferenceNo: receipt.paymentId || null,
        gatewayResponse: 'Payment completed successfully',
        status: 'SUCCESS',
      };

      await printPaymentReceipt(receiptData);
    } catch (err) {
      console.error('Failed to print receipt:', err);
      window.print();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto font-sans text-slate-200">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-[#070b14]/95 via-[#0a0f1d]/95 to-[#070b14]/95 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* VERIFYING / LOADING STATE */}
        {verificationState === 'verifying' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/20">
              <RotateCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-display">Verifying Payment Status</h3>
              <p className="text-xs text-slate-400 font-mono">
                Confirming transaction security with Cashfree Payment Gateway...
              </p>
              {retryCount > 0 && (
                <p className="text-[11px] text-cyan-400 font-mono">
                  Verification check {retryCount} of 3...
                </p>
              )}
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {verificationState === 'success' && receipt && (
          <div className="space-y-6">
            {/* Top Success Badge */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
                Thank You for Supporting Zenemoo
              </h2>
              <p className="text-xs text-emerald-300 font-medium">
                Your support contribution has been received successfully.
              </p>
            </div>

            {/* Amount & Status Card */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-center space-y-1 relative overflow-hidden">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
                ₹{receipt.amount.toLocaleString('en-IN')}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" /> Payment Successful
              </div>
            </div>

            {/* Receipt Key Information Table */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/[0.01] space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">Order ID:</span>
                <div className="flex items-center gap-1 text-white font-bold">
                  <span className="break-all">{receipt.orderId}</span>
                  <button
                    type="button"
                    onClick={handleCopyOrderId}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Copy Order ID"
                  >
                    {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {receipt.paymentId && (
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-400">Payment Reference:</span>
                  <span className="text-cyan-300 font-semibold">{receipt.paymentId}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">Supporter:</span>
                <span className="text-white font-medium">{receipt.customerName}</span>
              </div>

              {receipt.customerEmail && (
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-400">Confirmation Sent To:</span>
                  <span className="text-slate-200">{receipt.customerEmail}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-slate-200 uppercase">{receipt.paymentMethod || 'UPI / Cashfree'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="text-slate-200">
                  {new Date(receipt.paymentTime).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Emotional Impact Note */}
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-slate-300 leading-relaxed text-center">
              <span className="text-cyan-400 font-semibold">Your support helps us</span> build better technology, empower regional contributors, expand opportunities, and create a brighter future.
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadReceiptPdf}
                  disabled={isGeneratingPdf}
                  className="py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Receipt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 text-xs font-mono font-medium flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  else window.location.href = '/support-zenemooindia';
                }}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Zenemoo Support</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PENDING STATE */}
        {verificationState === 'pending' && (
          <div className="py-8 text-center space-y-4 font-mono">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/20">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-display">Payment Verification in Progress</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                We are currently confirming your payment with Cashfree and your bank. If the amount was debited, your receipt will be confirmed automatically.
              </p>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-xs text-slate-300">
              Order ID: <strong className="text-white">{orderId}</strong>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => verifyPayment(0)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer transition-all hover:bg-cyan-500/30 flex items-center gap-2"
              >
                <RotateCw className="w-3.5 h-3.5" /> Check Status Again
              </button>
              <button
                type="button"
                onClick={() => (onClose ? onClose() : (window.location.href = '/support-zenemooindia'))}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/10 text-xs cursor-pointer hover:bg-white/[0.08]"
              >
                Return to Support
              </button>
            </div>
          </div>
        )}

        {/* FAILED STATE */}
        {verificationState === 'failed' && (
          <div className="py-8 text-center space-y-4 font-mono">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-display">Payment Failed</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {errorMessage || 'Your payment could not be completed. Any debited amount is usually refunded by your bank within 2–4 business days.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => (onRetry ? onRetry() : (window.location.href = '/support-zenemooindia'))}
                className="px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer transition-all hover:bg-cyan-500/30"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => (onClose ? onClose() : (window.location.href = '/support-zenemooindia'))}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/10 text-xs cursor-pointer hover:bg-white/[0.08]"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* CANCELLED STATE */}
        {verificationState === 'cancelled' && (
          <div className="py-8 text-center space-y-4 font-mono">
            <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-400 mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-display">Payment Cancelled</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You cancelled the checkout. You can support Zenemoo whenever you are ready.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => (onRetry ? onRetry() : (window.location.href = '/support-zenemooindia'))}
                className="px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer transition-all hover:bg-cyan-500/30"
              >
                Support Now
              </button>
              <button
                type="button"
                onClick={() => (onClose ? onClose() : (window.location.href = '/support-zenemooindia'))}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-slate-300 border border-white/10 text-xs cursor-pointer hover:bg-white/[0.08]"
              >
                Return to Page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
