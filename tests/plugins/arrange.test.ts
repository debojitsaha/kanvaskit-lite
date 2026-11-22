import { Group, type FabricObject } from 'fabric';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createEditor,
  getMeta,
  setMeta,
  type Editor,
  type ErrorCode,
  type ObjectMeta,
  type Result,
} from '@/core';
import { createArrangePlugin } from '@/plugins/arrange';
import { createObjectsPlugin } from '@/plugins/objects';
import { applyMetaState, selectObjects } from '@/plugins/shared/layers';
import { createViewportPlugin, isArtboardRect } from '@/plugins/viewport';

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
    plugins: [createViewportPlugin(), createObjectsPlugin(), createArrangePlugin()],
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

function requireObject(editor: Editor, id: string): FabricObject {
  const object = editor.canvas.getObjects().find((candidate) => getMeta(candidate)?.id === id);
  if (!object) throw new Error(`object ${id} not on canvas`);
  return object;
}

/** Finds an object at top level or inside a group. */
function findAnywhere(editor: Editor, id: string): FabricObject {
  for (const object of editor.canvas.getObjects()) {
    if (getMeta(object)?.id === id) return object;
    if (object instanceof Group) {
      const child = object.getObjects().find((candidate) => getMeta(candidate)?.id === id);
      if (child) return child;
    }
  }
  throw new Error(`object ${id} not found`);
}

function layerIds(editor: Editor): string[] {
  return editor.store.getState().layers.map((layer) => layer.id);
}

function placeAt(editor: Editor, id: string, left: number, top: number): void {
  const object = requireObject(editor, id);
  object.set({ left, top });
  object.setCoords();
}

function lockObject(editor: Editor, id: string): void {
  const object = requireObject(editor, id);
  const meta = getMeta(object);
  if (!meta) throw new Error('missing meta');
  const next: ObjectMeta = { ...meta, locked: true };
  setMeta(object, next);
  applyMetaState(object, next);
}

async function addRect(editor: Editor): Promise<string> {
  return unwrap(await editor.commands.execute('object.addRect'));
}

async function selectAll(editor: Editor): Promise<string[]> {
  return unwrap(await editor.commands.execute('selection.selectAll'));
}

function centerOf(editor: Editor, id: string): { x: number; y: number } {
  const center = findAnywhere(editor, id).getCenterPoint();
  return { x: center.x, y: center.y };
}

function expectNear(actual: { x: number; y: number }, expected: { x: number; y: number }): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(0.5);
}

afterEach(async () => {
  for (const editor of mEditors.splice(0)) {
    await editor.dispose();
  }
  for (const container of mContainers.splice(0)) {
    container.remove();
  }
});

describe('selection', () => {
  it('selectAll selects every visible unlocked user object and publishes it', async () => {
    const editor = createTestEditor();
    const ids = [await addRect(editor), await addRect(editor), await addRect(editor)];

    const selected = await selectAll(editor);

    expect([...selected].sort()).toEqual([...ids].sort());
    expect([...editor.store.getState().selection].sort()).toEqual([...ids].sort());
    const active = editor.canvas.getActiveObjects();
    expect(active.some((object) => isArtboardRect(object))).toBe(false);
  });

  it('delete removes the selection and reports NOTHING_SELECTED when empty', async () => {
    const editor = createTestEditor();
    await addRect(editor);
    await addRect(editor);
    await selectAll(editor);

    const removed = unwrap(await editor.commands.execute('selection.delete'));

    expect(removed).toHaveLength(2);
    expect(editor.store.getState().layers).toEqual([]);
    expect(editor.store.getState().selection).toEqual([]);
    expectFailure(await editor.commands.execute('selection.delete'), 'NOTHING_SELECTED');
  });

  it('never selects or deletes the artboard rect', async () => {
    const editor = createTestEditor();

    expect(await selectAll(editor)).toEqual([]);
    expectFailure(await editor.commands.execute('selection.delete'), 'NOTHING_SELECTED');

    const [first] = editor.canvas.getObjects();
    expect(first && isArtboardRect(first)).toBe(true);
    expect(editor.canvas.getObjects()).toHaveLength(1);
  });

  it('skips locked objects when deleting', async () => {
    const editor = createTestEditor();
    const lockedId = await addRect(editor);
    const freeId = await addRect(editor);
    lockObject(editor, lockedId);
    selectObjects(editor, [requireObject(editor, lockedId), requireObject(editor, freeId)]);

    const removed = unwrap(await editor.commands.execute('selection.delete'));

    expect(removed).toEqual([freeId]);
    expect(layerIds(editor)).toEqual([lockedId]);
  });

  it('clear empties the selection', async () => {
    const editor = createTestEditor();
    await addRect(editor);
    await selectAll(editor);

    unwrap(await editor.commands.execute('selection.clear'));

    expect(editor.store.getState().selection).toEqual([]);
  });
});

