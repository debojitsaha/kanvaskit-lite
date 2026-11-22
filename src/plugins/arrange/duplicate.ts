import { Group, type FabricObject } from 'fabric';

import {
  createErrorResponse,
  createId,
  createMeta,
  getMeta,
  mErrorCode,
  ok,
  setMeta,
  type Editor,
  type Result,
} from '@/core';
import { getMetaIds, sortByStackOrder } from '@/plugins/shared/find';
import { applyMetaState, selectObjects, withDetachedSelectionAsync } from '@/plugins/shared/layers';

type Unregister = () => void;

const mDuplicateOffset = 24;

/** Gives a cloned group's children fresh ids so they do not collide with the originals. */
function refreshChildIds(group: Group): void {
  for (const child of group.getObjects()) {
    const meta = getMeta(child);
    setMeta(child, meta ? { ...meta, id: createId() } : createMeta('rect'));
  }
}

async function cloneWithMeta(original: FabricObject): Promise<FabricObject> {
  const originalMeta = getMeta(original);
  const clone = await original.clone();
  const meta = createMeta(originalMeta?.kind ?? 'rect', `${originalMeta?.name ?? 'Object'} copy`);
  setMeta(clone, meta);
  applyMetaState(clone, meta);
  clone.set({
    left: original.left + mDuplicateOffset,
    top: original.top + mDuplicateOffset,
  });
  clone.setCoords();
  if (clone instanceof Group) refreshChildIds(clone);
  return clone;
}

export function registerDuplicateCommands(editor: Editor): Unregister[] {
  const { canvas, commands } = editor;

  return [
    commands.register({
      id: 'selection.duplicate',
      label: 'Duplicate',
      run: (): Promise<Result<string[]>> => {
        return withDetachedSelectionAsync(editor, async (objects) => {
          if (objects.length === 0) {
            return createErrorResponse(mErrorCode.NothingSelected, 'Nothing is selected');
          }
          const ordered = sortByStackOrder(canvas, objects);
          const clones = await Promise.all(ordered.map((object) => cloneWithMeta(object)));
          canvas.add(...clones);
          selectObjects(editor, clones);
          return ok(getMetaIds(clones));
        });
      },
    }),
  ];
}
