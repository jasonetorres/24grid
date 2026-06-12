import React, { useCallback, useRef } from 'react';
import type { PanelRect } from './types';

interface Props {
  panels: PanelRect[];
  onChange: (updated: PanelRect[]) => void;
}

interface Edge {
  isVertical: boolean; // true = vertical divider (left/right panels), false = horizontal (top/bottom)
  position: number;    // normalised 0-1 position of the divider
  leftOrTop: number[]; // indices of panels on the left or top side
  rightOrBottom: number[]; // indices on the right or bottom side
}

const MIN_SIZE = 0.08;
const HANDLE_PX = 8; // hit area in px

function findEdges(panels: PanelRect[]): Edge[] {
  const edges: Edge[] = [];
  const EPS = 0.001;

  // Collect unique vertical boundaries (x + w == x of neighbour)
  const vPositions = new Set<number>();
  for (const p of panels) {
    const right = p.x + p.w;
    if (right > EPS && right < 1 - EPS) vPositions.add(Math.round(right * 1e6) / 1e6);
  }

  for (const pos of vPositions) {
    const left  = panels.map((p, i) => (Math.abs(p.x + p.w - pos) < EPS ? i : -1)).filter(x => x >= 0);
    const right = panels.map((p, i) => (Math.abs(p.x - pos) < EPS ? i : -1)).filter(x => x >= 0);
    if (left.length && right.length) {
      edges.push({ isVertical: true, position: pos, leftOrTop: left, rightOrBottom: right });
    }
  }

  // Collect unique horizontal boundaries
  const hPositions = new Set<number>();
  for (const p of panels) {
    const bottom = p.y + p.h;
    if (bottom > EPS && bottom < 1 - EPS) hPositions.add(Math.round(bottom * 1e6) / 1e6);
  }

  for (const pos of hPositions) {
    const top    = panels.map((p, i) => (Math.abs(p.y + p.h - pos) < EPS ? i : -1)).filter(x => x >= 0);
    const bottom = panels.map((p, i) => (Math.abs(p.y - pos) < EPS ? i : -1)).filter(x => x >= 0);
    if (top.length && bottom.length) {
      edges.push({ isVertical: false, position: pos, leftOrTop: top, rightOrBottom: bottom });
    }
  }

  return edges;
}

export default function PanelResizer({ panels, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    edge: Edge;
    startPos: number;
    startPanels: PanelRect[];
  } | null>(null);

  const edges = findEdges(panels);

  const startDrag = useCallback(
    (e: React.PointerEvent, edge: Edge) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        edge,
        startPos: edge.isVertical ? e.clientX : e.clientY,
        startPanels: panels.map(p => ({ ...p })),
      };
    },
    [panels]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { edge, startPos, startPanels } = dragRef.current;

      const rect = containerRef.current.getBoundingClientRect();
      const totalPx = edge.isVertical ? rect.width : rect.height;
      const deltaPx = (edge.isVertical ? e.clientX : e.clientY) - startPos;
      const deltaNorm = deltaPx / totalPx;

      const newPos = Math.min(
        1 - MIN_SIZE,
        Math.max(MIN_SIZE, edge.position + deltaNorm)
      );

      const updated = startPanels.map(p => ({ ...p }));

      if (edge.isVertical) {
        for (const i of edge.leftOrTop) {
          const origRight = startPanels[i].x + startPanels[i].w;
          if (Math.abs(origRight - edge.position) < 0.001) {
            updated[i] = { ...updated[i], w: Math.max(MIN_SIZE, newPos - startPanels[i].x) };
          }
        }
        for (const i of edge.rightOrBottom) {
          const origLeft = startPanels[i].x;
          if (Math.abs(origLeft - edge.position) < 0.001) {
            const newW = Math.max(MIN_SIZE, (startPanels[i].x + startPanels[i].w) - newPos);
            updated[i] = { ...updated[i], x: newPos, w: newW };
          }
        }
      } else {
        for (const i of edge.leftOrTop) {
          const origBottom = startPanels[i].y + startPanels[i].h;
          if (Math.abs(origBottom - edge.position) < 0.001) {
            updated[i] = { ...updated[i], h: Math.max(MIN_SIZE, newPos - startPanels[i].y) };
          }
        }
        for (const i of edge.rightOrBottom) {
          const origTop = startPanels[i].y;
          if (Math.abs(origTop - edge.position) < 0.001) {
            const newH = Math.max(MIN_SIZE, (startPanels[i].y + startPanels[i].h) - newPos);
            updated[i] = { ...updated[i], y: newPos, h: newH };
          }
        }
      }

      onChange(updated);
      // Update the edge position in dragRef so incremental moves stay smooth
      dragRef.current.edge = { ...edge, position: newPos };
      dragRef.current.startPos = edge.isVertical ? e.clientX : e.clientY;
      dragRef.current.startPanels = updated;
    },
    [onChange]
  );

  const stopDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      style={{ pointerEvents: dragRef.current ? 'all' : 'none' }}
    >
      {edges.map((edge, idx) => {
        const isV = edge.isVertical;
        const halfPx = HANDLE_PX / 2;
        const style: React.CSSProperties = isV
          ? {
              position: 'absolute',
              left: `calc(${edge.position * 100}% - ${halfPx}px)`,
              top: 0,
              width: HANDLE_PX,
              height: '100%',
              cursor: 'ew-resize',
              pointerEvents: 'all',
              zIndex: 20,
            }
          : {
              position: 'absolute',
              top: `calc(${edge.position * 100}% - ${halfPx}px)`,
              left: 0,
              height: HANDLE_PX,
              width: '100%',
              cursor: 'ns-resize',
              pointerEvents: 'all',
              zIndex: 20,
            };

        return (
          <div
            key={idx}
            style={style}
            onPointerDown={(e) => startDrag(e, edge)}
            className="group flex items-center justify-center"
          >
            {/* Visual indicator on hover */}
            <div
              className={`rounded-full bg-amber-400/0 group-hover:bg-amber-400/70 transition-all duration-150 ${
                isV ? 'w-0.5 h-8' : 'h-0.5 w-8'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
