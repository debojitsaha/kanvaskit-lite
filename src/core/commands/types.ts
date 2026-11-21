import type { Result } from '@/core/errors/result';
import type { Editor } from '@/core/editor/types';

export interface CommandSpec<TArgs, TResult> {
  args: TArgs;
  result: TResult;
}

/** Augmented by plugins: 'object.delete': CommandSpec<void, string[]> */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommandRegistryMap {}

export type CommandId = Extract<keyof CommandRegistryMap, string>;

export type CommandArgs<K extends CommandId> =
  CommandRegistryMap[K] extends CommandSpec<infer A, unknown> ? A : never;

export type CommandResult<K extends CommandId> =
  CommandRegistryMap[K] extends CommandSpec<unknown, infer R> ? R : never;

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
export type CommandExecuteArgs<K extends CommandId> = [CommandArgs<K>] extends [void]
  ? []
  : [args: CommandArgs<K>];

export interface CommandContext {
  editor: Editor;
}

export interface CommandDefinition<K extends CommandId> {
  id: K;
  label: string;
  run(
    ctx: CommandContext,
    args: CommandArgs<K>,
  ): Result<CommandResult<K>> | Promise<Result<CommandResult<K>>>;
  canRun?(ctx: CommandContext): boolean;
}

export interface CommandRegistry {
  register<K extends CommandId>(definition: CommandDefinition<K>): () => void;
  execute<K extends CommandId>(
    id: K,
    ...args: CommandExecuteArgs<K>
  ): Promise<Result<CommandResult<K>>>;
  canExecute(id: CommandId): boolean;
  has(id: string): boolean;
  list(): { id: string; label: string }[];
}
