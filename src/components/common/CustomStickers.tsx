import React, { useId } from 'react';

export type StickerCategory = 'love' | 'funny' | 'sad' | 'moods' | 'greetings' | 'fun';

export type StickerMotif =
  | 'heart'
  | 'double_heart'
  | 'heart_wings'
  | 'love_letter'
  | 'rose'
  | 'ring'
  | 'infinity'
  | 'butterfly'
  | 'moon_heart'
  | 'candle_heart'
  | 'crown'
  | 'lock_heart'
  | 'ribbon_heart'
  | 'kiss_mark'
  | 'star'
  | 'sparkle_burst'
  | 'face_happy'
  | 'face_blush'
  | 'face_cool'
  | 'face_wink'
  | 'face_laugh'
  | 'face_goofy'
  | 'face_shock'
  | 'face_sleep'
  | 'face_sad'
  | 'face_cry'
  | 'cloud_rain'
  | 'broken_heart'
  | 'bandage_heart'
  | 'wilted_rose'
  | 'umbrella'
  | 'tea_cup'
  | 'fire'
  | 'music'
  | 'rocket'
  | 'lightning'
  | 'ghost_boo'
  | 'trophy'
  | 'diamond'
  | 'flower'
  | 'sun'
  | 'moon_crescent'
  | 'gift'
  | 'speech';

export type StickerFrame = 'rounded' | 'circle' | 'pill' | 'stamp' | 'diamond';

export interface CustomStickerItem {
  id: string;
  label: string;
  category: StickerCategory;
  bg: string;
  accent: string;
  text: string;
  caption?: string;
  motif?: StickerMotif;
  frame?: StickerFrame;
  decor?: 'dots' | 'sparkles' | 'hearts' | 'rings' | 'none';
}

export const STICKER_TOKEN_PREFIX = '[sticker:';
export const STICKER_TOKEN_SUFFIX = ']';

