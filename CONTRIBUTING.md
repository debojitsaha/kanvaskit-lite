# Contributing

Thanks for your interest in Kanvaskit. Issues and pull requests are welcome on the public `kanvaskit-lite` repo.

## Setup

1. Install Node 22. The version is pinned in `.nvmrc`.
2. Install pnpm 10: `corepack enable`
3. Install dependencies: `pnpm install`
4. Start the demo app: `pnpm dev`

## Scripts

| Command          | What it does                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`       | Start the demo app with the Vite dev server.                                                                                                               |
| `pnpm build`     | Build the app for production.                                                                                                                              |
| `pnpm typecheck` | Run the TypeScript compiler without emitting files.                                                                                                        |
| `pnpm lint`      | Run ESLint.                                                                                                                                                |
| `pnpm format`    | Format the code with Prettier.                                                                                                                             |
| `pnpm test`      | Run unit tests with Vitest in browser mode, using Playwright Chromium. On the first run, install the browser with `pnpm exec playwright install chromium`. |
| `pnpm test:e2e`  | Run the end-to-end tests.                                                                                                                                  |

## Project layout

- `src/core`: framework-agnostic editor core. No React.
- `src/plugins`: features built on the core.
- `src/react`: React bindings.
- `src/app`: demo UI.
- `src/constants`: shared constants.
- `tests/`: test files.
- `docs/adr/`: architecture decision records.

Layers depend downward only: `core` <- `plugins` <- `react` <- `app`. A module may import from a layer below it, never from one above it. ESLint enforces this rule.

## Coding conventions

- TypeScript in strict mode. Do not use `any`.
- File names are kebab-case.
- Import through the `@/` alias. Do not use relative imports across folders.
- Module-level constants use an `m` prefix (for example, `mDefaultKeymap`). Local variables and functions do not.
- Validate external data with Zod.
- Commands return `Result` values for expected failures instead of throwing.

## Adding a feature

1. Write a plugin with `definePlugin`.
2. Register your commands. Extend `CommandRegistryMap` through module augmentation so that the commands are typed.
3. Add tests under `tests/plugins/`.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`.
- Name branches `feat/<scope>-<desc>` or `fix/<scope>-<desc>`.
- Keep pull requests focused on one change.
- CI must pass. It runs typecheck, lint, format, unit tests and end-to-end tests.

## License

By contributing, you agree that your contributions are licensed under the MIT License. See `LICENSE`.
