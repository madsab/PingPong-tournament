---
description: "Task list for Team Logos implementation"
---

# Tasks: Team Logos

**Input**: Design documents from `/specs/005-team-logos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-views.md, quickstart.md

**Tests**: INCLUDED — the project constitution makes Test-First (TDD) non-negotiable. Every logic/behavior change gets a failing test first.

**Organization**: Grouped by user story so each can be built and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (Setup / Foundational / Polish have no story label)

## Path Conventions

Web app: backend at `backend/`, frontend at `frontend/src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline before changes. No new dependencies (URL-only logos reuse existing stack).

- [X] T001 Confirm no new dependencies are needed and record a green baseline: run `cd backend && pytest` and `cd frontend && npm test` before any change.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-story prerequisites.

**None.** The three stories are independent: US1 (admin form) and US2 (hero) rely on data/plumbing that already exists; US3's shared building blocks (`TeamLogo` component + API logo fields) are used only by US3 and live in that phase. Proceed straight to the stories.

**Checkpoint**: No foundational work — user stories can begin immediately.

---

## Phase 3: User Story 1 - Admin sets a team's logo (Priority: P1) 🎯 MVP

**Goal**: The admin can set / change / clear a team's logo (an image URL) from the team create and edit forms, and it persists.

**Independent Test**: Log in to `/admin`, set a logo URL on a team, reload → value sticks; clear it → logo removed. Admin tables show no logo image.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T002 [P] [US1] Extend backend admin CRUD test to assert `logo_url` round-trips on create and PUT update (and clears when empty) in `backend/tests/test_admin_crud.py`.
- [X] T003 [P] [US1] Extend frontend admin test: the create form and team-card edit expose a logo-URL input and send `logo_url`; admin tables render no `<img>` logo, in `frontend/src/components/admin/TeamsManager/TeamsManager.test.tsx`.

### Implementation for User Story 1

- [X] T004 [US1] Update `frontend/src/api/admin.ts` so team create and update carry `logo_url` (e.g. `createTeam(name, logoUrl)` and an update path that sends `logo_url`; empty string → clears).
- [X] T005 [US1] Add a logo-URL text input to the create form and team-card edit in `frontend/src/components/admin/TeamsManager/TeamsManager.tsx`, wired to T004. Keep admin tables text-only (no logo image).

**Checkpoint**: US1 fully functional — backend already accepts `logo_url` (schemas `TeamCreate`/`TeamUpdate`), so no backend code change beyond the confirming test.

---

## Phase 4: User Story 2 - Leading teams show their logos in the hero (Priority: P1)

**Goal**: The top-two hero circles show each leader's logo, with an initials fallback and the rank-1 gold/crown cues intact.

**Independent Test**: Give the top-two teams logos, open `/` → both circles show images; remove one → initials fallback, no broken image; rank-1 keeps its crown/gold.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T006 [P] [US2] Assert the hero crest renders an `<img>` when `logo_url` is set, the initials placeholder when null/on image error, and that the champion (rank-1) cues still render over the logo, in `frontend/src/components/TeamCrest/TeamCrest.test.tsx`.

### Implementation for User Story 2

- [X] T007 [US2] Confirm/adjust `frontend/src/components/TeamCrest/TeamCrest.tsx` (and `StandingsHero.tsx` passing `logo_url` through) to satisfy T006 — add the `onError` → fallback handler if missing. Standings data already carries `logo_url`, so expect little/no change beyond the error fallback.

**Checkpoint**: US1 + US2 both work independently.

---

## Phase 5: User Story 3 - Logos before team names in public tables (Priority: P2)

**Goal**: Show each team's logo immediately before its name in the standings table, leaderboard Team column, schedule match cards, and match-detail headers. Requires threading logo data through the leaderboard and matches APIs (FR-007) and a shared `TeamLogo` component.

**Independent Test**: With logos set, every public table/list shows the logo before the team name; teams without a logo fall back with no broken image; admin tables show none.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T008 [P] [US3] Assert `GET /api/leaderboard` entries include `team_logo_url` (URL when the team has a logo, null otherwise; ranking unchanged) in `backend/tests/test_leaderboard.py`.
- [X] T009 [P] [US3] Assert `GET /api/matches` team refs (`team_a`/`team_b`) include `logo_url` (null when unset) in `backend/tests/test_public_api.py`.
- [X] T010 [P] [US3] Create `frontend/src/components/TeamLogo/TeamLogo.test.tsx`: renders `<img>` with a URL, text/initials fallback when null, and falls back on image `onError`.
- [X] T011 [P] [US3] Add "logo before team name" assertions to `StandingsTable.test.tsx`, `LeaderboardSection.test.tsx`, `MatchNode.test.tsx`, and `MatchDetail.test.tsx` under `frontend/src/components/`.

