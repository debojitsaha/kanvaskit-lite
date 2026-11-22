import { mWorkspaceBackground, mZoomStep } from '@/constants/viewport';
import { mErrorCode } from '@/core/errors/codes';
import { definePlugin } from '@/core/editor/define-plugin';
import type { EditorPlugin } from '@/core/editor/types';
import { createErrorResponse, ok } from '@/core/errors/result';
import { ArtboardSchema, type Artboard } from '@/core/schema/scene';
import {
  createArtboardRect,
  isArtboardRect,
  updateArtboardRect,
} from '@/plugins/viewport/artboard';
import { bindPan } from '@/plugins/viewport/pan';
import { observeContainer } from '@/plugins/viewport/resize';
import {
  bindWheel,
  fitArtboard,
  publishZoom,
  zoomAroundCenter,
  type ViewportState,
} from '@/plugins/viewport/zoom';

declare module '@/core/commands/types' {
  interface CommandRegistryMap {
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks a no-arg command
    'viewport.zoomIn': { args: void; result: number };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks a no-arg command
    'viewport.zoomOut': { args: void; result: number };
    'viewport.setZoom': { args: { zoom: number }; result: number };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks a no-arg command
    'viewport.zoomToFit': { args: void; result: number };
    'artboard.resize': { args: { width: number; height: number }; result: Artboard };
    'artboard.setBackground': { args: { color: string }; result: Artboard };
  }
}

export { isArtboardRect };

/** Workspace, artboard rect, zoom/fit commands, wheel and pan handling. */
export function createViewportPlugin(): EditorPlugin {
  return definePlugin({
    name: 'viewport',
    setup(editor) {
      const { canvas, store, commands } = editor;
      const viewportState: ViewportState = { fitMode: true };
      canvas.backgroundColor = mWorkspaceBackground;

      const artboardRect = createArtboardRect(store.getState().artboard);
      canvas.add(artboardRect);
      canvas.sendObjectToBack(artboardRect);

      const fit = (): number => {
        viewportState.fitMode = true;
        return publishZoom(editor, fitArtboard(canvas, store.getState().artboard));
      };
      const zoomTo = (zoom: number): number => {
        viewportState.fitMode = false;
        return publishZoom(editor, zoomAroundCenter(canvas, zoom));
      };

      fit();

      const unbindAdded = canvas.on('object:added', () => {
        if (canvas.getObjects()[0] !== artboardRect) canvas.sendObjectToBack(artboardRect);
      });
      const unsubscribe = store.subscribe((next, previous) => {
        if (next.artboard === previous.artboard) return;
        updateArtboardRect(artboardRect, next.artboard);
        canvas.requestRenderAll();
      });
      const unobserve = observeContainer(canvas, () => {
        if (viewportState.fitMode) {
          fit();
        } else {
          canvas.requestRenderAll();
        }
      });
      const unbindWheel = bindWheel(editor, viewportState);
      const unbindPan = bindPan(editor, viewportState);

      const unregisters = [
        commands.register({
          id: 'viewport.zoomIn',
          label: 'Zoom in',
          run: () => ok(zoomTo(canvas.getZoom() * mZoomStep)),
        }),
        commands.register({
          id: 'viewport.zoomOut',
          label: 'Zoom out',
          run: () => ok(zoomTo(canvas.getZoom() / mZoomStep)),
        }),
        commands.register({
          id: 'viewport.setZoom',
          label: 'Set zoom',
          run: (_context, args) => {
            if (!Number.isFinite(args.zoom)) {
              return createErrorResponse(mErrorCode.CommandFailed, 'Invalid zoom');
            }
            return ok(zoomTo(args.zoom));
          },
        }),
        commands.register({
          id: 'viewport.zoomToFit',
          label: 'Zoom to fit',
          run: () => ok(fit()),
        }),
        commands.register({
          id: 'artboard.resize',
          label: 'Resize artboard',
          run: (_context, args) => {
            const parsed = ArtboardSchema.safeParse({
              ...store.getState().artboard,
              width: args.width,
              height: args.height,
            });
            if (!parsed.success) {
              return createErrorResponse(
                mErrorCode.CommandFailed,
                'Invalid artboard size',
                parsed.error.issues,
              );
            }
            const artboard = parsed.data;
            store.setState((draft) => {
              draft.artboard = artboard;
            });
            fit();
            return ok(artboard);
          },
        }),
        commands.register({
          id: 'artboard.setBackground',
          label: 'Set artboard background',
          run: (_context, args) => {
            const color = args.color.trim();
            if (color.length === 0) {
              return createErrorResponse(mErrorCode.CommandFailed, 'Background color is required');
            }
            store.setState((draft) => {
              draft.artboard.background = color;
            });
            return ok(store.getState().artboard);
          },
        }),
      ];

      return () => {
        for (const unregister of unregisters) unregister();
        unbindPan();
        unbindWheel();
        unobserve();
        unsubscribe();
        unbindAdded();
        canvas.remove(artboardRect);
      };
    },
  });
}
