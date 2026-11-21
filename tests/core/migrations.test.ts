import { describe, expect, it } from 'vitest';

import { mAppId, mSceneSchemaVersion } from '@/constants/editor';
import { mErrorCode } from '@/core/errors/codes';
import { migrateScene, type SceneMigration } from '@/core/schema/migrations';

const mArtboard = { width: 1080, height: 1080, background: '#ffffff' };

function makeDoc(
  schemaVersion: unknown,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { schemaVersion, app: mAppId, artboard: mArtboard, canvas: {}, ...overrides };
}

describe('migrateScene', () => {
  it('accepts a current-version document', () => {
    const result = migrateScene(makeDoc(mSceneSchemaVersion));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(mSceneSchemaVersion);
      expect(result.data.artboard).toEqual(mArtboard);
    }
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'scene'],
  ])('rejects %s as SCENE_INVALID', (_label, raw) => {
    const result = migrateScene(raw);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(mErrorCode.SceneInvalid);
  });

  it('rejects a missing schemaVersion as SCENE_INVALID', () => {
    const doc = makeDoc(1);
    delete doc.schemaVersion;
    const result = migrateScene(doc);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(mErrorCode.SceneInvalid);
  });

  it('rejects a non-integer schemaVersion as SCENE_INVALID', () => {
    const result = migrateScene(makeDoc(1.5));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(mErrorCode.SceneInvalid);
  });

  it('rejects a version above the target as SCENE_VERSION_UNSUPPORTED', () => {
    const result = migrateScene(makeDoc(mSceneSchemaVersion + 1));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(mErrorCode.SceneVersionUnsupported);
  });

  it('rejects a missing migration step as SCENE_VERSION_UNSUPPORTED', () => {
    const result = migrateScene(makeDoc(1), {}, 2);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(mErrorCode.SceneVersionUnsupported);
  });

  it('migrates v1 to v3 in order and sets schemaVersion to 3', () => {
    const calls: number[] = [];
    const migrations: Record<number, SceneMigration> = {
      1: (doc) => {
        calls.push(1);
        return { ...doc, step1: true };
      },
      2: (doc) => {
        calls.push(2);
        return { ...doc, step2: true };
      },
    };

    const result = migrateScene(makeDoc(1), migrations, 3);

    expect(calls).toEqual([1, 2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(3);
      expect(result.data.canvas).toEqual({});
    }
  });

  it('returns SCENE_INVALID when a migration throws', () => {
    const migrations: Record<number, SceneMigration> = {
      1: () => {
        throw new Error('boom');
      },
    };

    const result = migrateScene(makeDoc(1), migrations, 2);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(mErrorCode.SceneInvalid);
      expect(result.error.message).toContain('boom');
    }
  });

  it('returns SCENE_INVALID with details for a wrong app', () => {
    const result = migrateScene(makeDoc(mSceneSchemaVersion, { app: 'other-app' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(mErrorCode.SceneInvalid);
      expect(result.error.details).toBeDefined();
    }
  });

  it('does not mutate the input object', () => {
    const input = makeDoc(1);
    const snapshot = structuredClone(input);
    const migrations: Record<number, SceneMigration> = {
      1: (doc) => {
        doc.touched = true;
        return doc;
      },
    };

    const result = migrateScene(input, migrations, 2);

    expect(result.success).toBe(true);
    expect(input).toEqual(snapshot);
    expect(input.schemaVersion).toBe(1);
  });
});
