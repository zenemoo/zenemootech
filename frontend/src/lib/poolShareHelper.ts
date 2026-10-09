/**
 * Zenemoo Pool Sharing Utility
 * Generates dynamic WhatsApp and multi-platform share messages with direct 1-click option links.
 */

import { PoolItem, PoolOptionItem } from '../services/poolApi';

// Distinct color emoji indicators for dynamic options
export const OPTION_EMOJI_BULLETS = ['🟢', '🔵', '🟣', '🟠', '🟡', '🔴', '⚪', '🟤'];

/**
 * Gets the base website URL for share links.
 */
export function getPoolShareBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    // If running in development on localhost, default public links to production domain for sharing
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://www.zenemoo.in';
    }
    return origin;
  }
  return 'https://www.zenemoo.in';
}

/**
 * Generates a direct one-click participate URL for a specific option in a pool.
 */
export function generatePoolOptionUrl(publicId: string, optionId: string, customBaseUrl?: string): string {
  const baseUrl = customBaseUrl || getPoolShareBaseUrl();
  return `${baseUrl}/pool/${encodeURIComponent(publicId)}?option=${encodeURIComponent(optionId)}`;
}

/**
 * Generates the complete, professional WhatsApp/SMS/Email friendly share text with dynamic option links.
 * 
 * Format:
 * ZENEMOO POOL
 * 
 * <Question Title>
 * 
 * 🟢 <Option 1 Text>
 * 👉 https://www.zenemoo.in/pool/ZNM-PL-XXX?option=opt1
 * 
 * 🔵 <Option 2 Text>
 * 👉 https://www.zenemoo.in/pool/ZNM-PL-XXX?option=opt2
 * 
 * Tap your answer to participate.
 */
export function generatePoolShareMessage(pool: PoolItem, customBaseUrl?: string): string {
  const baseUrl = customBaseUrl || getPoolShareBaseUrl();
  const options = Array.isArray(pool.options) ? pool.options : [];

  const optionsLines = options.map((opt, index) => {
    const bullet = OPTION_EMOJI_BULLETS[index % OPTION_EMOJI_BULLETS.length];
    const optionUrl = generatePoolOptionUrl(pool.public_id, opt.id, baseUrl);
    return `${bullet} ${opt.option_text}\n👉 ${optionUrl}`;
  }).join('\n\n');

  return `ZENEMOO POOL\n\n${pool.title}\n\n${optionsLines}\n\nTap your answer to participate.`;
}

/**
 * Opens WhatsApp with the complete pre-populated share message.
 */
export function openWhatsAppShare(message: string): void {
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Copies the share message to clipboard.
 */
export async function copyPoolShareMessage(message: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Invokes native Web Share API where supported.
 */
export async function sharePoolNative(pool: PoolItem, message: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Zenemoo Pool: ${pool.title}`,
        text: message,
      });
      return true;
    } catch (err: any) {
      // User cancelled or share failed
      if (err.name !== 'AbortError') {
        console.warn('[Native Share Warning]:', err);
      }
    }
  }
  return false;
}
