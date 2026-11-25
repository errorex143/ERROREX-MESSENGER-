import React, { useEffect } from 'react';
import { X, Lock, ShieldCheck, User } from 'lucide-react';

export interface AvatarPreviewTarget {
  displayName: string;
  username?: string;
  photoURL?: string | null;
  bio?: string | null;
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  photoHiddenByPrivacy?: boolean;
  bioHiddenByPrivacy?: boolean;
}

interface AvatarPreviewModalProps {
  target: AvatarPreviewTarget | null;
  onClose: () => void;
}

export const AvatarPreviewModal: React.FC<AvatarPreviewModalProps> = ({ target, onClose }) => {
  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const cleanUsername = (target.username || 'member').replace(/^@/, '');
  const displayInitial = (target.displayName || cleanUsername || 'U').slice(0, 1).toUpperCase();
  const visiblePhoto = !target.photoHiddenByPrivacy && target.photoURL ? target.photoURL : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/88 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${target.displayName} profile photo`}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden text-[var(--text-main)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/10 bg-[var(--bg-card)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-main)] truncate">{target.displayName}</h3>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span className="font-mono text-[var(--accent-primary)] truncate">@{cleanUsername}</span>
              {target.showOnlineStatus !== false && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      target.isOnline
                        ? 'text-emerald-500 dark:text-emerald-400 font-semibold'
                        : 'text-[var(--text-muted)]'
                    }
                  >
                    {target.isOnline ? 'Online' : 'Offline'}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-[var(--text-main)] transition-colors shrink-0 cursor-pointer"
            aria-label="Close photo viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Full-Size DP Area */}
        <div className="p-4 sm:p-5 bg-black/90 flex items-center justify-center">
          {visiblePhoto ? (
            <img
              src={visiblePhoto}
              alt={target.displayName}
              referrerPolicy="no-referrer"
              className="w-full max-w-[340px] aspect-square object-cover rounded-2xl border border-[var(--accent-border)] shadow-2xl"
            />
          ) : (
            <div className="w-60 h-60 sm:w-64 sm:h-64 rounded-full bg-neutral-900 border-2 border-[var(--accent-border)] flex flex-col items-center justify-center gap-2 text-center p-5 shadow-inner">
              {target.photoHiddenByPrivacy ? (
                <>
                  <Lock className="w-10 h-10 text-[var(--accent-primary)] opacity-80" />
                  <p className="text-xs font-semibold text-neutral-200">Profile Photo Hidden</p>
                  <p className="text-[11px] text-neutral-400">
                    Protected by this user&apos;s privacy settings
                  </p>
                </>
              ) : (
                <>
                  <span className="text-5xl font-display font-bold text-[var(--accent-primary)]">
                    {displayInitial}
                  </span>
                  <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-1">
                    <User className="w-3.5 h-3.5" />
                    <span>No profile photo uploaded</span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bio & Security Footer */}
        <div className="p-4 sm:p-5 bg-[var(--bg-card)] border-t border-neutral-200 dark:border-white/10 space-y-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
              About / Bio
            </span>
            {target.bioHiddenByPrivacy ? (
              <p className="text-xs italic text-[var(--text-muted)] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span>Bio hidden by privacy settings</span>
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed break-words">
                {target.bio || 'Available on ERROREX'}
              </p>
            )}
          </div>

          <div className="pt-2.5 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>End-to-End Encrypted Profile</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3.5 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
