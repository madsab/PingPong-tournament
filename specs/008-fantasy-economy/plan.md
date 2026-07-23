# Implementation Plan: Fantasy CompuBucks Economy

**Branch**: `008-fantasy-economy` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-fantasy-economy/spec.md`

## Summary

Turn the free fantasy game (007) into a paid economy. Players cost money (admin-set price), users start with 100,000,000 CompuBucks, and real submatch results move a **banked** balance up and down (+5M win / −2M loss), floored at 0. Two power-ups amplify a player: the reassignable **Golden Racket** (doubles win *and* loss) and a shop-bought one-time **Booster** (+50% on the player's next winning game, no stacking with the racket).

**Technical approach**: The balance stops being computed-on-read (the 007 model) and becomes a **stored, banked integer** on `FantasyUser`. Cash actions (buy, sell, buy-booster) mutate the balance immediately. Game earnings are **realized once, when an admin records a match result** — a `settle_match()` step reads each affected user's current slot/racket/booster state, computes the payout with the pure math in a rewritten `app/fantasy.py`, applies the floor, and records a per-(user, match) settlement row so re-recording a result re-settles idempotently instead of double-paying. Existing endpoints are reused where they fit (assigning a slot becomes "buy", deleting becomes "sell"); new endpoints add racket, booster placement, the shop, and admin pricing. Frontend adds price/racket/booster to the slot cards, a small shop, and updated Norwegian rules; visuals follow `/frontend-design`.

## Technical Context

**Language/Version**: Python 3.14 (backend), TypeScript + React (frontend, Vite)

**Primary Dependencies**: FastAPI, SQLAlchemy 2.x, Alembic, psycopg v3 (backend); React 19, CSS Modules (frontend). No new libraries.

**Storage**: PostgreSQL 17 in prod/dev (Alembic-managed); in-memory SQLite for tests (tables via `create_all` in `conftest.py`).

**Testing**: pytest (backend, in-memory SQLite), Vitest + React Testing Library (frontend). `tests/test_migrations.py` runs `alembic check`.

**Target Platform**: Dockerised web app — SPA frontend, FastAPI backend, Postgres.

**Project Type**: Web application (existing `backend/` + `frontend/`).

**Performance Goals**: Small internal app; no special targets. `settle_match` fan-out is over the handful of fantasy users only, at admin record time (not a hot path).

**Constraints**: Balance can never be negative (hard floor, applied at the moment of each event). Responsive UI (constitution V). Backend validates everything.

**Scale/Scope**: Tens of users, tens of matches. Correctness and simplicity over throughput.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Test-First (NON-NEGOTIABLE) | PASS | Pure economy math (`app/fantasy.py`) and settlement get unit tests first; new/changed endpoints get API tests; frontend components get Vitest tests. Mirrors existing `test_fantasy_scoring.py` / `test_fantasy_api.py`. |
| II. SOLID | PASS | Pure scoring stays in `app/fantasy.py` (single responsibility, no DB). Orchestration (reverse/apply/store) lives in a thin service used by the admin `record_result` and the fantasy router. |
| III. Simplicity First (YAGNI) | PASS w/ 1 justified deviation | One deliberate deviation: a banked balance + `FantasySettlement` ledger instead of the app's compute-on-read pattern. Justified in Complexity Tracking (a spend-and-earn economy with a hard floor is path-dependent and must be banked). No event-sourcing, no temporal racket/booster history — power-ups read current state at settlement time. |
| IV. Use What's Already There | PASS | Reuses FastAPI, SQLAlchemy, Alembic, CSS Modules, the existing session-cookie fantasy identity, the existing `Match.completed_at`, and existing endpoint shapes. No new deps. |
| V. Responsive design | PASS | Slot cards, shop, and admin price inputs use the existing responsive CSS-module patterns (no fixed sizes); `/frontend-design` guides the visuals. |

**Result**: PASS (one documented, justified deviation — see Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/008-fantasy-economy/
├── plan.md              # This file
├── research.md          # Phase 0 — the banked-balance decision + others
├── data-model.md        # Phase 1 — schema deltas + constants
├── quickstart.md        # Phase 1 — how to run & validate end-to-end
├── contracts/
│   ├── economy-api.md    # fantasy buy/sell/racket/booster/shop endpoints
│   └── admin-pricing.md  # admin player-price + booster-price endpoints
└── checklists/
    └── requirements.md   # from /speckit-specify
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models.py              # + Member.price; FantasyUser.balance, boosters_available;
│   │                          #   FantasySlot.price_paid/has_racket/booster_active;
│   │                          #   new FantasySettlement, Setting
│   ├── fantasy.py             # REWRITE: pure economy math (per-match delta, floor helper)
│   ├── settlement.py          # NEW: settle_match()/reverse — DB orchestration (thin)
│   ├── schemas.py             # + price fields, balance, racket/booster/shop request+response
│   ├── routers/
│   │   ├── fantasy.py         # buy/sell (reuse slot endpoints) + racket + booster + shop
│   │   ├── admin.py           # set member price; get/set booster price; call settle_match
│   │   └── public.py          # /api/members now includes price
│   └── seed.py                # prices on demo members; demo manager with a bought squad
├── alembic/versions/
│   └── 20260723_0003_*.py     # NEW migration: all schema deltas (idempotent); reset legacy users
└── tests/
    ├── test_fantasy_scoring.py  # rewrite for the new economy math
    ├── test_fantasy_api.py      # buy/sell/afford/floor/racket/booster/shop
    ├── test_admin_pricing.py    # NEW: price + booster-price admin endpoints
    └── test_migrations.py       # unchanged (alembic check)

frontend/
├── src/
│   ├── api/
│   │   ├── fantasy.ts         # balance, prices, buyBooster/placeBooster/setRacket
│   │   └── admin.ts           # updateMemberPrice, setBoosterPrice
│   └── components/
│       ├── fantasy/
│       │   ├── SlotCard/       # + price, racket icon (bottom-right), booster icon
│       │   ├── CompuBucks/     # shows balance
│       │   ├── Shop/           # NEW: buy booster
│       │   ├── FantasyTeam/    # wire buy/sell + racket + booster controls
│       │   └── FantasyRules/   # updated short Norwegian economy rules
│       └── admin/
│           └── TeamsManager/   # per-member price input + booster-price setting
```

**Structure Decision**: Existing web-app layout. Backend keeps the "pure math module + thin DB layer + routers" split already used by `standings.py`/`leaderboard.py`/`fantasy.py`. The only structural addition is `app/settlement.py` for the DB orchestration that the pure math can't (and shouldn't) do.

## Complexity Tracking

> One deliberate deviation from the app's compute-on-read convention.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Stored/banked balance + `FantasySettlement` ledger (instead of compute-on-read like `standings.py`) | The economy is a **spend-and-earn** system with a **hard 0 floor**. The floor is path-dependent (a loss that hits 0 forfeits the remainder; later wins climb from 0), and selling must *keep* already-earned money. A running banked balance with per-match settlements is the minimal way to honor "banked earnings" + "never below 0" + affordability checks. | **Compute-on-read from current roster** (the 007 model): would erase a sold player's banked earnings, can't apply the floor at the moment of each loss, and would let admin result edits silently re-shift totals. **Full event-sourced timeline recompute**: correct but far heavier than a fun app warrants; rejected as over-engineering (YAGNI). The chosen middle keeps power-ups reading current state at settlement time (no temporal history) and localizes all state-mutation to `settle_match` + its idempotent settlement rows. |
