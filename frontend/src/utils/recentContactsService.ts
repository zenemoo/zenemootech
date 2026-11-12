/**
 * Centralized Client-Side Email Contacts & Recipient Autocomplete Service
 * 
 * Features:
 * - 100% Free & Zero-Egress: Operates entirely inside the client browser via localStorage and in-memory scoring.
 * - Scalable: Smoothly handles 100+ contacts with sub-millisecond instant fuzzy/prefix scoring.
 * - Gmail-Style Ranking: Exact match > Name prefix > Email prefix > Word prefix > Substring > Frequency/Recency.
 * - Dynamic Auto-Harvesting: Automatically captures recipients on send, reply, and dashboard sync.
 */

export interface RecentContact {
  email: string;
  name: string;
  role?: string; // 'Team' | 'Candidate' | 'Contact' | 'Recent'
  lastUsed?: number;
  useCount?: number;
}

const STORAGE_KEY = 'zenemoo_recent_email_contacts';

// Baseline verified enterprise senders and team pre-seeds
export const DEFAULT_PRESET_CONTACTS: RecentContact[] = [
  { email: 'contact@zenemoo.in', name: 'Zenemoo Business Team', role: 'Team', useCount: 15, lastUsed: Date.now() },
  { email: 'support@zenemoo.in', name: 'Zenemoo Customer Support', role: 'Team', useCount: 12, lastUsed: Date.now() },
  { email: 'prem@zenemoo.in', name: 'Prem Prasad Pradhan (CEO)', role: 'Team', useCount: 20, lastUsed: Date.now() },
  { email: 'sangita@zenemoo.in', name: 'Sangita Sahoo (HR Lead)', role: 'Team', useCount: 10, lastUsed: Date.now() },
  { email: 'hemanta@zenemoo.in', name: 'Hemanta Kumar Sahu (Tech Ops)', role: 'Team', useCount: 8, lastUsed: Date.now() },
  { email: 'info@zenemoo.in', name: 'Zenemoo Information Desk', role: 'Team', useCount: 5, lastUsed: Date.now() },
];

/**
 * Avatar Palette generator based on deterministic name/email hashing
 */
export const AVATAR_PALETTES = [
  { bg: 'bg-gradient-to-br from-cyan-500 to-blue-600', text: 'text-white', border: 'border-cyan-400/40' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', text: 'text-white', border: 'border-emerald-400/40' },
  { bg: 'bg-gradient-to-br from-purple-500 to-indigo-600', text: 'text-white', border: 'border-purple-400/40' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-white', border: 'border-amber-400/40' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', text: 'text-white', border: 'border-rose-400/40' },
  { bg: 'bg-gradient-to-br from-blue-500 to-cyan-600', text: 'text-white', border: 'border-blue-400/40' },
  { bg: 'bg-gradient-to-br from-teal-500 to-emerald-600', text: 'text-white', border: 'border-teal-400/40' },
  { bg: 'bg-gradient-to-br from-fuchsia-500 to-rose-600', text: 'text-white', border: 'border-fuchsia-400/40' },
];

export function getAvatarColor(nameOrEmail: string) {
  if (!nameOrEmail) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < nameOrEmail.length; i++) {
    hash = nameOrEmail.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

/**
 * Extracts a readable display name from an email address if no name is available
 */
export function extractNameFromEmail(email: string): string {
  if (!email) return '';
  const username = email.split('@')[0] || '';
  // Clean dots, underscores, numbers to title-case words: e.g. "mr.prem2006" -> "Mr Prem"
  const cleaned = username
    .replace(/[._-]+/g, ' ')
    .replace(/[0-9]+/g, '')
    .trim();
  if (!cleaned) return username;
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// In-memory contact cache for microsecond performance
let inMemoryContactsCache: RecentContact[] | null = null;

/**
 * Reads all stored contacts from localStorage (with built-in defaults)
 */
export function getStoredContacts(): RecentContact[] {
  if (inMemoryContactsCache && inMemoryContactsCache.length > 0) {
    return inMemoryContactsCache;
  }

  if (typeof window === 'undefined') return DEFAULT_PRESET_CONTACTS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge preset contacts if missing
        const existingSet = new Set(parsed.map((c: RecentContact) => c.email.toLowerCase()));
        const merged = [...parsed];
        for (const p of DEFAULT_PRESET_CONTACTS) {
          if (!existingSet.has(p.email.toLowerCase())) {
            merged.push(p);
          }
        }
        inMemoryContactsCache = merged;
        return merged;
      }
    }
  } catch (_) {}

  inMemoryContactsCache = [...DEFAULT_PRESET_CONTACTS];
  saveStoredContacts(inMemoryContactsCache);
  return inMemoryContactsCache;
}

/**
 * Saves contact list to localStorage and updates in-memory cache
 */
