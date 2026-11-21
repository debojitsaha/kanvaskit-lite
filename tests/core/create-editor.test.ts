import { Rect } from 'fabric';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditor } from '@/core/editor/create-editor';
import { createMeta, getMeta, setMeta } from '@/core/editor/meta';
import type { Editor, EditorPlugin } from '@/core/editor/types';
import { ok } from '@/core/errors/result';
import type { EditorEventMap } from '@/core/events/types';

declare module '@/core/commands/types' {
  interface CommandRegistryMap {
    'test.noop': { args: undefined; result: null };
  }
}

const mContainers: HTMLElement[] = [];
const mEditors: Editor[] = [];

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  mContainers.push(container);
  return container;
}

function createTestEditor(plugins?: EditorPlugin[]): Editor {
  const editor = createEditor(
    plugins ? { container: createContainer(), plugins } : { container: createContainer() },
  );
  mEditors.push(editor);
  return editor;
}

function readObjects(json: unknown): unknown[] {
  if (typeof json !== 'object' || json === null || !('objects' in json)) return [];
  const objects: unknown = json.objects;
  const list: unknown[] = Array.isArray(objects) ? objects : [];
  return list;
}

function createRectWithMeta(): { rect: Rect; id: string } {
  const meta = createMeta('rect');
  const rect = new Rect({ left: 10, top: 10, width: 50, height: 50, fill: '#f00' });
  setMeta(rect, meta);
  return { rect, id: meta.id };
}

afterEach(async () => {
  for (const editor of mEditors.splice(0)) {
    await editor.dispose();
  }
  for (const container of mContainers.splice(0)) {
    container.remove();
  }
});

describe('createEditor', () => {
  it('mounts a canvas inside the container and becomes ready', () => {
    const container = createContainer();
    let setupEditor: Editor | undefined;
    const editor = createEditor({
      container,
      plugins: [
        {
          name: 'probe',
          setup(instance) {
            setupEditor = instance;
          },
        },
      ],
    });
    mEditors.push(editor);

    expect(container.querySelector('canvas')).not.toBeNull();
    expect(editor.store.getState().ready).toBe(true);
    expect(setupEditor).toBe(editor);
  });

  it('runs plugin cleanups in reverse install order on dispose', async () => {
    const order: string[] = [];
    const editor = createTestEditor([
      {
        name: 'first',
        setup: () => () => {
          order.push('first');
        },
      },
      {
        name: 'second',
        setup: () => () => {
          order.push('second');
        },
      },
    ]);
    editor.use({
      name: 'third',
      setup: () => () => {
        order.push('third');
      },
    });

    await editor.dispose();

    expect(order).toEqual(['third', 'second', 'first']);
  });

  it('throws on a duplicate plugin name', () => {
    const editor = createTestEditor([{ name: 'dup', setup: () => undefined }]);

    expect(() => {
      editor.use({ name: 'dup', setup: () => undefined });
    }).toThrow('[PLUGIN_ALREADY_REGISTERED]');
  });

  it('dispose is idempotent, tears down the DOM and blocks commands', async () => {
    const container = createContainer();
    const editor = createEditor({ container });
    mEditors.push(editor);
    const disposedEvents: EditorEventMap['editor:dispose'][] = [];
    editor.events.on('editor:dispose', (payload) => {
      disposedEvents.push(payload);
    });
    editor.commands.register({
      id: 'test.noop',
      label: 'Noop',
      run: () => ok(null),
    });

    const first = editor.dispose();
    const second = editor.dispose();

    expect(second).toBe(first);
    await first;

    expect(editor.isDisposed).toBe(true);
    expect(container.querySelector('canvas')).toBeNull();
    expect(disposedEvents).toHaveLength(1);
    expect(editor.store.getState().ready).toBe(false);

    const result = await editor.commands.execute('test.noop');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('EDITOR_DISPOSED');
    }
  });

  it('tracks added and removed objects in layers, top-most first', () => {
    const editor = createTestEditor();
    const changes: EditorEventMap['objects:change']['reason'][] = [];
    editor.events.on('objects:change', (payload) => {
      changes.push(payload.reason);
    });

    const bottom = createRectWithMeta();
    const top = createRectWithMeta();
    editor.canvas.add(bottom.rect);
    editor.canvas.add(top.rect);

    const layers = editor.store.getState().layers;
    expect(layers.map((layer) => layer.id)).toEqual([top.id, bottom.id]);
    expect(layers[0]?.kind).toBe('rect');
    expect(changes).toEqual(['added', 'added']);

    editor.canvas.remove(top.rect);

    expect(editor.store.getState().layers.map((layer) => layer.id)).toEqual([bottom.id]);
    expect(changes.at(-1)).toBe('removed');
  });

  it('updates selection through the Fabric selection events', () => {
    const editor = createTestEditor();
    const { rect, id } = createRectWithMeta();
    editor.canvas.add(rect);

    const selections: string[][] = [];
    editor.events.on('selection:change', (payload) => {
      selections.push(payload.ids);
    });

    editor.canvas.setActiveObject(rect);

    expect(editor.store.getState().selection).toEqual([id]);
    expect(selections).toEqual([[id]]);

    editor.canvas.discardActiveObject();
    expect(editor.store.getState().selection).toEqual([]);
  });

  it('keeps meta in canvas.toObject() output', () => {
    const editor = createTestEditor();
    const { rect, id } = createRectWithMeta();
    editor.canvas.add(rect);

    const json: unknown = editor.canvas.toObject();

    expect(readObjects(json)[0]).toMatchObject({ meta: { id } });
    expect(getMeta(rect)?.id).toBe(id);
  });

  it('keeps two editors on separate containers independent', () => {
    const first = createTestEditor();
    const second = createTestEditor();

    first.canvas.add(createRectWithMeta().rect);

    expect(first.store.getState().layers).toHaveLength(1);
    expect(second.store.getState().layers).toEqual([]);
  });

  it('survives a StrictMode-style dispose and recreate on the same container', async () => {
    const container = createContainer();
    const firstEditor = createEditor({ container });
    const firstDisposal = firstEditor.dispose();

    const secondEditor = createEditor({ container });
    mEditors.push(secondEditor);
    secondEditor.canvas.add(createRectWithMeta().rect);

    expect(secondEditor.store.getState().layers).toHaveLength(1);

    await firstDisposal;
    await secondEditor.dispose();

    expect(firstEditor.isDisposed).toBe(true);
    expect(secondEditor.isDisposed).toBe(true);
    expect(container.querySelector('canvas')).toBeNull();
  });
});
