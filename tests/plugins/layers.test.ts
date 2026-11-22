import type { FabricObject } from 'fabric';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditor, getMeta, type Editor, type ErrorCode, type Result } from '@/core';
import { createLayersPlugin } from '@/plugins/layers';
import { createObjectsPlugin } from '@/plugins/objects';
import { createViewportPlugin } from '@/plugins/viewport';

const mContainers: HTMLElement[] = [];
const mEditors: Editor[] = [];

function createTestEditor(): Editor {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  mContainers.push(container);
  const editor = createEditor({
    container,
    plugins: [createViewportPlugin(), createObjectsPlugin(), createLayersPlugin()],
  });
  mEditors.push(editor);
  return editor;
}

function unwrap<T>(result: Result<T>): T {
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result.data;
}

function expectFailure(result: Result<unknown>, code: ErrorCode): void {
  expect(result.success).toBe(false);
  if (result.success) return;
  expect(result.error.code).toBe(code);
}

function findFabricObject(editor: Editor, id: string): FabricObject {
  const object = editor.canvas.getObjects().find((item) => getMeta(item)?.id === id);
  if (!object) throw new Error(`no canvas object for ${id}`);
  return object;
}

async function addRect(editor: Editor): Promise<string> {
  return unwrap(await editor.commands.execute('object.addRect'));
}

afterEach(async () => {
  for (const editor of mEditors.splice(0)) {
    await editor.dispose();
  }
  for (const container of mContainers.splice(0)) {
    container.remove();
  }
});

describe('layers plugin: selection', () => {
  it('selects a layer by id', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    editor.canvas.discardActiveObject();
    expect(editor.store.getState().selection).toEqual([]);

    unwrap(await editor.commands.execute('layer.select', { id }));
    expect(editor.store.getState().selection).toEqual([id]);
  });

  it('fails for an unknown id', async () => {
    const editor = createTestEditor();
    await addRect(editor);
    expectFailure(
      await editor.commands.execute('layer.select', { id: 'missing' }),
      'COMMAND_FAILED',
    );
  });

  it('fails to select a hidden layer', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    unwrap(await editor.commands.execute('layer.toggleVisibility', { id }));
    editor.canvas.discardActiveObject();

    expectFailure(await editor.commands.execute('layer.select', { id }), 'COMMAND_FAILED');
    expect(editor.store.getState().selection).toEqual([]);
  });
});

describe('layers plugin: visibility', () => {
  it('hides the object, updates store layers and deselects it', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    expect(editor.store.getState().selection).toEqual([id]);

    const hidden = unwrap(await editor.commands.execute('layer.toggleVisibility', { id }));
    expect(hidden).toBe(true);

    const object = findFabricObject(editor, id);
    expect(object.visible).toBe(false);
    expect(getMeta(object)?.hidden).toBe(true);
    expect(editor.store.getState().selection).toEqual([]);
    expect(editor.canvas.getActiveObjects()).toEqual([]);
    expect(editor.store.getState().layers.find((layer) => layer.id === id)?.hidden).toBe(true);
  });

  it('shows the object again on a second toggle', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    unwrap(await editor.commands.execute('layer.toggleVisibility', { id }));

    const hidden = unwrap(await editor.commands.execute('layer.toggleVisibility', { id }));
    expect(hidden).toBe(false);
    expect(findFabricObject(editor, id).visible).toBe(true);
  });

  it('fails for an unknown id', async () => {
    const editor = createTestEditor();
    expectFailure(
      await editor.commands.execute('layer.toggleVisibility', { id: 'missing' }),
      'COMMAND_FAILED',
    );
  });
});

describe('layers plugin: lock', () => {
  it('locks movement and selection, and unlocks again', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);

    const locked = unwrap(await editor.commands.execute('layer.toggleLock', { id }));
    expect(locked).toBe(true);
    const object = findFabricObject(editor, id);
    expect(object.selectable).toBe(false);
    expect(object.lockMovementX).toBe(true);
    expect(getMeta(object)?.locked).toBe(true);
    expect(editor.store.getState().layers.find((layer) => layer.id === id)?.locked).toBe(true);

    const unlocked = unwrap(await editor.commands.execute('layer.toggleLock', { id }));
    expect(unlocked).toBe(false);
    expect(findFabricObject(editor, id).selectable).toBe(true);
    expect(findFabricObject(editor, id).lockMovementX).toBe(false);
  });

  it('fails for an unknown id', async () => {
    const editor = createTestEditor();
    expectFailure(
      await editor.commands.execute('layer.toggleLock', { id: 'missing' }),
      'COMMAND_FAILED',
    );
  });
});

describe('layers plugin: rename', () => {
  it('trims the name and stores it in the layers', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);

    const name = unwrap(await editor.commands.execute('layer.rename', { id, name: '  Hero  ' }));
    expect(name).toBe('Hero');
    expect(getMeta(findFabricObject(editor, id))?.name).toBe('Hero');
    expect(editor.store.getState().layers.find((layer) => layer.id === id)?.name).toBe('Hero');
  });

  it('rejects an empty or whitespace-only name', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    expectFailure(
      await editor.commands.execute('layer.rename', { id, name: '   ' }),
      'COMMAND_FAILED',
    );
  });

  it('rejects a name longer than 64 characters and accepts exactly 64', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    expectFailure(
      await editor.commands.execute('layer.rename', { id, name: 'x'.repeat(65) }),
      'COMMAND_FAILED',
    );
    const name = 'y'.repeat(64);
    expect(unwrap(await editor.commands.execute('layer.rename', { id, name }))).toBe(name);
  });
});
