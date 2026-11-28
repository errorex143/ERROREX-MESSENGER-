export type CreatedStickerMediaKind = 'image' | 'video' | 'builtin';
export type CreatedStickerShape = 'rounded' | 'circle' | 'square';
export type CreatedStickerTextPos = 'top' | 'center' | 'bottom';
export type CreatedStickerTextStyle = 'outline' | 'pill' | 'neon' | 'clean';
export type CreatedStickerTextFont = 'sans' | 'playful' | 'serif' | 'mono';
export type CreatedStickerBorder = 'white' | 'gold' | 'dark' | 'none';

export interface UserCreatedSticker {
  id: string;
  kind: CreatedStickerMediaKind;
  mediaUrl: string;
  builtinStickerId?: string;
  shape: CreatedStickerShape;
  borderStyle?: CreatedStickerBorder;
  caption?: string;
  captionColor?: string;
  captionPos?: CreatedStickerTextPos;
  captionX?: number;
  captionY?: number;
  captionSize?: number;
  captionRotate?: number;
  captionStyle?: CreatedStickerTextStyle;
  captionFont?: CreatedStickerTextFont;
  createdAt: string;
}

export const PHOTO_STICKER_PREFIX = '[PHOTO_STICKER]';
export const VIDEO_STICKER_PREFIX = '[VIDEO_STICKER]';

export interface EncodedCustomStickerMeta {
  caption?: string;
  captionColor?: string;
  captionPos?: CreatedStickerTextPos;
  captionX?: number;
  captionY?: number;
  captionSize?: number;
  captionRotate?: number;
  captionStyle?: CreatedStickerTextStyle;
  captionFont?: CreatedStickerTextFont;
  shape?: CreatedStickerShape;
  borderStyle?: CreatedStickerBorder;
}

export function encodeCustomStickerMessage(
  kind: 'image' | 'video',
  meta: EncodedCustomStickerMeta
): string {
  const prefix = kind === 'video' ? VIDEO_STICKER_PREFIX : PHOTO_STICKER_PREFIX;
  return `${prefix}${JSON.stringify({
    caption: meta.caption || '',
    captionColor: meta.captionColor || '#FFFFFF',
    captionPos: meta.captionPos || 'bottom',
    captionX: typeof meta.captionX === 'number' ? meta.captionX : 50,
    captionY: typeof meta.captionY === 'number' ? meta.captionY : 80,
    captionSize: typeof meta.captionSize === 'number' ? meta.captionSize : 22,
    captionRotate: typeof meta.captionRotate === 'number' ? meta.captionRotate : 0,
    captionStyle: meta.captionStyle || 'outline',
    captionFont: meta.captionFont || 'sans',
    shape: meta.shape || 'rounded',
    borderStyle: meta.borderStyle || 'white'
  })}`;
}

export function parseCustomStickerMessage(text?: string): {
  kind: 'image' | 'video';
  meta: EncodedCustomStickerMeta;
} | null {
  const trimmed = (text || '').trim();
  if (trimmed.startsWith(PHOTO_STICKER_PREFIX)) {
    const rest = trimmed.slice(PHOTO_STICKER_PREFIX.length).trim();
    try {
      const parsed = rest ? JSON.parse(rest) : {};
      return { kind: 'image', meta: parsed };
    } catch {
      return { kind: 'image', meta: { caption: rest.replace(/^:/, '').trim() } };
    }
  }
  if (trimmed.startsWith(VIDEO_STICKER_PREFIX)) {
    const rest = trimmed.slice(VIDEO_STICKER_PREFIX.length).trim();
    try {
      const parsed = rest ? JSON.parse(rest) : {};
      return { kind: 'video', meta: parsed };
    } catch {
      return { kind: 'video', meta: { caption: rest.replace(/^:/, '').trim() } };
    }
  }
  return null;
}

const DB_NAME = 'errorex_custom_stickers_db';
const DB_VERSION = 1;
const STORE_NAME = 'stickers';
const FALLBACK_LS_KEY = 'errorex_user_stickers_fallback_v1';

let memoryStickers: UserCreatedSticker[] = [];
let hasHydrated = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

function openStickerDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readFallbackStickers(): UserCreatedSticker[] {
  try {
    const raw = localStorage.getItem(FALLBACK_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackStickers(list: UserCreatedSticker[]): void {
  try {
    // Only keep lightweight image/builtin stickers in localStorage fallback
    const compact = list.filter(item => item.kind !== 'video').slice(0, 32);
    localStorage.setItem(FALLBACK_LS_KEY, JSON.stringify(compact));
  } catch {
    // Ignore quota errors
  }
}

export async function hydrateCustomStickers(): Promise<UserCreatedSticker[]> {
  if (hasHydrated) return memoryStickers;
  const db = await openStickerDb();
  if (!db) {
    memoryStickers = readFallbackStickers();
    hasHydrated = true;
    notifyListeners();
    return memoryStickers;
  }

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = Array.isArray(req.result) ? (req.result as UserCreatedSticker[]) : [];
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        memoryStickers = items;
        hasHydrated = true;
        notifyListeners();
        resolve(memoryStickers);
      };
      req.onerror = () => {
        memoryStickers = readFallbackStickers();
        hasHydrated = true;
        notifyListeners();
        resolve(memoryStickers);
      };
    } catch {
      memoryStickers = readFallbackStickers();
      hasHydrated = true;
      notifyListeners();
      resolve(memoryStickers);
    }
  });
}

export function getCustomStickersSnapshot(): UserCreatedSticker[] {
  return memoryStickers;
}

export function subscribeCustomStickers(fn: () => void): () => void {
  listeners.add(fn);
  if (!hasHydrated) {
    void hydrateCustomStickers();
  }
  return () => {
    listeners.delete(fn);
  };
}

export function findMatchingSavedSticker(params: {
  kind: CreatedStickerMediaKind;
  mediaUrl?: string;
  builtinStickerId?: string;
  caption?: string;
}): UserCreatedSticker | undefined {
  if (params.kind === 'builtin' && params.builtinStickerId) {
    return memoryStickers.find(
      s => s.kind === 'builtin' && s.builtinStickerId === params.builtinStickerId
    );
  }
  if (!params.mediaUrl) return undefined;
  return memoryStickers.find(
    s =>
      s.kind === params.kind &&
      s.mediaUrl === params.mediaUrl &&
      (s.caption || '') === (params.caption || '')
  );
}

export async function saveUserCreatedSticker(
  input: Omit<UserCreatedSticker, 'id' | 'createdAt'>
): Promise<UserCreatedSticker> {
  const duplicate = findMatchingSavedSticker({
    kind: input.kind,
    mediaUrl: input.mediaUrl,
    builtinStickerId: input.builtinStickerId,
    caption: input.caption
  });
  if (duplicate) return duplicate;

  const item: UserCreatedSticker = {
    ...input,
    id: `ustk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  };

  memoryStickers = [item, ...memoryStickers.filter(s => s.id !== item.id)];
  notifyListeners();

  const db = await openStickerDb();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      writeFallbackStickers(memoryStickers);
    }
  } else {
    writeFallbackStickers(memoryStickers);
  }

  return item;
}

export async function deleteUserCreatedSticker(id: string): Promise<void> {
  memoryStickers = memoryStickers.filter(s => s.id !== id);
  notifyListeners();

  const db = await openStickerDb();
  if (db) {
    try {
      await new Promise<void>(resolve => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Ignore
    }
  }
  writeFallbackStickers(memoryStickers);
}
