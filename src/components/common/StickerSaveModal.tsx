import React, { useEffect, useState } from 'react';
import { BookmarkPlus, Check, Edit3, Send, Trash2, X } from 'lucide-react';
import {
  EncodedCustomStickerMeta,
  UserCreatedSticker,
  deleteUserCreatedSticker,
  findMatchingSavedSticker,
  saveUserCreatedSticker,
  subscribeCustomStickers
} from '../../lib/customStickerStore';
import { CustomStickerItem, StickerIllustration } from './CustomStickers';
import { CreatedStickerView } from './CreatedStickerView';
import { StickerCreatorDraft } from './StickerCreatorModal';

export type ChatStickerTapTarget =
  | {
      type: 'builtin';
      sticker: CustomStickerItem;
      senderLabel: string;
    }
  | {
      type: 'media';
      kind: 'image' | 'video';
      mediaUrl: string;
      meta: EncodedCustomStickerMeta;
      senderLabel: string;
    };

interface StickerSaveModalProps {
  target: ChatStickerTapTarget | null;
  onClose: () => void;
  onSendSticker?: (target: ChatStickerTapTarget) => void;
  onEditMediaSticker?: (draft: StickerCreatorDraft) => void;
}

export const StickerSaveModal: React.FC<StickerSaveModalProps> = ({
  target,
  onClose,
  onSendSticker,
  onEditMediaSticker
}) => {
  const [savedEntry, setSavedEntry] = useState<UserCreatedSticker | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) {
      setSavedEntry(undefined);
      return;
    }

    const syncSaved = () => {
      if (target.type === 'builtin') {
        setSavedEntry(
          findMatchingSavedSticker({
            kind: 'builtin',
            builtinStickerId: target.sticker.id
          })
        );
      } else {
        setSavedEntry(
          findMatchingSavedSticker({
            kind: target.kind,
            mediaUrl: target.mediaUrl,
            caption: target.meta.caption
          })
        );
      }
    };

    syncSaved();
    return subscribeCustomStickers(syncSaved);
  }, [target]);

  if (!target) return null;

  const handleToggleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (savedEntry) {
        await deleteUserCreatedSticker(savedEntry.id);
      } else if (target.type === 'builtin') {
        await saveUserCreatedSticker({
          kind: 'builtin',
          mediaUrl: target.sticker.id,
          builtinStickerId: target.sticker.id,
          shape: 'rounded',
          caption: target.sticker.label
        });
      } else {
        await saveUserCreatedSticker({
          kind: target.kind,
          mediaUrl: target.mediaUrl,
          shape: target.meta.shape || 'rounded',
          borderStyle: target.meta.borderStyle || 'white',
          caption: target.meta.caption || undefined,
          captionColor: target.meta.captionColor,
          captionPos: target.meta.captionPos,
          captionX: target.meta.captionX,
          captionY: target.meta.captionY,
          captionSize: target.meta.captionSize,
          captionRotate: target.meta.captionRotate,
          captionStyle: target.meta.captionStyle,
          captionFont: target.meta.captionFont
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const title =
    target.type === 'builtin'
      ? target.sticker.label
      : target.meta.caption || (target.kind === 'video' ? 'Video Sticker' : 'Custom Sticker');

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden text-[var(--text-main)]"
      >
        <div className="sm:hidden pt-2.5 pb-1 bg-[var(--bg-card)] flex justify-center">
          <div className="w-10 h-1 rounded-full bg-neutral-400/40" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm font-bold text-[var(--text-main)] truncate">{title}</h3>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              From {target.senderLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sticker preview"
            className="w-9 h-9 rounded-full bg-neutral-200/50 dark:bg-neutral-800/60 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Large Animated Sticker Stage */}
        <div
          className="py-6 px-4 flex flex-col items-center justify-center"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)',
            backgroundSize: '14px 14px'
          }}
        >
          {target.type === 'builtin' ? (
            <StickerIllustration sticker={target.sticker} size="lg" animated={true} />
          ) : (
            <CreatedStickerView
              kind={target.kind}
              mediaUrl={target.mediaUrl}
              meta={target.meta}
              size="lg"
            />
          )}
        </div>

        {/* Actions */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-[var(--bg-card)] border-t border-neutral-200 dark:border-white/5 space-y-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleToggleSave}
            className={`w-full min-h-[46px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              savedEntry
                ? 'bg-emerald-500/15 border border-emerald-500/45 text-emerald-500 dark:text-emerald-400 hover:bg-rose-500/15 hover:border-rose-500/45 hover:text-rose-400 group'
                : 'gold-button-accent shadow-md'
            }`}
          >
            {savedEntry ? (
              <>
                <Check className="w-4 h-4 group-hover:hidden" />
                <Trash2 className="w-4 h-4 hidden group-hover:block" />
                <span className="group-hover:hidden">Saved in My Keyboard ✓</span>
                <span className="hidden group-hover:inline">Remove from My Keyboard</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                <span>Save to My Keyboard</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {target.type === 'media' && onEditMediaSticker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditMediaSticker({
                    kind: target.kind,
                    mediaUrl: target.mediaUrl,
                    caption: target.meta.caption,
                    shape: target.meta.shape
                  });
                }}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-main)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Edit Sticker</span>
              </button>
            )}

            {onSendSticker && (
              <button
                type="button"
                onClick={() => {
                  onSendSticker(target);
                  onClose();
                }}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-main)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Send in Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
