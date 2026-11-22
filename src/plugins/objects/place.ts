import type { FabricObject } from 'fabric';

import { createMeta, setMeta, type Editor, type ObjectKind } from '@/core';

/** Centers a new object on the artboard, registers its meta, selects it and returns its id. */
export function placeOnArtboard(
  editor: Editor,
  object: FabricObject,
  kind: ObjectKind,
  name?: string,
): string {
  const { artboard } = editor.store.getState();
  object.set({
    originX: 'center',
    originY: 'center',
    left: artboard.width / 2,
    top: artboard.height / 2,
  });
  const meta = createMeta(kind, name);
  setMeta(object, meta);
  editor.canvas.add(object);
  editor.canvas.setActiveObject(object);
  editor.canvas.requestRenderAll();
  return meta.id;
}
