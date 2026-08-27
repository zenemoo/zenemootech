export type AiLanguage = 'en' | 'hi' | 'or';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language?: AiLanguage;
  actionButtons?: AiActionButton[];
}

export interface AiActionButton {
  label: string;
  icon: string;
  action: string; // e.g. 'navigate:/opportunities', 'scroll:#contact', 'url:https://...'
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  language: AiLanguage;
  isPinned?: boolean;
  messages: AiChatMessage[];
}

const STORAGE_KEY_CONVERSATIONS = 'zenemoo_ai_conversations_v2';
const STORAGE_KEY_LANG = 'zenemoo_ai_language_v1';

export const LANGUAGE_LABEL_MAP: Record<AiLanguage, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  or: { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
};

/**
 * Localized UI strings for multilingual drawer experience
 */
export const LANG_UI_MAP: Record<AiLanguage, {
  placeholder: string;
  sendBtn: string;
  clearBtn: string;
  exportTxt: string;
  thinking: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  suggestions: string[];
  searchPlaceholder: string;
  noHistory: string;
  pinned: string;
  recent: string;
  deleteTitle: string;
  deleteBody: string;
  cancel: string;
  confirmDelete: string;
  clearConfirm: string;
  langChanged: (langName: string) => string;
}> = {
  en: {
    placeholder: 'Ask Zenemoo AI anything (Audio Transcription, DesiCrew, Careers)...',
    sendBtn: 'Send',
    clearBtn: 'Clear Screen',
    exportTxt: 'Export TXT',
    thinking: 'Thinking and retrieving verified knowledge...',
    welcomeTitle: 'How can I help you today?',
    welcomeSubtitle: 'Ask me anything about Zenemoo — I am grounded in verified company data.',
    suggestions: [
      'Tell me about Zenemoo',
      'Download Zenemoo Android App',
      'What audio transcription services do you offer?',
      'How do I apply for a job at Zenemoo?',
      'Tell me about working with DesiCrew',
    ],
    searchPlaceholder: 'Search conversations...',
    noHistory: 'No conversations yet.',
    pinned: 'Pinned',
    recent: 'Recent Conversations',
    deleteTitle: 'Delete Conversation?',
    deleteBody: 'This action cannot be undone. All messages in this conversation will be permanently removed.',
    cancel: 'Cancel',
    confirmDelete: 'Yes, Delete',
    clearConfirm: 'Screen cleared. How can I help you?',
    langChanged: (n) => `✅ Language changed to ${n}.`,
  },
  hi: {
    placeholder: 'जेनेमू AI से कुछ भी पूछें (एंड्रॉइड ऐप, ऑडियो ट्रांसक्रिप्शन, करियर)...',
    sendBtn: 'भेजें',
    clearBtn: 'स्क्रीन साफ़ करें',
    exportTxt: 'TXT निर्यात',
    thinking: 'सोच रहा हूं और सत्यापित जानकारी प्राप्त कर रहा हूं...',
    welcomeTitle: 'मैं आपकी कैसे मदद कर सकता हूं?',
    welcomeSubtitle: 'जेनेमू के बारे में कुछ भी पूछें — मैं सत्यापित कंपनी डेटा पर आधारित हूं।',
    suggestions: [
      'जेनेमू के बारे में बताएं',
      'जेनेमू एंड्रॉइड ऐप कैसे डाउनलोड करें?',
      'ऑडियो ट्रांसक्रिप्शन सेवाएं क्या हैं?',
      'जेनेमू में नौकरी के लिए आवेदन कैसे करें?',
      'DesiCrew के साथ कार्य के बारे में बताएं',
    ],
    searchPlaceholder: 'बातचीत खोजें...',
    noHistory: 'अभी तक कोई बातचीत नहीं।',
    pinned: 'पिन की गई',
    recent: 'हाल की बातचीत',
    deleteTitle: 'बातचीत हटाएं?',
    deleteBody: 'यह क्रिया पूर्ववत नहीं की जा सकती। इस बातचीत के सभी संदेश स्थायी रूप से हटा दिए जाएंगे।',
    cancel: 'रद्द करें',
    confirmDelete: 'हां, हटाएं',
    clearConfirm: 'स्क्रीन साफ़ हो गई। मैं आपकी कैसे मदद कर सकता हूं?',
    langChanged: (n) => `✅ भाषा ${n} में बदल दी गई है।`,
  },
  or: {
    placeholder: 'ଜେନେମୁ AI କୁ ପଚାରନ୍ତୁ (ଆଣ୍ଡ୍ରଏଡ୍ ଆପ୍, ଅଡିଓ ଟ୍ରାନ୍ସକ୍ରିପସନ, କ୍ୟାରିୟର)...',
    sendBtn: 'ପଠାନ୍ତୁ',
    clearBtn: 'ସ୍କ୍ରିନ ସଫ଼ା କରନ୍ତୁ',
    exportTxt: 'TXT ରପ୍ତାନି',
    thinking: 'ଭାବୁଛି ଏବଂ ଯାଞ୍ଚ ହୋଇଥିବା ତଥ୍ୟ ଆଣୁଛି...',
    welcomeTitle: 'ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?',
    welcomeSubtitle: 'ଜେନେମୁ ବିଷୟରେ ଯେ କୌଣସି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ — ମୁଁ ଯାଞ୍ଚ ହୋଇଥିବା କମ୍ପାନି ତଥ୍ୟ ଉପରେ ଆଧାରିତ।',
    suggestions: [
      'ଜେନେମୁ ବିଷୟରେ କୁହ',
      'ଜେନେମୁ ଆଣ୍ଡ୍ରଏଡ୍ ଆପ୍ କିପରି ଡାଉନଲୋଡ୍ କରିବି?',
      'ଅଡିଓ ଟ୍ରାନ୍ସକ୍ରିପସନ ସେବା କ\'ଣ?',
      'ଜେନେମୁରେ ଚାକିରି ପାଇଁ କିପରି ଆବେଦନ କରିବି?',
      'DesiCrew ସହିତ କାର୍ଯ୍ୟ ବିଷୟରେ କୁହନ୍ତୁ',
    ],
    searchPlaceholder: 'ବାର୍ତ୍ତାଳାପ ଖୋଜନ୍ତୁ...',
    noHistory: 'ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ବାର୍ତ୍ତାଳାପ ନାହିଁ।',
    pinned: 'ପିନ୍ ହୋଇଥିବା',
    recent: 'ସାମ୍ପ୍ରତିକ ବାର୍ତ୍ତାଳାପ',
    deleteTitle: 'ବାର୍ତ୍ତାଳାପ ଡିଲିଟ୍ କରିବେ?',
    deleteBody: 'ଏହି କ୍ରିୟା ପ୍ରତ୍ୟାବର୍ତ୍ତନ ହୋଇ ପାରିବ ନାହିଁ। ଏହି ବାର୍ତ୍ତାଳାପର ସମସ୍ତ ସନ୍ଦେଶ ସ୍ଥାୟୀ ଭାବରେ ହଟାଯିବ।',
    cancel: 'ବାତିଲ',
    confirmDelete: 'ହଁ, ଡିଲିଟ୍ କରନ୍ତୁ',
    clearConfirm: 'ସ୍କ୍ରିନ ସଫ଼ା ହୋଇଗଲା। ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?',
    langChanged: (n) => `✅ ଭାଷା ${n}କୁ ପରିବର୍ତ୍ତନ କରାଗଲା।`,
  },
};

