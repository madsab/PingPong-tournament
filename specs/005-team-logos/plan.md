# Implementation Plan: Team Logos

**Branch**: `005-team-logos` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-team-logos/spec.md`

## Summary

Let the admin attach an optional logo (an image URL) to each team, and show that
logo next to the team's name everywhere on the public page — the standings hero
circles, the standings table, the leaderboard Team column, the schedule match
cards, and the match-detail headers — never on admin tables. Most plumbing already
exists: `Team.logo_url` is a column, the admin team API already accepts it, public
standings already expose it, and the hero circle (`TeamCrest`) already renders it.
The real work is (1) a logo-URL input on the admin team form, (2) threading
`logo_url` through the leaderboard and match API responses (missing today), and
(3) a small shared "logo-before-name" component used across the public tables.

## Technical Context

**Language/Version**: Python 3.14 (backend), TypeScript + React 19 (frontend)
**Primary Dependencies**: FastAPI + SQLAlchemy + Pydantic (backend); Vite + React + CSS Modules, `@xyflow/react` for the schedule diagram (frontend). **No new dependencies.**
**Storage**: PostgreSQL 17 via SQLAlchemy. **No schema change** — `Team.logo_url` (`String(500)`, nullable) already exists.
**Testing**: `pytest` (backend, in-memory SQLite); `vitest` + React Testing Library (frontend)
**Target Platform**: Web app — public page `/` and admin `/admin`, desktop + mobile
**Project Type**: Web application (separate `backend/` and `frontend/`)
**Performance Goals**: N/A — logos are a display concern; standings/leaderboard/matches stay computed-on-read
**Constraints**: Responsive (constitution §V, SPECIFICATIONS §9.6); graceful fallback, no broken images (§9.7); gold reserved for rank-1 only (§9.2)
**Scale/Scope**: Small league (tens of teams/players); ~5 public render sites + 1 admin form field

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Test-First (NON-NEGOTIABLE)**: PASS — every change has a failing test first. Backend: leaderboard/matches responses include the team logo. Frontend: shared `TeamLogo` renders image vs. fallback; each public table shows the logo; admin tables/forms behave (form gains the input; admin tables show no logo image).
- **II. SOLID**: PASS — one small shared `TeamLogo` component owns the "logo-or-fallback" concern (single responsibility), reused by all public tables; the hero keeps its own `TeamCrest`. Backend logo threading mirrors the existing `team_name` resolution.
- **III. Simplicity First (YAGNI)**: PASS — URL string only (per admin's choice), no upload/storage/static-serving, reuse the existing column. No new abstraction beyond the one component that is used in 4+ places.
- **IV. Use What's Already There**: PASS — no new library. Reuses `Team.logo_url`, the existing admin `TeamUpdate.logo_url`, `TeamCrest`'s `initials()` idea, `tokens.css`, and the existing computed-on-read leaderboard/matches builders.
- **V. Responsive design**: PASS — logos sized with relative units / a small fixed square slot that doesn't break rows; hero uses existing `clamp()` sizing. Verified at mobile + desktop widths.

**Result**: PASS — no violations, Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-team-logos/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (public API shape deltas)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── leaderboard.py       # add team_logo_url to LeaderboardEntry + _team_logo() helper
│   ├── schemas.py           # add logo to LeaderboardEntryOut + PublicTeamRef (StandingsEntryOut already has it)
│   └── routers/
│       └── public.py        # map the new logo field in GET /api/leaderboard and GET /api/matches
└── tests/
    ├── test_leaderboard.py  # assert team_logo_url present + correct
    └── test_public_matches.py (or existing matches test) # assert team logo on match team refs

frontend/
└── src/
    ├── api/
    │   ├── public.ts        # add logo to LeaderboardEntry + PublicTeamRef types
    │   └── admin.ts         # createTeam/updateTeam carry logo_url
    └── components/
        ├── TeamLogo/        # NEW shared small logo-or-fallback (used by public tables)
        │   ├── TeamLogo.tsx
        │   ├── TeamLogo.module.css
        │   └── TeamLogo.test.tsx
        ├── StandingsTable/  # logo before team name (data already present)
        ├── LeaderboardSection/  # logo before team name in Team column
        ├── ScheduleSection/ # MatchNode card + MatchDetail: logo before each team name
        ├── TeamCrest/       # hero circle — already renders logo; no change expected
        └── admin/TeamsManager/  # add a logo-URL input to create + edit; tables stay logo-free
```

**Structure Decision**: Existing web-app layout (`backend/` FastAPI + `frontend/`
React). No new top-level directories. One new frontend component directory
(`TeamLogo/`) for the reused table treatment; everything else edits existing files.

## Complexity Tracking

No constitution violations — section intentionally empty.
