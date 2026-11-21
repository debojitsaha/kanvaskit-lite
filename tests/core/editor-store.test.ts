import { describe, expect, it } from 'vitest';

import { mDefaultArtboard } from '@/constants/editor';
import { createEditorStore } from '@/core/store/editor-store';

describe('createEditorStore', () => {
  it('starts with defaults', () => {
    const store = createEditorStore();
    const state = store.getState();

    expect(state.ready).toBe(false);
    expect(state.selection).toEqual([]);
    expect(state.layers).toEqual([]);
    expect(state.zoom).toBe(1);
    expect(state.artboard).toEqual(mDefaultArtboard);
  });

  it('applies initial overrides', () => {
    const store = createEditorStore({
      zoom: 0.5,
      artboard: { width: 300, height: 200, background: '#000000' },
    });
    const state = store.getState();

    expect(state.zoom).toBe(0.5);
    expect(state.artboard).toEqual({ width: 300, height: 200, background: '#000000' });
    expect(state.ready).toBe(false);
  });

  it('updates state through an immer draft', () => {
    const store = createEditorStore();
    const before = store.getState();

    store.setState((s) => {
      s.zoom = 2;
    });

    expect(store.getState().zoom).toBe(2);
    expect(before.zoom).toBe(1);
  });
});
