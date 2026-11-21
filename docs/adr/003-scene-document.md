# ADR-003: Versioned scene document with Fabric as source of truth

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Debojit Saha

## Context

Saving and loading custom properties is the most common Fabric.js question. Files must still open after the schema changes in future versions. Video layers will need timing data later.

Fabric.js objects carry their own state. A second document model would have to be kept in sync with the canvas.

## Decision

Fabric's canvas stays the source of truth for objects. Every object carries typed metadata custom properties:

- `id`
- `name`
- `kind`
- `locked`
- `hidden`
- `timing` (optional, reserved for video)

A saved file is an envelope:

```json
{ "schemaVersion": 1, "app": "kanvaskit", "artboard": {}, "canvas": {} }
```

`canvas` is Fabric's JSON. On load, a Zod schema validates the envelope and the metadata. A migrations registry upgrades older `schemaVersion` values one step at a time.

Load failures return error codes. The codes are `SCENE_INVALID` and `SCENE_VERSION_UNSUPPORTED`.

## Options Considered

### Option A: Fabric as source of truth with a versioned envelope

| Dimension        | Assessment                                                                             |
| ---------------- | -------------------------------------------------------------------------------------- |
| Complexity       | Medium. The envelope, Zod schemas and migrations are new code.                         |
| Cost             | Low.                                                                                   |
| Scalability      | Medium to high. Migrations keep old files readable. File size grows with object count. |
| Team familiarity | Medium. Fabric JSON is familiar. Zod and migrations are new here.                      |

**Pros:** No second model to keep in sync. Old files can be upgraded step by step. Load errors have stable codes.
**Cons:** Each migration must be written and tested. Saved files depend on Fabric's JSON format, so a Fabric upgrade can change the output.

### Option B: Own document model rendered into Fabric

| Dimension        | Assessment                                                             |
| ---------------- | ---------------------------------------------------------------------- |
| Complexity       | High. Two models and a renderer must agree.                            |
| Cost             | Medium to high in developer time.                                      |
| Scalability      | High. The model is independent of Fabric and can hold timing natively. |
| Team familiarity | Low to medium.                                                         |

**Pros:** Saved files do not depend on Fabric's format. A clean base for a timeline.
**Cons:** Every feature needs model code and render code. Sync bugs between model and canvas are likely. This is the largest up-front cost.

### Option C: Raw Fabric toJSON with no envelope

| Dimension        | Assessment                                   |
| ---------------- | -------------------------------------------- |
| Complexity       | Low.                                         |
| Cost             | Low.                                         |
| Scalability      | Low. No version field and no migration path. |
| Team familiarity | High.                                        |

**Pros:** Simplest option. Works today.
**Cons:** Files cannot be upgraded safely after a schema change. No clean place for artboard or app data. Load errors have no clear codes.

## Trade-off Analysis

Option A costs more than Option C. It costs far less than Option B. It keeps Fabric as the one source of truth for objects. The envelope and migrations cost a little work each time the schema changes. That work is small next to the cost of breaking saved files.

Option B would make a timeline easier. It would also double the work for every object feature. That cost is not justified before the Pro video work starts.

## Consequences

- What becomes easier
  - Saving and loading objects with custom properties, using one format.
  - Upgrading old files with a registry of migrations.
  - Explaining load errors to users and in bug reports.
- What becomes harder
  - Each schema change needs a migration and a test fixture.
  - Keeping the Zod schema and the Fabric metadata in step.
  - Upgrading Fabric.js may change saved output. Tests must catch this.
- What we'll revisit
  - ADR-005, at the start of Pro Video. It will decide whether the timeline needs its own document model.

## Action Items

1. [ ] Define typed metadata for Fabric objects: `id`, `name`, `kind`, `locked`, `hidden` and optional `timing`.
2. [ ] Write Zod schemas for the envelope and the object metadata.
3. [ ] Build the migrations registry, starting at `schemaVersion` 1.
4. [ ] Return `SCENE_INVALID` and `SCENE_VERSION_UNSUPPORTED` from the load function.
5. [ ] Add one fixture file per schema version and a test that each one loads.
6. [ ] Write ADR-005 before Pro Video starts.
