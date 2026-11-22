import type { TMat2D } from 'fabric';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createEditor,
  getMeta,
  SceneDocumentSchema,
  type Editor,
  type ErrorCode,
  type Result,
  type SceneDocument,
} from '@/core';
import { createIoPlugin } from '@/plugins/io';
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
    plugins: [
      createViewportPlugin(),
      createObjectsPlugin(),
      createLayersPlugin(),
      createIoPlugin(),
    ],
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('image failed to decode'));
    };
    image.src = src;
  });
}

/** Round-trips a document through JSON, as a saved file would be. */
function asSavedFile(scene: SceneDocument): unknown {
  return JSON.parse(JSON.stringify(scene));
}

async function saveScene(editor: Editor): Promise<SceneDocument> {
  return unwrap(await editor.commands.execute('scene.save'));
}

afterEach(async () => {
  for (const editor of mEditors.splice(0)) {
    await editor.dispose();
  }
  for (const container of mContainers.splice(0)) {
    container.remove();
  }
});

describe('io plugin: export.png', () => {
  it('returns a PNG data URL with the artboard size', async () => {
    const editor = createTestEditor();
    await editor.commands.execute('object.addRect');
    const dataUrl = unwrap(await editor.commands.execute('export.png', { multiplier: 1 }));
    expect(dataUrl.startsWith('data:image/png')).toBe(true);

    const image = await loadImage(dataUrl);
    expect(image.naturalWidth).toBe(1080);
    expect(image.naturalHeight).toBe(1080);
  });

  it('scales the artboard size by the multiplier', async () => {
    const editor = createTestEditor();
    const dataUrl = unwrap(await editor.commands.execute('export.png', { multiplier: 0.5 }));
    const image = await loadImage(dataUrl);
    expect(image.naturalWidth).toBe(540);
    expect(image.naturalHeight).toBe(540);
  });

  it('defaults to multiplier 1 when no options are given', async () => {
    const editor = createTestEditor();
    const dataUrl = unwrap(await editor.commands.execute('export.png', {}));
    const image = await loadImage(dataUrl);
    expect(image.naturalWidth).toBe(1080);
  });

  it('restores the viewport transform and selection after export', async () => {
    const editor = createTestEditor();
    const id = unwrap(await editor.commands.execute('object.addRect'));
    const viewport: TMat2D = [2, 0, 0, 2, 30, 40];
    editor.canvas.setViewportTransform(viewport);

    unwrap(await editor.commands.execute('export.png', { multiplier: 1 }));

    expect([...editor.canvas.viewportTransform]).toEqual(viewport);
    expect(editor.store.getState().selection).toEqual([id]);
  });

  it('fails for a multiplier above 4', async () => {
    const editor = createTestEditor();
    expectFailure(await editor.commands.execute('export.png', { multiplier: 5 }), 'COMMAND_FAILED');
  });

  it('fails for a zero or non-finite multiplier', async () => {
    const editor = createTestEditor();
    expectFailure(await editor.commands.execute('export.png', { multiplier: 0 }), 'COMMAND_FAILED');
    expectFailure(
      await editor.commands.execute('export.png', { multiplier: Number.NaN }),
      'COMMAND_FAILED',
    );
  });
});

describe('io plugin: scene.save', () => {
  it('produces a schema-valid document with user objects and meta only', async () => {
    const editor = createTestEditor();
    await editor.commands.execute('object.addRect');
    await editor.commands.execute('object.addText', { text: 'Hello' });

    const scene = await saveScene(editor);
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
    expect(scene.app).toBe('kanvaskit');
    expect(scene.schemaVersion).toBe(1);
    expect(scene.artboard).toEqual(editor.store.getState().artboard);

    const objects = scene.canvas.objects;
    expect(Array.isArray(objects)).toBe(true);
    if (!Array.isArray(objects)) return;
    expect(objects).toHaveLength(2);
    for (const object of objects) {
      expect(object).toHaveProperty('meta');
    }
  });

  it('excludes the artboard rect from the saved objects', async () => {
    const editor = createTestEditor();
    const scene = await saveScene(editor);
    expect(scene.canvas.objects).toEqual([]);
  });
});

describe('io plugin: round trip', () => {
  it('restores layer ids, names, order and hidden state into a fresh editor', async () => {
    const source = createTestEditor();
    const rectId = unwrap(await source.commands.execute('object.addRect'));
    const textId = unwrap(await source.commands.execute('object.addText', { text: 'Title' }));
    unwrap(await source.commands.execute('layer.rename', { id: rectId, name: 'Hero' }));
    unwrap(await source.commands.execute('layer.toggleVisibility', { id: textId }));

    const saved = asSavedFile(await saveScene(source));

    const target = createTestEditor();
    const count = unwrap(await target.commands.execute('scene.load', { document: saved }));
    expect(count).toBe(2);

    expect(target.store.getState().layers).toEqual(source.store.getState().layers);
    expect(target.store.getState().layers.map((layer) => layer.name)).toEqual(['Text', 'Hero']);

    const hiddenText = target.canvas.getObjects().find((object) => getMeta(object)?.id === textId);
    expect(hiddenText?.visible).toBe(false);
    const visibleRect = target.canvas.getObjects().find((object) => getMeta(object)?.id === rectId);
    expect(visibleRect?.visible).toBe(true);
  });

  it('applies the document artboard size to the store', async () => {
    const source = createTestEditor();
    const scene = await saveScene(source);
    const resized: SceneDocument = {
      ...scene,
      artboard: { width: 1920, height: 1080, background: '#000000' },
    };

    const target = createTestEditor();
    unwrap(await target.commands.execute('scene.load', { document: asSavedFile(resized) }));
    expect(target.store.getState().artboard).toEqual({
      width: 1920,
      height: 1080,
      background: '#000000',
    });
  });

  it('replaces existing objects instead of appending to them', async () => {
    const source = createTestEditor();
    await source.commands.execute('object.addText', { text: 'Only one' });
    const saved = asSavedFile(await saveScene(source));

    const target = createTestEditor();
    await target.commands.execute('object.addRect');
    await target.commands.execute('object.addEllipse');

    const count = unwrap(await target.commands.execute('scene.load', { document: saved }));
    expect(count).toBe(1);
    expect(target.store.getState().layers.map((layer) => layer.kind)).toEqual(['text']);
    expect(target.canvas.getObjects()).toHaveLength(2);
  });
});

describe('io plugin: scene.load validation', () => {
  it('rejects an empty object with SCENE_INVALID', async () => {
    const editor = createTestEditor();
    expectFailure(await editor.commands.execute('scene.load', { document: {} }), 'SCENE_INVALID');
  });

  it('rejects a document from another app with SCENE_INVALID', async () => {
    const editor = createTestEditor();
    const saved = await saveScene(editor);
    expectFailure(
      await editor.commands.execute('scene.load', {
        document: { ...(asSavedFile(saved) as object), app: 'other-app' },
      }),
      'SCENE_INVALID',
    );
  });

  it('rejects a future schemaVersion with SCENE_VERSION_UNSUPPORTED', async () => {
    const editor = createTestEditor();
    const saved = await saveScene(editor);
    expectFailure(
      await editor.commands.execute('scene.load', {
        document: { ...(asSavedFile(saved) as object), schemaVersion: 999 },
      }),
      'SCENE_VERSION_UNSUPPORTED',
    );
  });

  it('leaves the current objects untouched when the load fails', async () => {
    const editor = createTestEditor();
    await editor.commands.execute('object.addRect');
    await editor.commands.execute('scene.load', { document: {} });
    expect(editor.store.getState().layers).toHaveLength(1);
  });
});
