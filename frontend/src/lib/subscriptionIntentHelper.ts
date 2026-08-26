/**
 * subscriptionIntentHelper.ts
 * Core AI Intent Detection, Email Validation & Subscription/Unsubscription State Engine
 */

export type SubscriptionState =
  | 'IDLE'
  | 'INTENT_DETECTED'
  | 'PENDING_EMAIL'
  | 'INVALID_LIMIT_REACHED'
  | 'SUBMITTING'
  | 'UNSUB_INTENT_DETECTED'
  | 'UNSUB_PENDING_EMAIL'
  | 'UNSUB_INVALID_LIMIT_REACHED'
  | 'UNSUB_SUBMITTING';

export type IntentType = 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'NORMAL';

export interface IntentCheckResult {
  intent: IntentType;
  matchReason?: string;
}

/**
 * 1. Normalize Email Address
 * Trims leading/trailing whitespace, converts to lowercase, preserves + aliases.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  let clean = email.trim().toLowerCase();
  // Remove enclosing quotes or brackets if present
  clean = clean.replace(/^["'<\(\[]+|["'>\)\],.]+$/g, '').trim();
  return clean;
}

/**
 * 2. Validate Email Address Format
 */
export function validateEmailAddress(email: string): { isValid: boolean; normalizedEmail: string } {
  const normalized = normalizeEmail(email);

  if (!normalized || normalized.length > 254 || /\s/.test(normalized)) {
    return { isValid: false, normalizedEmail: '' };
  }

  // Count '@' occurrences
  const atParts = normalized.split('@');
  if (atParts.length !== 2) {
    return { isValid: false, normalizedEmail: '' };
  }

  const [localPart, domainPart] = atParts;
  if (!localPart || !domainPart) {
    return { isValid: false, normalizedEmail: '' };
  }

  const domainParts = domainPart.split('.');
  if (domainParts.length < 2 || domainParts.some((p) => p.length === 0)) {
    return { isValid: false, normalizedEmail: '' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z0-9]+$/i.test(tld)) {
    return { isValid: false, normalizedEmail: '' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isValid = emailRegex.test(normalized);

  return { isValid, normalizedEmail: isValid ? normalized : '' };
}

/**
 * 3. Detect Subscription & Unsubscribe Intent
 */
export function detectSubscriptionIntent(userMessage: string): IntentCheckResult {
  if (!userMessage || typeof userMessage !== 'string') {
    return { intent: 'NORMAL' };
  }

  const text = userMessage.trim().toLowerCase();

  // A. Check Unsubscribe Intent first (to avoid matching 'subscribe' inside 'unsubscribe')
  const unsubscribePatterns = [
    /\bunsubscribe\b/,
    /\bstop (emails|updates|notifications|newsletter|messages|announcements)\b/,
    /\bremove me (from|off)\b/,
    /\bdon'?t want (updates|emails|newsletter|notifications) anymore\b/,
    /\bcancel (my )?subscription\b/,
    /\bopt out\b/,
    /\bcan i unsubscribe\b/,
    /\bhow (can|do) i unsubscribe\b/,
    /\bi want to unsubscribe\b/,
  ];

  if (unsubscribePatterns.some((pattern) => pattern.test(text))) {
    const genericQuestion = /^(what|explain|how does|definition of)\b.*unsubscribe/i;
    if (!genericQuestion.test(text)) {
      return { intent: 'UNSUBSCRIBE', matchReason: 'Unsubscribe intent detected' };
    }
  }

  // B. Exclude Informational & General Corporate Enquiries
  const generalInquiryPatterns = [
    /^(what is|tell me about|explain|what projects|what services|contact details|i need a quotation|quote|price|pricing)\b/i,
    /^(what does|does zenemoo have|is there a|definition of)\b.*(subscribe|subscriber|subscription)/i,
    /^what is zenemoo dispatch\??$/i,
  ];

  if (generalInquiryPatterns.some((p) => p.test(text))) {
    return { intent: 'NORMAL' };
  }

  // C. Positive Subscription Intent Patterns
  const subscribePatterns = [
    /\b(can i|i want|how (can|do) i|please|would like to|wish to) (subscribe|get updates|receive updates|join (the |your )?newsletter|join dispatch)\b/,
    /\b(subscribe|subscribing) (to|me)\b/,
    /\bcan i subscribe\b/,
    /\bi want updates\b/,
    /\bhow can i get updates\b/,
    /\bi want to receive zenemoo updates\b/,
    /\bcan you send me your latest updates\b/,
    /\bi want to join your newsletter\b/,
    /\bkeep me updated\b/,
    /\bi want zenemoo notifications\b/,
    /\bcan i get regular updates\b/,
    /\bi want to subscribe to zenemoo dispatch\b/,
    /\bhow do i get your updates\b/,
    /\bplease add me to your updates\b/,
    /\bsend me your announcements\b/,
    /\bi want to receive your emails\b/,
    /\bsign me up\b/,
    /\badd me to (the|your) (mailing list|newsletter|updates|dispatch)\b/,
    /\bget regular updates\b/,
    /\bsubscribe to newsletter\b/,
  ];

  if (subscribePatterns.some((p) => p.test(text))) {
    return { intent: 'SUBSCRIBE', matchReason: 'Subscription intent detected' };
  }

  if (/^subscribe\b/i.test(text) && !/^subscribe (meaning|definition|info|details)/i.test(text)) {
    return { intent: 'SUBSCRIBE', matchReason: 'Direct subscribe keyword match' };
  }

  return { intent: 'NORMAL' };
}

/**
 * 4. Predefined Standard Response Messages & Actions
 */
export const SUBSCRIPTION_RESPONSES = {
  // --- SUBSCRIBE FLOW ---
  INTENT_DETECTED: {
    content: `Absolutely! You can subscribe to Zenemoo Dispatch in two easy ways:

1. Subscribe directly from our official subscription page.
2. Or, if you prefer, I can register your email directly for you.

Would you like me to subscribe you directly?`,
    actionButtons: [
      { label: 'Yes, Subscribe Me', icon: '✨', action: 'sub:confirm_yes' },
      { label: 'Subscribe on Website', icon: '🌐', action: 'navigate:/subscribe' },
      { label: 'Abort', icon: '✕', action: 'sub:abort' },
    ],
  },
  PENDING_EMAIL_PROMPT: {
    content: `Perfect! Please provide the email address you'd like to use for Zenemoo Dispatch.`,
    actionButtons: [{ label: 'Abort', icon: '✕', action: 'sub:abort' }],
  },
  INVALID_EMAIL_ATTEMPT_1: {
    content: `I couldn't verify that email address. Please provide a valid email address for Zenemoo Dispatch.`,
    actionButtons: [{ label: 'Abort', icon: '✕', action: 'sub:abort' }],
  },
  INVALID_EMAIL_ATTEMPT_2: {
    content: `I still couldn't verify that email address. For your security, I haven't registered anything yet.`,
    actionButtons: [
      { label: 'Try Again', icon: '🔄', action: 'sub:try_again' },
      { label: 'Abort', icon: '✕', action: 'sub:abort' },
    ],
  },
  UNRELATED_QUESTION_DURING_EMAIL: {
    content: `Before I can complete your subscription, I need a valid email address. Please provide your email address or choose Abort.`,
    actionButtons: [{ label: 'Abort', icon: '✕', action: 'sub:abort' }],
  },
  ABORT_SUCCESS: {
    content: `No problem. The process has been cancelled.`,
    actionButtons: [],
  },
  ALREADY_SUBSCRIBED: (email: string) => ({
    content: `You're already subscribed to Zenemoo Dispatch with **${email}**. You'll continue receiving our updates.`,
    actionButtons: [],
  }),
  SUBSCRIBE_SUCCESS: (email: string) => ({
    content: `Thank You for Subscribing!

We've registered **${email}** in the official **Zenemoo Dispatch** subscriber database.

You'll receive future Zenemoo updates at this email address.`,
    actionButtons: [],
  }),

  // --- UNSUBSCRIBE FLOW ---
  UNSUB_INTENT_DETECTED: {
    content: `We're sorry to see you go! You can unsubscribe from Zenemoo Dispatch in two easy ways:

1. Unsubscribe directly from our official unsubscribe page.
2. Or, if you prefer, I can process your email unsubscription directly for you.

Would you like me to unsubscribe you directly?`,
    actionButtons: [
      { label: 'Yes, Unsubscribe Me', icon: '🔕', action: 'unsub:confirm_yes' },
      { label: 'Unsubscribe on Website', icon: '🌐', action: 'navigate:/unsubscribe' },
      { label: 'Abort', icon: '✕', action: 'sub:abort' },
    ],
  },
  UNSUB_PENDING_EMAIL_PROMPT: {
    content: `Please provide the email address you'd like to unsubscribe from Zenemoo Dispatch.`,
    actionButtons: [{ label: 'Abort', icon: '✕', action: 'sub:abort' }],
  },
  UNSUB_INVALID_EMAIL_ATTEMPT_1: {
    content: `I couldn't verify that email address. Please provide a valid email address to unsubscribe.`,
    actionButtons: [{ label: 'Abort', icon: '✕', action: 'sub:abort' }],
  },
  UNSUB_INVALID_EMAIL_ATTEMPT_2: {
    content: `I still couldn't verify that email address. For your security, I haven't modified your subscription status yet.`,
    actionButtons: [
      { label: 'Try Again', icon: '🔄', action: 'unsub:try_again' },
      { label: 'Abort', icon: '✕', action: 'sub:abort' },
    ],
  },
  UNSUB_UNRELATED_QUESTION_DURING_EMAIL: {
    content: `Before I can complete your unsubscription request, I need a valid email address. Please provide your email address or choose Abort.`,
    actionButtons: [{ label: 'Abort', icon: '✕', action: 'sub:abort' }],
  },
  NOT_SUBSCRIBED_FOUND: (email: string) => ({
    content: `The email address **${email}** was not found in the official **Zenemoo Dispatch** subscriber database.`,
    actionButtons: [],
  }),
  ALREADY_UNSUBSCRIBED: (email: string) => ({
    content: `The email address **${email}** is already unsubscribed from Zenemoo Dispatch.`,
    actionButtons: [],
  }),
  UNSUBSCRIBE_SUCCESS: (email: string) => ({
    content: `You've Been Unsubscribed.

We've removed **${email}** from the official **Zenemoo Dispatch** subscriber database. You will no longer receive regular updates from us.`,
    actionButtons: [],
  }),
};
