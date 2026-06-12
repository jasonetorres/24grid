import { useRef, useEffect } from 'react';
import type { LayoutDef, PanelRect, CropSettings } from './types';

const GAP = 3;

interface Props {
  layout: LayoutDef | null;
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  activeSlots: React.MutableRefObject<boolean[]>;
  crops: React.MutableRefObject<CropSettings[]>;
  canvasWidth: number;
  canvasHeight: number;
}

export function useCanvasPreview({ layout, videoRefs, activeSlots, crops, canvasWidth, canvasHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({ layout, videoRefs, activeSlots, crops, canvasWidth, canvasHeight });
  useEffect(() => {
    stateRef.current = { layout, videoRefs, activeSlots, crops, canvasWidth, canvasHeight };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId = 0;

    function drawPanel(
      ctx: CanvasRenderingContext2D,
      panel: PanelRect,
      video: HTMLVideoElement | null | undefined,
      isActive: boolean,
      crop: CropSettings,
      cw: number,
      ch: number,
      slotIndex: number
    ) {
      const px = Math.round(panel.x * cw + GAP / 2);
      const py = Math.round(panel.y * ch + GAP / 2);
      const pw = Math.round(panel.w * cw - GAP);
      const ph = Math.round(panel.h * ch - GAP);

      if (!isActive) {
        ctx.fillStyle = '#000';
        ctx.fillRect(px, py, pw, ph);
      } else if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const vW = video.videoWidth;
        const vH = video.videoHeight;
        const vr = vW / vH;
        const pr = pw / ph;

        // Cover-fit base crop
        let baseSw: number, baseSh: number;
        if (vr > pr) {
          baseSw = vH * pr;
          baseSh = vH;
        } else {
          baseSw = vW;
          baseSh = vW / pr;
        }

        // Apply zoom (shrink source rect → appears zoomed in)
        const sw = baseSw / crop.zoom;
        const sh = baseSh / crop.zoom;

        // Apply pan — clamp so we never read outside the video frame
        const maxPanX = (vW - sw) / 2;
        const maxPanY = (vH - sh) / 2;
        const sx = Math.max(0, Math.min(vW - sw, (vW - sw) / 2 + crop.panX * vW));
        const sy = Math.max(0, Math.min(vH - sh, (vH - sh) / 2 + crop.panY * vH));

        // Clamp pan magnitudes for reference (unused but kept for clarity)
        void maxPanX; void maxPanY;

        try {
          ctx.drawImage(video, sx, sy, sw, sh, px, py, pw, ph);
        } catch {
          drawPlaceholder(ctx, px, py, pw, ph, slotIndex);
        }
      } else {
        drawPlaceholder(ctx, px, py, pw, ph, slotIndex);
      }

      ctx.strokeStyle = '#000';
      ctx.lineWidth = GAP;
      ctx.strokeRect(px, py, pw, ph);
    }

    function drawPlaceholder(
      ctx: CanvasRenderingContext2D,
      px: number, py: number, pw: number, ph: number,
      slotIndex: number
    ) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const spacing = 24;
      for (let x = px; x < px + pw; x += spacing) {
        ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke();
      }
      for (let y = py; y < py + ph; y += spacing) {
        ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke();
      }

      const fontSize = Math.max(12, Math.min(pw, ph) * 0.18);
      ctx.fillStyle = '#334155';
      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(slotIndex + 1), px + pw / 2, py + ph / 2);

      const labelSize = Math.max(9, fontSize * 0.35);
      ctx.fillStyle = '#1e3a5f';
      ctx.font = `500 ${labelSize}px Inter, system-ui, sans-serif`;
      ctx.fillText('drop clip here', px + pw / 2, py + ph / 2 + fontSize * 0.75);
    }

    function render() {
      const { layout: l, videoRefs: vr, activeSlots: as, crops: cr, canvasWidth: cw, canvasHeight: ch } = stateRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafId = requestAnimationFrame(render); return; }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);

      if (l) {
        l.panels.forEach((panel, i) => {
          drawPanel(ctx, panel, vr.current[i], as.current[i] ?? true, cr.current[i] ?? { panX: 0, panY: 0, zoom: 1 }, cw, ch, i);
        });
      }

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return canvasRef;
}