### Implementation for User Story 3 — backend

- [X] T012 [P] [US3] Add `team_logo_url` to the `LeaderboardEntry` dataclass and a `_team_logo(member)` helper (mirroring `_team_name`) in `backend/app/leaderboard.py`.
- [X] T013 [US3] Add `team_logo_url` to `LeaderboardEntryOut` and `logo_url` to `PublicTeamRef` in `backend/app/schemas.py`.
- [X] T014 [US3] Map the new fields in `backend/app/routers/public.py`: set `team_logo_url` in the `/api/leaderboard` response and `logo_url` on `team_a`/`team_b` in the `/api/matches` response. (Depends on T012, T013.)

### Implementation for User Story 3 — frontend

- [X] T015 [P] [US3] Add `team_logo_url: string | null` to `LeaderboardEntry` and `logo_url: string | null` to `PublicTeamRef` in `frontend/src/api/public.ts`.
- [X] T016 [US3] Create the shared `frontend/src/components/TeamLogo/TeamLogo.tsx` + `TeamLogo.module.css`: small rounded logo, initials/neutral fallback, `onError` fallback, styled with `tokens.css` (hairline border, relative sizing). Satisfies T010.
- [X] T017 [US3] Render `<TeamLogo>` before the team name in `frontend/src/components/StandingsTable/StandingsTable.tsx` (data already has `logo_url`). (Depends on T016.)
- [X] T018 [US3] Render `<TeamLogo>` before the team name in the Team column of `frontend/src/components/LeaderboardSection/LeaderboardSection.tsx`. (Depends on T015, T016.)
- [X] T019 [US3] Render `<TeamLogo>` before each team name in `frontend/src/components/ScheduleSection/MatchNode.tsx`. (Depends on T015, T016.)
- [X] T020 [US3] Render `<TeamLogo>` before each team header name in `frontend/src/components/MatchDetail/MatchDetail.tsx`. (Depends on T015, T016.)

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 [P] Seed a demo `logo_url` on at least one team in `backend/app/seed.py` so the hero and tables show a real logo during manual validation.
- [X] T022 [P] Update the project status section in `CLAUDE.md` to record the Team Logos feature.
- [X] T023 Run the `quickstart.md` manual walkthrough, including the responsive check at mobile and desktop widths (constitution §V, SPECIFICATIONS §9.6).
- [X] T024 Run the full suites green: `cd backend && pytest` and `cd frontend && npm test` (and `npm run build` for the type check).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: empty — no blocking prerequisites.
- **User Stories (Phase 3–5)**: each depends only on Setup. US1, US2, US3 are mutually independent and can run in parallel.
- **Polish (Phase 6)**: after the stories you intend to ship.

### Within User Story 3

- Tests (T008–T011) first and failing.
- Backend: T012 → T013 → T014.
- Frontend: T015 and T016 before the render sites T017–T020.
- T017–T020 are parallel to each other (different files) once T015/T016 land.

### Parallel Opportunities

- US1, US2, US3 can be built by different people at once.
- All `[P]` test tasks in a story run together.
- T017–T020 (four render sites) run in parallel after T015/T016.
- Backend (T012–T014) and frontend (T015–T020) of US3 can proceed in parallel except that the frontend needs the new API fields at integration time.

---

## Parallel Example: User Story 3 tests

```bash
# Write these together, watch them fail, then implement:
Task: "Leaderboard team_logo_url test in backend/tests/test_leaderboard.py"
Task: "Matches team ref logo_url test in backend/tests/test_public_api.py"
Task: "TeamLogo img/fallback test in frontend/src/components/TeamLogo/TeamLogo.test.tsx"
Task: "Logo-before-name tests in StandingsTable/LeaderboardSection/MatchNode/MatchDetail"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup → baseline green.
2. Phase 3 (US1) → admin can attach logos. **STOP & VALIDATE** — this is the MVP: nothing else can be seen until logos can be set.

### Incremental Delivery

1. US1 (set logos) → demo.
2. US2 (hero logos) → demo — highest-visibility payoff, minimal code (data already flows).
3. US3 (public tables) → demo — the broadest change (API fields + shared component + 4 render sites).
4. Polish (seed, docs, responsive + full-suite validation).

---

## Notes

- No new dependencies, no DB schema change (`Team.logo_url` already exists).
- Backend admin already accepts `logo_url`; US1 backend work is only the confirming test.
- Standings already carry `logo_url` end-to-end; the real backend work is US3 (leaderboard + matches).
- Fallback everywhere (null / empty / image `onError`) — never a broken-image icon (§9.7).
- Gold stays reserved for rank-1 only (§9.2). Commit after each task or logical group; verify tests fail before implementing.
