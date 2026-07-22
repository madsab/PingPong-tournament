# Quickstart: Admin Match-Card Scores & Pre-Filled Edit Form

How to validate the feature end-to-end. No backend or DB changes are required.

## Prerequisites

- Repo checked out on branch `004-admin-match-scores`.
- Node deps installed: `cd frontend && npm install`.

## Automated tests (primary verification)

Run the two affected component tests:

```bash
cd frontend
npx vitest run src/components/admin/MatchesManager
npx vitest run src/components/admin/ResultForm
```

Expected: all pass, including the new cases for
- card shows `"2 – 1"` for a completed match; no score for a match with no games (Contract A);
- result form pre-fills saved scores and player selections; blank for a match with no games; editing + saving calls `recordResult` (Contract B).

Full frontend suite:

```bash
cd frontend && npm test
```

Backend suite should be unaffected (no backend changes), but confirm it stays green:

```bash
cd backend && pytest
```

## Manual walkthrough (optional)

1. Start everything: `docker compose up --build`. Frontend at http://localhost:5173.
2. Seed demo data if needed: `cd backend && python -m app.seed` (needs DB running).
3. Log in at `/admin` and open the **Matches** tab.
4. **Card score**: find a completed match — its card shows the games-won score (e.g. `2 – 1`). A scheduled match shows no score.
5. **Pre-fill**: click **Record result** on that completed match — every game's score inputs and player selections are already filled with the saved values.
6. Change one score to another valid value, save, and confirm the card's score updates. Try a tie (equal scores) and confirm it is rejected with a clear message (unchanged validation).

## Success check

- [ ] Every completed match card shows a correct games-won score; no not-yet-played match shows one (SC-001, SC-002).
- [ ] Opening the form for a completed match pre-fills all scores and pairings (SC-003).
- [ ] A single wrong score can be fixed without re-entering the others (SC-004).
- [ ] Invalid edited results are still rejected (SC-005).
- [ ] The updated score shows on the card after saving (SC-006).
