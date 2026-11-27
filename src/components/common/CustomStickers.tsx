import React from 'react';

export type StickerCategory = 'greetings' | 'moods' | 'love' | 'fun';

export interface CustomStickerItem {
  id: string;
  label: string;
  category: StickerCategory;
  bg: string;
  accent: string;
  text: string;
  caption?: string;
}

export const STICKER_TOKEN_PREFIX = '[sticker:';
export const STICKER_TOKEN_SUFFIX = ']';

export const CUSTOM_STICKERS: CustomStickerItem[] = [
  // Greetings
  { id: 'hi_wave', label: 'Hey!', category: 'greetings', bg: '#FEF3C7', accent: '#D97706', text: '#92400E', caption: 'HEY!' },
  { id: 'salam', label: 'Salam', category: 'greetings', bg: '#DCFCE7', accent: '#16A34A', text: '#14532D', caption: 'SALAM' },
  { id: 'morning', label: 'Morning', category: 'greetings', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12', caption: 'GM ☀' },
  { id: 'night', label: 'Good Night', category: 'greetings', bg: '#E0E7FF', accent: '#4F46E5', text: '#312E81', caption: 'GN 🌙' },
  { id: 'bye', label: 'Bye!', category: 'greetings', bg: '#F1F5F9', accent: '#475569', text: '#1E293B', caption: 'BYE' },
  { id: 'welcome', label: 'Welcome', category: 'greetings', bg: '#CCFBF1', accent: '#0D9488', text: '#134E4A', caption: 'HIYA' },
  { id: 'here_for_u', label: 'Here 4 U', category: 'greetings', bg: '#FCE7F3', accent: '#DB2777', text: '#831843', caption: 'HERE' },
  { id: 'miss_u', label: 'Miss U', category: 'greetings', bg: '#EDE9FE', accent: '#7C3AED', text: '#4C1D95', caption: 'MISS U' },

  // Moods
  { id: 'happy_sun', label: 'Happy', category: 'moods', bg: '#FEF9C3', accent: '#CA8A04', text: '#713F12' },
  { id: 'haha_lol', label: 'Haha', category: 'moods', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12', caption: 'HAHA' },
  { id: 'cool_shades', label: 'Cool', category: 'moods', bg: '#E0F2FE', accent: '#0284C7', text: '#0C4A6E', caption: 'COOL' },
  { id: 'blush_smile', label: 'Sweet', category: 'moods', bg: '#FCE7F3', accent: '#EC4899', text: '#831843' },
  { id: 'sleepy_zzz', label: 'Sleepy', category: 'moods', bg: '#E0E7FF', accent: '#6366F1', text: '#312E81', caption: 'Zzz' },
  { id: 'sad_cloud', label: 'Low', category: 'moods', bg: '#E2E8F0', accent: '#64748B', text: '#334155' },
  { id: 'cry_drop', label: 'Tears', category: 'moods', bg: '#DBEAFE', accent: '#2563EB', text: '#1E3A8A' },
  { id: 'shocked_oh', label: 'Whoa', category: 'moods', bg: '#FEF3C7', accent: '#D97706', text: '#78350F', caption: 'WHOA' },

  // Love & Care
  { id: 'warm_heart', label: 'Love', category: 'love', bg: '#FFE4E6', accent: '#E11D48', text: '#881337' },
  { id: 'warm_hug', label: 'Hug', category: 'love', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12', caption: 'HUG' },
  { id: 'thank_you', label: 'Thanks', category: 'love', bg: '#DCFCE7', accent: '#16A34A', text: '#14532D', caption: 'THX' },
  { id: 'pray_dua', label: 'Dua', category: 'love', bg: '#F3E8FF', accent: '#9333EA', text: '#581C87', caption: 'DUA' },
  { id: 'sparkle_star', label: 'Shine', category: 'love', bg: '#FEF3C7', accent: '#D97706', text: '#78350F' },
  { id: 'rose_bloom', label: 'Rose', category: 'love', bg: '#FFE4E6', accent: '#F43F5E', text: '#881337' },
  { id: 'care_cup', label: 'Chai', category: 'love', bg: '#F5E6D3', accent: '#9A5B25', text: '#4A2810', caption: 'CHAI' },
  { id: 'peace_vibe', label: 'Peace', category: 'love', bg: '#CCFBF1', accent: '#0D9488', text: '#134E4A', caption: 'PEACE' },

  // Fun & Reactions
  { id: 'ok_check', label: 'Okay', category: 'fun', bg: '#DCFCE7', accent: '#16A34A', text: '#14532D', caption: 'OK!' },
  { id: 'royal_crown', label: 'Royal', category: 'fun', bg: '#FEF3C7', accent: '#CA8A04', text: '#713F12', caption: 'KING' },
  { id: 'score_100', label: '100%', category: 'fun', bg: '#FEE2E2', accent: '#DC2626', text: '#7F1D1D', caption: '100' },
  { id: 'fire_lit', label: 'Lit', category: 'fun', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12' },
  { id: 'yay_party', label: 'Yay!', category: 'fun', bg: '#FAE8FF', accent: '#C026D3', text: '#701A75', caption: 'YAY!' },
  { id: 'music_note', label: 'Vibe', category: 'fun', bg: '#E0E7FF', accent: '#4F46E5', text: '#312E81' },
  { id: 'rocket_go', label: 'Go!', category: 'fun', bg: '#DBEAFE', accent: '#2563EB', text: '#1E3A8A' },
  { id: 'secret_lock', label: 'Secret', category: 'fun', bg: '#F1F5F9', accent: '#334155', text: '#0F172A', caption: 'SHH' }
];

export function toStickerToken(id: string): string {
  return `${STICKER_TOKEN_PREFIX}${id}${STICKER_TOKEN_SUFFIX}`;
}

export function parseStickerToken(text: string): CustomStickerItem | null {
  const trimmed = (text || '').trim();
  if (!trimmed.startsWith(STICKER_TOKEN_PREFIX) || !trimmed.endsWith(STICKER_TOKEN_SUFFIX)) {
    return null;
  }
  const id = trimmed.slice(STICKER_TOKEN_PREFIX.length, -STICKER_TOKEN_SUFFIX.length).trim();
  return CUSTOM_STICKERS.find(s => s.id === id) || null;
}

export function formatChatPreviewText(text?: string): string {
  if (!text) return 'Tap to open chat';
  const sticker = parseStickerToken(text);
  if (sticker) {
    return `Sticker · ${sticker.label}`;
  }
  return text;
}

export const StickerIllustration: React.FC<{
  sticker: CustomStickerItem;
  size?: 'sm' | 'md' | 'lg';
}> = ({ sticker, size = 'md' }) => {
  const dim =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-24 h-24' : 'w-12 h-12';

  const renderArtwork = () => {
    switch (sticker.id) {
      case 'happy_sun':
      case 'blush_smile':
        return (
          <g>
            <circle cx="32" cy="32" r="17" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.5" />
            <circle cx="26" cy="29" r="2.2" fill={sticker.text} />
            <circle cx="38" cy="29" r="2.2" fill={sticker.text} />
            {sticker.id === 'blush_smile' && (
              <>
                <circle cx="22" cy="34" r="2.8" fill="#FDA4AF" opacity="0.8" />
                <circle cx="42" cy="34" r="2.8" fill="#FDA4AF" opacity="0.8" />
              </>
            )}
            <path d="M25 36 Q32 42 39 36" fill="none" stroke={sticker.text} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      case 'cool_shades':
        return (
          <g>
            <circle cx="32" cy="30" r="15" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.5" />
            <rect x="20" y="24" width="10" height="6" rx="2.5" fill={sticker.text} />
            <rect x="34" y="24" width="10" height="6" rx="2.5" fill={sticker.text} />
            <line x1="30" y1="26" x2="34" y2="26" stroke={sticker.text} strokeWidth="2" />
            <path d="M27 36 Q32 40 37 35" fill="none" stroke={sticker.text} strokeWidth="2.2" strokeLinecap="round" />
          </g>
        );
      case 'sad_cloud':
      case 'cry_drop':
        return (
          <g>
            <circle cx="32" cy="32" r="17" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.5" />
            <circle cx="26" cy="28" r="2" fill={sticker.text} />
            <circle cx="38" cy="28" r="2" fill={sticker.text} />
            <path d="M26 39 Q32 34 38 39" fill="none" stroke={sticker.text} strokeWidth="2.3" strokeLinecap="round" />
            {sticker.id === 'cry_drop' && (
              <path d="M40 32 C43 36 42 40 39.5 40 C37 40 37 36 40 32 Z" fill="#60A5FA" />
            )}
          </g>
        );
      case 'warm_heart':
        return (
          <path
            d="M32 49 C32 49 14 37 14 25 C14 19 19 15 24 15 C28 15 31 17.5 32 20 C33 17.5 36 15 40 15 C45 15 50 19 50 25 C50 37 32 49 32 49 Z"
            fill={sticker.accent}
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'sparkle_star':
        return (
          <path
            d="M32 12 L37 25 L51 26 L40 35 L43 49 L32 41 L21 49 L24 35 L13 26 L27 25 Z"
            fill="#FBBF24"
            stroke={sticker.accent}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        );
      case 'royal_crown':
        return (
          <g>
            <path
              d="M15 40 L18 22 L27 30 L32 18 L37 30 L46 22 L49 40 Z"
              fill="#FBBF24"
              stroke={sticker.accent}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <rect x="16" y="42" width="32" height="5" rx="2.5" fill={sticker.accent} />
          </g>
        );
      case 'fire_lit':
        return (
          <path
            d="M33 13 C39 21 46 26 46 35 C46 43 40 49 32 49 C24 49 18 43 18 35 C18 29 22 25 25 22 C25 26 27 28 29 28 C27 22 29 17 33 13 Z"
            fill="#FB923C"
            stroke={sticker.accent}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
        );
      case 'rose_bloom':
        return (
          <g>
            <line x1="32" y1="34" x2="32" y2="50" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
            <path d="M32 43 Q40 40 41 45 Q36 47 32 43" fill="#22C55E" />
            <circle cx="32" cy="25" r="10" fill={sticker.accent} />
            <path d="M27 24 Q32 19 37 24 Q32 29 27 24" fill="none" stroke="#FFE4E6" strokeWidth="2" />
          </g>
        );
      case 'care_cup':
        return (
          <g>
            <path d="M18 26 H42 V36 C42 42 37 46 30 46 C23 46 18 42 18 36 Z" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.4" />
            <path d="M42 28 H46 C48 28 49 30 49 32 C49 35 47 37 44 37 H42" fill="none" stroke={sticker.accent} strokeWidth="2.4" />
            <path d="M25 19 Q27 15 25 12 M31 19 Q33 15 31 12 M37 19 Q39 15 37 12" fill="none" stroke={sticker.accent} strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'music_note':
        return (
          <g>
            <path d="M26 41 V20 L44 16 V37" fill="none" stroke={sticker.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="42" r="5" fill={sticker.accent} />
            <circle cx="40" cy="38" r="5" fill={sticker.accent} />
          </g>
        );
      case 'rocket_go':
        return (
          <g>
            <path d="M32 12 C40 20 42 30 39 40 H25 C22 30 24 20 32 12 Z" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.4" />
            <circle cx="32" cy="27" r="4" fill={sticker.accent} />
            <path d="M25 36 L19 42 L25 41 Z M39 36 L45 42 L39 41 Z" fill={sticker.accent} />
            <path d="M29 42 L32 50 L35 42 Z" fill="#F97316" />
          </g>
        );
      default:
        return (
          <g>
            <rect
              x="11"
              y="15"
              width="42"
              height="34"
              rx="12"
              fill="#FFFFFF"
              stroke={sticker.accent}
              strokeWidth="2.5"
            />
            <path
              d="M23 48 L19 54 L30 49"
              fill="#FFFFFF"
              stroke={sticker.accent}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <rect x="20" y="45" width="14" height="5" fill="#FFFFFF" />
            <text
              x="32"
              y="36"
              textAnchor="middle"
              fill={sticker.text}
              fontSize={sticker.caption && sticker.caption.length > 4 ? '10.5' : '12.5'}
              fontWeight="800"
              fontFamily="system-ui, -apple-system, sans-serif"
              letterSpacing="0.5"
            >
              {sticker.caption || sticker.label.toUpperCase()}
            </text>
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${dim} select-none drop-shadow-sm`}
      role="img"
      aria-label={sticker.label}
    >
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="18"
        fill={sticker.bg}
        stroke={sticker.accent}
        strokeWidth="2"
        strokeOpacity="0.45"
      />
      {renderArtwork()}
    </svg>
  );
};
