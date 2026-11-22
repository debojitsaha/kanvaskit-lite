import { Circle, ImagePlus, Link, Square, Type } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import { mAllowedImageTypes } from '@/constants/objects';
import { useCommand } from '@/react';

export function Toolbar() {
  const addText = useCommand('object.addText');
  const addRect = useCommand('object.addRect');
  const addEllipse = useCommand('object.addEllipse');
  const addImageFromFile = useCommand('object.addImageFromFile');
  const addImageFromUrl = useCommand('object.addImageFromUrl');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function handleAddText() {
    setMessage(null);
    const result = await addText.execute({});
    if (!result.success) setMessage(result.error.message);
  }

  async function handleAddRect() {
    setMessage(null);
    const result = await addRect.execute();
    if (!result.success) setMessage(result.error.message);
  }

  async function handleAddEllipse() {
    setMessage(null);
    const result = await addEllipse.execute();
    if (!result.success) setMessage(result.error.message);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setMessage(null);
    const result = await addImageFromFile.execute({ file });
    if (!result.success) setMessage(result.error.message);
  }

  async function handleAddImageFromUrl(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = await addImageFromUrl.execute({ url: imageUrl });
    if (result.success) {
      setImageUrl('');
      setShowUrlForm(false);
    } else {
      setMessage(result.error.message);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Add text"
        title="Add text"
        onClick={() => void handleAddText()}
      >
        <Type />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Add rectangle"
        title="Add rectangle"
        onClick={() => void handleAddRect()}
      >
        <Square />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Add ellipse"
        title="Add ellipse"
        onClick={() => void handleAddEllipse()}
      >
        <Circle />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Upload image"
        title="Upload image"
        onClick={() => {
          fileInputRef.current?.click();
        }}
      >
        <ImagePlus />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={mAllowedImageTypes.join(',')}
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Add image from URL"
        title="Add image from URL"
        aria-expanded={showUrlForm}
        onClick={() => {
          setShowUrlForm((open) => !open);
        }}
      >
        <Link />
      </Button>
      {showUrlForm ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => void handleAddImageFromUrl(event)}
        >
          <input
            type="url"
            required
            aria-label="Image URL"
            placeholder="Paste image URL"
            value={imageUrl}
            onChange={(event) => {
              setImageUrl(event.target.value);
            }}
            className="h-8 w-56 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
      ) : null}
      {message ? (
        <p role="status" className="ml-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
