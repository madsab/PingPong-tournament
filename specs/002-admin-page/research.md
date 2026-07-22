# Phase 0 Research: Admin Page (F6–F13)

The spec captured most defaults in its Assumptions. This file records the design
decisions for the admin area and why the simpler option won. No `NEEDS CLARIFICATION`
markers remain.

## D1 — Authentication: signed session cookie + stdlib password hashing

- **Decision**: On login, verify the submitted password against a hash held in
  `ADMIN_PASSWORD_HASH` (env var), then mark the request session as admin using
  Starlette's `SessionMiddleware` (a cookie signed with `SESSION_SECRET`). Logout clears
  the session. Password verification uses the standard library:
  `hashlib.pbkdf2_hmac` to derive the key and `hmac.compare_digest` for a constant-time
  compare. The env var stores `salt$iterations$hexhash` (self-contained, no DB row).
- **Rationale**: Meets §5.1 exactly — password never stored in plain text, never shipped
  to the frontend, session token issued as a cookie. Uses only what's already present:
  `SessionMiddleware` ships inside Starlette (already pulled in by FastAPI) and `hashlib`/
  `hmac` are stdlib. No JWT library, no user/accounts table, no password framework
  (constitution III + IV). A tiny helper (`python -m app.auth hash <password>`) prints a
  hash to put in the env var.
- **Alternatives rejected**:
  - `passlib`/`bcrypt` — a new dependency for a single shared password; stdlib pbkdf2 is
    sufficient and adds nothing to install.
  - JWT (`python-jose`) — stateless tokens are overkill for one organiser on one browser;
    a signed session cookie is simpler and supports real logout without a denylist.
  - Server-side session store (Redis/table) — unnecessary at this scale; the signed
    cookie carries the single `admin=true` flag.

## D2 — One `require_admin` dependency guards the whole admin router

- **Decision**: Put every admin endpoint under an `/api/admin` router that depends on a
  single `require_admin` function; it raises `401` when the session is missing/invalid.
  Login and logout are the only endpoints that do not require an existing session.
- **Rationale**: One narrow interface enforces FR-005 in one place (SOLID II). Adding a
  new admin endpoint automatically inherits the guard.
- **Alternatives rejected**: Checking auth inside each handler — repetitive and easy to
  forget on a new endpoint.

## D3 — Member-to-game link on `Game` (the one new data change)

- **Decision**: Add nullable `member_a_id` and `member_b_id` foreign keys on `Game`
  (→ `Member`), set when a result is recorded. Nullable so existing/seed rows and the
  scheduled-then-filled flow don't break; a recorded (completed) match's games carry
  both. Deleting a member sets these to `NULL` (`ON DELETE SET NULL`) rather than
  cascading, so a completed game's scores survive a later roster edit (§3.1).
- **Rationale**: §3.2 requires a game to record *who played whom*, including a repeated
  smaller-team member — the current `Game` only stores team scores. This is the minimum
  addition to support F12 and unblocks the individual leaderboard (F2) later.
- **Alternatives rejected**:
  - A separate join table for pairings — a game is exactly one pairing, so two FKs on
    `Game` is the simplest faithful model (YAGNI).
  - `ON DELETE CASCADE` on the member link — would delete recorded games (and distort
    standings) when a roster is edited, violating §3.1.

## D4 — Round-robin generation as a pure "missing pairings" function

- **Decision**: `schedule.py` exposes a pure function that, given the existing teams and
  matches, returns the set of unordered team pairs that have no match yet. The endpoint
  creates one `scheduled` match per returned pair. Pair identity is order-independent
  (`{a,b}` == `{b,a}`), so re-running only fills gaps and never duplicates.
- **Rationale**: §5.3 / FR-011. A pure function is trivially test-first (constitution I)
  and keeps generation logic out of the HTTP layer (SOLID II).
- **Alternatives rejected**: Deleting and regenerating all matches — would wipe recorded
  results; the spec requires additive, non-duplicating behavior.

## D5 — Score validation enforced at the admin boundary, backed by DB constraints

- **Decision**: Validate scores (whole numbers ≥ 0, `team_a_score != team_b_score`) in
  the request schema/handler and return a clear `422`/`400` message; the existing
  `Game` CheckConstraints remain as the last-line guarantee. A match is marked
  `completed` only after all its games validate.
- **Rationale**: F13 / §3.3. The DB constraints already exist (found in `models.py`);
  validating early gives the organiser an actionable message instead of a raw DB error
  (error-handling guidance in CLAUDE.md).
- **Alternatives rejected**: Relying on DB constraints alone — surfaces an ugly integrity
  error, not a friendly message.

## D6 — Uneven-roster pairing: client picks, server checks the count

- **Decision**: The number of games = size of the larger team (§3.2). The admin UI lets
  the organiser assign each game's two members, repeating a smaller-team member to cover
  extra opponents. The server validates that the submitted games number exactly the
  larger team's size and that every member of the larger team appears once.
- **Rationale**: Keeps the "smaller team chooses who repeats" decision with the human
  (§3.2) while the server enforces the structural rule (FR-013).
- **Alternatives rejected**: Auto-generating pairings server-side — removes the choice
  §3.2 explicitly gives the smaller team.

## D7 — Frontend `/admin` via a path check, not a router library

- **Decision**: `App.tsx` renders the existing public page for `/` and the new
  `AdminPage` when `window.location.pathname` starts with `/admin`. `AdminPage` shows the
  login form when logged out and the management dashboard (tabs/sections) when logged in.
  Admin API calls send the session cookie (`credentials: 'include'`).
- **Rationale**: Only two top-level routes exist; a full router (react-router) is more than
  the current requirement needs (constitution III). Internal admin navigation is local
  component state.
- **Alternatives rejected**: `react-router-dom` — a new dependency for two routes; revisit
  only if routing genuinely grows (documented escape hatch, not built now).

## D8 — Admin read endpoints for its own management views

- **Decision**: The admin router exposes `GET` list endpoints (teams+members, matches with
  games) so the management screens can render current state. These are behind
  `require_admin` and separate from the public read endpoints.
- **Rationale**: The admin UI needs to see what it is editing; reusing the public
  standings shape is insufficient (it has no member/pairing detail).
- **Alternatives rejected**: Reusing only `GET /api/standings` — lacks the raw
  teams/members/matches the editor needs.

## Resolved unknowns

All Technical Context items are resolved. New backend env vars introduced:
`ADMIN_PASSWORD_HASH` and `SESSION_SECRET` (both provided at deploy time; documented in
[quickstart.md](./quickstart.md)).
