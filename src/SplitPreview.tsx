import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { LayoutDef, Clip, PanelRect } from './types';
import { useCanvasPreview } from './useCanvasPreview';
import PanelResizer from './PanelResizer';

const DIMS: Record<'16:9' | '9:16', { cw: number; ch: number; paddingTop: string }> = {
  '16:9': { cw: 1280, ch: 720,  paddingTop: '56.25%' },
  '9:16': { cw: 720,  ch: 1280, paddingTop: '177.78%' },
};

interface Props {
  layout: LayoutDef | null;
  panels: PanelRect[];           // controlled — caller owns panel geometry
  onPanelsChange?: (p: PanelRect[]) => void;
  slotClips: (Clip | null)[];
  offsets: number[];             // per-slot start-time in seconds
  draggingClipId: string | null;
  onDropClip: (slotIndex: number, clipId: string) => void;
  onClearSlot: (slotIndex: number) => void;
  isPlaying: boolean;
  resizable?: boolean;
  aspectRatio?: '16:9' | '9:16';
  className?: string;
}

export interface SplitPreviewHandle {
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
}

const SplitPreview = forwardRef<SplitPreviewHandle, Props>(
  (
    {
      layout,
      panels,
      onPanelsChange,
      slotClips,
      offsets,
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
    const MAX_SLOTS = 8;
    const videoRefs = useRef<(HTMLVideoElement | null)[]>(Array(MAX_SLOTS).fill(null));
    const [hoverSlot, setHoverSlot] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({ videoRefs }));

    const canvasRef = useCanvasPreview({ layout: layout ? { ...layout, panels } : null, videoRefs, canvasWidth: cw, canvasHeight: ch });

    // Sync play / pause with per-slot start offsets
    useEffect(() => {
      videoRefs.current.forEach((v) => {
        if (!v || !v.src) return;
        if (isPlaying) {
          // Only reset to offset when starting playback, not on every render
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, [isPlaying]);

    // Sync clip sources; seek to offset when a new source is loaded
    useEffect(() => {
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        const src = slotClips[i]?.url ?? '';
        if (v.getAttribute('data-src') !== src) {
          v.setAttribute('data-src', src);
          v.src = src;
          if (src) {
            v.load();
            v.addEventListener('loadedmetadata', () => {
              v.currentTime = offsets[i] ?? 0;
              if (isPlaying) v.play().catch(() => {});
            }, { once: true });
          }
        }
      });
    }, [slotClips]); // eslint-disable-line react-hooks/exhaustive-deps

    // Apply offset changes to paused videos immediately
    useEffect(() => {
      videoRefs.current.forEach((v, i) => {
        if (!v || !v.src || isPlaying) return;
        v.currentTime = offsets[i] ?? 0;
      });
    }, [offsets, isPlaying]);

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
        {/* Hidden video elements — always rendered, indexed 0–7 */}
        <div className="hidden">
          {Array.from({ length: MAX_SLOTS }).map((_, i) => (
            <video
              key={i}
              ref={(el) => { videoRefs.current[i] = el; }}
              muted
              loop
              playsInline
            />
          ))}
        </div>

        {/* Canvas wrapper — padding-top trick keeps aspect ratio regardless of canvas px size */}
        <div
          className="relative w-full rounded-xl overflow-hidden border border-gray-800 shadow-2xl bg-black"
          style={{ paddingTop }}
        >
          <canvas
            ref={canvasRef}
            width={cw}
            height={ch}
            className="absolute inset-0 w-full h-full"
          />

          {layout && (
            <div className="absolute inset-0">
              {/* Drop / clear overlays per panel */}
              {panels.map((panel, i) => {
                const isHover = hoverSlot === i;
                const isDragging = !!draggingClipId;
                const hasClip = !!slotClips[i];
                return (
                  <div
                    key={i}
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
                      <div
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
                      </div>
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
                  </div>
                );
              })}

              {/* Resize handles — only when resizable and not dragging a clip */}
              {resizable && !draggingClipId && onPanelsChange && (
                <PanelResizer panels={panels} onChange={onPanelsChange} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

SplitPreview.displayName = 'SplitPreview';
export default SplitPreview;
