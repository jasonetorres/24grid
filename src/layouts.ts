import type { LayoutDef } from './types';

export const LAYOUTS: LayoutDef[] = [
  {
    id: '1-full',
    label: 'Full Frame',
    slots: 1,
    description: 'Single full-frame panel — split it with the ⊞ buttons to add more',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: '2-side-by-side',
    label: 'Side by Side',
    slots: 2,
    description: 'Two equal panels horizontally',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: '2-stacked',
    label: 'Stacked',
    slots: 2,
    description: 'Two equal panels vertically',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: '3-left-main',
    label: 'Left Main',
    slots: 3,
    description: 'Large left, two stacked right',
    panels: [
      { x: 0, y: 0, w: 0.6, h: 1 },
      { x: 0.6, y: 0, w: 0.4, h: 0.5 },
      { x: 0.6, y: 0.5, w: 0.4, h: 0.5 },
    ],
  },
  {
    id: '3-right-main',
    label: 'Right Main',
    slots: 3,
    description: 'Two stacked left, large right',
    panels: [
      { x: 0, y: 0, w: 0.4, h: 0.5 },
      { x: 0, y: 0.5, w: 0.4, h: 0.5 },
      { x: 0.4, y: 0, w: 0.6, h: 1 },
    ],
  },
  {
    id: '3-top-main',
    label: 'Top Main',
    slots: 3,
    description: 'Large top, two side by side below',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
  {
    id: '4-grid',
    label: '2×2 Grid',
    slots: 4,
    description: 'Classic four-panel grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: '4-pip-tl',
    label: 'Three Pips',
    slots: 4,
    description: 'Full main + three corner overlays',
    panels: [
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 0.02, y: 0.02, w: 0.29, h: 0.29 },
      { x: 0.69, y: 0.02, w: 0.29, h: 0.29 },
      { x: 0.02, y: 0.69, w: 0.29, h: 0.29 },
    ],
  },
  {
    id: '4-pip-tr',
    label: 'Quad Pips',
    slots: 4,
    description: 'Center main with four corner pips',
    panels: [
      { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
      { x: 0, y: 0, w: 0.14, h: 0.14 },
      { x: 0.86, y: 0, w: 0.14, h: 0.14 },
      { x: 0, y: 0.86, w: 0.14, h: 0.14 },
    ],
  },
];
