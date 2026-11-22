import { ActiveSelection, type FabricObject, type Group } from 'fabric';

import {
  snapshotLayers,
  type Editor,
  type EditorEventMap,
  type ObjectKind,
  type ObjectMeta,
} from '@/core';
import { getMetaIds, getSelectedUserObjects } from '@/plugins/shared/find';

/** Rebuilds store.layers from the canvas and announces the change. */
export function publishLayers(
  editor: Editor,
  reason: EditorEventMap['objects:change']['reason'],
): void {
  const layers = snapshotLayers(editor.canvas);
  editor.store.setState((draft) => {
    draft.layers = layers;
  });
  editor.events.emit('objects:change', { reason });
}

/** Mirrors the selected user objects into store.selection; emits only when the ids changed. */
export function publishSelection(editor: Editor): void {
  const ids = getMetaIds(getSelectedUserObjects(editor.canvas));
  const current = editor.store.getState().selection;
  const same = current.length === ids.length && current.every((id, index) => id === ids[index]);
  if (same) return;
  editor.store.setState((draft) => {
    draft.selection = ids;
  });
  editor.events.emit('selection:change', { ids });
}

/** Applies visibility and lock flags from meta onto a Fabric object. */
export function applyMetaState(object: FabricObject, meta: ObjectMeta): void {
  object.visible = !meta.hidden;
  object.selectable = !meta.hidden && !meta.locked;
  object.evented = !meta.hidden && !meta.locked;
  object.lockMovementX = meta.locked;
  object.lockMovementY = meta.locked;
  object.lockRotation = meta.locked;
  object.lockScalingX = meta.locked;
  object.lockScalingY = meta.locked;
  object.hasControls = !meta.locked;
}

/**
 * Group and ActiveSelection extend FabricObject through a mixin base, which the nominal class
 * check of @typescript-eslint cannot see. This is the only place that bridges them.
 */
export function asFabricObject(group: Group): FabricObject {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment -- mixin subclass
  return group;
}

/** Makes `objects` the programmatic selection and publishes it. */
export function selectObjects(editor: Editor, objects: FabricObject[]): void {
  const { canvas } = editor;
  const [only] = objects;
  if (objects.length === 0) {
    canvas.discardActiveObject();
  } else if (objects.length === 1 && only) {
    canvas.setActiveObject(only);
  } else {
    canvas.setActiveObject(asFabricObject(new ActiveSelection(objects, { canvas })));
  }
  canvas.requestRenderAll();
  publishSelection(editor);
}

/** Discards the active selection (so objects carry absolute coordinates) and hands them to fn. */
export function withDetachedSelection<T>(editor: Editor, fn: (objects: FabricObject[]) => T): T {
  const objects = getSelectedUserObjects(editor.canvas);
  editor.canvas.discardActiveObject();
  return fn(objects);
}

/** Async variant of withDetachedSelection. */
export async function withDetachedSelectionAsync<T>(
  editor: Editor,
  fn: (objects: FabricObject[]) => Promise<T>,
): Promise<T> {
  const objects = getSelectedUserObjects(editor.canvas);
  editor.canvas.discardActiveObject();
  return fn(objects);
}

/** Best-effort kind for a Fabric object that has no meta (for example objects from a loaded file). */
export function inferObjectKind(object: FabricObject): ObjectKind {
  if (object.isType('Textbox', 'IText', 'Text')) return 'text';
  if (object.isType('Ellipse', 'Circle')) return 'ellipse';
  if (object.isType('FabricImage', 'Image')) return 'image';
  if (object.isType('Group')) return 'group';
  return 'rect';
}
