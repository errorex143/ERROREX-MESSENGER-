export interface ChatWallpaperConfig {
  url: string;
  dimOpacity: number;
}

export interface WallpaperPreset {
  id: string;
  label: string;
  value: string;
  dimOpacity: number;
}

const STORAGE_KEY = 'errorex_chat_wallpapers_v1';
const DEFAULT_KEY = '__default__';

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'obsidian_gold',
    label: 'Obsidian Silk',
    value: 'radial-gradient(circle at 20% 20%, rgba(234,179,8,0.22), transparent 55%), radial-gradient(circle at 80% 80%, rgba(245,158,11,0.16), transparent 50%), linear-gradient(160deg, #0b0b0f 0%, #17141d 100%)',
    dimOpacity: 0.2
  },
  {
    id: 'midnight_aurora',
    label: 'Northern Lights',
    value: 'radial-gradient(circle at 15% 25%, rgba(16,185,129,0.28), transparent 45%), radial-gradient(circle at 85% 30%, rgba(56,189,248,0.28), transparent 50%), linear-gradient(165deg, #07131a 0%, #0d1b2a 100%)',
    dimOpacity: 0.2
  },
  {
    id: 'velvet_rose',
    label: 'Velvet Rose',
    value: 'radial-gradient(circle at 30% 20%, rgba(244,63,94,0.28), transparent 50%), radial-gradient(circle at 75% 75%, rgba(217,70,239,0.24), transparent 55%), linear-gradient(155deg, #1b0b16 0%, #120914 100%)',
    dimOpacity: 0.2
  },
  {
    id: 'cosmic_violet',
    label: 'Cosmic Nebula',
    value: 'radial-gradient(circle at 75% 20%, rgba(139,92,246,0.34), transparent 52%), radial-gradient(circle at 20% 80%, rgba(59,130,246,0.26), transparent 50%), linear-gradient(160deg, #090818 0%, #161130 100%)',
    dimOpacity: 0.2
  },
  {
    id: 'sunset_amber',
    label: 'Amber Horizon',
    value: 'radial-gradient(circle at 80% 15%, rgba(251,146,60,0.34), transparent 48%), radial-gradient(circle at 20% 85%, rgba(236,72,153,0.22), transparent 50%), linear-gradient(165deg, #1a0f0c 0%, #241219 100%)',
    dimOpacity: 0.22
  },
  {
    id: 'deep_ocean',
    label: 'Deep Lagoon',
    value: 'radial-gradient(circle at 20% 15%, rgba(6,182,212,0.28), transparent 50%), radial-gradient(circle at 85% 85%, rgba(37,99,235,0.3), transparent 55%), linear-gradient(160deg, #04131c 0%, #091d36 100%)',
    dimOpacity: 0.2
  },
  {
    id: 'emerald_forest',
    label: 'Emerald Mist',
    value: 'radial-gradient(circle at 25% 25%, rgba(52,211,153,0.24), transparent 50%), radial-gradient(circle at 80% 75%, rgba(132,204,22,0.16), transparent 50%), linear-gradient(160deg, #071712 0%, #0c221b 100%)',
    dimOpacity: 0.2
  },
  {
    id: 'minimal_slate',
    label: 'Soft Carbon',
    value: 'radial-gradient(circle at 50% 0%, rgba(148,163,184,0.16), transparent 60%), linear-gradient(180deg, #111318 0%, #1b1e26 100%)',
    dimOpacity: 0.15
  }
];

function readWallpaperMap(): Record<string, ChatWallpaperConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeWallpaperMap(map: Record<string, ChatWallpaperConfig>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function isImageWallpaper(url: string): boolean {
  return url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:');
}

export function getChatWallpaper(conversationId: string): ChatWallpaperConfig | null {
  const map = readWallpaperMap();
  return map[conversationId] || map[DEFAULT_KEY] || null;
}

export function hasCustomWallpaperForChat(conversationId: string): boolean {
  const map = readWallpaperMap();
  return Boolean(map[conversationId] || map[DEFAULT_KEY]);
}

export function setChatWallpaper(conversationId: string, config: ChatWallpaperConfig): void {
  const map = readWallpaperMap();
  map[conversationId] = config;
  writeWallpaperMap(map);
}

export function setGlobalChatWallpaper(config: ChatWallpaperConfig): void {
  const map = readWallpaperMap();
  map[DEFAULT_KEY] = config;
  writeWallpaperMap(map);
}

export function clearChatWallpaper(conversationId: string): void {
  const map = readWallpaperMap();
  delete map[conversationId];
  writeWallpaperMap(map);
}

export function clearGlobalChatWallpaper(): void {
  const map = readWallpaperMap();
  delete map[DEFAULT_KEY];
  writeWallpaperMap(map);
}

export function compressWallpaperImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const maxSide = 1280;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height / width) * maxSide);
            width = maxSide;
          } else {
            width = Math.round((width / height) * maxSide);
            height = maxSide;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
