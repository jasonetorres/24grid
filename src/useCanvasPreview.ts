import { useRef, useEffect } from 'react';
import type { LayoutDef, PanelRect } from './types';

const GAP = 3;

interface Props {
  layout: LayoutDef | null;
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  activeSlots: React.MutableRefObject<boolean[]>; // false = still in delay countdown, draw black
  canvasWidth: number;
  canvasHeight: number;
}

export function useCanvasPreview({ layout, videoRefs, activeSlots, canvasWidth, canvasHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({ layout, videoRefs, activeSlots, canvasWidth, canvasHeight });
  useEffect(() => {
    stateRef.current = { layout, videoRefs, activeSlots, canvasWidth, canvasHeight };
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
      cw: number,
      ch: number,
      slotIndex: number
    ) {
      const px = Math.round(panel.x * cw + GAP / 2);
      const py = Math.round(panel.y * ch + GAP / 2);
      const pw = Math.round(panel.w * cw - GAP);
      const ph = Math.round(panel.h * ch - GAP);

      if (!isActive) {
        // Slot is in its delay countdown — show pure black
        ctx.fillStyle = '#000';
        ctx.fillRect(px, py, pw, ph);
      } else if (video && video.readyState >= 2 && video.videoWidth > 0) {
        // cover-fit
        const vr = video.videoWidth / video.videoHeight;
        const pr = pw / ph;
        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
        if (vr > pr) {
          sw = video.videoHeight * pr;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = video.videoWidth / pr;
          sy = (video.videoHeight - sh) / 2;
        }
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
      const { layout: l, videoRefs: vr, activeSlots: as, canvasWidth: cw, canvasHeight: ch } = stateRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafId = requestAnimationFrame(render); return; }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);

      if (l) {
        l.panels.forEach((panel, i) => {
          drawPanel(ctx, panel, vr.current[i], as.current[i] ?? true, cw, ch, i);
        });
      }

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return canvasRef;
}