/**
 * Retrieve saved preferred language from Local Storage
 */
export const getStoredAiLanguage = (): AiLanguage => {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY_LANG);
  if (saved === 'hi' || saved === 'or' || saved === 'en') return saved;
  return 'en';
};

/**
 * Save preferred language to Local Storage
 */
export const saveAiLanguage = (lang: AiLanguage) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_LANG, lang);
};

/**
 * Retrieve saved conversations from Local Storage
 */
export const getStoredAiConversations = (): AiConversation[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse AI conversations from storage:', err);
    return [];
  }
};

/**
 * Save conversations to Local Storage
 */
export const saveAiConversations = (conversations: AiConversation[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
  } catch (err) {
    console.error('Failed to save AI conversations to storage:', err);
  }
};

/**
 * Auto-generate conversation title from initial user prompt
 */
export const generateAutoTitle = (firstPrompt: string): string => {
  const clean = firstPrompt.trim().replace(/^[^\w\s\u0B00-\u0B7F\u0900-\u097F]+/, '');
  if (!clean) return 'New Conversation';
  const lower = clean.toLowerCase();
  if (lower.includes('app') || lower.includes('apk') || lower.includes('android') || lower.includes('download') || lower.includes('ଆପ୍') || lower.includes('ऐप') || lower.includes('डाउनलोड')) return 'Zenemoo Android App';
  if (lower.includes('transcription') || lower.includes('audio') || lower.includes('ଅଡିଓ') || lower.includes('ऑडियो')) return 'Audio Transcription Inquiry';
  if (lower.includes('odia') || lower.includes('ଓଡ଼ିଆ') || lower.includes('odia')) return 'Odia Language Data';
  if (lower.includes('desicrew') || lower.includes('partner') || lower.includes('ଅଂଶୀଦ') || lower.includes('साझेदारी')) return 'Working with DesiCrew';
  if (lower.includes('price') || lower.includes('cost') || lower.includes('quote') || lower.includes('ମୂଲ୍ୟ') || lower.includes('कीमत')) return 'Pricing & Enterprise Quote';
  if (lower.includes('job') || lower.includes('career') || lower.includes('apply') || lower.includes('ଚାକିରି') || lower.includes('नौकरी')) return 'Career Opportunity Inquiry';
  if (lower.includes('service') || lower.includes('annotation') || lower.includes('ସେବା') || lower.includes('सेवा')) return 'AI Data Services';
  if (lower.includes('team') || lower.includes('who') || lower.includes('ଦଳ') || lower.includes('टीम')) return 'Team & People Inquiry';
  if (lower.includes('contact') || lower.includes('email') || lower.includes('ଯୋଗାଯୋଗ') || lower.includes('संपर्क')) return 'Contact Information';
  return clean.length > 35 ? clean.substring(0, 35) + '...' : clean;
};

