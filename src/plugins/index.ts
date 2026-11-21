import type { EditorPlugin } from '@/core/editor/types';
import { createObjectsPlugin } from '@/plugins/objects';
import { createViewportPlugin } from '@/plugins/viewport';

export { createObjectsPlugin, createViewportPlugin };

export function createLitePlugins(): EditorPlugin[] {
  return [createViewportPlugin(), createObjectsPlugin()];
}
