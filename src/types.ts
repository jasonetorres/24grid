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

export interface CropSettings {
  panX: number;  // -0.5 to 0.5, fraction of video width (positive = shift right)
  panY: number;  // -0.5 to 0.5, fraction of video height (positive = shift down)
  zoom: number;  // 1.0 to 4.0 (1 = cover-fit, >1 zooms in)
}

export const DEFAULT_CROP: CropSettings = { panX: 0, panY: 0, zoom: 1 };

export interface Clip {
  id: string;
  file: File;
  url: string;
  name: string;
  duration: number;
  width: number;
  height: number;
}
