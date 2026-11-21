# ADR-004: Lite and Pro branches with a public mirror

**Status:** Accepted
**Date:** 2026-11-21
**Deciders:** Debojit Saha

## Context

The repository `debojitsaha/kanvaskit` is private. Lite must be public under the MIT license, because GitHub is the marketing channel for it. Pro is paid and must stay private.

A single branch of a private repository cannot be public. Pro code must never reach the public Lite history.

## Decision

- `main` holds Pro. `lite` holds Lite. Both live in the private repository.
- Merges flow only from `lite` into `main`. They never flow back.
- Shared and core work lands on `lite` first.
- Pro-only work branches from `main` and lives under `src/pro/`.
- A GitHub Action mirrors `lite` to the public repository `kanvaskit-lite`.
- A CI guard, `scripts/check-lite-boundary.ts`, fails on `lite` if `src/pro/` exists or if anything imports `@/pro`.
- Branch names follow `feat/<scope>-<desc>`, `fix/...` or `chore/...`.
- Commits follow Conventional Commits. Merges are squashed.
- Release tags are `lite-vX.Y.Z` and `pro-vX.Y.Z`.

## Options Considered

### Option A: Private repository with lite and main branches and a public mirror

| Dimension        | Assessment                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| Complexity       | Medium. One repository, two branches, a mirror workflow and a guard script. |
| Cost             | Low. One private repository and GitHub Actions.                             |
| Scalability      | Medium. Suits one developer and two tiers.                                  |
| Team familiarity | High. Standard Git branches and a standard GitHub Action.                   |

**Pros:** One place to develop. A shared fix is written once and merged. The guard keeps Pro code out of `lite`, so the mirror never publishes it.
**Cons:** Merges from `lite` into `main` need discipline. The mirror needs a deploy key stored as a secret. A bad merge or a missed guard can leak Pro code.

### Option B: Two independent repositories with cherry-picks

| Dimension        | Assessment                                               |
| ---------------- | -------------------------------------------------------- |
| Complexity       | Medium to high. Every shared change is applied twice.    |
| Cost             | Low in tooling. High in developer time per fix.          |
| Scalability      | Low. Drift between the two repositories grows over time. |
| Team familiarity | Medium.                                                  |

**Pros:** Clean separation. The public repository has no Pro history at all.
**Cons:** Every shared fix is cherry-picked twice. Fixes are easy to miss. The two codebases drift apart.

### Option C: One public repository with Pro behind a license key

| Dimension        | Assessment                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| Complexity       | Medium to high. License checks and key handling must work offline and online. |
| Cost             | Medium. Needs a license service or key checks.                                |
| Scalability      | Medium.                                                                       |
| Team familiarity | Medium.                                                                       |

**Pros:** One repository and one public history. No mirror.
**Cons:** Pro source is public, so it can be read and reused. A license key check is a weak barrier in front of source code that anyone can read.

## Trade-off Analysis

Option A gives one place to develop and keeps Pro source private. The price is a discipline problem. Merges from `lite` into `main` must be correct, and Pro code must stay out of `lite`. The guard script and CI check are the controls for that risk.

Option B removes the risk of leaking Pro code, but it doubles the work for shared fixes. Option C makes the paid code public, which defeats the purpose of Pro.

## Consequences

- What becomes easier
  - Developing Lite and Pro in one place.
  - Writing a shared fix once and merging it up to `main`.
  - Publishing Lite without manual steps. The mirror runs on each push.
- What becomes harder
  - Keeping merges from `lite` into `main` clean.
  - Managing the deploy key secret for the mirror.
  - Keeping the guard script and its CI check working.
- What we'll revisit
  - Moving to a pnpm monorepo if Pro is later sold as npm packages.

## Action Items

1. [ ] Create the `lite` branch. Confirm it has no `src/pro/` directory.
2. [ ] Write `scripts/check-lite-boundary.ts` and run it in CI on `lite`.
3. [ ] Create the public repository `kanvaskit-lite`.
4. [ ] Generate a deploy key for the mirror. Store the private key as a secret in the private repository.
5. [ ] Add the GitHub Action that mirrors `lite` to `kanvaskit-lite`.
6. [ ] Protect `lite` and `main` with required CI checks and squash-only merges once the GitHub plan allows it. GitHub Free does not offer branch protection on private repositories.
