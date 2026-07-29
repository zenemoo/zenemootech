import React from 'react';
import { Mail, ExternalLink, Briefcase, Handshake, Phone, ArrowRight, Sparkles } from 'lucide-react';

interface FormattedMarkdownProps {
  content: string;
  onNavigateContact?: () => void;
  onNavigateOpportunities?: () => void;
  onNavigateServices?: () => void;
  onNavigatePartners?: () => void;
}

export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({
  content,
  onNavigateContact,
  onNavigateOpportunities,
  onNavigateServices,
  onNavigatePartners,
}) => {
  // Clean raw markdown mailto links: e.g. [contact@zenemoo.in](mailto:contact@zenemoo.in) -> contact@zenemoo.in
  const sanitizedContent = content
    .replace(/\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\]\(mailto:\1\)/g, '$1')
    .replace(/\[([^\]]+)\]\(mailto:([^)]+)\)/g, '$2')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1');

  // Split into lines
  const lines = sanitizedContent.split('\n');

  const renderFormattedText = (text: string) => {
    // Regex for emails
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    // Regex for bold text **word**
    const boldRegex = /\*\*([^*]+)\*\*/g;

    // Process bold text first
    let parts: (string | React.ReactNode)[] = [text];

    // Replace bold text
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach((part) => {
      if (typeof part !== 'string') {
        newParts.push(part);
        return;
      }
      const subParts = part.split(boldRegex);
      subParts.forEach((sub, idx) => {
        if (idx % 2 === 1) {
          newParts.push(<strong key={`bold-${idx}-${sub}`} className="font-bold text-white">{sub}</strong>);
        } else if (sub) {
          newParts.push(sub);
        }
      });
    });

    // Replace emails with clickable email badges
    const finalParts: (string | React.ReactNode)[] = [];
    newParts.forEach((part, pIdx) => {
      if (typeof part !== 'string') {
        finalParts.push(part);
        return;
      }
      const emailMatches = part.split(emailRegex);
      emailMatches.forEach((sub, idx) => {
        if (emailRegex.test(sub)) {
          finalParts.push(
            <a
              key={`email-${pIdx}-${idx}`}
              href={`mailto:${sub}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20 font-mono text-xs font-bold transition-all mx-0.5"
            >
              <Mail className="w-3 h-3 text-cyan-400" />
              {sub}
            </a>
          );
        } else if (sub) {
          finalParts.push(sub);
        }
      });
    });

    return finalParts;
  };

  // Keywords detection for Action Buttons
  const lowerContent = content.toLowerCase();
  const showContactBtn = lowerContent.includes('contact') || lowerContent.includes('email') || lowerContent.includes('phone') || lowerContent.includes('reach out');
  const showOpportunityBtn = lowerContent.includes('opportunity') || lowerContent.includes('job') || lowerContent.includes('career') || lowerContent.includes('apply');
  const showPartnerBtn = lowerContent.includes('partner') || lowerContent.includes('desicrew') || lowerContent.includes('alliance');

  return (
    <div className="space-y-2 text-xs sm:text-sm font-sans leading-relaxed text-slate-200">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;

        // Headers ###
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lIdx} className="text-sm font-bold font-display text-cyan-300 pt-2 pb-1 border-b border-white/5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {renderFormattedText(trimmed.replace('### ', ''))}
            </h4>
          );
        }

        // Bullet list item
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const itemText = trimmed.replace(/^[*|-]\s+/, '');
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2 my-1">
              <span className="text-cyan-400 font-bold mt-1">•</span>
              <div className="flex-1">{renderFormattedText(itemText)}</div>
            </div>
          );
        }

        // Numbered list item
        if (/^\d+\.\s/.test(trimmed)) {
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-2 my-1">
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 font-mono text-[11px] font-bold mt-0.5">{numMatch[1]}</span>
                <div className="flex-1">{renderFormattedText(numMatch[2])}</div>
              </div>
            );
          }
        }

        // Standard Paragraph
        return (
          <p key={lIdx} className="my-0.5">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}

      {/* Interactive Quick Action Buttons Bar */}
      {(showContactBtn || showOpportunityBtn || showPartnerBtn) && (
        <div className="pt-3 flex flex-wrap items-center gap-2 font-mono text-xs border-t border-white/5 mt-3">
          {showContactBtn && (
            <a
              href="#contact"
              onClick={(e) => {
                if (onNavigateContact) {
                  e.preventDefault();
                  onNavigateContact();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer font-bold"
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400" /> Open Contact Page
            </a>
          )}

          {showOpportunityBtn && (
            <a
              href="/opportunities"
              onClick={(e) => {
                if (onNavigateOpportunities) {
                  e.preventDefault();
                  onNavigateOpportunities();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-all cursor-pointer font-bold"
            >
              <Briefcase className="w-3.5 h-3.5 text-purple-400" /> View Opportunities
            </a>
          )}

          {showPartnerBtn && (
            <a
              href="#partner"
              onClick={(e) => {
                if (onNavigatePartners) {
                  e.preventDefault();
                  onNavigatePartners();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer font-bold"
            >
              <Handshake className="w-3.5 h-3.5 text-amber-400" /> DesiCrew Alliance
            </a>
          )}
        </div>
      )}
    </div>
  );
};
