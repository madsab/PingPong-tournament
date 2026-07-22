# Implementation Plan: Admin Page (F6–F13)

**Branch**: `002-admin-page` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-admin-page/spec.md`

## Summary

Build the password-protected admin area at `/admin` (SPECIFICATIONS §5, features
F6–F13) — the write side of the app that lets a tournament organiser enter and manage
the data the public site shows. This slice adds:

- **Auth (F6/F7)**: a single shared-password login that establishes a signed session
  cookie, plus logout. The password is verified against a hash held in backend config;
  every admin API call requires a valid session.
- **CRUD (F8–F10)**: create/edit/delete for teams, members, and matches, exposed as
  admin-only endpoints and driven by admin UI screens.
- **Generate round-robin (F11)**: one action that creates the missing team-vs-team
  matches without duplicating existing ones.
- **Record a result (F12/F13)**: set the member-vs-member pairing for each game
  (handling uneven rosters per §3.2), enter scores (validated per §3.3), and mark the
  match completed — after which the existing compute-on-read engine (F14) reflects it.

The existing data layer (Team, Member, Match, Game) and the standings engine are
**reused as-is**. The one new data change is a **member-to-game link** on `Game`
(`member_a_id` / `member_b_id`), needed so a game records *who played whom* (§3.2). No
new backend frameworks are added — auth uses Starlette's bundled session middleware and
Python's standard-library password hashing (constitution IV). The frontend adds an
`/admin` view using plain CSS Modules, matching the choice made in F1 (Shadcn/Tailwind
stay uninstalled — YAGNI).

## Technical Context

**Language/Version**: Python 3.14 (backend), TypeScript / React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, psycopg (v3) — backend. Auth reuses
Starlette `SessionMiddleware` (bundled) + stdlib `hashlib`/`hmac`; `itsdangerous` is
required by `SessionMiddleware` and is the only possible new backend dep. Frontend: Vite
+ React + CSS Modules — no new UI framework.

**Storage**: PostgreSQL 17 (Docker Compose, already wired). Adds two nullable FK columns
on `Game`; standings stay computed on read (SPECIFICATIONS §7).

**Testing**: Backend — pytest (against in-memory SQLite, per repo convention). Frontend —
Vitest + React Testing Library.

**Target Platform**: Web — responsive desktop + mobile (constitution V).

**Project Type**: Web application (existing `backend/` + `frontend/` split).

**Performance Goals**: Admin actions respond fast at tournament scale (a handful of
teams, dozens of matches). No special throughput needs (single organiser at a time).

**Constraints**: Password never stored in plain text or shipped to the frontend (§5.1).
Every admin action refused without a valid session (FR-005). Score validation rejects
negatives and ties (F13/§3.3). Uneven rosters → game count = larger team size (§3.2).
Responsive, no fixed dimensions (constitution V).

**Scale/Scope**: ~4–12 teams, dozens of matches, one organiser. One new backend admin
router + auth layer + a `Game` pairing column; one new `/admin` frontend area.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Test-First (NON-NEGOTIABLE) | ✅ PASS | Auth guard, each CRUD endpoint, round-robin generation, and result-recording (incl. score validation + uneven pairing) get failing tests first; admin UI gate/forms tested with Vitest before implementation. Test priorities in SPECIFICATIONS §8. |
| II. SOLID | ✅ PASS | Auth logic (hash verify + session) isolated in one module; a single `require_admin` dependency guards the admin router; round-robin generation is a pure function separate from HTTP; UI split into gate + per-entity manager components. |
| III. Simplicity / YAGNI | ✅ PASS | Signed session cookie via bundled Starlette middleware + stdlib hashing — no auth framework, no JWT, no user table. Single admin role, no permissions system, no audit log (§6). Frontend routing is a simple `/admin` path split, not a router library, since there are only two routes. |
| IV. Use What's Already There | ✅ PASS | Reuses FastAPI + SQLAlchemy + psycopg + Postgres + Vite/React/CSS Modules and the existing models + standings engine. Only possible new dep is `itsdangerous` (required by the session middleware already inside Starlette). No new UI framework. |
| V. Responsive design | ✅ PASS | Admin screens use flex/grid + relative units; forms and tables reflow to phone width with no horizontal page scroll (FR-017, SC-007). No fixed dimensions. |

No violations → Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-page/
├── plan.md              # This file
├── research.md          # Phase 0 output — auth, pairing, routing decisions
├── data-model.md        # Phase 1 output — Game pairing change + admin write rules
├── quickstart.md        # Phase 1 output — run + validate end-to-end
├── contracts/
│   └── admin.md         # Admin auth + CRUD + generate + record-result endpoints
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py              # existing — register admin router + SessionMiddleware
│   ├── config.py            # NEW — read ADMIN_PASSWORD_HASH + SESSION_SECRET from env
│   ├── auth.py              # NEW — verify password (stdlib), require_admin dependency
│   ├── models.py            # EDIT — add Game.member_a_id / member_b_id (nullable FK)
│   ├── schemas.py           # EDIT — add admin input/output Pydantic models
│   ├── schedule.py          # NEW — pure round-robin "missing pairings" function
│   ├── routers/
│   │   ├── public.py        # existing
│   │   └── admin.py         # NEW — login/logout, teams/members/matches CRUD,
│   │                        #        generate schedule, record result
│   └── seed.py              # EDIT — set member pairings on seeded games (optional)
└── tests/
    ├── test_auth.py             # login/logout, guard rejects without session
    ├── test_admin_crud.py       # teams/members/matches create/edit/delete + cascade
    ├── test_schedule.py         # round-robin creates only missing pairings, no dupes
    └── test_record_result.py    # uneven pairing, game count, score validation, recompute

frontend/
├── src/
│   ├── App.tsx              # EDIT — render AdminPage when path is /admin, else public
│   ├── api/
│   │   └── admin.ts         # NEW — typed admin API calls (credentials: 'include')
│   ├── components/
│   │   └── admin/
│   │       ├── AdminPage/        # gate: login form when logged out, dashboard when in
│   │       ├── LoginForm/        # password entry (F6) + logout control (F7)
│   │       ├── TeamsManager/     # teams + members CRUD (F8/F9)
│   │       ├── MatchesManager/   # matches CRUD + "generate round-robin" (F10/F11)
│   │       └── ResultForm/       # set pairings + enter scores + validation (F12/F13)
│   └── (co-located *.test.tsx next to each component)
```

**Structure Decision**: Web application — keep the existing `backend/` + `frontend/`
split. Backend gains a thin auth layer (`config.py`, `auth.py`), one admin router, a
pure `schedule.py` function, and two nullable columns on `Game`. Frontend gains an
`api/admin.ts` module and an `components/admin/` tree gated behind the login form,
reached via a simple `/admin` path check in `App.tsx`. Tests are co-located on the
frontend and under `backend/tests/`.

## Complexity Tracking

No constitution violations — section intentionally empty.
