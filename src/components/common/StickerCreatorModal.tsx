import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Type,
  Check,
  Send,
  Film,
  Image as ImageIcon,
  PenTool,
  Crop,
  Move
} from 'lucide-react';
import {
  CreatedStickerBorder,
  CreatedStickerShape,
  CreatedStickerTextFont,
  CreatedStickerTextPos,
  CreatedStickerTextStyle,
  UserCreatedSticker,
  saveUserCreatedSticker
} from '../../lib/customStickerStore';
import {
  getStickerBorderClass,
  getStickerFontFamily,
  getStickerShapeClass,
  getStickerTextStyleCss
} from './CreatedStickerView';

export interface StickerCreatorDraft {
  kind: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  shape?: CreatedStickerShape;
}

interface StickerCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (sticker: UserCreatedSticker, sendImmediately: boolean) => void;
  initialDraft?: StickerCreatorDraft | null;
}

type StudioSourceMode = 'photo' | 'video' | 'write';
type StudioControlTab = 'crop' | 'text';

const STAGE_SIZE = 248;
const OUTPUT_SIZE = 480;
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;

const TEXT_COLORS = [
  '#FFFFFF',
  '#FFE066',
  '#FF4D8D',
  '#38BDF8',
  '#34D399',
  '#FB7185',
  '#F59E0B',
  '#111827'
];

