import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match [label](https://url), **bold**, *italic*, `code`, or bare https:// URLs
  const tokenRegex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-primary)] font-medium underline underline-offset-2 hover:opacity-80 break-words"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('**') && token.endsWith('**')) {
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
    <div className="my-3 rounded-xl overflow-hidden border border-neutral-300 dark:border-white/10 bg-[#0B0C10] text-neutral-100 shadow-sm">
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
    <div className="space-y-3 text-[13.5px] sm:text-[14px] leading-[1.72] text-[var(--text-main)] select-text max-w-[70ch] tracking-[0.005em]">
      {segments.map((seg, sIdx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={sIdx} language={seg.lang || 'code'} code={seg.content} />;
        }

        const lines = seg.content.split('\n');
        const blocks: React.ReactNode[] = [];
        let listItems: { ordered: boolean; items: string[] } | null = null;
        let quoteLines: string[] = [];
        let tableLines: string[] = [];

        const flushList = (keyPrefix: string) => {
          if (!listItems) return;
          if (listItems.ordered) {
            blocks.push(
              <ol key={`${keyPrefix}-ol`} dir="auto" className="list-decimal pl-5 space-y-1.5 my-1.5 marker:text-[var(--accent-primary)] marker:font-semibold">
                {listItems.items.map((item, i) => (
                  <li key={i} className="pl-1">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );
          } else {
            blocks.push(
              <ul key={`${keyPrefix}-ul`} dir="auto" className="list-disc pl-5 space-y-1.5 my-1.5 marker:text-[var(--accent-primary)]">
                {listItems.items.map((item, i) => (
                  <li key={i} className="pl-1">
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
              dir="auto"
              className="px-4 py-3 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] text-[var(--text-main)] italic space-y-1.5 my-1.5"
            >
              {quoteLines.map((ql, qi) => (
                <p key={qi} dir="auto">{renderInline(ql)}</p>
              ))}
            </blockquote>
          );
          quoteLines = [];
        };

        const flushTable = (keyPrefix: string) => {
          if (tableLines.length === 0) return;
          const rows = tableLines
            .filter(r => !/^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?$/.test(r))
            .map(r =>
              r
                .replace(/^\|/, '')
                .replace(/\|$/, '')
                .split('|')
                .map(c => c.trim())
            );
          if (rows.length > 0) {
            const [header, ...body] = rows;
            blocks.push(
              <div key={`${keyPrefix}-tbl`} className="overflow-x-auto my-2 rounded-xl border border-[var(--accent-border)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--accent-surface)] text-[var(--accent-primary)] font-semibold">
                    <tr>
                      {header.map((cell, ci) => (
                        <th key={ci} className="px-3 py-2 border-b border-[var(--accent-border)]">
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/40 dark:divide-white/5">
                    {body.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          tableLines = [];
        };

        lines.forEach((rawLine, idx) => {
          const line = rawLine.trimEnd();
          const trimmed = line.trim();

          if (!trimmed) {
            flushList(`${sIdx}-${idx}`);
            flushQuote(`${sIdx}-${idx}`);
            flushTable(`${sIdx}-${idx}`);
            return;
          }

          // Horizontal divider (--- or ***)
          if (/^([-*_]){3,}$/.test(trimmed)) {
            flushList(`${sIdx}-${idx}`);
            flushQuote(`${sIdx}-${idx}`);
            flushTable(`${sIdx}-${idx}`);
            blocks.push(
              <hr key={`${sIdx}-${idx}-hr`} className="my-2.5 border-t border-[var(--accent-border)] opacity-60" />
            );
            return;
          }

          // Markdown table row
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            flushList(`${sIdx}-${idx}`);
            flushQuote(`${sIdx}-${idx}`);
            tableLines.push(trimmed);
            return;
          }
          flushTable(`${sIdx}-${idx}`);

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
                ? 'text-base sm:text-[17px] font-bold text-[var(--text-main)] pt-1.5 tracking-tight'
                : level === 2
                ? 'text-[15px] font-bold text-[var(--text-main)] pt-1.5 tracking-tight'
                : 'text-[14px] font-semibold text-[var(--accent-primary)] pt-1';
            blocks.push(
              <div key={`${sIdx}-${idx}-h`} dir="auto" className={sizeClass}>
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
            <p key={`${sIdx}-${idx}-p`} dir="auto" className="break-words">
              {renderInline(trimmed)}
            </p>
          );
        });

        flushList(`${sIdx}-end`);
        flushQuote(`${sIdx}-end`);
        flushTable(`${sIdx}-end`);

        return <React.Fragment key={sIdx}>{blocks}</React.Fragment>;
      })}
    </div>
  );
};
