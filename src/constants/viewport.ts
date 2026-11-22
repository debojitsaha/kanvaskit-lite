export const mMinZoom = 0.05;
export const mMaxZoom = 8;
export const mZoomStep = 1.2;
export const mFitPadding = 48;
export const mWorkspaceBackground = '#e5e7eb';
export const mArtboardPresets = [
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Landscape', width: 1920, height: 1080 },
] as const;
export type ArtboardPresetId = (typeof mArtboardPresets)[number]['id'];
