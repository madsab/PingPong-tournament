# Quickstart: Public Match & Player Views (F2–F4)

How to run and validate F2/F3/F4 end-to-end. See
[contracts/public-views.md](./contracts/public-views.md) for exact JSON shapes and
[data-model.md](./data-model.md) for the computation rules.

## Prerequisites

- Docker running (Postgres), or a local backend venv + frontend Node setup.
- Schema unchanged, but seed data must include some **scheduled** matches so the F3
  "to-play" split is visible — the current `seed.py` has only completed matches, so this
  feature updates it (add a new team or a couple of scheduled matches, then re-seed).

## Run everything

```bash
docker compose up --build
# Frontend  http://localhost:5173
# Backend   http://localhost:8000
```

Seed demo data (DB must be running):

```bash
cd backend && python -m app.seed
```

## Backend checks

```bash
cd backend
pytest tests/test_leaderboard.py     # pure §3.6 math (written first, TDD)
pytest tests/test_public_api.py      # contract tests for /leaderboard and /matches
pytest                               # full suite green before done
```

Spot-check the endpoints:

```bash
curl -s http://localhost:8000/api/leaderboard | jq
curl -s http://localhost:8000/api/matches | jq
```

Expected:
- `/api/leaderboard` → `entries` ordered by games won → win% → point-diff → name; ranks
  unique and 1-based.
- `/api/matches` → scheduled matches first (`result: null`, `games: []`), then completed
  matches with a `result` and games carrying player **names**.

## Frontend checks

```bash
cd frontend
npm test        # Vitest: LeaderboardSection, ScheduleSection, MatchDetail
npm run build   # type-check + production build
```

## Manual end-to-end validation

1. Open `http://localhost:5173/`. Scroll down past the team-ranking hero (F1).
2. **F2**: the **Individual leaderboard** lists every player ranked by games won, showing
   won / lost / win% / point-difference. → SC-001.
3. **F3**: the **Match schedule** shows every match exactly once, clearly split into
   to-play and played; played matches show a result (e.g. 2–1). → SC-002.
4. **F4**: open a played match's **detail** — both team names, the overall result (or
   "Draw"), and each game with the two players' names + score. Confirm a match where a
   smaller team repeated a player shows that player in more than one game. → SC-003.
5. **Live recompute**: in `/admin`, record or edit a result, then refresh `/` — the
   leaderboard and results update with no stale numbers. → SC-004.
6. **Responsive**: narrow the window to phone width — all three sections reflow with no
   horizontal page scroll. → SC-005.
7. **Empty states**: against an empty DB, each section shows a clear empty message, not an
   error or blank gap.