describe('duplicate', () => {
  it('creates offset copies with new ids and selects them', async () => {
    const editor = createTestEditor();
    const originalId = await addRect(editor);
    const before = centerOf(editor, originalId);
    await selectAll(editor);

    const copyIds = unwrap(await editor.commands.execute('selection.duplicate'));

    expect(copyIds).toHaveLength(1);
    const [copyId] = copyIds;
    expect(copyId).toBeDefined();
    expect(copyId).not.toBe(originalId);
    const copy = requireObject(editor, copyId ?? '');
    expect(getMeta(copy)?.name).toBe('Rectangle copy');
    expect(copy.left - requireObject(editor, originalId).left).toBeCloseTo(24, 6);
    expect(copy.top - requireObject(editor, originalId).top).toBeCloseTo(24, 6);
    expect(centerOf(editor, originalId)).toEqual(before);
    expect(editor.store.getState().selection).toEqual(copyIds);
    expect(layerIds(editor)).toEqual([copyId, originalId]);
  });

  it('duplicates a group with fresh child ids', async () => {
    const editor = createTestEditor();
    const first = await addRect(editor);
    const second = await addRect(editor);
    await selectAll(editor);
    const groupId = unwrap(await editor.commands.execute('selection.group'));
    selectObjects(editor, [requireObject(editor, groupId)]);

    const [copyId] = unwrap(await editor.commands.execute('selection.duplicate'));
    const copy = requireObject(editor, copyId ?? '');

    expect(getMeta(copy)?.kind).toBe('group');
    if (!(copy instanceof Group)) throw new Error('expected a group object');
    const childIds = copy.getObjects().map((child) => getMeta(child)?.id);
    expect(childIds).toHaveLength(2);
    expect(childIds).not.toContain(first);
    expect(childIds).not.toContain(second);
  });
});

describe('group and ungroup', () => {
  it('requires at least two selected objects', async () => {
    const editor = createTestEditor();
    await addRect(editor);
    selectObjects(editor, editor.canvas.getObjects().slice(1));

    expectFailure(await editor.commands.execute('selection.group'), 'COMMAND_FAILED');
  });

  it('groups while keeping every child in its world position', async () => {
    const editor = createTestEditor();
    const ids = [await addRect(editor), await addRect(editor), await addRect(editor)];
    placeAt(editor, ids[0] ?? '', 200, 200);
    placeAt(editor, ids[1] ?? '', 400, 300);
    placeAt(editor, ids[2] ?? '', 700, 500);
    const before = ids.map((id) => centerOf(editor, id));
    await selectAll(editor);

    const groupId = unwrap(await editor.commands.execute('selection.group'));

    const group = requireObject(editor, groupId);
    expect(getMeta(group)?.kind).toBe('group');
    expect(editor.store.getState().selection).toEqual([groupId]);
    expect(layerIds(editor)).toEqual([groupId]);
    if (!(group instanceof Group)) throw new Error('expected a group object');
    expect(group.getObjects()).toHaveLength(3);
    ids.forEach((id, index) => {
      const expected = before[index];
      if (expected) expectNear(centerOf(editor, id), expected);
    });
  });

  it('ungroups back to top-level children at their world positions', async () => {
    const editor = createTestEditor();
    const ids = [await addRect(editor), await addRect(editor)];
    placeAt(editor, ids[0] ?? '', 150, 260);
    placeAt(editor, ids[1] ?? '', 620, 410);
    const before = ids.map((id) => centerOf(editor, id));
    await selectAll(editor);
    const groupId = unwrap(await editor.commands.execute('selection.group'));

    const childIds = unwrap(await editor.commands.execute('selection.ungroup'));

    expect(childIds.sort()).toEqual([...ids].sort());
    expect(layerIds(editor).sort()).toEqual([...ids].sort());
    expect(editor.canvas.getObjects().some((object) => getMeta(object)?.id === groupId)).toBe(
      false,
    );
    ids.forEach((id, index) => {
      const expected = before[index];
      if (expected) expectNear(centerOf(editor, id), expected);
    });
  });

  it('ungroup requires a group to be selected', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    selectObjects(editor, [requireObject(editor, id)]);

    expectFailure(await editor.commands.execute('selection.ungroup'), 'COMMAND_FAILED');
  });
});

