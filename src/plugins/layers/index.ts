import type { FabricObject } from 'fabric';

import {
  createErrorResponse,
  definePlugin,
  getMeta,
  mErrorCode,
  ok,
  setMeta,
  type EditorPlugin,
  type ObjectMeta,
} from '@/core';
import {
  applyMetaState,
  publishLayers,
  publishSelection,
  selectObjects,
} from '@/plugins/shared/layers';
import { findObjectById, getUserObjects } from '@/plugins/shared/find';

declare module '@/core/commands/types' {
  interface CommandRegistryMap {
    'layer.select': { args: { id: string }; result: null };
    'layer.toggleVisibility': { args: { id: string }; result: boolean };
    'layer.toggleLock': { args: { id: string }; result: boolean };
    'layer.rename': { args: { id: string; name: string }; result: string };
  }
}

const mMaxLayerNameLength = 64;

/** Layer list, selection by layer id, visibility, lock and rename commands. */
export function createLayersPlugin(): EditorPlugin {
  return definePlugin({
    name: 'layers',
    setup(editor) {
      const { canvas, commands, events } = editor;

      const updateMeta = (object: FabricObject, patch: Partial<ObjectMeta>): boolean => {
        const meta = getMeta(object);
        if (!meta) return false;
        const next = { ...meta, ...patch };
        setMeta(object, next);
        applyMetaState(object, next);
        return true;
      };

      const applyLoadedState = (): void => {
        for (const object of getUserObjects(canvas)) {
          const meta = getMeta(object);
          if (meta) applyMetaState(object, meta);
        }
        canvas.requestRenderAll();
      };

      const unsubscribeLoaded = events.on('objects:change', ({ reason }) => {
        if (reason === 'loaded') applyLoadedState();
      });

      const unregisters = [
        commands.register({
          id: 'layer.select',
          label: 'Select layer',
          run: (_context, args) => {
            const object = findObjectById(canvas, args.id);
            if (!object) return createErrorResponse(mErrorCode.CommandFailed, 'Layer not found');
            const meta = getMeta(object);
            if (!meta || meta.hidden || meta.locked) {
              return createErrorResponse(mErrorCode.CommandFailed, 'Layer is hidden or locked');
            }
            selectObjects(editor, [object]);
            return ok(null);
          },
        }),
        commands.register({
          id: 'layer.toggleVisibility',
          label: 'Toggle layer visibility',
          run: (_context, args) => {
            const object = findObjectById(canvas, args.id);
            const meta = object ? getMeta(object) : undefined;
            if (!object || !meta) {
              return createErrorResponse(mErrorCode.CommandFailed, 'Layer not found');
            }
            const hidden = !meta.hidden;
            if (hidden && canvas.getActiveObjects().includes(object)) {
              canvas.discardActiveObject();
              publishSelection(editor);
            }
            updateMeta(object, { hidden });
            publishLayers(editor, 'modified');
            canvas.requestRenderAll();
            return ok(hidden);
          },
        }),
        commands.register({
          id: 'layer.toggleLock',
          label: 'Toggle layer lock',
          run: (_context, args) => {
            const object = findObjectById(canvas, args.id);
            const meta = object ? getMeta(object) : undefined;
            if (!object || !meta) {
              return createErrorResponse(mErrorCode.CommandFailed, 'Layer not found');
            }
            const locked = !meta.locked;
            updateMeta(object, { locked });
            publishLayers(editor, 'modified');
            canvas.requestRenderAll();
            return ok(locked);
          },
        }),
        commands.register({
          id: 'layer.rename',
          label: 'Rename layer',
          run: (_context, args) => {
            const name = args.name.trim();
            if (name.length === 0 || name.length > mMaxLayerNameLength) {
              return createErrorResponse(mErrorCode.CommandFailed, 'Invalid layer name');
            }
            const object = findObjectById(canvas, args.id);
            if (!object || !updateMeta(object, { name })) {
              return createErrorResponse(mErrorCode.CommandFailed, 'Layer not found');
            }
            publishLayers(editor, 'modified');
            return ok(name);
          },
        }),
      ];

      return () => {
        for (const unregister of unregisters) unregister();
        unsubscribeLoaded();
      };
    },
  });
}
