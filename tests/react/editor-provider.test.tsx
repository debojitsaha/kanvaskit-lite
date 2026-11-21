import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Editor } from '@/core/editor/types';
import { EditorProvider, useEditor, useEditorStore } from '@/react';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function ReadyProbe() {
  const editor = useEditor();
  const ready = useEditorStore((state) => state.ready);
  return <p data-editor-id={editor.id}>{ready ? 'ready' : 'pending'}</p>;
}

beforeEach(() => {
  container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
});

afterEach(async () => {
  if (root) {
    const current = root;
    root = null;
    act(() => {
      current.unmount();
    });
  }
  await flushMicrotasks();
  container.remove();
  vi.restoreAllMocks();
});

describe('EditorProvider', () => {
  it('mounts one fabric canvas tree under StrictMode and reports the last editor', async () => {
    const editors: Editor[] = [];
    root = createRoot(container);

    act(() => {
      root?.render(
        <StrictMode>
          <EditorProvider onReady={(editor) => editors.push(editor)} />
        </StrictMode>,
      );
    });
    await flushMicrotasks();

    const host = container.querySelector('[data-kanvaskit-canvas]');
    expect(host).not.toBeNull();
    expect(host?.querySelectorAll('.canvas-container').length).toBe(1);
    expect(host?.querySelectorAll('canvas').length).toBe(2);

    expect(editors.length).toBe(2);
    const first = editors[0];
    const last = editors[editors.length - 1];
    expect(first?.isDisposed).toBe(true);
    expect(last?.isDisposed).toBe(false);
  });

  it('exposes the editor and store readiness to children', () => {
    root = createRoot(container);

    act(() => {
      root?.render(
        <EditorProvider>
          <ReadyProbe />
        </EditorProvider>,
      );
    });

    const probe = container.querySelector('p');
    expect(probe?.textContent).toBe('ready');
    expect(probe?.getAttribute('data-editor-id')).toBeTruthy();
  });

  it('disposes the editor and removes its canvas on unmount', async () => {
    const editors: Editor[] = [];
    root = createRoot(container);

    act(() => {
      root?.render(<EditorProvider onReady={(editor) => editors.push(editor)} />);
    });

    const editor = editors[0];
    expect(editor).toBeDefined();
    expect(container.querySelectorAll('.canvas-container').length).toBe(1);

    const current = root;
    root = null;
    act(() => {
      current.unmount();
    });
    await flushMicrotasks();

    expect(editor?.isDisposed).toBe(true);
    expect(container.querySelector('.canvas-container')).toBeNull();
  });

  it('throws when useEditor is used outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Orphan() {
      useEditor();
      return null;
    }
    root = createRoot(container, {
      onUncaughtError: () => undefined,
      onCaughtError: () => undefined,
    });

    expect(() => {
      act(() => {
        root?.render(<Orphan />);
      });
    }).toThrow('[EDITOR_CONTEXT_MISSING]');
  });
});
