# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**F1 — Team ranking hero** (spec in `specs/001-standings-hero/`): the backend has SQLAlchemy models (Team, Member, Match, Game), the ranking math (`app/standings.py`, computed on read per SPECIFICATIONS §3.4-§3.5), a public `GET /api/standings` endpoint, and a `app/seed.py` demo-data script. The frontend has the standings section: a "versus" hero (top two teams + score in the middle, slide-in "fight" animation) and a table for the rest, styled per SPECIFICATIONS §9 (dark arena, Inter, design tokens in `src/theme/tokens.css`).

**F6–F13 — Admin page** (spec in `specs/002-admin-page/`): the password-protected `/admin` area.
- **Auth (F6/F7)**: one shared password, **Bearer-token based** (not a cookie), so any device that knows the password can log in and edit. The env var `ADMIN_PASSWORD_HASH` holds a stdlib pbkdf2 hash (generate with `python -m app.auth hash "<password>"`). On login `app/auth.py` returns an opaque token = `HMAC-SHA256(SESSION_SECRET, "admin")` (`make_admin_token`); the frontend stores it in `localStorage` and sends it as `Authorization: Bearer <token>`. `require_admin` verifies the header (`verify_admin_token`, constant-time) — no server-side session for admin. Rotating `SESSION_SECRET` invalidates every issued token (log-everyone-out lever). `app/config.py` reads the env vars. No new auth framework, no user accounts. (The Starlette session cookie still exists but is used **only** by the fantasy area.)
- **Admin API**: `app/routers/admin.py` — `POST /login` (returns `{authenticated, token}`) + `GET /session` (validates the Bearer token), CRUD for teams/members/matches, `POST /api/admin/schedule/generate` (round-robin via the pure `app/schedule.py`), and `PUT /api/admin/matches/{id}/result` (record result, validates §3.2 pairings + §3.3 scores). There is no `/logout` endpoint — logout is the frontend dropping the token. All non-auth endpoints require the Bearer token.
- **Schema change**: `Game` gained nullable `member_a_id`/`member_b_id` (FK → Member, `ON DELETE SET NULL`) so a game records who played (needed for F12 and the future F2 leaderboard). Schema changes are now managed by **Alembic migrations** (see the Database migrations section) rather than drop-and-recreate.
- **Frontend**: `/admin` is a simple path split in `App.tsx` (no router library). `src/components/admin/` holds `AdminPage` (gate + tabs), `LoginForm`, `TeamsManager`, `MatchesManager`, and `ResultForm`; `src/api/admin.ts` is the typed client (stores the token in `localStorage` under `pingpong.admin.token` and sends it as an `Authorization` header; a 401 clears the token). CORS still allows credentials because the fantasy area uses the cookie.

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

