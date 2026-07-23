---
description: "Task list for Fantasy CompuBucks Economy"
---

# Tasks: Fantasy CompuBucks Economy

**Input**: Design documents from `/specs/008-fantasy-economy/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED — the project constitution makes Test-First non-negotiable, so every story writes failing tests before implementation.

**Organization**: Tasks grouped by user story (US1–US6, priority order) so each is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no incomplete dependency)
- **[Story]**: US1–US6 from spec.md

## Path Conventions

Web app: `backend/app/`, `backend/tests/`, `frontend/src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Economy constants in one place. No new dependencies (constitution IV).

- [x] T001 Replace the 007 `BUCKS_PER_WIN` in `backend/app/fantasy.py` with the economy constant set from research.md Decision 7 (`STARTING_BALANCE=100_000_000`, `WIN_REWARD=5_000_000`, `LOSS_PENALTY=2_000_000`, `RACKET_MULTIPLIER=2`, `BOOSTER_WIN_BONUS=0.5`, `SELL_RATE=0.85`, `DEFAULT_BOOSTER_PRICE=1_000_000`); keep the module import-safe (leave existing pure helpers to be rewritten in T023).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema + migration all stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Extend existing models in `backend/app/models.py`: add `Member.price` (Integer, nullable); `FantasyUser.balance` (Integer, not null, default 100_000_000) and `FantasyUser.boosters_available` (Integer, not null, default 0); `FantasySlot.price_paid` (Integer, not null, default 0), `FantasySlot.has_racket` (Boolean, not null, default False), `FantasySlot.booster_active` (Boolean, not null, default False).
- [x] T003 Add two new models to `backend/app/models.py`: `Setting` (`key` String PK, `value` Integer not null) and `FantasySettlement` (`user_id` FK→fantasy_users CASCADE, `match_id` FK→matches CASCADE, `applied_delta` Integer not null, `consumed_booster_slot_index` Integer nullable, `UniqueConstraint(user_id, match_id)`).
- [x] T004 Create idempotent Alembic migration `backend/alembic/versions/20260723_0003_economy.py` (house style of 0002, revises `0002`): add the new columns and the `settings` + `fantasy_settlements` tables; in `upgrade()` also reset any existing rows (`fantasy_users.balance=100_000_000`, `boosters_available=0`, delete all `fantasy_slots` rows — the documented rollout reset). `downgrade()` drops the new tables/columns.
- [x] T005 Run `cd backend && alembic check` and iterate on T004 until model↔migration parity passes (guards `tests/test_migrations.py`).
- [x] T006 [P] Confirm `backend/tests/conftest.py` `create_all` builds the new tables/columns for SQLite; add any shared fixture/helper the new tests will reuse (e.g. a helper to make a completed match with given game winners).

**Checkpoint**: schema + migration ready; stories can begin.

---

## Phase 3: User Story 1 - Admin prices the players (Priority: P1) 🎯 MVP

**Goal**: Admin sets a per-player price and the booster price; unpriced players aren't pickable.

**Independent Test**: Set a member's price and the booster price in `/admin`; confirm priced members appear buyable in the fantasy picker and unpriced ones do not.

### Tests for User Story 1

- [x] T007 [P] [US1] Write failing tests in `backend/tests/test_admin_pricing.py`: `PUT /api/admin/members/{id}` sets `price`, rejects negative/non-integer (422), clears with `null`; `MemberOut` and public `GET /api/members` include `price`; `GET/PUT /api/admin/settings/booster-price` (default 1,000,000, rejects negative).

### Implementation for User Story 1

- [x] T008 [US1] In `backend/app/schemas.py` add `price: int | None` to `MemberOut`, `MemberCreate`, `MemberUpdate` and `PlayerOut`; add `BoosterPriceOut`/`BoosterPriceUpdate` schemas.
- [x] T009 [US1] In `backend/app/routers/admin.py`: handle `price` in `create_member`/`update_member` and `_member_out` (validate `>= 0` or null); add `GET/PUT /api/admin/settings/booster-price` backed by the `Setting` table with a small get/set-with-default helper (default `DEFAULT_BOOSTER_PRICE`).
- [x] T010 [US1] In `backend/app/routers/public.py` include `price` on each `PlayerOut` returned by `GET /api/members`.
- [x] T011 [P] [US1] In `frontend/src/api/admin.ts` add `updateMemberPrice(id, price)`, `getBoosterPrice()`, `setBoosterPrice(value)`; add `price` to the Member type.
- [x] T012 [US1] In `frontend/src/components/admin/TeamsManager/TeamsManager.tsx` add a per-member price input and a booster-price setting input, wired to the new api calls (empty clears the price).
- [x] T013 [P] [US1] Extend `frontend/src/components/admin/TeamsManager/TeamsManager.test.tsx`: saving a member price and the booster price call the api.

