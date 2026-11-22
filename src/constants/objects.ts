export const mAllowedImageTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;
export const mMaxImageBytes = 15 * 1024 * 1024;
export const mImageFitRatio = 0.8;
export const mDefaultTextStyle = {
  fontSize: 64,
  fontFamily: 'Inter, system-ui, sans-serif',
  fill: '#111827',
  width: 600,
} as const;
export const mDefaultRect = { width: 400, height: 400, fill: '#6366f1' } as const;
export const mDefaultEllipse = { rx: 200, ry: 200, fill: '#f59e0b' } as const;