// Preserved core 32 sticker IDs so existing sent messages always resolve cleanly
const CORE_STICKERS: CustomStickerItem[] = [
  // Greetings
  { id: 'hi_wave', label: 'Hey!', category: 'greetings', bg: '#FEF3C7', accent: '#D97706', text: '#92400E', caption: 'HEY!', motif: 'speech', decor: 'sparkles' },
  { id: 'salam', label: 'Salam', category: 'greetings', bg: '#DCFCE7', accent: '#16A34A', text: '#14532D', caption: 'SALAM', motif: 'speech', decor: 'dots' },
  { id: 'morning', label: 'Morning', category: 'greetings', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12', caption: 'GM', motif: 'sun', decor: 'sparkles' },
  { id: 'night', label: 'Good Night', category: 'greetings', bg: '#E0E7FF', accent: '#4F46E5', text: '#312E81', caption: 'GN', motif: 'moon_crescent', decor: 'sparkles' },
  { id: 'bye', label: 'Bye!', category: 'greetings', bg: '#F1F5F9', accent: '#475569', text: '#1E293B', caption: 'BYE', motif: 'speech', decor: 'none' },
  { id: 'welcome', label: 'Welcome', category: 'greetings', bg: '#CCFBF1', accent: '#0D9488', text: '#134E4A', caption: 'HIYA', motif: 'flower', decor: 'dots' },
  { id: 'here_for_u', label: 'Here 4 U', category: 'greetings', bg: '#FCE7F3', accent: '#DB2777', text: '#831843', caption: 'HERE', motif: 'heart', decor: 'hearts' },
  { id: 'miss_u', label: 'Miss U', category: 'greetings', bg: '#EDE9FE', accent: '#7C3AED', text: '#4C1D95', caption: 'MISS U', motif: 'moon_heart', decor: 'sparkles' },

  // Moods
  { id: 'happy_sun', label: 'Happy', category: 'moods', bg: '#FEF9C3', accent: '#CA8A04', text: '#713F12', motif: 'face_happy', decor: 'sparkles' },
  { id: 'haha_lol', label: 'Haha', category: 'funny', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12', caption: 'HAHA', motif: 'face_laugh', decor: 'dots' },
  { id: 'cool_shades', label: 'Cool', category: 'moods', bg: '#E0F2FE', accent: '#0284C7', text: '#0C4A6E', caption: 'COOL', motif: 'face_cool', decor: 'none' },
  { id: 'blush_smile', label: 'Sweet', category: 'moods', bg: '#FCE7F3', accent: '#EC4899', text: '#831843', motif: 'face_blush', decor: 'hearts' },
  { id: 'sleepy_zzz', label: 'Sleepy', category: 'moods', bg: '#E0E7FF', accent: '#6366F1', text: '#312E81', caption: 'Zzz', motif: 'face_sleep', decor: 'dots' },
  { id: 'sad_cloud', label: 'Low', category: 'sad', bg: '#E2E8F0', accent: '#64748B', text: '#334155', motif: 'face_sad', decor: 'none' },
  { id: 'cry_drop', label: 'Tears', category: 'sad', bg: '#DBEAFE', accent: '#2563EB', text: '#1E3A8A', motif: 'face_cry', decor: 'dots' },
  { id: 'shocked_oh', label: 'Whoa', category: 'funny', bg: '#FEF3C7', accent: '#D97706', text: '#78350F', caption: 'WHOA', motif: 'face_shock', decor: 'sparkles' },

  // Love & Care
  { id: 'warm_heart', label: 'Love', category: 'love', bg: '#FFE4E6', accent: '#E11D48', text: '#881337', motif: 'heart', decor: 'hearts' },
  { id: 'warm_hug', label: 'Hug', category: 'love', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12', caption: 'HUG', motif: 'double_heart', decor: 'rings' },
  { id: 'thank_you', label: 'Thanks', category: 'love', bg: '#DCFCE7', accent: '#16A34A', text: '#14532D', caption: 'THX', motif: 'flower', decor: 'sparkles' },
  { id: 'pray_dua', label: 'Dua', category: 'love', bg: '#F3E8FF', accent: '#9333EA', text: '#581C87', caption: 'DUA', motif: 'moon_heart', decor: 'sparkles' },
  { id: 'sparkle_star', label: 'Shine', category: 'love', bg: '#FEF3C7', accent: '#D97706', text: '#78350F', motif: 'star', decor: 'sparkles' },
  { id: 'rose_bloom', label: 'Rose', category: 'love', bg: '#FFE4E6', accent: '#F43F5E', text: '#881337', motif: 'rose', decor: 'dots' },
  { id: 'care_cup', label: 'Chai', category: 'love', bg: '#F5E6D3', accent: '#9A5B25', text: '#4A2810', caption: 'CHAI', motif: 'tea_cup', decor: 'dots' },
  { id: 'peace_vibe', label: 'Peace', category: 'love', bg: '#CCFBF1', accent: '#0D9488', text: '#134E4A', caption: 'PEACE', motif: 'butterfly', decor: 'sparkles' },

  // Fun & Reactions
  { id: 'ok_check', label: 'Okay', category: 'fun', bg: '#DCFCE7', accent: '#16A34A', text: '#14532D', caption: 'OK!', motif: 'speech', decor: 'none' },
  { id: 'royal_crown', label: 'Royal', category: 'fun', bg: '#FEF3C7', accent: '#CA8A04', text: '#713F12', caption: 'KING', motif: 'crown', decor: 'sparkles' },
  { id: 'score_100', label: '100%', category: 'fun', bg: '#FEE2E2', accent: '#DC2626', text: '#7F1D1D', caption: '100', motif: 'trophy', decor: 'sparkles' },
  { id: 'fire_lit', label: 'Lit', category: 'fun', bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12', motif: 'fire', decor: 'sparkles' },
  { id: 'yay_party', label: 'Yay!', category: 'fun', bg: '#FAE8FF', accent: '#C026D3', text: '#701A75', caption: 'YAY!', motif: 'sparkle_burst', decor: 'dots' },
  { id: 'music_note', label: 'Vibe', category: 'fun', bg: '#E0E7FF', accent: '#4F46E5', text: '#312E81', motif: 'music', decor: 'dots' },
  { id: 'rocket_go', label: 'Go!', category: 'fun', bg: '#DBEAFE', accent: '#2563EB', text: '#1E3A8A', motif: 'rocket', decor: 'sparkles' },
  { id: 'secret_lock', label: 'Secret', category: 'fun', bg: '#F1F5F9', accent: '#334155', text: '#0F172A', caption: 'SHH', motif: 'lock_heart', decor: 'none' }
];

interface PaletteTheme {
  bg: string;
  accent: string;
  text: string;
}

const LOVE_PALETTES: PaletteTheme[] = [
  { bg: '#FFE4E6', accent: '#E11D48', text: '#881337' },
  { bg: '#FCE7F3', accent: '#DB2777', text: '#831843' },
  { bg: '#FDF2F8', accent: '#EC4899', text: '#9D174D' },
  { bg: '#FFF1F2', accent: '#F43F5E', text: '#9F1239' },
  { bg: '#FAE8FF', accent: '#C026D3', text: '#701A75' },
  { bg: '#F3E8FF', accent: '#9333EA', text: '#581C87' },
  { bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12' },
  { bg: '#FEF3C7', accent: '#D97706', text: '#78350F' },
  { bg: '#FFE8F0', accent: '#BE123C', text: '#4C0519' },
  { bg: '#F5E8FF', accent: '#7E22CE', text: '#3B0764' }
];

const FUNNY_PALETTES: PaletteTheme[] = [
  { bg: '#FEF9C3', accent: '#CA8A04', text: '#713F12' },
  { bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12' },
  { bg: '#ECFCCB', accent: '#65A30D', text: '#365314' },
  { bg: '#CFFAFE', accent: '#0891B2', text: '#164E63' },
  { bg: '#FAE8FF', accent: '#A21CAF', text: '#4A044E' },
  { bg: '#FEF3C7', accent: '#B45309', text: '#451A03' },
  { bg: '#E0F2FE', accent: '#0284C7', text: '#0C4A6E' },
  { bg: '#FCE7F3', accent: '#BE185D', text: '#500724' }
];

const SAD_PALETTES: PaletteTheme[] = [
  { bg: '#E2E8F0', accent: '#475569', text: '#1E293B' },
  { bg: '#DBEAFE', accent: '#2563EB', text: '#1E3A8A' },
  { bg: '#E0E7FF', accent: '#4F46E5', text: '#312E81' },
  { bg: '#F1F5F9', accent: '#64748B', text: '#0F172A' },
  { bg: '#EDE9FE', accent: '#6D28D9', text: '#2E1065' },
  { bg: '#E0F2FE', accent: '#0369A1', text: '#0C4A6E' },
  { bg: '#ECFEFF', accent: '#0E7490', text: '#164E63' },
  { bg: '#F3E8FF', accent: '#7E22CE', text: '#3B0764' }
];

const MOOD_PALETTES: PaletteTheme[] = [
  { bg: '#CCFBF1', accent: '#0D9488', text: '#134E4A' },
  { bg: '#DCFCE7', accent: '#16A34A', text: '#14532D' },
  { bg: '#FEF3C7', accent: '#D97706', text: '#78350F' },
  { bg: '#E0E7FF', accent: '#4338CA', text: '#1E1B4B' },
  { bg: '#FCE7F3', accent: '#DB2777', text: '#831843' },
  { bg: '#FFF7ED', accent: '#C2410C', text: '#431407' }
];

const GREETING_PALETTES: PaletteTheme[] = [
  { bg: '#DCFCE7', accent: '#15803D', text: '#14532D' },
  { bg: '#FEF3C7', accent: '#B45309', text: '#451A03' },
  { bg: '#CCFBF1', accent: '#0F766E', text: '#134E4A' },
  { bg: '#E0E7FF', accent: '#4338CA', text: '#1E1B4B' },
  { bg: '#FFE4E6', accent: '#BE123C', text: '#4C0519' }
];

const FUN_PALETTES: PaletteTheme[] = [
  { bg: '#FEF3C7', accent: '#CA8A04', text: '#713F12' },
  { bg: '#FEE2E2', accent: '#DC2626', text: '#7F1D1D' },
  { bg: '#DBEAFE', accent: '#2563EB', text: '#1E3A8A' },
  { bg: '#FAE8FF', accent: '#C026D3', text: '#701A75' },
  { bg: '#DCFCE7', accent: '#16A34A', text: '#14532D' },
  { bg: '#FFEDD5', accent: '#EA580C', text: '#7C2D12' }
];

// Curated distinct entries across every category (530+ unique additions + 32 core = 562+ unique stickers)
const LOVE_SPECS: Array<[string, string | undefined, StickerMotif]> = [
  ['Dil Se', 'DIL SE', 'heart'],
  ['Forever U', '4EVER U', 'infinity'],
  ['Meri Jaan', 'JAAN', 'double_heart'],
  ['Only You', 'ONLY U', 'heart_wings'],
  ['Pure Ishq', 'ISHQ', 'rose'],
  ['My World', 'WORLD', 'moon_heart'],
  ['True Care', 'CARE', 'candle_heart'],
  ['Soulmate', 'SOUL', 'infinity'],
  ['Sweetheart', 'SWEET', 'ribbon_heart'],
  ['Secret Crush', 'CRUSH', 'love_letter'],
  ['Always Urs', 'ALWAYS', 'ring'],
  ['Warm Heart', undefined, 'heart'],
  ['Two Hearts', undefined, 'double_heart'],
  ['Red Rose', undefined, 'rose'],
  ['Winged Heart', undefined, 'heart_wings'],
  ['Love Letter', 'NOTE', 'love_letter'],
  ['Golden Ring', undefined, 'ring'],
  ['Butterfly Love', undefined, 'butterfly'],
  ['Night Heart', undefined, 'moon_heart'],
  ['Candle Glow', undefined, 'candle_heart'],
  ['Crown My Love', 'QUEEN', 'crown'],
  ['Secret Lock', 'OURS', 'lock_heart'],
  ['Gift For U', 'FOR U', 'gift'],
  ['Ribbon Tie', undefined, 'ribbon_heart'],
  ['Kiss Mark', 'MWUAH', 'kiss_mark'],
  ['Starlight', undefined, 'star'],
  ['Heart Spark', undefined, 'sparkle_burst'],
  ['Flower Bloom', undefined, 'flower'],
  ['Sunrise Love', undefined, 'sun'],
  ['Blush Smile', 'SHY', 'face_blush'],
  ['Wink Love', 'WINK', 'face_wink'],
  ['Tea Date', 'DATE', 'tea_cup'],
  ['Love Song', 'SONG', 'music'],
  ['Pyar Bhara', 'PYAR', 'double_heart'],
  ['Khayal Rakhna', 'KHAYAL', 'heart'],
  ['Wada Raha', 'WADA', 'infinity'],
  ['Humsafar', 'SAFAR', 'moon_heart'],
  ['Mohabbat', 'MOHABBAT', 'rose'],
  ['Chaahat', 'CHAAHAT', 'butterfly'],
  ['Dilruba', 'DILRUBA', 'ribbon_heart'],
  ['Zindagi', 'LIFE', 'sun'],
  ['Sukun', 'SUKUN', 'candle_heart'],
  ['Armaan', 'ARMAAN', 'star'],
  ['Aashna', 'AASHNA', 'double_heart'],
  ['Mehboob', 'DEAR', 'crown'],
  ['Nazar Na Lage', 'NAZAR', 'sparkle_burst'],
  ['Mithi Yaad', 'YAAD', 'love_letter'],
  ['Tum Hi Ho', 'TUM HI', 'heart'],
  ['Saath Nibhana', 'SAATH', 'ring'],
  ['Pehli Nazar', 'GLANCE', 'face_blush'],
  ['Hug Tight', 'TIGHT', 'double_heart'],
  ['Cuddle Mood', 'CUDDLE', 'heart'],
  ['Hold Hands', 'HANDS', 'infinity'],
  ['Heartbeat', 'BEAT', 'heart_wings'],
  ['Angel Wings', 'ANGEL', 'heart_wings'],
  ['Pink Blossom', undefined, 'flower'],
  ['Magic Kiss', 'KISS', 'kiss_mark'],
  ['Dream Of U', 'DREAM', 'moon_heart'],
  ['Safe Haven', 'SAFE', 'lock_heart'],
  ['Warm Flame', 'FLAME', 'candle_heart'],
  ['Diamond Love', 'GEM', 'diamond'],
  ['Love Note', 'READ', 'love_letter'],
  ['Sweet Whisper', 'SHHH', 'speech'],
  ['Heart Key', 'KEY', 'lock_heart'],
  ['Velvet Rose', 'VELVET', 'rose'],
  ['Soft Petals', 'PETAL', 'flower'],
  ['Promise Day', 'PROMISE', 'ring'],
  ['Forever Bond', 'BOND', 'infinity'],
  ['Cute Crush', 'CUTE', 'face_blush'],
  ['Royal Heart', 'ROYAL', 'crown'],
  ['Honey Pie', 'HONEY', 'heart'],
  ['Sugar Plum', 'SUGAR', 'butterfly'],
  ['Moon & Back', 'MOON', 'moon_heart'],
  ['Starry Eyes', 'STARS', 'star'],
  ['Endless', undefined, 'infinity'],
  ['Devoted', 'TRUE', 'candle_heart'],
  ['Cherish U', 'CHERISH', 'gift'],
  ['Adore U', 'ADORE', 'double_heart'],
  ['Beloved', 'BELOVED', 'ribbon_heart'],
  ['Darling', 'DARLING', 'rose'],
  ['Precious', 'PRECIOUS', 'diamond'],
  ['Treasure', 'TREASURE', 'lock_heart'],
  ['Sunshine U', 'SUNNY', 'sun'],
  ['Glow Together', 'GLOW', 'sparkle_burst'],
  ['Sweet Tea', 'CHAI 4 2', 'tea_cup'],
  ['Melody Love', 'MELODY', 'music'],
  ['Fly With Me', 'FLY', 'rocket'],
  ['Flutter', 'FLUTTER', 'butterfly'],
  ['Kind Heart', 'KIND', 'heart'],
  ['Warmth', 'WARM', 'fire'],
  ['Twin Flame', 'TWIN', 'candle_heart'],
  ['Sealed Letter', 'SEALED', 'love_letter'],
  ['Soft Kiss', 'XOXO', 'kiss_mark'],
  ['Heartfelt', 'FELT', 'double_heart'],
  ['Affection', 'AFFECTION', 'ribbon_heart'],
  ['Loyalty', 'LOYAL', 'diamond'],
  ['Trust Me', 'TRUST', 'lock_heart'],
  ['Peaceful Us', 'US', 'moon_heart'],
  ['Happy Together', 'WE', 'face_happy'],
  ['Lucky Me', 'LUCKY', 'star'],
  ['My Angel', 'MY LOVE', 'heart_wings'],
  ['Rose Garden', 'BLOOM', 'rose'],
  ['Chai & You', 'U & ME', 'tea_cup'],
  ['Heart Sparkle', 'SPARK', 'sparkle_burst'],
  ['Sweetest', 'SWEETEST', 'gift'],
  ['Be Mine', 'BE MINE', 'heart'],
  ['I Choose U', 'CHOOSE', 'ring'],
  ['With Love', 'LOVE', 'love_letter'],
  ['Dil Ki Baat', 'DIL', 'speech'],
  ['Pyari Muskan', 'MUSKAN', 'face_blush'],
  ['Rooh Se', 'ROOH', 'infinity'],
  ['Ishq E Haq', 'HAQ', 'candle_heart'],
  ['Khushboo', 'SCENT', 'flower'],
  ['Chandni', 'CHAND', 'moon_crescent'],
  ['Sitaron Mein', 'SITARA', 'star'],
  ['Titli', 'TITLI', 'butterfly'],
  ['Tohfa', 'TOHFA', 'gift'],
  ['Dilbar', 'DILBAR', 'double_heart'],
  ['Sajna', 'SAJNA', 'rose'],
  ['Dhadkan', 'PULSE', 'heart'],
  ['Intezar', 'WAIT U', 'moon_heart'],
  ['Iqrar', 'IQRAR', 'ring'],
  ['Wafa', 'WAFA', 'lock_heart'],
  ['Pakeeza', 'PURE', 'diamond'],
  ['Khamosh Pyar', 'QUIET', 'love_letter'],
  ['Noor E Dil', 'NOOR', 'sun'],
  ['Mohabbat Zinda', 'ALIVE', 'fire'],
  ['Pyar Hi Pyar', 'LOVELY', 'heart_wings'],
  ['Hamesha', 'HAMESHA', 'infinity'],
  ['Saath Tera', 'TERA', 'double_heart'],
  ['Mere Paas', 'NEAR', 'ribbon_heart'],
  ['Dil Ka Raja', 'RAJA', 'crown'],
  ['Dil Ki Rani', 'RANI', 'crown'],
  ['Gulab', 'GULAB', 'rose'],
  ['Shama', 'SHAMA', 'candle_heart'],
  ['Sadaa Khush', 'BLESSED', 'flower'],
  ['Bharosa', 'BHAROSA', 'lock_heart'],
  ['Qurb', 'CLOSE', 'double_heart'],
  ['Muskurahat', 'SMILE', 'face_happy'],
  ['Pyara Sa', 'PYARA', 'face_blush'],
  ['Sona', 'SONA', 'star'],
  ['Heera', 'HEERA', 'diamond'],
  ['Chahat Note', 'LETTER', 'love_letter'],
  ['Dil Nawaz', 'NAWAZ', 'butterfly'],
  ['Umeed', 'UMEED', 'sun'],
  ['Aarzoo', 'AARZOO', 'moon_heart'],
  ['Duaon Mein', 'IN DUA', 'candle_heart'],
  ['Mehfil', 'MEHFIL', 'music'],
  ['Jashn', 'JASHN', 'sparkle_burst'],
  ['Naya Safar', 'SAFAR', 'rocket'],
  ['Tere Naam', 'NAAM', 'ring'],
  ['Bas Tu', 'BAS TU', 'heart'],
  ['Mera Sukoon', 'SUKOON', 'tea_cup'],
  ['Dil Ki Duniya', 'DUNIYA', 'heart_wings'],
  ['Pyaar Ki Chaon', 'SHADE', 'flower'],
  ['Roshni', 'LIGHT', 'sun'],
  ['Chupke Se', 'CHUPKE', 'face_wink'],
  ['Dil Ki Aawaz', 'VOICE', 'speech'],
  ['Mitha Bandhan', 'TIE', 'ribbon_heart'],
  ['Sacha Rishta', 'RISHTA', 'infinity'],
  ['Nazakat', 'GRACE', 'butterfly'],
  ['Khushnaseeb', 'FORTUNE', 'diamond'],
  ['Dil Nasheen', 'CHARM', 'rose'],
  ['Aankhon Mein', 'EYES', 'face_blush'],
  ['Khawab', 'KHAWAB', 'moon_crescent'],
  ['Subah Ka Noor', 'DAWN', 'sun'],
  ['Shaam E Pyar', 'EVENING', 'candle_heart'],
  ['Raat Ki Baat', 'NIGHT', 'moon_heart'],
  ['Teri Hansi', 'LAUGH', 'face_happy'],
  ['Meri Khushi', 'JOY', 'sparkle_burst'],
  ['Anmol', 'ANMOL', 'diamond'],
  ['Shukriya Dil', 'GRATEFUL', 'gift'],
  ['Dil Lagana', 'ATTACH', 'double_heart'],
  ['Pyar Ka Rang', 'COLOR', 'flower'],
  ['Jaan Se Pyara', 'BELOVED', 'heart'],
  ['Sadiyon Tak', 'AGES', 'infinity'],
  ['Meethi Baatein', 'TALKS', 'speech'],
  ['Chai Aur Dil', 'WARMTH', 'tea_cup'],
  ['Dil Ka Taaj', 'TAJ', 'crown'],
  ['Pyar Ka Paigham', 'MSG', 'love_letter'],
  ['Sache Bol', 'TRUTH', 'heart_wings'],
  ['Narm Lehja', 'SOFT', 'ribbon_heart'],
  ['Meherban', 'KINDLY', 'candle_heart'],
  ['Hamdam', 'HAMDAM', 'double_heart'],
  ['Yaarana Love', 'YAAR', 'star'],
  ['Dil Ki Gali', 'LANE', 'rose'],
  ['Pehli Mohabbat', 'FIRST', 'ring'],
  ['Sadiyon Ka Sath', 'ETERNAL', 'infinity'],
  ['Chahat Ki Barish', 'SHOWER', 'sparkle_burst'],
  ['Khushi Ka Pal', 'MOMENT', 'gift'],
  ['Dil Ki Talaash', 'FOUND U', 'lock_heart'],
  ['Teri Qasam', 'VOW', 'ring'],
  ['Chand Sitara', 'STARRY', 'moon_heart'],
  ['Dil Ki Dharkan', 'THROB', 'heart'],
  ['Pyara Tohfa', 'PRESENT', 'gift'],
  ['Mohabbat Ka Geet', 'TUNE', 'music'],
  ['Sacha Pyar', 'REAL', 'diamond'],
  ['Hamesha Tera', 'YOURS', 'love_letter'],
  ['Dil Se Dua', 'BLESS', 'candle_heart'],
  ['Khush Raho', 'HAPPY', 'face_happy']
];

const FUNNY_SPECS: Array<[string, string | undefined, StickerMotif]> = [
  ['LOL Max', 'LOL!', 'face_laugh'],
  ['Bruh Moment', 'BRUH', 'face_shock'],
  ['Plot Twist', 'TWIST!', 'lightning'],
  ['Drama King', 'DRAMA', 'crown'],
  ['No Way!', 'NO WAY', 'face_shock'],
  ['Oopsie!', 'OOPS!', 'face_goofy'],
  ['Chai Break', 'CHAI!', 'tea_cup'],
  ['Zero Chill', '0 CHILL', 'fire'],
  ['Spill Tea', 'TEA?', 'tea_cup'],
  ['Brain Lag', 'LAG...', 'face_sleep'],
  ['Wifi Gone', 'NO WIFI', 'lightning'],
  ['Wait What', 'WHAT?!', 'face_shock'],
  ['Meme Lord', 'MEME', 'face_cool'],
  ['Snack Attack', 'SNACK', 'face_goofy'],
  ['Monday Blues', 'MONDAY', 'face_sleep'],
  ['Boss Mode', 'BOSS', 'face_cool'],
  ['Sarcastic', 'SURE...', 'face_wink'],
  ['Ghosting', 'BOO!', 'ghost_boo'],
  ['Giggle Fit', 'HEHE', 'face_laugh'],
  ['Mood Swing', 'MOOD!', 'lightning'],
  ['Awkward', 'AWK...', 'face_goofy'],
  ['Who Dis?', 'WHO?', 'speech'],
  ['Too Cool', '2 COOL', 'face_cool'],
  ['Not Today', 'NOPE', 'ghost_boo'],
  ['Send Help', 'HELP!', 'face_shock'],
  ['Caught U', 'CAUGHT', 'face_wink'],
  ['Roast Mode', 'ROAST', 'fire'],
  ['Hustle Fail', 'FAIL', 'trophy'],
  ['Sleep Thief', 'NAP?', 'face_sleep'],
  ['Clown Vibe', 'HAHA', 'face_goofy'],
  ['Overthinking', 'HMMM', 'speech'],
  ['Big Brain', 'GENIUS', 'sparkle_burst'],
  ['Lazy Legend', 'LAZY', 'face_sleep'],
  ['Chaos Energy', 'CHAOS', 'lightning'],
  ['Mic Drop', 'DROP!', 'music'],
  ['Fake Smile', 'FINE...', 'face_happy'],
  ['Side Eye', 'SUS', 'face_wink'],
  ['Payday Mood', 'RICH!', 'diamond'],
  ['Broke Again', 'BROKE', 'ghost_boo'],
  ['Alarm Snooze', '5 MIN', 'face_sleep'],
  ['Kya Scene', 'SCENE?', 'face_cool'],
  ['Mazaak Tha', 'MAZAAK', 'face_laugh'],
  ['Hadd Ho Gayi', 'HADD!', 'face_shock'],
  ['Bakwas Band', 'CHUP!', 'speech'],
  ['Chai Lao', 'CHAI PLZ', 'tea_cup'],
  ['Bhains Ki', 'OH NO!', 'face_goofy'],
  ['Wah Bhai', 'WAH!', 'trophy'],
  ['Khatam Tata', 'TATA', 'rocket'],
  ['Samajh Rahe', 'SAMJHE?', 'face_wink'],
  ['Paisa Barbad', 'OOF!', 'fire'],
  ['Dil Garden', 'GARDEN', 'flower'],
  ['Arey Bhai', 'BHAI!', 'face_shock'],
  ['Mast Joke', 'JOKE!', 'face_laugh'],
  ['Topi Drama', 'TOPI', 'crown'],
  ['Golmaal', 'GOLMAAL', 'face_goofy'],
  ['Jugaad', 'JUGAAD', 'lightning'],
  ['Timepass', 'CHILL', 'tea_cup'],
  ['Nautanki', 'ACTING', 'ghost_boo'],
  ['Chaska', 'CHASKA', 'fire'],
  ['Bindaas', 'BINDAAS', 'face_cool'],
  ['Dhamaal', 'DHAMAAL', 'sparkle_burst'],
  ['Pataka', 'BOOM!', 'fire'],
  ['Kuch Bhi', 'KUCH BHI', 'speech'],
  ['Sahi Khel', 'CLEVER', 'face_wink'],
  ['Moye Moye', 'MOYE!', 'music'],
  ['Ullu Mat Banao', 'NOPE!', 'face_shock'],
  ['Dheet Mode', 'DHEET', 'face_cool'],
  ['Shabash Beta', 'SHABASH', 'trophy'],
  ['Chup Kar', 'SHHH!', 'speech'],
  ['Hassi Rukti', 'ROFL', 'face_laugh'],
  ['Aaj Chutti', 'OFF!', 'sun'],
  ['Kaam Chor', 'SKIP!', 'face_sleep'],
  ['Bhook Lagi', 'HUNGRY', 'face_goofy'],
  ['Pet Pooja', 'FOOD!', 'gift'],
  ['Selfie King', 'POSE!', 'star'],
  ['Filter Effect', 'GLAM', 'sparkle_burst'],
  ['Typing...', 'TYPING', 'speech'],
  ['Seen Zone', 'SEEN', 'face_wink'],
  ['Reply Kar', 'REPLY!', 'lightning'],
  ['Block Karu?', 'BLOCK?', 'lock_heart'],
  ['Gossip Alert', 'GOSSIP', 'speech'],
  ['Tea Hot', 'HOT!', 'tea_cup'],
  ['Drama Alert', 'ALERT', 'fire'],
  ['Silly Goose', 'SILLY', 'face_goofy'],
  ['Prankster', 'PRANK', 'ghost_boo'],
  ['TikTok Star', 'VIRAL', 'star'],
  ['Fast Furious', 'ZOOM', 'rocket'],
  ['Disco Dancer', 'DISCO', 'music'],
  ['Nerd Alert', 'NERD', 'face_cool'],
  ['Shocking!', 'SHOCK', 'lightning'],
  ['No Comments', '...', 'face_sleep'],
  ['Dead Laugh', 'DEAD!', 'face_laugh'],
  ['Crying Laugh', 'HAHAHA', 'face_laugh'],
  ['Sneaky Peek', 'PEEK', 'face_wink'],
  ['Busted!', 'BUSTED', 'face_shock'],
  ['Plot Hole', 'UH OH', 'ghost_boo'],
  ['Oops Again', 'MY BAD', 'face_goofy'],
  ['Sassy Vibe', 'SASSY', 'crown'],
  ['Queen Energy', 'DIVA', 'diamond'],
  ['Chill Pill', 'RELAX', 'tea_cup'],
  ['Wink Wink', 'HEHE', 'face_wink'],
  ['Crazy Idea', 'IDEA!', 'lightning'],
  ['Party Foul', 'OOPS', 'sparkle_burst'],
  ['Sleepy Head', 'ZZZZ', 'face_sleep'],
  ['Wild Card', 'WILD', 'fire'],
  ['Funny Bone', 'TICKLE', 'face_laugh'],
  ['Goofy Grin', 'GRIN', 'face_goofy'],
  ['Epic Fail', 'L', 'ghost_boo'],
  ['Epic Win', 'W', 'trophy'],
  ['Wait A Sec', 'HOLD ON', 'speech'],
  ['Who Me?', 'ME?!', 'face_blush'],
  ['Too Funny', 'LMAO', 'face_laugh'],
  ['Joking!', 'JK!', 'face_wink'],
  ['No Cap', 'NO CAP', 'face_cool'],
  ['Slay Day', 'SLAY', 'sparkle_burst'],
  ['Tea Time', 'SIP', 'tea_cup'],
  ['Boom Roast', 'BURN', 'fire'],
  ['Happy Dance', 'DANCE', 'music'],
  ['Zoomies', 'NYOOM', 'rocket'],
  ['Chaotic Good', 'CHAOS!', 'star']
];

const SAD_SPECS: Array<[string, string | undefined, StickerMotif]> = [
  ['Heavy Heart', 'HEAVY', 'broken_heart'],
  ['Silent Tears', undefined, 'face_cry'],
  ['Rainy Mind', 'RAIN', 'cloud_rain'],
  ['Broken Inside', 'HURT', 'broken_heart'],
  ['Healing Soon', 'HEAL', 'bandage_heart'],
  ['Miss U Bad', 'MISS U', 'moon_crescent'],
  ['Alone Tonight', 'ALONE', 'moon_heart'],
  ['Need A Hug', 'HUG ME', 'bandage_heart'],
  ['Quiet Pain', 'PAIN', 'face_sad'],
  ['Blue Mood', 'BLUE', 'cloud_rain'],
  ['Empty Room', 'EMPTY', 'wilted_rose'],
  ['Soft Sigh', 'SIGH...', 'face_sad'],
  ['Fading Star', 'FADING', 'star'],
  ['Stay Strong', 'STRONG', 'bandage_heart'],
  ['Hold On', 'HOLD ON', 'umbrella'],
  ['Sorry Again', 'SORRY', 'face_sad'],
  ['Midnight Cry', '3 AM', 'face_cry'],
  ['Lost Words', '...', 'speech'],
  ['Cold Tea', 'COLD', 'tea_cup'],
  ['Wilted Petal', 'WILTED', 'wilted_rose'],
  ['Rain Shield', 'SHELTER', 'umbrella'],
  ['Tear Drop', 'TEARS', 'face_cry'],
  ['Cloudy Day', 'CLOUDY', 'cloud_rain'],
  ['Come Back', 'COME BACK', 'love_letter'],
  ['Forgive Me', 'FORGIVE', 'bandage_heart'],
  ['Deep Sigh', 'LOW', 'face_sad'],
  ['Numb Mood', 'NUMB', 'cloud_rain'],
  ['Lonely Moon', 'LONELY', 'moon_crescent'],
  ['Shattered', 'CRACKED', 'broken_heart'],
  ['Grey Sky', 'GREY', 'umbrella'],
  ['Udaas Dil', 'UDAAS', 'face_sad'],
  ['Tanha Shaam', 'TANHA', 'moon_crescent'],
  ['Yaad Aayi', 'YAAD', 'wilted_rose'],
  ['Dil Toota', 'BROKEN', 'broken_heart'],
  ['Rona Aaya', 'TEAR', 'face_cry'],
  ['Khamoshi', 'SILENT', 'speech'],
  ['Dil Bhari', 'BHARI', 'cloud_rain'],
  ['Sabr Karo', 'SABR', 'bandage_heart'],
  ['Ghamgeen', 'GHAM', 'face_sad'],
  ['Dard Bhara', 'DARD', 'broken_heart'],
  ['Bikhra Hua', 'LOST', 'wilted_rose'],
  ['Chup Chap', 'QUIET', 'moon_crescent'],
  ['Intezar Hai', 'WAITING', 'umbrella'],
  ['Adhoora', 'INCOMPLETE', 'broken_heart'],
  ['Akelepan', 'SOLO', 'cloud_rain'],
  ['Thak Gaya', 'TIRED', 'face_sleep'],
  ['Dil Udas', 'DOWN', 'face_sad'],
  ['Ashk', 'ASHK', 'face_cry'],
  ['Zakhm', 'MEND', 'bandage_heart'],
  ['Toota Khwab', 'FADED', 'star'],
  ['Barish Mein', 'SOAKED', 'cloud_rain'],
  ['Sard Hawa', 'CHILL', 'moon_crescent'],
  ['Veeran', 'QUIET', 'wilted_rose'],
  ['Koi Nahi', 'NO ONE', 'face_sad'],
  ['Bhool Gaye', 'FORGOT?', 'love_letter'],
  ['Dil Ki Chot', 'ACHE', 'broken_heart'],
  ['Maafi', 'MAAFI', 'bandage_heart'],
  ['Dua Karo', 'PRAY', 'candle_heart'],
  ['Raat Lambi', 'LONG NIGHT', 'moon_crescent'],
  ['Subah Hogi', 'HOPE', 'sun'],
  ['Aansoo', 'AANSOO', 'face_cry'],
  ['Dukh', 'SORROW', 'cloud_rain'],
  ['Mushkil Waqt', 'HARD DAY', 'umbrella'],
  ['Dil Ro Raha', 'CRYING', 'face_cry'],
  ['Chhod Gaye', 'GONE', 'wilted_rose'],
  ['Akela Feel', 'ALONE', 'face_sad'],
  ['Grief', 'GRIEF', 'broken_heart'],
  ['Melancholy', 'MELO', 'cloud_rain'],
  ['Shatter Heart', undefined, 'broken_heart'],
  ['Rain Cloud', undefined, 'cloud_rain'],
  ['Drizzle', 'DRIZZLE', 'umbrella'],
  ['Patched Heart', undefined, 'bandage_heart'],
  ['Dry Rose', undefined, 'wilted_rose'],
  ['Downcast', 'DOWNCAST', 'face_sad'],
  ['Weeping', 'WEEP', 'face_cry'],
  ['Sleepless', 'AWAKE', 'moon_crescent'],
  ['Heavy Rain', 'STORM', 'cloud_rain'],
  ['Longing', 'LONGING', 'moon_heart'],
  ['Quiet Tear', 'SOB', 'face_cry'],
  ['Heartache', 'ACHE', 'broken_heart'],
  ['Fragile', 'FRAGILE', 'wilted_rose'],
  ['Bruised', 'BRUISED', 'bandage_heart'],
  ['Overcast', 'OVERCAST', 'cloud_rain'],
  ['Gloomy', 'GLOOM', 'umbrella'],
  ['Hollow', 'HOLLOW', 'face_sad'],
  ['Crushed', 'CRUSHED', 'broken_heart'],
  ['Pleading', 'PLEASE', 'face_cry'],
  ['Hurtful', 'STINGS', 'wilted_rose'],
  ['Wishing U', 'WISH U', 'star'],
  ['Missing Home', 'HOME', 'candle_heart'],
  ['Silent Mode', 'MUTE', 'speech'],
  ['Cold Rain', 'COLD', 'cloud_rain'],
  ['Tear Stains', 'STAIN', 'face_cry'],
  ['Broken Promise', 'TORN', 'broken_heart'],
  ['Still Care', 'STILL', 'bandage_heart'],
  ['Under Rain', 'WET', 'umbrella'],
  ['Dark Cloud', 'DARK', 'cloud_rain'],
  ['Soft Cry', 'CRY', 'face_cry'],
  ['Dim Light', 'DIM', 'candle_heart'],
  ['Sad Vibe', 'SAD', 'face_sad'],
  ['Keep Going', 'PUSH ON', 'bandage_heart'],
  ['Tomorrow', 'NEW DAY', 'sun'],
  ['Gentle Care', 'GENTLE', 'flower'],
  ['Peace Soon', 'CALM', 'tea_cup'],
  ['Safe Hug', 'WARM HUG', 'double_heart'],
  ['Listening', 'HERE', 'speech'],
  ['Not Alone', 'WITH U', 'heart'],
  ['Better Days', 'SUNRISE', 'sun'],
  ['Soft Hope', 'HOPE', 'star'],
  ['Strength', 'STRENGTH', 'diamond']
];

const MOOD_SPECS: Array<[string, string | undefined, StickerMotif]> = [
  ['Happy Glow', 'GLOW!', 'sun'],
  ['Peaceful', 'ZEN', 'flower'],
  ['Cozy Vibes', 'COZY', 'tea_cup'],
  ['Hyped Up', 'HYPED', 'lightning'],
  ['Proud Of U', 'PROUD', 'trophy'],
  ['Dreamy', 'DREAMY', 'moon_crescent'],
  ['Grateful', 'THANKS', 'gift'],
  ['Hopeful', 'HOPE', 'star'],
  ['Blessed', 'BLESSED', 'sparkle_burst'],
  ['Shy Blush', 'SHY', 'face_blush'],
  ['Focused', 'FOCUS', 'diamond'],
  ['Excited', 'EXCITED', 'rocket'],
  ['Chill Vibe', 'CHILL', 'face_cool'],
  ['Inspired', 'INSPIRE', 'candle_heart'],
  ['Joyful', 'JOY!', 'face_happy'],
  ['Musical', 'TUNES', 'music'],
  ['Calm Sea', 'CALM', 'umbrella'],
  ['Sparkling', 'SPARKLE', 'sparkle_burst'],
  ['Sunny Side', 'SUNNY', 'sun'],
  ['Rested', 'FRESH', 'flower'],
  ['Motivated', 'GO!', 'fire'],
  ['Confident', 'BOLD', 'crown'],
  ['Serene', 'SERENE', 'moon_heart'],
  ['Cheerful', 'CHEER', 'face_happy'],
  ['Wink Mood', 'WINK', 'face_wink'],
  ['Playful', 'PLAY', 'butterfly'],
  ['Warm Mood', 'WARM', 'tea_cup'],
  ['Bright', 'BRIGHT', 'star'],
  ['Content', 'GOOD', 'face_blush'],
  ['Active', 'ACTIVE', 'rocket'],
  ['Mindful', 'MINDFUL', 'candle_heart'],
  ['Creative', 'CREATE', 'sparkle_burst'],
  ['Radiant', 'RADIANT', 'diamond'],
  ['Gentle', 'GENTLE', 'ribbon_heart'],
  ['Free Spirit', 'FREE', 'butterfly'],
  ['Blessed Day', 'AMEEN', 'moon_crescent'],
  ['Sukun Vibe', 'SUKUN', 'tea_cup'],
  ['Khush Dil', 'KHUSH', 'face_happy'],
  ['Mast Mood', 'MAST', 'music'],
  ['Fresh Morning', 'FRESH!', 'sun'],
  ['Night Owl', 'OWL', 'moon_crescent'],
  ['Daydream', 'DRIFT', 'butterfly'],
  ['Positive', 'PLUS+', 'star'],
  ['Good Energy', 'ENERGY', 'lightning'],
  ['Relaxed', 'RELAX', 'flower'],
  ['Sweet Mood', 'SWEET', 'face_blush'],
  ['Sharp', 'SHARP', 'face_cool'],
  ['Lucky Star', 'LUCKY', 'star'],
  ['Brave Heart', 'BRAVE', 'heart'],
  ['Steady', 'STEADY', 'diamond'],
  ['Glowing', 'SHINE', 'sun'],
  ['Unstoppable', 'ON FIRE', 'fire'],
  ['Vibing', 'VIBES', 'music'],
  ['Pure Joy', 'BLISS', 'sparkle_burst'],
  ['Soft Glow', 'SOFT', 'candle_heart']
];

const GREETING_SPECS: Array<[string, string | undefined, StickerMotif]> = [
  ['Assalam', 'AOA!', 'moon_crescent'],
  ['Walaikum', 'WSLAM', 'speech'],
  ['JazakAllah', 'JAZAK', 'star'],
  ['Eid Mubarak', 'EID', 'moon_heart'],
  ['Ramzan Kareem', 'RAMZAN', 'candle_heart'],
  ['Jumma Mubarak', 'JUMMA', 'flower'],
  ['Subah Bakhair', 'SUBAH', 'sun'],
  ['Shab Bakhair', 'SHAB', 'moon_crescent'],
  ['Khuda Hafiz', 'ALLAH HAFIZ', 'heart'],
  ['Take Care', 'TAKE CARE', 'ribbon_heart'],
  ['Hey Dost!', 'DOST!', 'face_happy'],
  ['Kya Haal Hai', 'HAAL?', 'speech'],
  ['Sab Theek?', 'THEEK?', 'face_wink'],
  ['Long Time', 'MISS!', 'butterfly'],
  ['See Soon', 'SOON!', 'rocket'],
  ['Good Day', 'GDAY!', 'sun'],
  ['Sweet Dreams', 'DREAMS', 'moon_heart'],
  ['Rise Shine', 'RISE!', 'sun'],
  ['Welcome Home', 'HOME', 'gift'],
  ['Namaste', 'NAMASTE', 'flower'],
  ['Marhaba', 'MARHABA', 'star'],
  ['Shukriya', 'SHUKRIYA', 'heart'],
  ['Mubarak Ho', 'MUBARAK', 'sparkle_burst'],
  ['Salgirah', 'BDAY!', 'gift'],
  ['Best Wishes', 'WISHES', 'ribbon_heart'],
  ['Safe Trip', 'SAFE!', 'rocket'],
  ['Get Well', 'HEAL', 'bandage_heart'],
  ['Good Luck', 'LUCK!', 'star'],
  ['Have Fun', 'FUN!', 'music'],
  ['Ping!', 'PING!', 'lightning'],
  ['Busy Now', 'BUSY', 'face_cool'],
  ['Call Me', 'CALL?', 'speech'],
  ['On My Way', 'OMW!', 'rocket'],
  ['Just Landed', 'HERE!', 'sparkle_burst'],
  ['Tea Invite', 'CHAI?', 'tea_cup'],
  ['Catch Up', 'CHAT?', 'speech'],
  ['Say Cheese', 'SMILE', 'face_happy'],
  ['Warm Hello', 'HELLO', 'sun'],
  ['Friendly Wave', 'HIYA!', 'face_blush'],
  ['Cheers', 'CHEERS', 'trophy']
];

const FUN_SPECS: Array<[string, string | undefined, StickerMotif]> = [
  ['Congrats', 'BRAVO!', 'trophy'],
  ['Shabash', 'SHABASH', 'star'],
  ['High Five', 'HIGH 5', 'sparkle_burst'],
  ['Respect', 'RESPECT', 'crown'],
  ['VIP Pass', 'VIP', 'diamond'],
  ['Top Tier', 'TOP!', 'trophy'],
  ['Legend', 'LEGEND', 'crown'],
  ['Magic!', 'MAGIC', 'sparkle_burst'],
  ['Genius', 'SMART', 'lightning'],
  ['Done!', 'DONE', 'diamond'],
  ['Approved', 'YES!', 'star'],
  ['Superstar', 'STAR', 'star'],
  ['Champion', 'CHAMP', 'trophy'],
  ['Golden', 'GOLD', 'crown'],
  ['Party Time', 'PARTY', 'gift'],
  ['Gift Drop', 'GIFT', 'gift'],
  ['Level Up', 'LVL UP', 'rocket'],
  ['Power On', 'POWER', 'lightning'],
  ['On Fire', 'FIRE!', 'fire'],
  ['Beats', 'BEATS', 'music'],
  ['Secret Club', 'CLUB', 'lock_heart'],
  ['Queen Bee', 'QUEEN', 'crown'],
  ['King Vibe', 'KING', 'crown'],
  ['Ace Card', 'ACE', 'diamond'],
  ['Winner', 'WIN!', 'trophy'],
  ['Boom!', 'BOOM', 'fire'],
  ['Zoom', 'FAST', 'rocket'],
  ['Shine On', 'SHINE', 'sun'],
  ['Wow Factor', 'WOW!', 'sparkle_burst'],
  ['Cool Beans', 'COOL!', 'face_cool'],
  ['Perfect!', '10/10', 'diamond'],
  ['Locked In', 'LOCKED', 'lock_heart'],
  ['Sound On', 'PLAY', 'music'],
  ['Flash', 'FLASH', 'lightning'],
  ['Victory', 'VICTORY', 'trophy'],
  ['Surprise!', 'SURPRISE', 'gift'],
  ['Epic!', 'EPIC', 'fire'],
  ['Blast Off', 'LAUNCH', 'rocket'],
  ['Pure Gold', '24K', 'crown'],
  ['Mega Star', 'MEGA', 'star'],
  ['No Doubt', '100%', 'diamond'],
  ['Vibe Check', 'CHECK', 'music'],
  ['Spark On', 'IGNITE', 'fire'],
  ['Sweet Win', 'SWEET', 'trophy'],
  ['Dream Big', 'BIG', 'rocket'],
  ['Rockstar', 'ROCK', 'lightning'],
  ['Crown Up', 'RULE', 'crown'],
  ['Celebrate', 'CHEERS', 'sparkle_burst'],
  ['Treasure', 'GEM', 'diamond'],
  ['All Set', 'READY', 'star']
];

const FRAMES: StickerFrame[] = ['rounded', 'circle', 'pill', 'stamp', 'diamond'];
const DECORS: Array<'dots' | 'sparkles' | 'hearts' | 'rings' | 'none'> = [
  'sparkles',
  'dots',
  'hearts',
  'rings',
  'none'
];

function buildStickersFromSpecs(
  specs: Array<[string, string | undefined, StickerMotif]>,
  category: StickerCategory,
  palettes: PaletteTheme[],
  prefix: string
): CustomStickerItem[] {
  return specs.map(([label, caption, motif], idx) => {
    const palette = palettes[(idx * 3 + prefix.length) % palettes.length];
    const frame = FRAMES[(idx + category.length) % FRAMES.length];
    const decor = DECORS[(idx * 2 + (category === 'love' ? 2 : 0)) % DECORS.length];
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return {
      id: `${prefix}_${idx + 1}_${slug}`,
      label,
      category,
      bg: palette.bg,
      accent: palette.accent,
      text: palette.text,
      caption,
      motif,
      frame,
      decor
    };
  });
}

export const CUSTOM_STICKERS: CustomStickerItem[] = [
  ...CORE_STICKERS,
  ...buildStickersFromSpecs(LOVE_SPECS, 'love', LOVE_PALETTES, 'lv'),
  ...buildStickersFromSpecs(FUNNY_SPECS, 'funny', FUNNY_PALETTES, 'fn'),
  ...buildStickersFromSpecs(SAD_SPECS, 'sad', SAD_PALETTES, 'sd'),
  ...buildStickersFromSpecs(MOOD_SPECS, 'moods', MOOD_PALETTES, 'md'),
  ...buildStickersFromSpecs(GREETING_SPECS, 'greetings', GREETING_PALETTES, 'gr'),
  ...buildStickersFromSpecs(FUN_SPECS, 'fun', FUN_PALETTES, 'fx')
];

const STICKER_BY_ID = new Map<string, CustomStickerItem>(
  CUSTOM_STICKERS.map(item => [item.id, item])
);

export function getStickerById(id: string): CustomStickerItem | null {
  return STICKER_BY_ID.get(id) || null;
}

export function toStickerToken(id: string): string {
  return `${STICKER_TOKEN_PREFIX}${id}${STICKER_TOKEN_SUFFIX}`;
}

export function parseStickerToken(text: string): CustomStickerItem | null {
  const trimmed = (text || '').trim();
  if (!trimmed.startsWith(STICKER_TOKEN_PREFIX) || !trimmed.endsWith(STICKER_TOKEN_SUFFIX)) {
    return null;
  }
  const id = trimmed.slice(STICKER_TOKEN_PREFIX.length, -STICKER_TOKEN_SUFFIX.length).trim();
  return STICKER_BY_ID.get(id) || null;
}

export function formatChatPreviewText(text?: string): string {
  if (!text) return 'Tap to open chat';
  const trimmed = text.trim();
  const sticker = parseStickerToken(trimmed);
  if (sticker) {
    return `Sticker · ${sticker.label}`;
  }
  if (trimmed.startsWith('[PHOTO_STICKER]')) {
    try {
      const parsed = JSON.parse(trimmed.slice('[PHOTO_STICKER]'.length).trim() || '{}');
      return parsed?.caption ? `Sticker · ${parsed.caption}` : 'Sticker';
    } catch {
      return 'Sticker';
    }
  }
  if (trimmed.startsWith('[VIDEO_STICKER]')) {
    try {
      const parsed = JSON.parse(trimmed.slice('[VIDEO_STICKER]'.length).trim() || '{}');
      return parsed?.caption ? `Video Sticker · ${parsed.caption}` : 'Video Sticker';
    } catch {
      return 'Video Sticker';
    }
  }
  return text;
}

function getLiveAnimationClass(category: StickerCategory, motif: StickerMotif): string {
  if (
    motif === 'heart' ||
    motif === 'double_heart' ||
    motif === 'heart_wings' ||
    motif === 'kiss_mark' ||
    motif === 'ribbon_heart'
  ) {
    return 'sticker-anim-beat';
  }
  if (
    motif === 'face_laugh' ||
    motif === 'face_goofy' ||
    motif === 'face_shock' ||
    motif === 'ghost_boo' ||
    motif === 'rocket' ||
    motif === 'lightning' ||
    motif === 'fire'
  ) {
    return 'sticker-anim-boing';
  }
  if (
    motif === 'face_sad' ||
    motif === 'face_cry' ||
    motif === 'cloud_rain' ||
    motif === 'wilted_rose' ||
    motif === 'broken_heart' ||
    motif === 'umbrella'
  ) {
    return 'sticker-anim-sway';
  }
  if (
    motif === 'sun' ||
    motif === 'flower' ||
    motif === 'speech' ||
    motif === 'butterfly' ||
    motif === 'music' ||
    motif === 'tea_cup'
  ) {
    return 'sticker-anim-wave';
  }
  if (category === 'love') return 'sticker-anim-beat';
  if (category === 'funny') return 'sticker-anim-boing';
  if (category === 'sad') return 'sticker-anim-sway';
  if (category === 'greetings') return 'sticker-anim-wave';
  return 'sticker-anim-float';
}

type MascotSpecies = 'bunny' | 'bear' | 'kitty' | 'panda' | 'chibi';

function getMascotForSticker(id: string): MascotSpecies {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const species: MascotSpecies[] = ['bunny', 'bear', 'kitty', 'panda', 'chibi'];
  return species[hash % species.length];
}

// Crisp kawaii cartoon eyes helper
function renderCartoonEyes(
  variant: 'happy' | 'blush' | 'wink' | 'laugh' | 'goofy' | 'shock' | 'sleep' | 'sad' | 'cry' | 'cool' | 'heartEyes',
  ink: string,
  accent: string
) {
  switch (variant) {
    case 'cool':
      return (
        <g>
          <rect x="18.5" y="24" width="11.5" height="7" rx="3" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.1" />
          <rect x="34" y="24" width="11.5" height="7" rx="3" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.1" />
          <line x1="30" y1="26.5" x2="34" y2="26.5" stroke="#0F172A" strokeWidth="2.4" />
          <line x1="20.5" y1="25.8" x2="25" y2="25.8" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <line x1="36" y1="25.8" x2="40.5" y2="25.8" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case 'laugh':
      return (
        <g>
          <path d="M21 25.5 L27.5 28.2 L21.5 30.8" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 25.5 L36.5 28.2 L42.5 30.8" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'wink':
      return (
        <g>
          <circle cx="25" cy="27.5" r="3" fill={ink} />
          <circle cx="26" cy="26.3" r="1.1" fill="#FFFFFF" />
          <circle cx="24" cy="28.6" r="0.6" fill="#FFFFFF" />
          <path d="M35.5 28 Q39 24 42.5 28" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'goofy':
      return (
        <g>
          <circle cx="25" cy="26.5" r="3.4" fill="#FFFFFF" stroke={ink} strokeWidth="1.6" />
          <circle cx="25.7" cy="26.8" r="1.9" fill={ink} />
          <circle cx="26.3" cy="25.8" r="0.7" fill="#FFFFFF" />
          <circle cx="39" cy="28.5" r="2.7" fill="#FFFFFF" stroke={ink} strokeWidth="1.6" />
          <circle cx="38.2" cy="28.2" r="1.5" fill={ink} />
        </g>
      );
    case 'sleep':
      return (
        <g>
          <path d="M21.5 28 Q25 31.2 28.5 28" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M35.5 28 Q39 31.2 42.5 28" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'sad':
    case 'cry':
      return (
        <g>
          <path d="M21 23 Q24.5 21.5 27.5 23.8" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
          <path d="M43 23 Q39.5 21.5 36.5 23.8" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="25" cy="28" r="2.8" fill={ink} />
          <circle cx="26" cy="26.8" r="1.1" fill="#FFFFFF" />
          <circle cx="39" cy="28" r="2.8" fill={ink} />
          <circle cx="40" cy="26.8" r="1.1" fill="#FFFFFF" />
          {variant === 'cry' && (
            <>
              <path d="M22.5 31.5 C24.5 35 24 39 21.8 39 C19.6 39 19.6 35 22.5 31.5 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.1" />
              <path d="M41.5 31.5 C43.5 35 43 39 40.8 39 C38.6 39 38.6 35 41.5 31.5 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.1" />
            </>
          )}
        </g>
      );
    case 'heartEyes':
      return (
        <g>
          <path d="M25 30.5 C25 30.5 21 27.8 21 25.4 C21 24 22.2 23 23.5 23 C24.2 23 24.7 23.5 25 24.1 C25.3 23.5 25.8 23 26.5 23 C27.8 23 29 24 29 25.4 C29 27.8 25 30.5 25 30.5 Z" fill={accent} stroke="#FFFFFF" strokeWidth="0.9" />
          <path d="M39 30.5 C39 30.5 35 27.8 35 25.4 C35 24 36.2 23 37.5 23 C38.2 23 38.7 23.5 39 24.1 C39.3 23.5 39.8 23 40.5 23 C41.8 23 43 24 43 25.4 C43 27.8 39 30.5 39 30.5 Z" fill={accent} stroke="#FFFFFF" strokeWidth="0.9" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="25" cy="27.5" r="2.9" fill={ink} />
          <circle cx="26" cy="26.3" r="1.15" fill="#FFFFFF" />
          <circle cx="24" cy="28.7" r="0.6" fill="#FFFFFF" />
          <circle cx="39" cy="27.5" r="2.9" fill={ink} />
          <circle cx="40" cy="26.3" r="1.15" fill="#FFFFFF" />
          <circle cx="38" cy="28.7" r="0.6" fill="#FFFFFF" />
        </g>
      );
  }
}

// Chibi cartoon mascot head shell with thick white die-cut contour
function renderMascotHead(
  species: MascotSpecies,
  fillUrl: string,
  accent: string,
  ink: string
) {
  const headR = 17.5;
  switch (species) {
    case 'bunny':
      return (
        <g>
          {/* Outer white die-cut silhouette */}
          <ellipse cx="22.5" cy="14" rx="5.5" ry="11.5" transform="rotate(-12 22.5 14)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" />
          <ellipse cx="41.5" cy="14" rx="5.5" ry="11.5" transform="rotate(12 41.5 14)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" />
          <circle cx="32" cy="31" r={headR} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          {/* Colored ears & head */}
          <ellipse cx="22.5" cy="14" rx="5.2" ry="11" transform="rotate(-12 22.5 14)" fill="#FFF1F2" stroke={ink} strokeWidth="2" />
          <ellipse cx="22.5" cy="14.5" rx="2.6" ry="6.8" transform="rotate(-12 22.5 14.5)" fill="#FDA4AF" />
          <ellipse cx="41.5" cy="14" rx="5.2" ry="11" transform="rotate(12 41.5 14)" fill="#FFF1F2" stroke={ink} strokeWidth="2" />
          <ellipse cx="41.5" cy="14.5" rx="2.6" ry="6.8" transform="rotate(12 41.5 14.5)" fill="#FDA4AF" />
          <circle cx="32" cy="31" r={headR} fill={fillUrl} stroke={ink} strokeWidth="2.1" />
        </g>
      );
    case 'kitty':
      return (
        <g>
          <polygon points="15,24 17.5,9.5 27.5,17" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" strokeLinejoin="round" />
          <polygon points="49,24 46.5,9.5 36.5,17" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" strokeLinejoin="round" />
          <circle cx="32" cy="31.5" r={headR} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <polygon points="15,24 17.5,9.5 27.5,17" fill={fillUrl} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="17.5,21.5 19,13.2 24.8,17.5" fill="#FDA4AF" />
          <polygon points="49,24 46.5,9.5 36.5,17" fill={fillUrl} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="46.5,21.5 45,13.2 39.2,17.5" fill="#FDA4AF" />
          <circle cx="32" cy="31.5" r={headR} fill={fillUrl} stroke={ink} strokeWidth="2.1" />
          {/* Tiny whiskers */}
          <line x1="13" y1="30.5" x2="18.5" y2="31.5" stroke={ink} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          <line x1="13" y1="34" x2="18.5" y2="34" stroke={ink} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          <line x1="51" y1="30.5" x2="45.5" y2="31.5" stroke={ink} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          <line x1="51" y1="34" x2="45.5" y2="34" stroke={ink} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case 'bear':
      return (
        <g>
          <circle cx="17.5" cy="17.5" r="6.8" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" />
          <circle cx="46.5" cy="17.5" r="6.8" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" />
          <circle cx="32" cy="31" r={headR} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <circle cx="17.5" cy="17.5" r="6.5" fill={fillUrl} stroke={ink} strokeWidth="2" />
          <circle cx="17.5" cy="17.5" r="3.2" fill={accent} opacity="0.45" />
          <circle cx="46.5" cy="17.5" r="6.5" fill={fillUrl} stroke={ink} strokeWidth="2" />
          <circle cx="46.5" cy="17.5" r="3.2" fill={accent} opacity="0.45" />
          <circle cx="32" cy="31" r={headR} fill={fillUrl} stroke={ink} strokeWidth="2.1" />
          <ellipse cx="32" cy="35" rx="7" ry="5.2" fill="#FFFFFF" opacity="0.75" />
        </g>
      );
    case 'panda':
      return (
        <g>
          <circle cx="17.5" cy="17" r="6.6" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" />
          <circle cx="46.5" cy="17" r="6.6" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" />
          <circle cx="32" cy="31" r={headR} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <circle cx="17.5" cy="17" r="6.3" fill={ink} />
          <circle cx="46.5" cy="17" r="6.3" fill={ink} />
          <circle cx="32" cy="31" r={headR} fill="#FFFFFF" stroke={ink} strokeWidth="2.1" />
          <ellipse cx="24.5" cy="27.5" rx="5.2" ry="4.4" transform="rotate(-18 24.5 27.5)" fill={ink} opacity="0.18" />
          <ellipse cx="39.5" cy="27.5" rx="5.2" ry="4.4" transform="rotate(18 39.5 27.5)" fill={ink} opacity="0.18" />
        </g>
      );
    case 'chibi':
    default:
      return (
        <g>
          <circle cx="32" cy="30.5" r={headR + 0.5} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M29 13 Q32 7 35 12.5" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="30.5" r={headR + 0.5} fill={fillUrl} stroke={ink} strokeWidth="2.1" />
          <path d="M29.5 13 Q32 7.5 35.5 12.5" fill="none" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
        </g>
      );
  }
}

function renderMotifArtwork(
  motif: StickerMotif,
  sticker: CustomStickerItem,
  uid: string
): React.ReactNode {
  const hasCaption = Boolean(sticker.caption);
  const yShift = hasCaption ? -5 : 0;
  const motifGrad = `url(#${uid}_mg)`;
  const goldGrad = `url(#${uid}_gg)`;
  const pastelGrad = `url(#${uid}_bg)`;
  const ink = '#1E293B';
  const mascot = getMascotForSticker(sticker.id);

  switch (motif) {
    case 'heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {/* Cute heart buddy with kawaii face & die-cut white outline */}
          <path
            d="M32 51 C32 51 11 36.5 11 22 C11 14.5 17 9.5 23.8 9.5 C27.8 9.5 30.8 12 32 15.2 C33.2 12 36.2 9.5 40.2 9.5 C47 9.5 53 14.5 53 22 C53 36.5 32 51 32 51 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="5.2"
            strokeLinejoin="round"
          />
          <path
            d="M32 51 C32 51 11 36.5 11 22 C11 14.5 17 9.5 23.8 9.5 C27.8 9.5 30.8 12 32 15.2 C33.2 12 36.2 9.5 40.2 9.5 C47 9.5 53 14.5 53 22 C53 36.5 32 51 32 51 Z"
            fill={motifGrad}
            stroke={ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M17 19 Q20.5 13.5 26 15" fill="none" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" opacity="0.82" />
          <circle cx="25.5" cy="27" r="2.3" fill="#FFFFFF" />
          <circle cx="25.5" cy="27" r="1.4" fill={ink} />
          <circle cx="38.5" cy="27" r="2.3" fill="#FFFFFF" />
          <circle cx="38.5" cy="27" r="1.4" fill={ink} />
          <ellipse cx="21" cy="30.5" rx="2.7" ry="1.6" fill="#FDA4AF" opacity="0.85" />
          <ellipse cx="43" cy="30.5" rx="2.7" ry="1.6" fill="#FDA4AF" opacity="0.85" />
          <path d="M29 31.5 Q32 35 35 31.5" fill="none" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
        </g>
      );
    case 'double_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M23 43 C23 43 9 33.5 9 23 C9 17.8 13.2 13.8 18.2 13.8 C21 13.8 22.8 16 23 18 C23.2 16 25 13.8 27.8 13.8 C32.8 13.8 37 17.8 37 23 C37 33.5 23 43 23 43 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="4.8"
            strokeLinejoin="round"
          />
          <path
            d="M41 47 C41 47 25 36.5 25 25.5 C25 20.2 29.5 16 34.8 16 C37.8 16 40 18.4 41 20.8 C42 18.4 44.2 16 47.2 16 C52.5 16 57 20.2 57 25.5 C57 36.5 41 47 41 47 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="4.8"
            strokeLinejoin="round"
          />
          <path
            d="M23 43 C23 43 9 33.5 9 23 C9 17.8 13.2 13.8 18.2 13.8 C21 13.8 22.8 16 23 18 C23.2 16 25 13.8 27.8 13.8 C32.8 13.8 37 17.8 37 23 C37 33.5 23 43 23 43 Z"
            fill={sticker.bg}
            stroke={ink}
            strokeWidth="1.9"
          />
          <path
            d="M41 47 C41 47 25 36.5 25 25.5 C25 20.2 29.5 16 34.8 16 C37.8 16 40 18.4 41 20.8 C42 18.4 44.2 16 47.2 16 C52.5 16 57 20.2 57 25.5 C57 36.5 41 47 41 47 Z"
            fill={motifGrad}
            stroke={ink}
            strokeWidth="2"
          />
          <circle cx="37" cy="28" r="1.6" fill="#FFFFFF" />
          <circle cx="45" cy="28" r="1.6" fill="#FFFFFF" />
          <path d="M38.5 32 Q41 34.5 43.5 32" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    case 'heart_wings':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M21 25 C11 16 5 20.5 8 29 C10 34.5 16 35 21.5 32.5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M43 25 C53 16 59 20.5 56 29 C54 34.5 48 35 42.5 32.5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M32 47 C32 47 17 36.5 17 25.5 C17 20 21.2 16 26.2 16 C29.2 16 31.2 18.2 32 20.8 C32.8 18.2 34.8 16 37.8 16 C42.8 16 47 20 47 25.5 C47 36.5 32 47 32 47 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M21 25 C11 16 5 20.5 8 29 C10 34.5 16 35 21.5 32.5" fill="#F8FAFC" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <path d="M43 25 C53 16 59 20.5 56 29 C54 34.5 48 35 42.5 32.5" fill="#F8FAFC" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <path d="M32 47 C32 47 17 36.5 17 25.5 C17 20 21.2 16 26.2 16 C29.2 16 31.2 18.2 32 20.8 C32.8 18.2 34.8 16 37.8 16 C42.8 16 47 20 47 25.5 C47 36.5 32 47 32 47 Z" fill={motifGrad} stroke={ink} strokeWidth="2" />
          <path d="M23 22 Q25.5 19 28 20" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M28.5 31.5 Q32 34.5 35.5 31.5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'love_letter':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="11" y="16" width="42" height="30" rx="7" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" />
          <rect x="11" y="16" width="42" height="30" rx="7" fill="#FFFDF9" stroke={ink} strokeWidth="2.1" />
          <path d="M12.5 18 L32 33.5 L51.5 18" fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <path d="M32 41 C32 41 25 36 25 31.8 C25 29.4 27 27.6 29.2 27.6 C30.5 27.6 31.5 28.4 32 29.5 C32.5 28.4 33.5 27.6 34.8 27.6 C37 27.6 39 29.4 39 31.8 C39 36 32 41 32 41 Z" fill={motifGrad} stroke="#FFFFFF" strokeWidth="1.5" />
        </g>
      );
    case 'rose':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <line x1="32" y1="31" x2="32" y2="52" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
          <circle cx="32" cy="21" r="12.5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" />
          <line x1="32" y1="31" x2="32" y2="52" stroke="#16A34A" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M32 42 Q43 37 44.5 43.5 Q38.5 47 32 42" fill="#4ADE80" stroke={ink} strokeWidth="1.6" />
          <path d="M32 37.5 Q22 34 20.5 39.5 Q26.5 42.5 32 37.5" fill="#22C55E" stroke={ink} strokeWidth="1.6" />
          <circle cx="32" cy="21" r="12" fill={motifGrad} stroke={ink} strokeWidth="2" />
          <path d="M24.5 20.5 Q32 13 39.5 20.5 Q32 28 24.5 20.5" fill="none" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="32" cy="21" r="2.6" fill="#FFFFFF" opacity="0.88" />
        </g>
      );
    case 'wilted_rose':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M32 51 Q32 34 40 26" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="42.5" cy="26" rx="8.5" ry="6.5" transform="rotate(28 42.5 26)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M32 51 Q32 34 40 26" fill="none" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="42.5" cy="26" rx="8" ry="6" transform="rotate(28 42.5 26)" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <path d="M27.5 43 C30 47 29.2 50 27 50 C24.8 50 24.8 47 27.5 43 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.2" />
        </g>
      );
    case 'ring':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="37" r="13" fill="none" stroke="#FFFFFF" strokeWidth="7.5" />
          <polygon points="32,11 41,19 32,27 23,19" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" strokeLinejoin="round" />
          <circle cx="32" cy="37" r="12.5" fill="none" stroke={goldGrad} strokeWidth="4.2" />
          <polygon points="32,11 41,19 32,27 23,19" fill="#BAE6FD" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <polyline points="23.5,19 40.5,19" stroke="#FFFFFF" strokeWidth="1.8" />
        </g>
      );
    case 'infinity':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M21 34 C13 34 9.5 27.5 14 21.5 C18.5 15.5 25.5 20 32 29 C38.5 38 45.5 42.5 50 36.5 C54.5 30.5 51 24 43 24 C36.5 24 34 26.5 32 29 C30 31.5 27.5 34 21 34 Z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="9.5"
            strokeLinecap="round"
          />
          <path
            d="M21 34 C13 34 9.5 27.5 14 21.5 C18.5 15.5 25.5 20 32 29 C38.5 38 45.5 42.5 50 36.5 C54.5 30.5 51 24 43 24 C36.5 24 34 26.5 32 29 C30 31.5 27.5 34 21 34 Z"
            fill="none"
            stroke={motifGrad}
            strokeWidth="4.8"
            strokeLinecap="round"
          />
          <circle cx="32" cy="29" r="3.6" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" />
        </g>
      );
    case 'butterfly':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <ellipse cx="20.5" cy="23.5" rx="10.5" ry="8.5" transform="rotate(-24 20.5 23.5)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.2" />
          <ellipse cx="43.5" cy="23.5" rx="10.5" ry="8.5" transform="rotate(24 43.5 23.5)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.2" />
          <ellipse cx="23" cy="36.5" rx="7.5" ry="5.8" transform="rotate(20 23 36.5)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.2" />
          <ellipse cx="41" cy="36.5" rx="7.5" ry="5.8" transform="rotate(-20 41 36.5)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.2" />
          <ellipse cx="20.5" cy="23.5" rx="10" ry="8" transform="rotate(-24 20.5 23.5)" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <ellipse cx="43.5" cy="23.5" rx="10" ry="8" transform="rotate(24 43.5 23.5)" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <ellipse cx="23" cy="36.5" rx="7.2" ry="5.5" transform="rotate(20 23 36.5)" fill={sticker.accent} opacity="0.88" stroke={ink} strokeWidth="1.6" />
          <ellipse cx="41" cy="36.5" rx="7.2" ry="5.5" transform="rotate(-20 41 36.5)" fill={sticker.accent} opacity="0.88" stroke={ink} strokeWidth="1.6" />
          <circle cx="19" cy="23" r="2.2" fill="#FFFFFF" opacity="0.85" />
          <circle cx="45" cy="23" r="2.2" fill="#FFFFFF" opacity="0.85" />
          <line x1="32" y1="18" x2="32" y2="42" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
        </g>
      );
    case 'moon_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M36 12 A17 17 0 1 0 47 43 A13.5 13.5 0 1 1 36 12 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M36 12 A17 17 0 1 0 47 43 A13.5 13.5 0 1 1 36 12 Z" fill={goldGrad} stroke={ink} strokeWidth="1.9" />
          <path d="M41.5 32.5 C41.5 32.5 33.5 27.2 33.5 22.6 C33.5 20 35.6 18 38.2 18 C39.8 18 40.9 19 41.5 20.2 C42.1 19 43.2 18 44.8 18 C47.4 18 49.5 20 49.5 22.6 C49.5 27.2 41.5 32.5 41.5 32.5 Z" fill={motifGrad} stroke="#FFFFFF" strokeWidth="1.8" />
        </g>
      );
    case 'candle_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="22" y="25" width="20" height="24" rx="5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" />
          <path d="M32 9 C37 15.5 38 20 32 24 C26 20 27 15.5 32 9 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <rect x="22" y="25" width="20" height="24" rx="5" fill="#FFFDF9" stroke={ink} strokeWidth="2.1" />
          <path d="M32 9 C37 15.5 38 20 32 24 C26 20 27 15.5 32 9 Z" fill="#FB923C" stroke={ink} strokeWidth="1.6" />
          <circle cx="32" cy="36.5" r="4" fill={motifGrad} />
        </g>
      );
    case 'lock_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M22.5 27 V20 A9.5 9.5 0 0 1 41.5 20 V27" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
          <rect x="17.5" y="25" width="29" height="22" rx="6.5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" />
          <path d="M22.5 27 V20 A9.5 9.5 0 0 1 41.5 20 V27" fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
          <rect x="17.5" y="25" width="29" height="22" rx="6.5" fill={pastelGrad} stroke={ink} strokeWidth="2.1" />
          <path d="M32 41 C32 41 26.5 37 26.5 33.4 C26.5 31.4 28.2 30 30 30 C31 30 31.7 30.6 32 31.5 C32.3 30.6 33 30 34 30 C35.8 30 37.5 31.4 37.5 33.4 C37.5 37 32 41 32 41 Z" fill={motifGrad} stroke="#FFFFFF" strokeWidth="1.2" />
        </g>
      );
    case 'ribbon_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M13 28 L25 19 L32 28 L39 19 L51 28 L42 38 L32 30 L22 38 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" strokeLinejoin="round" />
          <path d="M26 32 L20 48 L29 42 Z M38 32 L44 48 L35 42 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.2" strokeLinejoin="round" />
          <path d="M26 32 L20 48 L29 42 Z M38 32 L44 48 L35 42 Z" fill={sticker.text} opacity="0.88" stroke={ink} strokeWidth="1.6" />
          <path d="M13 28 L25 19 L32 28 L39 19 L51 28 L42 38 L32 30 L22 38 Z" fill={motifGrad} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="29" r="4.2" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" />
        </g>
      );
    case 'kiss_mark':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M14 30 Q23 19 32 25 Q41 19 50 30 Q41 35 32 32 Q23 35 14 30 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M15 32 Q32 46 49 32 Q32 38 15 32 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M14 30 Q23 19 32 25 Q41 19 50 30 Q41 35 32 32 Q23 35 14 30 Z" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <path d="M15 32 Q32 46 49 32 Q32 38 15 32 Z" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <path d="M25 36 Q32 39 39 36" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    case 'broken_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M32 49 C32 49 12.5 36 12.5 22.5 C12.5 16 17.8 11.5 23.5 11.5 C27.2 11.5 30.2 14 32 17.5 C33.8 14 36.8 11.5 40.5 11.5 C46.2 11.5 51.5 16 51.5 22.5 C51.5 36 32 49 32 49 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="5"
          />
          <path
            d="M32 49 C32 49 12.5 36 12.5 22.5 C12.5 16 17.8 11.5 23.5 11.5 C27.2 11.5 30.2 14 32 17.5 C33.8 14 36.8 11.5 40.5 11.5 C46.2 11.5 51.5 16 51.5 22.5 C51.5 36 32 49 32 49 Z"
            fill={motifGrad}
            stroke={ink}
            strokeWidth="2"
          />
          <polyline points="32,16 28,25 36,31 30.5,46" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'bandage_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M32 49 C32 49 12.5 36 12.5 22.5 C12.5 16 17.8 11.5 23.5 11.5 C27.2 11.5 30.2 14 32 17.5 C33.8 14 36.8 11.5 40.5 11.5 C46.2 11.5 51.5 16 51.5 22.5 C51.5 36 32 49 32 49 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="5"
          />
          <path
            d="M32 49 C32 49 12.5 36 12.5 22.5 C12.5 16 17.8 11.5 23.5 11.5 C27.2 11.5 30.2 14 32 17.5 C33.8 14 36.8 11.5 40.5 11.5 C46.2 11.5 51.5 16 51.5 22.5 C51.5 36 32 49 32 49 Z"
            fill={motifGrad}
            stroke={ink}
            strokeWidth="2"
          />
          <rect x="21" y="25" width="22" height="8" rx="4" transform="rotate(-18 32 29)" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" />
        </g>
      );
    case 'cloud_rain':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M18 35 H46.5 A7.5 7.5 0 0 0 46.5 20 A10 10 0 0 0 26.5 17 A8.2 8.2 0 0 0 18 35 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M18 35 H46.5 A7.5 7.5 0 0 0 46.5 20 A10 10 0 0 0 26.5 17 A8.2 8.2 0 0 0 18 35 Z" fill="#F1F5F9" stroke={ink} strokeWidth="2.1" />
          <circle cx="27.5" cy="26.5" r="1.8" fill={ink} />
          <circle cx="36.5" cy="26.5" r="1.8" fill={ink} />
          <path d="M29.5 31 Q32 29 34.5 31" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="23.5" y1="39.5" x2="21" y2="47" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="32" y1="39.5" x2="29.5" y2="48" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="40.5" y1="39.5" x2="38" y2="47" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />
        </g>
      );
    case 'umbrella':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M13 31 A19 17 0 0 1 51 31 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M13 31 A19 17 0 0 1 51 31 Z" fill={motifGrad} stroke={ink} strokeWidth="2.1" />
          <path d="M32 31 V46 A3.5 3.5 0 0 1 25 46" fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" />
        </g>
      );
    case 'face_happy':
    case 'face_blush':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, motif === 'face_blush' ? '#FCE7F3' : '#FEF08A', sticker.accent, ink)}
          {renderCartoonEyes(motif === 'face_blush' ? 'blush' : 'happy', ink, sticker.accent)}
          <ellipse cx="19.5" cy="33" rx="3.4" ry="2" fill="#FB7185" opacity={motif === 'face_blush' ? 0.78 : 0.45} />
          <ellipse cx="44.5" cy="33" rx="3.4" ry="2" fill="#FB7185" opacity={motif === 'face_blush' ? 0.78 : 0.45} />
          <path d="M26 35.5 Q32 42 38 35.5" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'face_wink':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, '#FEF08A', sticker.accent, ink)}
          {renderCartoonEyes('wink', ink, sticker.accent)}
          <ellipse cx="19.5" cy="33" rx="3.1" ry="1.8" fill="#FB7185" opacity="0.58" />
          <path d="M26 35.5 Q32 41.5 38 35" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'face_laugh':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, '#FDE047', sticker.accent, ink)}
          {renderCartoonEyes('laugh', ink, sticker.accent)}
          <ellipse cx="19" cy="33" rx="3" ry="1.8" fill="#FB7185" opacity="0.52" />
          <ellipse cx="45" cy="33" rx="3" ry="1.8" fill="#FB7185" opacity="0.52" />
          <path d="M23.5 34 Q32 44.5 40.5 34 Z" fill="#FB7185" stroke={ink} strokeWidth="1.9" />
          <path d="M25.5 34.8 H38.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'face_goofy':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, '#FEF08A', sticker.accent, ink)}
          {renderCartoonEyes('goofy', ink, sticker.accent)}
          <path d="M24 35.5 Q32 40 40 34.5" fill="none" stroke={ink} strokeWidth="2.3" strokeLinecap="round" />
          <path d="M30 37.5 V43 A3 3 0 0 0 36 43 V36.8" fill="#F43F5E" stroke={ink} strokeWidth="1.5" />
        </g>
      );
    case 'face_shock':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, '#FEF08A', sticker.accent, ink)}
          {renderCartoonEyes('shock', ink, sticker.accent)}
          <ellipse cx="32" cy="38" rx="4.2" ry="5.2" fill="#FB7185" stroke={ink} strokeWidth="1.8" />
        </g>
      );
    case 'face_cool':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, '#FEF08A', sticker.accent, ink)}
          {renderCartoonEyes('cool', ink, sticker.accent)}
          <path d="M26.5 36.5 Q32 40.5 37.5 35.5" fill="none" stroke={ink} strokeWidth="2.3" strokeLinecap="round" />
        </g>
      );
    case 'face_sleep':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, '#E0E7FF', sticker.accent, ink)}
          {renderCartoonEyes('sleep', ink, sticker.accent)}
          <circle cx="32" cy="37" r="2.8" fill="#FB7185" stroke={ink} strokeWidth="1.4" />
        </g>
      );
    case 'face_sad':
    case 'face_cry':
      return (
        <g transform={`translate(0 ${yShift})`}>
          {renderMascotHead(mascot, '#E2E8F0', sticker.accent, ink)}
          {renderCartoonEyes(motif === 'face_cry' ? 'cry' : 'sad', ink, sticker.accent)}
          <path d="M25.5 39 Q32 33.5 38.5 39" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'star':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M32 10 L38 23.5 L53 25 L41.5 35 L45 49.5 L32 41.5 L19 49.5 L22.5 35 L11 25 L26 23.5 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M32 10 L38 23.5 L53 25 L41.5 35 L45 49.5 L32 41.5 L19 49.5 L22.5 35 L11 25 L26 23.5 Z"
            fill={goldGrad}
            stroke={ink}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="29" r="1.9" fill={ink} />
          <circle cx="36" cy="29" r="1.9" fill={ink} />
          <path d="M29.5 33 Q32 35.5 34.5 33" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    case 'sparkle_burst':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M32 9 L36.5 25 L52 30 L36.5 35 L32 51 L27.5 35 L12 30 L27.5 25 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" strokeLinejoin="round" />
          <path d="M32 9 L36.5 25 L52 30 L36.5 35 L32 51 L27.5 35 L12 30 L27.5 25 Z" fill={motifGrad} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <path d="M47 13 L48.3 16 L51.3 17.3 L48.3 18.6 L47 21.6 L45.7 18.6 L42.7 17.3 L45.7 16 Z" fill={goldGrad} />
          <path d="M17 40 L18.2 42.5 L20.7 43.7 L18.2 44.9 L17 47.4 L15.8 44.9 L13.3 43.7 L15.8 42.5 Z" fill={goldGrad} />
        </g>
      );
    case 'crown':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M13 40 L17 19 L27 28 L32 13 L37 28 L47 19 L51 40 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
          <rect x="14" y="42" width="36" height="6.5" rx="3" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.5" />
          <path d="M13 40 L17 19 L27 28 L32 13 L37 28 L47 19 L51 40 Z" fill={goldGrad} stroke={ink} strokeWidth="2.1" strokeLinejoin="round" />
          <rect x="14" y="42" width="36" height="6.5" rx="3" fill={motifGrad} stroke={ink} strokeWidth="1.9" />
          <circle cx="32" cy="13" r="2.7" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="1.1" />
          <circle cx="17.5" cy="19" r="2.2" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="46.5" cy="19" r="2.2" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
        </g>
      );
    case 'fire':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M33.5 9.5 C41 18.5 49 24.5 49 35.5 C49 44.5 41.8 50.5 32 50.5 C22.2 50.5 15 44.5 15 35.5 C15 28 20.5 22.5 24 20 C24 24.5 26.5 26.5 28.5 26.5 C26.5 20 29 14 33.5 9.5 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="5"
          />
          <path
            d="M33.5 9.5 C41 18.5 49 24.5 49 35.5 C49 44.5 41.8 50.5 32 50.5 C22.2 50.5 15 44.5 15 35.5 C15 28 20.5 22.5 24 20 C24 24.5 26.5 26.5 28.5 26.5 C26.5 20 29 14 33.5 9.5 Z"
            fill={motifGrad}
            stroke={ink}
            strokeWidth="2"
          />
          <path d="M32 29 C35.8 34 37.5 38.5 36.2 42.5 C35 45.5 29.5 45.5 28 42.5 C26.5 39 29 33.5 32 29 Z" fill="#FDE047" />
        </g>
      );
    case 'tea_cup':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M16 25 H44 V37 C44 43.5 38.2 48 30 48 C21.8 48 16 43.5 16 37 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M44 27.5 H48 C50.5 27.5 52 29.5 52 32.5 C52 35.5 49.5 37.5 46 37.5 H44" fill="none" stroke="#FFFFFF" strokeWidth="5.5" />
          <path d="M16 25 H44 V37 C44 43.5 38.2 48 30 48 C21.8 48 16 43.5 16 37 Z" fill="#FFFDF9" stroke={ink} strokeWidth="2.1" />
          <path d="M44 27.5 H48 C50.5 27.5 52 29.5 52 32.5 C52 35.5 49.5 37.5 46 37.5 H44" fill="none" stroke={ink} strokeWidth="2.4" />
          <path d="M23 19 Q25.5 14 23 10.5 M30 19 Q32.5 14 30 10.5 M37 19 Q39.5 14 37 10.5" fill="none" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" opacity="0.88" />
          <circle cx="25.5" cy="34.5" r="1.7" fill={ink} />
          <circle cx="34.5" cy="34.5" r="1.7" fill={ink} />
          <path d="M28 38.5 Q30 40.5 32 38.5" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
        </g>
      );
    case 'music':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M25 40 V17 L46 12 V35" fill="none" stroke="#FFFFFF" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20.5" cy="41.5" r="6" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="41.5" cy="36.5" r="6" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M25 40 V17 L46 12 V35" fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20.5" cy="41.5" r="5.6" fill={motifGrad} stroke={ink} strokeWidth="1.9" />
          <circle cx="41.5" cy="36.5" r="5.6" fill={motifGrad} stroke={ink} strokeWidth="1.9" />
        </g>
      );
    case 'rocket':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M32 9.5 C41.5 18.5 43.5 30 40 41 H24 C20.5 30 22.5 18.5 32 9.5 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M24 36 L16.5 43.5 L24 41.8 Z M40 36 L47.5 43.5 L40 41.8 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M32 9.5 C41.5 18.5 43.5 30 40 41 H24 C20.5 30 22.5 18.5 32 9.5 Z" fill="#F8FAFC" stroke={ink} strokeWidth="2.1" />
          <circle cx="32" cy="25" r="4.6" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <path d="M24 36 L16.5 43.5 L24 41.8 Z M40 36 L47.5 43.5 L40 41.8 Z" fill={motifGrad} stroke={ink} strokeWidth="1.5" />
          <path d="M28 42.5 L32 52 L36 42.5 Z" fill="#FB923C" stroke="#FDE047" strokeWidth="1.2" />
        </g>
      );
    case 'lightning':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <polygon points="36.5,10 18.5,33 30.5,33 26.5,51 45.5,27 33.5,27" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
          <polygon points="36.5,10 18.5,33 30.5,33 26.5,51 45.5,27 33.5,27" fill={goldGrad} stroke={ink} strokeWidth="2.1" strokeLinejoin="round" />
        </g>
      );
    case 'ghost_boo':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M17.5 47 V27 A14.5 14.5 0 0 1 46.5 27 V47 L40.5 42.5 L34.8 47 L29.2 42.5 L23.5 47 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M17.5 47 V27 A14.5 14.5 0 0 1 46.5 27 V47 L40.5 42.5 L34.8 47 L29.2 42.5 L23.5 47 Z"
            fill="#F8FAFC"
            stroke={ink}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <circle cx="27" cy="26.5" r="2.6" fill={ink} />
          <circle cx="37" cy="26.5" r="2.6" fill={ink} />
          <circle cx="27.8" cy="25.5" r="0.9" fill="#FFFFFF" />
          <circle cx="37.8" cy="25.5" r="0.9" fill="#FFFFFF" />
          <ellipse cx="22.5" cy="30.5" rx="2.5" ry="1.5" fill="#FB7185" opacity="0.6" />
          <ellipse cx="41.5" cy="30.5" rx="2.5" ry="1.5" fill="#FB7185" opacity="0.6" />
          <ellipse cx="32" cy="33.5" rx="3.2" ry="2.8" fill="#FB7185" stroke={ink} strokeWidth="1.4" />
        </g>
      );
    case 'trophy':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M20 15 H44 V27 A12 12 0 0 1 20 27 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <rect x="22" y="43.5" width="20" height="5" rx="2.2" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.2" />
          <path d="M20 15 H44 V27 A12 12 0 0 1 20 27 Z" fill={goldGrad} stroke={ink} strokeWidth="2.1" />
          <path d="M20 18.5 H14.5 C14.5 25.5 17 28.5 20 28.5 M44 18.5 H49.5 C49.5 25.5 47 28.5 44 28.5" fill="none" stroke={ink} strokeWidth="2.3" />
          <line x1="32" y1="39" x2="32" y2="43.5" stroke={ink} strokeWidth="3.2" />
          <rect x="22" y="43.5" width="20" height="5" rx="2.2" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
        </g>
      );
    case 'diamond':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <polygon points="21,15 43,15 52,26.5 32,49 12,26.5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
          <polygon points="21,15 43,15 52,26.5 32,49 12,26.5" fill="#BAE6FD" stroke={ink} strokeWidth="2.1" strokeLinejoin="round" />
          <polyline points="12,26.5 52,26.5" stroke={ink} strokeWidth="1.8" />
          <polyline points="21,15 32,26.5 43,15" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <polygon points="26.5,26.5 37.5,26.5 32,47.5" fill={sticker.accent} opacity="0.24" />
        </g>
      );
    case 'flower':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="17.5" r="6.8" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="43" cy="26" r="6.8" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="39" cy="38.5" r="6.8" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="25" cy="38.5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" r="6.8" />
          <circle cx="21" cy="26" r="6.8" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="32" cy="17.5" r="6.4" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <circle cx="43" cy="26" r="6.4" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <circle cx="39" cy="38.5" r="6.4" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <circle cx="25" cy="38.5" r="6.4" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <circle cx="21" cy="26" r="6.4" fill={motifGrad} stroke={ink} strokeWidth="1.8" />
          <circle cx="32" cy="29" r="6.6" fill={goldGrad} stroke={ink} strokeWidth="1.9" />
          <circle cx="29.8" cy="28" r="1.2" fill={ink} />
          <circle cx="34.2" cy="28" r="1.2" fill={ink} />
          <path d="M30 30.8 Q32 32.5 34 30.8" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case 'sun':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="29" r="12" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <circle cx="32" cy="29" r="11.5" fill={goldGrad} stroke={ink} strokeWidth="2.1" />
          <line x1="32" y1="10.5" x2="32" y2="14.5" stroke={sticker.accent} strokeWidth="2.8" strokeLinecap="round" />
          <line x1="32" y1="43.5" x2="32" y2="47.5" stroke={sticker.accent} strokeWidth="2.8" strokeLinecap="round" />
          <line x1="13.5" y1="29" x2="17.5" y2="29" stroke={sticker.accent} strokeWidth="2.8" strokeLinecap="round" />
          <line x1="46.5" y1="29" x2="50.5" y2="29" stroke={sticker.accent} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="28" cy="28" r="1.7" fill={ink} />
          <circle cx="36" cy="28" r="1.7" fill={ink} />
          <path d="M28.5 32 Q32 35 35.5 32" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    case 'moon_crescent':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M37 12 A16.5 16.5 0 1 0 49 42 A13 13 0 1 1 37 12 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M37 12 A16.5 16.5 0 1 0 49 42 A13 13 0 1 1 37 12 Z" fill={goldGrad} stroke={ink} strokeWidth="2" />
          <path d="M44.5 18 L45.8 21.2 L49 22.5 L45.8 23.8 L44.5 27 L43.2 23.8 L40 22.5 L43.2 21.2 Z" fill="#FDE047" stroke="#FFFFFF" strokeWidth="0.9" />
        </g>
      );
    case 'gift':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="17" y="23" width="30" height="23" rx="5" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <rect x="17" y="23" width="30" height="23" rx="5" fill="#FFFDF9" stroke={ink} strokeWidth="2.1" />
          <line x1="32" y1="23" x2="32" y2="46" stroke={motifGrad} strokeWidth="3.8" />
          <line x1="17" y1="32.5" x2="47" y2="32.5" stroke={motifGrad} strokeWidth="3.8" />
          <path d="M32 23 C25 14.5 18.5 18 23 23 M32 23 C39 14.5 45.5 18 41 23" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'speech':
    default:
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="11" y="16" width="42" height="27" rx="13" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M23 42 L17.5 50.5 L31 43" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4.8" strokeLinejoin="round" />
          <rect x="11" y="16" width="42" height="27" rx="13" fill={pastelGrad} stroke={ink} strokeWidth="2.1" />
          <path d="M23 42 L17.5 50.5 L31 43" fill={pastelGrad} stroke={ink} strokeWidth="2.1" strokeLinejoin="round" />
          <circle cx="24" cy="29.5" r="2.5" fill={motifGrad} />
          <circle cx="32" cy="29.5" r="2.5" fill={motifGrad} />
          <circle cx="40" cy="29.5" r="2.5" fill={motifGrad} />
        </g>
      );
  }
}

