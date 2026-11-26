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
  WifiOff,
  Feather,
  Languages,
  Quote,
  Megaphone,
  Code2,
  BookOpen,
  Square
} from 'lucide-react';

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  'Urdu alphabet (اردو) me 4 line ki dil ko chhoo lene wali poetry likh kar do',
  'Mera business / YouTube channel promote karne ki viral post likho',
  'Translate "Believe in your journey" into Urdu, Arabic & Hindi',
  'مرحباً يا صديقي! اكتب لي 4 أسطر شعرية جميلة بالعربية',
  'नमस्ते दोस्त! हिन्दी में 4 लाइन की प्यारी शायरी लिखो',
  'Tum mere ache dost ho — aaj kuch dil se acchi baat sunao'
];

const SUGGESTED_QUICK_REPLIES = [
  {
    label: 'Write a poem',
    prompt: 'Write a poem',
    icon: Feather
  },
  {
    label: '4-Line Urdu Poetry',
    prompt: 'Urdu alphabet me 4 line ki pyari poetry likh kar do',
    icon: Sparkles
  },
  {
    label: 'Motivational quote',
    prompt: 'Share a motivational quote',
    icon: Quote
  },
  {
    label: 'Translate text',
    prompt: 'Translate "Believe in your journey" into Urdu, Roman Urdu, Arabic & Hindi',
    icon: Languages
  },
  {
    label: 'Promote business',
    prompt: 'Mera business promote karne ki viral post likho',
    icon: Megaphone
  },
  {
    label: 'Short story',
    prompt: 'Write an inspiring short story',
    icon: BookOpen
  },
  {
    label: 'Write code',
    prompt: 'Write a clean Python function example',
    icon: Code2
  }
];

