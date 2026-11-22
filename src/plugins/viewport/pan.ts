import { IText, Point, type Canvas, type TPointerEvent } from 'fabric';

import type { Editor } from '@/core/editor/types';
import type { ViewportState } from '@/plugins/viewport/zoom';

interface HoldSnapshot {
  selection: boolean;
  cursor: string;
  skipTargetFind: boolean;
}

interface ClientPoint {
  x: number;
  y: number;
}

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

function isTextEditing(canvas: Canvas): boolean {
  const active = canvas.getActiveObject();
  return active instanceof IText && active.isEditing;
}

function clientPoint(event: TPointerEvent): ClientPoint | undefined {
  if ('clientX' in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.touches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : undefined;
}

/** Space+drag and middle-button drag pan the viewport. Returns a disposer. */
export function bindPan(editor: Editor, state: ViewportState): () => void {
  const { canvas } = editor;
  let spaceHeld = false;
  let panning = false;
  let last: ClientPoint = { x: 0, y: 0 };
  let snapshot: HoldSnapshot | undefined;

  function hold(): void {
    if (snapshot) return;
    snapshot = {
      selection: canvas.selection,
      cursor: canvas.defaultCursor,
      skipTargetFind: canvas.skipTargetFind,
    };
    canvas.selection = false;
    canvas.skipTargetFind = true;
  }

  function release(): void {
    if (!snapshot || spaceHeld || panning) return;
    canvas.selection = snapshot.selection;
    canvas.skipTargetFind = snapshot.skipTargetFind;
    canvas.defaultCursor = snapshot.cursor;
    canvas.setCursor(snapshot.cursor);
    snapshot = undefined;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== ' ') return;
    if (isEditableElement(document.activeElement) || isTextEditing(canvas)) return;
    event.preventDefault();
    if (spaceHeld) return;
    spaceHeld = true;
    hold();
    canvas.defaultCursor = 'grab';
    canvas.setCursor('grab');
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.key !== ' ' || !spaceHeld) return;
    spaceHeld = false;
    release();
  }

  function onBlur(): void {
    spaceHeld = false;
    panning = false;
    release();
  }

  const disposers = [
    canvas.on('mouse:down', (opt) => {
      const isMiddle = 'button' in opt.e && opt.e.button === 1;
      if (!spaceHeld && !isMiddle) return;
      const point = clientPoint(opt.e);
      if (!point) return;
      opt.e.preventDefault();
      hold();
      panning = true;
      last = point;
      canvas.setCursor('grabbing');
    }),
    canvas.on('mouse:move', (opt) => {
      if (!panning) return;
      const point = clientPoint(opt.e);
      if (!point) return;
      canvas.relativePan(new Point(point.x - last.x, point.y - last.y));
      last = point;
      state.fitMode = false;
    }),
    canvas.on('mouse:up', () => {
      if (!panning) return;
      panning = false;
      if (spaceHeld) {
        canvas.setCursor('grab');
      } else {
        release();
      }
    }),
  ];

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return () => {
    for (const dispose of disposers) dispose();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    spaceHeld = false;
    panning = false;
    release();
  };
}
