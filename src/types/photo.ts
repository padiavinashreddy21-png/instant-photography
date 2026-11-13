export type FilterPresetId =
  | 'original'
  | 'bw'
  | 'vintage'
  | 'vintage-warm'
  | 'sepia'
  | 'purple-noir'
  | 'vivid'
  | 'cool-film';

export interface PhotoAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  vignette: number; // 0 to 100
}

export interface CropRect {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  width: number; // 0..1 normalized
  height: number; // 0..1 normalized
}

export type CropAspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:4';

export interface PhotoEditState {
  filter: FilterPresetId;
  adjustments: PhotoAdjustments;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  crop: CropRect | null;
}

export interface CapturedPhoto {
  id: string;
  originalDataUrl: string;
  editedDataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
  source: 'camera' | 'upload';
  cameraLabel: string;
  editState: PhotoEditState;
}

export type NavSection =
  | 'home'
  | 'studio'
  | 'editor'
  | 'gallery'
  | 'about'
  | 'contact';
