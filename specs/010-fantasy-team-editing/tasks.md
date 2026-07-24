---
description: "Task list for Fantasy Team Editing (Cart + Instant Power-ups)"
---

# Tasks: Fantasy Team Editing (Cart + Instant Power-ups)

**Input**: Design documents from `/specs/010-fantasy-team-editing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: INCLUDED — the project constitution makes test-first non-negotiable (Principle I).

**Scope**: Frontend-only. No `backend/` change, no Alembic migration. All paths under `frontend/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (from spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new empty files so imports resolve and TDD can start.

- [x] T001 [P] Scaffold empty stub files: `frontend/src/lib/fantasyCart.ts`, `frontend/src/lib/fantasyCart.test.ts`, and the `frontend/src/components/fantasy/Cart/` folder with `Cart.tsx`, `Cart.module.css`, `Cart.test.tsx`.
- [x] T002 Confirm the frontend test baseline is green before changes: run `cd frontend && npm test` and note existing `FantasyTeam.test.tsx` passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure cart/projection math used by every story. **⚠️ Blocks US1, US2, US3.**

- [x] T003 [P] Write FAILING unit tests in `frontend/src/lib/fantasyCart.test.ts` covering: `refundOf` (85% floor), `netCost` for an empty slot (full price) vs a swap (price minus 85% refund of the replaced player), `cartTotals` (total, remaining, overBudget), `canSave` (true for a 1-player draft, false when over budget, false when draft empty), and `projectTeam` (fills the drafted slots and reduces balance by the total).
- [x] T004 Implement `frontend/src/lib/fantasyCart.ts` (`refundOf`, `netCost`, `cartTotals`, `projectTeam`) to make T003 pass. Pure, no React, no I/O. (depends on T003)

**Checkpoint**: Cart math is proven and reusable.

---

## Phase 3: User Story 1 - Save a team of any size (Priority: P1) 🎯 MVP

**Goal**: Remove the 4-player requirement; Save appears whenever there is a pending change.

**Independent Test**: With empty boxes, pick one player → Save appears and saves a one-player team; with no changes → no Save button.

- [x] T005 [US1] Write FAILING tests in `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.test.tsx`: (a) Save control is hidden with no draft; (b) appears after one pick on a partial (<4) team; (c) disappears after removing the only draft pick; (d) clicking Save on a 1-player draft calls `assignSlot` once and succeeds.
- [x] T006 [US1] In `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.tsx` remove the `allFilled` gate: derive `canSave`/`overBudget` from `cartTotals(...)` (import from `lib/fantasyCart`), and show the save control whenever `draft.size > 0`. Make T005 pass. (depends on T004)

**Checkpoint**: Partial teams save; Save visibility is change-driven.

---

## Phase 4: User Story 2 - Shopping-cart card + optimistic save (Priority: P1)

**Goal**: A card under the squad lists pending buys/swaps with amounts, total, and remaining; Save commits optimistically in the background and reverts on failure.

**Independent Test**: Stage two picks → cart lists both with correct amounts + net total + remaining; remove a line → totals update; Save → cart clears, team updates; a failed Save shows a message and reverts.

- [x] T007 [P] [US2] Write FAILING tests in `frontend/src/components/fantasy/Cart/Cart.test.tsx`: renders nothing when `lines` is empty; renders one line per pick with its player name and net cost; a swap line shows the net-after-refund amount; shows total + remaining; disables Save and shows the shortfall when `overBudget`; fires `onRemoveLine` and `onSave`.
- [x] T008 [US2] Implement `frontend/src/components/fantasy/Cart/Cart.tsx` + `Cart.module.css` per the props contract (Norwegian copy, responsive, wraps/stacks on mobile). Make T007 pass. (depends on T004)
- [x] T009 [US2] Write FAILING tests in `FantasyTeam.test.tsx` for optimistic Save: on Save the projected team renders immediately and the cart clears; each pending pick triggers a background `assignSlot`; a rejected `assignSlot` shows a Norwegian error and calls `fetchTeam` again (revert to server state).
- [x] T010 [US2] Rewire `FantasyTeam.tsx`: render `<Cart>` from draft-derived lines (replacing the old `.saveBar` one-liner); change `saveTeam()` to render `projectTeam(...)`, clear the draft, apply picks sequentially in the background, sync on success, and `loadTeam()` + message on error. Remove the now-duplicated inline money helpers in favor of `lib/fantasyCart`. Update `FantasyTeam.module.css` (cart card styles). Make T009 pass. (depends on T006, T008)

**Checkpoint**: The cart shows pending changes and Save is instant + honest.

---

## Phase 5: User Story 3 - Instant power-up icons (Priority: P2)

**Goal**: Golden Racket / Booster icons appear immediately, persist in the background, and are removed with a message on failure.

**Independent Test**: Add racket/booster → icon shows immediately; a failed background call removes the icon and shows a message.

- [x] T011 [P] [US3] Write FAILING tests in `FantasyTeam.test.tsx`: clicking Racket/Booster shows the icon before the mocked API call resolves; a rejected call removes the icon and shows a Norwegian message; a resolved call keeps the icon with no message.
- [x] T012 [US3] Rewire `toggleRacket` / `toggleBooster` in `FantasyTeam.tsx` to be optimistic: flip the slot's `has_racket` / `booster_active` in local team state immediately, fire the existing call, and on error `loadTeam()` + show a message. Make T011 pass. (depends on T006)

**Checkpoint**: All three stories functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T013 [P] Review `frontend/src/components/fantasy/FantasyRules/FantasyRules.tsx` and any copy for references to "must have 4 players"; update to reflect that any team size (0–4) is allowed.
- [x] T014 Run the full frontend gate: `cd frontend && npm test && npm run lint && npm run build` — all green.
- [ ] T015 Walk through `specs/010-fantasy-team-editing/quickstart.md` manual steps against the running app.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, T003→T004)** blocks everything.
- **US1 (Phase 3)** depends on T004.
- **US2 (Phase 4)** depends on T004 (Cart T008) and T006 (orchestration T010).
- **US3 (Phase 5)** depends on T006.
- **Polish (Phase 6)** after the stories.

### Within each story
- Tests are written FIRST and must FAIL before implementation.
- Pure module (Phase 2) before any component wiring.

### Parallel Opportunities
- T001 and T003 are `[P]`.
- T007 (Cart tests) is `[P]` — a different file from the FantasyTeam tests.
- T011 (US3 tests) is `[P]` relative to Cart work.
- US1, US2, US3 all touch `FantasyTeam.tsx`, so their `FantasyTeam.tsx` edits are **sequential** (same file) even though their test files differ.

---

## Implementation Strategy

### MVP (User Story 1)
1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1.
2. STOP & VALIDATE: partial teams save, Save visibility works.

### Incremental Delivery
1. Foundational ready → US1 (MVP) → US2 (cart + optimistic save) → US3 (instant power-ups).
2. Each story is a shippable increment; polish last.

---

## Notes
- [P] = different files, no dependency on an incomplete task.
- US1/US2/US3 share `FantasyTeam.tsx` — do their `.tsx` edits in order, not in parallel.
- Commit after each task or logical group; run the suite before committing (never commit red).
- "Sent to the log" (spec 009) is validated once 009 lands; 010 already calls the endpoints it records from.
