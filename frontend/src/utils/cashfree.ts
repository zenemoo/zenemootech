/**
 * Cashfree Payments Web SDK (v3) Loader & Integration Helper
 * Loads official SDK from https://sdk.cashfree.com/js/v3/cashfree.js
 */

declare global {
  interface Window {
    Cashfree?: (options: { mode: 'sandbox' | 'production' }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: '_modal' | '_self' | '_top';
      }) => Promise<any>;
    };
  }
}

let cashfreeScriptPromise: Promise<void> | null = null;

export const loadCashfreeSdk = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.Cashfree) {
    return Promise.resolve();
  }

  if (cashfreeScriptPromise) {
    return cashfreeScriptPromise;
  }

  cashfreeScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Cashfree SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      cashfreeScriptPromise = null;
      reject(new Error('Failed to load Cashfree Payments SDK. Check internet connection.'));
    };
    document.body.appendChild(script);
  });

  return cashfreeScriptPromise;
};

export interface LaunchCheckoutOptions {
  paymentSessionId: string;
  mode?: 'sandbox' | 'production';
  onCompleted?: () => void;
  onClosed?: () => void;
}

export const launchCashfreeCheckout = async ({
  paymentSessionId,
  mode = 'sandbox',
}: LaunchCheckoutOptions): Promise<any> => {
  await loadCashfreeSdk();

  if (!window.Cashfree) {
    throw new Error('Cashfree SDK could not be initialized.');
  }

  const cashfree = window.Cashfree({ mode });
  return cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_modal',
  });
};
