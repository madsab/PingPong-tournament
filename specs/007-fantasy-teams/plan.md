# Implementation Plan: Fantasy Ping Pong Teams

**Branch**: `007-fantasy-teams` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-fantasy-teams/spec.md`

## Summary

Add a public `/fantasy` page where anyone registers with a name + required fun-fact (no
password, name is the identity), is remembered across visits, builds a 4-slot fantasy team
from real Members shown as ReactFlow boxes, and earns **CompuBucks** computed on read from
those Members' real game results. All validation happens on the backend. The feature adds
two new tables and a router; it reuses the existing session cookie, the on-read compute
pattern (`standings.py`/`leaderboard.py`), and the already-installed React Flow.

## Technical Context

**Language/Version**: Python 3.14 (backend), TypeScript + React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, psycopg v3, Starlette `SessionMiddleware`, Pydantic (backend); Vite, React, `@xyflow/react` (frontend). No new dependencies.

**Storage**: PostgreSQL 17 (prod/dev via Docker); in-memory SQLite for tests.

**Testing**: pytest (backend, against SQLite), Vitest + React Testing Library (frontend).

**Target Platform**: Web app (FastAPI service + Vite SPA), responsive desktop + mobile.

**Project Type**: Web application (existing `backend/` + `frontend/`).

**Performance Goals**: Standard web app; CompuBucks computed on read over the existing games (small tournament data), no new hot paths.

**Constraints**: All input validated server-side; identity remembered on-device via the existing signed session cookie (Starlette default 14-day `max_age`); responsive layout, no fixed pixel sizes for the slot canvas.

**Scale/Scope**: Internal fun feature — tens of fantasy users, four slots each, a handful of real teams/members. One new router, two new tables, one pure math module, one new frontend section.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance |
|-----------|-----------|
| **I. Test-First (NON-NEGOTIABLE)** | Tasks are ordered test-first: pure `app/fantasy.py` CompuBucks math and every endpoint get failing tests before code; frontend components get Vitest tests alongside. |
| **II. SOLID** | CompuBucks scoring is a pure function module (single responsibility), separate from the router (I/O) and models (storage) — mirrors `standings.py`. |
| **III. Simplicity First (YAGNI)** | No budget/salary system, no positions, no password/verification. Scoring is a simple documented rule. Empty slots = no row. Reuses the existing cookie instead of a new auth system. |
| **IV. Use What's Already There** | Reuses `SessionMiddleware`, the on-read compute pattern, Pydantic validation, and the already-installed `@xyflow/react`. No new libraries. |
| **V. Responsive design** | Slot canvas uses a responsive grid/flex layout with relative units; verified on mobile + desktop. |

**Result**: PASS — no violations, Complexity Tracking not needed.

**Schema note**: the two new tables are *added* by `Base.metadata.create_all` on startup; no existing table is altered, so **no database reset is required** for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/007-fantasy-teams/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── fantasy-api.md   # Phase 1 output — endpoint contracts
└── tasks.md             # /speckit-tasks output (not this command)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models.py            # + FantasyUser, FantasySlot (new tables)
│   ├── fantasy.py           # NEW — pure CompuBucks math (sibling of standings.py)
│   ├── schemas.py           # + fantasy request/response shapes
│   ├── routers/
│   │   ├── fantasy.py       # NEW — register/login/me/logout, team read, slot put/delete
│   │   └── public.py        # + GET /api/members (public pick-list)
│   └── main.py              # include the fantasy router
└── tests/
    ├── test_fantasy_scoring.py   # NEW — pure CompuBucks math
    ├── test_fantasy_api.py       # NEW — auth, validation, slot CRUD, compubucks endpoint
    └── test_public_api.py        # + /api/members cases

frontend/
├── src/
│   ├── api/
│   │   └── fantasy.ts        # NEW — typed client, credentials: 'include'
│   ├── components/fantasy/
│   │   ├── FantasyPage/      # gate: shows login or team based on /me
│   │   ├── FantasyLogin/     # name login; falls back to name+fun-fact register
│   │   ├── FantasyTeam/      # React Flow canvas of 4 SlotNodes + CompuBucks total
│   │   ├── SlotNode/         # custom React Flow node = one slot (filled/empty)
│   │   └── MemberPicker/     # choose/replace/clear a slot's player
│   └── App.tsx              # + '/fantasy' path branch
```

**Structure Decision**: Existing web-app layout (`backend/` + `frontend/`). New code slots into the established folders and naming: a pure math module beside `standings.py`/`leaderboard.py`, a new router beside `public.py`/`admin.py`, and a new `components/fantasy/` section beside `components/admin/`.

## Complexity Tracking

No constitution violations — section intentionally empty.
