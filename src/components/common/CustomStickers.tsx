import React from 'react';

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
  const sticker = parseStickerToken(text);
  if (sticker) {
    return `Sticker · ${sticker.label}`;
  }
  return text;
}

function renderMotifArtwork(motif: StickerMotif, sticker: CustomStickerItem): React.ReactNode {
  const hasCaption = Boolean(sticker.caption);
  const yShift = hasCaption ? -5 : 0;

  switch (motif) {
    case 'heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M32 45 C32 45 16 34 16 23 C16 18 20 14 25 14 C28.5 14 31 16.5 32 19 C33 16.5 35.5 14 39 14 C44 14 48 18 48 23 C48 34 32 45 32 45 Z"
            fill={sticker.accent}
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M22 20 Q24 17 27 18" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        </g>
      );
    case 'double_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M25 40 C25 40 13 32 13 24 C13 20 16 17 20 17 C22.5 17 24.5 19 25 20.5 C25.5 19 27.5 17 30 17 C34 17 37 20 37 24 C37 32 25 40 25 40 Z"
            fill={sticker.accent}
            opacity="0.8"
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
          <path
            d="M38 43 C38 43 26 35 26 27 C26 23 29 20 33 20 C35.5 20 37.5 22 38 23.5 C38.5 22 40.5 20 43 20 C47 20 50 23 50 27 C50 35 38 43 38 43 Z"
            fill={sticker.accent}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </g>
      );
    case 'heart_wings':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M21 26 C14 21 10 23 12 29 C14 32 18 33 22 31" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M43 26 C50 21 54 23 52 29 C50 32 46 33 42 31" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2" strokeLinejoin="round" />
          <path
            d="M32 42 C32 42 20 34 20 26 C20 22 23 19 27 19 C29.5 19 31 20.8 32 22.5 C33 20.8 34.5 19 37 19 C41 19 44 22 44 26 C44 34 32 42 32 42 Z"
            fill={sticker.accent}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </g>
      );
    case 'love_letter':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="15" y="20" width="34" height="23" rx="4" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" />
          <path d="M16 21 L32 33 L48 21" fill="none" stroke={sticker.accent} strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M32 37 C32 37 27 33.5 27 30.5 C27 28.8 28.5 27.5 30 27.5 C31 27.5 31.7 28.2 32 29 C32.3 28.2 33 27.5 34 27.5 C35.5 27.5 37 28.8 37 30.5 C37 33.5 32 37 32 37 Z" fill={sticker.accent} />
        </g>
      );
    case 'rose':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <line x1="32" y1="31" x2="32" y2="47" stroke="#16A34A" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M32 40 Q40 37 41 42 Q36 44 32 40" fill="#22C55E" />
          <circle cx="32" cy="23" r="9" fill={sticker.accent} stroke="#FFFFFF" strokeWidth="1.8" />
          <path d="M27.5 22.5 Q32 17.5 36.5 22.5 Q32 27.5 27.5 22.5" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
        </g>
      );
    case 'wilted_rose':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M32 47 Q32 33 38 27" fill="none" stroke="#64748B" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="40" cy="27" rx="6" ry="5" transform="rotate(28 40 27)" fill={sticker.accent} opacity="0.85" />
          <path d="M30 43 C32 46 31 48 29.5 48 C28 48 28 46 30 43 Z" fill="#60A5FA" />
        </g>
      );
    case 'ring':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="34" r="10.5" fill="none" stroke="#F59E0B" strokeWidth="3.2" />
          <polygon points="32,16 37,21 32,26 27,21" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2" />
        </g>
      );
    case 'infinity':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M23 30 C17 30 14 25 17 21 C20 17 26 20 32 27 C38 34 44 37 47 33 C50 29 47 24 41 24 C36 24 34 26 32 28 C30 30 28 30 23 30 Z"
            fill="none"
            stroke={sticker.accent}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <circle cx="32" cy="27" r="2.6" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="1.6" />
        </g>
      );
    case 'butterfly':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <ellipse cx="23" cy="25" rx="8" ry="6.5" transform="rotate(-22 23 25)" fill={sticker.accent} opacity="0.85" stroke="#FFFFFF" strokeWidth="1.5" />
          <ellipse cx="41" cy="25" rx="8" ry="6.5" transform="rotate(22 41 25)" fill={sticker.accent} opacity="0.85" stroke="#FFFFFF" strokeWidth="1.5" />
          <ellipse cx="25" cy="35" rx="5.5" ry="4.5" transform="rotate(20 25 35)" fill={sticker.accent} opacity="0.7" />
          <ellipse cx="39" cy="35" rx="5.5" ry="4.5" transform="rotate(-20 39 35)" fill={sticker.accent} opacity="0.7" />
          <line x1="32" y1="21" x2="32" y2="39" stroke={sticker.text} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'moon_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M35 16 A14 14 0 1 0 44 40 A11 11 0 1 1 35 16 Z" fill="#FBBF24" stroke={sticker.accent} strokeWidth="1.8" />
          <path d="M39 30 C39 30 33 26 33 22.5 C33 20.5 34.5 19 36.5 19 C37.8 19 38.6 19.8 39 20.8 C39.4 19.8 40.2 19 41.5 19 C43.5 19 45 20.5 45 22.5 C45 26 39 30 39 30 Z" fill={sticker.accent} stroke="#FFFFFF" strokeWidth="1.4" />
        </g>
      );
    case 'candle_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="25" y="27" width="14" height="17" rx="3" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2" />
          <path d="M32 14 C35 18 36 21 32 24 C28 21 29 18 32 14 Z" fill="#FB923C" stroke="#EA580C" strokeWidth="1.4" />
          <circle cx="32" cy="35" r="2.8" fill={sticker.accent} />
        </g>
      );
    case 'lock_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M25 27 V22 A7 7 0 0 1 39 22 V27" fill="none" stroke={sticker.accent} strokeWidth="2.6" strokeLinecap="round" />
          <rect x="21" y="26" width="22" height="17" rx="4.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" />
          <circle cx="32" cy="34" r="2.6" fill={sticker.accent} />
        </g>
      );
    case 'ribbon_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M18 30 L26 24 L32 30 L38 24 L46 30 L39 36 L32 31 L25 36 Z" fill={sticker.accent} stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M27 33 L23 44 L29 40 Z M37 33 L41 44 L35 40 Z" fill={sticker.accent} opacity="0.85" />
        </g>
      );
    case 'kiss_mark':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M18 31 Q25 23 32 27 Q39 23 46 31 Q39 34 32 32 Q25 34 18 31 Z" fill={sticker.accent} />
          <path d="M19 32 Q32 42 45 32 Q32 36 19 32 Z" fill={sticker.accent} opacity="0.88" />
        </g>
      );
    case 'broken_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M32 44 C32 44 17 34 17 24 C17 19 21 15 25 15 C28 15 30.5 17 32 19.5 C33.5 17 36 15 39 15 C43 15 47 19 47 24 C47 34 32 44 32 44 Z"
            fill={sticker.accent}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <polyline points="32,19 29,26 35,31 31,42" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'bandage_heart':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M32 44 C32 44 17 34 17 24 C17 19 21 15 25 15 C28 15 30.5 17 32 19.5 C33.5 17 36 15 39 15 C43 15 47 19 47 24 C47 34 32 44 32 44 Z"
            fill={sticker.accent}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <rect x="24" y="26" width="16" height="6" rx="2.5" transform="rotate(-18 32 29)" fill="#FFFFFF" stroke={sticker.text} strokeWidth="1.4" />
        </g>
      );
    case 'cloud_rain':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M22 33 H43 A6 6 0 0 0 43 21 A8 8 0 0 0 27 19 A6.5 6.5 0 0 0 22 33 Z" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" />
          <line x1="25" y1="37" x2="23" y2="43" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="32" y1="37" x2="30" y2="44" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="39" y1="37" x2="37" y2="43" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'umbrella':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M17 31 A15 14 0 0 1 47 31 Z" fill={sticker.accent} stroke="#FFFFFF" strokeWidth="2" />
          <path d="M32 31 V42 A3 3 0 0 1 26 42" fill="none" stroke={sticker.text} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'face_happy':
    case 'face_blush':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <circle cx="27" cy="27.5" r="2" fill={sticker.text} />
          <circle cx="37" cy="27.5" r="2" fill={sticker.text} />
          {motif === 'face_blush' && (
            <>
              <circle cx="23" cy="32" r="2.5" fill="#FDA4AF" opacity="0.85" />
              <circle cx="41" cy="32" r="2.5" fill="#FDA4AF" opacity="0.85" />
            </>
          )}
          <path d="M26 34 Q32 39.5 38 34" fill="none" stroke={sticker.text} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'face_wink':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <circle cx="26.5" cy="27.5" r="2" fill={sticker.text} />
          <path d="M34.5 27.5 Q37.5 25 40 27.5" fill="none" stroke={sticker.text} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M26 34 Q32 39 38 33.5" fill="none" stroke={sticker.text} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'face_laugh':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <path d="M24 27 L29 29 L24 30" fill="none" stroke={sticker.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M40 27 L35 29 L40 30" fill="none" stroke={sticker.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M25 33 Q32 41 39 33 Z" fill={sticker.accent} stroke={sticker.text} strokeWidth="1.6" />
        </g>
      );
    case 'face_goofy':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <circle cx="26.5" cy="26.5" r="2.4" fill={sticker.text} />
          <circle cx="37.5" cy="28.5" r="1.7" fill={sticker.text} />
          <path d="M25 34 Q32 38 39 33" fill="none" stroke={sticker.text} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M31 36 V40 A2.5 2.5 0 0 0 36 40 V35" fill="#FB7185" />
        </g>
      );
    case 'face_shock':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <circle cx="27" cy="26.5" r="2.2" fill={sticker.text} />
          <circle cx="37" cy="26.5" r="2.2" fill={sticker.text} />
          <ellipse cx="32" cy="35.5" rx="3.4" ry="4.4" fill={sticker.accent} />
        </g>
      );
    case 'face_cool':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <rect x="21" y="24" width="9.5" height="5.5" rx="2" fill={sticker.text} />
          <rect x="33.5" y="24" width="9.5" height="5.5" rx="2" fill={sticker.text} />
          <line x1="30.5" y1="26" x2="33.5" y2="26" stroke={sticker.text} strokeWidth="2" />
          <path d="M27 35 Q32 38.5 37 34" fill="none" stroke={sticker.text} strokeWidth="2.1" strokeLinecap="round" />
        </g>
      );
    case 'face_sleep':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <path d="M24 28 Q27 30.5 30 28 M34 28 Q37 30.5 40 28" fill="none" stroke={sticker.text} strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="35.5" r="2.3" fill={sticker.accent} />
        </g>
      );
    case 'face_sad':
    case 'face_cry':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="30" r="14.5" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.3" />
          <circle cx="27" cy="27.5" r="2" fill={sticker.text} />
          <circle cx="37" cy="27.5" r="2" fill={sticker.text} />
          <path d="M26 37 Q32 32.5 38 37" fill="none" stroke={sticker.text} strokeWidth="2.2" strokeLinecap="round" />
          {motif === 'face_cry' && (
            <>
              <path d="M24 31 C26 34 25.5 37 23.5 37 C21.5 37 21.5 34 24 31 Z" fill="#60A5FA" />
              <path d="M40 31 C42 34 41.5 37 39.5 37 C37.5 37 37.5 34 40 31 Z" fill="#60A5FA" />
            </>
          )}
        </g>
      );
    case 'star':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M32 14 L36.5 25 L48.5 26 L39.5 33.5 L42 45 L32 38.5 L22 45 L24.5 33.5 L15.5 26 L27.5 25 Z"
            fill="#FBBF24"
            stroke={sticker.accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'sparkle_burst':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M32 14 L35.5 26.5 L48 30 L35.5 33.5 L32 46 L28.5 33.5 L16 30 L28.5 26.5 Z" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="44" cy="19" r="2.2" fill={sticker.accent} />
          <circle cx="20" cy="41" r="2.2" fill={sticker.accent} />
        </g>
      );
    case 'crown':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M17 38 L20 22 L28 29 L32 18 L36 29 L44 22 L47 38 Z"
            fill="#FBBF24"
            stroke={sticker.accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <rect x="18" y="40" width="28" height="4.5" rx="2" fill={sticker.accent} />
        </g>
      );
    case 'fire':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M33 14 C39 21 45 25 45 34 C45 41 39.5 46 32 46 C24.5 46 19 41 19 34 C19 28 23 24 25.5 22 C25.5 25.5 27.5 27 29 27 C27.5 22 29.5 17 33 14 Z"
            fill="#FB923C"
            stroke={sticker.accent}
            strokeWidth="2.1"
          />
        </g>
      );
    case 'tea_cup':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M19 26 H41 V35 C41 40.5 36.5 44 30 44 C23.5 44 19 40.5 19 35 Z" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" />
          <path d="M41 28 H44.5 C46.5 28 47.5 29.5 47.5 31.5 C47.5 34 45.5 35.5 43 35.5 H41" fill="none" stroke={sticker.accent} strokeWidth="2.2" />
          <path d="M25 20 Q27 16 25 13 M31 20 Q33 16 31 13 M37 20 Q39 16 37 13" fill="none" stroke={sticker.accent} strokeWidth="1.9" strokeLinecap="round" />
        </g>
      );
    case 'music':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M27 38 V20 L43 16 V34" fill="none" stroke={sticker.accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="23.5" cy="39" r="4.5" fill={sticker.accent} />
          <circle cx="39.5" cy="35" r="4.5" fill={sticker.accent} />
        </g>
      );
    case 'rocket':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M32 13 C39 20 41 29 38 38 H26 C23 29 25 20 32 13 Z" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" />
          <circle cx="32" cy="26" r="3.5" fill={sticker.accent} />
          <path d="M26 35 L20.5 40 L26 39 Z M38 35 L43.5 40 L38 39 Z" fill={sticker.accent} />
          <path d="M29.5 40 L32 47 L34.5 40 Z" fill="#F97316" />
        </g>
      );
    case 'lightning':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <polygon points="35,14 21,32 31,32 28,46 43,27 33,27" fill="#FACC15" stroke={sticker.accent} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
      );
    case 'ghost_boo':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path
            d="M21 43 V27 A11 11 0 0 1 43 27 V43 L38.5 39.5 L34 43 L29.5 39.5 L25 43 Z"
            fill="#FFFFFF"
            stroke={sticker.accent}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="27" r="2" fill={sticker.text} />
          <circle cx="36" cy="27" r="2" fill={sticker.text} />
          <ellipse cx="32" cy="33" rx="2.6" ry="2" fill={sticker.accent} />
        </g>
      );
    case 'trophy':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M23 18 H41 V27 A9 9 0 0 1 23 27 Z" fill="#FBBF24" stroke={sticker.accent} strokeWidth="2.1" />
          <path d="M23 21 H18.5 C18.5 26 20.5 28 23 28 M41 21 H45.5 C45.5 26 43.5 28 41 28" fill="none" stroke={sticker.accent} strokeWidth="2" />
          <line x1="32" y1="36" x2="32" y2="42" stroke={sticker.accent} strokeWidth="2.6" />
          <rect x="25" y="42" width="14" height="3.5" rx="1.5" fill={sticker.accent} />
        </g>
      );
    case 'diamond':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <polygon points="24,18 40,18 47,26 32,44 17,26" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" strokeLinejoin="round" />
          <polyline points="17,26 47,26" stroke={sticker.accent} strokeWidth="1.8" />
          <polyline points="24,18 32,26 40,18" fill="none" stroke={sticker.accent} strokeWidth="1.6" />
        </g>
      );
    case 'flower':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="20" r="5" fill={sticker.accent} opacity="0.85" />
          <circle cx="40" cy="27" r="5" fill={sticker.accent} opacity="0.85" />
          <circle cx="37" cy="36" r="5" fill={sticker.accent} opacity="0.85" />
          <circle cx="27" cy="36" r="5" fill={sticker.accent} opacity="0.85" />
          <circle cx="24" cy="27" r="5" fill={sticker.accent} opacity="0.85" />
          <circle cx="32" cy="29" r="5" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="1.6" />
        </g>
      );
    case 'sun':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <circle cx="32" cy="29" r="8.5" fill="#FBBF24" stroke={sticker.accent} strokeWidth="2" />
          <line x1="32" y1="15" x2="32" y2="18" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="32" y1="40" x2="32" y2="43" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="18" y1="29" x2="21" y2="29" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="43" y1="29" x2="46" y2="29" stroke={sticker.accent} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'moon_crescent':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <path d="M36 16 A13 13 0 1 0 45 39 A10 10 0 1 1 36 16 Z" fill="#FDE047" stroke={sticker.accent} strokeWidth="2" />
          <circle cx="42" cy="23" r="1.8" fill={sticker.accent} />
        </g>
      );
    case 'gift':
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="20" y="25" width="24" height="18" rx="3" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" />
          <line x1="32" y1="25" x2="32" y2="43" stroke={sticker.accent} strokeWidth="2.4" />
          <line x1="20" y1="32" x2="44" y2="32" stroke={sticker.accent} strokeWidth="2.4" />
          <path d="M32 25 C27 19 22 21 25 25 M32 25 C37 19 42 21 39 25" fill="none" stroke={sticker.accent} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'speech':
    default:
      return (
        <g transform={`translate(0 ${yShift})`}>
          <rect x="14" y="18" width="36" height="24" rx="10" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" />
          <path d="M24 41 L20 47 L30 42" fill="#FFFFFF" stroke={sticker.accent} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="26" cy="30" r="2" fill={sticker.accent} />
          <circle cx="32" cy="30" r="2" fill={sticker.accent} />
          <circle cx="38" cy="30" r="2" fill={sticker.accent} />
        </g>
      );
  }
}

