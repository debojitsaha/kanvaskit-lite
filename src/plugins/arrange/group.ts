import { Group, type FabricObject } from 'fabric';

import {
  createErrorResponse,
  createMeta,
  getMeta,
  mErrorCode,
  ok,
  setMeta,
  type Editor,
  type Result,
} from '@/core';
import {
  getArtboardFloor,
  getSelectedUserObjects,
  sortByStackOrder,
  getMetaIds,
} from '@/plugins/shared/find';
import {
  applyMetaState,
  asFabricObject,
  inferObjectKind,
  selectObjects,
} from '@/plugins/shared/layers';
import { isUnlocked } from '@/plugins/arrange/selection';

type Unregister = () => void;

function ensureMeta(object: FabricObject): void {
  const meta = getMeta(object) ?? createMeta(inferObjectKind(object));
  setMeta(object, meta);
  applyMetaState(object, meta);
}

export function registerGroupCommands(editor: Editor): Unregister[] {
  const { canvas, commands } = editor;

  return [
    commands.register({
      id: 'selection.group',
      label: 'Group',
      run: (): Result<string> => {
        const targets = getSelectedUserObjects(canvas).filter(isUnlocked);
        if (targets.length < 2) {
          return createErrorResponse(mErrorCode.CommandFailed, 'Select at least two objects');
        }
        canvas.discardActiveObject();
        const ordered = sortByStackOrder(canvas, targets);
        const stack = canvas.getObjects();
        const highest = Math.max(...ordered.map((object) => stack.indexOf(object)));
        canvas.remove(...ordered);

        const meta = createMeta('group');
        const group = asFabricObject(new Group(ordered, { originX: 'center', originY: 'center' }));
        setMeta(group, meta);
        applyMetaState(group, meta);

        const index = Math.max(getArtboardFloor(canvas), highest - (ordered.length - 1));
        canvas.insertAt(index, group);
        selectObjects(editor, [group]);
        return ok(meta.id);
      },
    }),
    commands.register({
      id: 'selection.ungroup',
      label: 'Ungroup',
      run: (): Result<string[]> => {
        const selected = getSelectedUserObjects(canvas);
        if (selected.length === 0) {
          return createErrorResponse(mErrorCode.NothingSelected, 'Nothing is selected');
        }
        const [only] = selected;
        if (
          selected.length !== 1 ||
          !only ||
          getMeta(only)?.kind !== 'group' ||
          !(only instanceof Group)
        ) {
          return createErrorResponse(mErrorCode.CommandFailed, 'Select a group');
        }
        canvas.discardActiveObject();
        const groupObject = asFabricObject(only);
        const index = canvas.getObjects().indexOf(groupObject);
        canvas.remove(groupObject);
        // removeAll re-applies the group transform, so children keep their world position.
        const children = only.removeAll();
        for (const child of children) ensureMeta(child);
        canvas.insertAt(index, ...children);
        const selectable = children.filter(
          (child) => getMeta(child)?.locked !== true && getMeta(child)?.hidden !== true,
        );
        selectObjects(editor, selectable);
        return ok(getMetaIds(children));
      },
    }),
  ];
}