describe('z-order', () => {
  async function threeRects(editor: Editor): Promise<[string, string, string]> {
    const a = await addRect(editor);
    const b = await addRect(editor);
    const c = await addRect(editor);
    return [a, b, c];
  }

  it('bringToFront and sendToBack change layer order without covering the artboard', async () => {
    const editor = createTestEditor();
    const [a, b, c] = await threeRects(editor);
    expect(layerIds(editor)).toEqual([c, b, a]);
    selectObjects(editor, [requireObject(editor, a)]);

    unwrap(await editor.commands.execute('arrange.bringToFront'));
    expect(layerIds(editor)).toEqual([a, c, b]);

    unwrap(await editor.commands.execute('arrange.sendToBack'));
    expect(layerIds(editor)).toEqual([c, b, a]);
    const [first] = editor.canvas.getObjects();
    expect(first && isArtboardRect(first)).toBe(true);
  });

  it('bringForward and sendBackward move one step at a time', async () => {
    const editor = createTestEditor();
    const [a, b, c] = await threeRects(editor);
    selectObjects(editor, [requireObject(editor, b)]);

    unwrap(await editor.commands.execute('arrange.bringForward'));
    expect(layerIds(editor)).toEqual([b, c, a]);

    unwrap(await editor.commands.execute('arrange.sendBackward'));
    unwrap(await editor.commands.execute('arrange.sendBackward'));
    expect(layerIds(editor)).toEqual([c, a, b]);
  });

  it('never moves a user object below the artboard rect', async () => {
    const editor = createTestEditor();
    const [a, b, c] = await threeRects(editor);
    selectObjects(editor, [requireObject(editor, c)]);
    for (let step = 0; step < 4; step += 1) {
      unwrap(await editor.commands.execute('arrange.sendBackward'));
    }
    selectObjects(editor, [requireObject(editor, a)]);
    unwrap(await editor.commands.execute('arrange.sendToBack'));

    const [first] = editor.canvas.getObjects();
    expect(first && isArtboardRect(first)).toBe(true);
    expect(editor.canvas.getObjects()[1]).toBe(requireObject(editor, a));
    expect(layerIds(editor)).toEqual(expect.arrayContaining([a, b, c]));
  });

  it('reports NOTHING_SELECTED without a selection', async () => {
    const editor = createTestEditor();
    await threeRects(editor);
    editor.canvas.discardActiveObject();
    expectFailure(await editor.commands.execute('arrange.bringToFront'), 'NOTHING_SELECTED');
  });
});

describe('nudge', () => {
  it('moves the selection by dx and dy and publishes a modified change', async () => {
    const editor = createTestEditor();
    const id = await addRect(editor);
    const startLeft = requireObject(editor, id).left;
    await selectAll(editor);
    const reasons: string[] = [];
    const unsubscribe = editor.events.on('objects:change', ({ reason }) => {
      reasons.push(reason);
    });

    unwrap(await editor.commands.execute('object.nudge', { dx: -1, dy: 0 }));

    unsubscribe();
    expect(requireObject(editor, id).left).toBeCloseTo(startLeft - 1, 6);
    expect(reasons).toContain('modified');
  });
});

describe('locked objects', () => {
  it('are not selected by selectAll', async () => {
    const editor = createTestEditor();
    const lockedId = await addRect(editor);
    const freeId = await addRect(editor);
    lockObject(editor, lockedId);

    const selected = await selectAll(editor);

    expect(selected).toEqual([freeId]);
  });
});
