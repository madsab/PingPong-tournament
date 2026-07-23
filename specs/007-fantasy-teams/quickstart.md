# Quickstart / Validation: Fantasy Ping Pong Teams

How to run and prove the feature works end-to-end. No DB reset needed (only new tables are
added). Assumes some seeded teams/members/games exist (`python -m app.seed`).

## Run

```bash
docker compose up --build     # frontend :5173, backend :8000, Postgres :5432
# then open http://localhost:5173/fantasy
```

## Automated tests

```bash
# Backend
cd backend && pytest tests/test_fantasy_scoring.py tests/test_fantasy_api.py

# Frontend
cd frontend && npx vitest run src/components/fantasy src/api/fantasy.test.ts
```

## Manual walkthrough (maps to the user stories)

**Story 1 — register & be remembered**
1. Open `/fantasy` with no account → login screen.
2. Type a new name, submit → app asks for a fun-fact (name not found).
3. Leave fun-fact blank → blocked with "fun-fact is required".
4. Fill fun-fact, submit → you land on your team.
5. Reload the page (and reopen the browser) → still logged in, no typing.
6. Log out → back to the login screen. Log in again with just the name → same account.

**Story 2 — build a 4-slot team**
1. See four boxes on the React Flow canvas.
2. Click an empty box → pick a real player → box shows their name, team, and logo.
3. Click a filled box → replace with a different player → box updates.
4. Try to add a player already in another box → rejected with a clear message.
5. Reload → the same four picks are shown.

**Story 3 — earn CompuBucks**
1. With empty slots, CompuBucks reads **0**.
2. Add a player who has won real games → total rises (+10 per game won, +3 per game lost).
3. Remove that player → total drops accordingly.

## Backend validation checks (all rejected server-side)

- Empty / whitespace-only name or fun-fact → 422.
- Name/fun-fact over length (100 / 280) → 422.
- `slot_index` outside 1–4 → 422.
- Non-existent `member_id` → 404.
- Same member in two of your slots → 409.
- Any team endpoint without the session cookie → 401.

## Expected outcomes

- Returning to `/fantasy` on the same device never re-prompts for login until logout.
- A user's roster is identical after reload 100% of the time.
- CompuBucks always equals the documented rule applied to the current roster's completed games.
