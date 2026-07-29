import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Professional Markdown Renderer for Zenemoo AI responses.
 * Eliminates raw ** * [] () mailto: from the visible UI.
 * Renders like ChatGPT / Claude.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-base font-bold text-white mt-3 mb-1.5 leading-snug">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-cyan-300 mt-3 mb-1 leading-snug">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xs font-bold text-slate-200 mt-2 mb-1 leading-snug">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-xs sm:text-sm leading-relaxed text-slate-200 mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-slate-300">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="my-2 space-y-1 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 space-y-1 pl-1">{children}</ol>
        ),
        li: ({ children, ordered }: any) => (
          <li className="flex items-start gap-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
            {!ordered && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
            <span>{children}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-cyan-500/50 pl-3 py-0.5 my-2 text-slate-300 italic text-xs sm:text-sm bg-white/[0.02] rounded-r-xl">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-white/10">
            <table className="w-full text-xs font-mono border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-cyan-500/10 text-cyan-300">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-white/[0.05]">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-bold text-cyan-300 text-[11px] uppercase tracking-wide">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-slate-300 text-[11px]">{children}</td>
        ),
        code: ({ inline, className: codeClass, children, ...props }: any) => {
          if (inline) {
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-cyan-300 font-mono text-[11px] border border-white/10" {...props}>
                {children}
              </code>
            );
          }
          return (
            <div className="my-2 rounded-xl overflow-hidden border border-white/10">
              <div className="flex items-center px-3 py-1.5 bg-white/[0.04] border-b border-white/10">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  {(codeClass || '').replace('language-', '') || 'code'}
                </span>
              </div>
              <pre className="p-3 overflow-x-auto bg-[#060810]">
                <code className="text-[11px] font-mono text-emerald-300 leading-relaxed" {...props}>
                  {children}
                </code>
              </pre>
            </div>
          );
        },
        hr: () => <hr className="my-3 border-white/10" />,
        a: ({ href = '', children }) => {
          if (href.startsWith('mailto:')) {
            const email = href.replace('mailto:', '');
            return (
              <a href={href} className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors text-xs sm:text-sm font-medium">
                <span>📧</span><span>{String(children) === email ? email : <>{children}</>}</span>
              </a>
            );
          }
          if (href.startsWith('tel:')) {
            return (
              <a href={href} className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors text-xs sm:text-sm font-medium">
                <span>📞</span><span>{children}</span>
              </a>
            );
          }
          if (href.startsWith('/')) {
            return (
              <a href={href} className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors text-xs sm:text-sm">
                <span>🔗</span><span>{children}</span>
              </a>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors text-xs sm:text-sm">
              <span>{children}</span><span className="text-[10px]">↗</span>
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
};
