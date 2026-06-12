import React, { useState, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  LayoutGrid,
  Film,
  ChevronRight,
  Tv2,
  CheckCircle2,
  Monitor,
  Smartphone,
  Clock,
} from 'lucide-react';
import type { Clip, LayoutDef, PanelRect } from './types';
import { LAYOUTS } from './layouts';
import LayoutPicker from './LayoutPicker';
import ClipLibrary from './ClipLibrary';
import SplitPreview, { type SplitPreviewHandle } from './SplitPreview';
import SlotTimingEditor from './SlotTimingEditor';
import LandingPage, { Logo } from './LandingPage';

type View = 'landing' | 'studio';
type Step = 'layout' | 'clips' | 'preview';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'layout',  label: 'Choose Layout',    icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'clips',   label: 'Add Clips',        icon: <Film className="w-4 h-4" /> },
  { id: 'preview', label: 'Preview & Export', icon: <Tv2 className="w-4 h-4" /> },
];

const EMPTY_SLOTS = Array(8).fill(null) as (Clip | null)[];
const EMPTY_OFFSETS = Array(8).fill(0) as number[];

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [step, setStep] = useState<Step>('layout');
  const [layout, setLayout] = useState<LayoutDef | null>(LAYOUTS[5]);
  const [panels, setPanels] = useState<PanelRect[]>(LAYOUTS[5].panels.map(p => ({ ...p })));
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [clips, setClips] = useState<Clip[]>([]);
  const [slotClips, setSlotClips] = useState<(Clip | null)[]>([...EMPTY_SLOTS]);
  const [offsets, setOffsets] = useState<number[]>([...EMPTY_OFFSETS]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showTiming, setShowTiming] = useState(false);
  const previewRef = useRef<SplitPreviewHandle>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  // Keep panels in sync when layout changes (but allow free edits after)
  function handleLayoutSelect(l: LayoutDef) {
    setLayout(l);
    setPanels(l.panels.map(p => ({ ...p })));
    setSlotClips([...EMPTY_SLOTS]);
    setOffsets([...EMPTY_OFFSETS]);
    setIsPlaying(false);
  }

  function handleAddClips(newClips: Clip[]) {
    setClips((prev) => [...prev, ...newClips]);
  }

  function handleRemoveClip(id: string) {
    setClips((prev) => prev.filter((c) => c.id !== id));
    setSlotClips((prev) => prev.map((c) => (c?.id === id ? null : c)));
  }

  const handleDropClip = useCallback(
    (slotIndex: number, clipId: string) => {
      const clip = clips.find((c) => c.id === clipId) ?? null;
      setSlotClips((prev) => { const n = [...prev]; n[slotIndex] = clip; return n; });
      // Reset offset when a new clip is dropped
      setOffsets((prev) => { const n = [...prev]; n[slotIndex] = 0; return n; });
    },
    [clips]
  );

  function handleClearSlot(i: number) {
    setSlotClips((prev) => { const n = [...prev]; n[i] = null; return n; });
    setOffsets((prev) => { const n = [...prev]; n[i] = 0; return n; });
  }

  function handleOffsetChange(i: number, val: number) {
    setOffsets((prev) => { const n = [...prev]; n[i] = val; return n; });
  }

  function handleResetLayout() {
    if (!layout) return;
    setPanels(layout.panels.map(p => ({ ...p })));
  }

  function handleReset() {
    setIsPlaying(false);
    const vids = previewRef.current?.videoRefs.current ?? [];
    vids.forEach((v, i) => {
      if (!v) return;
      v.pause();
      v.currentTime = offsets[i] ?? 0;
    });
  }

  async function handleExport() {
    if (!layout || isExporting) return;
    setIsExporting(true);
    setIsPlaying(false);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) { setIsExporting(false); return; }

    const assigned = panels.map((_, i) => slotClips[i]).filter(Boolean) as Clip[];
    const duration = Math.min(assigned.reduce((m, c) => Math.max(m, c.duration), 5), 60);
    const FPS = 30;
    const cw = canvas.width;
    const ch = canvas.height;

    try {
      const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: { codec: 'avc', width: cw, height: ch },
        fastStart: 'in-memory',
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error('VideoEncoder error', e),
      });
      encoder.configure({
        codec: 'avc1.4d0028',
        width: cw,
        height: ch,
        bitrate: 6_000_000,
        framerate: FPS,
      });

      // Start all videos from their offsets
      const vids = previewRef.current?.videoRefs.current ?? [];
      vids.forEach((v, i) => {
        if (!v?.src) return;
        v.currentTime = offsets[i] ?? 0;
        v.play().catch(() => {});
      });
      setIsPlaying(true);

      // Capture frames via rAF
      const totalFrames = Math.ceil(duration * FPS);
      let frameIndex = 0;

      await new Promise<void>((resolve) => {
        let lastCapture = performance.now();

        function captureFrame(now: number) {
          if (frameIndex >= totalFrames) { resolve(); return; }

          const elapsed = now - lastCapture;
          if (elapsed >= 1000 / FPS - 1) {
            lastCapture = now;
            const timestamp = Math.round((frameIndex / FPS) * 1_000_000); // microseconds
            const videoFrame = new VideoFrame(canvas, { timestamp });
            encoder.encode(videoFrame, { keyFrame: frameIndex % (FPS * 2) === 0 });
            videoFrame.close();
            frameIndex++;
          }
          requestAnimationFrame(captureFrame);
        }
        requestAnimationFrame(captureFrame);
      });

      vids.forEach((v) => { if (v) v.pause(); });
      setIsPlaying(false);

      await encoder.flush();
      muxer.finalize();

      const blob = new Blob([target.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splitscreen-${layout.id}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  }

  const slotCount = layout?.slots ?? 0;
  const filledSlots = panels.map((_, i) => slotClips[i]).filter(Boolean).length;

  // Check if any panel has been resized from its original layout values
  const isPanelsModified = layout
    ? panels.some((p, i) => {
        const orig = layout.panels[i];
        return !orig || Math.abs(p.x - orig.x) > 0.001 || Math.abs(p.y - orig.y) > 0.001 ||
          Math.abs(p.w - orig.w) > 0.001 || Math.abs(p.h - orig.h) > 0.001;
      })
    : false;

  const hasAnyOffset = offsets.some(o => o > 0);

  return (
    <>
      {view === 'landing' && <LandingPage onEnter={() => setView('studio')} />}
      {view === 'studio' && (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <button onClick={() => setView('landing')} className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <Logo />
        </button>
        <div className="flex-1" />

        {/* Aspect ratio toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-900 border border-gray-800 rounded-xl mr-3">
          {(['16:9', '9:16'] as const).map((ar) => {
            const active = aspectRatio === ar;
            return (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                title={ar === '16:9' ? 'Landscape 16:9' : 'Portrait 9:16'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  active ? 'bg-amber-400 text-black shadow' : 'text-gray-500 hover:text-gray-200'
                }`}
              >
                {ar === '16:9' ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                {ar}
              </button>
            );
          })}
        </div>

        <nav className="flex items-center gap-1">
          {STEPS.map((s, idx) => {
            const active = s.id === step;
            const done = idx < stepIndex;
            const canNav = idx <= stepIndex + 1 && layout !== null;
            return (
              <React.Fragment key={s.id}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />}
                <button
                  onClick={() => canNav && setStep(s.id)}
                  disabled={!canNav}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    active  ? 'bg-amber-400 text-black'
                    : done  ? 'text-amber-400 hover:bg-amber-400/10'
                    : canNav? 'text-gray-400 hover:text-white hover:bg-gray-800'
                            : 'text-gray-700 cursor-not-allowed'
                  }`}
                >
                  {done && !active ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.icon}
                  {s.label}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ════ STEP 1: Choose Layout ════ */}
        {step === 'layout' && (
          <div className="flex-1 overflow-y-auto px-8 py-10 flex flex-col items-center gap-8">
            <div className="w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-1">Choose your layout</h2>
              <p className="text-sm text-gray-500 mb-8">
                Inspired by the iconic split-screen style from{' '}
                <em className="not-italic font-semibold text-amber-400">24</em>.
                Pick how your clips will be arranged — you can resize panels freely afterwards.
              </p>
              <LayoutPicker selected={layout} onSelect={handleLayoutSelect} />
              {layout && (
                <div className="mt-8 p-5 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{layout.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {layout.description} · {layout.slots} slot{layout.slots !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep('clips')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold rounded-xl transition-colors whitespace-nowrap shadow-lg shadow-amber-400/20"
                  >
                    Add Clips <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {layout && (
              <div className="w-full max-w-2xl">
                <p className="text-xs text-gray-600 mb-2 uppercase tracking-widest font-semibold">Layout preview</p>
                <SplitPreview
                  ref={previewRef}
                  layout={layout}
                  panels={panels}
                  slotClips={slotClips}
                  offsets={offsets}
                  draggingClipId={null}
                  onDropClip={handleDropClip}
                  onClearSlot={handleClearSlot}
                  isPlaying={false}
                  aspectRatio={aspectRatio}
                />
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 2: Add Clips ════ */}
        {step === 'clips' && (
          <>
            <aside className="w-72 flex-shrink-0 border-r border-gray-800 p-5 flex flex-col gap-4 overflow-hidden">
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Clip Library</h3>
                <p className="text-xs text-gray-500">Add videos, then drag them onto the slots in the preview</p>
              </div>
              <div className="flex-1 min-h-0">
                <ClipLibrary
                  clips={clips}
                  onAdd={handleAddClips}
                  onRemove={handleRemoveClip}
                  draggingId={draggingId}
                  onDragStart={setDraggingId}
                  onDragEnd={() => setDraggingId(null)}
                />
              </div>
            </aside>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4">
              <div className="w-full max-w-3xl">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {layout?.label} — {filledSlots}/{slotCount} slots filled
                    </h3>
                    <p className="text-xs text-gray-500">
                      Drag clips onto slots · drag panel edges to resize
                      {isPanelsModified && (
                        <button
                          onClick={handleResetLayout}
                          className="ml-2 text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          reset layout
                        </button>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep('preview')}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold rounded-xl transition-colors shadow-lg shadow-amber-400/20"
                  >
                    Preview <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <SplitPreview
                  ref={previewRef}
                  layout={layout}
                  panels={panels}
                  onPanelsChange={setPanels}
                  slotClips={slotClips}
                  offsets={offsets}
                  draggingClipId={draggingId}
                  onDropClip={handleDropClip}
                  onClearSlot={handleClearSlot}
                  isPlaying={false}
                  resizable
                  aspectRatio={aspectRatio}
                />

                {/* Slot status pills */}
                {layout && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {panels.map((_, i) => {
                      const c = slotClips[i];
                      const off = offsets[i];
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            c ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                              : 'border-gray-800 text-gray-600'
                          }`}
                        >
                          <span className="font-bold">#{i + 1}</span>
                          <span className="max-w-[6rem] truncate">{c ? c.name : 'empty'}</span>
                          {c && off > 0 && (
                            <span className="text-amber-500 font-mono">
                              +{off.toFixed(1)}s
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Timing editor (inline, collapsible) */}
                {filledSlots > 0 && (
                  <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden">
                    <button
                      onClick={() => setShowTiming(p => !p)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Clip start times
                      {hasAnyOffset && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 text-xs">
                          custom
                        </span>
                      )}
                      <ChevronRight
                        className={`ml-auto w-3.5 h-3.5 transition-transform duration-200 ${showTiming ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {showTiming && (
                      <div className="px-4 pb-4">
                        <p className="text-xs text-gray-600 mb-3">
                          Drag each slider to set where in the clip playback begins.
                        </p>
                        <SlotTimingEditor
                          slotClips={slotClips}
                          panelCount={layout?.slots ?? 0}
                          offsets={offsets}
                          onChange={handleOffsetChange}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════ STEP 3: Preview & Export ════ */}
        {step === 'preview' && (
          <>
            <aside className="w-72 flex-shrink-0 border-r border-gray-800 p-5 flex flex-col gap-5 overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Playback</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold rounded-xl transition-colors shadow-lg shadow-amber-400/20"
                  >
                    {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Play</>}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
                    title="Restart from start offsets"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Clip start times */}
              <div className="border-t border-gray-800 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    Start Times
                  </h3>
                  {hasAnyOffset && (
                    <button
                      onClick={() => setOffsets([...EMPTY_OFFSETS])}
                      className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
                    >
                      clear all
                    </button>
                  )}
                </div>
                <SlotTimingEditor
                  slotClips={slotClips}
                  panelCount={layout?.slots ?? 0}
                  offsets={offsets}
                  onChange={handleOffsetChange}
                />
              </div>

              <div className="border-t border-gray-800 pt-5">
                <h3 className="text-sm font-bold text-white mb-1">Export</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Records canvas at 30 fps using H.264 and downloads an MP4 file. Max 60 seconds.
                </p>
                <button
                  onClick={handleExport}
                  disabled={isExporting || filledSlots === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors border border-gray-700"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Recording…' : 'Export MP4'}
                </button>
                {isExporting && (
                  <p className="text-xs text-amber-400 text-center mt-2 animate-pulse">Recording in progress…</p>
                )}
              </div>

              <div className="border-t border-gray-800 pt-5">
                <h3 className="text-sm font-bold text-white mb-3">Composition</h3>
                <div className="space-y-2">
                  {([
                    ['Layout', layout?.label],
                    ['Aspect', aspectRatio],
                    ['Output', aspectRatio === '16:9' ? '1280 × 720' : '720 × 1280'],
                    ['Slots', `${filledSlots} / ${slotCount} filled`],
                  ] as [string, string | undefined][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-gray-500">{k}</span>
                      <span className="text-gray-300 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                {isPanelsModified && (
                  <button
                    onClick={handleResetLayout}
                    className="mt-2 text-xs text-gray-600 hover:text-amber-400 transition-colors"
                  >
                    Reset panel sizes
                  </button>
                )}
              </div>

              <div className="border-t border-gray-800 pt-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">Slots</h3>
                  <button onClick={() => setStep('clips')} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                    ← Edit
                  </button>
                </div>
                <div className="space-y-1.5">
                  {panels.map((_, i) => {
                    const c = slotClips[i];
                    const off = offsets[i];
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        {c ? (
                          <>
                            <span className="text-gray-300 truncate flex-1">{c.name}</span>
                            {off > 0 && (
                              <span className="text-amber-500 font-mono text-xs">+{off.toFixed(1)}s</span>
                            )}
                            <button onClick={() => handleClearSlot(i)} className="text-gray-600 hover:text-red-400 transition-colors ml-1">×</button>
                          </>
                        ) : (
                          <span className="text-gray-600">empty</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-4xl">
                <SplitPreview
                  ref={previewRef}
                  layout={layout}
                  panels={panels}
                  onPanelsChange={setPanels}
                  slotClips={slotClips}
                  offsets={offsets}
                  draggingClipId={null}
                  onDropClip={handleDropClip}
                  onClearSlot={handleClearSlot}
                  isPlaying={isPlaying}
                  resizable
                  aspectRatio={aspectRatio}
                />
                <p className="text-xs text-gray-600 text-center mt-3">
                  Rendered at {aspectRatio === '16:9' ? '1280×720' : '720×1280'} · Drag panel edges to resize · Press Play to preview
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
      )}
    </>
  );
}
