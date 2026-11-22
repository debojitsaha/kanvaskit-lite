import { definePlugin, type EditorPlugin, type SceneDocument } from '@/core';
import { exportArtboardPng } from '@/plugins/io/export-png';
import { buildSceneDocument, loadSceneDocument } from '@/plugins/io/scene-io';

declare module '@/core/commands/types' {
  interface CommandRegistryMap {
    'export.png': { args: { multiplier?: number }; result: string };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'scene.save': { args: void; result: SceneDocument };
    'scene.load': { args: { document: unknown }; result: number };
  }
}

const mDefaultMultiplier = 1;

/** PNG export of the artboard and JSON scene save/load. */
export function createIoPlugin(): EditorPlugin {
  return definePlugin({
    name: 'io',
    setup(editor) {
      const unregisters = [
        editor.commands.register({
          id: 'export.png',
          label: 'Export PNG',
          run: (_context, args) => exportArtboardPng(editor, args.multiplier ?? mDefaultMultiplier),
        }),
        editor.commands.register({
          id: 'scene.save',
          label: 'Save scene',
          run: () => buildSceneDocument(editor),
        }),
        editor.commands.register({
          id: 'scene.load',
          label: 'Load scene',
          run: (_context, args) => loadSceneDocument(editor, args.document),
        }),
      ];

      return () => {
        for (const unregister of unregisters) unregister();
      };
    },
  });
}
