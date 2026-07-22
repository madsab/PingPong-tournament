# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**F1 — Team ranking hero** (spec in `specs/001-standings-hero/`): the backend has SQLAlchemy models (Team, Member, Match, Game), the ranking math (`app/standings.py`, computed on read per SPECIFICATIONS §3.4-§3.5), a public `GET /api/standings` endpoint, and a `app/seed.py` demo-data script. The frontend has the standings section: a "versus" hero (top two teams + score in the middle, slide-in "fight" animation) and a table for the rest, styled per SPECIFICATIONS §9 (dark arena, Inter, design tokens in `src/theme/tokens.css`).

**F6–F13 — Admin page** (spec in `specs/002-admin-page/`): the password-protected `/admin` area.
- **Auth (F6/F7)**: one shared password. The env var `ADMIN_PASSWORD_HASH` holds a stdlib pbkdf2 hash (generate with `python -m app.auth hash "<password>"`); `SESSION_SECRET` signs the session cookie via Starlette's `SessionMiddleware`. `app/auth.py` has `verify_password` and the `require_admin` guard; `app/config.py` reads the env vars. No new auth framework, no user accounts.
- **Admin API**: `app/routers/admin.py` — login/logout/session, CRUD for teams/members/matches, `POST /api/admin/schedule/generate` (round-robin via the pure `app/schedule.py`), and `PUT /api/admin/matches/{id}/result` (record result, validates §3.2 pairings + §3.3 scores). All non-auth endpoints require the session cookie.
- **Schema change**: `Game` gained nullable `member_a_id`/`member_b_id` (FK → Member, `ON DELETE SET NULL`) so a game records who played (needed for F12 and the future F2 leaderboard). No migration tool is wired yet — tables are created from the models (`Base.metadata.create_all`), so recreate the DB when the schema changes.
- **Frontend**: `/admin` is a simple path split in `App.tsx` (no router library). `src/components/admin/` holds `AdminPage` (gate + tabs), `LoginForm`, `TeamsManager`, `MatchesManager`, and `ResultForm`; `src/api/admin.ts` is the typed client (uses `credentials: 'include'`). CORS now allows credentials.

**F2–F4 — Public match & player views** (spec in `specs/003-public-views/`): the three remaining read-only sections of the public page (`/`), all computed on read, no schema change, no new deps.
- **F2 leaderboard**: pure `app/leaderboard.py` (`compute_leaderboard`, §3.6 — sibling of `standings.py`) + `GET /api/leaderboard`. Ranks every player by games won → win % → point-difference → name; skips games whose member link is NULL (§3.1); zero-game members listed last with all-zero stats.
- **F3 schedule + F4 detail**: a single `GET /api/matches` serves both — every match with games, player **names**, status, and result. Match result reuses `decide_match()` from `standings.py` plus a games-won count. Ordered to-play first, then played (stable by id).
- **Schemas**: public output shapes live in `app/schemas.py` (`LeaderboardEntryOut`, `PublicMatchOut`/`PublicGameOut` with resolved names) — kept separate from the admin id-only shapes. `app/seed.py` now also seeds a couple of scheduled matches so the F3 "to-play" group shows.
- **Frontend**: `src/api/public.ts` (typed client, no credentials); `src/components/LeaderboardSection` and `MatchDetail` reuse the F1 load-state pattern + `tokens.css`; mounted after `StandingsSection` on `/` in §4 order. Gold stays reserved for the rank-1 team only.
- **Schedule as a React Flow timeline**: `ScheduleSection` renders the schedule as a matchday-timeline diagram via `@xyflow/react`. Rounds are columns left→right (played first, then upcoming); each match is a custom `MatchNode` card; clicking a played match opens its `MatchDetail` (F4) below the canvas. The round grouping is derived on the frontend (`scheduleGraph.ts` — pure `packRounds`/`toFlow`, unit-tested) because the `Match` model stores no rounds or dates. React Flow's base stylesheet is imported once in `main.tsx`; the canvas chrome is themed via `:global` overrides. Tests mock `@xyflow/react` (jsdom can't measure the real canvas), so the pure graph logic and node/click wiring are covered without the live canvas.

