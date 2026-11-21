import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEventBus } from '@/core/events/bus';

interface TestEventMap {
  'test:value': { value: number };
  'test:empty': Record<string, never>;
}

describe('createEventBus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delivers a typed payload to subscribers', () => {
    const bus = createEventBus<TestEventMap>();
    const handler = vi.fn<(payload: { value: number }) => void>();

    bus.on('test:value', handler);
    bus.emit('test:value', { value: 42 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('stops delivery after the unsubscribe function is called', () => {
    const bus = createEventBus<TestEventMap>();
    const handler = vi.fn<(payload: { value: number }) => void>();

    const unsubscribe = bus.on('test:value', handler);
    bus.emit('test:value', { value: 1 });
    unsubscribe();
    bus.emit('test:value', { value: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ value: 1 });
  });

  it('off removes a specific handler only', () => {
    const bus = createEventBus<TestEventMap>();
    const removed = vi.fn<(payload: { value: number }) => void>();
    const kept = vi.fn<(payload: { value: number }) => void>();

    bus.on('test:value', removed);
    bus.on('test:value', kept);
    bus.off('test:value', removed);
    bus.emit('test:value', { value: 7 });

    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledWith({ value: 7 });
  });

  it('keeps calling later handlers when a handler throws', () => {
    const bus = createEventBus<TestEventMap>();
    const error = new Error('boom');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const later = vi.fn<(payload: { value: number }) => void>();

    bus.on('test:value', () => {
      throw error;
    });
    bus.on('test:value', later);
    bus.emit('test:value', { value: 3 });

    expect(later).toHaveBeenCalledWith({ value: 3 });
    expect(spy).toHaveBeenCalledWith('[kanvaskit] event handler failed', 'test:value', error);
    spy.mockRestore();
  });

  it('clear removes all handlers', () => {
    const bus = createEventBus<TestEventMap>();
    const valueHandler = vi.fn<(payload: { value: number }) => void>();
    const emptyHandler = vi.fn<(payload: Record<string, never>) => void>();

    bus.on('test:value', valueHandler);
    bus.on('test:empty', emptyHandler);
    bus.clear();
    bus.emit('test:value', { value: 1 });
    bus.emit('test:empty', {});

    expect(valueHandler).not.toHaveBeenCalled();
    expect(emptyHandler).not.toHaveBeenCalled();
  });

  it('tolerates a handler that unsubscribes itself during emit', () => {
    const bus = createEventBus<TestEventMap>();
    const second = vi.fn<(payload: { value: number }) => void>();
    const firstCalls: number[] = [];
    let unsubscribeFirst: () => void = () => undefined;

    unsubscribeFirst = bus.on('test:value', (payload) => {
      firstCalls.push(payload.value);
      unsubscribeFirst();
    });
    bus.on('test:value', second);

    bus.emit('test:value', { value: 1 });
    bus.emit('test:value', { value: 2 });

    expect(firstCalls).toEqual([1]);
    expect(second).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenLastCalledWith({ value: 2 });
  });
});
