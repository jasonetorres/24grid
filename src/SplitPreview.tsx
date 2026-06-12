import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crop, Columns2, Rows2 } from 'lucide-react';
import type { LayoutDef, Clip, PanelRect, CropSettings } from './types';
import { useCanvasPreview } from './useCanvasPreview';
import PanelResizer from './PanelResizer';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export const DIMS: Record<AspectRatio, { cw: number; ch: number; paddingTop: string; label: string }> = {
  '16:9': { cw: 1280, ch: 720,  paddingTop: '56.25%',  label: '1280×720'  },
  '9:16': { cw: 720,  ch: 1280, paddingTop: '177.78%', label: '720×1280'  },
  '1:1':  { cw: 720,  ch: 720,  paddingTop: '100%',    label: '720×720'   },
  '4:5':  { cw: 720,  ch: 900,  paddingTop: '125%',    label: '720×900'   },
};

type DragType = 'move' | 'tl' | 'tr' | 'bl' | 'br';

interface PanelDragState {
  type: DragType;
  panelIndex: number;
  startClientX: number;
  startClientY: number;
  startPanel: PanelRect;
}

interface Props {
  layout: LayoutDef | null;
  panels: PanelRect[];
  onPanelsChange?: (p: PanelRect[]) => void;
  slotClips: (Clip | null)[];
  delays: number[];
  crops: CropSettings[];
  draggingClipId: string | null;
  onDropClip: (slotIndex: number, clipId: string) => void;
  onClearSlot: (slotIndex: number) => void;
  onCropClick?: (slotIndex: number) => void;
  onSplitPanel?: (slotIndex: number, dir: 'h' | 'v') => void;
  tapSelectedClipId?: string | null;
  onTapSlot?: (slotIndex: number) => void;
  isPlaying: boolean;
  resizable?: boolean;
  aspectRatio?: AspectRatio;
  className?: string;
}

export interface SplitPreviewHandle {
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
}

const MAX_SLOTS = 8;
const MIN_PANEL = 0.08;
const springTransition = { type: 'spring' as const, stiffness: 100, damping: 15 };

const CORNER_CURSORS: Record<DragType, string> = {
  move: 'grab',
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  br: 'nwse-resize',
};

function computeNewPanel(drag: PanelDragState, dx: number, dy: number): PanelRect {
  const { type, startPanel: p } = drag;
  if (type === 'move') {
    return {
      ...p,
      x: Math.max(0, Math.min(1 - p.w, p.x + dx)),
      y: Math.max(0, Math.min(1 - p.h, p.y + dy)),
    };
  }
  if (type === 'tl') {
    const newX = Math.max(0, Math.min(p.x + p.w - MIN_PANEL, p.x + dx));
    const newY = Math.max(0, Math.min(p.y + p.h - MIN_PANEL, p.y + dy));
    return { x: newX, y: newY, w: p.x + p.w - newX, h: p.y + p.h - newY };
  }
  if (type === 'tr') {
    const newY = Math.max(0, Math.min(p.y + p.h - MIN_PANEL, p.y + dy));
    return { ...p, y: newY, w: Math.max(MIN_PANEL, Math.min(1 - p.x, p.w + dx)), h: p.y + p.h - newY };
  }
  if (type === 'bl') {
    const newX = Math.max(0, Math.min(p.x + p.w - MIN_PANEL, p.x + dx));
    return { ...p, x: newX, w: p.x + p.w - newX, h: Math.max(MIN_PANEL, Math.min(1 - p.y, p.h + dy)) };
  }
  // br
  return { ...p, w: Math.max(MIN_PANEL, Math.min(1 - p.x, p.w + dx)), h: Math.max(MIN_PANEL, Math.min(1 - p.y, p.h + dy)) };
}

