import type { EventBus, EventHandler } from '@/core/events/types';

type AnyHandler = (payload: unknown) => void;

/** Synchronous typed event bus. Handler errors are logged and do not stop other handlers. */
export function createEventBus<TMap extends object>(): EventBus<TMap> {
  const handlers = new Map<keyof TMap, Set<AnyHandler>>();

  function off<K extends keyof TMap>(type: K, handler: EventHandler<TMap[K]>): void {
    const set = handlers.get(type);
    if (!set) return;
    set.delete(handler as AnyHandler);
    if (set.size === 0) handlers.delete(type);
  }

  return {
    on<K extends keyof TMap>(type: K, handler: EventHandler<TMap[K]>): () => void {
      const set = handlers.get(type) ?? new Set<AnyHandler>();
      set.add(handler as AnyHandler);
      handlers.set(type, set);
      return () => {
        off(type, handler);
      };
    },

    off,

    emit<K extends keyof TMap>(type: K, payload: TMap[K]): void {
      const set = handlers.get(type);
      if (!set) return;
      for (const handler of Array.from(set)) {
        try {
          handler(payload);
        } catch (error: unknown) {
          console.error('[kanvaskit] event handler failed', type, error);
        }
      }
    },

    clear(): void {
      handlers.clear();
    },
  };
}