**Checkpoint**: pricing works end-to-end; players can be made pickable.

---

## Phase 4: User Story 2 - Buy and sell within a budget (Priority: P1)

**Goal**: Users start at 100M, buy priced players (must afford), sell for 85% of what they paid, never below 0.

**Independent Test**: From 100M, buy a 20M player → 80M; try an unaffordable buy → blocked; sell → +17M and slot empties.

### Tests for User Story 2

- [x] T014 [P] [US2] In `backend/tests/test_fantasy_api.py` write failing tests: new user balance is 100,000,000; buying deducts `price`; unaffordable buy rejected (unchanged); unpriced player rejected (422); sell refunds `floor(0.85*price_paid)` and empties; swap refunds old then charges new; duplicate player rejected.

### Implementation for User Story 2

- [x] T015 [US2] In `backend/app/schemas.py` replace `FantasyTeamOut.compubucks` with `balance`, and add `boosters_available` + `booster_price`; add `price_paid`, `has_racket`, `booster_active` to `FantasySlotOut`.
- [x] T016 [US2] In `backend/app/routers/fantasy.py` rewrite `_serialize_team` (return balance + economy slot fields + booster_price), `assign_slot` (PUT = BUY/SWAP: reject unpriced, refund `floor(0.85*old.price_paid)` on swap, check affordability, deduct, set `price_paid`, reset `added_at`, clear that slot's `has_racket`/`booster_active`), and `clear_slot` (DELETE = SELL: refund and empty). Balance clamped `>= 0` everywhere.
- [x] T017 [P] [US2] In `frontend/src/api/fantasy.ts` update `FantasyTeam` (balance, boosters_available, booster_price) and `FantasySlot` (price_paid, has_racket, booster_active) types and add `price` to `Player`; buy/sell reuse `assignSlot`/`clearSlot`.
- [x] T018 [US2] In `frontend/src/components/fantasy/SlotCard/SlotCard.tsx` (+ module css) show the player's price / `price_paid`; an empty slot reads "Buy a player".
- [x] T019 [US2] In `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.tsx`, `CompuBucks`, and `MemberPicker`: show `balance`, show each player's price in the picker and disable unaffordable/unpriced ones, and surface the "Not enough CompuBucks" error.
- [x] T020 [P] [US2] Extend `frontend/src/components/fantasy/FantasyTeam/FantasyTeam.test.tsx`: balance renders; a buy updates balance; unaffordable buy shows the message.

**Checkpoint**: full budget/buy/sell loop works (still no game earnings yet).

---

## Phase 5: User Story 3 - Earn and lose from real submatches (Priority: P2)

**Goal**: Recording a match moves affected users' balances (+5M win / −2M loss), only for games after purchase, floored at 0, idempotent on re-record.

**Independent Test**: Buy a player, record a match they won → +5M; a loss → −2M; drive to 0 → stays 0; re-record → no double pay.

### Tests for User Story 3

- [x] T021 [P] [US3] Rewrite `backend/tests/test_fantasy_scoring.py` for the pure math: per-slot base win/loss, games filtered by `added_at`, empty slots contribute 0, and a `clamp`-to-0 helper.
- [x] T022 [P] [US3] In `backend/tests/test_fantasy_api.py` add settlement tests: recording a result changes the picking user's balance; floor at 0 on losses; games completed before `added_at` ignored; recording the same match twice pays once (idempotent).

### Implementation for User Story 3

- [x] T023 [US3] Rewrite the pure math in `backend/app/fantasy.py`: `slot_match_delta(slot, games)` returning the base +5M/−2M per game the slot's member played (racket/booster hooks added in US4/US5), and a `clamp0(balance)` helper. No DB access.
- [x] T024 [US3] Create `backend/app/settlement.py` with `settle_match(db, match)`: for each fantasy user holding a member who played in this match with `slot.added_at < match.completed_at` — reverse any existing `FantasySettlement` for (user, match) (add back `applied_delta`, restore consumed booster), recompute the delta, apply the 0 floor to `user.balance`, and store a fresh settlement with the actual applied delta and any consumed booster slot.
- [x] T025 [US3] In `backend/app/routers/admin.py` `record_result`, after the games + `completed_at` commit, call `settle_match(db, match)` (runs on first record and every re-record).
- [x] T026 [US3] Update `backend/app/seed.py`: give demo members prices, create a demo fantasy manager with a bought squad (balance reflecting the buys) and seeded completed matches so the demo shows non-zero earnings.

**Checkpoint**: buying + earning/losing works end-to-end; floor holds; admin edits don't double-pay.

---

## Phase 6: User Story 4 - Golden Ping Pong Racket (Priority: P3)

**Goal**: One player per team can hold the racket (reassignable), doubling their win (+10M) and loss (−4M); shown bottom-right on the card.

**Independent Test**: Assign racket to one player → icon on that card only; that player's win pays 10M, loss costs 4M; moving it clears the previous holder.

### Tests for User Story 4

- [x] T027 [P] [US4] In `backend/tests/test_fantasy_api.py` add racket tests: `PUT /api/fantasy/team/racket` sets one and clears others; empty slot rejected; settlement uses ×2 for the racket holder; racket dropped on sell/swap; `DELETE` clears it.

### Implementation for User Story 4

- [x] T028 [US4] In `backend/app/routers/fantasy.py` add `PUT /api/fantasy/team/racket` (body `{slot_index}` — set `has_racket` on that filled slot, clear all others; 422 if empty) and `DELETE /api/fantasy/team/racket`; add the request schema to `backend/app/schemas.py`.
- [x] T029 [US4] Extend `backend/app/fantasy.py` (and thus `settlement.py`) so a slot with `has_racket` doubles both win and loss (`RACKET_MULTIPLIER`).
- [x] T030 [P] [US4] In `frontend/src/api/fantasy.ts` add `setRacket(slotIndex)` and `clearRacket()`.
- [x] T031 [US4] In `frontend/src/components/fantasy/SlotCard/SlotCard.tsx` (+ FantasyTeam wiring) render a golden-racket icon in the card's bottom-right when `has_racket`, plus a control to assign/move it (visuals via `/frontend-design`).
- [x] T032 [P] [US4] Add a frontend test asserting the racket icon shows only on the assigned card.

**Checkpoint**: racket amplifies exactly one player and settles correctly.

---

## Phase 7: User Story 5 - Booster shop (Priority: P4)

**Goal**: Buy a one-time Booster (admin-priced, default 1M) from a shop, place it on a player; +50% on their next winning game only, consumed after that game, no stacking with the racket, re-buyable after consumption.

**Independent Test**: Buy a booster (balance drops), place it, player wins next game → +7.5M and booster gone; on the racket holder → +10M only (no stack).

### Tests for User Story 5

- [x] T033 [P] [US5] In `backend/tests/test_fantasy_api.py` add booster tests: buying deducts `booster_price` and blocks a second while one is held; placing sets it on a slot; settlement gives +50% of base win on the player's first game in the next match only, consumes it win-or-lose, does not stack with racket, and re-buy is allowed after consumption.

### Implementation for User Story 5

- [x] T034 [US5] In `backend/app/routers/fantasy.py` add `POST /api/fantasy/shop/booster` (charge `booster_price`, `boosters_available += 1`, reject if unaffordable or a booster is already held), `PUT /api/fantasy/team/booster` (`{slot_index}` — requires an available booster + filled slot; set `booster_active`, decrement), and `DELETE /api/fantasy/team/booster` (un-place, refund availability); add schemas.
- [x] T035 [US5] Extend `backend/app/fantasy.py` + `backend/app/settlement.py`: apply +`BOOSTER_WIN_BONUS`×base to the boosted player's first game in the match on a win only, consume the booster regardless, skip the bonus if that slot also `has_racket`, and record `consumed_booster_slot_index` for reversal.
- [x] T036 [P] [US5] In `frontend/src/api/fantasy.ts` add `buyBooster()`, `placeBooster(slotIndex)`, `removeBooster()`.
- [x] T037 [US5] Create `frontend/src/components/fantasy/Shop/Shop.tsx` (+ css): shows the booster price and buys one (guarded by balance/held-booster); mount it on the fantasy page.
- [x] T038 [US5] In `frontend/src/components/fantasy/SlotCard/SlotCard.tsx` render a booster icon when `booster_active` and add a place-booster control (visuals via `/frontend-design`).
- [x] T039 [P] [US5] Add frontend tests for the Shop buy flow and the booster icon.

**Checkpoint**: shop + booster works and correctly does not stack with the racket.

---

## Phase 8: User Story 6 - Simple, short rules (Priority: P4)

**Goal**: The fantasy rules explain the economy briefly in plain Norwegian.

**Independent Test**: Open `/fantasy` — the rules state start balance, players cost money, sell 85%, +5M/−2M, Racket doubles, Booster +50% one-time; short and scannable.

- [x] T040 [US6] Rewrite `frontend/src/components/fantasy/FantasyRules/FantasyRules.tsx` with the short economy rules (100M start, players cost CompuBucks, sell for 85%, +5M win / −2M loss, Gyllen racket dobler, Booster +50% engangs).
- [x] T041 [P] [US6] Update `frontend/src/components/fantasy/FantasyRules/FantasyRules.test.tsx` to assert the new rule points.

**Checkpoint**: rules match the shipped economy.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T042 [P] Update the "Project status" section of `CLAUDE.md` with a short Fantasy CompuBucks Economy summary (stored balance, admin pricing, racket, booster, settlement).
- [x] T043 Run the full backend suite `cd backend && pytest` and the frontend `cd frontend && npm test && npm run build && npm run lint`; fix any failures.
- [x] T044 Run the `quickstart.md` end-to-end validation (`docker compose up --build`, then the six checklists) and confirm each Success Criterion.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1)** → **Foundational (P2, blocks everything)** → **US1..US6** → **Polish**.
- US1 (P1) and US2 (P1) are the MVP. US2's buy/sell depends only on foundational + US1 pricing (needs priced players to buy).
- US3 (settlement) depends on US2 (slots carry `price_paid`/`added_at`) and the pure-math base.
- US4 (racket) and US5 (booster) extend US3's pure math + settlement; do US3 first, then US4, then US5 (booster's no-stack rule references the racket).
- US6 (rules) is independent text; can be done any time after US2 but is most accurate last.

