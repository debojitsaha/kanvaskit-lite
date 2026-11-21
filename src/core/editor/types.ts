import type { Canvas } from 'fabric';

import type { CommandRegistry } from '@/core/commands/types';
import type { EditorEventMap, EventBus } from '@/core/events/types';
import type { Artboard } from '@/core/schema/scene';
import type { EditorStore } from '@/core/store/editor-store';

export interface EditorPlugin {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void means no cleanup
  setup(editor: Editor): void | (() => void);
}

export interface Editor {
  readonly id: string;
  readonly canvas: Canvas;
  readonly store: EditorStore;
  readonly events: EventBus<EditorEventMap>;
  readonly commands: CommandRegistry;
  readonly isDisposed: boolean;
  /** Throws `[PLUGIN_ALREADY_REGISTERED]` on a duplicate name and `[EDITOR_DISPOSED]` after dispose. */
  use(plugin: EditorPlugin): void;
  /** Idempotent: repeated calls return the same promise. */
  dispose(): Promise<void>;
}

export interface CreateEditorOptions {
  container: HTMLElement;
  artboard?: Partial<Artboard>;
  plugins?: EditorPlugin[];
}
