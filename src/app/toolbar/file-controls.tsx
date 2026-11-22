import { FolderOpen, ImageDown, Save } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import { downloadDataUrl, downloadJson, readFileAsText } from '@/app/lib/download';
import { useCommand } from '@/react';

export function FileControls() {
  const exportPng = useCommand('export.png');
  const saveScene = useCommand('scene.save');
  const loadScene = useCommand('scene.load');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExportPng() {
    setMessage(null);
    const result = await exportPng.execute({ multiplier: 1 });
    if (!result.success) {
      setMessage(result.error.message);
      return;
    }
    downloadDataUrl('kanvaskit.png', result.data);
  }

  async function handleSaveJson() {
    setMessage(null);
    const result = await saveScene.execute();
    if (!result.success) {
      setMessage(result.error.message);
      return;
    }
    downloadJson('kanvaskit.json', result.data);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setMessage(null);

    let text: string;
    try {
      text = await readFileAsText(file);
    } catch (error) {
      console.error('[FILE_READ_FAILED] Could not read the selected file', error);
      setMessage('Could not read the selected file');
      return;
    }

    let sceneDocument: unknown;
    try {
      sceneDocument = JSON.parse(text);
    } catch (error) {
      console.error('[FILE_JSON_INVALID] JSON.parse failed for the selected file', error);
      setMessage('File is not valid JSON');
      return;
    }

    const result = await loadScene.execute({ document: sceneDocument });
    if (!result.success) setMessage(result.error.message);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Export PNG"
        title="Export PNG"
        onClick={() => void handleExportPng()}
      >
        <ImageDown />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Save JSON"
        title="Save JSON"
        onClick={() => void handleSaveJson()}
      >
        <Save />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open JSON"
        title="Open JSON"
        onClick={() => {
          fileInputRef.current?.click();
        }}
      >
        <FolderOpen />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
      {message ? (
        <p role="status" className="ml-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
