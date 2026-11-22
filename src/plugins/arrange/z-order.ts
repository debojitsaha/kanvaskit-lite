import type { Canvas, FabricObject } from 'fabric';

import { createErrorResponse, mErrorCode, ok, type Editor, type Result } from '@/core';
import { getArtboardFloor, getSelectedUserObjects, sortByStackOrder } from '@/plugins/shared/find';
import { publishLayers, selectObjects } from '@/plugins/shared/layers';

type Unregister = () => void;
type Step = 'forward' | 'backward' | 'front' | 'back';

/**
 * Moves objects one step or to the extreme of the stack. Uses moveObjectTo with explicit
 * indices so the artboard rect (index 0) is never passed over or displaced.
 */
function moveObjects(canvas: Canvas, objects: FabricObject[], step: Step): void {
  const floor = getArtboardFloor(canvas);
  const selected = new Set(objects);
  const ordered = sortByStackOrder(canvas, objects);
  const stack = (): FabricObject[] => canvas.getObjects();

  if (step === 'front') {
    for (const object of ordered) canvas.moveObjectTo(object, stack().length - 1);
  } else if (step === 'back') {
    for (const object of [...ordered].reverse()) canvas.moveObjectTo(object, floor);
  } else if (step === 'forward') {
    for (const object of [...ordered].reverse()) {
      const index = stack().indexOf(object);
      const above = stack()[index + 1];
      if (above && !selected.has(above)) canvas.moveObjectTo(object, index + 1);
    }
  } else {
    for (const object of ordered) {
      const index = stack().indexOf(object);
      const below = stack()[index - 1];
      if (index - 1 >= floor && below && !selected.has(below)) {
        canvas.moveObjectTo(object, index - 1);
      }
    }
  }
}

function runZOrder(editor: Editor, step: Step): Result<null> {
  const { canvas } = editor;
  const selected = getSelectedUserObjects(canvas);
  if (selected.length === 0) {
    return createErrorResponse(mErrorCode.NothingSelected, 'Nothing is selected');
  }
  canvas.discardActiveObject();
  moveObjects(canvas, selected, step);
  selectObjects(editor, selected);
  publishLayers(editor, 'reordered');
  return ok(null);
}

export function registerZOrderCommands(editor: Editor): Unregister[] {
  const { commands } = editor;

  return [
    commands.register({
      id: 'arrange.bringForward',
      label: 'Bring forward',
      run: () => runZOrder(editor, 'forward'),
    }),
    commands.register({
      id: 'arrange.sendBackward',
      label: 'Send backward',
      run: () => runZOrder(editor, 'backward'),
    }),
    commands.register({
      id: 'arrange.bringToFront',
      label: 'Bring to front',
      run: () => runZOrder(editor, 'front'),
    }),
    commands.register({
      id: 'arrange.sendToBack',
      label: 'Send to back',
      run: () => runZOrder(editor, 'back'),
    }),
  ];
}
