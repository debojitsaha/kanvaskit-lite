import type { Canvas } from 'fabric';

import { getMeta } from '@/core/editor/meta';
import type { EditorEventMap, EventBus } from '@/core/events/types';
import type { EditorStore, LayerSnapshot } from '@/core/store/editor-store';

type ObjectsChangeReason = EditorEventMap['objects:change']['reason'];

/** Layers for every object carrying valid meta, top-most first. */
export function snapshotLayers(canvas: Canvas): LayerSnapshot[] {
  const layers: LayerSnapshot[] = [];
  for (const object of canvas.getObjects()) {
    const meta = getMeta(object);
    if (!meta) continue;
    layers.push({
      id: meta.id,
      name: meta.name,
      kind: meta.kind,
      hidden: meta.hidden,
      locked: meta.locked,
    });
  }
  return layers.reverse();
}

function isSameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

/** Mirrors Fabric canvas events into the store and bus. Returns an unbind function. */
export function bindCanvasToStore(
  canvas: Canvas,
  store: EditorStore,
  events: EventBus<EditorEventMap>,
): () => void {
  const disposers: VoidFunction[] = [];

  const syncSelection = (): void => {
    const ids: string[] = [];
    for (const object of canvas.getActiveObjects()) {
      const meta = getMeta(object);
      if (meta) ids.push(meta.id);
    }
    if (isSameIds(store.getState().selection, ids)) return;
    store.setState((draft) => {
      draft.selection = ids;
    });
    events.emit('selection:change', { ids });
  };

  const syncLayers = (reason: ObjectsChangeReason): void => {
    const layers = snapshotLayers(canvas);
    store.setState((draft) => {
      draft.layers = layers;
    });
    events.emit('objects:change', { reason });
  };

  disposers.push(
    canvas.on('selection:created', syncSelection),
    canvas.on('selection:updated', syncSelection),
    canvas.on('selection:cleared', syncSelection),
    canvas.on('object:added', () => {
      syncLayers('added');
    }),
    canvas.on('object:removed', () => {
      syncLayers('removed');
    }),
    canvas.on('object:modified', () => {
      syncLayers('modified');
    }),
  );

  return () => {
    for (const dispose of disposers.splice(0)) {
      dispose();
    }
  };
}
