import type { FabricObject } from 'fabric';

import { createErrorResponse, getMeta, mErrorCode, ok, type Editor, type Result } from '@/core';
import { getMetaIds, getSelectedUserObjects, getUserObjects } from '@/plugins/shared/find';
import { publishSelection, selectObjects } from '@/plugins/shared/layers';

type Unregister = () => void;

/** Objects a command may move or remove: user objects that are not locked. */
export function isUnlocked(object: FabricObject): boolean {
  const meta = getMeta(object);
  return meta !== undefined && !meta.locked;
}

function isSelectable(object: FabricObject): boolean {
  const meta = getMeta(object);
  return meta !== undefined && !meta.locked && !meta.hidden;
}

export function registerSelectionCommands(editor: Editor): Unregister[] {
  const { canvas, commands } = editor;

  return [
    commands.register({
      id: 'selection.selectAll',
      label: 'Select all',
      run: (): Result<string[]> => {
        const targets = getUserObjects(canvas).filter(isSelectable);
        selectObjects(editor, targets);
        return ok(getMetaIds(targets));
      },
    }),
    commands.register({
      id: 'selection.clear',
      label: 'Clear selection',
      run: () => {
        selectObjects(editor, []);
        return ok(null);
      },
    }),
    commands.register({
      id: 'selection.delete',
      label: 'Delete',
      run: (): Result<string[]> => {
        const selected = getSelectedUserObjects(canvas);
        if (selected.length === 0) {
          return createErrorResponse(mErrorCode.NothingSelected, 'Nothing is selected');
        }
        const removable = selected.filter(isUnlocked);
        const ids = getMetaIds(removable);
        canvas.discardActiveObject();
        canvas.remove(...removable);
        publishSelection(editor);
        canvas.requestRenderAll();
        return ok(ids);
      },
    }),
    commands.register({
      id: 'object.nudge',
      label: 'Nudge',
      run: (_context, args): Result<null> => {
        if (!Number.isFinite(args.dx) || !Number.isFinite(args.dy)) {
          return createErrorResponse(mErrorCode.CommandFailed, 'Invalid nudge distance');
        }
        const selected = getSelectedUserObjects(canvas);
        if (selected.length === 0) {
          return createErrorResponse(mErrorCode.NothingSelected, 'Nothing is selected');
        }
        const movable = selected.filter(isUnlocked);
        canvas.discardActiveObject();
        for (const object of movable) {
          object.set({ left: object.left + args.dx, top: object.top + args.dy });
          object.setCoords();
          canvas.fire('object:modified', { target: object });
        }
        selectObjects(editor, movable);
        return ok(null);
      },
    }),
  ];
}
