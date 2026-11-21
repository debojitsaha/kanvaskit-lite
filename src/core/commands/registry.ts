import { mErrorCode } from '@/core/errors/codes';
import { createErrorResponse, getErrorMessage, type Result } from '@/core/errors/result';
import type {
  CommandArgs,
  CommandContext,
  CommandDefinition,
  CommandExecuteArgs,
  CommandId,
  CommandRegistry,
  CommandResult,
} from '@/core/commands/types';

interface RegistryOptions {
  isDisposed: () => boolean;
  onExecuted: (id: string) => void;
}

type StoredDefinition = CommandDefinition<CommandId>;

export function createCommandRegistry(
  getContext: () => CommandContext,
  options: RegistryOptions,
): CommandRegistry {
  const definitions = new Map<string, StoredDefinition>();

  return {
    register<K extends CommandId>(definition: CommandDefinition<K>): () => void {
      if (definitions.has(definition.id)) {
        throw new Error(`[COMMAND_ALREADY_REGISTERED] ${definition.id}`);
      }
      const stored = definition as unknown as StoredDefinition;
      definitions.set(definition.id, stored);
      return () => {
        if (definitions.get(definition.id) === stored) {
          definitions.delete(definition.id);
        }
      };
    },

    async execute<K extends CommandId>(
      id: K,
      ...executeArgs: CommandExecuteArgs<K>
    ): Promise<Result<CommandResult<K>>> {
      if (options.isDisposed()) {
        return createErrorResponse(mErrorCode.EditorDisposed, 'Editor is disposed');
      }
      const definition = definitions.get(id);
      if (!definition) {
        return createErrorResponse(mErrorCode.CommandNotFound, `Unknown command: ${id}`);
      }

      const ctx = getContext();
      if (definition.canRun && !definition.canRun(ctx)) {
        return createErrorResponse(mErrorCode.CommandFailed, 'Command cannot run now');
      }

      const [args] = executeArgs as readonly unknown[];
      try {
        const result = await definition.run(ctx, args as CommandArgs<CommandId>);
        if (result.success) {
          options.onExecuted(id);
        }
        return result as Result<CommandResult<K>>;
      } catch (error: unknown) {
        return createErrorResponse(mErrorCode.CommandFailed, getErrorMessage(error));
      }
    },

    canExecute(id: CommandId): boolean {
      if (options.isDisposed()) return false;
      const definition = definitions.get(id);
      if (!definition) return false;
      return definition.canRun ? definition.canRun(getContext()) : true;
    },

    has(id: string): boolean {
      return definitions.has(id);
    },

    list(): { id: string; label: string }[] {
      return Array.from(definitions.values(), (definition) => ({
        id: definition.id,
        label: definition.label,
      }));
    },
  };
}
