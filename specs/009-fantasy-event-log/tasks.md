---
description: "Task list for Fantasy Event Log"
---

# Tasks: Fantasy Event Log

**Input**: Design documents from `/specs/009-fantasy-event-log/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/events-api.md, quickstart.md

**Tests**: INCLUDED — the project constitution makes test-first non-negotiable (Principle I).

**Scope**: Backend (new table + endpoint + event writes) and frontend (log UI + sell modal). New Alembic migration `0004`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (event log), US2 (sell modal shows refund)

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 [P] Scaffold new files: `backend/app/events.py`, `frontend/src/components/fantasy/FantasyLog/` (`FantasyLog.tsx`, `FantasyLog.module.css`, `FantasyLog.test.tsx`), and the empty migration file `backend/alembic/versions/20260724_0004_fantasy_events.py` (revision `0004`, down_revision `0003`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The stored-events table, its migration, and the pure per-game math. **⚠️ Blocks US1 and US2.**

- [x] T002 Add the `FantasyEvent` model to `backend/app/models.py` per data-model.md (id, user_id FK→fantasy_users CASCADE, kind, member_name, amount signed, match_id FK→matches SET NULL nullable, created_at; index on `(user_id, created_at)`).
- [x] T003 Write Alembic migration `backend/alembic/versions/20260724_0004_fantasy_events.py` creating `fantasy_events` (idempotent, guarded like `0003`); run `cd backend && alembic upgrade head`, then confirm `pytest tests/test_migrations.py` (`alembic check`) is green.
- [x] T004 [P] Write FAILING pure-math tests in `backend/tests/test_fantasy_events.py` for `slot_game_events`: one event per played game; racket doubles each game; booster adds +50% of base win to the first win only and does not stack with the racket; and `slot_match_delta(slot, games)` equals the amounts derived from `slot_game_events`.
- [x] T005 Add `slot_game_events(slot, games) -> (list[GameEvent], bool)` to `backend/app/fantasy.py` and re-express `slot_match_delta` in terms of it (single source of truth). Make T004 pass — existing economy tests MUST stay green.
- [x] T006 Implement the persistence helpers in `backend/app/events.py`: `record_purchase`, `record_sale`, `record_game_results`, `clear_match_results` (thin inserts/deletes over `FantasyEvent`, per contracts/events-api.md).

**Checkpoint**: Table exists, per-game math proven, event writers available.

---

## Phase 3: User Story 1 - See my money history (Priority: P1) 🎯 MVP

**Goal**: A per-manager, newest-first log of purchase/sale/win/loss events with player, signed amount, and time; friendly empty state.

**Independent Test**: A manager with a buy and a settled game sees a purchase row and a win/loss row with correct amounts; a new manager sees the empty state.

### Backend

- [x] T007 [P] [US1] Write FAILING tests in `backend/tests/test_fantasy_events.py`: buying into an empty slot writes one `purchase` (−price); a swap writes a `sale` (+refund) **and** a `purchase` (−price); selling writes one `sale` (+refund).
- [x] T008 [P] [US1] Write FAILING tests in `backend/tests/test_fantasy_events.py`: recording a result writes one win/loss event per game for each holder; **re-recording** the same match leaves exactly one set (no duplicates) and the summed events match the balance change.
- [x] T009 [P] [US1] Write FAILING tests in `backend/tests/test_fantasy_events.py` for `GET /api/fantasy/events`: 401 without a token; returns the caller's events newest-first; `{events: []}` for a new account.
- [x] T010 [US1] Wire purchase/sale writes into `assign_slot` and `clear_slot` in `backend/app/routers/fantasy.py` (buy→purchase; swap→sale+purchase; sell→sale), using `app/events.py`. Make T007 pass.
- [x] T011 [US1] In `backend/app/settlement.py`, for each affected user delete the match's prior win/loss events (`clear_match_results`) then write fresh per-game events (`record_game_results` + `slot_game_events`), resolving each player's `member_name`. Make T008 pass; keep balance settlement identical.
- [x] T012 [US1] Add `FantasyEventOut` to `backend/app/schemas.py` and the `GET /api/fantasy/events` endpoint (guarded by `require_fantasy_user`, newest-first) to `backend/app/routers/fantasy.py`. Make T009 pass.

### Frontend

- [x] T013 [P] [US1] Add the `FantasyEvent` type and `fetchEvents()` to `frontend/src/api/fantasy.ts` (GET `/api/fantasy/events` → `data.events`).
- [x] T014 [P] [US1] Write FAILING tests in `frontend/src/components/fantasy/FantasyLog/FantasyLog.test.tsx`: renders one row per event with a signed formatted amount and the player; renders the empty state for `[]`; newest-first order preserved.
- [x] T015 [US1] Implement `FantasyLog.tsx` + `FantasyLog.module.css` (Norwegian copy, kind icon/label, signed amount with gain/spend colour, readable timestamp, empty state, responsive). Make T014 pass.
- [x] T016 [US1] Mount `FantasyLog` in `frontend/src/components/fantasy/FantasyPage/FantasyPage.tsx` (fetch events with the existing load-state pattern) and refresh it after buy/sell/save in `FantasyTeam.tsx`.

**Checkpoint**: The full event log works end-to-end.

---

## Phase 4: User Story 2 - Know a player's sale value before selling (Priority: P2)

**Goal**: The sell confirmation modal states the exact refund before committing.

**Independent Test**: Clicking Sell shows a modal with the refund amount; confirming produces a `sale` event of that same amount.

- [x] T017 [P] [US2] Write a FAILING test in `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.test.tsx`: the sell confirmation modal message includes the refund amount for the player being sold.
- [x] T018 [US2] Update `confirmSell`'s `ConfirmModal` message in `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.tsx` to include `refundOf(slot.price_paid)` (from `lib/fantasyCart`). Make T017 pass.

**Checkpoint**: Selling shows the payout; it matches the balance change and the logged sale amount.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T019 [P] Seed a few demo events in `backend/app/seed.py` so the log isn't empty in the demo (e.g. the demo manager's purchases + a settled result), reusing the real write paths where possible.
- [x] T020 Run the full gates: `cd backend && pytest` and `cd frontend && npm test && npm run lint && npm run build` — all green.
- [ ] T021 Walk through `specs/009-fantasy-event-log/quickstart.md` manual steps against the running app.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** blocks everything. Within Phase 2: T002→T003 (model before migration); T004→T005 (test before impl); T006 after T002.
- **US1 (Phase 3)**: backend tests T007–T009 `[P]` (same new test file, but independent cases) before impl T010–T012; T010 needs T006, T011 needs T005+T006, T012 needs T002. Frontend T013–T016 depend only on the endpoint contract (can start once T012's shape is known).
- **US2 (Phase 4)**: independent of US1's backend; its "sale amount matches the log" check is fully validated once US1's sale write (T010) exists.
- **Polish (Phase 5)** after the stories.

### Parallel Opportunities
- T004, T007, T008, T009 are `[P]` — independent test cases (author together, then implement).
- T013 and T014 are `[P]` (client type vs component test).
- T017 `[P]` is a different concern from US1's frontend.
- Backend and frontend of US1 can progress in parallel once the endpoint shape (contracts/events-api.md) is fixed.

---

## Implementation Strategy

### MVP (User Story 1)
1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1.
2. STOP & VALIDATE: buy/sell/win/loss all appear in the log; empty state works.

### Incremental Delivery
1. Foundational (table + math + writers) → US1 (log end-to-end) → US2 (sell modal amount) → polish.
2. Re-recording a result must never double-count (verify in T008 before shipping).

---

## Notes
- [P] = different files (or independent test cases), no dependency on an incomplete task.
- Keep the banked-balance settlement math byte-for-byte identical — only ADD event writes (T005 re-expresses the delta via the new pure function; existing economy tests must stay green).
- The floor-at-0 edge case is a documented approximation (research.md, Decision 4) — do not add clamp-distribution logic.
- Feature 010 already calls `assign_slot`/`clear_slot`, so once T010 lands its saves/sells log automatically.