export const StickerIllustration: React.FC<{
  sticker: CustomStickerItem;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}> = ({ sticker, size = 'md', animated = true }) => {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const dim = size === 'sm' ? 'w-11 h-11' : size === 'lg' ? 'w-28 h-28 sm:w-32 sm:h-32' : 'w-14 h-14';
  const motif = sticker.motif || 'speech';
  const animClass = animated ? getLiveAnimationClass(sticker.category, motif) : '';

  const renderDecor = () => {
    const twinkleCls = animated ? 'sticker-twinkle' : '';
    if (sticker.decor === 'sparkles' || sticker.decor === 'hearts') {
      return (
        <g fill={sticker.accent}>
          <path className={twinkleCls} d="M10 9.5 L11.2 12.2 L14 13.4 L11.2 14.6 L10 17.3 L8.8 14.6 L6 13.4 L8.8 12.2 Z" opacity="0.9" />
          <path className={twinkleCls} style={{ animationDelay: '0.55s' }} d="M54 10.5 L55.1 13 L57.6 14.1 L55.1 15.2 L54 17.7 L52.9 15.2 L50.4 14.1 L52.9 13 Z" opacity="0.85" />
        </g>
      );
    }
    if (sticker.decor === 'dots') {
      return (
        <g fill={sticker.accent} opacity="0.6">
          <circle className={twinkleCls} cx="10" cy="14" r="2" />
          <circle className={twinkleCls} style={{ animationDelay: '0.5s' }} cx="54" cy="16" r="2" />
        </g>
      );
    }
    return null;
  };

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${dim} select-none overflow-visible drop-shadow-[0_4px_10px_rgba(0,0,0,0.22)]`}
      role="img"
      aria-label={sticker.label}
    >
      <defs>
        <linearGradient id={`${uid}_bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor={sticker.bg} />
          <stop offset="100%" stopColor={sticker.accent} stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id={`${uid}_mg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={sticker.accent} />
          <stop offset="100%" stopColor={sticker.text} />
        </linearGradient>
        <linearGradient id={`${uid}_gg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {renderDecor()}
      <g className={animClass}>
        {renderMotifArtwork(motif, sticker, uid)}
      </g>
      {sticker.caption && (
        <g>
          <rect
            x="7"
            y="45.5"
            width="50"
            height="14.5"
            rx="7.25"
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth="1.7"
          />
          <rect
            x="9"
            y="47.2"
            width="46"
            height="11.1"
            rx="5.5"
            fill={sticker.bg}
          />
          <text
            x="32"
            y="55.3"
            textAnchor="middle"
            fill={sticker.text}
            fontSize={
              sticker.caption.length > 8
                ? '6.8'
                : sticker.caption.length > 6
                ? '7.6'
                : sticker.caption.length > 4
                ? '8.6'
                : '9.4'
            }
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.35"
          >
            {sticker.caption}
          </text>
        </g>
      )}
    </svg>
  );
};

