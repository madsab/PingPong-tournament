---
description: "Task list for Public Match & Player Views (F2–F4)"
---

# Tasks: Public Match & Player Views (F2–F4)

**Input**: Design documents from `/specs/003-public-views/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-views.md

**Tests**: INCLUDED — the constitution mandates test-first (Principle I), and quickstart.md
names the exact test files (`test_leaderboard.py`, `test_public_api.py`, and Vitest specs).

**Organization**: Tasks are grouped by user story so each can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = Leaderboard (F2), US2 = Schedule (F3), US3 = Match detail (F4)
- Every task names an exact file path.

## Path Conventions

Web app: backend at `backend/app/` + `backend/tests/`, frontend at `frontend/src/`.
Reuse existing patterns: `backend/app/standings.py` (pure math + `decide_match`),
`backend/app/routers/public.py` (public endpoints), `frontend/src/api/standings.ts` (client),
`frontend/src/components/StandingsSection/` (load-state pattern), `frontend/src/theme/tokens.css`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the ground the feature builds on. No new dependencies (constitution IV).

- [X] T001 Confirm active feature is `003-public-views` and re-read the F1 patterns to mirror: `backend/app/standings.py`, `backend/app/routers/public.py`, `frontend/src/components/StandingsSection/StandingsSection.tsx`, `frontend/src/api/standings.ts`, and `frontend/src/theme/tokens.css`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one shared frontend file all three sections fetch through.

**⚠️ CRITICAL**: Complete before the frontend parts of any user story.

- [X] T002 Create `frontend/src/api/public.ts` with the shared `API_BASE` constant (copy the `import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'` pattern from `frontend/src/api/standings.ts`). Leave it exporting only `API_BASE` for now — each story adds its own fetch function.

**Checkpoint**: Shared client ready — user stories can proceed.

---

## Phase 3: User Story 1 - Individual leaderboard (F2) (Priority: P1) 🎯 MVP

**Goal**: `/` shows every player ranked across all games in completed matches by
games won → win % → point-difference → name, with games won/lost, win %, and point-difference.

**Independent Test**: Load `/` with completed matches recorded; the leaderboard lists each
player once in the correct order with the four stat columns, and shows an empty state when
there are no completed games.

### Tests for User Story 1 (write first, ensure they FAIL) ⚠️

- [X] T003 [P] [US1] Write pure math tests in `backend/tests/test_leaderboard.py` using `SimpleNamespace` stand-ins (mirror `backend/tests/test_standings.py`): ordering + all tiebreaks (won → win % → point-diff → name), NULL member-link skip (§3.1), a member repeated across games in one match counts each game (§3.2), zero-completed-games member listed last with all-zero stats, and `win_pct` guards `played == 0` (no division by zero).
- [X] T004 [P] [US1] Add a contract test for `GET /api/leaderboard` in `backend/tests/test_public_api.py`: 200 with `entries` in ranked order, 1-based unique ranks, `win_pct` a fraction in [0,1], and empty `entries: []` when there is no data.
- [X] T005 [P] [US1] Write `frontend/src/components/LeaderboardSection/LeaderboardSection.test.tsx` (Vitest + RTL): renders ranked rows with the stat columns, and shows loading / error / empty states like `StandingsSection`.

### Implementation for User Story 1

