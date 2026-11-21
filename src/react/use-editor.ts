import { useContext } from 'react';

import type { Editor } from '@/core/editor/types';
import { EditorContext } from '@/react/editor-context';

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) {
    throw new Error('[EDITOR_CONTEXT_MISSING] useEditor must be used inside <EditorProvider>');
  }
  return editor;
}
