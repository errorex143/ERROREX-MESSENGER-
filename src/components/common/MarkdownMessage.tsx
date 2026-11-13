import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match **bold**, *italic*, `code`, or https:// URLs
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={keyIdx++} className="font-semibold text-[var(--text-main)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      nodes.push(
        <em key={keyIdx++} className="italic opacity-90">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={keyIdx++}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-black/10 dark:bg-white/10 font-mono text-[11.5px] text-[var(--accent-primary)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('http')) {
      nodes.push(
        <a
          key={keyIdx++}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-primary)] underline underline-offset-2 hover:opacity-80 break-all"
        >
          {token}
        </a>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-neutral-300 dark:border-white/10 bg-[#0B0C10] text-neutral-100 shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.04] border-b border-white/10 text-[10px] font-mono text-neutral-400">
        <span className="uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1 text-neutral-300 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[12px] leading-relaxed font-mono text-neutral-100">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  // Split content into text segments and fenced code blocks
  const segments: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: 'text', content: content.slice(lastIdx, match.index) });
    }
    segments.push({
      type: 'code',
      lang: match[1] || 'code',
      content: match[2].replace(/\n$/, '')
    });
    lastIdx = codeBlockRegex.lastIndex;
  }

  if (lastIdx < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIdx) });
  }

  return (
    <div className="space-y-2.5 text-[13px] sm:text-[13.5px] leading-[1.68] text-[var(--text-main)] select-text max-w-[68ch]">
      {segments.map((seg, sIdx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={sIdx} language={seg.lang || 'code'} code={seg.content} />;
        }

        const lines = seg.content.split('\n');
        const blocks: React.ReactNode[] = [];
        let listItems: { ordered: boolean; items: string[] } | null = null;
        let quoteLines: string[] = [];

        const flushList = (keyPrefix: string) => {
          if (!listItems) return;
          if (listItems.ordered) {
            blocks.push(
              <ol key={`${keyPrefix}-ol`} className="list-decimal pl-5 space-y-1.5 my-1">
                {listItems.items.map((item, i) => (
                  <li key={i} className="pl-0.5">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );
          } else {
            blocks.push(
              <ul key={`${keyPrefix}-ul`} className="list-disc pl-5 space-y-1.5 my-1 marker:text-[var(--accent-primary)]">
                {listItems.items.map((item, i) => (
                  <li key={i} className="pl-0.5">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          }
          listItems = null;
        };

        const flushQuote = (keyPrefix: string) => {
          if (quoteLines.length === 0) return;
          blocks.push(
            <blockquote
              key={`${keyPrefix}-bq`}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] text-[var(--text-main)] italic space-y-1"
            >
              {quoteLines.map((ql, qi) => (
                <p key={qi}>{renderInline(ql)}</p>
              ))}
            </blockquote>
          );
          quoteLines = [];
        };

        lines.forEach((rawLine, idx) => {
          const line = rawLine.trimEnd();
          const trimmed = line.trim();

          if (!trimmed) {
            flushList(`${sIdx}-${idx}`);
            flushQuote(`${sIdx}-${idx}`);
            return;
          }

          // Blockquote
          if (trimmed.startsWith('>')) {
            flushList(`${sIdx}-${idx}`);
            quoteLines.push(trimmed.replace(/^>\s?/, ''));
            return;
          }
          flushQuote(`${sIdx}-${idx}`);

          // Headings
          const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
          if (headingMatch) {
            flushList(`${sIdx}-${idx}`);
            const level = headingMatch[1].length;
            const text = headingMatch[2];
            const sizeClass =
              level === 1
                ? 'text-base font-bold text-[var(--text-main)] pt-1'
                : level === 2
                ? 'text-[14.5px] font-bold text-[var(--text-main)] pt-1'
                : 'text-[13.5px] font-semibold text-[var(--accent-primary)] pt-0.5';
            blocks.push(
              <div key={`${sIdx}-${idx}-h`} className={sizeClass}>
                {renderInline(text)}
              </div>
            );
            return;
          }

          // Ordered list
          const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
          if (orderedMatch) {
            if (!listItems || !listItems.ordered) {
              flushList(`${sIdx}-${idx}`);
              listItems = { ordered: true, items: [] };
            }
            listItems.items.push(orderedMatch[1]);
            return;
          }

          // Unordered list (-, *, •)
          const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
          if (bulletMatch) {
            if (!listItems || listItems.ordered) {
              flushList(`${sIdx}-${idx}`);
              listItems = { ordered: false, items: [] };
            }
            listItems.items.push(bulletMatch[1]);
            return;
          }

          // Regular paragraph line
          flushList(`${sIdx}-${idx}`);
          blocks.push(
            <p key={`${sIdx}-${idx}-p`} className="break-words">
              {renderInline(trimmed)}
            </p>
          );
        });

        flushList(`${sIdx}-end`);
        flushQuote(`${sIdx}-end`);

        return <React.Fragment key={sIdx}>{blocks}</React.Fragment>;
      })}
    </div>
  );
};
