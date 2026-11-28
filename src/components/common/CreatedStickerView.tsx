import React from 'react';
import {
  CreatedStickerBorder,
  CreatedStickerMediaKind,
  CreatedStickerShape,
  CreatedStickerTextFont,
  CreatedStickerTextPos,
  CreatedStickerTextStyle,
  EncodedCustomStickerMeta
} from '../../lib/customStickerStore';
import { getStickerById, StickerIllustration } from './CustomStickers';

export function getStickerBorderClass(borderStyle?: CreatedStickerBorder): string {
  switch (borderStyle) {
    case 'gold':
      return 'border-[3px] border-amber-400 shadow-lg';
    case 'dark':
      return 'border-[3px] border-neutral-900 shadow-lg';
    case 'none':
      return 'border-0 shadow-lg';
    case 'white':
    default:
      return 'border-[3px] border-white shadow-xl';
  }
}

export function getStickerShapeClass(shape?: CreatedStickerShape, size: 'sm' | 'md' | 'lg' = 'md'): string {
  if (shape === 'circle') return 'rounded-full';
  if (shape === 'square') return size === 'sm' ? 'rounded-lg' : 'rounded-xl';
  return size === 'sm' ? 'rounded-2xl' : 'rounded-3xl';
}

export function getStickerFontFamily(font?: CreatedStickerTextFont): string {
  switch (font) {
    case 'playful':
      return '"Comic Sans MS", "Bricolage Grotesque", "Plus Jakarta Sans", cursive, sans-serif';
    case 'serif':
      return 'Georgia, "Playfair Display", serif';
    case 'mono':
      return '"JetBrains Mono", ui-monospace, monospace';
    case 'sans':
    default:
      return '"Plus Jakarta Sans", system-ui, sans-serif';
  }
}

export function getStickerTextStyleCss(
  style: CreatedStickerTextStyle | undefined,
  color: string
): React.CSSProperties {
  const isDarkText = color.toLowerCase() === '#111827' || color.toLowerCase() === '#000000';
  switch (style) {
    case 'pill':
      return {
        color,
        backgroundColor: isDarkText ? 'rgba(255,255,255,0.92)' : 'rgba(15,15,24,0.82)',
        padding: '0.2em 0.55em',
        borderRadius: '9999px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
      };
    case 'neon':
      return {
        color,
        textShadow: `0 0 8px ${color}, 0 0 18px ${color}, 0 2px 4px rgba(0,0,0,0.85)`
      };
    case 'clean':
      return {
        color,
        textShadow: isDarkText
          ? '0 1px 6px rgba(255,255,255,0.85)'
          : '0 2px 10px rgba(0,0,0,0.85)'
      };
    case 'outline':
    default:
      return {
        color,
        textShadow: isDarkText
          ? '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0 2px 6px rgba(0,0,0,0.45)'
          : '-1.5px -1.5px 0 #0f172a, 1.5px -1.5px 0 #0f172a, -1.5px 1.5px 0 #0f172a, 1.5px 1.5px 0 #0f172a, 0 3px 8px rgba(0,0,0,0.65)'
      };
  }
}

function resolveDefaultY(pos?: CreatedStickerTextPos): number {
  if (pos === 'top') return 18;
  if (pos === 'center') return 50;
  return 80;
}

interface CreatedStickerViewProps {
  kind: CreatedStickerMediaKind;
  mediaUrl: string;
  builtinStickerId?: string;
  meta?: EncodedCustomStickerMeta;
  size?: 'sm' | 'md' | 'lg';
}

export const CreatedStickerView: React.FC<CreatedStickerViewProps> = ({
  kind,
  mediaUrl,
  builtinStickerId,
  meta = {},
  size = 'md'
}) => {
  if (kind === 'builtin') {
    const sticker = getStickerById(builtinStickerId || mediaUrl);
    if (sticker) {
      return (
        <StickerIllustration
          sticker={sticker}
          size={size === 'sm' ? 'md' : 'lg'}
          animated={true}
        />
      );
    }
  }

  const dimClass =
    size === 'sm'
      ? 'w-16 h-16'
      : size === 'lg'
      ? 'w-44 h-44 sm:w-48 sm:h-48'
      : 'w-32 h-32 sm:w-36 sm:h-36';

  const shapeCls = getStickerShapeClass(meta.shape, size);
  const borderCls = getStickerBorderClass(meta.borderStyle);

  // Image stickers have text already baked onto the PNG during creation; legacy or unbaked keeps clean fill
  if (kind === 'image') {
    return (
      <div className={`relative overflow-hidden ${dimClass} ${shapeCls}`}>
        <img
          src={mediaUrl}
          alt={meta.caption || 'Custom sticker'}
          className="w-full h-full object-contain drop-shadow-md"
        />
      </div>
    );
  }

  // Video stickers render live looping video with positioned text overlay
  const scaleFactor = size === 'sm' ? 64 / 250 : size === 'lg' ? 184 / 250 : 140 / 250;
  const baseFontPx = meta.captionSize || 22;
  const scaledFontPx = Math.max(8, Math.round(baseFontPx * scaleFactor));
  const posX = typeof meta.captionX === 'number' ? meta.captionX : 50;
  const posY = typeof meta.captionY === 'number' ? meta.captionY : resolveDefaultY(meta.captionPos);
  const rotateDeg = typeof meta.captionRotate === 'number' ? meta.captionRotate : 0;
  const color = meta.captionColor || '#FFFFFF';

  return (
    <div className={`relative overflow-hidden bg-black ${dimClass} ${shapeCls} ${borderCls}`}>
      <video
        src={mediaUrl}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      {meta.caption && meta.caption.trim() && (
        <div
          style={{
            left: `${posX}%`,
            top: `${posY}%`,
            transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
            fontFamily: getStickerFontFamily(meta.captionFont),
            fontSize: `${scaledFontPx}px`,
            maxWidth: '88%',
            lineHeight: 1.15,
            ...getStickerTextStyleCss(meta.captionStyle, color)
          }}
          className="absolute font-black text-center whitespace-pre-wrap break-words pointer-events-none select-none"
        >
          {meta.caption}
        </div>
      )}
    </div>
  );
};
