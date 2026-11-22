import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { useCommand, useEditorStore } from '@/react';

export function ZoomControls() {
  const zoom = useEditorStore((state) => state.zoom);
  const zoomIn = useCommand('viewport.zoomIn');
  const zoomOut = useCommand('viewport.zoomOut');
  const zoomToFit = useCommand('viewport.zoomToFit');
  const [message, setMessage] = useState<string | null>(null);

  async function handleZoomIn() {
    setMessage(null);
    const result = await zoomIn.execute();
    if (!result.success) setMessage(result.error.message);
  }

  async function handleZoomOut() {
    setMessage(null);
    const result = await zoomOut.execute();
    if (!result.success) setMessage(result.error.message);
  }

  async function handleZoomToFit() {
    setMessage(null);
    const result = await zoomToFit.execute();
    if (!result.success) setMessage(result.error.message);
  }

  return (
    <div className="flex items-center gap-1">
      {message ? (
        <p role="status" className="mr-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => void handleZoomOut()}
      >
        <ZoomOut />
      </Button>
      <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => void handleZoomIn()}
      >
        <ZoomIn />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom to fit"
        title="Zoom to fit"
        onClick={() => void handleZoomToFit()}
      >
        <Maximize />
      </Button>
    </div>
  );
}
