import type { EditorPlugin } from '@/core';
import { createArrangePlugin } from '@/plugins/arrange';
import { createIoPlugin } from '@/plugins/io';
import { createLayersPlugin } from '@/plugins/layers';
import { createObjectsPlugin } from '@/plugins/objects';
import { createShortcutsPlugin } from '@/plugins/shortcuts';
import { createViewportPlugin } from '@/plugins/viewport';

export {
  createArrangePlugin,
  createIoPlugin,
  createLayersPlugin,
  createObjectsPlugin,
  createShortcutsPlugin,
  createViewportPlugin,
};

export function createLitePlugins(): EditorPlugin[] {
  return [
    createViewportPlugin(),
    createObjectsPlugin(),
    createArrangePlugin(),
    createLayersPlugin(),
    createIoPlugin(),
    createShortcutsPlugin(),
  ];
}
