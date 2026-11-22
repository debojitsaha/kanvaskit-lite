import { Textbox, type FabricObject } from 'fabric';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditor, getMeta, type Editor, type ErrorCode, type Result } from '@/core';
import { createObjectsPlugin } from '@/plugins/objects';

const mContainers: HTMLElement[] = [];
const mEditors: Editor[] = [];

function createTestEditor(maxImageBytes?: number): Editor {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  mContainers.push(container);
  const plugin =
    maxImageBytes === undefined ? createObjectsPlugin() : createObjectsPlugin({ maxImageBytes });
  const editor = createEditor({ container, plugins: [plugin] });
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

function findById(editor: Editor, id: string): FabricObject | undefined {
  return editor.canvas.getObjects().find((object) => getMeta(object)?.id === id);
}

function createPngDataUrl(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.fillRect(0, 0, width, height);
  return canvas.toDataURL('image/png');
}

async function createPngFile(width: number, height: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (!blob) throw new Error('toBlob returned no data');
  return new File([blob], 'sample.png', { type: 'image/png' });
}

afterEach(async () => {
  for (const editor of mEditors.splice(0)) {
    await editor.dispose();
  }
  for (const container of mContainers.splice(0)) {
    container.remove();
  }
});

describe('objects plugin: shapes and text', () => {
  it('adds rect, ellipse and text, returning ids that appear in the layers top-most first', async () => {
    const editor = createTestEditor();
    const rectId = unwrap(await editor.commands.execute('object.addRect'));
    const ellipseId = unwrap(await editor.commands.execute('object.addEllipse'));
    const textId = unwrap(await editor.commands.execute('object.addText', {}));

    const layers = editor.store.getState().layers.map((layer) => layer.id);
    expect(layers).toEqual([textId, ellipseId, rectId]);

    const kinds = editor.store.getState().layers.map((layer) => layer.kind);
    expect(kinds).toEqual(['text', 'ellipse', 'rect']);
  });

  it('centers new objects on the artboard center', async () => {
    const editor = createTestEditor();
    const ids = [
      unwrap(await editor.commands.execute('object.addRect')),
      unwrap(await editor.commands.execute('object.addEllipse')),
      unwrap(await editor.commands.execute('object.addText', {})),
    ];
    for (const id of ids) {
      const object = findById(editor, id);
      expect(object).toBeDefined();
      const center = object?.getCenterPoint();
      expect(center?.x).toBeCloseTo(540, 5);
      expect(center?.y).toBeCloseTo(540, 5);
    }
  });

  it('selects the newly added object', async () => {
    const editor = createTestEditor();
    const id = unwrap(await editor.commands.execute('object.addRect'));
    expect(editor.store.getState().selection).toEqual([id]);
  });

  it('uses the default text when no text is given and the provided text otherwise', async () => {
    const editor = createTestEditor();
    const defaultId = unwrap(await editor.commands.execute('object.addText', {}));
    const customId = unwrap(await editor.commands.execute('object.addText', { text: 'Hello' }));

    const defaultText = findById(editor, defaultId);
    const customText = findById(editor, customId);
    expect(defaultText).toBeInstanceOf(Textbox);
    expect(customText).toBeInstanceOf(Textbox);
    expect(defaultText instanceof Textbox ? defaultText.text : '').toBe('Add your text');
    expect(customText instanceof Textbox ? customText.text : '').toBe('Hello');
  });
});

describe('objects plugin: images from URL', () => {
  it('adds a small PNG data URL without upscaling it', async () => {
    const editor = createTestEditor();
    const id = unwrap(
      await editor.commands.execute('object.addImageFromUrl', {
        url: createPngDataUrl(300, 200),
      }),
    );
    const image = findById(editor, id);
    expect(image?.scaleX).toBe(1);
    expect(image?.getCenterPoint().x).toBeCloseTo(540, 5);
    expect(image?.getCenterPoint().y).toBeCloseTo(540, 5);
  });

  it('scales a large image to fit 80% of the artboard', async () => {
    const editor = createTestEditor();
    const id = unwrap(
      await editor.commands.execute('object.addImageFromUrl', {
        url: createPngDataUrl(4000, 4000),
      }),
    );
    const image = findById(editor, id);
    expect(image?.scaleX).toBeCloseTo(0.216, 3);
    expect(image?.scaleY).toBeCloseTo(0.216, 3);
  });

  it('rejects a javascript: URL with INVALID_URL', async () => {
    const editor = createTestEditor();
    const result = await editor.commands.execute('object.addImageFromUrl', {
      url: 'javascript:alert(1)',
    });
    expectFailure(result, 'INVALID_URL');
  });

  it('reports IMAGE_LOAD_FAILED for an unreachable host', async () => {
    const editor = createTestEditor();
    const result = await editor.commands.execute('object.addImageFromUrl', {
      url: 'http://127.0.0.1:9/missing.png',
    });
    expectFailure(result, 'IMAGE_LOAD_FAILED');
  });
});

describe('objects plugin: images from file', () => {
  it('rejects a text/plain file with FILE_TYPE_UNSUPPORTED', async () => {
    const editor = createTestEditor();
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const result = await editor.commands.execute('object.addImageFromFile', { file });
    expectFailure(result, 'FILE_TYPE_UNSUPPORTED');
  });

  it('rejects a PNG larger than maxImageBytes with FILE_TOO_LARGE', async () => {
    const editor = createTestEditor(10);
    const file = await createPngFile(64, 64);
    expect(file.size).toBeGreaterThan(10);
    const result = await editor.commands.execute('object.addImageFromFile', { file });
    expectFailure(result, 'FILE_TOO_LARGE');
  });

  it('adds a valid small PNG file as an image object', async () => {
    const editor = createTestEditor();
    const file = await createPngFile(120, 80);
    const id = unwrap(await editor.commands.execute('object.addImageFromFile', { file }));
    const layer = editor.store.getState().layers.find((item) => item.id === id);
    expect(layer?.kind).toBe('image');
    expect(findById(editor, id)).toBeDefined();
  });
});
