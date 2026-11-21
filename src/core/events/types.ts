export interface EditorEventMap {
  'editor:ready': Record<string, never>;
  'editor:dispose': Record<string, never>;
  'selection:change': { ids: string[] };
  'objects:change': { reason: 'added' | 'removed' | 'modified' | 'reordered' | 'loaded' };
  'viewport:change': { zoom: number };
  'command:executed': { id: string };
}

export type EventHandler<T> = (payload: T) => void;

export interface EventBus<TMap extends object> {
  on<K extends keyof TMap>(type: K, handler: EventHandler<TMap[K]>): () => void;
  off<K extends keyof TMap>(type: K, handler: EventHandler<TMap[K]>): void;
  emit<K extends keyof TMap>(type: K, payload: TMap[K]): void;
  clear(): void;
}
