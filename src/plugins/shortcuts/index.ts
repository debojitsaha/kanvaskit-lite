import { IText } from 'fabric';

import { definePlugin, type Editor, type EditorPlugin } from '@/core';
import {
  isMacPlatform,
  matchesBinding,
  mDefaultKeymap,
  type KeyBinding,
} from '@/plugins/shortcuts/keymap';

export type { KeyBinding } from '@/plugins/shortcuts/keymap';
export { matchesBinding, mDefaultKeymap } from '@/plugins/shortcuts/keymap';

export interface ShortcutsPluginOptions {
  /** Replaces the default keymap when provided. */
  bindings?: readonly KeyBinding[];
}

function isTypingTarget(element: Element | null): boolean {
  if (!element) return false;
  if (element.matches('input, textarea, select')) return true;
  return element instanceof HTMLElement && element.isContentEditable;
}

function isShortcutFocusContext(editor: Editor): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  const wrapper = editor.canvas.wrapperEl;
  const root = wrapper.closest('[data-kanvaskit-root]') ?? wrapper.parentElement;
  return root?.contains(active) ?? false;
}

function isEditingText(editor: Editor): boolean {
  const active = editor.canvas.getActiveObject();
  return active instanceof IText && active.isEditing;
}

async function runBinding(binding: KeyBinding, editor: Editor): Promise<void> {
  try {
    await binding.run(editor);
  } catch (error: unknown) {
    console.error('[kanvaskit] shortcut failed', binding.key, error);
  }
}

export function createShortcutsPlugin(options: ShortcutsPluginOptions = {}): EditorPlugin {
  const bindings = options.bindings ?? mDefaultKeymap;

  return definePlugin({
    name: 'shortcuts',
    setup(editor) {
      const isMac = isMacPlatform();

      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.defaultPrevented) return;
        if (isTypingTarget(document.activeElement)) return;
        if (!isShortcutFocusContext(editor) || isEditingText(editor)) return;

        const binding = bindings.find((candidate) => matchesBinding(event, candidate, isMac));
        if (!binding) return;
        event.preventDefault();
        void runBinding(binding, editor);
      };

      window.addEventListener('keydown', onKeyDown);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
      };
    },
  });
}