/**
 * Parse AI response for navigation action tokens like {{ACTION:opportunities}}
 */
export const parseActionButtons = (content: string): { cleanContent: string; buttons: AiActionButton[] } => {
  const buttons: AiActionButton[] = [];
  const actionMap: Record<string, AiActionButton> = {
    app: { label: 'Download Android App', icon: '📱', action: 'navigate:/app/android' },
    download: { label: 'Download APK', icon: '⬇️', action: 'navigate:/app/android' },
    opportunities: { label: 'Open Opportunities', icon: '📋', action: 'navigate:/opportunities' },
    contact: { label: 'Open Contact Page', icon: '📞', action: 'scroll:#contact' },
    services: { label: 'View Services', icon: '⚡', action: 'scroll:#services' },
    partner: { label: 'Open Partnership Info', icon: '🤝', action: 'scroll:#partner' },
    team: { label: 'View Team Directory', icon: '👥', action: 'navigate:/team-directory' },
    quote: { label: 'Request a Quote', icon: '💬', action: 'scroll:#contact' },
    zenemooai: { label: 'Open Zenemoo AI Page', icon: '🤖', action: 'navigate:/zenemooai' },
  };

  let cleanContent = content.replace(/\{\{ACTION:(\w+)\}\}/gi, (_, key: string) => {
    const lk = key.toLowerCase();
    if (actionMap[lk]) buttons.push(actionMap[lk]);
    return '';
  }).trim();

  return { cleanContent, buttons };
};

/**
 * Detect language switch intent in user prompt — precise matching only.
 * IMPORTANT: Only triggers when the user explicitly intends to switch language.
 * Must NOT accidentally intercept normal Odia/Hindi sentences.
 */
export const detectLanguageSwitchIntent = (
  prompt: string
): { isSwitch: boolean; targetLang?: AiLanguage; confirmMessage?: string } => {
  const p = prompt.toLowerCase().trim();
  const pOriginal = prompt.trim();

  // --- English triggers (exact phrase or clear intent) ---
  const enExact = ['english', 'english please', 'change to english', 'switch to english',
    'speak english', 'speak in english', 'use english', 'respond in english',
    'answer in english', 'reply in english', 'language english'];
  if (enExact.some((t) => p === t)) {
    return { isSwitch: true, targetLang: 'en', confirmMessage: '✅ Language changed to English.' };
  }

  // --- Hindi triggers (exact phrase or clear intent) ---
  const hiExact = ['hindi', 'hindi please', 'change to hindi', 'switch to hindi',
    'speak hindi', 'speak in hindi', 'use hindi', 'respond in hindi',
    'answer in hindi', 'reply in hindi', 'language hindi', 'हिन्दी', 'हिंदी',
    'हिंदी में बोलो', 'हिन्दी में बात करो', 'भाषा बदलो हिंदी'];
  if (hiExact.some((t) => p === t || pOriginal === t)) {
    return { isSwitch: true, targetLang: 'hi', confirmMessage: '✅ भाषा हिन्दी में बदल दी गई है।' };
  }

  // --- Odia triggers (exact phrase only — NEVER use .includes() for Odia to avoid false positives) ---
  // These are standalone commands, NOT substrings that might appear in normal Odia sentences.
  const orExact = ['odia', 'odia please', 'change to odia', 'switch to odia',
    'speak odia', 'speak in odia', 'use odia', 'respond in odia',
    'answer in odia', 'reply in odia', 'oriya', 'language odia',
    'ଓଡ଼ିଆ', 'ଓଡ଼ିଆରେ କୁହ', 'ଓଡ଼ିଆ ଭାଷା', 'ଭାଷା ଓଡ଼ିଆ'];
  if (orExact.some((t) => p === t || pOriginal === t)) {
    return { isSwitch: true, targetLang: 'or', confirmMessage: '✅ ଭାଷା ଓଡ଼ିଆକୁ ପରିବର୍ତ୍ତନ କରାଗଲା।' };
  }

  // --- Generic exact-match only ---
  if (p === 'change language' || p === 'switch language' || p === 'language change' || p === 'language') {
    return { isSwitch: true, targetLang: 'en', confirmMessage: '✅ Language set to English. You can also say "Hindi please" or "Odia please".' };
  }

  return { isSwitch: false };
};
