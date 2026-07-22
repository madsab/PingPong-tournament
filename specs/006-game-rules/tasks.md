---
description: "Task list for Game Rules Banner feature implementation"
---

# Tasks: Game Rules Banner

**Input**: Design documents from `/specs/006-game-rules/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/ui.md, quickstart.md

**Tests**: INCLUDED — the project constitution (Principle I, Test-First, NON-NEGOTIABLE) requires a failing test before implementation, so test tasks are part of every story.

**Organization**: Grouped by user story. This is a small, frontend-only, static-content feature: one new `RulesBanner` component rendered inside `ScheduleSection`. No backend, no data model, no API.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2
- File paths are relative to repo root.

## Path Conventions

- Web app: frontend code under `frontend/src/`.

---

## Phase 1: Setup

**Purpose**: Prepare the new component location. No project init needed — the frontend, Vitest, and `tokens.css` already exist; no new dependency is added.

- [X] T001 Create the component folder `frontend/src/components/RulesBanner/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared prerequisites before story work.

**None.** This feature adds no database schema, no endpoint, no shared model, and no config. There is nothing that must be built before the user stories. Proceed directly to Phase 3.

**Checkpoint**: Nothing to block on — user story implementation can begin.

---

## Phase 3: User Story 1 - Read the tournament rules (Priority: P1) 🎯 MVP

**Goal**: All six tournament rules are visible on the main page, correctly worded, as a compact reduced-opacity alert sitting above the schedule content (inside the Schedule block).

**Independent Test**: Load `/`, look at the Schedule block — confirm the rules alert appears above the schedule with all six rules correctly worded and readable, with no interaction required.

### Tests for User Story 1 ⚠️ (write FIRST, must FAIL before implementation)

- [X] T002 [P] [US1] Write `frontend/src/components/RulesBanner/RulesBanner.test.tsx` — render `<RulesBanner />` and assert: (a) it has an accessible label identifying it as the rules; (b) all six rule texts are present (first-to-11, most subgames wins match, first ball for serve, pros serve behind backline, no one uses the world cup racket / Fairplay, fewer-members team chooses who replays). Run `npx vitest run src/components/RulesBanner` and confirm it FAILS (component does not exist yet).

### Implementation for User Story 1

- [X] T003 [US1] Create `frontend/src/components/RulesBanner/RulesBanner.tsx` — a compact alert (e.g. `<aside role="note" aria-label="Game rules">`) with a small "Rules" label and an ordered list (`<ol>`) of the six rules from `contracts/ui.md`; wrap the "No one" phrase of the Fairplay rule in `<strong>`. Import its CSS module. No props, no data, no fetch.
- [X] T004 [US1] Create `frontend/src/components/RulesBanner/RulesBanner.module.css` — baseline styling using `tokens.css` variables only (no hard-coded colors): muted/reduced-opacity text (e.g. `--color-ash`), subtle `--color-hairline` border and `--radius`, tight `clamp()` padding so it stays compact. Make T002 pass.
- [X] T005 [US1] Edit `frontend/src/components/ScheduleSection/ScheduleSection.tsx` — import and render `<RulesBanner />` directly under the `Schedule` eyebrow and above the load-state/`ScheduleFlow` block, so it shows regardless of the schedule's loading/empty/error state. Then run `npx vitest run src/components/ScheduleSection` and confirm those tests stay green.

**Checkpoint**: User Story 1 is fully functional — the rules are visible above the schedule and the tests pass. This is a shippable MVP.

---

## Phase 4: User Story 2 - Read the rules on a phone (Priority: P2)

**Goal**: The rules alert stays readable, compact, and additive on mobile and desktop — no horizontal scrolling, long rule text wraps, and it remains visually subordinate to the schedule.

**Independent Test**: Open `/` at 320px width and at desktop width — confirm the rules alert reflows with no horizontal scrolling, no clipped text, and reads as a quieter banner (not a full-size section) at both sizes.

### Implementation for User Story 2

- [X] T006 [US2] Extend `frontend/src/components/RulesBanner/RulesBanner.module.css` — make the layout responsive: use `clamp()` for spacing/font-size, allow list items to wrap (`overflow-wrap: break-word`), avoid fixed width/height (Constitution V). Ensure the reduced-opacity/compact look holds from 320px to desktop with no horizontal scroll. Re-run `npx vitest run src/components/RulesBanner` to confirm still green.

**Checkpoint**: Both stories work — rules are correct (US1) and responsive/compact on every screen (US2).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T007 [P] Run `cd frontend && npm run lint` and fix any issues in the new/edited files.
- [X] T008 [P] Run `cd frontend && npm run build` (tsc type-check + production build) and confirm it passes.
- [X] T009 Run the manual checks in `specs/006-game-rules/quickstart.md` (browser at desktop + ~320px, empty-data case) and confirm all items pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: none.
- **User Story 1 (Phase 3)**: depends only on Setup.
- **User Story 2 (Phase 4)**: depends on US1 (styles the same component US1 creates).
- **Polish (Phase 5)**: after US1 and US2.

### User Story Dependencies

- **US1 (P1)**: independent MVP — delivers the visible, correct rules on its own.
- **US2 (P2)**: builds on US1's component (same files: `RulesBanner.module.css`), so it runs after US1 rather than fully in parallel.

### Within Each User Story

- US1: the test (T002) is written and fails first, then implementation (T003 → T004 make it pass, T005 mounts it).
- Models/services: N/A (no data).

### Parallel Opportunities

- T002 is marked [P] but is the only task in its group at that point.
- T007 and T008 (lint, build) can run in parallel in Polish.
- US1 and US2 touch the same CSS file, so they are **not** parallel with each other.

---

## Parallel Example: Polish

```bash
# Independent checks can run together:
cd frontend && npm run lint
cd frontend && npm run build
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: create the folder.
2. Phase 3: write the failing test (T002), build `RulesBanner` (T003–T004), mount it in `ScheduleSection` (T005).
3. **STOP and VALIDATE**: rules are visible above the schedule and tests pass → shippable.

### Incremental Delivery

1. Setup → US1 (MVP: correct rules visible).
2. US2 (responsive/compact polish across screen sizes).
3. Polish (lint, build, quickstart validation).

---

## Notes

- [P] = different files, no dependencies.
- [Story] label maps each task to its user story.
- Verify the US1 test fails before writing the component (Constitution I).
- Commit after each task or logical group.
- No new dependency, no backend change — frontend-only, static content.
