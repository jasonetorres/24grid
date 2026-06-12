import React from 'react';
import type { LayoutDef } from './types';
import { LAYOUTS } from './layouts';

interface Props {
  selected: LayoutDef | null;
  onSelect: (layout: LayoutDef) => void;
}

function Thumb({ layout, active }: { layout: LayoutDef; active: boolean }) {
  return (
    <div
      className={`relative w-full aspect-video rounded overflow-hidden border-2 transition-all duration-150 ${
        active ? 'border-amber-400 shadow-md shadow-amber-400/30' : 'border-gray-700 hover:border-gray-500'
      }`}
      style={{ background: '#0a0a0a' }}
    >
      {layout.panels.map((p, i) => (
        <div
          key={i}
          className={`absolute transition-colors ${active ? 'bg-amber-400/25' : 'bg-gray-600/50'}`}
          style={{
            left: `calc(${p.x * 100}% + 1.5px)`,
            top: `calc(${p.y * 100}% + 1.5px)`,
            width: `calc(${p.w * 100}% - 3px)`,
            height: `calc(${p.h * 100}% - 3px)`,
          }}
        />
      ))}
    </div>
  );
}

export default function LayoutPicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {LAYOUTS.map((layout) => {
        const active = selected?.id === layout.id;
        return (
          <button
            key={layout.id}
            onClick={() => onSelect(layout)}
            className="group flex flex-col gap-2 text-left"
          >
            <Thumb layout={layout} active={active} />
            <div>
              <p className={`text-xs font-semibold ${active ? 'text-amber-400' : 'text-gray-300 group-hover:text-white'} transition-colors`}>
                {layout.label}
              </p>
              <p className="text-xs text-gray-600 truncate">{layout.slots} slots</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
