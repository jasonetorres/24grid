import { useRef } from 'react';
import { Upload, Film, X, Check } from 'lucide-react';
import type { Clip } from './types';

interface Props {
  clips: Clip[];
  onAdd: (clips: Clip[]) => void;
  onRemove: (id: string) => void;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  tapSelectedId?: string | null;
  onTapClip?: (id: string) => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ClipLibrary({
  clips, onAdd, onRemove, draggingId,
  onDragStart, onDragEnd, tapSelectedId, onTapClip,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const out: Clip[] = [];
    let pending = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('video/')) return;
      pending++;
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = url;
      v.onloadedmetadata = () => {
        out.push({
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          url,
          name: file.name.replace(/\.[^.]+$/, ''),
          duration: v.duration,
          width: v.videoWidth,
          height: v.videoHeight,
        });
        pending--;
        if (pending === 0) onAdd(out);
      };
    });
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div
        className="border-2 border-dashed border-gray-700 hover:border-amber-500/70 rounded-xl p-4 text-center cursor-pointer transition-colors group"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <Upload className="w-5 h-5 text-gray-600 group-hover:text-amber-400 mx-auto mb-1 transition-colors" />
        <p className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">Drop videos or tap to browse</p>
        <input ref={inputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {clips.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-6">No clips added yet</p>
        )}
        {clips.map((clip) => {
          const isTapSelected = tapSelectedId === clip.id;
          const isDraggingThis = draggingId === clip.id;
          return (
            <div
              key={clip.id}
              draggable
              onDragStart={() => onDragStart(clip.id)}
              onDragEnd={onDragEnd}
              onClick={() => onTapClip?.(clip.id)}
              className={`flex items-center gap-2.5 p-2 rounded-xl border select-none transition-all ${
                isTapSelected
                  ? 'border-amber-400 bg-amber-400/15 shadow-lg shadow-amber-400/10 cursor-pointer'
                  : isDraggingThis
                  ? 'opacity-40 border-amber-400/40 bg-amber-400/5 cursor-grab'
                  : onTapClip
                  ? 'border-gray-800 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800 cursor-pointer'
                  : 'border-gray-800 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800 cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="w-14 h-9 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                <video src={clip.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                {isTapSelected && (
                  <div className="absolute inset-0 bg-amber-400/40 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isTapSelected ? 'text-amber-300' : 'text-gray-200'}`}>
                  {clip.name}
                </p>
                <p className="text-xs text-gray-500">{fmt(clip.duration)} &middot; {clip.width}×{clip.height}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(clip.id); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 flex-shrink-0 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {clips.length > 0 && (
        <p className="text-xs text-gray-600 flex items-center gap-1.5 flex-shrink-0">
          <Film className="w-3 h-3" />
          {clips.length} clip{clips.length !== 1 ? 's' : ''} — drag onto slots or tap to select
        </p>
      )}
    </div>
  );
}
