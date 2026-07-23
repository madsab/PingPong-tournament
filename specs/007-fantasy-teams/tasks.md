# Tasks: Fantasy Ping Pong Teams

**Feature**: 007-fantasy-teams | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Tests are MANDATORY** here — the project constitution requires test-first (write a failing
test before the code that passes it). Each story phase lists its tests before its implementation.

**Paths** are repo-relative. `[P]` = can run in parallel (different files, no incomplete deps).

---

## Phase 1: Setup

- [X] T001 Confirm no new dependencies are needed (backend `requirements.txt`, frontend `package.json` already have FastAPI/SQLAlchemy/Pydantic/Starlette and `@xyflow/react`) and that `python -m app.seed` + `docker compose up` run green before starting.

---

## Phase 2: Foundational (blocking prerequisites for all stories)

- [X] T002 Add `FantasyUser` and `FantasySlot` models to `backend/app/models.py` per `data-model.md` (FantasyUser: `id`, `name`, unique `name_key`, `fun_fact`, `created_at`, `slots` relationship with `cascade="all, delete-orphan"`; FantasySlot: `id`, `user_id` FK CASCADE, `slot_index`, `member_id` FK CASCADE, plus `UNIQUE(user_id, slot_index)`, `UNIQUE(user_id, member_id)`, and `CheckConstraint slot_index BETWEEN 1 AND 4`).
- [X] T003 [P] Add fantasy request/response schemas to `backend/app/schemas.py` (`FantasyRegisterRequest`, `FantasyLoginRequest`, `FantasyUserOut`, `FantasySlotOut`, `FantasyTeamOut`, `SlotAssignRequest`, `MembersResponse`/`MemberOut`) with Pydantic length/non-empty constraints (name≤100, fun_fact≤280).
- [X] T004 Create `backend/app/routers/fantasy.py` with an `APIRouter(prefix="/api/fantasy")` and a `require_fantasy_user` dependency that loads the user from `session["fantasy_user_id"]` and raises 401 if missing/unknown; register the router in `backend/app/main.py`.

**Checkpoint**: tables create on startup, router mounts, guard exists — stories can now build.

---

## Phase 3: User Story 1 — Register & be remembered (Priority: P1) 🎯 MVP

**Goal**: A visitor registers with name + required fun-fact, logs in by name only, and stays
logged in across visits until they log out.

**Independent test**: Register with name+fun-fact, reload/reopen → still logged in; log out →
login screen; log in again by name → same account. Empty fun-fact is rejected.

### Tests (write first, must fail)

- [X] T005 [P] [US1] In `backend/tests/test_fantasy_api.py`, write failing tests: register success sets session and returns user; register with empty/whitespace name → 422; empty/whitespace fun_fact → 422; over-length name(>100)/fun_fact(>280) → 422; duplicate name (case/space-insensitive, e.g. "Alice" vs " alice ") → 409; login existing → 200; login unknown → 404; `/me` with session → 200, without → 401; logout clears session.
- [X] T006 [P] [US1] In `frontend/src/components/fantasy/FantasyLogin/FantasyLogin.test.tsx`, write failing tests: submitting a known name logs in; unknown name reveals the fun-fact field; submitting with empty fun-fact shows the "fun-fact required" message and does not call register.

### Implementation

- [X] T007 [US1] Implement `POST /api/fantasy/register` in `backend/app/routers/fantasy.py`: trim+validate name/fun_fact, compute `name_key`, 409 on existing key, create user, set `session["fantasy_user_id"]`, return `FantasyUserOut` (201).
- [X] T008 [US1] Implement `POST /api/fantasy/login`, `GET /api/fantasy/me`, and `POST /api/fantasy/logout` in `backend/app/routers/fantasy.py` (login looks up by `name_key`, 404 if none; me uses the guard; logout pops `fantasy_user_id`).
- [X] T009 [P] [US1] Create `frontend/src/api/fantasy.ts` typed client with `credentials: 'include'`: `register`, `login`, `getMe`, `logout` and their TS types (mirror the same `API_BASE` pattern as `src/api/public.ts`).
- [X] T010 [US1] Create `frontend/src/components/fantasy/FantasyLogin/` (name field; on 404 reveal fun-fact field and switch to register; client-side required-field hints backed by server validation) + its CSS module.
- [X] T011 [US1] Create `frontend/src/components/fantasy/FantasyPage/` gate: on mount call `getMe`; show `FantasyLogin` when 401, otherwise the team view (placeholder until US2), with a log-out button; reuse the F1 load-state pattern.
- [X] T012 [US1] Add a `/fantasy` branch to `frontend/src/App.tsx` (same path-split style as `/admin`) rendering `<FantasyPage />`.

**Checkpoint**: US1 is independently demoable — register, persistence across reload, logout/login.

---

## Phase 4: User Story 2 — Build a 4-slot fantasy team (Priority: P2)

**Goal**: A logged-in user fills four ReactFlow boxes with real players, can swap/clear them,
can't use the same player twice, and the roster survives reloads.

**Independent test**: Fill four boxes with distinct players, reload → same four; adding a
duplicate player is rejected; clearing a box empties it.

### Tests (write first, must fail)

- [X] T013 [P] [US2] In `backend/tests/test_public_api.py`, add failing tests for `GET /api/members`: returns every member with `id, name, team_id, team_name, team_logo_url`, ordered by team then name; no login required.
- [X] T014 [P] [US2] In `backend/tests/test_fantasy_api.py`, add failing tests: `GET /api/fantasy/team` returns exactly 4 slots (empty ones null) and requires login (401 without); `PUT slot` assigns/replaces and returns the updated team; `slot_index` outside 1–4 → 422; unknown `member_id` → 404; assigning a member already in another slot → 409; `DELETE slot` clears (idempotent) → 422 on bad index.
- [X] T015 [P] [US2] In `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.test.tsx`, write failing tests (mock `@xyflow/react` like `ScheduleSection` does): renders 4 slot nodes; clicking a slot opens `MemberPicker`; choosing a player calls the assign client; clearing calls delete.

