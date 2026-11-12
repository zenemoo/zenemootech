import React, { useEffect, useRef } from 'react';
import { RecentContact, getAvatarColor } from '../utils/recentContactsService';
import { Mail, User, Sparkles } from 'lucide-react';

export interface EmailRecipientAutocompleteDropdownProps {
  suggestions: RecentContact[];
  highlightedIndex: number;
  onSelect: (contact: RecentContact) => void;
  onClose: () => void;
  query?: string;
  className?: string;
}

/**
 * Highlights matching query occurrences in text
 */
function HighlightMatch({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim() || !text) {
    return <span>{text}</span>;
  }

  const cleanQuery = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return <span>{text}</span>;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + cleanQuery.length);
  const after = text.slice(matchIndex + cleanQuery.length);

  return (
    <span>
      {before}
      <span className="text-cyan-300 font-bold underline decoration-cyan-400/60 bg-cyan-500/10 rounded px-0.5">
        {match}
      </span>
      {after}
    </span>
  );
}

/**
 * Extract 1-2 letter uppercase initials
 */
function getInitials(name: string, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export const EmailRecipientAutocompleteDropdown: React.FC<EmailRecipientAutocompleteDropdownProps> = ({
  suggestions,
  highlightedIndex,
  onSelect,
  onClose,
  query = '',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smoothly scroll highlighted item into view during arrow key navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute left-0 right-0 sm:right-auto sm:min-w-[360px] max-w-full z-50 mt-1 bg-[#090d16]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1 ${className}`}
      style={{
        boxShadow: '0 18px 40px -10px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(6, 182, 212, 0.15)',
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Suggested Contacts</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px]">
            {suggestions.length}
          </span>
        </div>
        <span className="hidden sm:inline-block text-[9px] text-slate-500 font-mono">
          ↑↓ Navigate • ↵ Select
        </span>
      </div>

      {/* Suggestion list */}
      <div className="max-h-[260px] overflow-y-auto divide-y divide-white/[0.04] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {suggestions.map((contact, idx) => {
          const isHighlighted = idx === highlightedIndex;
          const palette = getAvatarColor(contact.name || contact.email);
          const initials = getInitials(contact.name, contact.email);

          return (
            <div
              key={`${contact.email}_${idx}`}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              onMouseDown={(e) => {
                // Prevent input blur before click is handled
                e.preventDefault();
                onSelect(contact);
              }}
              onClick={() => onSelect(contact)}
              className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-all duration-100 select-none ${
                isHighlighted
                  ? 'bg-cyan-500/20 border-l-4 border-l-cyan-400 pl-2.5'
                  : 'hover:bg-white/[0.05] border-l-4 border-l-transparent'
              }`}
            >
              {/* Avatar circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${palette.bg} ${palette.text} ${palette.border}`}
              >
                {initials}
              </div>

              {/* Contact info */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-xs text-white truncate max-w-[200px]">
                    <HighlightMatch text={contact.name || contact.email.split('@')[0]} query={query} />
                  </div>
                  {contact.role && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono shrink-0 uppercase tracking-wider ${
                        contact.role === 'Team'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : contact.role === 'Candidate'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : contact.role === 'Enterprise'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-white/10 text-slate-300 border border-white/10'
                      }`}
                    >
                      {contact.role}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-cyan-300/80 truncate">
                  <HighlightMatch text={contact.email} query={query} />
                </div>
              </div>

              {/* Select shortcut hint */}
              {isHighlighted && (
                <div className="shrink-0 text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-400/30">
                  ↵
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile-friendly bottom dismiss / touch tip */}
      <div className="sm:hidden px-3 py-1 bg-white/[0.02] border-t border-white/[0.06] text-center">
        <span className="text-[10px] text-slate-500">Tap any contact to insert</span>
      </div>
    </div>
  );
};

