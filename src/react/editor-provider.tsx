import { useEffect, useRef, useState, type ReactNode } from 'react';

import { createEditor } from '@/core/editor/create-editor';
import type { Editor, EditorPlugin } from '@/core/editor/types';
import type { Artboard } from '@/core/schema/scene';
import { EditorContext } from '@/react/editor-context';

export interface EditorProviderProps {
  plugins?: EditorPlugin[];
  artboard?: Partial<Artboard>;
  className?: string;
  children?: ReactNode;
  onReady?: (editor: Editor) => void;
}

export function EditorProvider({
  plugins,
  artboard,
  className,
  children,
  onReady,
}: EditorProviderProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const initRef = useRef({ plugins, artboard, onReady });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const init = initRef.current;

    const instance = createEditor({
      container: host,
      ...(init.artboard ? { artboard: init.artboard } : {}),
      ...(init.plugins ? { plugins: init.plugins } : {}),
    });
    setEditor(instance);
    init.onReady?.(instance);

    return () => {
      setEditor(null);
      void instance.dispose();
    };
  }, []);

  return (
    <EditorContext value={editor}>
      <div className={className} data-kanvaskit-root="">
        <div
          data-kanvaskit-canvas=""
          ref={hostRef}
          style={{ position: 'relative', width: '100%', height: '100%' }}
        />
        {editor ? children : null}
      </div>
    </EditorContext>
  );
}