**Team logos** (spec in `specs/005-team-logos/`): each team has an optional logo shown next to its name across the public page. No schema change, no upload, no new deps — the logo is an image **URL** stored in the existing `Team.logo_url` column.
- **Admin (F8)**: the team create form and each team card in `TeamsManager` have a logo-URL input; `src/api/admin.ts` gained `updateTeamLogo(id, url)` and `createTeam(name, logoUrl)`. Empty value clears the logo. Admin tables stay text-only (no logo images).
- **Backend**: `logo_url` now flows through the two public read shapes that lacked it — `LeaderboardEntryOut.team_logo_url` (via `_team_logo()` in `app/leaderboard.py`) and `PublicTeamRef.logo_url` (set in `app/routers/public.py` for `/api/matches`). Standings already carried it.
- **Frontend**: a shared `src/components/TeamLogo/` renders a small round logo with an initials fallback (shared `src/lib/initials.ts`) and an `onError` fallback so a broken/missing URL never shows a broken-image icon (§9.7). Used before the team name in `StandingsTable`, `LeaderboardSection`, `MatchNode`, and `MatchDetail`. The hero keeps its own larger `TeamCrest` (now also with the `onError` fallback). `app/seed.py` gives two teams a self-contained SVG demo logo.

All features have tests on both sides. Styling is plain CSS Modules (YAGNI); the one UI library is **@xyflow/react** (React Flow), added for the schedule diagram — Shadcn/Magic UI/Tailwind are still NOT installed. Update this file as more features get added.

## Stack

- **Frontend**: Vite + React + TypeScript, CSS Modules for styling. Shadcn and Magic UI for component libraries (not yet installed — add via their CLIs when the first component is needed, which will also require adding Tailwind).
- **Backend**: Python 3.14 with FastAPI. Uses `psycopg` (v3), not `psycopg2` — `psycopg2-binary` has no prebuilt wheel for Python 3.14.
- **Database**: PostgreSQL 17, via Docker only (no local install expected).
- **Infra**: Docker Compose for local dev (`docker-compose.yml` at repo root).

## Commands

Run everything together:
```
docker compose up --build
```
Frontend at http://localhost:5173, backend at http://localhost:8000, Postgres on 5432 (user/pass/db: `pingpong`).

Frontend only (`cd frontend`):
- `npm install`
- `npm run dev` — dev server
- `npm run build` — type-check (`tsc -b`) + production build
- `npm run lint` — oxlint
- `npm test` — run Vitest once (`npm run test:watch` for watch mode). Single file: `npx vitest run src/components/StandingsTable`

Backend only (`cd backend`, inside a venv):
- `pip install -r requirements.txt`
- `uvicorn app.main:app --reload` — dev server on :8000
- `pytest` — run all backend tests. Single file: `pytest tests/test_standings.py`
- `python -m app.seed` — insert demo teams/matches (needs the database running; safe to re-run)

## How to work in this repo

Act like a senior engineer: prefer the boring, obvious solution over a clever one. If a well-known library or pattern already solves the problem, use it instead of writing something custom. Simple and readable beats impressive.

Write explanations, comments, and commit messages in plain, simple English — like explaining to a junior developer. Keep technical terms but explain what they mean in normal words.

## Testing

Tests are a strong default, not optional: any new logic (frontend components with behavior, backend endpoints, business logic) should come with tests. TDD (test first) is encouraged when it's the faster path, but writing code and its test together is fine — the point is that nothing meaningful ships untested.

- Frontend: co-locate tests next to the component/module they cover.
- Backend (FastAPI): test endpoints and business logic, not framework internals.

Test runners are set up: **backend** uses `pytest` (tests under `backend/tests/`, run against in-memory SQLite so no Postgres is needed); **frontend** uses `vitest` + React Testing Library (config in `vitest.config.ts`, kept separate from `vite.config.ts` so the production `tsc` build doesn't trip over Vitest's bundled Vite types). See the Commands section for how to run them and a single test.

## Error handling & logging

- Fail loudly on programmer errors (bad input, broken invariants) — don't swallow exceptions silently.
- User-facing errors should be clear and actionable, not raw stack traces.
- Backend: log errors with enough context (request path, relevant IDs) to debug without reproducing locally. Don't log secrets or full request bodies containing user data.
- Frontend: surface errors to the user in the UI, and log unexpected ones to the console/monitoring — don't let failures fail silently.

## Code review checklist

Before calling work done, check:

- [ ] Tests exist for new logic and pass.
- [ ] No dead code, commented-out blocks, or leftover debug logging.
- [ ] Errors are handled the way described above (loud for bugs, clear for users).
- [ ] Naming is clear enough that comments aren't needed to explain "what" — only "why" where it's non-obvious.
- [ ] No unnecessary abstraction for a problem that only exists once.
