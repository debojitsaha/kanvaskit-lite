import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEditor } from '@/core/editor/create-editor';
import type { Editor } from '@/core/editor/types';
import { createShortcutsPlugin, type KeyBinding } from '@/plugins/shortcuts';
import { matchesBinding, mDefaultKeymap } from '@/plugins/shortcuts/keymap';

let editor: Editor | undefined;
let container: HTMLDivElement | undefined;

function createTestEditor(bindings?: readonly KeyBinding[]): Editor {
  container = document.createElement('div');
  container.style.width = '400px';
  container.style.height = '300px';
  document.body.appendChild(container);
  editor = createEditor({
    container,
    plugins: [createShortcutsPlugin(bindings === undefined ? {} : { bindings })],
  });
  return editor;
}

function keyEvent(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
}

function flushAsync(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
}

afterEach(async () => {
  vi.restoreAllMocks();
  (document.activeElement as HTMLElement | null)?.blur();
  await editor?.dispose();
  editor = undefined;
  container?.remove();
  container = undefined;
});

describe('matchesBinding', () => {
  const modD: KeyBinding = { key: 'd', mod: true, run: () => Promise.resolve(undefined) };

  it('uses metaKey for mod on Mac and ignores ctrlKey', () => {
    expect(matchesBinding(keyEvent('d', { metaKey: true }), modD, true)).toBe(true);
    expect(matchesBinding(keyEvent('d', { ctrlKey: true }), modD, true)).toBe(false);
  });

  it('uses ctrlKey for mod off Mac and ignores metaKey', () => {
    expect(matchesBinding(keyEvent('d', { ctrlKey: true }), modD, false)).toBe(true);
    expect(matchesBinding(keyEvent('d', { metaKey: true }), modD, false)).toBe(false);
  });

  it('requires a bare key to have no modifiers', () => {
    const del: KeyBinding = { key: 'Delete', run: () => Promise.resolve(undefined) };
    expect(matchesBinding(keyEvent('Delete'), del, false)).toBe(true);
    expect(matchesBinding(keyEvent('Delete', { ctrlKey: true }), del, false)).toBe(false);
    expect(matchesBinding(keyEvent('Delete', { metaKey: true }), del, true)).toBe(false);
    expect(matchesBinding(keyEvent('Delete', { altKey: true }), del, false)).toBe(false);
  });

  it('matches shift exactly', () => {
    const modShiftG: KeyBinding = {
      key: 'g',
      mod: true,
      shift: true,
      run: () => Promise.resolve(undefined),
    };
    const modG: KeyBinding = { key: 'g', mod: true, run: () => Promise.resolve(undefined) };
    expect(matchesBinding(keyEvent('g', { ctrlKey: true }), modG, false)).toBe(true);
    expect(matchesBinding(keyEvent('G', { ctrlKey: true, shiftKey: true }), modG, false)).toBe(
      false,
    );
    expect(matchesBinding(keyEvent('G', { ctrlKey: true, shiftKey: true }), modShiftG, false)).toBe(
      true,
    );
    expect(matchesBinding(keyEvent('g', { ctrlKey: true }), modShiftG, false)).toBe(false);
  });

  it('compares letters case-insensitively', () => {
    expect(matchesBinding(keyEvent('D', { ctrlKey: true, shiftKey: true }), modD, false)).toBe(
      false,
    );
    const upper: KeyBinding = { key: 'A', mod: true, run: () => Promise.resolve(undefined) };
    expect(matchesBinding(keyEvent('a', { ctrlKey: true }), upper, false)).toBe(true);
  });

  it('matches Shift+1 as the "!" key with shift set', () => {
    const fit = mDefaultKeymap.find((binding) => binding.key === '!');
    expect(fit).toBeDefined();
    if (!fit) return;
    expect(matchesBinding(keyEvent('!', { shiftKey: true }), fit, false)).toBe(true);
    expect(matchesBinding(keyEvent('!'), fit, false)).toBe(false);
    expect(matchesBinding(keyEvent('1', { shiftKey: true }), fit, false)).toBe(false);
  });

  it('matches Ctrl+Shift+= as "+" in the default keymap (non-mac)', () => {
    const event = keyEvent('+', { ctrlKey: true, shiftKey: true });
    expect(mDefaultKeymap.some((binding) => matchesBinding(event, binding, false))).toBe(true);
  });
});

describe('createShortcutsPlugin', () => {
  it('runs a matching custom binding once and prevents default', () => {
    const run = vi.fn(() => Promise.resolve(undefined));
    createTestEditor([{ key: 'd', mod: true, run }]);
    document.body.focus();

    const event = keyEvent('d', { ctrlKey: true });
    window.dispatchEvent(event);

    expect(run).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores key presses while an input is focused', () => {
    const run = vi.fn(() => Promise.resolve(undefined));
    createTestEditor([{ key: 'd', mod: true, run }]);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = keyEvent('d', { ctrlKey: true });
    window.dispatchEvent(event);
    input.remove();

    expect(run).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('stops handling keys after dispose', async () => {
    const run = vi.fn(() => Promise.resolve(undefined));
    const target = createTestEditor([{ key: 'd', mod: true, run }]);
    document.body.focus();
    await target.dispose();
    editor = undefined;

    window.dispatchEvent(keyEvent('d', { ctrlKey: true }));

    expect(run).not.toHaveBeenCalled();
  });

  it('ignores COMMAND_NOT_FOUND from the default keymap when no other plugins exist', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createTestEditor();
    document.body.focus();

    expect(() => {
      window.dispatchEvent(keyEvent('Delete'));
    }).not.toThrow();
    await flushAsync();

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
