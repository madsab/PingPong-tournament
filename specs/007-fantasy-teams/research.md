# Phase 0 Research: Fantasy Ping Pong Teams

The spec left the "how" open on a few points. Each is resolved below with a decision,
why, and the alternatives rejected. All choices favour reuse and simplicity per the
constitution.

## 1. How to remember a user across visits (no password)

- **Decision**: Reuse the existing Starlette `SessionMiddleware` cookie. On register/login
  store `fantasy_user_id` in `request.session` (independent of the existing `admin` key).
  The cookie is already signed and defaults to a 14-day `max_age`, so it survives a browser
  restart — that *is* "remembered on device."
- **Rationale**: Zero new dependencies, zero new middleware, and the exact "remembered"
  behaviour the spec wants. Matches how admin auth already works.
- **Alternatives rejected**: A separate JWT/localStorage token (new surface, still no
  password so no security gain); a brand-new cookie/middleware (duplicates what exists).

## 2. Register vs. login flow (name is the identity)

- **Decision**: Two endpoints. `POST /api/fantasy/login` takes a name only — 200 + session if
  the account exists, 404 if not. `POST /api/fantasy/register` takes name + fun-fact — creates
  the account (409 if the name is taken) and sets the session. The frontend tries login first;
  on 404 it reveals the fun-fact field and calls register.
- **Rationale**: Keeps each endpoint's job single and obvious; the frontend gives a smooth
  "type your name, add a fun-fact only if you're new" experience.
- **Alternatives rejected**: One overloaded "enter" endpoint that guesses register vs login
  (murkier validation, harder to test).

## 3. Case/'whitespace handling for the identity name

- **Decision**: Store the name as typed (trimmed), plus a `name_key` column = `name.strip().lower()`
  with a UNIQUE constraint. All lookups go through `name_key`.
- **Rationale**: Gives portable case-insensitive uniqueness on both Postgres and SQLite without
  relying on a database collation, and preserves the user's original casing for display.
- **Alternatives rejected**: `func.lower()` unique index (SQLite/Postgres differences); storing
  only lowercased (loses display casing).

## 4. Storing the four slots

- **Decision**: A `fantasy_slots` table with one row per *filled* slot: `(user_id, slot_index 1–4,
  member_id)`. UNIQUE `(user_id, slot_index)` enforces one player per box; UNIQUE
  `(user_id, member_id)` enforces no duplicate player on a team. `member_id` FK uses
  `ON DELETE SET NULL`… — see note. Empty slot = no row.
- **Rationale**: Natural relational model, matches the app's style, and pushes both "one per
  slot" and "no duplicates" rules down to DB constraints (defence in depth behind the API
  validation).
- **Refinement**: Because an empty slot is simply the absence of a row, we don't need nullable
  `member_id`. FK is `ON DELETE CASCADE` on the slot row: if an admin deletes a Member, that
  slot row disappears and the box goes empty — exactly the spec's edge case.
- **Alternatives rejected**: Four `slotN_member_id` columns on the user row (can't express the
  "no duplicate across columns" rule as a DB constraint; awkward to validate).

## 5. CompuBucks scoring

- **Decision**: Pure function in a new `app/fantasy.py`: given the set of a user's slot
  member-ids and all matches, for each **played** game where that member was `member_a` or
  `member_b`, award **+10** if that member's side won the game, **+3** if it lost. Sum across
  all four members. Computed on read; never stored. Constants live at module top for easy tuning.
- **Rationale**: Reuses the per-game player links + scores already recorded (F12/game-rules),
  mirrors `standings.py`/`leaderboard.py`, and needs no schema for earnings.
- **Alternatives rejected**: Persisting a running CompuBucks balance (stale on roster change,
  needs recompute jobs); match-level instead of game-level scoring (throws away the per-game
  player data we already have).

## 6. Where the pick-list of real players comes from

- **Decision**: Add a small public `GET /api/members` returning `[{id, name, team_id, team_name,
  team_logo_url}]` (one query, joined to team). The frontend uses it to populate the slot picker.
- **Rationale**: An honest, single-purpose endpoint. The `leaderboard` response *contains* these
  fields but is a ranking with stats the picker doesn't need — reusing it would misrepresent intent.
  A dedicated list is just as simple and clearer.
- **Alternatives rejected**: Reuse `/api/leaderboard` (couples the picker to ranking logic/shape);
  an admin-only members list (picker must work for logged-in fantasy users, not admins).

## 7. Rendering the four boxes with React Flow

- **Decision**: Reuse `@xyflow/react` (already a dependency for the schedule). Four custom
  `SlotNode` nodes laid out responsively; the base stylesheet is already imported once in
  `main.tsx`. Clicking a slot opens `MemberPicker` to assign/replace/clear. Tests mock
  `@xyflow/react` exactly like `ScheduleSection` does (jsdom can't measure the canvas), so slot
  rendering and click wiring are covered without the live canvas.
- **Rationale**: The user asked for React Flow; it's installed and there's a proven testing
  pattern in this repo.
- **Alternatives rejected**: Plain CSS grid of divs (ignores the explicit ReactFlow request);
  a new drag-and-drop library (violates "use what's already there").

## 8. Input validation strategy

- **Decision**: Validate on the backend with Pydantic field constraints + explicit checks:
  name non-empty after trim, ≤100 chars; fun_fact non-empty after trim, ≤280 chars; slot_index
  in 1–4 (path/int); member_id must exist. Frontend validation is convenience only.
- **Rationale**: The spec requires server-side validation; Pydantic is already the project's
  validation tool.
- **Alternatives rejected**: Trusting frontend checks (explicitly forbidden by the spec).
