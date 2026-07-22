---

description: "Task list for Team Ranking Hero (F1)"
---

# Tasks: Team Ranking Hero (F1)

**Input**: Design documents from `/specs/001-standings-hero/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, design.md, contracts/standings.md, quickstart.md

**Tests**: INCLUDED — the constitution makes test-first NON-NEGOTIABLE (§I). Ranking math and the standings endpoint are the highest test priority (SPECIFICATIONS §8).

**Organization**: Grouped by user story. Both P1 stories (hero, table) read the same
`/api/standings`, so the backend + data layer + API client are Foundational (shared).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (Setup, Foundational, Polish have no story label)

## Path Conventions

Web app: `backend/app/`, `backend/tests/`, `frontend/src/` (per plan.md structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add test runners and the SPECIFICATIONS §9 design foundation.

- [X] T001 [P] Backend: add `pytest` + `httpx` to `backend/requirements.txt`, create `backend/tests/__init__.py` and `backend/tests/conftest.py` (in-memory/throwaway test DB session fixture)
- [X] T002 [P] Frontend: add `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` to `frontend/package.json`, add `"test": "vitest"` script, configure the test block in `frontend/vite.config.ts`, and create `frontend/src/test/setup.ts`
- [X] T003 [P] Frontend: self-host Inter (weights 400/600/700/800) under `frontend/src/assets/fonts/` with `@font-face`, create `frontend/src/theme/tokens.css` encoding the §9.2 palette + §9.3 type as CSS custom properties, and set global Ink background / Inter / white text in `frontend/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The backend data layer, ranking math, public endpoint, seed data, and the
frontend data/section shell — everything both P1 stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend

- [X] T004 Configure SQLAlchemy engine + session in `backend/app/db.py` (Postgres URL from env, per SPECIFICATIONS §7)
- [X] T005 Create SQLAlchemy models `Team` (incl. `logo_url`), `Member`, `Match` (with `status`), `Game` in `backend/app/models.py` per data-model.md
- [X] T006 [P] Write FAILING ranking tests in `backend/tests/test_standings.py`: match outcome (§3.4 games-won → point-diff → draw) and team ordering across every §3.5 tiebreak level (points → point-diff → head-to-head → name), completed-matches-only
- [X] T007 Implement pure ranking functions in `backend/app/standings.py` to make T006 pass (§3.4–§3.5, computed on read, no stored state)
- [X] T008 [P] Define Pydantic response schemas (`StandingsResponse`, `StandingsEntry`) in `backend/app/schemas.py` per contracts/standings.md
- [X] T009 [P] Write FAILING contract test for `GET /api/standings` in `backend/tests/test_public_api.py` (sorted by rank asc, tiebreak order, scheduled-only team shows played:0, empty DB → `{"teams": []}`) per contracts/standings.md
- [X] T010 Implement `GET /api/standings` router in `backend/app/routers/public.py` (loads completed matches, calls `standings.py`, returns schema) to make T009 pass
- [X] T011 Register the public router in `backend/app/main.py`
- [X] T012 [P] Create `backend/app/seed.py` inserting sample teams (with logos), matches, and games that obey §3.3 validation, so the page has real ranked data

### Frontend

- [X] T013 [P] Create standings API client + TypeScript types in `frontend/src/api/standings.ts` (fetch `/api/standings`, typed `StandingsEntry`)
- [X] T014 Create `frontend/src/components/StandingsSection/` wrapper that fetches standings and renders loading + empty state ("No matches played yet" on Ink, FR-010) — hero/table slots left empty for now
- [X] T015 Render `StandingsSection` in `frontend/src/App.tsx`, replacing the Hello World screen

**Checkpoint**: `/api/standings` returns real seeded data; the page shows the section shell.

---

## Phase 3: User Story 1 - See who is winning at a glance (Priority: P1) 🎯 MVP

**Goal**: The hero shows the top-two teams facing off left/right with points in the
middle — the §9 "versus" moment (static; animation is US3).

**Independent Test**: With ≥2 seeded completed matches, load `/` and confirm rank 1 on
one side, rank 2 on the other, points in the Rift between them, ordered per §3.5.

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL)

- [X] T016 [P] [US1] Component test `TeamCrest` in `frontend/src/components/TeamCrest/TeamCrest.test.tsx`: renders logo when present, initials placeholder when `logo_url` is null (FR-011); Champion Gold marker only for rank 1; Ember glow for left / Flame for right
- [X] T017 [P] [US1] Component test `StandingsHero` in `frontend/src/components/StandingsHero/StandingsHero.test.tsx`: rank 1 left + rank 2 right with their points shown; single-team fallback shows one leader + placeholder opponent (FR-010)

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement `TeamCrest` component + CSS module in `frontend/src/components/TeamCrest/` — logo/initials placeholder, side glow (Ember left / Flame right), rank-1 gold crown + badge, name in `--fw-name` uppercase (§9.2, §9.4, design.md)
- [X] T019 [US1] Implement `Rift` component + CSS module in `frontend/src/components/Rift/` — `--grad-heat` center seam + glow, holds the score using `--fw-score` + `tabular-nums` and a "VS" (§9.4) [static, no flare yet]
- [X] T020 [US1] Implement `StandingsHero` in `frontend/src/components/StandingsHero/` composing two `TeamCrest` (rank 1 left, rank 2 right) + `Rift`; handle single-leader fallback (FR-010); responsive grid `[crest][rift][crest]` → stacked on mobile (§9.6)
- [X] T021 [US1] Wire `StandingsHero` into `StandingsSection`, feeding it the top-two entries from the standings data