export const StickerIllustration: React.FC<{
  sticker: CustomStickerItem;
  size?: 'sm' | 'md' | 'lg';
}> = ({ sticker, size = 'md' }) => {
  const dim = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-24 h-24' : 'w-12 h-12';
  const frame = sticker.frame || 'rounded';
  const motif = sticker.motif || 'speech';

  const renderFrame = () => {
    switch (frame) {
      case 'circle':
        return (
          <circle
            cx="32"
            cy="32"
            r="28"
            fill={sticker.bg}
            stroke={sticker.accent}
            strokeWidth="2.2"
            strokeOpacity="0.55"
          />
        );
      case 'stamp':
        return (
          <rect
            x="5"
            y="5"
            width="54"
            height="54"
            rx="12"
            fill={sticker.bg}
            stroke={sticker.accent}
            strokeWidth="2.2"
            strokeDasharray="4 2.5"
            strokeOpacity="0.65"
          />
        );
      case 'pill':
        return (
          <rect
            x="4"
            y="6"
            width="56"
            height="52"
            rx="24"
            fill={sticker.bg}
            stroke={sticker.accent}
            strokeWidth="2.2"
            strokeOpacity="0.5"
          />
        );
      case 'diamond':
        return (
          <g>
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
            <polygon
              points="32,8 56,32 32,56 8,32"
              fill="none"
              stroke={sticker.accent}
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
          </g>
        );
      default:
        return (
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="18"
            fill={sticker.bg}
            stroke={sticker.accent}
            strokeWidth="2"
            strokeOpacity="0.48"
          />
        );
    }
  };

  const renderDecor = () => {
    if (sticker.decor === 'sparkles') {
      return (
        <g fill={sticker.accent} opacity="0.55">
          <circle cx="14" cy="14" r="1.4" />
          <circle cx="50" cy="15" r="1.7" />
          <circle cx="13" cy="48" r="1.2" />
        </g>
      );
    }
    if (sticker.decor === 'dots') {
      return (
        <g fill={sticker.accent} opacity="0.32">
          <circle cx="12" cy="18" r="1.3" />
          <circle cx="52" cy="20" r="1.3" />
          <circle cx="50" cy="47" r="1.3" />
        </g>
      );
    }
    if (sticker.decor === 'hearts') {
      return (
        <g fill={sticker.accent} opacity="0.45">
          <circle cx="13" cy="15" r="1.5" />
          <circle cx="16" cy="15" r="1.5" />
          <circle cx="50" cy="16" r="1.5" />
        </g>
      );
    }
    if (sticker.decor === 'rings') {
      return (
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke={sticker.accent}
          strokeWidth="1"
          strokeOpacity="0.22"
        />
      );
    }
    return null;
  };

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${dim} select-none drop-shadow-sm`}
      role="img"
      aria-label={sticker.label}
    >
      {renderFrame()}
      {renderDecor()}
      {renderMotifArtwork(motif, sticker)}
      {sticker.caption && (
        <g>
          <rect
            x="10"
            y="43"
            width="44"
            height="13"
            rx="6.5"
            fill="#FFFFFF"
            fillOpacity="0.92"
            stroke={sticker.accent}
            strokeWidth="1.2"
            strokeOpacity="0.5"
          />
          <text
            x="32"
            y="52"
            textAnchor="middle"
            fill={sticker.text}
            fontSize={
              sticker.caption.length > 8
                ? '6.8'
                : sticker.caption.length > 6
                ? '7.5'
                : sticker.caption.length > 4
                ? '8.4'
                : '9.4'
            }
            fontWeight="800"
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
