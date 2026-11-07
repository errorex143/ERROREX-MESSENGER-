import React, { useState, useMemo } from 'react';
import {
  Smile,
  Crown,
  X,
  Sparkles,
  Flame,
  Search,
  Laugh,
  Frown,
  PartyPopper,
  ChevronDown
} from 'lucide-react';
import {
  LiveStickerItem,
  LIVE_STICKERS,
  STANDARD_EMOJIS
} from './liveStickersData';

export type { LiveStickerItem };
export { LIVE_STICKERS, STANDARD_EMOJIS };

interface EmojiKeyboardProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

export const EmojiKeyboard: React.FC<EmojiKeyboardProps> = ({ onSelectEmoji, onClose }) => {
  // 'live_all' | 'funny' | 'happy' | 'smile' | 'royal' | 'cry' | 'sad' | 'standard'
  const [filterTab, setFilterTab] = useState<string>('live_all');
  const [search, setSearch] = useState<string>('');
  const [visibleLimit, setVisibleLimit] = useState<number>(120);

  const isStandardTab = filterTab === 'standard';

  // Filter Live Stickers
  const filteredLiveStickers = useMemo(() => {
    let list = LIVE_STICKERS;
    if (filterTab !== 'live_all' && !isStandardTab) {
      list = list.filter(s => s.category === filterTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.emoji.includes(q));
    }
    return list;
  }, [filterTab, isStandardTab, search]);

  // Paginate rendering for buttery smooth 60fps scrolling when viewing 1000 items
  const displayedLiveStickers = useMemo(() => {
    if (search.trim()) return filteredLiveStickers;
    return filteredLiveStickers.slice(0, visibleLimit);
  }, [filteredLiveStickers, search, visibleLimit]);

  const displayedStandardEmojis = useMemo(() => {
    if (!search.trim()) return STANDARD_EMOJIS;
    return STANDARD_EMOJIS.filter(e => e.includes(search));
  }, [search]);

  // Handle Tab Switch
  const handleTabChange = (tab: string) => {
    setFilterTab(tab);
    setVisibleLimit(120);
  };

  return (
    <div className="w-full bg-[var(--bg-card)] border-t border-[var(--accent-border)] flex flex-col max-h-80 sm:max-h-96 shadow-2xl select-none animate-fadeIn transition-colors">
      {/* Top Filter Strip: Live Categories & Standard Emojis */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-sidebar)] gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1">
          <button
            type="button"
            onClick={() => handleTabChange('live_all')}
            className={`py-1 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              filterTab === 'live_all'
                ? 'gold-button-accent text-black shadow-sm'
                : 'bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>1000 Live Stickers</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('funny')}
            className={`py-1 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              filterTab === 'funny'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }`}
          >
            <Laugh className="w-3.5 h-3.5" />
            <span>Funny (300)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('happy')}
            className={`py-1 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              filterTab === 'happy'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }`}
          >
            <PartyPopper className="w-3.5 h-3.5" />
            <span>Happy (300)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('smile')}
            className={`py-1 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              filterTab === 'smile'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Smile (200)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('royal')}
            className={`py-1 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              filterTab === 'royal'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Royal (100)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('cry')}
            className={`py-1 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              filterTab === 'cry'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }`}
          >
            <span>😭 Cry (50)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('sad')}
            className={`py-1 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              filterTab === 'sad'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }`}
          >
            <Frown className="w-3.5 h-3.5" />
            <span>Sad (50)</span>
          </button>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-white/10 mx-1 shrink-0" />

          <button
            type="button"
            onClick={() => handleTabChange('standard')}
            className={`py-1 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              isStandardTab
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }`}
          >
            <span>😀 Emojis ({STANDARD_EMOJIS.length})</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-[var(--text-main)] hover:bg-[var(--accent-surface)] transition-colors shrink-0"
            title="Close Stickers / Emojis"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="px-3 py-1.5 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] relative">
        <Search className="w-3.5 h-3.5 absolute left-5 top-3 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            isStandardTab
              ? 'Search 600+ standard emojis...'
              : `Search 1000 different live stickers (funny, happy, smile, royal)...`
          }
          className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-5 top-3 text-neutral-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Stickers & Emojis Grid Content */}
      <div className="p-3 overflow-y-auto flex-1">
        {!isStandardTab ? (
          /* 1000 Live Animated Stickers Grid */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold uppercase tracking-wider">
                {filterTab === 'live_all'
                  ? `All 1000 Different Live Animated Stickers (${filteredLiveStickers.length})`
                  : `${filterTab.toUpperCase()} Live Stickers (${filteredLiveStickers.length})`}
              </span>
              <span className="text-[9px] font-mono text-neutral-500">
                100% Unique • Continuous Motion
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {displayedLiveStickers.map((sticker, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectEmoji(sticker.emoji)}
                  className="h-16 flex flex-col items-center justify-center p-1 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-surface)] transition-all group cursor-pointer relative shadow-sm hover:scale-105 active:scale-95"
                  title={`${sticker.name} (${sticker.category})`}
                >
                  <span className={`text-2xl sm:text-3xl ${sticker.anim}`}>
                    {sticker.emoji}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-full group-hover:text-[var(--accent-primary)] transition-colors mt-1 font-medium px-1">
                    {sticker.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Load More Button when browsing without search */}
            {!search.trim() && visibleLimit < filteredLiveStickers.length && (
              <div className="flex justify-center mt-4 mb-2">
                <button
                  type="button"
                  onClick={() => setVisibleLimit(prev => Math.min(prev + 120, filteredLiveStickers.length))}
                  className="px-4 py-2 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>Show More Stickers (Showing {displayedLiveStickers.length} of {filteredLiveStickers.length})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Standard Emojis Grid */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold uppercase tracking-wider">
                Standard Emoji Keyboard ({displayedStandardEmojis.length})
              </span>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-14 gap-1 sm:gap-1.5">
              {displayedStandardEmojis.map((emoji: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-8 h-8 sm:w-9 sm:h-9 text-lg sm:text-xl flex items-center justify-center rounded-xl hover:bg-[var(--accent-surface)] hover:scale-125 active:scale-95 transition-all cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="px-3 py-1.5 border-t border-neutral-200 dark:border-white/5 bg-[var(--bg-sidebar)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>1000 Unique Live Animated Stickers + {STANDARD_EMOJIS.length} Emojis</span>
        </span>
        <span className="text-[var(--accent-primary)] font-semibold">
          Tap any sticker or emoji to send
        </span>
      </div>
    </div>
  );
};
