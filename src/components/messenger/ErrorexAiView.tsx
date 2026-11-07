import React, { useState, useRef, useEffect } from 'react';
import { CrownLogo } from '../common/CrownLogo';
import { EmojiKeyboard } from '../common/EmojiKeyboard';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Trash2,
  Smile,
  Globe,
  HelpCircle,
  Lightbulb,
  Code,
  ShieldCheck,
  Languages
} from 'lucide-react';

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  'Assalam-o-Alaikum! Ap kya kya kr sakty ho?',
  'Explain encryption & private security simply',
  'Write a Python code for AES-256 data hashing',
  'Translate "Welcome to ERROREX Vault" into Urdu, Arabic & French',
  'Tell me a creative sovereign philosophy quote'
];

export const ErrorexAiView: React.FC = () => {
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    try {
      const saved = localStorage.getItem('errorex_ai_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read AI messages:', e);
    }
    return [
      {
        id: 'msg_ai_welcome',
        sender: 'ai',
        text: '👑 **Salam & Welcome to ERROREX AI!**\n\nMain aapka sovereign AI assistant hoon. Main har zubaan (Roman Urdu, Urdu, Hindi, English, Arabic, Spanish, etc.) samajhta hoon aur har sawal ka mukammal jwab deta hoon.\n\nAap mujhse coding, mathematics, translation, general knowledge, ya koi bhi sawal pooch sakte hain. Main aapki kya madad karoon?',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('errorex_ai_messages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not save AI messages:', e);
    }
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: AiMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowEmojiPicker(false);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10).map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      const data = await res.json();
      const aiReply = data.reply || 'Main aapke sawal ka jwab abhi generate nahi kar saka. Barah-e-karam dobara koshish karein.';

      const aiMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      const fallbackMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `Salam! Main ERROREX AI hoon. Main har zubaan me har sawal ka jwab deta hoon.\n\nAapka sawal tha: "${textToSend}". Server response abhi connect ho raha hai. Barah-e-karam dobara koshish karein ya Settings me secrets check karein.`,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    const welcome: AiMessage = {
      id: `msg_ai_${Date.now()}`,
      sender: 'ai',
      text: '👑 **Salam! Main ERROREX AI hoon.**\n\nChat reset ho gayi hai. Koi bhi sawal kisi bhi zubaan me poochein, main foran jwab doonga!',
      createdAt: new Date().toISOString()
    };
    setMessages([welcome]);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="p-3.5 px-5 bg-[var(--bg-sidebar)] border-b border-[var(--accent-border)] flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] gold-glow flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold gold-gradient-text flex items-center gap-2">
              <span>ERROREX AI</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Multilingual • Active
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearChat}
            className="py-1.5 px-3 rounded-xl border border-neutral-700 hover:border-rose-500 text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 chat-scroll-area">
        {/* Welcome Banner */}
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-primary)]/40 shadow-sm text-center space-y-2.5">
          <div className="flex items-center justify-center gap-2 text-[var(--accent-primary)]">
            <CrownLogo size="sm" showWordmark={false} />
            <span className="text-xs font-bold uppercase tracking-wider">Sovereign Intelligence Engine</span>
          </div>
          <p className="text-xs text-[var(--text-main)] leading-relaxed">
            Puchiye coding, hisaab-kitab, scientific sawalat, tarjuma (translation), ya koi bhi maloomat. ERROREX AI har zubaan ko ba-asani samajhta hai.
          </p>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="py-1 px-2.5 rounded-lg text-[11px] bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors truncate max-w-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Bubbles */}
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-start gap-2.5 max-w-xl md:max-w-2xl">
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-md select-text ${
                    isUser
                      ? 'bg-gradient-to-br from-[var(--accent-surface)] to-[var(--bg-card)] border border-[var(--accent-primary)] text-[var(--text-main)] rounded-br-xs'
                      : 'bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)] rounded-bl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 border-b border-neutral-200/50 dark:border-white/5 pb-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent-primary)]">
                      {isUser ? 'You' : 'ERROREX AI'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="text-neutral-400 hover:text-[var(--accent-primary)] transition-colors"
                        title="Copy Message"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* AI Loading Thinking Bubble */}
        {isLoading && (
          <div className="flex items-start gap-2.5 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 px-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-xs text-[var(--text-muted)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-ping" />
              <span className="font-mono">ERROREX AI is thinking and translating...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 100+ Emojis & Cartoons Keyboard */}
      {showEmojiPicker && (
        <EmojiKeyboard
          onSelectEmoji={emoji => setInput(prev => prev + emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Chat Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 sm:p-4 bg-[var(--bg-sidebar)] border-t border-neutral-200 dark:border-white/5 flex items-center gap-2 shrink-0"
      >
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 rounded-xl text-neutral-400 hover:text-[var(--accent-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors"
          title="1000 Live Animated Stickers & Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Puchiye koi bhi sawal kisi bhi zubaan me (Ask anything in any language)..."
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors"
          disabled={isLoading}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 px-4 rounded-xl gold-button-accent text-black font-bold flex items-center gap-1.5 hover:gold-glow-sm transition-all disabled:opacity-50"
          title="Send to ERROREX AI"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Send</span>
        </button>
      </form>
    </div>
  );
};