- [X] T006 [US1] Create `backend/app/leaderboard.py` with a `LeaderboardEntry` dataclass and pure `compute_leaderboard(members, matches)` implementing the §3.6 rules from data-model.md (completed matches only, attribute each game to `member_a_id`/`member_b_id`, skip NULL sides, order + assign 1-based rank). Make T003 pass.
- [X] T007 [US1] Add `LeaderboardEntryOut` and `LeaderboardResponse` schemas to `backend/app/schemas.py` (fields per contracts/public-views.md: `rank, member_id, member_name, team_name, played, won, lost, win_pct, point_difference`).
- [X] T008 [US1] Add `GET /api/leaderboard` to `backend/app/routers/public.py`: load members + completed matches with games eager-loaded (`selectinload`, like `get_standings`), call `compute_leaderboard`, return `LeaderboardResponse`. Make T004 pass.
- [X] T009 [US1] Add `fetchLeaderboard()` and the `LeaderboardEntry` / `LeaderboardResponse` TypeScript interfaces to `frontend/src/api/public.ts` (no credentials).
- [X] T010 [US1] Build `frontend/src/components/LeaderboardSection/LeaderboardSection.tsx` + `.module.css`: loading/error/ready union copied from `StandingsSection`, a semantic table (reuse `StandingsTable` layout) with rank, player, team, won, lost, win % (rounded), point-difference, and an empty state. Gold stays reserved for rank-1 team only — not used here (§9.2). Make T005 pass.
- [X] T011 [US1] Mount `<LeaderboardSection />` in `frontend/src/App.tsx` directly after `StandingsSection` (§4 order).

**Checkpoint**: Leaderboard fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Full match schedule (F3) (Priority: P1)

**Goal**: `/` shows every match once, split into to-play and played, with a result
(winner or draw + games-won score like 2–1) on the played ones.

**Independent Test**: With a mix of completed and scheduled matches, load `/`; every match
appears exactly once, correctly labelled played/to-play, results shown on played matches.

### Tests for User Story 2 (write first, ensure they FAIL) ⚠️

- [X] T012 [P] [US2] Add a contract test for `GET /api/matches` in `backend/tests/test_public_api.py`: scheduled matches first then completed (stable by id, Decision 6); scheduled → `result: null`, `games: []`; completed → `result` with `winner` ∈ a/b/draw and `games_won_a`/`games_won_b`; empty `matches: []` when no data.
- [X] T013 [P] [US2] Write `frontend/src/components/ScheduleSection/ScheduleSection.test.tsx`: renders a to-play group and a played group; each match appears once; played rows show the games-won score / draw; empty group shows a clear empty state.

### Implementation for User Story 2

- [X] T014 [US2] Add `PublicGameOut`, `PublicMatchOut`, `PublicMatchesResponse` (and the nested team-ref + `result` shape) to `backend/app/schemas.py` per contracts/public-views.md; player names nullable.
- [X] T015 [US2] Add `GET /api/matches` to `backend/app/routers/public.py`: load matches with games + teams eager-loaded, resolve player names, derive each completed match's result by **reusing** `decide_match()` from `standings.py` plus a games-won count per side, order to-play first then played (stable by id). Make T012 pass.
- [X] T016 [US2] Add `fetchMatches()` and the `PublicMatch` / `PublicGame` / `PublicMatchesResponse` TypeScript interfaces to `frontend/src/api/public.ts`.
- [X] T017 [US2] Build `frontend/src/components/ScheduleSection/ScheduleSection.tsx` + `.module.css`: load-state union, two groups (to-play, played) with per-group empty states, played rows showing team names + games-won score / "Draw". Make T013 pass.
- [X] T018 [US2] Mount `<ScheduleSection />` in `frontend/src/App.tsx` after `LeaderboardSection` (§4 order).
- [X] T019 [US2] Update `backend/app/seed.py` to add at least a couple of **scheduled** matches (and any team/members needed) so the F3 to-play group is visible when demoing; keep it re-runnable.

**Checkpoint**: Schedule works; US1 + US2 both independently functional.

---

## Phase 5: User Story 3 - Inspect a single match (F4) (Priority: P2)

**Goal**: For any match, show both teams, the match result (or "Draw"), and every game with
the two players' names and its score. Depends on US2's `GET /api/matches` payload (which
already carries games + player names) — no new endpoint.

**Independent Test**: Open a completed match's detail; see both teams, the overall result,
and each game's two player names + score, including a repeated player across games and a
draw shown as a draw.

### Tests for User Story 3 (write first, ensure they FAIL) ⚠️

