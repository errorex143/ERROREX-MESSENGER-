import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Check } from 'lucide-react';

interface AvatarCropModalProps {
  imageSrc: string | null;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  shape?: 'circle' | 'rect';
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  imageSrc,
  onConfirm,
  onCancel,
  title = 'Crop Profile Picture',
  subtitle = 'Drag to position, zoom or rotate before saving',
  confirmLabel = 'Apply DP',
  shape = 'circle',
  aspectRatio = 1,
  outputWidth,
  outputHeight
}) => {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  const safeRatio = Math.max(0.4, Math.min(2, aspectRatio || 1));
  const stageW = safeRatio === 1 ? 260 : safeRatio < 1 ? Math.round(310 * safeRatio) : 280;
  const stageH = safeRatio === 1 ? 260 : safeRatio < 1 ? 310 : Math.round(280 / safeRatio);
  const outW = outputWidth ?? (shape === 'circle' ? 400 : 720);
  const outH = outputHeight ?? Math.round(outW / safeRatio);

  useEffect(() => {
    if (!imageSrc) {
      setImgEl(null);
      return;
    }
    setLoadError(null);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    if (!imageSrc.startsWith('data:') && !imageSrc.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => setImgEl(img);
    img.onerror = () => setLoadError('Could not load this image for cropping.');
    img.src = imageSrc;
  }, [imageSrc]);

  if (!imageSrc) return null;

  const swapped = rotation % 180 !== 0;
  const orientedW = imgEl ? (swapped ? imgEl.naturalHeight : imgEl.naturalWidth) : 1;
  const orientedH = imgEl ? (swapped ? imgEl.naturalWidth : imgEl.naturalHeight) : 1;
  const baseScale = imgEl ? Math.max(stageW / orientedW, stageH / orientedH) : 1;
  const effectiveScale = baseScale * zoom;

  const clampOffset = (nx: number, ny: number, currentZoom = zoom, nextRot = rotation) => {
    if (!imgEl) return { x: nx, y: ny };
    const isSwapped = nextRot % 180 !== 0;
    const ow = isSwapped ? imgEl.naturalHeight : imgEl.naturalWidth;
    const oh = isSwapped ? imgEl.naturalWidth : imgEl.naturalHeight;
    const bs = Math.max(stageW / ow, stageH / oh);
    const w = ow * bs * currentZoom;
    const h = oh * bs * currentZoom;
    const maxX = Math.max(0, (w - stageW) / 2);
    const maxY = Math.max(0, (h - stageH) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nx)),
      y: Math.min(maxY, Math.max(-maxY, ny))
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imgEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: offset.x,
      origY: offset.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset(clampOffset(dragStartRef.current.origX + dx, dragStartRef.current.origY + dy));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoom(clampedZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, clampedZoom));
  };

  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    setOffset(prev => clampOffset(prev.x, prev.y, zoom, nextRot));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!imgEl) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = outW / stageW;
      const scaleY = outH / stageH;
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, outW, outH);

      ctx.save();
      ctx.translate(outW / 2 + offset.x * scaleX, outH / 2 + offset.y * scaleY);
      ctx.rotate((rotation * Math.PI) / 180);
      const drawW = imgEl.naturalWidth * effectiveScale * scaleX;
      const drawH = imgEl.naturalHeight * effectiveScale * scaleY;
      ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', shape === 'rect' ? 0.86 : 0.9);
      onConfirm(dataUrl);
    } catch {
      setLoadError('This photo cannot be cropped due to browser security rules. Please upload a photo from your device.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden text-[var(--text-main)]"
      >
        <div className="sm:hidden pt-2.5 pb-1 bg-[var(--bg-card)] flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-400/40" />
        </div>

        <div className="px-4 py-3.5 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">{title}</h3>
            <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel crop"
            className="w-9 h-9 rounded-full bg-neutral-200/50 dark:bg-neutral-800/60 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col items-center gap-4 overflow-y-auto flex-1">
          {loadError ? (
            <div className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 text-center">
              {loadError}
            </div>
          ) : (
            <>
              {/* Interactive Crop Stage */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ width: stageW, height: stageH }}
                className="relative rounded-2xl overflow-hidden bg-neutral-950 border border-[var(--accent-border)] touch-none select-none cursor-grab active:cursor-grabbing shadow-inner shrink-0"
              >
                {imgEl && (
                  <img
                    src={imageSrc}
                    alt="Crop preview"
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

                {shape === 'circle' ? (
                  <>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle at center, transparent 48%, rgba(0, 0, 0, 0.58) 49%)'
                      }}
                    />
                    <div className="absolute inset-2 rounded-full border-2 border-dashed border-[var(--accent-primary)]/85 pointer-events-none" />
                  </>
                ) : (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-1.5 rounded-xl border-2 border-dashed border-[var(--accent-primary)]/85" />
                    <div className="absolute inset-x-0 top-1/3 h-px bg-white/20" />
                    <div className="absolute inset-x-0 top-2/3 h-px bg-white/20" />
                    <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
                    <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
                  </div>
                )}
              </div>

              {/* Zoom & Rotate Controls */}
              <div className="w-full space-y-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoom - 0.15)}
                    aria-label="Zoom out"
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--text-main)] hover:border-[var(--accent-primary)] cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={e => handleZoomChange(parseFloat(e.target.value))}
                    aria-label="Zoom level"
                    className="flex-1 accent-[var(--accent-primary)] cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoom + 0.15)}
                    aria-label="Zoom in"
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--text-main)] hover:border-[var(--accent-primary)] cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Rotate 90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] border-t border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[var(--accent-border)] text-xs font-semibold text-[var(--text-main)] hover:bg-neutral-200/40 dark:hover:bg-white/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!imgEl || Boolean(loadError)}
            onClick={handleApplyCrop}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
