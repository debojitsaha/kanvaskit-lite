import { useStore } from 'zustand';

import type { EditorState } from '@/core/store/editor-store';
import { useEditor } from '@/react/use-editor';

export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  return useStore(useEditor().store, selector);
}
