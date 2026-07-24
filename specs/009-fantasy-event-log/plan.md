# Implementation Plan: Fantasy Event Log

**Branch**: `009-fantasy-event-log` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-fantasy-event-log/spec.md`

## Summary

Give each fantasy manager a personal, newest-first log of the four things that move their CompuBucks — **purchase**, **sale**, **win**, **loss** — each showing the player, a signed amount, and when it happened; plus a friendly empty state (US1). When selling, the confirm modal must state the exact refund before committing (US2).

**Technical approach**: Introduce a small **append-only `fantasy_events` table** (banked, written at the moment each event happens — the same "store it, don't recompute" stance feature 008 took for the balance). Purchases and sales are recorded nowhere today, so they cannot be derived after the fact — an event must be written when the buy/sell endpoint runs. Win/loss events are written during match settlement, **one event per game a picked player played**, reflecting the actual racket/booster amount, and are rewritten idempotently when an admin re-records a result (no double-count). A new `GET /api/fantasy/events` serves the manager's log; a new `FantasyLog` component renders it on `/fantasy`. US2 is a small frontend change: the sell confirm modal shows the refund (reusing `refundOf`), and the amount matches the sale event the backend writes.

## Technical Context

**Language/Version**: Python 3.14 / FastAPI (backend) + TypeScript 5 / React 19 (frontend).

**Primary Dependencies**: SQLAlchemy, Alembic, FastAPI, `psycopg` (backend); React, CSS Modules (frontend). No new dependency.

**Storage**: PostgreSQL. **One new table** `fantasy_events` via Alembic migration `0004`. No change to existing tables.

**Testing**: `pytest` (backend, in-memory SQLite via `conftest.py`); Vitest + React Testing Library (frontend). `tests/test_migrations.py` runs `alembic check`, so the new model MUST ship with migration `0004`.

**Target Platform**: Web (mobile + desktop, incl. iOS Safari — Bearer-token auth already handles this).

**Project Type**: Web application (backend + frontend); this feature touches both.

**Performance Goals**: Log opens with the page load; a manager can find the most recent balance change within ~5 seconds (SC-001). Ordering newest-first via an index on `(user_id, created_at)`.

**Constraints**: Per-manager, read-only. No double-count on re-record (FR-009). Displayed amount = actual applied amount incl. power-ups (FR-004, SC-004). Responsive (constitution §V).

**Scale/Scope**: Small hobby app — dozens of managers, a handful of events each. An append-only table is comfortably within scale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First (NON-NEGOTIABLE) | PASS | Pure per-game event math, settlement idempotency, buy/sell event writes, the endpoint, and the `FantasyLog` component all get failing tests first. |
| II. SOLID | PASS | Per-game amounts are a pure function in `app/fantasy.py` (one source of truth, reused by the existing net-delta path); settlement/router just persist rows; endpoint and component are thin. |
| III. Simplicity First (YAGNI) | PASS | One table. Denormalized `member_name` + a nullable `match_id` for dedup — no extra join tables, no per-`Game` FK. Compute-on-read rejected only because purchases/sales are unrecorded (see research). |
| IV. Use What's Already There | PASS | SQLAlchemy model + Alembic (mirrors `FantasySettlement`/migration `0003`), FastAPI router, React + CSS Modules. No new tech. |
| V. Responsive design | PASS | The log is a simple responsive list (no fixed sizes). |

**Result**: No violations. The move to *stored* events (vs compute-on-read) is an intentional, spec-driven choice consistent with feature 008's banked balance — documented in research, not a violation. Complexity Tracking omitted.

## Project Structure

### Documentation (this feature)

```text
specs/009-fantasy-event-log/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (the fantasy_events entity)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── events-api.md    # GET /api/fantasy/events + FantasyEventOut shape
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models.py                     # + FantasyEvent model
│   ├── fantasy.py                    # + slot_game_events() pure per-game breakdown; net delta re-expressed via it
│   ├── settlement.py                 # write per-game win/loss events; delete+rewrite for idempotency
│   ├── events.py                     # NEW: small helpers to record purchase/sale/win/loss events
│   ├── schemas.py                    # + FantasyEventOut
│   └── routers/
│       ├── fantasy.py                # + GET /api/fantasy/events; write purchase/sale events in assign_slot/clear_slot
│       └── admin.py                  # unchanged (record_result already calls settle_match)
├── alembic/versions/
│   └── 20260724_0004_fantasy_events.py   # NEW migration (idempotent, like 0001-0003)
└── tests/
    ├── test_fantasy_events.py        # NEW: per-game math, buy/sell/settlement writes, endpoint, idempotency
    └── (existing economy tests stay green)

frontend/src/
├── api/fantasy.ts                    # + FantasyEvent type + fetchEvents()
├── components/fantasy/
│   ├── FantasyLog/                   # NEW: the event log list + empty state
│   │   ├── FantasyLog.tsx
│   │   ├── FantasyLog.module.css
│   │   └── FantasyLog.test.tsx
│   ├── FantasyPage/FantasyPage.tsx   # mount FantasyLog
│   └── FantasyTeam/FantasyTeam.tsx   # sell modal shows refund (US2); refresh log after buy/sell/save
```

**Structure Decision**: Web app touching both tiers. The backend follows the established fantasy pattern exactly — a pure-math module (`app/fantasy.py`, like `standings.py`), a thin persistence layer (`settlement.py`/new `events.py`), an Alembic migration mirroring `FantasySettlement` (`0003`), and a token-guarded read endpoint. The frontend mirrors the existing section components (typed client in `api/fantasy.ts`, a co-located component with a load/empty state and `tokens.css`).

## Complexity Tracking

No constitution violations — section intentionally empty.
