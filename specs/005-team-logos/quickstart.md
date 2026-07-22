# Quickstart: Team Logos

How to validate the feature end-to-end once implemented. Assumes the standard dev
setup from `CLAUDE.md`.

## Prerequisites

- `docker compose up --build` running (frontend :5173, backend :8000, Postgres :5432), **or** backend + frontend run separately.
- Admin login working (`ADMIN_PASSWORD_HASH` set, or use the test default).
- Some seeded teams/matches (`python -m app.seed`) so the hero, standings, leaderboard, and schedule all have content.

## Automated tests (run first — TDD)

**Backend** (`cd backend`):
```
pytest tests/test_leaderboard.py tests/test_public_matches.py tests/test_admin_crud.py
```
Expect: leaderboard entries expose `team_logo_url`; match team refs expose
`logo_url`; admin team create/update round-trips `logo_url`.

**Frontend** (`cd frontend`):
```
npm test
```
Expect: `TeamLogo` renders an `<img>` when given a URL and the text fallback
otherwise (and on image error); StandingsTable / LeaderboardSection / MatchNode /
MatchDetail render the logo before the team name; admin `TeamsManager` shows a
logo-URL input but its tables render no logo image.

## Manual end-to-end walkthrough

1. **Set a logo (US1)** — Go to `/admin`, log in, open a team, paste an image URL
   (e.g. a small square PNG) into the logo field, save. Reload → the value sticks.
   *Verifies FR-001, FR-002.*

2. **Hero (US2)** — Make sure the team you gave a logo is in the top two (seed/enter
   results if needed). Open `/`. Its hero circle shows the logo; a leader without a
   logo shows initials; the rank-1 crown/gold still shows. *Verifies FR-003, §9.4.*

3. **Public tables (US3)** — On `/`, check the logo appears immediately before the
   team name in: the standings table (ranks 3+), the leaderboard Team column, each
   schedule match card, and an expanded match's detail headers. *Verifies FR-004.*

4. **Fallback (edge cases)** — Set a team's logo to a bogus URL and to empty. In
   every public view that team falls back to initials/name with **no broken-image
   icon**. *Verifies FR-005, §9.7.*

5. **Admin stays clean (FR-006)** — On `/admin`, confirm the team/match/result
   tables show no logos (only the edit form has the URL input).

6. **Responsive (§9.6 / constitution §V)** — Narrow the window to mobile width.
   Logos + names stay aligned; rows and hero circles don't overflow or break.

## Expected outcome

All automated tests green, and the six manual checks pass — matching Success
Criteria SC-001…SC-005 in [spec.md](./spec.md).
