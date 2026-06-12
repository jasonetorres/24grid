import React from 'react';
import { Clock } from 'lucide-react';
import type { Clip } from './types';

interface Props {
  slotClips: (Clip | null)[];
  panelCount: number;
  offsets: number[];
  onChange: (index: number, offsetSeconds: number) => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, '0')}`;
}

export default function SlotTimingEditor({ slotClips, panelCount, offsets, onChange }: Props) {
  return (
    <div className="space-y-3">
      {Array.from({ length: panelCount }).map((_, i) => {
        const clip = slotClips[i];
        const offset = offsets[i] ?? 0;
        const max = clip ? Math.max(0, clip.duration - 0.1) : 0;

        return (
          <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-xs flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-xs font-medium text-gray-300 truncate flex-1">
                {clip ? clip.name : <span className="text-gray-600">empty slot</span>}
              </span>
              <span className="text-xs font-mono text-amber-400 tabular-nums flex-shrink-0">
                {fmt(offset)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
              <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full overflow-visible">
                {clip && (
                  <div
                    className="absolute top-0 left-0 h-full bg-amber-400/30 rounded-full"
                    style={{ width: `${(offset / clip.duration) * 100}%` }}
                  />
                )}
                <input
                  type="range"
                  min={0}
                  max={max}
                  step={0.1}
                  value={offset}
                  disabled={!clip}
                  onChange={(e) => onChange(i, parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  style={{ margin: 0 }}
                />
                {clip && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 border-2 border-gray-950 shadow pointer-events-none"
                    style={{ left: `calc(${(offset / clip.duration) * 100}% - 6px)` }}
                  />
                )}
              </div>
              <span className="text-xs text-gray-600 tabular-nums flex-shrink-0 w-10 text-right">
                {clip ? fmt(clip.duration) : '--:--'}
              </span>
            </div>

            {clip && offset > 0 && (
              <button
                onClick={() => onChange(i, 0)}
                className="mt-1.5 text-xs text-gray-600 hover:text-amber-400 transition-colors"
              >
                reset to 0:00
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
