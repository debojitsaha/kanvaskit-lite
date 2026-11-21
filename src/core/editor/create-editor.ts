import { Canvas } from 'fabric';

import { mDefaultArtboard } from '@/constants/editor';
import { createCommandRegistry } from '@/core/commands/registry';
import { registerMetaSerialization } from '@/core/editor/meta';
import { bindCanvasToStore } from '@/core/editor/sync';
import type { CreateEditorOptions, Editor, EditorPlugin } from '@/core/editor/types';
import { createEventBus } from '@/core/events/bus';
import type { EditorEventMap } from '@/core/events/types';
import { createEditorStore } from '@/core/store/editor-store';
import { createId } from '@/core/utils/id';

interface PluginEntry {
  name: string;
  cleanup: (() => void) | undefined;
}

/** Creates an editor that owns a fresh canvas element inside `options.container`. */
export function createEditor(options: CreateEditorOptions): Editor {
  registerMetaSerialization();

  const width = Math.max(1, options.container.clientWidth);
  const height = Math.max(1, options.container.clientHeight);
  const element = document.createElement('canvas');
  options.container.appendChild(element);
  const canvas = new Canvas(element, {
    width,
    height,
    preserveObjectStacking: true,
    selection: true,
  });

  const store = createEditorStore({
    artboard: { ...mDefaultArtboard, ...options.artboard },
  });
  const events = createEventBus<EditorEventMap>();
  const pluginEntries: PluginEntry[] = [];
  let disposed = false;
  let disposePromise: Promise<void> | undefined;

  const commands = createCommandRegistry(() => ({ editor }), {
    isDisposed: () => disposed,
    onExecuted: (id) => {
      events.emit('command:executed', { id });
    },
  });

  const unbindSync = bindCanvasToStore(canvas, store, events);

  function use(plugin: EditorPlugin): void {
    if (disposed) {
      throw new Error('[EDITOR_DISPOSED] Cannot install a plugin on a disposed editor');
    }
    if (pluginEntries.some((entry) => entry.name === plugin.name)) {
      throw new Error(`[PLUGIN_ALREADY_REGISTERED] ${plugin.name}`);
    }
    const result = plugin.setup(editor);
    pluginEntries.push({
      name: plugin.name,
      cleanup: typeof result === 'function' ? result : undefined,
    });
  }

  async function teardown(): Promise<void> {
    events.emit('editor:dispose', {});

    for (const entry of [...pluginEntries].reverse()) {
      try {
        entry.cleanup?.();
      } catch (error: unknown) {
        console.error('[kanvaskit] plugin cleanup failed', entry.name, error);
      }
    }
    pluginEntries.length = 0;

    unbindSync();
    events.clear();
    store.setState((draft) => {
      draft.ready = false;
    });

    const wrapper = canvas.wrapperEl;
    try {
      await canvas.dispose();
    } catch (error: unknown) {
      console.error('[kanvaskit] canvas dispose failed', error);
    }
    wrapper.remove();
    element.remove();
  }

  function dispose(): Promise<void> {
    if (disposePromise) return disposePromise;
    if (disposed) return Promise.resolve();
    disposed = true;
    disposePromise = teardown();
    return disposePromise;
  }

  const editor: Editor = {
    id: createId(),
    canvas,
    store,
    events,
    commands,
    get isDisposed() {
      return disposed;
    },
    use,
    dispose,
  };

  try {
    for (const plugin of options.plugins ?? []) {
      use(plugin);
    }
  } catch (error: unknown) {
    void dispose();
    throw error;
  }

  store.setState((draft) => {
    draft.ready = true;
  });
  events.emit('editor:ready', {});
  return editor;
}