**Checkpoint**: MVP — hero correctly shows and orders the top two teams from live data.

---

## Phase 4: User Story 2 - See the full standings table (Priority: P1)

**Goal**: Every team ranked 3rd and below appears in a table directly under the hero.

**Independent Test**: With ≥3 teams, load `/` and confirm ranks 3+ appear in a table in
correct order with rank, name, and points.

### Tests for User Story 2 ⚠️ (write first, ensure they FAIL)

- [X] T022 [P] [US2] Component test `StandingsTable` in `frontend/src/components/StandingsTable/StandingsTable.test.tsx`: lists only rank ≥ 3 in order; shows rank/team/played/W-D-L/pts/diff; carries no slide-in animation classes (FR-008)

### Implementation for User Story 2

- [X] T023 [US2] Implement `StandingsTable` component + CSS module in `frontend/src/components/StandingsTable/` — Char rows, Hairline dividers, columns Rank/Team/Played/W-D-L/Pts/Diff (§9.4, design.md)
- [X] T024 [US2] Wire `StandingsTable` into `StandingsSection`, feeding it entries with rank ≥ 3

**Checkpoint**: US1 + US2 — hero and full table both work independently from live data.

---

## Phase 5: User Story 3 - Watch the leaders "fight" on load (Priority: P2)

**Goal**: On load, the two leaders' crests slide in from their sides toward the Rift,
which flares — the §9 signature "fight". Reduced-motion shows a static, complete hero.

**Independent Test**: Load `/` and observe the top-two crests animate inward and the Rift
flare; with OS reduce-motion on, they appear static with no flare/embers.

### Tests for User Story 3 ⚠️ (write first, ensure they FAIL)

- [X] T025 [P] [US3] Reduced-motion test in `frontend/src/components/StandingsHero/StandingsHero.test.tsx`: with `prefers-reduced-motion: reduce` mocked, no slide-in / flare / ember classes are applied (FR-009, SC-006)

### Implementation for User Story 3

- [X] T026 [US3] Add the slide-in transition to `TeamCrest` (start translated off its own side, transition to center on a mount-toggled class; only top-two crests) in `frontend/src/components/TeamCrest/` (§9.5)
- [X] T027 [US3] Add the Rift flare keyframe and trigger it as the crests arrive, in `frontend/src/components/Rift/` + `StandingsHero` (§9.5); complete within 1.5s (SC-004)
- [X] T028 [P] [US3] Add ambient ember drift behind the Rift (`aria-hidden` decorative dots) in `frontend/src/components/Rift/` (§9.5)
- [X] T029 [US3] Gate all hero motion behind `@media (prefers-reduced-motion: reduce)` — final positions, no flare, embers hidden (FR-009) across `TeamCrest`/`Rift` CSS modules

**Checkpoint**: All three stories functional; the "fight" lands and reduced-motion is safe.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T030 [P] Verify §9.7 accessibility: white/Ash contrast on Ink & Char, and a visible Ember/Flame focus ring on every interactive element
- [X] T031 [P] Responsive pass at 375 / 768 / 1440 px — no layout breakage; mobile stacks leaders with a horizontal Rift, score between them (FR-013, SC-005, §9.6)
- [X] T032 Run quickstart.md validation end-to-end: `pytest` green, `npm test` green, `npm run build` green (constitution: never ship on red)
- [X] T033 [P] Update `CLAUDE.md` project status and add the exact test commands (`pytest`, `npm test`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: all depend on Foundational.
  - US1 and US2 are both P1 and independent of each other (hero vs table) — can run in parallel after Foundational.
  - US3 (P2) depends on US1 (it animates the hero's `TeamCrest`/`Rift`).
- **Polish (Phase 6)**: depends on the desired stories being complete.

### Within Each Story / Phase

- Tests are written and FAIL before implementation (constitution §I).
- Backend: models → ranking functions → schemas → endpoint → register.
- Frontend: `TeamCrest`/`Rift` before `StandingsHero`; hero before the US3 animation.

### Parallel Opportunities

- Setup: T001, T002, T003 all [P].
- Foundational: T006/T008/T009/T012 (backend) and T013 (frontend) are [P]; T007 needs T006, T010 needs T008+T009.
- US1: T016, T017 tests [P]; T018 [P] then T019 → T020 → T021.
- After Foundational, US1 and US2 can be built by different people in parallel.

---

## Parallel Example: Foundational (backend)

```bash
# Write the failing tests together (they define the contract):
Task: "Ranking tests in backend/tests/test_standings.py"        # T006
Task: "Contract test in backend/tests/test_public_api.py"        # T009
Task: "Pydantic schemas in backend/app/schemas.py"               # T008
Task: "Seed script in backend/app/seed.py"                       # T012
# Then implement to green: T007 (standings.py) → T010 (router) → T011 (register)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1.
4. **STOP and VALIDATE**: the hero shows the correct top two from live data.
5. Demo — this alone is the "who's winning" moment.

### Incremental Delivery

1. Setup + Foundational → backend + section shell ready.
2. US1 (hero) → test → demo (MVP).
3. US2 (table) → test → demo (complete standings).
4. US3 (fight animation) → test → demo (the polish that sells it).

---

## Notes

- [P] = different files, no dependencies.
- Ranking math (T006/T007) is the single most important thing to get right and test — everything visual depends on its output being correct.
- SPECIFICATIONS §9 is the design source of truth; components read `theme/tokens.css`, never hard-coded hex.
- Commit after each task or logical group; never commit on a red suite.
