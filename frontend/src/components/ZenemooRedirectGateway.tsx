import React, { useEffect, useState } from 'react';
import { shortenerApi } from '../services/api';
import { RefreshCw, ExternalLink, AlertTriangle, XCircle, ArrowLeft, Globe } from 'lucide-react';

interface ZenemooRedirectGatewayProps {
  code: string;
}

export const ZenemooRedirectGateway: React.FC<ZenemooRedirectGatewayProps> = ({ code }) => {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'disabled' | 'expired' | 'not-found'>('loading');
  const [destinationUrl, setDestinationUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!code) {
      setStatus('not-found');
      return;
    }

    const resolveLink = async () => {
      try {
        const res = await shortenerApi.getLink(code, true);
        if (!isMounted) return;

        if (res.data?.success && res.data.link) {
          const link = res.data.link;

          // Check disabled
          if (link.status === 'disabled' || link.is_active === false) {
            setStatus('disabled');
            return;
          }

          // Check expired
          if (link.expires_at) {
            const expTime = new Date(link.expires_at).getTime();
            if (!isNaN(expTime) && expTime <= Date.now()) {
              setStatus('expired');
              return;
            }
          }

          // Valid destination
          if (link.destination_url) {
            setStatus('redirecting');
            setDestinationUrl(link.destination_url);

            // Preserve incoming query parameters & hash
            try {
              const target = new URL(link.destination_url);
              const current = new URL(window.location.href);
              for (const [k, v] of current.searchParams.entries()) {
                if (!target.searchParams.has(k)) {
                  target.searchParams.set(k, v);
                }
              }
              window.location.replace(target.toString());
            } catch (_) {
              window.location.replace(link.destination_url);
            }
            return;
          }
        }
        setStatus('not-found');
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('not-found');
        setErrorMessage(err.message || 'Link could not be resolved');
      }
    };

    resolveLink();

    return () => {
      isMounted = false;
    };
  }, [code]);

  return (
    <div className="min-h-screen bg-[#06070b] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl text-center relative z-10 space-y-6">
        {/* Brand */}
        <div className="inline-flex items-center gap-2 text-sm font-bold tracking-tight text-white uppercase">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80 animate-pulse" />
          Zenemoo Secure Gateway
        </div>

        {/* Status: Loading / Redirecting */}
        {(status === 'loading' || status === 'redirecting') && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Redirecting you securely...</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Resolving destination for <span className="text-cyan-300">/l/{code}</span>
              </p>
            </div>
            {destinationUrl && (
              <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs mx-auto">
                Target: {destinationUrl}
              </p>
            )}
          </div>
        )}

        {/* Status: Disabled */}
        {status === 'disabled' && (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Link Inactive
              </span>
              <h2 className="text-lg font-bold text-white mt-2">Link Temporarily Disabled</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This Zenemoo short link has been disabled by an administrator and cannot redirect at this time.
              </p>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Zenemoo</span>
            </a>
          </div>
        )}

        {/* Status: Expired */}
        {status === 'expired' && (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                Expired
              </span>
              <h2 className="text-lg font-bold text-white mt-2">Link Has Expired</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This short link had an active expiration timestamp that has now passed.
              </p>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Zenemoo</span>
            </a>
          </div>
        )}

        {/* Status: Not Found */}
        {status === 'not-found' && (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 uppercase tracking-wider">
                404 Not Found
              </span>
              <h2 className="text-lg font-bold text-white mt-2">Short Link Not Found</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                The link code <span className="font-mono text-cyan-300">/l/{code}</span> does not match any active destination or may have been deleted.
              </p>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Home</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
