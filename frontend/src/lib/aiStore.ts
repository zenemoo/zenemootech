export type AiLanguage = 'en' | 'hi' | 'or';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language?: AiLanguage;
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

const STORAGE_KEY_CONVERSATIONS = 'zenemoo_ai_conversations_v1';
const STORAGE_KEY_LANG = 'zenemoo_ai_language_v1';

export const LANGUAGE_LABEL_MAP: Record<AiLanguage, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  or: { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
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
  if (lower.includes('transcription') || lower.includes('audio')) return 'Audio Transcription Inquiry';
  if (lower.includes('odia') || lower.includes('ଓଡ଼ିଆ')) return 'Odia Language Data';
  if (lower.includes('desicrew') || lower.includes('partner')) return 'DesiCrew Partnership';
  if (lower.includes('price') || lower.includes('cost') || lower.includes('quote')) return 'Pricing & Enterprise Quote';
  if (lower.includes('job') || lower.includes('career') || lower.includes('opportunity')) return 'Career Opportunity Inquiry';
  if (lower.includes('service') || lower.includes('annotation')) return 'AI Data Services';

  // Capitalize first 40 chars
  return clean.length > 35 ? clean.substring(0, 35) + '...' : clean;
};

/**
 * Detect language switch intent in user prompt
 */
export const detectLanguageSwitchIntent = (prompt: string): { isSwitch: boolean; targetLang?: AiLanguage; confirmMessage?: string } => {
  const p = prompt.toLowerCase().trim();

  // English triggers
  if (p === 'english' || p === 'english please' || p === 'change to english' || p === 'switch to english' || p === 'speak in english') {
    return {
      isSwitch: true,
      targetLang: 'en',
      confirmMessage: '✅ Language changed to English.',
    };
  }

  // Hindi triggers
  if (p === 'hindi' || p === 'hindi please' || p === 'change to hindi' || p === 'switch to hindi' || p === 'हिन्दी' || p === 'भाषा हिन्दी में बदलें') {
    return {
      isSwitch: true,
      targetLang: 'hi',
      confirmMessage: '✅ भाषा हिन्दी में बदल दी गई है।',
    };
  }

  // Odia triggers
  if (p === 'odia' || p === 'odia please' || p === 'change to odia' || p === 'switch to odia' || p === 'ଓଡ଼ିଆ' || p === 'ଓଡ଼ିଆରେ କୁହ' || p === 'ଭାଷା ଓଡ଼ିଆକୁ ବଦଳାନ୍ତୁ') {
    return {
      isSwitch: true,
      targetLang: 'or',
      confirmMessage: '✅ ଭାଷା ଓଡ଼ିଆକୁ ପରିବର୍ତ୍ତନ କରାଗଲା।',
    };
  }

  return { isSwitch: false };
};
