# ADR-001: Plugin architecture with a command registry and typed event bus

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Debojit Saha

## Context

Kanvaskit ships in tiers. Lite is free and MIT licensed. It lives on branch `lite`. Pro is paid and lives on branch `main`. A video editor comes later.

Features must be added without editing the core. Lite and Pro share one codebase history, so merges from `lite` into `main` must not conflict. The core must stay small enough that a Fabric.js upgrade touches only the core and plugins.

## Decision

The code is split into four layers. Dependencies point one way only:

```
src/core  ->  src/plugins (Lite) and src/pro (Pro, main only)  ->  src/react  ->  src/app
```

- `src/core` is framework-agnostic. It has no React. It and the plugins are the only layers that import `fabric`.
- Every feature is a plugin, defined with `definePlugin({ name, setup(editor) })`.
- Every mutation goes through `editor.commands.execute('domain.action', args)`. Command ids look like `object.duplicate` or `viewport.zoomToFit`. Shortcuts, the toolbar, and the future Pro undo/redo plugin all use this one entry point.
- A typed event bus wraps Fabric events. UI code subscribes with `editor.events.on('selection:change', fn)` and never depends on Fabric event names.
- `eslint-plugin-boundaries` enforces the layer rules.

## Options Considered

### Option A: Plugins with a command registry and typed event bus

| Dimension        | Assessment                                                                           |
| ---------------- | ------------------------------------------------------------------------------------ |
| Complexity       | Medium. The registry, the bus and the boundary rules are new code to build and keep. |
| Cost             | Low. No extra services. Cost is developer time up front.                             |
| Scalability      | High. New features and tiers are added as plugins.                                   |
| Team familiarity | Medium. A common pattern, but new to this codebase.                                  |

**Pros:** Features stay isolated. Lite and Pro share one entry point for actions. Undo and redo fit as one plugin. Shared files change rarely, so `lite` to `main` merges conflict less.
**Cons:** More indirection than direct method calls. Command ids and event types must be kept in order. The registry and bus need their own tests.

### Option B: Monolithic editor class with methods per feature

| Dimension        | Assessment                                    |
| ---------------- | --------------------------------------------- |
| Complexity       | Low at first, high as features grow.          |
| Cost             | Low.                                          |
| Scalability      | Low. Every feature adds methods to one class. |
| Team familiarity | High. Simple to read and write.               |

**Pros:** Fast to start. No registry or bus to build.
**Cons:** Every feature edits the core. Pro code would sit in the same class, so `lite` to `main` merges would conflict often. Fabric upgrades touch the whole class.

### Option C: Feature flags in one codebase

| Dimension        | Assessment                                                    |
| ---------------- | ------------------------------------------------------------- |
| Complexity       | Medium. Flags spread through the code and multiply over time. |
| Cost             | Low to start.                                                 |
| Scalability      | Low to medium.                                                |
| Team familiarity | High.                                                         |

**Pros:** One code path to ship. Easy to start.
**Cons:** Pro code would sit in the public Lite branch, which breaks the branch rules in ADR-004. Every release carries the flags for both tiers.

## Trade-off Analysis

Option A costs more up front than Option B or C. It pays back as soon as the second tier starts. Pro features live under `src/pro` and never edit the core. Lite stays clean enough to publish. Undo and redo become a plugin instead of a core rewrite.

Option B is faster on day one, but it puts every later feature into one class. That is the exact problem the tiers create.

## Consequences

- What becomes easier
  - Adding features without touching the core.
  - Keeping Pro code out of the public Lite branch.
  - Upgrading Fabric.js inside `src/core` and the plugins only.
  - Adding undo and redo, shortcuts and toolbar actions through the same commands.
- What becomes harder
  - Writing a new feature means writing a command and wiring it to the bus.
  - Keeping the registry and bus typed as features grow.
  - Debugging a call that passes through several layers.
- What we'll revisit
  - When a public plugin API is sold to agencies (Phase 4). The registry may need a stable, versioned API at that point.

## Action Items

1. [ ] Create `src/core` with the editor object, `definePlugin`, the command registry and the typed event bus.
2. [ ] Wrap Fabric events in the event bus. Keep Fabric event names out of `src/react` and `src/app`.
3. [ ] Configure `eslint-plugin-boundaries` with the four layer rules. Fail CI on a violation.
4. [ ] Route all existing shortcuts and toolbar actions through `editor.commands.execute`.
5. [ ] Document the `domain.action` naming rule for command ids.
6. [ ] Revisit this decision before a public plugin API is planned (Phase 4).