export const ErrorexAiView: React.FC = () => {
  const cleanWelcomeText = `### Salam & Welcome to ERROREX AI 👑

Main aapka warm, friendly dost aur smart assistant hoon! Aap mujhse **har zubaan aur har script** me baat kar sakti hain — **Urdu alphabet (اردو), Roman Urdu, Arabic (العربية), Hindi (हिन्दी), ya English**:

- **Custom Poetry:** 2 line, 4 line, 6 line ya poori ghazal kisi bhi zubaan aur mood me
- **All-Language Translation:** Har zubaan se kisi bhi zubaan aur alphabet me bilkul natural tarjuma
- **Friendly Human Chat:** Dil ki baat, mashwara, kahaniyan, promotions, coding aur har sawal ka mukammal jawab!`;

  const [messages, setMessages] = useState<AiMessage[]>(() => {
    try {
      const saved = localStorage.getItem('errorex_ai_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (m: AiMessage) =>
                !(
                  m?.sender === 'ai' &&
                  typeof m?.text === 'string' &&
                  (m.text.includes('GEMINI_API_KEY') || m.text.includes('Specify your preferred format'))
                )
            )
            .map((m: AiMessage) =>
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
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Auto-resize input textarea smoothly
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  // Save messages to localStorage with safe fallback only on browser storage overflow
  useEffect(() => {
    try {
      localStorage.setItem('errorex_ai_messages', JSON.stringify(messages));
    } catch {
      try {
        localStorage.setItem('errorex_ai_messages', JSON.stringify(messages.slice(-150)));
      } catch {
        // ignore storage quota
      }
    }
  }, [messages]);

  // Auto scroll smoothly while streaming or adding new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: streamingMsgId ? 'auto' : 'smooth' });
  }, [messages, isLoading, streamingMsgId]);

  const smoothRevealText = async (
    targetId: string,
    fullText: string,
    signal: AbortSignal
  ) => {
    const words = fullText.split(/(\s+)/);
    const chunkSize = Math.max(3, Math.ceil(words.length / 26));
    let built = '';

    for (let i = 0; i < words.length; i += chunkSize) {
      if (signal.aborted) break;
      built += words.slice(i, i + chunkSize).join('');
      const snapshot = built;
      setMessages(prev => prev.map(m => (m.id === targetId ? { ...m, text: snapshot } : m)));
      await new Promise(resolve => setTimeout(resolve, 14));
    }
    if (!signal.aborted) {
      setMessages(prev => prev.map(m => (m.id === targetId ? { ...m, text: fullText } : m)));
    }
  };

  const streamAiReply = async (
    textToSend: string,
    historySlice: Array<{ id?: string; sender: string; text: string }>,
    targetMsgId: string
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!currentlyOnline) {
      const localReply = generateErrorexAiFallback(textToSend, historySlice);
      await smoothRevealText(targetMsgId, localReply, controller.signal);
      return;
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify({
          message: textToSend,
          history: historySlice,
          stream: true
        }),
        signal: controller.signal
      });

      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const evt of events) {
            const line = evt
              .split('\n')
              .find(l => l.startsWith('data:'));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(5).trim());
              if (typeof payload?.chunk === 'string' && payload.chunk.length > 0) {
                accumulated += payload.chunk;
                const snapshot = accumulated;
                setMessages(prev =>
                  prev.map(m => (m.id === targetMsgId ? { ...m, text: snapshot } : m))
                );
              }
            } catch {
              // ignore malformed partial SSE chunk
            }
          }
        }

        if (accumulated.trim()) {
          return;
        }
      } else if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (typeof data?.reply === 'string' && data.reply.trim()) {
          await smoothRevealText(targetMsgId, data.reply.trim(), controller.signal);
          return;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      // Fall through cleanly to instant local multilingual engine
    }

    if (!controller.signal.aborted) {
      const fallbackReply = generateErrorexAiFallback(textToSend, historySlice);
      await smoothRevealText(targetMsgId, fallbackReply, controller.signal);
    }
  };

  const handleStopGenerating = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setStreamingMsgId(null);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isLoading) return;

    const now = Date.now();
    const userMsg: AiMessage = {
      id: `user_${now}`,
      sender: 'user',
      text: textToSend,
      createdAt: new Date(now).toISOString()
    };

    const aiMsgId = `ai_${now + 1}`;
    const placeholderAiMsg: AiMessage = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      createdAt: new Date(now + 1).toISOString()
    };

    const historySlice = messages
      .filter(m => m.id !== 'msg_ai_welcome')
      .slice(-40)
      .map(m => ({ id: m.id, sender: m.sender, text: m.text }));

    setMessages(prev => [...prev, userMsg, placeholderAiMsg]);
    if (!customPrompt) setInput('');
    setShowEmojiPicker(false);
    setIsLoading(true);
    setStreamingMsgId(aiMsgId);

    try {
      await streamAiReply(textToSend, historySlice, aiMsgId);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      setStreamingMsgId(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const handleRegenerateLast = async () => {
    if (isLoading) return;
    const lastUserIdx = [...messages].reverse().findIndex(m => m.sender === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[actualIdx];
    const historySlice = messages
      .slice(Math.max(0, actualIdx - 40), actualIdx)
      .filter(m => m.id !== 'msg_ai_welcome')
      .map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text
      }));

    const existingLast = messages[messages.length - 1];
    const targetId = existingLast?.sender === 'ai' ? existingLast.id : `ai_${Date.now()}`;

    setMessages(prev => {
      const updated = [...prev];
      if (updated[updated.length - 1]?.sender === 'ai') {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: '',
          createdAt: new Date().toISOString()
        };
      } else {
        updated.push({
          id: targetId,
          sender: 'ai',
          text: '',
          createdAt: new Date().toISOString()
        });
      }
      return updated;
    });

    setIsLoading(true);
    setStreamingMsgId(targetId);
    try {
      await streamAiReply(lastUserMsg.text, historySlice, targetId);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      setStreamingMsgId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearChat = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setStreamingMsgId(null);
    const welcome: AiMessage = {
      id: `msg_ai_${Date.now()}`,
      sender: 'ai',
      text: `### Salam Mere Dost! Main ERROREX AI Hoon 👑

Chat fresh ho gayi hai. Ab aap **Urdu alphabet (اردو), Arabic (العربية), Hindi (हिन्दी), Roman Urdu, ya English** me koi bhi sawal, 2/4/6 line poetry, translation, ya friendly guftagu shuru kar sakti hain!`,
      createdAt: new Date().toISOString()
    };
    setMessages([welcome]);
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] overflow-hidden transition-colors">
      {/* Clean Top Header */}
      <div className="py-2.5 sm:py-3 px-3.5 sm:px-5 bg-[var(--bg-sidebar)] border-b border-[var(--accent-border)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold gold-gradient-text truncate">ERROREX AI</h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[var(--text-muted)] whitespace-nowrap">
              <span className="truncate">All Languages & Friendly Companion</span>
              <span aria-hidden="true">·</span>
              <span
                className={`inline-flex items-center gap-1 font-medium shrink-0 ${
                  isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          className="min-h-[40px] py-2 px-3 sm:px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-rose-500 text-xs font-medium text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Clear Chat History"
        >
          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 space-y-3.5 sm:space-y-5 chat-scroll-area">
        {/* Clean Starter Prompts Card: Horizontal swipe carousel on mobile, grid on tablet/desktop */}
        <div className="max-w-3xl xl:max-w-4xl mx-auto p-3 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[var(--accent-primary)]">
              <CrownLogo size="sm" showWordmark={false} />
              <span className="text-xs font-semibold tracking-wide">Ask Anything in Any Language</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)]">
              Roman Urdu · اردو · العربية · हिन्दी · English
            </span>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-x-auto sm:overflow-visible scrollbar-none pb-0.5 sm:pb-0">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                dir="auto"
                onClick={() => handleSendMessage(prompt)}
                className="w-[232px] sm:w-auto shrink-0 py-2.5 px-3 rounded-xl text-xs bg-[var(--bg-sidebar)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[var(--text-main)] transition-colors text-left cursor-pointer leading-relaxed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="max-w-3xl xl:max-w-4xl mx-auto space-y-4 sm:space-y-5">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            const isLastAi = !isUser && idx === messages.length - 1;
            const isCurrentlyStreaming = streamingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'max-w-[90%] sm:max-w-xl' : 'w-full min-w-0'}`}>
                  {!isUser && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl transition-colors min-w-0 overflow-hidden ${
                      isUser
                        ? 'px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[var(--accent-surface)] border border-[var(--accent-primary)]/40 text-[var(--text-main)]'
                        : 'flex-1 px-3.5 sm:px-4 py-3 sm:py-3.5 bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)]'
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
                        {!isUser && msg.text && (
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
                      <div dir="auto" className="text-[13px] sm:text-[13.5px] leading-relaxed whitespace-pre-wrap select-text">
                        {msg.text}
                      </div>
                    ) : msg.text ? (
                      <div>
                        <MarkdownMessage content={msg.text} />
                        {isCurrentlyStreaming && (
                          <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[var(--accent-primary)] animate-pulse rounded-xs" />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 py-1 text-xs text-[var(--text-muted)]">
                        <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                        <span>Thinking & writing smoothly...</span>
                      </div>
                    )}

                    {/* Quick Actions on latest AI response: Expand & Regenerate */}
                    {isLastAi && !isCurrentlyStreaming && messages.some(m => m.sender === 'user') && msg.text && (
                      <div className="mt-3 pt-2 border-t border-neutral-200/50 dark:border-white/5 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendMessage('Is par aur zyada detail aur examples likhein')}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-surface)] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>More Detail</span>
                        </button>
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

      {/* Suggested Quick-Reply Chips above Chat Input */}
      <div
        aria-label="Suggested quick replies"
        className="px-3 sm:px-4 pt-2 pb-1.5 bg-[var(--bg-sidebar)] border-t border-[var(--accent-border)] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0"
      >
        {SUGGESTED_QUICK_REPLIES.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(item.prompt)}
              className="min-h-[38px] inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-surface)] text-[var(--text-main)] hover:text-[var(--accent-primary)] whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Icon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Bar (Multiline textarea: Enter sends, Shift+Enter newline) */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="px-2.5 sm:px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:pb-4 pt-1.5 bg-[var(--bg-sidebar)] flex items-end gap-1.5 sm:gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="min-w-[40px] min-h-[40px] p-2 sm:p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-card)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          dir="auto"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Kuch bhi poochein — Urdu (اردو), Arabic, Hindi, poetry (2/4/6 lines), translation..."
          className="flex-1 min-w-0 min-h-[40px] px-3 sm:px-4 py-2 sm:py-2.5 text-base sm:text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors resize-none max-h-32 overflow-y-auto leading-relaxed"
          disabled={isLoading}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={handleStopGenerating}
            className="min-w-[40px] min-h-[40px] py-2.5 px-3.5 sm:px-4 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Stop generating"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline text-xs">Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="min-w-[40px] min-h-[40px] py-2.5 px-3.5 sm:px-4 rounded-xl gold-button-accent text-black font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            title="Send to ERROREX AI"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Send</span>
          </button>
        )}
      </form>
    </div>
  );
};
