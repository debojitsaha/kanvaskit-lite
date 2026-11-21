import type { FabricObject } from 'fabric';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEditor } from '@/core/editor/create-editor';
import type { Editor } from '@/core/editor/types';
import type { Result } from '@/core/errors/result';
import { createViewportPlugin } from '@/plugins/viewport';
import { isArtboardRect } from '@/plugins/viewport/artboard';

const mCanvasWidth = 800;
const mCanvasHeight = 600;
const mArtboardSize = 1080;
const mPadding = 48;

let editor: Editor | undefined;
let container: HTMLDivElement | undefined;

function createContainer(width: number, height: number): HTMLDivElement {
  const element = document.createElement('div');
  element.style.width = String(width) + 'px';
  element.style.height = String(height) + 'px';
  document.body.appendChild(element);
  return element;
}

function createTestEditor(): Editor {
  container = createContainer(mCanvasWidth, mCanvasHeight);
  editor = createEditor({ container, plugins: [createViewportPlugin()] });
  return editor;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve(undefined);
    });
  });
}

function unwrap<T>(result: Result<T>): T {
  if (!result.success) throw new Error(result.error.message);
  return result.data;
}

function getArtboardRect(target: Editor): FabricObject {
  const rect = target.canvas.getObjects().find(isArtboardRect);
  if (!rect) throw new Error('artboard rect is missing');
  return rect;
}

function expectedFitZoom(
  canvasWidth: number,
  canvasHeight: number,
  size: { width: number; height: number },
): number {
  return Math.min(
    (canvasWidth - 2 * mPadding) / size.width,
    (canvasHeight - 2 * mPadding) / size.height,
  );
}

afterEach(async () => {
  await editor?.dispose();
  editor = undefined;
  container?.remove();
  container = undefined;
});

describe('createViewportPlugin', () => {
  it('places the artboard rect at index 0, outside exports and layers', () => {
    const target = createTestEditor();
    const objects = target.canvas.getObjects();

    expect(objects.findIndex(isArtboardRect)).toBe(0);
    const exported = target.canvas.toObject() as { objects?: unknown[] };
    expect(exported.objects ?? []).toHaveLength(0);
    expect(target.store.getState().layers).toEqual([]);
  });

  it('zoomToFit on creation matches the fit formula and the store', async () => {
    const target = createTestEditor();
    await nextFrame();

    const expected = expectedFitZoom(mCanvasWidth, mCanvasHeight, {
      width: mArtboardSize,
      height: mArtboardSize,
    });
    expect(Math.abs(target.store.getState().zoom - expected)).toBeLessThan(1e-6);
    expect(Math.abs(target.canvas.getZoom() - expected)).toBeLessThan(1e-6);

    const [, , , , tx, ty] = target.canvas.viewportTransform;
    expect(Math.abs(tx - (mCanvasWidth - mArtboardSize * expected) / 2)).toBeLessThan(1e-6);
    expect(Math.abs(ty - (mCanvasHeight - mArtboardSize * expected) / 2)).toBeLessThan(1e-6);
  });

  it('zoomIn and zoomOut scale by the zoom step', async () => {
    const target = createTestEditor();
    const before = target.store.getState().zoom;

    const zoomedIn = unwrap(await target.commands.execute('viewport.zoomIn'));
    expect(zoomedIn).toBeCloseTo(before * 1.2, 10);
    expect(target.store.getState().zoom).toBeCloseTo(before * 1.2, 10);

    const zoomedOut = unwrap(await target.commands.execute('viewport.zoomOut'));
    expect(zoomedOut).toBeCloseTo(before, 10);
  });

  it('setZoom clamps to the allowed range', async () => {
    const target = createTestEditor();

    expect(unwrap(await target.commands.execute('viewport.setZoom', { zoom: 100 }))).toBe(8);
    expect(target.store.getState().zoom).toBe(8);
    expect(unwrap(await target.commands.execute('viewport.zoomIn'))).toBe(8);

    expect(unwrap(await target.commands.execute('viewport.setZoom', { zoom: 0 }))).toBe(0.05);
    expect(target.canvas.getZoom()).toBe(0.05);
  });

  it('emits viewport:change for every zoom change', async () => {
    const target = createTestEditor();
    const handler = vi.fn<(payload: { zoom: number }) => void>();
    target.events.on('viewport:change', handler);

    unwrap(await target.commands.execute('viewport.setZoom', { zoom: 2 }));

    expect(handler).toHaveBeenCalledWith({ zoom: 2 });
  });

  it('artboard.resize updates the store and rect, then refits', async () => {
    const target = createTestEditor();

    const artboard = unwrap(
      await target.commands.execute('artboard.resize', { width: 1920, height: 1080 }),
    );
    expect(artboard.width).toBe(1920);
    expect(target.store.getState().artboard.height).toBe(1080);

    const rect = getArtboardRect(target);
    expect(rect.width).toBe(1920);
    expect(rect.height).toBe(1080);

    const expected = expectedFitZoom(mCanvasWidth, mCanvasHeight, { width: 1920, height: 1080 });
    expect(Math.abs(target.store.getState().zoom - expected)).toBeLessThan(1e-6);
  });

  it('artboard.resize rejects invalid sizes', async () => {
    const target = createTestEditor();

    const zeroResult = await target.commands.execute('artboard.resize', { width: 0, height: 1080 });
    expect(zeroResult.success).toBe(false);

    const tooLargeResult = await target.commands.execute('artboard.resize', {
      width: 99999,
      height: 1080,
    });
    expect(tooLargeResult.success).toBe(false);
    expect(target.store.getState().artboard.width).toBe(1080);
  });

  it('artboard.setBackground updates the rect fill and the store', async () => {
    const target = createTestEditor();

    const artboard = unwrap(
      await target.commands.execute('artboard.setBackground', { color: '#111111' }),
    );
    expect(artboard.background).toBe('#111111');
    expect(getArtboardRect(target).fill).toBe('#111111');
  });

  it('keeps the fit when the container resizes', async () => {
    const target = createTestEditor();
    await nextFrame();
    if (!container) throw new Error('container missing');

    container.style.width = '500px';
    container.style.height = '400px';
    await nextFrame();
    await nextFrame();

    expect(target.canvas.getWidth()).toBe(500);
    const expected = expectedFitZoom(500, 400, { width: mArtboardSize, height: mArtboardSize });
    expect(Math.abs(target.store.getState().zoom - expected)).toBeLessThan(1e-6);
  });

  it('dispose unregisters commands and tolerates later input', async () => {
    const target = createTestEditor();
    expect(target.commands.has('viewport.zoomIn')).toBe(true);

    await target.dispose();

    expect(target.commands.has('viewport.zoomIn')).toBe(false);
    expect(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    }).not.toThrow();
    await expect(target.dispose()).resolves.toBeUndefined();
  });
});