const WRITE_BACKGROUNDS: Array<{ id: string; label: string; css: string; c1: string; c2: string }> = [
  { id: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg, #0F172A, #1E293B)', c1: '#0F172A', c2: '#1E293B' },
  { id: 'rose', label: 'Rose', css: 'linear-gradient(135deg, #BE123C, #FB7185)', c1: '#BE123C', c2: '#FB7185' },
  { id: 'gold', label: 'Amber', css: 'linear-gradient(135deg, #D97706, #FBBF24)', c1: '#D97706', c2: '#FBBF24' },
  { id: 'violet', label: 'Violet', css: 'linear-gradient(135deg, #6D28D9, #A855F7)', c1: '#6D28D9', c2: '#A855F7' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #0369A1, #22D3EE)', c1: '#0369A1', c2: '#22D3EE' },
  { id: 'emerald', label: 'Emerald', css: 'linear-gradient(135deg, #047857, #34D399)', c1: '#047857', c2: '#34D399' },
  { id: 'cream', label: 'Cream', css: 'linear-gradient(135deg, #FFF7ED, #FED7AA)', c1: '#FFF7ED', c2: '#FED7AA' },
  { id: 'white', label: 'White', css: 'linear-gradient(135deg, #FFFFFF, #F1F5F9)', c1: '#FFFFFF', c2: '#F1F5F9' }
];

const QUICK_EMOJIS = ['❤️', '😂', '😭', '🔥', '😍', '🥺', '💯', '👑', '🥀', '✨', '😘', '🎉'];

const BORDER_OPTIONS: Array<{ id: CreatedStickerBorder; label: string }> = [
  { id: 'white', label: 'White' },
  { id: 'gold', label: 'Gold' },
  { id: 'dark', label: 'Black' },
  { id: 'none', label: 'None' }
];

const TEXT_STYLES: Array<{ id: CreatedStickerTextStyle; label: string }> = [
  { id: 'outline', label: 'Outline' },
  { id: 'pill', label: 'Marker' },
  { id: 'neon', label: 'Neon' },
  { id: 'clean', label: 'Clean' }
];

const TEXT_FONTS: Array<{ id: CreatedStickerTextFont; label: string }> = [
  { id: 'sans', label: 'Modern' },
  { id: 'playful', label: 'Playful' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' }
];

export const StickerCreatorModal: React.FC<StickerCreatorModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialDraft
}) => {
  const [sourceMode, setSourceMode] = useState<StudioSourceMode>('photo');
  const [controlTab, setControlTab] = useState<StudioControlTab>('crop');

  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [shape, setShape] = useState<CreatedStickerShape>('rounded');
  const [borderStyle, setBorderStyle] = useState<CreatedStickerBorder>('white');
  const [writeBgId, setWriteBgId] = useState<string>('midnight');

  const [caption, setCaption] = useState('');
  const [captionColor, setCaptionColor] = useState('#FFFFFF');
  const [captionStyle, setCaptionStyle] = useState<CreatedStickerTextStyle>('outline');
  const [captionFont, setCaptionFont] = useState<CreatedStickerTextFont>('sans');
  const [captionSize, setCaptionSize] = useState<number>(24);
  const [captionRotate, setCaptionRotate] = useState<number>(0);
  const [captionX, setCaptionX] = useState<number>(50);
  const [captionY, setCaptionY] = useState<number>(78);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const dragImageRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const dragTextRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSourceMode('photo');
      setControlTab('crop');
      setMediaKind(null);
      setMediaSrc(null);
      setImgEl(null);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setShape('rounded');
      setBorderStyle('white');
      setWriteBgId('midnight');
      setCaption('');
      setCaptionColor('#FFFFFF');
      setCaptionStyle('outline');
      setCaptionFont('sans');
      setCaptionSize(24);
      setCaptionRotate(0);
      setCaptionX(50);
      setCaptionY(78);
      setErrorMsg(null);
      setSaving(false);
      return;
    }

    if (initialDraft?.mediaUrl) {
      setShape(initialDraft.shape || 'rounded');
      setCaption(initialDraft.caption || '');
      if (initialDraft.kind === 'video') {
        setSourceMode('video');
        setMediaKind('video');
        setMediaSrc(initialDraft.mediaUrl);
        setImgEl(null);
        setControlTab('text');
      } else {
        setSourceMode('photo');
        const img = new Image();
        img.onload = () => {
          setImgEl(img);
          setMediaKind('image');
          setMediaSrc(initialDraft.mediaUrl);
        };
        img.src = initialDraft.mediaUrl;
        setControlTab('crop');
      }
    }
  }, [isOpen, initialDraft]);

  if (!isOpen) return null;

  const activeWriteBg = WRITE_BACKGROUNDS.find(b => b.id === writeBgId) || WRITE_BACKGROUNDS[0];
  const hasReadyCanvas = sourceMode === 'write' || Boolean(mediaSrc);

  const handlePickFile = (targetMode: 'photo' | 'video') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (targetMode === 'video' && !isVideo) {
      setErrorMsg('Please select a video file.');
      return;
    }
    if (targetMode === 'photo' && !isImage && !isVideo) {
      setErrorMsg('Please select a photo or video from your gallery.');
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setErrorMsg('Video is too large. Please pick a short clip under 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setErrorMsg('Could not read the selected file.');
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });

      if (isVideo) {
        setSourceMode('video');
        setMediaKind('video');
        setMediaSrc(dataUrl);
        setImgEl(null);
      } else {
        const img = new Image();
        img.onload = () => {
          setSourceMode('photo');
          setImgEl(img);
          setMediaKind('image');
          setMediaSrc(dataUrl);
        };
        img.onerror = () => setErrorMsg('Could not open this image. Try another photo.');
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const swapped = rotation % 180 !== 0;
  const orientedW = imgEl ? (swapped ? imgEl.naturalHeight : imgEl.naturalWidth) : 1;
  const orientedH = imgEl ? (swapped ? imgEl.naturalWidth : imgEl.naturalHeight) : 1;
  const baseScale = imgEl ? Math.max(STAGE_SIZE / orientedW, STAGE_SIZE / orientedH) : 1;
  const effectiveScale = baseScale * zoom;

  const clampOffset = (nx: number, ny: number, currentZoom = zoom, nextRot = rotation) => {
    if (!imgEl) return { x: nx, y: ny };
    const isSwapped = nextRot % 180 !== 0;
    const ow = isSwapped ? imgEl.naturalHeight : imgEl.naturalWidth;
    const oh = isSwapped ? imgEl.naturalWidth : imgEl.naturalHeight;
    const bs = Math.max(STAGE_SIZE / ow, STAGE_SIZE / oh);
    const w = ow * bs * currentZoom;
    const h = oh * bs * currentZoom;
    const maxX = Math.max(0, (w - STAGE_SIZE) / 2);
    const maxY = Math.max(0, (h - STAGE_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nx)),
      y: Math.min(maxY, Math.max(-maxY, ny))
    };
  };

  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (sourceMode !== 'photo' || mediaKind !== 'image' || !imgEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingImage(true);
    dragImageRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: offset.x,
      origY: offset.y
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent) => {
    if (isDraggingText && dragTextRef.current) {
      const dx = ((e.clientX - dragTextRef.current.x) / STAGE_SIZE) * 100;
      const dy = ((e.clientY - dragTextRef.current.y) / STAGE_SIZE) * 100;
      setCaptionX(Math.min(88, Math.max(12, Math.round(dragTextRef.current.origX + dx))));
      setCaptionY(Math.min(88, Math.max(12, Math.round(dragTextRef.current.origY + dy))));
      return;
    }
    if (!isDraggingImage || !dragImageRef.current) return;
    const dx = e.clientX - dragImageRef.current.x;
    const dy = e.clientY - dragImageRef.current.y;
    setOffset(clampOffset(dragImageRef.current.origX + dx, dragImageRef.current.origY + dy));
  };

  const handleStagePointerUp = () => {
    setIsDraggingImage(false);
    setIsDraggingText(false);
    dragImageRef.current = null;
    dragTextRef.current = null;
  };

  const handleTextPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingText(true);
    setControlTab('text');
    dragTextRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: captionX,
      origY: captionY
    };
  };

  const wrapCanvasLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const paragraphs = text.split('\n');
    const lines: string[] = [];
    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      let line = '';
      for (const word of words) {
        if (!word) continue;
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
          line = candidate;
        } else {
          if (line) lines.push(line);
          line = word;
        }
      }
      if (line || para === '') lines.push(line);
    }
    return lines.filter((l, i, arr) => !(l === '' && arr.length > 1 && i === arr.length - 1));
  };

  const renderBakedStickerPng = (): string | null => {
    if (sourceMode === 'photo' && !imgEl) return null;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const pad = borderStyle === 'none' ? 6 : 12;
    const innerSize = OUTPUT_SIZE - pad * 2;
    const radius = shape === 'circle' ? innerSize / 2 : shape === 'rounded' ? 76 : 28;

    const traceShape = (inset = 0) => {
      const x = pad + inset;
      const y = pad + inset;
      const s = innerSize - inset * 2;
      const r = Math.max(8, radius - inset);
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, s / 2, 0, Math.PI * 2);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + s - r, y);
        ctx.quadraticCurveTo(x + s, y, x + s, y + r);
        ctx.lineTo(x + s, y + s - r);
        ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
        ctx.lineTo(x + r, y + s);
        ctx.quadraticCurveTo(x, y + s, x, y + s - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
    };

    // Optional die-cut sticker border
    if (borderStyle !== 'none') {
      ctx.save();
      traceShape(-4);
      ctx.fillStyle =
        borderStyle === 'gold' ? '#F59E0B' : borderStyle === 'dark' ? '#111827' : '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 5;
      ctx.fill();
      ctx.restore();
    }

    // Inner clipped media / write background
    ctx.save();
    traceShape(borderStyle === 'none' ? 0 : 3);
    ctx.clip();

    if (sourceMode === 'write') {
      const grad = ctx.createLinearGradient(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      grad.addColorStop(0, activeWriteBg.c1);
      grad.addColorStop(1, activeWriteBg.c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    } else if (imgEl) {
      const ratio = OUTPUT_SIZE / STAGE_SIZE;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      const drawW = imgEl.naturalWidth * effectiveScale * ratio;
      const drawH = imgEl.naturalHeight * effectiveScale * ratio;
      ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // Draw freely positioned, sized, rotated, styled custom text
    const cleanText = caption.trim();
    if (cleanText) {
      const ratio = OUTPUT_SIZE / STAGE_SIZE;
      const scaledFontSize = Math.round(captionSize * ratio);
      const fontFamily = getStickerFontFamily(captionFont);
      ctx.font = `900 ${scaledFontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxTextW = OUTPUT_SIZE * 0.82;
      const lines = wrapCanvasLines(ctx, cleanText, maxTextW);
      const lineHeight = scaledFontSize * 1.18;
      const totalH = lines.length * lineHeight;

      const anchorX = (captionX / 100) * OUTPUT_SIZE;
      const anchorY = (captionY / 100) * OUTPUT_SIZE;

      ctx.save();
      ctx.translate(anchorX, anchorY);
      ctx.rotate((captionRotate * Math.PI) / 180);

      const isDarkText = captionColor.toLowerCase() === '#111827';

      if (captionStyle === 'pill') {
        const widest = Math.min(
          maxTextW + 32,
          Math.max(...lines.map(l => ctx.measureText(l).width)) + 42
        );
        const pillH = totalH + 22;
        const px = -widest / 2;
        const py = -pillH / 2;
        const pr = Math.min(28, pillH / 2);
        ctx.fillStyle = isDarkText ? 'rgba(255,255,255,0.92)' : 'rgba(15,15,24,0.84)';
        ctx.beginPath();
        ctx.moveTo(px + pr, py);
        ctx.lineTo(px + widest - pr, py);
        ctx.quadraticCurveTo(px + widest, py, px + widest, py + pr);
        ctx.lineTo(px + widest, py + pillH - pr);
        ctx.quadraticCurveTo(px + widest, py + pillH, px + widest - pr, py + pillH);
        ctx.lineTo(px + pr, py + pillH);
        ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - pr);
        ctx.lineTo(px, py + pr);
        ctx.quadraticCurveTo(px, py, px + pr, py);
        ctx.closePath();
        ctx.fill();
      }

      lines.forEach((line, idx) => {
        const ly = -totalH / 2 + lineHeight * (idx + 0.5);
        if (captionStyle === 'neon') {
          ctx.shadowColor = captionColor;
          ctx.shadowBlur = 18;
        } else if (captionStyle === 'clean') {
          ctx.shadowColor = isDarkText ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 3;
        } else if (captionStyle === 'outline') {
          ctx.lineWidth = Math.max(5, Math.round(scaledFontSize * 0.22));
          ctx.lineJoin = 'round';
          ctx.strokeStyle = isDarkText ? '#FFFFFF' : '#0F172A';
          ctx.strokeText(line, 0, ly, maxTextW);
        }

        ctx.fillStyle = captionColor;
        ctx.fillText(line, 0, ly, maxTextW);
        if (captionStyle === 'neon') {
          ctx.fillText(line, 0, ly, maxTextW);
        }
      });

      ctx.restore();
    }

    ctx.restore();
    return canvas.toDataURL('image/png');
  };

  const handleSave = async (sendImmediately: boolean) => {
    if (sourceMode === 'write' && !caption.trim()) {
      setErrorMsg('Please write some text for your sticker first.');
      return;
    }
    if ((sourceMode === 'photo' || sourceMode === 'video') && !mediaSrc) {
      setErrorMsg(`Please select a ${sourceMode} from your gallery first.`);
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const legacyPos: CreatedStickerTextPos =
        captionY < 35 ? 'top' : captionY > 65 ? 'bottom' : 'center';

      if (sourceMode === 'video' && mediaSrc) {
        const saved = await saveUserCreatedSticker({
          kind: 'video',
          mediaUrl: mediaSrc,
          shape,
          borderStyle,
          caption: caption.trim() || undefined,
          captionColor,
          captionPos: legacyPos,
          captionX,
          captionY,
          captionSize,
          captionRotate,
          captionStyle,
          captionFont
        });
        onCreated(saved, sendImmediately);
        return;
      }

      const bakedPng = renderBakedStickerPng();
      if (!bakedPng) throw new Error('Could not process sticker canvas.');

      const saved = await saveUserCreatedSticker({
        kind: 'image',
        mediaUrl: bakedPng,
        shape,
        borderStyle,
        caption: caption.trim() || undefined,
        captionColor,
        captionPos: legacyPos,
        captionX,
        captionY,
        captionSize,
        captionRotate,
        captionStyle,
        captionFont
      });
      onCreated(saved, sendImmediately);
    } catch {
      setErrorMsg('Could not save sticker. Try a smaller photo or video.');
    } finally {
      setSaving(false);
    }
  };

  const shapeRadiusClass = getStickerShapeClass(shape, 'lg');
  const borderClass = getStickerBorderClass(borderStyle);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[95dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden text-[var(--text-main)]"
      >
        <div className="sm:hidden pt-2.5 pb-1 bg-[var(--bg-card)] flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-400/40" />
        </div>

        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">Sticker Studio</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Crop photo/video, write & drag text anywhere, save & send
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sticker studio"
            className="w-9 h-9 rounded-full bg-neutral-200/50 dark:bg-neutral-800/60 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Pickers */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePickFile('photo')}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handlePickFile('video')}
          className="hidden"
        />

        {/* Source Mode Selector: Photo | Video | Write Sticker */}
        <div className="px-4 pt-3 pb-2 bg-[var(--bg-sidebar)] border-b border-neutral-200 dark:border-white/5 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)]">
            <button
              type="button"
              onClick={() => {
                setSourceMode('photo');
                setErrorMsg(null);
              }}
              className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sourceMode === 'photo'
                  ? 'gold-button-accent shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSourceMode('video');
                setErrorMsg(null);
              }}
              className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sourceMode === 'video'
                  ? 'gold-button-accent shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSourceMode('write');
                setControlTab('text');
                setErrorMsg(null);
                if (!caption.trim()) {
                  setCaptionY(50);
                  setCaptionX(50);
                }
              }}
              className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sourceMode === 'write'
                  ? 'gold-button-accent shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Write Sticker</span>
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Upload Prompt when photo/video hasn't been picked yet */}
          {sourceMode !== 'write' && (!mediaSrc || (sourceMode === 'photo' && mediaKind !== 'image') || (sourceMode === 'video' && mediaKind !== 'video')) ? (
            <button
              type="button"
              onClick={() =>
                sourceMode === 'video'
                  ? videoInputRef.current?.click()
                  : photoInputRef.current?.click()
              }
              className="w-full py-10 px-4 rounded-2xl border-2 border-dashed border-[var(--accent-border)] hover:border-[var(--accent-primary)] bg-[var(--bg-card)] flex flex-col items-center justify-center gap-3 text-center transition-colors cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">
                  {sourceMode === 'video'
                    ? 'Pick a Short Video from Gallery'
                    : 'Pick a Photo from Gallery'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  {sourceMode === 'video'
                    ? 'Add text, drag & adjust it freely on top (max 10 MB)'
                    : 'Crop, zoom, rotate, write text & drag anywhere'}
                </p>
              </div>
            </button>
          ) : (
            <>
              {/* Live Interactive Sticker Preview Stage */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="p-2.5 rounded-3xl border border-[var(--accent-border)] shadow-inner"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                    backgroundColor: 'var(--bg-card)'
                  }}
                >
                  <div
                    ref={stageRef}
                    onPointerDown={handleStagePointerDown}
                    onPointerMove={handleStagePointerMove}
                    onPointerUp={handleStagePointerUp}
                    onPointerCancel={handleStagePointerUp}
                    style={{
                      width: STAGE_SIZE,
                      height: STAGE_SIZE,
                      background: sourceMode === 'write' ? activeWriteBg.css : '#0F172A'
                    }}
                    className={`relative overflow-hidden ${shapeRadiusClass} ${borderClass} ${
                      sourceMode === 'photo' && imgEl
                        ? 'touch-none select-none cursor-grab active:cursor-grabbing'
                        : 'touch-none select-none'
                    }`}
                  >
                    {sourceMode === 'photo' && mediaKind === 'image' && imgEl && mediaSrc && (
                      <img
                        src={mediaSrc}
                        alt="Sticker preview"
                        draggable={false}
                        style={{
                          width: imgEl.naturalWidth * baseScale,
                          height: imgEl.naturalHeight * baseScale,
                          maxWidth: 'none',
                          maxHeight: 'none',
                          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`
                        }}
                        className="absolute left-1/2 top-1/2 pointer-events-none select-none"
                      />
                    )}

                    {sourceMode === 'video' && mediaKind === 'video' && mediaSrc && (
                      <video
                        src={mediaSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )}

                    {/* Draggable, Rotatable, Multi-Line Text Layer */}
                    {caption.trim() ? (
                      <div
                        onPointerDown={handleTextPointerDown}
                        onPointerMove={handleStagePointerMove}
                        onPointerUp={handleStagePointerUp}
                        onPointerCancel={handleStagePointerUp}
                        style={{
                          left: `${captionX}%`,
                          top: `${captionY}%`,
                          transform: `translate(-50%, -50%) rotate(${captionRotate}deg)`,
                          fontFamily: getStickerFontFamily(captionFont),
                          fontSize: `${captionSize}px`,
                          maxWidth: '86%',
                          lineHeight: 1.18,
                          ...getStickerTextStyleCss(captionStyle, captionColor)
                        }}
                        className={`absolute font-black text-center whitespace-pre-wrap break-words touch-none select-none cursor-move transition-shadow ${
                          isDraggingText
                            ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-transparent rounded-xl'
                            : ''
                        }`}
                        title="Drag text anywhere on sticker"
                      >
                        {caption}
                      </div>
                    ) : (
                      sourceMode === 'write' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 text-center">
                          <span className="text-xs font-semibold text-white/60">
                            Type your text below to create sticker
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                  {sourceMode !== 'write' && (
                    <button
                      type="button"
                      onClick={() =>
                        sourceMode === 'video'
                          ? videoInputRef.current?.click()
                          : photoInputRef.current?.click()
                      }
                      className="font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
                    >
                      Change {sourceMode === 'video' ? 'Video' : 'Photo'}
                    </button>
                  )}
                  {caption.trim() && (
                    <span className="flex items-center gap-1">
                      <Move className="w-3 h-3 text-[var(--accent-primary)]" />
                      Drag text to move anywhere
                    </span>
                  )}
                </div>
              </div>

              {/* Editor Tool Tabs: Crop & Frame | Write & Style Text */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)]">
                <button
                  type="button"
                  onClick={() => setControlTab('crop')}
                  className={`min-h-[36px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    controlTab === 'crop'
                      ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>{sourceMode === 'write' ? 'Card & Shape' : 'Crop & Shape'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setControlTab('text')}
                  className={`min-h-[36px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    controlTab === 'text'
                      ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Write & Adjust Text</span>
                </button>
              </div>

              {controlTab === 'crop' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)]">
                  {/* Photo Pan/Zoom/Rotate */}
                  {sourceMode === 'photo' && mediaKind === 'image' && (
                    <div className="space-y-2 pb-2 border-b border-neutral-200 dark:border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--text-main)]">
                          Crop & Zoom ({zoom.toFixed(1)}x)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setZoom(1);
                            setRotation(0);
                            setOffset({ x: 0, y: 0 });
                          }}
                          className="text-[11px] font-semibold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Crop</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nz = Math.max(1, Number((zoom - 0.15).toFixed(2)));
                            setZoom(nz);
                            setOffset(p => clampOffset(p.x, p.y, nz));
                          }}
                          aria-label="Zoom out"
                          className="min-w-[40px] min-h-[40px] rounded-xl border border-[var(--accent-border)] flex items-center justify-center cursor-pointer"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.05}
                          value={zoom}
                          onChange={e => {
                            const nz = parseFloat(e.target.value);
                            setZoom(nz);
                            setOffset(p => clampOffset(p.x, p.y, nz));
                          }}
                          className="flex-1 accent-[var(--accent-primary)] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nz = Math.min(3, Number((zoom + 0.15).toFixed(2)));
                            setZoom(nz);
                            setOffset(p => clampOffset(p.x, p.y, nz));
                          }}
                          aria-label="Zoom in"
                          className="min-w-[40px] min-h-[40px] rounded-xl border border-[var(--accent-border)] flex items-center justify-center cursor-pointer"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nr = (rotation + 90) % 360;
                            setRotation(nr);
                            setOffset(p => clampOffset(p.x, p.y, zoom, nr));
                          }}
                          aria-label="Rotate 90 degrees"
                          className="min-w-[40px] min-h-[40px] rounded-xl border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] cursor-pointer"
                          title="Rotate 90°"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Write Sticker Background Swatches */}
                  {sourceMode === 'write' && (
                    <div className="space-y-1.5 pb-2 border-b border-neutral-200 dark:border-white/5">
                      <span className="text-xs font-semibold text-[var(--text-main)] block">
                        Sticker Background
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {WRITE_BACKGROUNDS.map(bg => (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => setWriteBgId(bg.id)}
                            aria-label={`${bg.label} background`}
                            style={{ background: bg.css }}
                            className={`w-9 h-9 rounded-xl border-2 cursor-pointer transition-transform ${
                              writeBgId === bg.id
                                ? 'border-[var(--accent-primary)] scale-110 shadow-md'
                                : 'border-neutral-400/40'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cut Shape */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text-main)] block">
                      Cut Shape
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['rounded', 'circle', 'square'] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setShape(opt)}
                          className={`min-h-[38px] py-1.5 rounded-xl text-xs font-semibold capitalize border cursor-pointer transition-all ${
                            shape === opt
                              ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)]'
                              : 'border-[var(--accent-border)] text-[var(--text-muted)]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Die-Cut Border */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text-main)] block">
                      Sticker Border
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BORDER_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBorderStyle(opt.id)}
                          className={`min-h-[36px] py-1 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                            borderStyle === opt.id
                              ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)]'
                              : 'border-[var(--accent-border)] text-[var(--text-muted)]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-main)]">
                      Write Your Text
                    </span>
                    <div className="flex items-center gap-2">
                      {caption && (
                        <button
                          type="button"
                          onClick={() => setCaption('')}
                          className="text-[11px] font-semibold text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
                        {caption.length}/80
                      </span>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    maxLength={80}
                    value={caption}
                    onChange={e => setCaption(e.target.value.slice(0, 80))}
                    placeholder="Type anything... (English, Roman Urdu, Shayari, Emoji)"
                    className="w-full px-3 py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none resize-none"
                  />

                  {/* Quick Emoji Stamps */}
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                    {QUICK_EMOJIS.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setCaption(prev => (prev + em).slice(0, 80))}
                        className="w-8 h-8 rounded-lg hover:bg-[var(--accent-surface)] text-base flex items-center justify-center shrink-0 cursor-pointer"
                        title={`Add ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  {/* Text Style & Font */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
                        Style
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {TEXT_STYLES.map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setCaptionStyle(st.id)}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                              captionStyle === st.id
                                ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                : 'border-[var(--accent-border)] text-[var(--text-muted)]'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
                        Font
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {TEXT_FONTS.map(ft => (
                          <button
                            key={ft.id}
                            type="button"
                            onClick={() => setCaptionFont(ft.id)}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                              captionFont === ft.id
                                ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                : 'border-[var(--accent-border)] text-[var(--text-muted)]'
                            }`}
                          >
                            {ft.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
                      Text Color
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {TEXT_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCaptionColor(c)}
                          aria-label={`Text color ${c}`}
                          style={{ backgroundColor: c }}
                          className={`w-7 h-7 rounded-full border cursor-pointer transition-transform ${
                            captionColor === c
                              ? 'border-2 border-[var(--accent-primary)] scale-115 shadow'
                              : 'border-neutral-400/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Size & Tilt Adjustment Sliders + Quick Snap */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Size</span>
                        <span className="font-mono tabular-nums">{captionSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={14}
                        max={42}
                        step={1}
                        value={captionSize}
                        onChange={e => setCaptionSize(parseInt(e.target.value, 10))}
                        className="w-full accent-[var(--accent-primary)] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Tilt</span>
                        <span className="font-mono tabular-nums">{captionRotate}°</span>
                      </div>
                      <input
                        type="range"
                        min={-25}
                        max={25}
                        step={1}
                        value={captionRotate}
                        onChange={e => setCaptionRotate(parseInt(e.target.value, 10))}
                        className="w-full accent-[var(--accent-primary)] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Quick Snap Position */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-[var(--text-muted)]">Snap Position</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Top', x: 50, y: 18 },
                        { label: 'Center', x: 50, y: 50 },
                        { label: 'Bottom', x: 50, y: 80 }
                      ].map(snap => (
                        <button
                          key={snap.label}
                          type="button"
                          onClick={() => {
                            setCaptionX(snap.x);
                            setCaptionY(snap.y);
                            setCaptionRotate(0);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[var(--text-main)] cursor-pointer"
                        >
                          {snap.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] border-t border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={!hasReadyCanvas || saving}
            onClick={() => handleSave(false)}
            className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer"
          >
            <Check className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Save to Keyboard</span>
          </button>
          <button
            type="button"
            disabled={!hasReadyCanvas || saving}
            onClick={() => handleSave(true)}
            className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl gold-button-accent text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save & Send'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
