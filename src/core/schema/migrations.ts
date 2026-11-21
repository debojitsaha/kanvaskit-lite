import { mSceneSchemaVersion } from '@/constants/editor';
import { mErrorCode } from '@/core/errors/codes';
import { createErrorResponse, getErrorMessage, ok, type Result } from '@/core/errors/result';

import { SceneDocumentSchema, type SceneDocument } from '@/core/schema/scene';

export type SceneMigration = (doc: Record<string, unknown>) => Record<string, unknown>;

/** Key n migrates a document from schemaVersion n to n+1. */
export const mSceneMigrations: Readonly<Record<number, SceneMigration>> = {};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates and migrates a raw scene document up to `targetVersion`.
 * The input object is never mutated; migrations receive a shallow copy.
 */
export function migrateScene(
  raw: unknown,
  migrations: Readonly<Record<number, SceneMigration>> = mSceneMigrations,
  targetVersion: number = mSceneSchemaVersion,
): Result<SceneDocument> {
  if (!isPlainObject(raw)) {
    return createErrorResponse(mErrorCode.SceneInvalid, 'Scene document must be an object');
  }

  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return createErrorResponse(
      mErrorCode.SceneInvalid,
      'Scene schemaVersion must be a positive integer',
    );
  }

  if (version > targetVersion) {
    return createErrorResponse(
      mErrorCode.SceneVersionUnsupported,
      `Scene schemaVersion ${String(version)} is newer than supported ${String(targetVersion)}`,
    );
  }

  let doc: Record<string, unknown> = { ...raw };
  let current = version;

  while (current < targetVersion) {
    const migrate = migrations[current];
    if (!migrate) {
      return createErrorResponse(
        mErrorCode.SceneVersionUnsupported,
        `No migration from schemaVersion ${String(current)}`,
      );
    }
    try {
      doc = { ...migrate({ ...doc }), schemaVersion: current + 1 };
    } catch (error) {
      return createErrorResponse(
        mErrorCode.SceneInvalid,
        `Migration from schemaVersion ${String(current)} failed: ${getErrorMessage(error)}`,
      );
    }
    current += 1;
  }

  const parsed = SceneDocumentSchema.safeParse(doc);
  if (!parsed.success) {
    return createErrorResponse(
      mErrorCode.SceneInvalid,
      'Scene document is invalid',
      parsed.error.issues,
    );
  }

  return ok(parsed.data);
}
