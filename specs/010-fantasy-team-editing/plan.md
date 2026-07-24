# Implementation Plan: Fantasy Team Editing (Cart + Instant Power-ups)

**Branch**: `010-fantasy-team-editing` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-fantasy-team-editing/spec.md`

## Summary

Reshape the fantasy team editing experience on `/fantasy` so it feels instant and honest:

1. **Any team size (0–4)** — drop the "all four boxes filled" gate; Save appears whenever there is a pending change.
2. **Shopping-cart card** — replace today's one-line save preview with a card listing each pending buy/swap (player + net cost), a running total, and remaining balance, with per-line remove.
3. **Optimistic Save** — commit staged buys/swaps by updating the screen first and writing to the database in the background; revert to server truth + show a message on failure.
4. **Optimistic power-ups** — Golden Racket / Booster icons appear immediately, persist in the background, and are removed with a message if the save fails.

**Technical approach**: This is a **frontend-only** change. The backend already exposes everything needed — per-slot `PUT/DELETE /api/fantasy/team/slots/{i}`, `PUT/DELETE /api/fantasy/team/racket`, `PUT/DELETE /api/fantasy/team/booster` — and has **no** 4-player rule (empty slot = no row). The 4-player requirement lives only in `FantasyTeam.tsx` (`allFilled`). The plan extracts the cart/projection math into a pure, unit-tested module and rewires `FantasyTeam` to render a `Cart` and apply changes optimistically. Selling keeps the immediate confirm modal from spec 009. "Sent to the log" is satisfied by the existing commit endpoints, which spec **009** hooks into — 010 does not build the log itself.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 (Vite). No backend code changes.

**Primary Dependencies**: React, CSS Modules. No new dependency (no state/data-fetching library).

**Storage**: PostgreSQL — **unchanged**. No schema change, no migration. Reuses existing fantasy endpoints.

**Testing**: Vitest + React Testing Library (frontend). Pure cart module unit-tested; `FantasyTeam` behavior tested with a mocked `../../../api/fantasy`.

**Target Platform**: Web (mobile + desktop browsers, including iOS Safari).

**Project Type**: Web application (frontend + backend); this feature touches only `frontend/`.

**Performance Goals**: Power-up icon appears within one interaction frame of the click (SC-003); Save does not block the page (optimistic + background).

**Constraints**: Responsive (constitution §V) — cart card and controls must work stacked on mobile. On any background failure the on-screen state must match the server after revert (SC-004).

**Scale/Scope**: One manager editing their own 4-slot team. No concurrency target.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First (NON-NEGOTIABLE) | PASS | Pure `fantasyCart` module and `FantasyTeam` behavior get failing tests first (partial-save, save visibility, cart math, optimistic rollback). |
| II. SOLID | PASS | Cart/projection math extracted into a single-responsibility pure module; `Cart` is a presentational component; `FantasyTeam` orchestrates. Narrow props. |
| III. Simplicity First (YAGNI) | PASS | No batch endpoint, no reducer/queue, no data-fetching library. Reuses the existing `draft` map and per-slot endpoints. Revert-to-server on error keeps race handling trivial. |
| IV. Use What's Already There | PASS | React + CSS Modules + existing API client. Mirrors the existing pure-logic-module pattern (`scheduleGraph.ts`). |
| V. Responsive design | PASS | Cart uses flexible units and wraps/stacks on mobile like the existing `saveBar`. |

**Result**: No violations. Complexity Tracking section omitted (nothing to justify).

## Project Structure

### Documentation (this feature)

```text
specs/010-fantasy-team-editing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (client-side state; no DB change)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contract.md   # Component props + reused API endpoints (no new endpoints)
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
frontend/src/
├── components/fantasy/
│   ├── FantasyTeam/
│   │   ├── FantasyTeam.tsx          # rewire: no 4-player gate, optimistic save + power-ups, render Cart
│   │   ├── FantasyTeam.module.css   # cart card styles (replace .saveBar preview)
│   │   └── FantasyTeam.test.tsx     # extend: partial save, save visibility, optimistic rollback
│   ├── Cart/                        # NEW presentational component
│   │   ├── Cart.tsx                 # lists pending lines + totals + Save button
│   │   ├── Cart.module.css
│   │   └── Cart.test.tsx
│   └── SlotCard/                    # unchanged behavior (still emits onToggleRacket/Booster/onSell)
└── lib/
    ├── fantasyCart.ts               # NEW pure module: netCost, cartTotals, projectTeam, refundOf
    └── fantasyCart.test.ts          # NEW unit tests
```

**Structure Decision**: Web app; changes confined to `frontend/`. Follows the repo's established split of **pure logic in `src/lib/*` (unit-tested)** + thin presentational components, exactly like `scheduleGraph.ts` for the schedule diagram. No `backend/` changes and no Alembic migration.

## Complexity Tracking

No constitution violations — section intentionally empty.
