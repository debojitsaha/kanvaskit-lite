import { ArrowDown, ArrowUp, Copy, Group, Trash2, Ungroup } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import type { Result } from '@/core/errors/result';
import { useCommand, useEditorStore } from '@/react';

export function ArrangeControls() {
  const selectionCount = useEditorStore((state) => state.selection.length);
  const duplicate = useCommand('selection.duplicate');
  const remove = useCommand('selection.delete');
  const bringForward = useCommand('arrange.bringForward');
  const sendBackward = useCommand('arrange.sendBackward');
  const group = useCommand('selection.group');
  const ungroup = useCommand('selection.ungroup');
  const [message, setMessage] = useState<string | null>(null);

  async function run(execute: () => Promise<Result<unknown>>) {
    setMessage(null);
    const result = await execute();
    if (!result.success) setMessage(result.error.message);
  }

  const hasSelection = selectionCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Duplicate"
        title="Duplicate"
        disabled={!hasSelection}
        onClick={() => void run(() => duplicate.execute())}
      >
        <Copy />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete"
        title="Delete"
        disabled={!hasSelection}
        onClick={() => void run(() => remove.execute())}
      >
        <Trash2 />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Bring forward"
        title="Bring forward"
        disabled={!hasSelection}
        onClick={() => void run(() => bringForward.execute())}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Send backward"
        title="Send backward"
        disabled={!hasSelection}
        onClick={() => void run(() => sendBackward.execute())}
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Group"
        title="Group"
        disabled={selectionCount < 2}
        onClick={() => void run(() => group.execute())}
      >
        <Group />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ungroup"
        title="Ungroup"
        disabled={!hasSelection}
        onClick={() => void run(() => ungroup.execute())}
      >
        <Ungroup />
      </Button>
      {message ? (
        <p role="status" className="ml-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
