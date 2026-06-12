import { Clock } from 'lucide-react';
import type { Clip } from './types';

interface Props {
  slotClips: (Clip | null)[];
  panelCount: number;
  delays: number[];
  onChange: (index: number, delaySeconds: number) => void;
}

const MAX_DELAY = 30;
const PRESETS = [0, 1, 2, 3, 5, 10];

export default function SlotTimingEditor({ slotClips, panelCount, delays, onChange }: Props) {
  return (
    <div className="space-y-3">
      {Array.from({ length: panelCount }).map((_, i) => {
        const clip = slotClips[i];
        const delay = delays[i] ?? 0;

        return (
          <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-xs flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-xs font-medium text-gray-300 truncate flex-1">
                {clip ? clip.name : <span className="text-gray-600">empty slot</span>}
              </span>
              {delay > 0 ? (
                <span className="text-xs font-mono text-amber-400 tabular-nums flex-shrink-0">
                  +{delay.toFixed(1)}s delay
                </span>
              ) : (
                <span className="text-xs text-gray-600 flex-shrink-0">starts immediately</span>
              )}
            </div>

            {/* Slider */}
            <div className="flex items-center gap-2 mb-2.5">
              <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
              <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full">
                <div
                  className="absolute top-0 left-0 h-full bg-amber-400/30 rounded-full pointer-events-none"
                  style={{ width: `${(delay / MAX_DELAY) * 100}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={MAX_DELAY}
                  step={0.5}
                  value={delay}
                  disabled={!clip}
                  onChange={(e) => onChange(i, parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  style={{ margin: 0 }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-gray-950 shadow pointer-events-none transition-colors"
                  style={{
                    left: `calc(${(delay / MAX_DELAY) * 100}% - 6px)`,
                    background: clip ? '#fbbf24' : '#374151',
                  }}
                />
              </div>
              <span className="text-xs text-gray-600 tabular-nums flex-shrink-0 w-8 text-right">
                {MAX_DELAY}s
              </span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex gap-1 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  disabled={!clip}
                  onClick={() => onChange(i, p)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    delay === p
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {p === 0 ? '0s' : `+${p}s`}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
