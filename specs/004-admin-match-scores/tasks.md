---
description: "Task list for Admin Match-Card Scores & Pre-Filled Edit Form"
---

# Tasks: Admin Match-Card Scores & Pre-Filled Edit Form

**Input**: Design documents from `/specs/004-admin-match-scores/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-matches-ui.md, quickstart.md

**Tests**: Included and required — the project constitution makes test-first (write a failing test before the code) NON-NEGOTIABLE for any new behaviour.

**Organization**: Grouped by user story. Both stories are frontend-only and touch different files, so they are fully independent and can be built in either order or in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = card score, US2 = pre-filled edit form
- Exact file paths are given in each task.

## Path Conventions

Web app; all changes live under `frontend/src/components/admin/`. Backend is untouched.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the workspace is ready. No new dependencies or scaffolding — the components, types, and test runner already exist.

- [X] T001 Ensure frontend deps are installed and the test runner works: from `frontend/`, run `npm install` then `npx vitest run src/components/admin/MatchesManager src/components/admin/ResultForm` and confirm the existing suites pass (green baseline before changes).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required. The data both stories need (`Match.games` with `team_a_score`, `team_b_score`, `member_a_id`, `member_b_id`) is already defined in `frontend/src/api/admin.ts` and already returned by `GET /api/admin/matches`. No shared code must change before the stories.

*(No tasks — proceed directly to user stories.)*

**Checkpoint**: Foundation ready — both user stories can begin immediately and in parallel.

---

## Phase 3: User Story 1 - See a completed match's result on its card (Priority: P1) 🎯 MVP

**Goal**: Each completed match card in the admin matches list shows the games-won score (e.g. "2 – 1"); matches with no recorded games show no score.

**Independent Test**: Render `MatchesManager` with a completed match that has games and a scheduled match with none; confirm the first shows the games-won score and the second shows no score.

### Tests for User Story 1 ⚠️ (write first, must FAIL before implementation)

- [X] T002 [US1] Add tests in `frontend/src/components/admin/MatchesManager/MatchesManager.test.tsx`: extend the `MATCHES` fixtures with one completed match carrying `games` (e.g. 3 games where team A wins 2, team B wins 1) and keep a scheduled match with `games: []`. Assert (a) the completed card renders the games-won score text matching `/2\s*–\s*1/`, and (b) the scheduled/no-games match renders no score text. Run and confirm these new assertions FAIL.

### Implementation for User Story 1

- [X] T003 [US1] In `frontend/src/components/admin/MatchesManager/MatchesManager.tsx`, add a small pure helper that counts games won per team from `m.games` (`aWon = games.filter(g => g.team_a_score > g.team_b_score).length`, `bWon = games.length - aWon`) and render `"{aWon} – {bWon}"` inside the match card, shown only when `m.games.length > 0` (per FR-001/FR-002/FR-003 and contracts/admin-matches-ui.md §A).
- [X] T004 [US1] In `frontend/src/components/admin/MatchesManager/MatchesManager.module.css`, add a class for the card score (readable emphasis using existing design tokens, no fixed pixel dimensions so it stays responsive — constitution Principle V). Wire the class into the element added in T003.
- [X] T005 [US1] Run `npx vitest run src/components/admin/MatchesManager` from `frontend/` and confirm the T002 tests now PASS (red → green).

**Checkpoint**: Completed match cards show the correct games-won score; not-yet-played matches show none. US1 is independently shippable (MVP).

---

## Phase 4: User Story 2 - Edit a completed result starting from the saved values (Priority: P1)

**Goal**: Opening the result form for a match that already has games pre-fills each game's scores and player pairings as the default input values; a match with no games still opens blank.

**Independent Test**: Render `ResultForm` for a match whose `games` hold known scores and member ids; confirm the score inputs and player selects match the saved values; changing one score and saving calls `recordResult` with the edited value.

### Tests for User Story 2 ⚠️ (write first, must FAIL before implementation)

- [X] T006 [US2] Add tests in `frontend/src/components/admin/ResultForm/ResultForm.test.tsx`: pass a `match` with populated `games` (scores + `member_a_id`/`member_b_id`). Assert (a) each score input's value equals the saved score, (b) the player `<select>` values equal the saved member ids, (c) changing one score to a valid value and submitting calls `recordResult(matchId, <games>)` with the edited value and fires `onSaved`. Keep/confirm the existing "no games → blank inputs" behaviour as a regression guard. Also add a case where a game's `member_a_id`/`member_b_id` is `null` and assert the form still renders (scores pre-filled, select falls back) without crashing (FR-009). Run and confirm the new assertions FAIL.

### Implementation for User Story 2

- [X] T007 [US2] In `frontend/src/components/admin/ResultForm/ResultForm.tsx`, change the `useState<Row[]>` initializer to branch on `match.games.length`: when games exist, map each game to a `Row` (`aId: g.member_a_id ?? 0`, `bId: g.member_b_id ?? 0`, `aScore: String(g.team_a_score)`, `bScore: String(g.team_b_score)`); when there are no games, keep the current blank generation (one row per larger-team member). See data-model.md and contracts/admin-matches-ui.md §B. Do not change the `save`/validation path.
- [X] T008 [US2] Run `npx vitest run src/components/admin/ResultForm` from `frontend/` and confirm the T006 tests now PASS (red → green).

**Checkpoint**: The edit form opens pre-filled from saved values; blank when there is nothing to pre-fill; save + validation unchanged. US1 and US2 both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across both stories.

- [X] T009 [P] Run the full frontend suite from `frontend/` (`npm test`) and confirm all tests pass, including the two changed files.
- [X] T010 [P] Run `npm run lint` and `npm run build` from `frontend/` and confirm no lint errors and a clean type-check/build.
- [ ] T011 Execute the manual walkthrough in `quickstart.md` (log in at `/admin`, Matches tab): confirm a completed card shows its score, opening its form is pre-filled, editing a score updates the card, and a tie is still rejected. **Not run by the implementation — requires the full app (Docker + DB); left for the user to verify.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — establishes a green baseline.
- **Foundational (Phase 2)**: Empty — nothing blocks the stories.
- **User Stories (Phase 3, Phase 4)**: Both depend only on Setup. They touch different files (`MatchesManager/*` vs `ResultForm/*`) and share no state, so they are independent and can run in parallel or in either order.
- **Polish (Phase 5)**: Depends on the stories you choose to ship.

### Within Each User Story

- Test task first and must FAIL, then implementation, then the run task confirms green (constitution Principle I).

### Parallel Opportunities

- US1 (T002–T005) and US2 (T006–T008) can be worked on fully in parallel by different people — no shared files.
- Polish T009 and T010 are marked [P] (independent commands).

---

## Parallel Example

```bash
# After T001 (green baseline), the two stories can proceed at the same time:
# Developer A — User Story 1 (card score):
#   T002 → T003 → T004 → T005   (MatchesManager.test.tsx, MatchesManager.tsx, .module.css)
# Developer B — User Story 2 (pre-filled form):
#   T006 → T007 → T008          (ResultForm.test.tsx, ResultForm.tsx)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. T001 (baseline) → Phase 3 (T002–T005) → validate → ship. The card score alone is a complete, demoable increment.

### Incremental Delivery

1. Setup (T001).
2. US1 (T002–T005) → test → demo (MVP: at-a-glance scores).
3. US2 (T006–T008) → test → demo (editing pre-filled from saved values).
4. Polish (T009–T011) once both are in.

---

## Notes

- [P] = different files, no dependencies.
- Both stories are frontend-only; `frontend/src/api/admin.ts` and all of `backend/` are unchanged.
- Verify each story's test fails before writing its implementation.
- Commit after each task or logical group.
