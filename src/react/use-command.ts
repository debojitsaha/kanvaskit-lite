import { useCallback } from 'react';

import type { CommandExecuteArgs, CommandId, CommandResult } from '@/core/commands/types';
import type { Result } from '@/core/errors/result';
import { useEditor } from '@/react/use-editor';
import { useEditorStore } from '@/react/use-editor-store';

export function useCommand<K extends CommandId>(
  id: K,
): {
  execute: (...args: CommandExecuteArgs<K>) => Promise<Result<CommandResult<K>>>;
  canExecute: boolean;
} {
  const editor = useEditor();
  useEditorStore((state) => state.selection.length + (state.ready ? 1 : 0));

  const execute = useCallback(
    (...args: CommandExecuteArgs<K>) => editor.commands.execute(id, ...args),
    [editor, id],
  );

  return { execute, canExecute: editor.commands.canExecute(id) };
}
