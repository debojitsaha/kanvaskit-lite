import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCommandRegistry } from '@/core/commands/registry';
import type { CommandId } from '@/core/commands/types';
import type { Editor } from '@/core/editor/types';
import { ok } from '@/core/errors/result';

declare module '@/core/commands/types' {
  interface CommandRegistryMap {
    'test.echo': { args: { value: string }; result: string };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks a no-arg command
    'test.ping': { args: void; result: number };
  }
}

describe('createCommandRegistry', () => {
  let disposed = false;
  const onExecuted = vi.fn<(id: string) => void>();

  function createRegistry() {
    return createCommandRegistry(() => ({ editor: {} as Editor }), {
      isDisposed: () => disposed,
      onExecuted,
    });
  }

  afterEach(() => {
    disposed = false;
    onExecuted.mockReset();
    vi.restoreAllMocks();
  });

  it('registers and executes a command with args', async () => {
    const registry = createRegistry();
    registry.register({
      id: 'test.echo',
      label: 'Echo',
      run: (_ctx, args) => ok(args.value),
    });

    const result = await registry.execute('test.echo', { value: 'hi' });

    expect(result).toEqual({ success: true, data: 'hi' });
  });

  it('registers and executes a command without args', async () => {
    const registry = createRegistry();
    registry.register({
      id: 'test.ping',
      label: 'Ping',
      run: () => ok(1),
    });

    const result = await registry.execute('test.ping');

    expect(result).toEqual({ success: true, data: 1 });
  });

  it('throws when registering a duplicate id', () => {
    const registry = createRegistry();
    const definition = { id: 'test.ping' as const, label: 'Ping', run: () => ok(1) };
    registry.register(definition);

    expect(() => registry.register(definition)).toThrow('[COMMAND_ALREADY_REGISTERED]');
  });

  it('unregister removes the command', async () => {
    const registry = createRegistry();
    const unregister = registry.register({
      id: 'test.ping',
      label: 'Ping',
      run: () => ok(1),
    });

    unregister();
    const result = await registry.execute('test.ping');

    expect(registry.has('test.ping')).toBe(false);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('COMMAND_NOT_FOUND');
  });

  it('returns COMMAND_NOT_FOUND for an unknown id', async () => {
    const registry = createRegistry();

    const result = await registry.execute('missing.command' as CommandId, undefined);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('COMMAND_NOT_FOUND');
    expect(onExecuted).not.toHaveBeenCalled();
  });

  it('returns COMMAND_FAILED when canRun is false', async () => {
    const registry = createRegistry();
    const run = vi.fn(() => ok(1));
    registry.register({ id: 'test.ping', label: 'Ping', run, canRun: () => false });

    const result = await registry.execute('test.ping');

    expect(run).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('COMMAND_FAILED');
      expect(result.error.message).toBe('Command cannot run now');
    }
  });

  it('returns COMMAND_FAILED with the message when run throws', async () => {
    const registry = createRegistry();
    registry.register({
      id: 'test.ping',
      label: 'Ping',
      run: () => {
        throw new Error('exploded');
      },
    });

    const result = await registry.execute('test.ping');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('COMMAND_FAILED');
      expect(result.error.message).toBe('exploded');
    }
  });

  it('returns EDITOR_DISPOSED when the editor is disposed', async () => {
    const registry = createRegistry();
    registry.register({ id: 'test.ping', label: 'Ping', run: () => ok(1) });
    disposed = true;

    const result = await registry.execute('test.ping');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('EDITOR_DISPOSED');
    expect(onExecuted).not.toHaveBeenCalled();
  });

  it('calls onExecuted with the id only on success', async () => {
    const registry = createRegistry();
    registry.register({
      id: 'test.echo',
      label: 'Echo',
      run: (_ctx, args) =>
        args.value === 'bad'
          ? { success: false, error: { code: 'COMMAND_FAILED', message: 'bad' } }
          : ok(args.value),
    });

    await registry.execute('test.echo', { value: 'bad' });
    expect(onExecuted).not.toHaveBeenCalled();

    await registry.execute('test.echo', { value: 'good' });
    expect(onExecuted).toHaveBeenCalledOnce();
    expect(onExecuted).toHaveBeenCalledWith('test.echo');
  });

  it('lists registered ids and labels', () => {
    const registry = createRegistry();
    registry.register({ id: 'test.echo', label: 'Echo', run: (_ctx, args) => ok(args.value) });
    registry.register({ id: 'test.ping', label: 'Ping', run: () => ok(1) });

    expect(registry.list()).toEqual([
      { id: 'test.echo', label: 'Echo' },
      { id: 'test.ping', label: 'Ping' },
    ]);
  });

  it('executes an async run and awaits its result', async () => {
    const registry = createRegistry();
    registry.register({
      id: 'test.ping',
      label: 'Ping',
      run: async () => {
        await Promise.resolve();
        return ok(5);
      },
    });

    const result = await registry.execute('test.ping');

    expect(result).toEqual({ success: true, data: 5 });
    expect(onExecuted).toHaveBeenCalledWith('test.ping');
  });
});
