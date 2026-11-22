import { util, type FabricObject } from 'fabric';
import { z } from 'zod';

import {
  createErrorResponse,
  createMeta,
  getMeta,
  mErrorCode,
  migrateScene,
  ok,
  SceneDocumentSchema,
  setMeta,
  type Editor,
  type Result,
  type SceneDocument,
} from '@/core';
import { mAppId, mSceneSchemaVersion } from '@/constants/editor';
import { getUserObjects } from '@/plugins/shared/find';
import { inferObjectKind, publishLayers, publishSelection } from '@/plugins/shared/layers';

const RawObjectsSchema = z.array(z.record(z.string(), z.unknown()));

/** Serializes user objects and the artboard into a validated scene document. */
export function buildSceneDocument(editor: Editor): Result<SceneDocument> {
  const { canvas, store } = editor;
  const candidate: SceneDocument = {
    schemaVersion: mSceneSchemaVersion,
    app: mAppId,
    artboard: store.getState().artboard,
    canvas: canvas.toObject() as Record<string, unknown>,
  };
  const parsed = SceneDocumentSchema.safeParse(candidate);
  if (!parsed.success) {
    return createErrorResponse(mErrorCode.SceneInvalid, 'Scene is invalid', parsed.error.issues);
  }
  return ok(parsed.data);
}

/** Replaces every user object with the scene's objects. Returns the number loaded. */
export async function loadSceneDocument(
  editor: Editor,
  document: unknown,
): Promise<Result<number>> {
  const migrated = migrateScene(document);
  if (!migrated.success) return migrated;
  const scene = migrated.data;

  const rawObjects = RawObjectsSchema.safeParse(scene.canvas.objects);
  if (!rawObjects.success) {
    return createErrorResponse(mErrorCode.SceneInvalid, 'Scene has no valid objects list');
  }

  let enlivened: FabricObject[];
  try {
    enlivened = await util.enlivenObjects<FabricObject>(rawObjects.data);
  } catch (error: unknown) {
    console.error('[kanvaskit] scene objects could not be read', error);
    return createErrorResponse(mErrorCode.SceneInvalid, 'Could not read scene objects');
  }

  const { canvas, store, commands } = editor;
  canvas.discardActiveObject();
  for (const object of getUserObjects(canvas)) {
    canvas.remove(object);
  }
  store.setState((draft) => {
    draft.artboard = scene.artboard;
  });

  for (const object of enlivened) {
    if (!getMeta(object)) {
      setMeta(object, createMeta(inferObjectKind(object)));
    }
  }
  canvas.add(...enlivened);

  publishLayers(editor, 'loaded');
  publishSelection(editor);
  if (commands.has('viewport.zoomToFit')) {
    await commands.execute('viewport.zoomToFit');
  }
  canvas.requestRenderAll();
  return ok(enlivened.length);
}
