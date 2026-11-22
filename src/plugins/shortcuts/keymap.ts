import type { Editor } from '@/core';

export interface KeyBinding {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  run: (editor: Editor) => Promise<unknown>;
}

const mNudgeStep = 1;
const mNudgeStepShift = 10;
const mZoomReset = 1;

function nudge(key: string, dx: number, dy: number, shift: boolean): KeyBinding {
  return {
    key,
    shift,
    run: (editor) => editor.commands.execute('object.nudge', { dx, dy }),
  };
}

function arrowNudges(): KeyBinding[] {
  const bindings: KeyBinding[] = [];
  for (const shift of [false, true]) {
    const step = shift ? mNudgeStepShift : mNudgeStep;
    bindings.push(
      nudge('ArrowLeft', -step, 0, shift),
      nudge('ArrowRight', step, 0, shift),
      nudge('ArrowUp', 0, -step, shift),
      nudge('ArrowDown', 0, step, shift),
    );
  }
  return bindings;
}

export const mDefaultKeymap: readonly KeyBinding[] = [
  { key: 'Delete', run: (editor) => editor.commands.execute('selection.delete') },
  { key: 'Backspace', run: (editor) => editor.commands.execute('selection.delete') },
  { key: 'd', mod: true, run: (editor) => editor.commands.execute('selection.duplicate') },
  { key: 'a', mod: true, run: (editor) => editor.commands.execute('selection.selectAll') },
  { key: 'Escape', run: (editor) => editor.commands.execute('selection.clear') },
  { key: 'g', mod: true, run: (editor) => editor.commands.execute('selection.group') },
  {
    key: 'g',
    mod: true,
    shift: true,
    run: (editor) => editor.commands.execute('selection.ungroup'),
  },
  { key: ']', run: (editor) => editor.commands.execute('arrange.bringForward') },
  { key: '[', run: (editor) => editor.commands.execute('arrange.sendBackward') },
  { key: ']', mod: true, run: (editor) => editor.commands.execute('arrange.bringToFront') },
  { key: '[', mod: true, run: (editor) => editor.commands.execute('arrange.sendToBack') },
  ...arrowNudges(),
  { key: '=', mod: true, run: (editor) => editor.commands.execute('viewport.zoomIn') },
  { key: '+', mod: true, run: (editor) => editor.commands.execute('viewport.zoomIn') },
  { key: '+', mod: true, shift: true, run: (editor) => editor.commands.execute('viewport.zoomIn') },
  { key: '-', mod: true, run: (editor) => editor.commands.execute('viewport.zoomOut') },
  {
    key: '0',
    mod: true,
    run: (editor) => editor.commands.execute('viewport.setZoom', { zoom: mZoomReset }),
  },
  { key: '!', shift: true, run: (editor) => editor.commands.execute('viewport.zoomToFit') },
];

export function isMacPlatform(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

/** `mod` is metaKey on Mac and ctrlKey elsewhere; every modifier must match exactly. */
export function matchesBinding(event: KeyboardEvent, binding: KeyBinding, isMac: boolean): boolean {
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  const mod = binding.mod ?? false;
  const expectedCtrl = !isMac && mod;
  const expectedMeta = isMac && mod;
  return (
    event.ctrlKey === expectedCtrl &&
    event.metaKey === expectedMeta &&
    event.shiftKey === (binding.shift ?? false) &&
    event.altKey === (binding.alt ?? false)
  );
}
