# Quickstart: Team Ranking Hero (F1)

How to run and validate this feature end-to-end. Details live in
[data-model.md](./data-model.md) and [contracts/standings.md](./contracts/standings.md).

## Prerequisites

- Docker + Docker Compose (runs frontend, backend, Postgres together).
- Test runners added by this feature: `pytest` (backend), Vitest (frontend).

## Run everything

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8000
- Postgres: 5432 (pingpong/pingpong/pingpong)

## Seed sample data (until the admin feature exists)

```bash
# inside the backend container / venv
python -m app.seed
```

Inserts sample teams (with logos), matches, and games so the standings endpoint and
hero have real, ranked data to show.

## Validate the backend

```bash
cd backend
pytest                       # all tests
pytest tests/test_standings.py   # ranking math only (highest priority, §8)
```

Then check the endpoint directly:

```bash
curl -s http://localhost:8000/api/standings | jq
```

Expected: a `teams` array sorted by `rank` ascending, matching the shape in the
[standings contract](./contracts/standings.md).

## Validate the frontend

```bash
cd frontend
npm test                     # Vitest (StandingsHero, StandingsTable, section states)
npm run build                # tsc + production build
```

## Manual acceptance walk-through

Open http://localhost:5173 and confirm, against the spec's acceptance scenarios and
the SPECIFICATIONS §9 design ([design.md](./design.md)):

| Check | Ref |
|---|---|
| Top-two teams face off left/right with points in the middle | US1 / FR-001, FR-002 |
| Each leader shows name + logo (or initials placeholder if none) | FR-003, FR-011 |
| On load, the two leaders' logos slide in from opposite sides | US3 / FR-007 |
| Teams in the table below do **not** slide-in | FR-008 |
| With OS "reduce motion" on, leaders appear static, no slide/flare/embers | US3 / FR-009, §9.5 |
| All teams ranked 3rd+ appear in the table below, in rank order | US2 / FR-005, FR-006 |
| Hero + table order matches `/api/standings` order exactly | SC-002 |
| Resize to 375 / 768 / 1440 px — no breakage; leaders stack with a horizontal Rift on mobile | FR-013 / SC-005 / §9.6 |
| Empty DB → friendly empty state, not a broken hero | Edge case / FR-010 |
| Only one team → single leader + placeholder opponent | Edge case / FR-010 |
| **Look**: Ink black page, Ember-red left crest, Flame-orange right crest, white text | §9.2 |
| **The Rift**: glowing red→orange center seam holds the score; flares as crests arrive | §9.4 |
| **Champion Gold** appears only on the rank-1 team (crown + badge), nowhere else | §9.2, §9.4 |
| Text is Inter; scores use tabular figures (digits don't jitter) | §9.3 |

## Definition of done for F1

- Ranking math tests (match outcome + all §3.5 tiebreak levels) pass.
- `/api/standings` contract tests pass.
- Hero + table component tests pass; reduced-motion path covered.
- Design matches SPECIFICATIONS §9: dark arena palette, Inter, "The Rift", gold on #1 only.
- `npm run build` and `pytest` both green (constitution: never ship on red).
