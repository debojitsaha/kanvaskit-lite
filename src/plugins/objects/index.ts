import { mMaxImageBytes } from '@/constants/objects';
import { definePlugin, ok, sanitizeUrl, type EditorPlugin } from '@/core';

import { addEllipseObject, addRectObject } from '@/plugins/objects/shapes';
import { addTextObject } from '@/plugins/objects/text';
import { insertImageFromFile, insertImageFromUrl } from '@/plugins/objects/image';

declare module '@/core/commands/types' {
  interface CommandRegistryMap {
    'object.addText': { args: { text?: string }; result: string };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'object.addRect': { args: void; result: string };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'object.addEllipse': { args: void; result: string };
    'object.addImageFromUrl': { args: { url: string }; result: string };
    'object.addImageFromFile': { args: { file: File }; result: string };
  }
}

export interface ObjectsPluginOptions {
  maxImageBytes?: number;
}

export function createObjectsPlugin(options: ObjectsPluginOptions = {}): EditorPlugin {
  const maxImageBytes = options.maxImageBytes ?? mMaxImageBytes;

  return definePlugin({
    name: 'objects',
    setup(editor) {
      const unregister = [
        editor.commands.register({
          id: 'object.addText',
          label: 'Add text',
          run: (_ctx, args) => ok(addTextObject(editor, args.text)),
        }),
        editor.commands.register({
          id: 'object.addRect',
          label: 'Add rectangle',
          run: () => ok(addRectObject(editor)),
        }),
        editor.commands.register({
          id: 'object.addEllipse',
          label: 'Add ellipse',
          run: () => ok(addEllipseObject(editor)),
        }),
        editor.commands.register({
          id: 'object.addImageFromUrl',
          label: 'Add image from URL',
          run: async (_ctx, args) => {
            const sanitized = sanitizeUrl(args.url);
            if (!sanitized.success) return sanitized;
            return insertImageFromUrl(editor, sanitized.data);
          },
        }),
        editor.commands.register({
          id: 'object.addImageFromFile',
          label: 'Add image from file',
          run: async (_ctx, args) => {
            return insertImageFromFile(editor, args.file, maxImageBytes);
          },
        }),
      ];

      return () => {
        for (const off of unregister) off();
      };
    },
  });
}
