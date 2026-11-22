# Kanvaskit Lite

Kanvaskit Lite is a free, MIT-licensed starter kit for building a browser image editor (a design canvas) with React 19, TypeScript and Fabric.js 7.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Live demo](https://debojitsaha.github.io/kanvaskit-lite/)

<!-- Demo GIF: docs/media/demo.gif (added before release) -->

## Features

- Artboard with size presets and a background color
- Zoom and pan with the mouse wheel, Space+drag, keyboard shortcuts, and fit to screen
- Text, rectangle, ellipse and images (from a file or a URL)
- Select, duplicate, delete, group, reorder and nudge objects
- Layers panel to rename, lock, hide and reorder layers
- Export PNG cropped to the artboard
- Save and load scenes as versioned JSON
- Keyboard shortcuts with a replaceable keymap
- Plugin architecture with a typed command registry

## Tech stack

- Vite 8
- React 19
- TypeScript 6 (strict)
- Fabric.js 7
- Zustand 5 (vanilla store) with Immer
- Zod 4
- Tailwind CSS 4
- Vitest (browser mode) and Playwright

## Quickstart

Requirements: Node 22 and pnpm 10.

```
git clone https://github.com/debojitsaha/kanvaskit-lite.git
cd kanvaskit-lite
corepack enable
pnpm install
pnpm dev
```

Open http://localhost:5173.

**Build:** run `pnpm build`. The output is written to `dist/`.

## Usage

Embed the editor in your own React app and add commands with the `useCommand` hook:

```tsx
import { EditorProvider, useCommand } from '@/react';
import { createLitePlugins } from '@/plugins';

const mPlugins = createLitePlugins();

function AddTextButton() {
  const { execute: addText } = useCommand('object.addText');
  return <button onClick={() => void addText({ text: 'Hello' })}>Add text</button>;
}

export function MyEditor() {
  return (
    <EditorProvider plugins={mPlugins} className="h-screen">
      <AddTextButton />
    </EditorProvider>
  );
}
```

Every action is a command. Call `editor.commands.execute('<name>', args)` or use the `useCommand` hook, which returns `{ execute, canExecute }`. Commands return a `Result`, and their argument shapes are typed, so your editor autocompletes them.

## Architecture

```
app      demo UI (toolbar, layers panel)
  |
react    EditorProvider, hooks
  |
plugins  viewport, objects, arrange, layers, io, shortcuts
  |
core     editor, commands, events, store, scene schema (no React)
```

- Layers only depend downward, and ESLint enforces it.
- Each feature is a plugin made with `definePlugin` that registers commands and listens to events.
- The store holds plain snapshots for the UI. Fabric stays the source of truth for the canvas.
- Scenes are versioned JSON, validated by Zod and upgraded by migrations.

Decision records are in [`docs/adr/`](docs/adr/).

## Keyboard shortcuts

"Mod" means Ctrl on Windows and Linux, and Cmd on macOS.

| Shortcut           | Action           |
| ------------------ | ---------------- |
| Delete / Backspace | Delete selection |
| Mod+D              | Duplicate        |
| Mod+A              | Select all       |
| Esc                | Clear selection  |
| Mod+G              | Group            |
| Mod+Shift+G        | Ungroup          |
| ]                  | Bring forward    |
| [                  | Send backward    |
| Mod+]              | Bring to front   |
| Mod+[              | Send to back     |
| Arrow keys         | Nudge 1px        |
| Shift+Arrow        | Nudge 10px       |
| Mod+= or Mod++     | Zoom in          |
| Mod+-              | Zoom out         |
| Mod+0              | Zoom to 100%     |
| Shift+1            | Zoom to fit      |
| Space+drag         | Pan              |

## Scripts

| Script      | Command          | What it does                           |
| ----------- | ---------------- | -------------------------------------- |
| `dev`       | `pnpm dev`       | Start the Vite dev server              |
| `build`     | `pnpm build`     | Type-check, then build to `dist/`      |
| `preview`   | `pnpm preview`   | Serve the production build locally     |
| `typecheck` | `pnpm typecheck` | Run TypeScript without emitting files  |
| `lint`      | `pnpm lint`      | Run ESLint                             |
| `format`    | `pnpm format`    | Format the project with Prettier       |
| `test`      | `pnpm test`      | Run unit and browser tests with Vitest |
| `test:e2e`  | `pnpm test:e2e`  | Run end-to-end tests with Playwright   |

## Kanvaskit Pro

Kanvaskit Pro is a paid edition, coming later. It builds on the same core and adds features for production editors. Examples include templates, more object types, video editing, and an agency license.

Join the waitlist: <!-- TODO: Tally waitlist URL --> coming soon.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## License

MIT. See [LICENSE](LICENSE).
