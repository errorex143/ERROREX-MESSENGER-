import React, { useState, useMemo } from 'react';
import {
  Smile,
  Sticker,
  X,
  Search
} from 'lucide-react';
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

export const EmojiKeyboard: React.FC<EmojiKeyboardProps> = ({
  onSelectEmoji,
  onSelectSticker,
  onClose
}) => {
  // Emojis FIRST by default, Stickers SECOND
  const [activeMode, setActiveMode] = useState<'emojis' | 'stickers'>('emojis');
  const [stickerCategory, setStickerCategory] = useState<'all' | StickerCategory>('all');
  const [search, setSearch] = useState<string>('');

  const displayedStandardEmojis = useMemo(() => {
    if (!search.trim()) return STANDARD_EMOJIS;
    return STANDARD_EMOJIS.filter(e => e.includes(search.trim()));
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

  const handleStickerTap = (sticker: CustomStickerItem) => {
    if (onSelectSticker) {
      onSelectSticker(toStickerToken(sticker.id));
    } else {
      onSelectEmoji(sticker.label);
    }
  };

  return (
    <div className="w-full bg-[var(--bg-card)] border-t border-[var(--accent-border)] flex flex-col max-h-[42dvh] sm:max-h-80 md:max-h-96 shadow-2xl select-none animate-fadeIn transition-colors">
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
          </button>

          {activeMode === 'stickers' && (
            <>
              <div className="w-[1px] h-4 bg-neutral-300 dark:bg-white/10 mx-0.5 shrink-0" />
              {(['all', 'greetings', 'moods', 'love', 'fun'] as const).map(cat => (
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
              ? 'Search emojis...'
              : 'Search stickers (hi, love, cool, haha...)'
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
      <div className="p-3 overflow-y-auto flex-1">
        {activeMode === 'emojis' ? (
          <div>
            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 gap-1 sm:gap-1.5">
              {displayedStandardEmojis.map((emoji: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-full aspect-square max-w-[40px] mx-auto text-lg sm:text-xl flex items-center justify-center rounded-xl hover:bg-[var(--accent-surface)] hover:scale-115 active:scale-95 transition-all cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {filteredStickers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No stickers match "{search}"
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                {filteredStickers.map(sticker => (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};