**Fantasy Teams** (spec in `specs/007-fantasy-teams/`): a public `/fantasy` page where anyone builds a fantasy squad of real players and earns **CompuBucks**. No new deps.
- **Identity (no password)**: the name IS the account. `POST /api/fantasy/register` (name + required fun-fact) and `POST /api/fantasy/login` (name only) live in `app/routers/fantasy.py`; both set a `fantasy_user_id` key on the **same** Starlette session cookie the admin area uses (independent key, so the two logins don't clash). The cookie's default 14-day life is what "remembered across visits" means. `GET /api/fantasy/me` + `POST /api/fantasy/logout` round it out; `require_fantasy_user` guards the team endpoints. Names are stored trimmed with a lowercased unique `name_key` so casing/spacing never splits an account.
- **Team + CompuBucks**: two new tables (`FantasyUser`, `FantasySlot`). `FantasySlot` has UNIQUE `(user_id, slot_index)` and `(user_id, member_id)` so the "one per box / no duplicate player" rules hold at the DB level; an empty slot is simply no row, and each slot carries an `added_at` timestamp (when the player was placed; reset on swap). `GET/PUT/DELETE /api/fantasy/team/slots/{1-4}` manage the four picks and always return all 4 slots + a CompuBucks total. CompuBucks is the pure `app/fantasy.py` (sibling of `standings.py`), computed on read: **+10 per real game a picked member won, WINS ONLY, and only for games completed *after* that player was added to the slot** (per-slot clock). This uses a new `Match.completed_at` timestamp set in the admin `record_result` endpoint. The picker's player list comes from a new public `GET /api/members`.
- **Schema note**: `FantasySlot.added_at` + `Match.completed_at` are the two columns added by this line of work. The schema is now managed by **Alembic migrations** (see the Database migrations section below), so an existing database gains `Match.completed_at` via `alembic upgrade head` — no reset, no data loss.
- **Frontend**: `/fantasy` is another path branch in `App.tsx`, reachable via a shared top `Navbar` (`src/components/Navbar/`, Tournament ↔ Fantasy, shown on the public + fantasy pages, not admin). `src/api/fantasy.ts` is the typed client (`credentials: 'include'`). `src/components/fantasy/` has `FantasyPage` (gate via `/me`, renders the Norwegian `FantasyRules` + the team), `FantasyLogin` (name → login, falls back to name+fun-fact register on 404), `FantasyTeam` (a responsive **CSS grid** — 2 players | `PingPongTable` | 2 players, stacking on mobile; **not** React Flow), `SlotCard` (plain clickable card), `MemberPicker`, `CompuBucks` (money-formatted total with an inline coin SVG), `PingPongTable`, and `FantasyRules`. `app/seed.py` adds a demo fantasy manager whose picks predate the seeded games so the demo shows a non-zero total.

**Fantasy CompuBucks Economy** (spec in `specs/008-fantasy-economy/`): turns the free fantasy game into a **paid economy**. No new deps. This is the one place the app departs from its compute-on-read habit: the balance is **banked** (stored), because a spend-and-earn economy with a hard 0 floor is path-dependent and selling must keep earnings.
- **Money**: each user starts at **100,000,000** CompuBucks (stored on `FantasyUser.balance`, never < 0). Players have an admin-set price (`Member.price`, null = not pickable). Buying deducts the price; selling refunds **85%** of what was paid (`FantasySlot.price_paid`). Real submatch results move the balance: **+5,000,000** win / **−2,000,000** loss per game a picked player plays.
- **Power-ups**: the **Golden Racket** (`FantasySlot.has_racket`, one per user, reassignable) doubles that player's win *and* loss (+10M / −4M). A shop **Booster** (`FantasySlot.booster_active`, bought with `FantasyUser.boosters_available`, price in the `settings` table, default 1,000,000) adds +50% on the player's next winning game then is consumed; it does **not** stack with the racket.
- **Settlement (banked, not computed-on-read)**: `app/fantasy.py` is now the pure economy math (`slot_match_delta`, `clamp0`, `sell_value` + the money constants). `app/settlement.py`'s `settle_match(db, match)` realizes earnings when the admin records a result (`record_result` calls it), reading each user's current slot/racket/booster state, applying the floor, and storing a per-(user, match) `FantasySettlement` (actual applied delta + consumed booster) so re-recording is idempotent — no double-pay.
- **Endpoints**: buy/sell reuse `PUT/DELETE /api/fantasy/team/slots/{i}`; new `PUT/DELETE /api/fantasy/team/racket`, `POST /api/fantasy/shop/booster`, `PUT/DELETE /api/fantasy/team/booster`. Admin sets prices via `PUT /api/admin/members/{id}` (`price` field) and the booster price via `GET/PUT /api/admin/settings/booster-price`; `GET /api/members` now returns `price`.
- **Schema**: adds `members.price`, `fantasy_users.balance`/`boosters_available`, `fantasy_slots.price_paid`/`has_racket`/`booster_active`, and the `settings` + `fantasy_settlements` tables (migration `0003`). Rollout resets existing fantasy users to 100M and clears their (free) picks (sell math needs a real buy price).
- **Frontend**: `SlotCard` shows the price and two signature corner badges (golden racket bottom-right, booster top-right) plus racket/booster/sell controls; `MemberPicker` shows prices and disables unaffordable/unpriced players; a new `Shop` buys the Booster; `CompuBucks` shows the banked balance; `FantasyRules` now explains the economy. Admin `TeamsManager` gains a per-member price input and the booster-price setting.

All features have tests on both sides. Styling is plain CSS Modules (YAGNI); the one UI library is **@xyflow/react** (React Flow), used for the schedule diagram (the fantasy team is a plain CSS grid) — Shadcn/Magic UI/Tailwind are still NOT installed. Update this file as more features get added.

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
- `alembic upgrade head` — create/upgrade the database schema (run before the server or seed on a fresh DB; the Docker image does this automatically on startup)
- `uvicorn app.main:app --reload` — dev server on :8000
- `pytest` — run all backend tests. Single file: `pytest tests/test_standings.py`
- `python -m app.seed` — insert demo teams/matches (needs the database migrated and running; safe to re-run)

### Database migrations (Alembic)

The Postgres schema is owned by **Alembic** (`backend/alembic/`), not by `create_all`. Startup runs `alembic upgrade head` (Dockerfile / docker-compose command), so fresh **and** already-deployed databases migrate forward with no reset and no data loss. Tests still create tables directly against in-memory SQLite (see `conftest.py`), so they need no migrations.
- Migrations live in `backend/alembic/versions/` (baseline `0001` = pre-fantasy tables and is idempotent; `0002` = fantasy tables + `matches.completed_at`; `0003` = the CompuBucks economy — prices, banked balance, racket/booster flags, `settings` + `fantasy_settlements`, and the existing-user reset).
- After changing a model: `alembic revision --autogenerate -m "what changed"`, review the generated file, commit it. `alembic downgrade -1` rolls back one step.
- `tests/test_migrations.py` runs `alembic check` to fail CI if a model change has no matching migration.

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
