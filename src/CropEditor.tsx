import { useRef, useEffect, useCallback, useState } from 'react';
import { X, RotateCcw, ZoomIn } from 'lucide-react';
import type { CropSettings } from './types';

interface Props {
  slotIndex: number;
  clipName: string;
  videoEl: HTMLVideoElement | null;
  panelAspect: number; // pw / ph of the destination panel
  crop: CropSettings;
  onChange: (crop: CropSettings) => void;
  onClose: () => void;
}

const EDITOR_W = 320;

export default function CropEditor({ slotIndex, clipName, videoEl, panelAspect, crop, onChange, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cropRef = useRef(crop);
  const [localCrop, setLocalCrop] = useState(crop);

  const EDITOR_H = Math.round(EDITOR_W / Math.max(panelAspect, 0.5));

  // Keep cropRef in sync (used inside RAF and event handlers)
  useEffect(() => {
    cropRef.current = localCrop;
    onChange(localCrop);
  }, [localCrop, onChange]);

  // Sync external crop into local state (e.g. reset)
  useEffect(() => {
    setLocalCrop(crop);
  }, [crop.panX, crop.panY, crop.zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw the video with the current crop applied onto the mini canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId = 0;

    function draw() {
      const ctx = canvas!.getContext('2d');
      if (!ctx) { rafId = requestAnimationFrame(draw); return; }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, EDITOR_W, EDITOR_H);

      const v = videoEl;
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        const vW = v.videoWidth;
        const vH = v.videoHeight;
        const vr = vW / vH;
        const pr = panelAspect;

        let baseSw: number, baseSh: number;
        if (vr > pr) {
          baseSw = vH * pr;
          baseSh = vH;
        } else {
          baseSw = vW;
          baseSh = vW / pr;
        }

        const c = cropRef.current;
        const sw = baseSw / c.zoom;
        const sh = baseSh / c.zoom;
        const sx = Math.max(0, Math.min(vW - sw, (vW - sw) / 2 + c.panX * vW));
        const sy = Math.max(0, Math.min(vH - sh, (vH - sh) / 2 + c.panY * vH));

        try {
          ctx.drawImage(v, sx, sy, sw, sh, 0, 0, EDITOR_W, EDITOR_H);
        } catch { /* no-op */ }

        // Crosshair at center
        ctx.strokeStyle = 'rgba(251,191,36,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(EDITOR_W / 2, 0); ctx.lineTo(EDITOR_W / 2, EDITOR_H);
        ctx.moveTo(0, EDITOR_H / 2); ctx.lineTo(EDITOR_W, EDITOR_H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, EDITOR_W, EDITOR_H);
        ctx.fillStyle = '#334155';
        ctx.font = '500 13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No video loaded', EDITOR_W / 2, EDITOR_H / 2);
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [videoEl, panelAspect, EDITOR_H]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setLocalCrop(prev => {
      // Dragging right → show more right content → panX increases
      // Scale the pixel drag by editor size and inverse zoom for precision at high zoom
      const scale = 0.5 / prev.zoom;
      return {
        ...prev,
        panX: Math.max(-0.5, Math.min(0.5, prev.panX + (dx / EDITOR_W) * scale)),
        panY: Math.max(-0.5, Math.min(0.5, prev.panY + (dy / EDITOR_H) * scale)),
      };
    });
  }, [EDITOR_H]);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // Touch support
  const lastTouch = useRef({ x: 0, y: 0 });
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - lastTouch.current.x;
    const dy = e.touches[0].clientY - lastTouch.current.y;
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setLocalCrop(prev => ({
      ...prev,
      panX: Math.max(-0.5, Math.min(0.5, prev.panX + (dx / EDITOR_W) * 0.5 / prev.zoom)),
      panY: Math.max(-0.5, Math.min(0.5, prev.panY + (dy / EDITOR_H) * 0.5 / prev.zoom)),
    }));
  }, [EDITOR_H]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setLocalCrop(prev => ({
      ...prev,
      zoom: Math.max(1, Math.min(4, prev.zoom - e.deltaY * 0.005)),
    }));
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const reset = () => setLocalCrop({ panX: 0, panY: 0, zoom: 1 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: EDITOR_W + 32 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div>
            <p className="text-xs font-bold text-white">Crop & Pan — Slot {slotIndex + 1}</p>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{clipName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drag canvas */}
        <div className="px-4 pt-3">
          <p className="text-xs text-gray-600 mb-2">Drag to pan · Scroll to zoom</p>
          <canvas
            ref={canvasRef}
            width={EDITOR_W}
            height={EDITOR_H}
            className="rounded-lg w-full cursor-grab active:cursor-grabbing border border-gray-800"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onWheel={onWheel}
            style={{ touchAction: 'none', display: 'block' }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center gap-3">
            <ZoomIn className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-amber-400/30 rounded-full pointer-events-none"
                style={{ width: `${((localCrop.zoom - 1) / 3) * 100}%` }}
              />
              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={localCrop.zoom}
                onChange={e => setLocalCrop(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ margin: 0 }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 border-2 border-gray-950 shadow pointer-events-none"
                style={{ left: `calc(${((localCrop.zoom - 1) / 3) * 100}% - 6px)` }}
              />
            </div>
            <span className="text-xs text-gray-400 font-mono tabular-nums w-10 text-right">
              {localCrop.zoom.toFixed(2)}×
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
