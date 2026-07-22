# Phase 1 Data Model: Admin Page (F6–F13)

This feature **reuses the existing entities** (Team, Member, Match, Game — see
[001 data-model](../001-standings-hero/data-model.md)) and adds the write-side rules and
one schema change. Scoring/pairing rules referenced from SPECIFICATIONS §3 (single
source of truth).

## Schema change

### Game — add member pairing (NEW)

| Field | Type | Notes |
|---|---|---|
| member_a_id | int, FK → Member, **nullable**, `ON DELETE SET NULL` | Who played on team A's side in this game. |
| member_b_id | int, FK → Member, **nullable**, `ON DELETE SET NULL` | Who played on team B's side. May equal another game's member (smaller team repeats, §3.2). |

- Nullable so `scheduled` matches, existing rows, and seed data remain valid; both are
  set when a result is recorded.
- `ON DELETE SET NULL` (not cascade) so editing/deleting a member later does **not**
  erase games already recorded for completed matches (§3.1).
- Existing `Game` fields (`team_a_score`, `team_b_score`) and CheckConstraints
  (both ≥ 0, not equal) are unchanged and remain the last-line score guarantee (F13).

No other table changes. `Team`, `Member`, `Match` are unchanged.

## Auth (config, not a table)

Admin auth stores **no rows**. Two backend-config values:

| Value | Source | Meaning |
|---|---|---|
| ADMIN_PASSWORD_HASH | env var | `salt$iterations$hexhash` of the shared password (§5.1). Never plain text, never sent to the frontend. |
| SESSION_SECRET | env var | Signs the session cookie (Starlette `SessionMiddleware`). |

Session state = a signed cookie carrying `admin=true`; cleared on logout.

## Write-side validation rules

- **Login (F6)**: password verified with `pbkdf2_hmac` + `compare_digest` against
  `ADMIN_PASSWORD_HASH`; wrong password → `401`, no session set.
- **Every admin action (F5→FR-005)**: requires a valid admin session, else `401`.
- **Team**: `name` required, unique (existing constraint). Delete cascades to its
  members and matches (existing FK cascade) — no orphans (FR-010).
- **Member**: `name` required, belongs to exactly one existing team.
- **Match**: `team_a_id != team_b_id`; both teams must exist.
- **Generate round-robin (F11)**: create one `scheduled` match per team pair with no
  existing match; never duplicate (pairs are order-independent).
- **Record result (F12/F13)**:
  - Number of games submitted MUST equal the **larger** team's roster size (§3.2).
  - Every member of the larger team appears exactly once across the games; a smaller-team
    member MAY appear more than once (the repeat the organiser chose).
  - Each game: both scores whole numbers ≥ 0 and not equal (§3.3) → else reject with a
    clear message, match stays not-completed.
  - `member_a_id`/`member_b_id` on each game belong to team A / team B of the match.
  - On success → `Match.status = completed`.

## State transitions

`Match.status`: `scheduled → completed` when a valid result is recorded (F12). A
completed match's games can be edited or deleted later; if edited to an invalid state the
save is rejected. Standings/leaderboards recompute on read after any change (F14) — no
stored derived data (SPECIFICATIONS §7).

## Derived data (unchanged)

Standings (§3.5) and the individual leaderboard (§3.6, F2) are still **computed on read**
and not stored. The new member pairing on `Game` is what will let the leaderboard
attribute games to members later; this feature only populates it.
