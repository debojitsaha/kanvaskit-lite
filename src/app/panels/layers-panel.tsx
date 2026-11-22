import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import type { Result } from '@/core/errors/result';
import type { LayerSnapshot } from '@/core/store/editor-store';
import { useCommand, useEditorStore } from '@/react';

export function LayersPanel() {
  const layers = useEditorStore((state) => state.layers);
  const selection = useEditorStore((state) => state.selection);
  const selectLayer = useCommand('layer.select');
  const toggleVisibility = useCommand('layer.toggleVisibility');
  const toggleLock = useCommand('layer.toggleLock');
  const renameLayer = useCommand('layer.rename');
  const [message, setMessage] = useState<string | null>(null);

  async function run(execute: () => Promise<Result<unknown>>) {
    setMessage(null);
    const result = await execute();
    if (!result.success) setMessage(result.error.message);
  }

  return (
    <aside aria-label="Layers" className="col-start-2 row-start-2 overflow-y-auto border-l">
      <h2 className="px-3 py-2 text-sm font-medium">Layers</h2>
      {layers.length === 0 ? (
        <p className="px-3 text-sm text-muted-foreground">No layers yet</p>
      ) : (
        <ul className="flex flex-col gap-0.5 px-2 pb-2">
          {layers.map((layer) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              selected={selection.includes(layer.id)}
              onSelect={() => void run(() => selectLayer.execute({ id: layer.id }))}
              onToggleVisibility={() => void run(() => toggleVisibility.execute({ id: layer.id }))}
              onToggleLock={() => void run(() => toggleLock.execute({ id: layer.id }))}
              onRename={(name) => void run(() => renameLayer.execute({ id: layer.id, name }))}
            />
          ))}
        </ul>
      )}
      {message ? (
        <p role="status" className="px-3 pb-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </aside>
  );
}

interface LayerRowProps {
  layer: LayerSnapshot;
  selected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRename: (name: string) => void;
}

function LayerRow({
  layer,
  selected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
}: LayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);
  const settledRef = useRef(false);

  function startEditing() {
    settledRef.current = false;
    setDraft(layer.name);
    setEditing(true);
  }

  function settle(commit: boolean) {
    if (settledRef.current) return;
    settledRef.current = true;
    setEditing(false);
    if (commit && draft.trim() !== layer.name) onRename(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      settle(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      settle(false);
    }
  }

  return (
    <li className={cn('flex items-center gap-1 rounded-md px-1 py-0.5', selected && 'bg-accent')}>
      {editing ? (
        <input
          aria-label="Layer name"
          autoFocus
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            settle(true);
          }}
          className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          onDoubleClick={startEditing}
          className={cn(
            'min-w-0 flex-1 truncate rounded-sm px-2 py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
            layer.hidden && 'opacity-50',
          )}
        >
          {layer.name}
        </button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={layer.hidden ? 'Show layer' : 'Hide layer'}
        title={layer.hidden ? 'Show layer' : 'Hide layer'}
        className="size-7"
        onClick={onToggleVisibility}
      >
        {layer.hidden ? <EyeOff /> : <Eye />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        className="size-7"
        onClick={onToggleLock}
      >
        {layer.locked ? <Lock /> : <LockOpen />}
      </Button>
    </li>
  );
}