const SplitPreview = forwardRef<SplitPreviewHandle, Props>(
  (
    {
      layout,
      panels,
      onPanelsChange,
      slotClips,
      delays,
      crops,
      draggingClipId,
      onDropClip,
      onClearSlot,
      onCropClick,
      onSplitPanel,
      tapSelectedClipId,
      onTapSlot,
      isPlaying,
      resizable = false,
      aspectRatio = '16:9',
      className,
    },
    ref
  ) => {
    const { cw, ch, paddingTop } = DIMS[aspectRatio];
    const videoRefs = useRef<(HTMLVideoElement | null)[]>(Array(MAX_SLOTS).fill(null));
    const activeSlots = useRef<boolean[]>(Array(MAX_SLOTS).fill(true));
    const cropsRef = useRef<CropSettings[]>(crops);
    const timeoutRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>(Array(MAX_SLOTS).fill(null));
    const containerRef = useRef<HTMLDivElement>(null);
    const panelDragRef = useRef<PanelDragState | null>(null);
    const [hoverSlot, setHoverSlot] = useState<number | null>(null);
    const [draggingPanelIdx, setDraggingPanelIdx] = useState<number | null>(null);

    useEffect(() => { cropsRef.current = crops; }, [crops]);
    useImperativeHandle(ref, () => ({ videoRefs }));

    const canvasRef = useCanvasPreview({
      layout: layout ? { ...layout, panels } : null,
      videoRefs,
      activeSlots,
      crops: cropsRef,
      canvasWidth: cw,
      canvasHeight: ch,
    });

    // Play/pause with delays
    useEffect(() => {
      if (isPlaying) {
        videoRefs.current.forEach((v, i) => {
          if (!v?.src) return;
          const delay = delays[i] ?? 0;
          if (delay > 0) {
            activeSlots.current[i] = false;
            v.pause();
            timeoutRefs.current[i] = setTimeout(() => {
              activeSlots.current[i] = true;
              v.currentTime = 0;
              v.play().catch(() => {});
            }, delay * 1000);
          } else {
            activeSlots.current[i] = true;
            v.currentTime = 0;
            v.play().catch(() => {});
          }
        });
      } else {
        timeoutRefs.current.forEach(t => { if (t !== null) clearTimeout(t); });
        timeoutRefs.current = Array(MAX_SLOTS).fill(null);
        activeSlots.current = Array(MAX_SLOTS).fill(true);
        videoRefs.current.forEach(v => { if (v?.src) v.pause(); });
      }
    }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (!isPlaying) return;
      timeoutRefs.current.forEach(t => { if (t !== null) clearTimeout(t); });
      timeoutRefs.current = Array(MAX_SLOTS).fill(null);
    }, [delays]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => {
      timeoutRefs.current.forEach(t => { if (t !== null) clearTimeout(t); });
    }, []);

    useEffect(() => {
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        const src = slotClips[i]?.url ?? '';
        if (v.getAttribute('data-src') !== src) {
          v.setAttribute('data-src', src);
          v.src = src;
          if (src) v.load();
        }
      });
    }, [slotClips]);

    const handleDrop = useCallback((e: React.DragEvent, i: number) => {
      e.preventDefault();
      setHoverSlot(null);
      if (draggingClipId) onDropClip(i, draggingClipId);
    }, [draggingClipId, onDropClip]);

    // ── Panel drag handlers ──────────────────────────────────────────────────
    function startPanelDrag(e: React.PointerEvent, index: number, type: DragType) {
      if (!onPanelsChange || !resizable) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      panelDragRef.current = {
        type,
        panelIndex: index,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanel: { ...panels[index] },
      };
      setDraggingPanelIdx(index);
    }

    function onPanelPointerMove(e: React.PointerEvent) {
      if (!panelDragRef.current || !containerRef.current || !onPanelsChange) return;
      const drag = panelDragRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = (e.clientX - drag.startClientX) / rect.width;
      const dy = (e.clientY - drag.startClientY) / rect.height;
      const newPanel = computeNewPanel(drag, dx, dy);
      const updated = panels.map((p, i) => i === drag.panelIndex ? newPanel : p);
      onPanelsChange(updated);
    }

    function onPanelPointerUp() {
      panelDragRef.current = null;
      setDraggingPanelIdx(null);
    }

    // ────────────────────────────────────────────────────────────────────────

    return (
      <div className={className}>
        <div className="hidden">
          {Array.from({ length: MAX_SLOTS }).map((_, i) => (
            <video
              key={i}
              ref={el => { videoRefs.current[i] = el; }}
              muted loop playsInline
              className="w-full h-full object-cover"
            />
          ))}
        </div>

        <motion.div
          ref={containerRef}
          animate={{ paddingTop }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="relative w-full rounded-xl overflow-hidden border border-gray-800 shadow-2xl bg-black"
        >
          <canvas
            ref={canvasRef}
            width={cw}
            height={ch}
            className="absolute inset-0 w-full h-full"
          />

          <AnimatePresence mode="sync">
            {layout && (
              <motion.div
                key={layout.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                {panels.map((panel, i) => {
                  const isHover = hoverSlot === i;
                  const isClipDragging = !!draggingClipId;
                  const hasClip = !!slotClips[i];
                  const hasCrop = crops[i] && (crops[i].zoom > 1 || crops[i].panX !== 0 || crops[i].panY !== 0);
                  const isPanelBeingDragged = draggingPanelIdx === i;

                  return (
                    <motion.div
                      key={`${layout.id}-${i}`}
                      // Disable layout animation while this panel is being dragged
                      layout={!isPanelBeingDragged}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={springTransition}
                      className="absolute group"
                      style={{
                        left:   `calc(${panel.x * 100}% + 2px)`,
                        top:    `calc(${panel.y * 100}% + 2px)`,
                        width:  `calc(${panel.w * 100}% - 4px)`,
                        height: `calc(${panel.h * 100}% - 4px)`,
                        // Bring overlapping panels to front via z-index
                        zIndex: i,
                      }}
                      onDragOver={e => { e.preventDefault(); setHoverSlot(i); }}
                      onDragLeave={() => setHoverSlot(null)}
                      onDrop={e => handleDrop(e, i)}
                    >
                      {/* Entrance flash */}
                      <motion.div
                        key={`flash-${layout.id}-${i}`}
                        className="absolute inset-0 rounded pointer-events-none"
                        initial={{ opacity: 1, backgroundColor: 'rgba(251,191,36,0.28)' }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.06 }}
                      />

                      {/* Drag-to-move handle — covers panel body, below buttons */}
                      {resizable && onPanelsChange && !isClipDragging && (
                        <div
                          className="absolute inset-0 z-0"
                          style={{ cursor: isPanelBeingDragged ? 'grabbing' : 'grab' }}
                          title="Drag to move panel"
                          onPointerDown={e => startPanelDrag(e, i, 'move')}
                          onPointerMove={onPanelPointerMove}
                          onPointerUp={onPanelPointerUp}
                          onPointerCancel={onPanelPointerUp}
                        />
                      )}

                      {/* Clip drop zone highlight */}
                      {isClipDragging && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute inset-0 border-2 rounded pointer-events-none transition-colors duration-100 ${
                            isHover ? 'border-amber-400 bg-amber-400/20' : 'border-amber-400/40 bg-amber-400/5'
                          }`}
                        >
                          {isHover && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-amber-400 text-xs font-bold bg-black/70 px-2 py-1 rounded">
                                Drop here
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Tap-to-place overlay (mobile) */}
                      {tapSelectedClipId && !hasClip && !isClipDragging && (
                        <div
                          className="absolute inset-0 border-2 border-dashed border-amber-400 rounded flex items-center justify-center cursor-pointer z-10"
                          style={{ background: 'rgba(251,191,36,0.12)' }}
                          onClick={() => onTapSlot?.(i)}
                        >
                          <span className="text-amber-400 text-xs font-bold bg-black/60 px-2 py-1 rounded">
                            Tap to place
                          </span>
                        </div>
                      )}

                      {/* Action buttons (top-right) */}
                      {!isClipDragging && (
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                          {onSplitPanel && (
                            <>
                              <button
                                onClick={() => onSplitPanel(i, 'h')}
                                className="w-6 h-6 bg-black/70 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Split left/right"
                              >
                                <Columns2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onSplitPanel(i, 'v')}
                                className="w-6 h-6 bg-black/70 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Split top/bottom"
                              >
                                <Rows2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {onCropClick && hasClip && (
                            <button
                              onClick={() => onCropClick(i)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                hasCrop ? 'bg-amber-400 text-black' : 'bg-black/70 hover:bg-amber-400 text-white hover:text-black'
                              }`}
                              title="Crop & Pan"
                            >
                              <Crop className="w-3 h-3" />
                            </button>
                          )}
                          {hasClip && (
                            <button
                              onClick={() => onClearSlot(i)}
                              className="w-6 h-6 bg-black/70 hover:bg-red-500 rounded-full text-white text-sm flex items-center justify-center leading-none"
                              title="Remove clip"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )}

                      {/* Corner resize handles */}
                      {resizable && onPanelsChange && !isClipDragging && (
                        <>
                          {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
                            <div
                              key={corner}
                              className="absolute w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 rounded-sm"
                              style={{
                                background: 'rgba(251,191,36,0.8)',
                                cursor: CORNER_CURSORS[corner],
                                ...(corner === 'tl' ? { top: 0, left: 0 } :
                                    corner === 'tr' ? { top: 0, right: 0 } :
                                    corner === 'bl' ? { bottom: 0, left: 0 } :
                                                      { bottom: 0, right: 0 }),
                              }}
                              onPointerDown={e => { e.stopPropagation(); startPanelDrag(e, i, corner); }}
                              onPointerMove={onPanelPointerMove}
                              onPointerUp={onPanelPointerUp}
                              onPointerCancel={onPanelPointerUp}
                            />
                          ))}
                        </>
                      )}
                    </motion.div>
                  );
                })}

                {/* Edge divider resizer (only when no panel drag is active) */}
                {resizable && !draggingClipId && !draggingPanelIdx && onPanelsChange && (
                  <PanelResizer panels={panels} onChange={onPanelsChange} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }
);

SplitPreview.displayName = 'SplitPreview';
export default SplitPreview;