### Within each story

Tests first (must fail), then models/schemas → services (`fantasy.py`/`settlement.py`) → endpoints → frontend api → components → component tests.

### Parallel opportunities

- Foundational: T006 [P] alongside migration verification.
- Backend vs frontend within a story: the `[P]` api/type tasks (T011, T017, T030, T036) and test-writing tasks run parallel to backend impl on different files.
- Same-file tasks are NOT parallel: T002/T003 (models.py), T008/T015 (schemas.py), and all `routers/fantasy.py` edits (T016/T028/T034) are sequential.

---

## Parallel Example: User Story 1

```bash
# Write the failing backend test and the frontend api client together (different files):
Task: "T007 failing tests in backend/tests/test_admin_pricing.py"
Task: "T011 add price api calls in frontend/src/api/admin.ts"
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1 Setup → Phase 2 Foundational (schema + migration).
2. US1 (admin pricing) → US2 (buy/sell within budget).
3. **STOP & VALIDATE**: a user can start at 100M, buy priced players, and sell for 85%.

### Incremental delivery

US3 (earn/lose + floor + settlement) → US4 (racket) → US5 (booster shop) → US6 (rules) → Polish. Each phase is a demoable increment.

---

## Notes

- The one architectural risk is the settlement/floor interaction on admin re-record — covered by T022's idempotency test. Keep `applied_delta` = the *actual* post-floor effect so reversal is exact (research.md Decision 2).
- Money is integer CompuBucks; only the 85% sell-back rounds (floor).
- No new dependencies; frontend visuals for cards/shop/icons go through `/frontend-design` during T031/T037/T038.
