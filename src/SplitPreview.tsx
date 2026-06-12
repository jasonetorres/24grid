import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LayoutDef, Clip, PanelRect } from './types';
import { useCanvasPreview } from './useCanvasPreview';
import PanelResizer from './PanelResizer';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export const DIMS: Record<AspectRatio, { cw: number; ch: number; paddingTop: string; label: string }> = {
  '16:9': { cw: 1280, ch: 720,  paddingTop: '56.25%',  label: '1280×720'  },
  '9:16': { cw: 720,  ch: 1280, paddingTop: '177.78%', label: '720×1280'  },
  '1:1':  { cw: 720,  ch: 720,  paddingTop: '100%',    label: '720×720'   },
  '4:5':  { cw: 720,  ch: 900,  paddingTop: '125%',    label: '720×900'   },
};

interface Props {
  layout: LayoutDef | null;
  panels: PanelRect[];
  onPanelsChange?: (p: PanelRect[]) => void;
  slotClips: (Clip | null)[];
  delays: number[];
  draggingClipId: string | null;
  onDropClip: (slotIndex: number, clipId: string) => void;
  onClearSlot: (slotIndex: number) => void;
  isPlaying: boolean;
  resizable?: boolean;
  aspectRatio?: AspectRatio;
  className?: string;
}

export interface SplitPreviewHandle {
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
}

const MAX_SLOTS = 8;

const panelVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.92 },
};

const springTransition = { type: 'spring' as const, stiffness: 100, damping: 15 };

const SplitPreview = forwardRef<SplitPreviewHandle, Props>(
  (
    {
      layout,
      panels,
      onPanelsChange,
      slotClips,
      delays,
      draggingClipId,
      onDropClip,
      onClearSlot,
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
    const timeoutRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>(Array(MAX_SLOTS).fill(null));
    const [hoverSlot, setHoverSlot] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({ videoRefs }));

    const canvasRef = useCanvasPreview({
      layout: layout ? { ...layout, panels } : null,
      videoRefs,
      activeSlots,
      canvasWidth: cw,
      canvasHeight: ch,
    });

    // Handle play/pause with delays
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
        timeoutRefs.current.forEach((t) => { if (t !== null) clearTimeout(t); });
        timeoutRefs.current = Array(MAX_SLOTS).fill(null);
        activeSlots.current = Array(MAX_SLOTS).fill(true);
        videoRefs.current.forEach((v) => { if (v?.src) v.pause(); });
      }
    }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (!isPlaying) return;
      timeoutRefs.current.forEach((t) => { if (t !== null) clearTimeout(t); });
      timeoutRefs.current = Array(MAX_SLOTS).fill(null);
    }, [delays]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => {
      timeoutRefs.current.forEach((t) => { if (t !== null) clearTimeout(t); });
    }, []);

    // Sync clip sources
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

    const handleDrop = useCallback(
      (e: React.DragEvent, i: number) => {
        e.preventDefault();
        setHoverSlot(null);
        if (draggingClipId) onDropClip(i, draggingClipId);
      },
      [draggingClipId, onDropClip]
    );

    return (
      <div className={className}>
        {/* Hidden video elements */}
        <div className="hidden">
          {Array.from({ length: MAX_SLOTS }).map((_, i) => (
            <video
              key={i}
              ref={(el) => { videoRefs.current[i] = el; }}
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ))}
        </div>

        {/* Canvas container — entrance animation on mount */}
        <motion.div
          key={aspectRatio}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="relative w-full rounded-xl overflow-hidden border border-gray-800 shadow-2xl bg-black"
          style={{ paddingTop }}
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
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {panels.map((panel, i) => {
                  const isHover = hoverSlot === i;
                  const isDragging = !!draggingClipId;
                  const hasClip = !!slotClips[i];

                  return (
                    <motion.div
                      key={`${layout.id}-${i}`}
                      layout
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={springTransition}
                      className="absolute group"
                      style={{
                        left: `calc(${panel.x * 100}% + 2px)`,
                        top: `calc(${panel.y * 100}% + 2px)`,
                        width: `calc(${panel.w * 100}% - 4px)`,
                        height: `calc(${panel.h * 100}% - 4px)`,
                      }}
                      onDragOver={(e) => { e.preventDefault(); setHoverSlot(i); }}
                      onDragLeave={() => setHoverSlot(null)}
                      onDrop={(e) => handleDrop(e, i)}
                    >
                      {isDragging && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute inset-0 border-2 rounded pointer-events-none transition-colors duration-100 ${
                            isHover ? 'border-amber-400 bg-amber-400/20' : 'border-amber-400/40 bg-amber-400/5'
                          }`}
                        >
                          {isHover && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-amber-400 text-xs font-bold bg-black/70 px-2 py-1 rounded">
                                Drop here
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {!isDragging && hasClip && (
                        <button
                          onClick={() => onClearSlot(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-red-500 rounded-full text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all leading-none z-10"
                          title="Remove clip"
                        >
                          ×
                        </button>
                      )}
                    </motion.div>
                  );
                })}

                {resizable && !draggingClipId && onPanelsChange && (
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
