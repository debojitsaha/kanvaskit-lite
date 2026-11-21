import { immer } from 'zustand/middleware/immer';
import { createStore, type Mutate, type StoreApi } from 'zustand/vanilla';

import { mDefaultArtboard } from '@/constants/editor';
import type { ObjectKind } from '@/core/schema/object-meta';
import type { Artboard } from '@/core/schema/scene';

export interface LayerSnapshot {
  id: string;
  name: string;
  kind: ObjectKind;
  hidden: boolean;
  locked: boolean;
}

export interface EditorState {
  ready: boolean;
  selection: string[];
  /** Top-most layer first. */
  layers: LayerSnapshot[];
  zoom: number;
  artboard: Artboard;
}

export type EditorStore = Mutate<StoreApi<EditorState>, [['zustand/immer', never]]>;

/** Plain serializable state only; Fabric objects never live in the store. */
export function createEditorStore(initial: Partial<EditorState> = {}): EditorStore {
  return createStore<EditorState>()(
    immer(() => ({
      ready: false,
      selection: [],
      layers: [],
      zoom: 1,
      artboard: { ...mDefaultArtboard },
      ...initial,
    })),
  );
}