export function saveStoredContacts(contacts: RecentContact[]): void {
  inMemoryContactsCache = contacts;
  if (typeof window === 'undefined') return;
  try {
    // Keep up to 250 most relevant contacts to preserve space
    const trimmed = contacts.slice(0, 250);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[recentContactsService] Note saving contacts:', err);
  }
}

/**
 * Records or updates a contact whenever an email is sent, replied to, or chosen
 */
export function recordRecentRecipient(email: string, name?: string, role: string = 'Recent'): void {
  if (!email || typeof email !== 'string') return;
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@') || cleanEmail.length < 5) return;

  const current = getStoredContacts();
  const existingIdx = current.findIndex((c) => c.email.toLowerCase() === cleanEmail);

  const cleanName = (name || '').trim() || extractNameFromEmail(cleanEmail);

  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    const updated: RecentContact = {
      ...existing,
      name: cleanName || existing.name,
      role: role !== 'Recent' ? role : (existing.role || 'Recent'),
      lastUsed: Date.now(),
      useCount: (existing.useCount || 1) + 1,
    };
    // Move updated contact to top
    const next = [updated, ...current.filter((_, i) => i !== existingIdx)];
    saveStoredContacts(next);
  } else {
    const newContact: RecentContact = {
      email: cleanEmail,
      name: cleanName,
      role,
      lastUsed: Date.now(),
      useCount: 1,
    };
    saveStoredContacts([newContact, ...current]);
  }
}

/**
 * Bulk seeds contacts from in-memory objects (e.g. team roster, inquiries, candidate applications)
 * ZERO extra network egress: runs purely in-memory.
 */
export function seedContactsFromList(
  items: Array<{ email?: string; name?: string; role?: string }>
): void {
  if (!Array.isArray(items) || items.length === 0) return;

  const current = getStoredContacts();
  const map = new Map<string, RecentContact>();

  // Insert existing first
  current.forEach((c) => {
    if (c.email) map.set(c.email.toLowerCase(), c);
  });

  let changed = false;
  items.forEach((item) => {
    if (!item || !item.email) return;
    const cleanEmail = item.email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) return;

    const existing = map.get(cleanEmail);
    const cleanName = (item.name || '').trim() || extractNameFromEmail(cleanEmail);

    if (existing) {
      if (!existing.name && cleanName) {
        existing.name = cleanName;
        changed = true;
      }
      if (item.role && item.role !== 'Recent') {
        existing.role = item.role;
        changed = true;
      }
    } else {
      map.set(cleanEmail, {
        email: cleanEmail,
        name: cleanName,
        role: item.role || 'Recent',
        lastUsed: Date.now() - 86400000,
        useCount: 1,
      });
      changed = true;
    }
  });

  if (changed) {
    saveStoredContacts(Array.from(map.values()));
  }
}

/**
 * Gmail-Style Substring & Prefix Scored Contact Search
 * Returns ranked contacts matching query, excluding already selected recipient emails.
 */
export function searchContacts(
  query: string,
  excludeEmails: string[] = [],
  limit: number = 8
): RecentContact[] {
  const allContacts = getStoredContacts();
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];

  const excludeSet = new Set(
    (excludeEmails || []).map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
  );

  const scored: Array<{ contact: RecentContact; score: number }> = [];

  for (const contact of allContacts) {
    const emailLower = (contact.email || '').toLowerCase();
    if (!emailLower || excludeSet.has(emailLower)) continue;

    const nameLower = (contact.name || '').toLowerCase();

    let score = 0;

    // 1. Exact Match
    if (emailLower === q || nameLower === q) {
      score += 200;
    }
    // 2. Starts with query (Name)
    else if (nameLower.startsWith(q)) {
      score += 120;
    }
    // 3. Starts with query (Email)
    else if (emailLower.startsWith(q)) {
      score += 100;
    }
    // 4. Any individual word in name starts with query (e.g. "prasad" in "Prem Prasad Pradhan")
    else if (nameLower.split(' ').some((word) => word.startsWith(q))) {
      score += 80;
    }
    // 5. Substring match
    else if (nameLower.includes(q)) {
      score += 50;
    } else if (emailLower.includes(q)) {
      score += 40;
    } else {
      continue; // No match
    }

    // Weight by frequency of communication
    const frequencyBonus = Math.min((contact.useCount || 1) * 3, 30);
    score += frequencyBonus;

    // Weight by recency
    if (contact.lastUsed) {
      const hoursAgo = (Date.now() - contact.lastUsed) / (1000 * 60 * 60);
      if (hoursAgo < 24) score += 20;
      else if (hoursAgo < 168) score += 10;
    }

    scored.push({ contact, score });
  }

  // Sort descending by calculated relevance score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.contact);
}

