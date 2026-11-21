import type { Canvas } from 'fabric';

/**
 * Keeps the canvas backing size in sync with its host element. Calls `onResize`
 * after each real size change; returns a disposer that disconnects the observer.
 */
export function observeContainer(canvas: Canvas, onResize: () => void): () => void {
  const host = canvas.wrapperEl.parentElement;
  if (!host) return () => undefined;
  let width = canvas.getWidth();
  let height = canvas.getHeight();

  const observer = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    const nextWidth = Math.round(entry.contentRect.width);
    const nextHeight = Math.round(entry.contentRect.height);
    if (nextWidth < 1 || nextHeight < 1) return;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.setDimensions({ width, height });
    onResize();
  });
  observer.observe(host);

  return () => {
    observer.disconnect();
  };
}
