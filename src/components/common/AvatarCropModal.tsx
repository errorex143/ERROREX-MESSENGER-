import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Check } from 'lucide-react';

interface AvatarCropModalProps {
  imageSrc: string | null;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CROP_VIEW_SIZE = 260;
const OUTPUT_SIZE = 400;

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  imageSrc,
  onConfirm,
  onCancel
}) => {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

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

  const baseScale = imgEl
    ? Math.max(CROP_VIEW_SIZE / imgEl.naturalWidth, CROP_VIEW_SIZE / imgEl.naturalHeight)
    : 1;

  const effectiveScale = baseScale * zoom;

  const clampOffset = (nx: number, ny: number, currentZoom = zoom) => {
    if (!imgEl) return { x: nx, y: ny };
    const swapped = rotation % 180 !== 0;
    const w = (swapped ? imgEl.naturalHeight : imgEl.naturalWidth) * baseScale * currentZoom;
    const h = (swapped ? imgEl.naturalWidth : imgEl.naturalHeight) * baseScale * currentZoom;
    const maxX = Math.max(0, (w - CROP_VIEW_SIZE) / 2);
    const maxY = Math.max(0, (h - CROP_VIEW_SIZE) / 2);
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

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!imgEl) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ratio = OUTPUT_SIZE / CROP_VIEW_SIZE;
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      const drawW = imgEl.naturalWidth * effectiveScale * ratio;
      const drawH = imgEl.naturalHeight * effectiveScale * ratio;
      ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
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
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden text-[var(--text-main)]"
      >
        <div className="sm:hidden pt-2.5 pb-1 bg-[var(--bg-card)] flex justify-center">
          <div className="w-10 h-1 rounded-full bg-neutral-400/40" />
        </div>

        <div className="px-4 py-3.5 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">Crop Profile Picture</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Drag to position, zoom or rotate before saving</p>
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

        <div className="p-5 flex flex-col items-center gap-4">
          {loadError ? (
            <div className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 text-center">
              {loadError}
            </div>
          ) : (
            <>
              {/* Square Crop Stage with Circular Guide */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ width: CROP_VIEW_SIZE, height: CROP_VIEW_SIZE }}
                className="relative rounded-2xl overflow-hidden bg-neutral-950 border border-[var(--accent-border)] touch-none select-none cursor-grab active:cursor-grabbing shadow-inner"
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

                {/* Dimmed overlay outside circular DP frame */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at center, transparent 48%, rgba(0, 0, 0, 0.58) 49%)'
                  }}
                />
                <div className="absolute inset-2 rounded-full border-2 border-dashed border-[var(--accent-primary)]/85 pointer-events-none" />
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
                    onClick={() => setRotation(r => (r + 90) % 360)}
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

        <div className="px-4 py-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] border-t border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center gap-2.5">
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
            <span>Apply DP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
