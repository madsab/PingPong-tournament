# Implementation Plan: Public Match & Player Views (F2–F4)

**Branch**: `003-public-views` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-public-views/spec.md`

## Summary

Add the three remaining read-only sections of the public page (`/`) defined in
SPECIFICATIONS §4, building on the shipped team-ranking hero (F1):

- **F2 — Individual leaderboard** (§3.6): rank every player across all games in
  completed matches by games won → win % → point-difference → name.
- **F3 — Match schedule** (§4): every match in one view, split into **played** and
  **to-play**, with a result on the played ones.
- **F4 — Match detail** (§4): per match, the two teams, the match result (§3.4), and
  every game with the two players' **names** and the game score.

Everything is **computed on read** from data the admin already enters (F14, §7) — no
stored/derived values, no live updates. The approach mirrors F1 exactly: one pure,
test-driven math module for the leaderboard (a sibling of `app/standings.py`), new
**public** read endpoints in `app/routers/public.py`, and new public page sections that
reuse the F1 load-state + table patterns. **No schema change** — the existing
`Team/Member/Match/Game` model already carries everything (games record who played via
`member_a_id`/`member_b_id`). No new dependencies (constitution IV).

## Technical Context

**Language/Version**: Python 3.14 (backend), TypeScript / React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, psycopg (v3) — backend. Vite + React
+ CSS Modules — frontend. No new dependencies.

**Storage**: PostgreSQL 17 (Docker Compose, already wired). Read-only for this feature;
leaderboard/results computed on read (§7). No migration.

**Testing**: Backend — pytest against in-memory SQLite (repo convention). Frontend —
Vitest + React Testing Library.

**Target Platform**: Web — responsive desktop + mobile (constitution V).

**Project Type**: Web application (existing `backend/` + `frontend/` split).

**Performance Goals**: Tournament scale — a handful of teams, dozens of matches. Compute
on read is fast enough (§7); no caching needed.

**Constraints**: Read-only, no login, nothing hidden (§4, F5). Leaderboard counts only
completed matches and skips games whose player link is NULL (§3.1). Match result derived
per §3.4. Responsive, no fixed dimensions (constitution V). Gold reserved for rank-1 only
(§9.2).

**Scale/Scope**: ~4–12 teams, dozens of matches. One new pure backend module
(`leaderboard.py`), two new public GET endpoints, three new frontend sections.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Test-First (NON-NEGOTIABLE) | ✅ PASS | `compute_leaderboard` gets pure unit tests first (mirroring `test_standings.py`), covering ordering, all tiebreaks, NULL-link skip, repeated-player counting. New public endpoints get contract tests in `test_public_api.py`. Frontend sections tested with Vitest before implementation. |
| II. SOLID | ✅ PASS | Leaderboard math isolated in one pure module, separate from HTTP; match-result derivation **reuses** `decide_match()` from `standings.py` rather than re-deriving it; each frontend section is one component with one responsibility. |
| III. Simplicity / YAGNI | ✅ PASS | No new endpoints beyond the two needed; F3 and F4 read the **same** `/api/matches` payload (schedule = list view, detail = expanded view) — no separate detail endpoint. No pagination/search/caching. No schema change. |
| IV. Use What's Already There | ✅ PASS | Reuses FastAPI + SQLAlchemy + Postgres + Vite/React/CSS Modules, the existing models, `decide_match()`, the F1 `StandingsSection` load-state pattern and `StandingsTable` layout, and the `tokens.css` design system. No new dependency. |
| V. Responsive design | ✅ PASS | New sections use flex/grid + relative units; leaderboard/schedule tables reflow to phone width with no horizontal page scroll (SC-005). No fixed dimensions. |

No violations → Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-public-views/
├── plan.md              # This file
├── research.md          # Phase 0 output — leaderboard math + endpoint-shape decisions
├── data-model.md        # Phase 1 output — computed LeaderboardEntry + read shapes
├── quickstart.md        # Phase 1 output — run + validate end-to-end
├── contracts/
│   └── public-views.md  # GET /api/leaderboard + GET /api/matches (public, read-only)
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── leaderboard.py       # NEW — pure compute_leaderboard(members, matches) (§3.6)
│   ├── standings.py         # existing — reuse decide_match() for match results
│   ├── schemas.py           # EDIT — add LeaderboardEntryOut/LeaderboardResponse;
│   │                        #        add player names to the public match/game shapes
│   ├── models.py            # unchanged (no schema change)
│   ├── routers/
│   │   └── public.py        # EDIT — add GET /api/leaderboard and GET /api/matches
│   └── seed.py              # EDIT — add a few scheduled matches so F3 "to-play" shows
└── tests/
    ├── test_leaderboard.py  # NEW — pure math: ordering, tiebreaks, NULL skip, repeats
    └── test_public_api.py   # EDIT — contract tests for /leaderboard and /matches

frontend/
├── src/
│   ├── App.tsx              # EDIT — render the new sections after StandingsSection on /
│   ├── api/
│   │   └── public.ts        # NEW — fetchLeaderboard(), fetchMatches() (no credentials)
│   │                        #   (or extend the existing standings.ts client)
│   ├── components/
│   │   ├── LeaderboardSection/   # NEW — F2 section (load-state + table)
│   │   ├── ScheduleSection/      # NEW — F3 played/to-play split
│   │   └── MatchDetail/          # NEW — F4 per-match teams + result + games
│   └── (co-located *.test.tsx next to each component)
```

**Structure Decision**: Web application — keep the existing `backend/` + `frontend/`
split. Backend gains **one** pure module (`leaderboard.py`) and **two** public GET
endpoints in the existing `public.py`; F3 and F4 share the single `/api/matches` payload.
Frontend gains a public API client and three sections that reuse the F1 patterns, mounted
after `StandingsSection` in the §4 order. Tests co-located on the frontend and under
`backend/tests/`.

## Complexity Tracking

No constitution violations — section intentionally empty.
