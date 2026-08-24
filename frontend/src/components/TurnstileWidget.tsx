import React, { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err?: any) => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const DEFAULT_SITE_KEY = '0x4AAAAAAEKG_tvBPKrJx1WL';

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  onExpire,
  onError,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const activeSiteKey =
    siteKey ||
    (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY ||
    DEFAULT_SITE_KEY;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.turnstile) {
      setScriptLoaded(true);
    } else {
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        document.head.appendChild(script);
      } else {
        const handleLoad = () => setScriptLoaded(true);
        existingScript.addEventListener('load', handleLoad);
        if (window.turnstile) setScriptLoaded(true);
        return () => existingScript.removeEventListener('load', handleLoad);
      }
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (_) {}
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: activeSiteKey,
        theme: 'dark',
        size: 'normal',
        callback: (token: string) => {
          onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': (err: any) => {
          if (onError) onError(err);
        },
      });
      widgetIdRef.current = id;
    } catch (e) {
      console.warn('Turnstile render note:', e);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {}
      }
    };
  }, [scriptLoaded, activeSiteKey]);

  return (
    <div className={`flex flex-col items-center justify-center my-1 text-center ${className}`}>
      <div ref={containerRef} className="cf-turnstile min-h-[65px] flex justify-center items-center" />
    </div>
  );
};
