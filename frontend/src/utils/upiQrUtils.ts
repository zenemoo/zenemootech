import QRCode from 'qrcode';

export interface UpiIntentParams {
  upiId: string;
  payeeName: string;
  amount: number | string;
  currency?: string;
  note?: string;
  transactionRef?: string;
}

/**
 * Validates a standard Indian Unified Payments Interface (UPI) VPA / ID
 * Format: username@bank / mobile@upi (e.g. user@okhdfcbank, 9876543210@paytm, user.name@oksbi)
 */
export function validateUpiId(upi: string): { isValid: boolean; cleanUpi: string; error?: string } {
  if (!upi || typeof upi !== 'string') {
    return { isValid: false, cleanUpi: '', error: 'UPI ID is required' };
  }

  const cleanUpi = upi.trim().toLowerCase();

  // Strict rejection of #N/A, N/A, null, undefined
  if (/^(#n\/a|n\/a|na|null|undefined|-)$/i.test(cleanUpi)) {
    return { isValid: false, cleanUpi, error: 'Invalid UPI ID (#N/A or empty)' };
  }

  // UPI VPA RFC/NPCI standard format regex: alphanumeric + allowed dots/hyphens/underscores + @ + bank handler
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;

  if (!upiRegex.test(cleanUpi)) {
    return {
      isValid: false,
      cleanUpi,
      error: 'Invalid UPI ID format (expected format: username@bank or mobile@upi)',
    };
  }

  return { isValid: true, cleanUpi };
}

/**
 * Generates a standardized NPCI UPI Payment Intent URI
 * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 */
export function generateUpiIntentUrl(params: UpiIntentParams): string {
  const { upiId, payeeName, amount, currency = 'INR', note = 'Zenemoo Work Payout', transactionRef } = params;

  const cleanUpi = (upiId || '').trim().toLowerCase();
  const cleanName = (payeeName || 'Contributor')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .slice(0, 50) || 'Contributor';

  const numAmount = Number(amount);
  const formattedAmount = (!isNaN(numAmount) && numAmount > 0) ? numAmount.toFixed(2) : '0.00';

  const queryParams = new URLSearchParams();
  queryParams.set('pa', cleanUpi);
  queryParams.set('pn', cleanName);
  queryParams.set('am', formattedAmount);
  queryParams.set('cu', currency.toUpperCase());
  
  if (note) {
    queryParams.set('tn', note.slice(0, 80));
  }

  if (transactionRef) {
    queryParams.set('tr', transactionRef.slice(0, 35));
  }

  return `upi://pay?${queryParams.toString()}`;
}

/**
 * Generates a high-contrast, easy-to-scan QR Code as a Data URL (PNG)
 * Completely generated client-side in the browser using the qrcode library (zero external API calls)
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      width: 380,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err: any) {
    console.error('[QRCode Generation Error]:', err);
    throw new Error('Failed to generate local QR code: ' + (err.message || 'Unknown error'));
  }
}

/**
 * Generates an SVG representation of the QR code for crisp rendering
 */
export async function generateQrSvg(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 360,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err: any) {
    console.error('[QRCode SVG Generation Error]:', err);
    throw new Error('Failed to generate local QR SVG: ' + (err.message || 'Unknown error'));
  }
}

/**
 * Formats a currency number in standard Indian Numbering system (e.g. ₹1,23,450.00)
 */
export function formatInr(amount: number | string): string {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Returns current Date and Time in Indian Standard Time (IST) in ISO format (YYYY-MM-DD)
 */
export function getIstCurrentDate(): string {
  try {
    const now = new Date();
    // Offset for IST UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  } catch (_) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Returns current Date & Time formatted string in IST
 */
export function getIstCurrentDateTimeString(): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
  } catch (_) {
    return new Date().toLocaleString();
  }
}
