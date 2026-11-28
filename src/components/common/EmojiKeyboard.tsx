import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Smile, Sticker, X, Search } from 'lucide-react';
import {
  LiveStickerItem,
  LIVE_STICKERS,
  STANDARD_EMOJIS
} from './liveStickersData';
import {
  CUSTOM_STICKERS,
  CustomStickerItem,
  StickerCategory,
  StickerIllustration,
  toStickerToken
} from './CustomStickers';

export type { LiveStickerItem };
export { LIVE_STICKERS, STANDARD_EMOJIS };

interface EmojiKeyboardProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker?: (stickerToken: string) => void;
  onClose?: () => void;
}

const STICKER_CATEGORIES: Array<'all' | StickerCategory> = [
  'all',
  'love',
  'funny',
  'sad',
  'moods',
  'greetings',
  'fun'
];

const EMOJI_KEYWORD_GROUPS: Array<{ keywords: string[]; emojis: string[] }> = [
  {
    keywords: ['love', 'heart', 'pyar', 'dil', 'ishq', 'kiss', 'romance', 'hug'],
    emojis: ['❤️', '🩷', '🩵', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🫶', '😍', '🥰', '😘', '💌', '💐', '🌹', '💑', '💏', '🫂', '💋', '😻']
  },
  {
    keywords: ['funny', 'laugh', 'haha', 'lol', 'joke', 'fun', 'wink'],
    emojis: ['😂', '🤣', '😜', '😝', '🤪', '🙃', '😏', '😈', '🤡', '👻', '😸', '😹', '🤭', '🫣', '😉', '🥳']
  },
  {
    keywords: ['sad', 'cry', 'alone', 'broken', 'hurt', 'udaas', 'miss', 'tear'],
    emojis: ['😢', '😭', '🥺', '😔', '😞', '😟', '🙁', '☹️', '😣', '😖', '😫', '😩', '💔', '🥀', '😿', '🌧️', '💧', '🩹']
  },
  {
    keywords: ['happy', 'smile', 'good', 'glad', 'joy'],
    emojis: ['😀', '😃', '😄', '😁', '😊', '😇', '🙂', '🤩', '🥳', '🥹', '🌟', '✨', '🌈']
  },
  {
    keywords: ['flower', 'rose', 'nature', 'chai', 'tea', 'coffee'],
    emojis: ['🌸', '🌺', '🌻', '🌷', '🌹', '🥀', '🪷', '🪻', '💐', '🌼', '🍀', '☕', '🍵', '🫖']
  },
  {
    keywords: ['party', 'gift', 'eid', 'celebrate', 'fire', 'cool', 'king'],
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🪩', '🎆', '🎇', '🔥', '😎', '👑', '💎', '🏆', '🚀']
  }
];

const PAGE_CHUNK_SIZE = 72;

export const EmojiKeyboard: React.FC<EmojiKeyboardProps> = ({
  onSelectEmoji,
  onSelectSticker,
  onClose
}) => {
  // Emojis FIRST by default, Stickers SECOND
  const [activeMode, setActiveMode] = useState<'emojis' | 'stickers'>('emojis');
  const [stickerCategory, setStickerCategory] = useState<'all' | StickerCategory>('all');
  const [search, setSearch] = useState<string>('');
  const [visibleStickerCount, setVisibleStickerCount] = useState<number>(PAGE_CHUNK_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleStickerCount(PAGE_CHUNK_SIZE);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeMode, stickerCategory, search]);

  const displayedStandardEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STANDARD_EMOJIS;

    const matchedByKeyword = new Set<string>();
    EMOJI_KEYWORD_GROUPS.forEach(group => {
      if (group.keywords.some(k => k.includes(q) || q.includes(k))) {
        group.emojis.forEach(e => matchedByKeyword.add(e));
      }
    });

    const directMatches = STANDARD_EMOJIS.filter(
      e => e.includes(q) || matchedByKeyword.has(e)
    );
    return directMatches;
  }, [search]);

  const filteredStickers = useMemo(() => {
    let list: CustomStickerItem[] = CUSTOM_STICKERS;
    if (stickerCategory !== 'all') {
      list = list.filter(s => s.category === stickerCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        s =>
          s.label.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.caption && s.caption.toLowerCase().includes(q))
      );
    }
    return list;
  }, [stickerCategory, search]);

  const visibleStickers = useMemo(
    () => filteredStickers.slice(0, visibleStickerCount),
    [filteredStickers, visibleStickerCount]
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeMode !== 'stickers') return;
    if (visibleStickerCount >= filteredStickers.length) return;
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 140) {
      setVisibleStickerCount(prev => Math.min(filteredStickers.length, prev + PAGE_CHUNK_SIZE));
    }
  };

  const handleStickerTap = (sticker: CustomStickerItem) => {
    if (onSelectSticker) {
      onSelectSticker(toStickerToken(sticker.id));
    } else {
      onSelectEmoji(sticker.label);
    }
  };

  return (
    <div className="w-full bg-[var(--bg-card)] border-t border-[var(--accent-border)] flex flex-col max-h-[44dvh] sm:max-h-80 md:max-h-96 shadow-2xl select-none animate-fadeIn transition-colors">
      {/* Top Bar: 1. Emojis FIRST, 2. Stickers SECOND */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-sidebar)] gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode('emojis');
              setSearch('');
            }}
            className={`min-h-[36px] py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeMode === 'emojis'
                ? 'gold-button-accent text-black shadow-sm'
                : 'bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
            <span className="text-[10px] opacity-75 font-mono">({STANDARD_EMOJIS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('stickers');
              setSearch('');
            }}
            className={`min-h-[36px] py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeMode === 'stickers'
                ? 'gold-button-accent text-black shadow-sm'
                : 'bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <Sticker className="w-3.5 h-3.5" />
            <span>Stickers</span>
            <span className="text-[10px] opacity-75 font-mono">({CUSTOM_STICKERS.length})</span>
          </button>

          {activeMode === 'stickers' && (
            <>
              <div className="w-[1px] h-4 bg-neutral-300 dark:bg-white/10 mx-0.5 shrink-0" />
              {STICKER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setStickerCategory(cat)}
                  className={`min-h-[32px] py-1 px-2.5 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    stickerCategory === cat
                      ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close emojis and stickers"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[var(--text-main)] hover:bg-[var(--accent-surface)] transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] relative">
        <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={
            activeMode === 'emojis'
              ? 'Search emojis (love, funny, sad, flower...)'
              : 'Search 560+ stickers (love, funny, sad, dil, chai...)'
          }
          className="w-full pl-9 pr-10 py-1.5 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="w-7 h-7 flex items-center justify-center rounded-lg absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content Grid */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="p-3 overflow-y-auto flex-1"
      >
        {activeMode === 'emojis' ? (
          <div>
            {displayedStandardEmojis.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No emojis match "{search}"
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 gap-1 sm:gap-1.5">
                {displayedStandardEmojis.map((emoji: string, idx: number) => (
                  <button
                    key={`${emoji}_${idx}`}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className="w-full aspect-square max-w-[40px] mx-auto text-lg sm:text-xl flex items-center justify-center rounded-xl hover:bg-[var(--accent-surface)] hover:scale-115 active:scale-95 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStickers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No stickers match "{search}"
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                  {visibleStickers.map(sticker => (
                    <button
                      key={sticker.id}
                      type="button"
                      onClick={() => handleStickerTap(sticker)}
                      className="py-2 px-1.5 flex flex-col items-center justify-center rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)]/60 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-surface)] transition-all group cursor-pointer hover:scale-105 active:scale-95"
                      title={sticker.label}
                    >
                      <StickerIllustration sticker={sticker} size="md" />
                      <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-main)] mt-1 font-medium truncate max-w-full">
                        {sticker.label}
                      </span>
                    </button>
                  ))}
                </div>

                {visibleStickerCount < filteredStickers.length && (
                  <div className="flex justify-center pt-1 pb-2">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleStickerCount(prev =>
                          Math.min(filteredStickers.length, prev + PAGE_CHUNK_SIZE)
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--accent-primary)] cursor-pointer transition-colors"
                    >
                      Show more stickers ({filteredStickers.length - visibleStickerCount} left)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
