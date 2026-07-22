---

description: "Task list for Admin Page (F6–F13)"
---

# Tasks: Admin Page (F6–F13)

**Input**: Design documents from `/specs/002-admin-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin.md, quickstart.md

**Tests**: INCLUDED — the constitution makes test-first NON-NEGOTIABLE (§I). Auth guard, round-robin generation, and result recording (score validation + uneven pairing) are the highest test priority (SPECIFICATIONS §8).

**Organization**: Grouped by user story. Auth (US1) is the gate every other admin endpoint depends on, so the session middleware + `require_admin` guard live in Foundational; the login/logout logic and UI are US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 (Setup, Foundational, Polish have no story label)

## Path Conventions

Web app: `backend/app/`, `backend/tests/`, `frontend/src/` (per plan.md structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the auth dependency, config, and the frontend `/admin` entry point.

- [X] T001 [P] Backend: add `itsdangerous` to `backend/requirements.txt` (required by Starlette `SessionMiddleware`)
- [X] T002 [P] Backend: create `backend/app/config.py` reading `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` from env (fail loudly with a clear message if missing at startup)
- [X] T003 [P] Infra: add `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` env vars to the backend service in `docker-compose.yml`
- [X] T004 [P] Frontend: create typed admin API client `frontend/src/api/admin.ts` (all calls use `credentials: 'include'`; typed to contracts/admin.md) and split routing in `frontend/src/App.tsx` so a `/admin` path renders a new `AdminPage`, else the public page

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `Game` schema change, admin Pydantic schemas, the session middleware + `require_admin` guard, the admin router + its guarded read endpoints, and the frontend admin gate shell — everything the user stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend

- [X] T005 Add `member_a_id` and `member_b_id` nullable FKs (→ `Member`, `ON DELETE SET NULL`) to `Game` in `backend/app/models.py` per data-model.md
- [X] T006 [P] Define admin Pydantic schemas in `backend/app/schemas.py` — team/member/match create+update+out, match-with-games out, and the record-result request (list of `{member_a_id, member_b_id, team_a_score, team_b_score}`) per contracts/admin.md
- [X] T007 Create `backend/app/auth.py` with a `require_admin` dependency that returns 401 when the session has no admin flag, and register Starlette `SessionMiddleware` (using `SESSION_SECRET`) in `backend/app/main.py`
- [X] T008 Create the `/api/admin` router in `backend/app/routers/admin.py` (guarded by `require_admin`) and register it in `backend/app/main.py`
- [X] T009 [P] Write FAILING guard test in `backend/tests/test_auth.py`: every admin endpoint (teams/matches reads, all writes) returns 401 without a valid session
- [X] T010 Implement guarded read endpoints in `backend/app/routers/admin.py`: `GET /api/admin/teams` (teams + members) and `GET /api/admin/matches` (matches + games) per contracts/admin.md

### Frontend

- [X] T011 [P] Create `frontend/src/components/admin/AdminPage/` shell that calls `GET /api/admin/session` and shows the login gate when logged out or the dashboard container when logged in (managers wired in later phases), styled with CSS Modules + `theme/tokens.css`

**Checkpoint**: Admin router exists and returns 401 for everyone (no login yet); the `/admin` page shows a gate. User stories can now begin.

---

## Phase 3: User Story 1 - Log in and log out of the admin area (Priority: P1) 🎯 MVP

**Goal**: A shared password unlocks `/admin` and establishes a session; logout ends it and re-locks the area.

**Independent Test**: Set the password hash, visit `/admin`, confirm wrong password is rejected and the correct one grants access; log out and confirm access is revoked.

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL)

- [X] T012 [P] [US1] Password hashing/verify test in `backend/tests/test_auth.py`: `verify_password` accepts the correct password against a generated `salt$iterations$hexhash` and rejects a wrong one (constant-time compare)
- [X] T013 [P] [US1] Login/logout flow test in `backend/tests/test_auth.py`: wrong password → 401 no cookie; correct password → session set and a previously-401 endpoint now returns 200; logout clears the session so it 401s again; `GET /api/admin/session` reports the state

### Implementation for User Story 1

- [X] T014 [US1] Implement password hashing in `backend/app/auth.py` — `verify_password` using stdlib `hashlib.pbkdf2_hmac` + `hmac.compare_digest`, and a `python -m app.auth hash <password>` CLI that prints `salt$iterations$hexhash` (to make T012 pass)
- [X] T015 [US1] Implement `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/session` in `backend/app/routers/admin.py` (login/logout/session are exempt from `require_admin`) per contracts/admin.md (to make T013 pass)
- [X] T016 [P] [US1] Component test for `LoginForm` in `frontend/src/components/admin/LoginForm/LoginForm.test.tsx`: submitting the password calls login; error message shown on 401; logout control calls logout
- [X] T017 [US1] Implement `LoginForm` (password entry + submit + error) and a logout control in `frontend/src/components/admin/LoginForm/`, wired into `AdminPage` so a valid session reveals the dashboard

**Checkpoint**: MVP — `/admin` is protected; login unlocks it, logout re-locks it, all other admin endpoints are reachable only with a session.

---

## Phase 4: User Story 2 - Manage teams and members (Priority: P1)

**Goal**: Create/rename/delete teams and create/edit/delete members; deleting a team cascades; editing a roster leaves recorded games intact.

**Independent Test**: Logged in, create two teams with different roster sizes, rename a team, edit and delete a member, delete a team — all persist and appear on the public site.

### Tests for User Story 2 ⚠️ (write first, ensure they FAIL)

- [X] T018 [P] [US2] CRUD test in `backend/tests/test_admin_crud.py`: create/rename/delete team (409 on duplicate name); create/edit/delete member; deleting a team removes its members and matches (cascade, FR-010); deleting a member sets recorded games' `member_a_id`/`member_b_id` to NULL and keeps the games (FR-008, §3.1)

### Implementation for User Story 2

- [X] T019 [US2] Implement team endpoints (`POST/PUT/DELETE /api/admin/teams[/{id}]`) in `backend/app/routers/admin.py` per contracts/admin.md
- [X] T020 [US2] Implement member endpoints (`POST/PUT/DELETE /api/admin/members[/{id}]`) in `backend/app/routers/admin.py`, including NULLing pairings on member delete (§3.1)
- [X] T021 [P] [US2] Component test for `TeamsManager` in `frontend/src/components/admin/TeamsManager/TeamsManager.test.tsx`: lists teams+members, creates/renames/deletes a team, adds/edits/deletes a member
- [X] T022 [US2] Implement `TeamsManager` (teams + members CRUD UI) in `frontend/src/components/admin/TeamsManager/`, wired into `AdminPage`; responsive, CSS Modules

**Checkpoint**: US1 + US2 — an organiser can log in and fully manage teams and members.

---

## Phase 5: User Story 3 - Generate the round-robin schedule (Priority: P1)

**Goal**: One action creates a scheduled match for every missing team pair, never duplicating.

**Independent Test**: With N teams and no matches, generate → exactly N·(N−1)/2 matches; run again → 0 created; add a team, regenerate → only new pairings added.

### Tests for User Story 3 ⚠️ (write first, ensure they FAIL)

- [X] T023 [P] [US3] Pure-function test in `backend/tests/test_schedule.py`: `missing_pairings(teams, matches)` returns every team pair with no match, is order-independent (`{a,b}=={b,a}`), returns empty when full, and empty for <2 teams
- [X] T024 [P] [US3] Endpoint test in `backend/tests/test_schedule.py`: `POST /api/admin/schedule/generate` creates exactly the missing matches, reports `created`/`skipped`, creates 0 on a full schedule, and only new pairings after a team is added

### Implementation for User Story 3

- [X] T025 [P] [US3] Implement pure `missing_pairings` (and pair-key helper) in `backend/app/schedule.py` to make T023 pass (§5.3)
- [X] T026 [US3] Implement `POST /api/admin/schedule/generate` in `backend/app/routers/admin.py` using `schedule.py`, creating one `scheduled` match per missing pair (to make T024 pass)
- [X] T027 [P] [US3] Component test for the generate control in `frontend/src/components/admin/MatchesManager/MatchesManager.test.tsx`: clicking "Generate round-robin" calls the endpoint and refreshes the match list
- [X] T028 [US3] Add the "Generate round-robin" action + match list to `frontend/src/components/admin/MatchesManager/`, wired into `AdminPage`

**Checkpoint**: US1–US3 — organiser can log in, manage teams, and generate the full schedule.

---

## Phase 6: User Story 4 - Record a match result (Priority: P1)

**Goal**: Set member pairings for each game (handling uneven rosters), enter validated scores, save → match completed and standings recompute.

**Independent Test**: For an uneven-roster scheduled match, set pairings (repeat a smaller-team member), enter valid scores, save → completed + standings update; a negative or tied score is rejected.

### Tests for User Story 4 ⚠️ (write first, ensure they FAIL)

- [X] T029 [P] [US4] Result test in `backend/tests/test_record_result.py`: `PUT /api/admin/matches/{id}/result` with uneven rosters accepts exactly `max(sizeA,sizeB)` games with a repeated smaller-team member, sets `status=completed`, and standings recompute afterward
- [X] T030 [P] [US4] Validation test in `backend/tests/test_record_result.py`: negative score and tied game score are each rejected (422/400) with the match staying not-completed; wrong game count or a member not on the right team is rejected (§3.2/§3.3)

### Implementation for User Story 4

- [X] T031 [US4] Implement `PUT /api/admin/matches/{id}/result` in `backend/app/routers/admin.py`: validate game count = larger team size, each large-team member appears once, pairings belong to the right teams, scores per §3.3; replace games, set `completed` (to make T029/T030 pass)
- [X] T032 [P] [US4] Component test for `ResultForm` in `frontend/src/components/admin/ResultForm/ResultForm.test.tsx`: renders one game row per larger-team member, lets the smaller team repeat a member, blocks submit on invalid scores, submits valid results
- [X] T033 [US4] Implement `ResultForm` (pairing pickers + score inputs + inline validation messages) in `frontend/src/components/admin/ResultForm/`, opened from `MatchesManager`; responsive, CSS Modules

**Checkpoint**: US1–US4 — the full happy path works: log in → teams → schedule → record results → public standings update (SC-004).

---

## Phase 7: User Story 5 - Manually manage matches (Priority: P2)

**Goal**: Create, edit, and delete individual matches by hand as a safety valve beyond auto-generation.

**Independent Test**: Logged in, create a match between two chosen teams, edit its teams, and delete it — each change persists.

### Tests for User Story 5 ⚠️ (write first, ensure they FAIL)

- [X] T034 [P] [US5] Match CRUD test in `backend/tests/test_admin_crud.py`: create a match (400 if same team both sides), edit its teams, delete it (cascades to its games)

### Implementation for User Story 5

- [X] T035 [US5] Implement match endpoints (`POST/PUT/DELETE /api/admin/matches[/{id}]`) in `backend/app/routers/admin.py` per contracts/admin.md
- [X] T036 [US5] Add manual create/edit/delete match controls to `frontend/src/components/admin/MatchesManager/`

**Checkpoint**: All five stories functional; the admin area is complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T037 [P] Ensure admin error responses are clear/actionable JSON (no raw stack traces) and the frontend surfaces them in the UI (CLAUDE.md error handling, FR-018)
- [X] T038 [P] Responsive pass on every admin screen at 375 / 768 / 1440 px — no horizontal page scroll (FR-017, SC-007)
- [X] T039 [P] Verify keyboard focus ring on every admin input/button (§9.7) and that the login gate is reachable/usable by keyboard
- [X] T040 [P] Update `backend/app/seed.py` to set `member_a_id`/`member_b_id` on seeded games so seeded matches carry valid pairings (optional but keeps demo data consistent)
- [X] T041 Run quickstart.md validation end-to-end: `pytest` green, `npm test` green, `npm run build` green (constitution: never ship on red)
- [X] T042 [P] Update `CLAUDE.md` project status to note the admin feature (auth via env vars, `/admin` route, new `Game` pairing columns) and the `python -m app.auth hash` helper

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–7)**: all depend on Foundational.
  - **US1 (auth)** must land before US2–US5 are *usable* end-to-end (they need a session), though those endpoints/tests can be built in parallel — the guard already exists from Foundational.
  - US2, US3, US4, US5 are independent of each other (different endpoints/components), except US4's `ResultForm` and US3/US5 controls all live in/near `MatchesManager`, so coordinate edits to that component.
- **Polish (Phase 8)**: depends on the desired stories being complete.

### Within Each Story / Phase

- Tests are written and FAIL before implementation (constitution §I).
- Backend: schema/model → pure logic → endpoint. Frontend: component test → component → wire into `AdminPage`.

### Parallel Opportunities

- Setup: T001–T004 all [P].
- Foundational: T006 and T009 are [P]; T005→(none), T007→T008→T010 are sequential (guard → router → read endpoints).
- Within a story, the `[P]` test tasks can be written together; backend and frontend halves of a story can be built by different people in parallel.
- After Foundational + US1, US2/US3/US4/US5 backends can proceed in parallel by different developers.

---

## Parallel Example: User Story 3 (round-robin)

```bash
# Write the failing tests together (they define the behavior):
Task: "Pure missing_pairings test in backend/tests/test_schedule.py"    # T023
Task: "generate endpoint test in backend/tests/test_schedule.py"        # T024
Task: "MatchesManager generate-control test (frontend)"                 # T027
# Then implement to green: T025 (schedule.py) → T026 (endpoint) → T028 (UI)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1.
4. **STOP and VALIDATE**: `/admin` locks/unlocks correctly and the guard protects every endpoint.
5. This is the safety gate that makes the rest safe to expose.

### Incremental Delivery

1. Setup + Foundational → guarded admin skeleton + gate shell.
2. US1 (login/logout) → test → demo (MVP: the lock works).
3. US2 (teams/members) → test → demo.
4. US3 (generate schedule) → test → demo.
5. US4 (record result) → test → demo (public standings now update — the payoff).
6. US5 (manual match CRUD) → test → demo (safety valve).

### Parallel Team Strategy

After Foundational + US1: Developer A takes US2, B takes US3+US5 (shared `MatchesManager`), C takes US4. Each story is independently testable and mergeable.

---

## Notes

- [P] = different files, no dependencies.
- Auth (US1) is the highest-risk correctness area alongside result validation (US4) — get their tests right first.
- The one schema change (T005: `Game` pairing columns) is what unblocks US4 and the future individual leaderboard (F2).
- No new frameworks: auth reuses Starlette `SessionMiddleware` + stdlib hashing; UI stays plain CSS Modules (constitution III/IV).
- Commit after each task or logical group; never commit on a red suite.
