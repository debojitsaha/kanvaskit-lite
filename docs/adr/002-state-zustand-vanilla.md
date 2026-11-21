# ADR-002: Editor state in a per-editor Zustand vanilla store

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Debojit Saha

## Context

The UI needs reactive state. Examples are the selection, the layer list and the zoom level. The core must stay free of React, so the state cannot depend on React hooks.

MobX is the developer's usual choice for canvas editors. Market research found that buyers know Zustand better. No paid Fabric.js kit ships with Zustand.

Several editors may run on one page, so state must not be global.

## Decision

Each editor instance owns a store created with `createStore` from `zustand/vanilla`, with the `immer` middleware. The store lives in `src/core/store`.

- React reads the store with `useStore` from `src/react`.
- React Context passes the editor instance down. It never holds state.
- Fabric objects never go into the store. The store holds serializable snapshots only: object ids, names, order, visibility and zoom.

## Options Considered

### Option A: Zustand vanilla with immer

| Dimension        | Assessment                                                          |
| ---------------- | ------------------------------------------------------------------- |
| Complexity       | Low. A small API over plain objects, with one middleware.           |
| Cost             | Low. Open source, no runtime service.                               |
| Scalability      | Medium to high. Fine for UI state. Not tuned for per-frame updates. |
| Team familiarity | Good. Widely used in React code, and buyers know it.                |

**Pros:** The store runs without React. `useStore` works with React 19 without extra wiring. Immer keeps updates short to write. Several stores can coexist on one page.
**Cons:** It is not the developer's default style, so it is a learned pattern. Snapshots must be kept in sync with Fabric by hand. Immer adds a small cost to each update.

### Option B: MobX with makeAutoObservable

| Dimension        | Assessment                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| Complexity       | Medium. Tracking is automatic, but class and proxy rules must be followed. |
| Cost             | Low. Open source.                                                          |
| Scalability      | High. Fine-grained updates with little code.                               |
| Team familiarity | High for the developer. Buyers know it less.                               |

**Pros:** Fine-grained reactivity. Derived values come with little code. This is the developer's default.
**Cons:** Easy to store Fabric objects in observables by accident, which makes snapshots hard. Buyers know it less. Its rules are more to learn for users of the kit.

### Option C: React Context with useReducer

| Dimension        | Assessment                                                            |
| ---------------- | --------------------------------------------------------------------- |
| Complexity       | Low for small state. Grows quickly as state grows.                    |
| Cost             | Low.                                                                  |
| Scalability      | Low. Context updates re-render consumers unless the context is split. |
| Team familiarity | High. Standard React.                                                 |

**Pros:** No extra dependency. Familiar to any React developer.
**Cons:** The state lives in React, so the core cannot own it. This breaks the core-free rule in ADR-001. Several editors on one page are awkward.

## Trade-off Analysis

Option A is the only option that keeps state in the core without React. It matches what buyers know. It is simpler than MobX.

The cost is fine-grained reactivity. MobX would give that for free. Snapshots keep the cost low for UI state, such as selection and layers. If video playback needs more, this decision will be revisited (see below).

## Consequences

- What becomes easier
  - Testing the core without React.
  - Running several editors on one page.
  - Saving and debugging state, because snapshots are plain data.
  - Explaining the code to buyers who know Zustand.
- What becomes harder
  - Keeping snapshots and Fabric objects in sync. Every change must update both.
  - Working in a style that is not the developer's default.
- What we'll revisit
  - If Pro video playback needs fine-grained reactivity at 60 fps. In that case, MobX or a separate playback store may be the better fit.

## Action Items

1. [ ] Create `src/core/store` with `createStore` from `zustand/vanilla` and the `immer` middleware.
2. [ ] Define the snapshot types: object ids, names, order, visibility and zoom.
3. [ ] Add a `useStore` hook in `src/react` and an editor context that provides only the instance.
4. [ ] Add a test or lint rule that fails if a Fabric object is placed in the store.
5. [ ] Add a test that two editor instances keep separate state.
6. [ ] Measure store update cost during Pro video playback and revisit this ADR if it is too high.
