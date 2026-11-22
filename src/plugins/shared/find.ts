import type { Canvas, FabricObject } from 'fabric';

import { getMeta } from '@/core';
import { isArtboardRect } from '@/plugins/viewport';

/** Canvas objects that carry valid meta. The artboard rect never qualifies. */
export function getUserObjects(canvas: Canvas): FabricObject[] {
  return canvas.getObjects().filter((object) => !isArtboardRect(object) && getMeta(object));
}

export function findObjectById(canvas: Canvas, id: string): FabricObject | undefined {
  return getUserObjects(canvas).find((object) => getMeta(object)?.id === id);
}

/** Selected objects that carry valid meta, in selection order. */
export function getSelectedUserObjects(canvas: Canvas): FabricObject[] {
  return canvas.getActiveObjects().filter((object) => !isArtboardRect(object) && getMeta(object));
}

/** Lowest canvas index a user object may occupy: 1 when the artboard rect sits at index 0. */
export function getArtboardFloor(canvas: Canvas): number {
  const first = canvas.getObjects()[0];
  return first && isArtboardRect(first) ? 1 : 0;
}

/** Meta ids of the given objects, skipping any without valid meta. */
export function getMetaIds(objects: FabricObject[]): string[] {
  return objects.flatMap((object) => {
    const meta = getMeta(object);
    return meta ? [meta.id] : [];
  });
}

/** Returns the objects sorted bottom-most first, by their current canvas index. */
export function sortByStackOrder(canvas: Canvas, objects: FabricObject[]): FabricObject[] {
  const stack = canvas.getObjects();
  return [...objects].sort((left, right) => stack.indexOf(left) - stack.indexOf(right));
}