- [X] T020 [P] [US3] Extend the `GET /api/matches` contract test in `backend/tests/test_public_api.py` to assert per-game `member_a_name`/`member_b_name` are present (and `null` when a link was detached, §3.1), and that a drawn match reports `winner: "draw"`.
- [X] T021 [P] [US3] Write `frontend/src/components/MatchDetail/MatchDetail.test.tsx`: renders both team names, the result (winner or "Draw"), and every game with two player names + score; a repeated player appears in more than one game; a detached link shows a placeholder name without breaking the score.

### Implementation for User Story 3

- [X] T022 [US3] Build `frontend/src/components/MatchDetail/MatchDetail.tsx` + `.module.css`: given one `PublicMatch`, render team names, the result / "Draw", and the games list (player names + score), handling a `null` player name gracefully. Make T021 pass.
- [X] T023 [US3] Wire `MatchDetail` into `frontend/src/components/ScheduleSection/ScheduleSection.tsx` so a played match expands to show its detail (reuse the already-fetched payload — no extra request).

**Checkpoint**: All three sections independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the whole feature end-to-end and update docs.

- [X] T024 [P] Run the full backend suite: `cd backend && pytest` — all green (per quickstart.md).
- [X] T025 [P] Run frontend checks: `cd frontend && npm test && npm run build` — all green.
- [X] T026 Walk through `specs/003-public-views/quickstart.md` manual validation (SC-001…SC-005): leaderboard order, schedule split, match detail, live recompute after an admin edit, responsive at phone width, and empty states.
- [X] T027 Update the "Project status" section of `CLAUDE.md` to record F2–F4 shipped (new `app/leaderboard.py`, `GET /api/leaderboard` + `GET /api/matches`, and the three new public sections).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2, T002)**: after Setup; blocks the frontend tasks of every story.
- **US1 (Phase 3)**: after Foundational. Independent — the MVP.
- **US2 (Phase 4)**: after Foundational. Backend independent of US1; frontend needs T002.
- **US3 (Phase 5)**: after Foundational; **depends on US2's `GET /api/matches`** (T014/T015)
  and its client `fetchMatches` (T016) since it renders that payload.
- **Polish (Phase 6)**: after the stories you intend to ship.

### Within Each User Story

- Tests (T003–T005, T012–T013, T020–T021) written first and failing before implementation.
- Backend: math module → schemas → endpoint. Frontend: client fn → component → mount.

### Parallel Opportunities

- All `[P]` test tasks within a story run together (different files).
- US1 backend (T006–T008) and US1 frontend (T009–T011) touch different trees — the two
  contract/math tests plus the component test can be authored in parallel.
- US1 and US2 can be built in parallel by two people once T002 is done (US3 waits on US2).
- Polish T024 and T025 run in parallel.

---

## Parallel Example: User Story 1

```bash
# Author the three failing tests together (different files):
Task: "Pure math tests in backend/tests/test_leaderboard.py"
Task: "Contract test for GET /api/leaderboard in backend/tests/test_public_api.py"
Task: "LeaderboardSection.test.tsx in frontend/src/components/LeaderboardSection/"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational (T002).
2. Phase 3 US1 (leaderboard) test-first.
3. **STOP and VALIDATE**: leaderboard renders and ranks correctly on `/`.
4. Demo — this is a shippable slice.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 (leaderboard) → validate → demo (MVP).
3. US2 (schedule) → validate → demo.
4. US3 (match detail) → validate → demo. Each adds value without breaking the last.

---

## Notes

- No schema change and no new dependency — reuse models, `decide_match()`, the F1
  load-state pattern, and `tokens.css`.
- `[P]` = different files, no incomplete-task dependency. `[Story]` maps each task to F2/F3/F4.
- Verify each test fails before implementing it; commit after each task or logical group.
- Gold is reserved for the rank-1 team (§9.2) — do not use it in these sections.
