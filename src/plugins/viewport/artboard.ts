import { Rect, type FabricObject } from 'fabric';

import type { Artboard } from '@/core/schema/scene';

const mArtboardRects = new WeakSet<FabricObject>();

export function createArtboardRect(artboard: Artboard): Rect {
  const rect = new Rect({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    width: artboard.width,
    height: artboard.height,
    fill: artboard.background,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    hoverCursor: 'default',
    strokeWidth: 0,
    objectCaching: false,
  });
  mArtboardRects.add(rect);
  return rect;
}

export function updateArtboardRect(rect: Rect, artboard: Artboard): void {
  rect.set({
    width: artboard.width,
    height: artboard.height,
    fill: artboard.background,
  });
}

export function isArtboardRect(obj: FabricObject): boolean {
  return mArtboardRects.has(obj);
}
