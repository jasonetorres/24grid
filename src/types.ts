export type LayoutId =
  | '2-side-by-side'
  | '2-stacked'
  | '3-left-main'
  | '3-right-main'
  | '3-top-main'
  | '4-grid'
  | '4-pip-tl'
  | '4-pip-tr';

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutDef {
  id: LayoutId;
  label: string;
  slots: number;
  description: string;
  panels: PanelRect[];
}

export interface Clip {
  id: string;
  file: File;
  url: string;
  name: string;
  duration: number;
  width: number;
  height: number;
}
