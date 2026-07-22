# Implementation Plan: Admin Match-Card Scores & Pre-Filled Edit Form

**Branch**: `004-admin-match-scores` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-admin-match-scores/spec.md`

## Summary

Two small changes to the existing admin matches list, both **frontend-only** and both driven by data the admin API already returns (`Match.games`):

1. **Card score** — each completed match's card shows the match result as games won by each team (e.g. "2 – 1"). Matches with no recorded games show no score.
2. **Pre-filled edit form** — opening the result form for a match that already has games starts with the previously saved scores and player pairings as the default input values, instead of blank fields.

No backend, model, or endpoint changes are needed — `GET /api/admin/matches` already includes each game's `team_a_score`, `team_b_score`, `member_a_id`, and `member_b_id`. The work is confined to two React components (`MatchesManager`, `ResultForm`), their CSS Modules, and their co-located tests.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend); no backend changes.

**Primary Dependencies**: Vite + React, CSS Modules. No new dependencies.

**Storage**: N/A for this feature — reads existing `Match.games` already returned by the admin API.

**Testing**: Vitest + React Testing Library (co-located `*.test.tsx`), per project convention.

**Target Platform**: Web (desktop + mobile viewports).

**Project Type**: Web application (existing `frontend/` + `backend/`); only `frontend/` is touched.

**Performance Goals**: N/A — the games-won count is a trivial in-memory reduction over an already-loaded list.

**Constraints**: Responsive (no fixed pixel sizes that break small screens, constitution Principle V); no new frameworks (Principle IV).

**Scale/Scope**: 2 components, 2 CSS modules, 2 test files. No data migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Test-First (NON-NEGOTIABLE)**: PASS — both changes are behavioural and get failing tests first (card renders games-won score; form pre-fills from `match.games`) before implementation. Existing `MatchesManager.test.tsx` and `ResultForm.test.tsx` are extended.
- **II. SOLID Design**: PASS — the games-won computation is a small pure helper (single responsibility); the form's initial-value logic is a focused change to one `useState` initializer with a clear branch (has-games vs no-games).
- **III. Simplicity First (YAGNI)**: PASS — no new abstraction, no config. Games-won is derived inline/with one small helper; the form reuses the existing `Row` model and render path.
- **IV. Use What's Already There**: PASS — reuses React, CSS Modules, the existing `Match`/`Game` types, the existing `recordResult` save path and its validation. No new libraries.
- **V. Responsive design**: PASS — the score is text placed in the existing responsive card layout using design tokens; no fixed dimensions.

No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-match-scores/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI contract)
│   └── admin-matches-ui.md
└── checklists/
    └── requirements.md  # from /speckit-specify
```

### Source Code (repository root)

```text
frontend/src/
├── api/
│   └── admin.ts                              # (unchanged) Match/Game types + recordResult
└── components/admin/
    ├── MatchesManager/
    │   ├── MatchesManager.tsx                # CHANGE: render games-won score on completed cards
    │   ├── MatchesManager.module.css         # CHANGE: style the card score
    │   └── MatchesManager.test.tsx           # CHANGE: tests for score display / no-score
    └── ResultForm/
        ├── ResultForm.tsx                    # CHANGE: pre-fill rows from match.games
        ├── ResultForm.module.css             # (likely unchanged)
        └── ResultForm.test.tsx               # CHANGE: tests for pre-filled defaults

backend/                                       # NO CHANGES
```

**Structure Decision**: Existing web-app layout. All edits live under `frontend/src/components/admin/`. The backend, the admin API, and the data model are untouched — the feature only reads fields already present on `Match.games`.

## Complexity Tracking

No constitution violations — section intentionally empty.
