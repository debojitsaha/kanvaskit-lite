export {
  mDefaultArtboard,
  mMaxArtboardSize,
  mSceneSchemaVersion,
  mAppId,
} from '@/constants/editor';

export { mErrorCode, type ErrorCode } from '@/core/errors/codes';
export {
  createErrorResponse,
  getErrorMessage,
  ok,
  type EditorError,
  type Result,
} from '@/core/errors/result';

export { createId } from '@/core/utils/id';
export { sanitizeUrl } from '@/core/utils/sanitize-url';

export { createEventBus } from '@/core/events/bus';
export type { EditorEventMap, EventBus, EventHandler } from '@/core/events/types';

export { createCommandRegistry } from '@/core/commands/registry';
export type {
  CommandArgs,
  CommandContext,
  CommandDefinition,
  CommandExecuteArgs,
  CommandId,
  CommandRegistry,
  CommandRegistryMap,
  CommandResult,
  CommandSpec,
} from '@/core/commands/types';

export {
  ArtboardSchema,
  SceneDocumentSchema,
  type Artboard,
  type SceneDocument,
} from '@/core/schema/scene';
export {
  ObjectKindSchema,
  ObjectMetaSchema,
  TimingSchema,
  type ObjectKind,
  type ObjectMeta,
} from '@/core/schema/object-meta';
export { mSceneMigrations, migrateScene, type SceneMigration } from '@/core/schema/migrations';

export {
  createEditorStore,
  type EditorState,
  type EditorStore,
  type LayerSnapshot,
} from '@/core/store/editor-store';

export { createEditor } from '@/core/editor/create-editor';
export { definePlugin } from '@/core/editor/define-plugin';
export { createMeta, getMeta, registerMetaSerialization, setMeta } from '@/core/editor/meta';
export { snapshotLayers } from '@/core/editor/sync';
export type { CreateEditorOptions, Editor, EditorPlugin } from '@/core/editor/types';
