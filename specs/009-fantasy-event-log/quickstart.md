# Quickstart / Validation: Fantasy Event Log

Touches backend (new table + endpoint + event writes) and frontend (log UI + sell modal).

## Prerequisites

- Backend: `cd backend`, venv active, `pip install -r requirements.txt`.
- Fresh/existing DB migrates forward: `alembic upgrade head` (applies `0004`).
- Full stack for the manual pass: `docker compose up --build` (does `alembic upgrade head` on startup). Seed: `docker compose exec backend python -m app.seed`.

## Automated tests

```bash
# Backend
cd backend
pytest tests/test_fantasy_events.py      # per-game math, buy/sell/settlement writes, endpoint, idempotency
pytest tests/test_migrations.py          # alembic check — model 0004 matches migration
pytest                                    # whole suite stays green (economy unchanged)

# Frontend
cd frontend
npx vitest run src/components/fantasy/FantasyLog   # log rendering + empty state
npx vitest run src/components/fantasy/FantasyTeam   # sell modal shows the refund
npm test                                            # whole suite
```

Expected coverage (all must pass):

- **Pure `slot_game_events`**: one event per played game; racket doubles each; booster adds +50% of base win to the first win only and not with the racket; `slot_match_delta` still equals the summed amounts.
- **Buy/sell writes**: buying into an empty slot writes one `purchase` (−price); a swap writes a `sale` (+refund) + a `purchase`; selling writes one `sale` (+refund).
- **Settlement writes**: recording a result writes one win/loss event per game for each holder; **re-recording** the same match leaves exactly one set (no duplicates) and matches the balance change.
- **Endpoint**: `GET /api/fantasy/events` returns the caller's events newest-first; 401 without a token; `{events: []}` for a new account.
- **FantasyLog**: renders one row per event with signed amount; shows the empty state for `[]`.
- **Sell modal**: shows the refund amount; confirming produces a `sale` event of that same amount.

## Manual validation (`/fantasy`, logged in)

1. **Purchase** — buy a player, open the log → a "kjøpt" row with the negative price appears.
2. **Sale** — sell a player; the confirm modal shows the refund; confirm → a "solgt" row with that positive amount.
3. **Win/loss** — as admin, record a result for a match your player featured in; back on `/fantasy` the log shows one win/loss row per game with the right amounts (doubled if the player holds the racket).
4. **Re-record** — as admin, edit and re-record that same result; the log still shows exactly one set of win/loss rows for it (no duplicates), and the balance matches.
5. **Empty state** — a brand-new manager sees the friendly empty message, not a blank area.

## Cross-feature note

Feature 010 (team editing) already calls `assign_slot`/`clear_slot`; once this feature adds event writes there, 010's saves and sells produce log entries automatically — no extra wiring.