### Implementation

- [X] T016 [US2] Implement `GET /api/members` in `backend/app/routers/public.py` (join Member→Team, order by team name then member name) returning `MembersResponse`.
- [X] T017 [US2] Implement `GET /api/fantasy/team`, `PUT /api/fantasy/team/slots/{slot_index}`, `DELETE /api/fantasy/team/slots/{slot_index}` in `backend/app/routers/fantasy.py`: validate slot_index (1–4), member existence (404), duplicate member (409, check before insert for a clean message), always return all 4 slots with resolved member/team names + logo.
- [X] T018 [US2] Extend `frontend/src/api/fantasy.ts` with `fetchTeam`, `assignSlot(slotIndex, memberId)`, `clearSlot(slotIndex)`, and `fetchMembers()` (public) + types.
- [X] T019 [P] [US2] Create `frontend/src/components/fantasy/SlotNode/` custom React Flow node: filled shows player name + team + `TeamLogo`; empty shows an "add player" prompt; responsive sizing (relative units).
- [X] T020 [P] [US2] Create `frontend/src/components/fantasy/MemberPicker/` (searchable list from `fetchMembers`, disables players already on the team, has a "clear slot" action).
- [X] T021 [US2] Create `frontend/src/components/fantasy/FantasyTeam/` React Flow canvas laying out the 4 `SlotNode`s responsively; wire click→`MemberPicker`→assign/clear→refetch team; import base React Flow CSS is already global in `main.tsx`. Mount it in `FantasyPage` (replacing the US1 placeholder).

**Checkpoint**: US2 works on top of US1 — a real 4-slot team, persistent, dedup-enforced.

---

## Phase 5: User Story 3 — Earn CompuBucks (Priority: P3)

**Goal**: Show a CompuBucks total computed on read from the chosen players' completed real
games (+10 win / +3 loss), updating as the roster changes.

**Independent test**: Empty roster → 0; add a player with real wins → total rises by the rule;
remove them → total drops.

### Tests (write first, must fail)

- [X] T022 [P] [US3] Create `backend/tests/test_fantasy_scoring.py` with failing tests for a pure `compute_compubucks(member_ids, matches)`: empty set → 0; only completed games count (scheduled ignored); +10 per game the member's side won, +3 per game lost; member on both sides across games sums correctly; no double-count.
- [X] T023 [P] [US3] In `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.test.tsx`, add a failing test that the CompuBucks total from the team response is displayed.

### Implementation

- [X] T024 [US3] Create `backend/app/fantasy.py` with `BUCKS_PER_WIN=10`, `BUCKS_PER_LOSS=3` and the pure `compute_compubucks` function per `data-model.md` (sibling of `standings.py`, no DB access).
- [X] T025 [US3] Wire `compute_compubucks` into `GET /api/fantasy/team` (and the PUT/DELETE responses) in `backend/app/routers/fantasy.py`, loading matches with `selectinload(Match.games)` like `public.py`, so every team response carries a fresh `compubucks`.
- [X] T026 [US3] Display the CompuBucks total in `frontend/src/components/fantasy/FantasyTeam/` (a badge/header on the canvas) using the value from the team response.

**Checkpoint**: all three stories complete — register, build, and earn.

---

## Phase 6: Polish & Cross-Cutting

- [X] T027 [P] Add a small demo fantasy user + a few slot picks to `backend/app/seed.py` so `/fantasy` shows populated data after seeding (idempotent, matches existing seed style).
- [X] T028 [P] Verify responsiveness of the `/fantasy` page on mobile + desktop (no fixed px on the canvas; slots wrap/stack) per constitution Principle V.
- [X] T029 [P] Update `CLAUDE.md` "Project status" with a Fantasy Teams (007) paragraph, and note in the schema section that the two new tables are auto-created (no reset).
- [X] T030 Run the full suites and linters green before calling done: `cd backend && pytest`, `cd frontend && npm test && npm run build && npm run lint`.

---

## Dependencies & Execution Order

```
Phase 1 (Setup) ─► Phase 2 (Foundational: models, schemas, router+guard)
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Phase 3 US1 ──► Phase 4 US2 ──► Phase 5 US3 ──► Phase 6 Polish
  (auth+remember) (build team)   (CompuBucks)
```

- **Foundational (Phase 2) blocks everything.** Within it, T003 [P] can run alongside T002; T004 needs T002/T003.
- **Story order is by priority.** US2 depends on US1 (needs a logged-in identity); US3 depends on US2 (needs a roster to score). Each story is still independently *testable/demoable* at its checkpoint.
- Within a story, **tests come before implementation** (constitution). `[P]` tests touch different files and can be written together.

## Parallel Opportunities

- **Phase 2**: T003 ∥ T002.
- **US1 tests**: T005 (backend) ∥ T006 (frontend). Impl: T009 (client) ∥ T007/T008 (endpoints).
- **US2 tests**: T013 ∥ T014 ∥ T015. Impl: T019 (SlotNode) ∥ T020 (MemberPicker).
- **US3 tests**: T022 ∥ T023.
- **Polish**: T027 ∥ T028 ∥ T029.

## Implementation Strategy

- **MVP = Phase 1 + 2 + Phase 3 (US1)**: a working, remembered fantasy identity. Ship-able alone.
- **Increment 2 = US2**: the ReactFlow 4-slot team.
- **Increment 3 = US3**: CompuBucks payoff.
- Keep the suite green at every checkpoint; never build a story before its tests are red.
