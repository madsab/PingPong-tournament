# Implementation Plan: Team Ranking Hero (F1)

**Branch**: `001-standings-hero` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-standings-hero/spec.md`

## Summary

Show the tournament's team standings on the public page (`/`) as a "versus" hero: the
top-two teams face off from opposite sides with their points in the middle and a
slide-in "fight" animation on load, and every remaining team is listed in a ranked
table underneath.

Because F1 is the **first** feature and the repo has no data layer yet, this slice
also builds the minimum backend needed to *produce* standings: database models for
teams / matches / games, the pure-Python ranking computation from SPECIFICATIONS
§3.4–§3.5, a public read-only endpoint, and a small seed script so the page has real
data (admin data entry is a later feature, F6–F13). The ranking math is the highest
test-priority per constitution §I and SPECIFICATIONS §8.

The visual design follows **SPECIFICATIONS §9** — the "dark arena" look (Ink/Char
black, Ember red vs Flame orange, white text, Champion Gold for rank 1 only), Inter
typography, and the signature **"The Rift"** central collision seam where the two
leaders' logos slide in and the seam flares. §9 is the single source of truth for
colors/type; this plan does not restate the values, it wires them into the UI as
design tokens. See [design.md](./design.md) for how §9 maps onto the F1 components.

## Technical Context

**Language/Version**: Python 3.14 (backend), TypeScript ~6 / React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, psycopg (v3) — backend; Vite +
React + CSS Modules — frontend. No new runtime frameworks added (constitution IV).

**Storage**: PostgreSQL 17 (via Docker Compose, already wired). Standings are
computed on read, never stored (SPECIFICATIONS §7).

**Testing**: Backend — pytest (to be added). Frontend — Vitest + React Testing
Library (to be added). Both are the standard, boring choices for this stack.

**Target Platform**: Web — responsive desktop + mobile (constitution V).

**Project Type**: Web application (existing `backend/` + `frontend/` split).

**Performance Goals**: Standings endpoint responds fast at tournament scale (a
handful of teams, dozens of matches). Hero slide-in completes within 1.5s (SC-004).

**Constraints**: Read-only public section, no login (F5). Must respect
`prefers-reduced-motion` (FR-009). No fixed pixel width/height unless required
(constitution V). Visual design fixed by SPECIFICATIONS §9 (dark arena palette, Inter
type, "The Rift" signature).

**Scale/Scope**: ~4–12 teams, dozens of matches. One public page section + the
backend needed to feed it.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Test-First (NON-NEGOTIABLE) | ✅ PASS | Ranking math and endpoint get failing tests first; hero/table components tested with Vitest before implementation. |
| II. SOLID | ✅ PASS | Ranking logic lives in pure functions separate from DB and HTTP; UI split into `StandingsHero` + `StandingsTable` + data hook. |
| III. Simplicity / YAGNI | ✅ PASS | The Rift, slide-in, flare and ambient embers are all plain CSS Modules (gradients, `transform` + `transition`, keyframes) — no animation library. Tailwind/Shadcn/Magic UI stay uninstalled. Only the teams/matches/games needed for standings are modeled now. |
| IV. Use What's Already There | ✅ PASS | Reuses FastAPI + SQLAlchemy + psycopg + Postgres + Vite/React/CSS Modules. Inter is the only asset added (self-hosted font), no new frameworks. |
| V. Responsive design | ✅ PASS | Hero uses flex/grid with relative units; leaders stack vertically on mobile with a horizontal Rift and score between them (§9.6). No fixed dimensions. |

No violations → Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-standings-hero/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── design.md            # Phase 1 output — how SPECIFICATIONS §9 maps to F1 UI
├── contracts/
│   └── standings.md     # Public GET /api/standings contract
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py              # existing — register standings router
│   ├── db.py                # NEW — SQLAlchemy engine + session
│   ├── models.py            # NEW — Team, Member, Match, Game
│   ├── standings.py         # NEW — pure ranking functions (§3.4–§3.5)
│   ├── schemas.py           # NEW — Pydantic response shapes
│   ├── routers/
│   │   └── public.py        # NEW — GET /api/standings
│   └── seed.py              # NEW — sample teams/matches for dev/demo
└── tests/
    ├── test_standings.py    # ranking math (highest priority, §8)
    └── test_public_api.py   # endpoint contract

frontend/
├── index.html               # existing — self-host Inter (preload)
├── src/
│   ├── App.tsx              # existing — render StandingsSection
│   ├── theme/
│   │   └── tokens.css       # NEW — §9 palette + type as CSS custom properties
│   ├── index.css            # existing — set Ink bg, Inter, white text globally
│   ├── api/
│   │   └── standings.ts     # fetch + types
│   ├── components/
│   │   ├── StandingsSection/    # section wrapper (hero + table + states)
│   │   ├── StandingsHero/       # two leaders + Rift/score + slide-in + flare
│   │   ├── Rift/                # the signature center seam (gradient + flare + embers)
│   │   ├── TeamCrest/           # logo/placeholder + side glow (Ember left / Flame right)
│   │   └── StandingsTable/      # rank 3+ table (Char rows, hairlines)
│   └── test/
│       └── setup.ts             # Vitest + Testing Library setup
└── (StandingsHero.test.tsx etc. co-located next to components)
```

**Structure Decision**: Web application — keep the existing `backend/` and
`frontend/` split. Backend gains a thin data + standings layer. Frontend gains an
`api/` module, a `theme/tokens.css` that encodes SPECIFICATIONS §9 as CSS custom
properties (so no hex values are hard-coded in components), and the F1 components —
including a dedicated `Rift` (the §9 signature) and `TeamCrest` (logo + side glow).
Tests are co-located on the frontend (per CLAUDE.md) and under `backend/tests/`.

## Complexity Tracking

No constitution violations — section intentionally empty.
