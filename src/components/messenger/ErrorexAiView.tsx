import React, { useState, useRef, useEffect } from 'react';
import { CrownLogo } from '../common/CrownLogo';
import { EmojiKeyboard } from '../common/EmojiKeyboard';
import { MarkdownMessage } from '../common/MarkdownMessage';
import { generateErrorexAiFallback } from '../../lib/errorexAiEngine';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Trash2,
  Smile,
  RotateCcw,
  Wifi,
  WifiOff
} from 'lucide-react';

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  'Koi dil ko chhoo lene wali Urdu / Roman Urdu ghazal sunao',
  'Mera business / YouTube channel promote karne ki viral post likho',
  'Mujhe ek cinematic AI image prompt bana kar do',
  'Write a clean sick leave application',
  'Write Python AES-256 encryption code',
  'Translate "Welcome to ERROREX Vault" into Urdu & Arabic'
];

export const ErrorexAiView: React.FC = () => {
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    const cleanWelcomeText = `### Salam & Welcome to ERROREX AI 👑\n\nMain aapka friendly aur intelligent assistant hoon. Jo bhi poochein ya likhne ko kahein — **poetry, ghazals, business promotion, AI prompts, coding, applications, math, ya translation** — main har zubaan me bilkul perfect aur saaf jawab dunga!`;
    try {
      const saved = localStorage.getItem('errorex_ai_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((m: AiMessage) =>
            m.id === 'msg_ai_welcome' ? { ...m, text: cleanWelcomeText } : m
          );
        }
      }
    } catch {
      // ignore read error
    }
    return [
      {
        id: 'msg_ai_welcome',
        sender: 'ai',
        text: cleanWelcomeText,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Track browser online / offline state cleanly
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('errorex_ai_messages', JSON.stringify(messages));
    } catch {
      // ignore storage quota
    }
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const fetchAiReply = async (textToSend: string, historySlice: Array<{ sender: string; text: string }>) => {
    const currentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!currentlyOnline) {
      await new Promise(resolve => setTimeout(resolve, 180));
      return generateErrorexAiFallback(textToSend, historySlice, true);
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historySlice
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (typeof data?.reply === 'string' && data.reply.trim()) {
          return data.reply.trim();
        }
      }
    } catch {
      // Fall through cleanly to local engine
    }

    return generateErrorexAiFallback(textToSend, historySlice, false);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: AiMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    const historySlice = messages
      .filter(m => m.id !== 'msg_ai_welcome')
      .slice(-10)
      .map(m => ({ id: m.id, sender: m.sender, text: m.text }));
    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setShowEmojiPicker(false);
    setIsLoading(true);

    try {
      const aiReply = await fetchAiReply(textToSend, historySlice);
      const aiMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const handleRegenerateLast = async () => {
    if (isLoading) return;
    const lastUserIdx = [...messages].reverse().findIndex(m => m.sender === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[actualIdx];
    const historySlice = messages
      .slice(Math.max(0, actualIdx - 10), actualIdx)
      .filter(m => m.id !== 'msg_ai_welcome')
      .map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text
      }));

    setIsLoading(true);
    try {
      const freshReply = await fetchAiReply(lastUserMsg.text, historySlice);
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.sender === 'ai') {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: freshReply,
            createdAt: new Date().toISOString()
          };
        } else {
          updated.push({
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: freshReply,
            createdAt: new Date().toISOString()
          });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearChat = () => {
    const welcome: AiMessage = {
      id: `msg_ai_${Date.now()}`,
      sender: 'ai',
      text: `### Salam! Main ERROREX AI Hoon 👑\n\nChat fresh ho gayi hai. Koi bhi sawal kisi bhi zubaan me poochein — main saaf aur mukammal jawab dunga!`,
      createdAt: new Date().toISOString()
    };
    setMessages([welcome]);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] overflow-hidden transition-colors">
      {/* Clean Top Header */}
      <div className="py-3 px-5 bg-[var(--bg-sidebar)] border-b border-[var(--accent-border)] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold gold-gradient-text truncate">ERROREX AI</h1>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] whitespace-nowrap">
              <span>All Languages</span>
              <span aria-hidden="true">·</span>
              <span className={`inline-flex items-center gap-1 font-medium ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          className="py-1.5 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-rose-500 text-xs font-medium text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Clear Chat History"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-5 chat-scroll-area">
        {/* Clean Starter Prompts Card */}
        <div className="max-w-2xl mx-auto p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[var(--accent-primary)]">
              <CrownLogo size="sm" showWordmark={false} />
              <span className="text-xs font-semibold tracking-wide">Ask Anything in Any Language</span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Roman Urdu · اردو · English · العربية
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="py-1.5 px-3 rounded-xl text-xs bg-[var(--bg-sidebar)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[var(--text-main)] transition-colors text-left cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            const isLastAi = !isUser && idx === messages.length - 1;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-start gap-3 ${isUser ? 'max-w-[85%] sm:max-w-xl' : 'w-full'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl transition-colors ${
                      isUser
                        ? 'px-4 py-3 bg-[var(--accent-surface)] border border-[var(--accent-primary)]/40 text-[var(--text-main)]'
                        : 'flex-1 px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)]'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-neutral-200/60 dark:border-white/5">
                      <span className="text-[11px] font-semibold text-[var(--accent-primary)]">
                        {isUser ? 'You' : 'ERROREX AI'}
                      </span>
                      <div className="flex items-center gap-2.5 text-[10px] font-mono tabular-nums text-[var(--text-muted)]">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    {isUser ? (
                      <div className="text-[13px] sm:text-[13.5px] leading-relaxed whitespace-pre-wrap select-text">
                        {msg.text}
                      </div>
                    ) : (
                      <MarkdownMessage content={msg.text} />
                    )}

                    {/* Regenerate Action on latest AI response */}
                    {isLastAi && messages.some(m => m.sender === 'user') && (
                      <div className="mt-3 pt-2 border-t border-neutral-200/50 dark:border-white/5 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleRegenerateLast}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-surface)] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Clean Thinking Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-xs text-[var(--text-muted)] flex items-center gap-2.5">
                <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                <span>Writing a clear answer...</span>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Keyboard */}
      {showEmojiPicker && (
        <EmojiKeyboard
          onSelectEmoji={emoji => setInput(prev => prev + emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Input Bar (Multiline textarea: Enter sends, Shift+Enter newline) */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 sm:p-4 bg-[var(--bg-sidebar)] border-t border-[var(--accent-border)] flex items-end gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer shrink-0"
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask anything — poetry, ghazals, promotions, prompts, code (Shift+Enter for new line)..."
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors resize-none max-h-32 overflow-y-auto leading-relaxed"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="py-2.5 px-4 rounded-xl gold-button-accent text-black font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          title="Send to ERROREX AI"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Send</span>
        </button>
      </form>
    </div>
  );
};
