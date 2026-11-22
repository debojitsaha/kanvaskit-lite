import { Point, type Canvas } from 'fabric';

import { mFitPadding, mMaxZoom, mMinZoom } from '@/constants/viewport';
import type { Editor } from '@/core/editor/types';
import type { Artboard } from '@/core/schema/scene';

/** Per-editor viewport state shared by the zoom, pan and resize helpers. */
export interface ViewportState {
  fitMode: boolean;
}

export function clampZoom(zoom: number): number {
  return Math.min(mMaxZoom, Math.max(mMinZoom, zoom));
}

export function zoomAroundCenter(canvas: Canvas, zoom: number): number {
  const next = clampZoom(zoom);
  canvas.zoomToPoint(new Point(canvas.getWidth() / 2, canvas.getHeight() / 2), next);
  return next;
}

/** Sets the fit transform so the artboard is centered with mFitPadding on each side. */
export function fitArtboard(canvas: Canvas, artboard: Artboard): number {
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  const zoom = clampZoom(
    Math.min(
      (canvasWidth - 2 * mFitPadding) / artboard.width,
      (canvasHeight - 2 * mFitPadding) / artboard.height,
    ),
  );
  canvas.setViewportTransform([
    zoom,
    0,
    0,
    zoom,
    (canvasWidth - artboard.width * zoom) / 2,
    (canvasHeight - artboard.height * zoom) / 2,
  ]);
  return zoom;
}

/** Writes a zoom change to the store, notifies listeners and repaints. */
export function publishZoom(editor: Editor, zoom: number): number {
  editor.store.setState((draft) => {
    draft.zoom = zoom;
  });
  editor.events.emit('viewport:change', { zoom });
  editor.canvas.requestRenderAll();
  return zoom;
}

/** Ctrl/Cmd + wheel zooms at the pointer; plain wheel pans. Returns a disposer. */
export function bindWheel(editor: Editor, state: ViewportState): () => void {
  const { canvas } = editor;
  return canvas.on('mouse:wheel', (opt) => {
    const event = opt.e;
    event.preventDefault();
    event.stopPropagation();
    state.fitMode = false;
    if (event.ctrlKey || event.metaKey) {
      const next = clampZoom(canvas.getZoom() * 0.999 ** event.deltaY);
      canvas.zoomToPoint(new Point(opt.viewportPoint.x, opt.viewportPoint.y), next);
      publishZoom(editor, next);
      return;
    }
    canvas.relativePan(new Point(-event.deltaX, -event.deltaY));
    canvas.requestRenderAll();
  });
}
