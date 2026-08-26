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
 * 3. Detect Subscription & Unsubscribe Intent with Typo Tolerance
 */
export function detectSubscriptionIntent(userMessage: string): IntentCheckResult {
  if (!userMessage || typeof userMessage !== 'string') {
    return { intent: 'NORMAL' };
  }

  const text = userMessage.trim().toLowerCase();

  // A. Check Unsubscribe Intent first (typo-tolerant matching for unsubscribe/unsucribe/unsuscribe)
  const unsubscribePatterns = [
    // Typo-tolerant keyword matches (unsubscribe, unsucribe, unsuscribe, unsubcribe, etc.)
    /\b(unsub|unsuc|unsus|unsubc|unsubs|unscub|unsucr|unsubr)[a-z]*\b/,
    /\bstop\b.*(email|update|updat|notif|newslet|message|announc)/,
    /\bremove\b.*(me|my email|my address)/,
    /\b(cancel|cancle)\b.*(sub|subscription|membership)/,
    /\bdon'?t want\b.*(update|updat|email|newslet|notif) (anymore|any more)/,
    /\b(opt out|leave list|take me off)\b/,
    /\bno more (emails|updates|notifications)\b/,
  ];

  if (unsubscribePatterns.some((pattern) => pattern.test(text))) {
    const genericQuestion = /^(what|explain|how does|definition of)\b.*unsub/i;
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

  // C. Positive Subscription Intent Patterns (typo-tolerant matching)
  const subscribePatterns = [
    /\b(subscribe|subcribe|subsribe|subscibe|subscripe|subscrib|subscribing|subscript)[a-z]*\b/,
    /\b(want|need|get|receive|send|keep|add)\b.*(update|updat|updats|notif|newslet|announc|email)/,
    /\bjoin\b.*(newslet|dispatch|list|mailing)/,
    /\bsign me up\b/,
    /\badd me to\b.*(list|newsletter|updates|dispatch)/,
    /\bkeep me updated\b/,
  ];

  if (subscribePatterns.some((p) => p.test(text))) {
    return { intent: 'SUBSCRIBE', matchReason: 'Subscription intent detected' };
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
