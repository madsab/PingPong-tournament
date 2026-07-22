# Data Model: Team Logos

No database schema change. The only stored field involved, `Team.logo_url`,
already exists. This document describes how the team logo flows through the
computed (never-stored) read shapes that the public page consumes.

## Stored entity

### Team (existing — unchanged)

| Field | Type | Notes |
|-------|------|-------|
| id | int | PK |
| name | str (≤100, unique) | |
| **logo_url** | str \| None (≤500) | **Already exists.** Optional image URL. `None`/empty = no logo. |
| members | Member[] | relationship |

Validation: none added. Treated as an optional string. An empty submission from
the admin form clears it (sets `None`). Correctness of the linked image is the
admin's responsibility; the frontend falls back if it fails to load.

## Computed read shapes (never stored)

These are built on read from the ORM. Team logo is resolved the same way team
name already is.

### StandingsEntryOut (existing — already carries the logo)

`logo_url: str | None` is already present and served by `GET /api/standings`. No
change. The standings hero and table read from here.

### LeaderboardEntry / LeaderboardEntryOut (CHANGE — add team logo)

`app/leaderboard.py` `LeaderboardEntry` dataclass and `app/schemas.py`
`LeaderboardEntryOut` gain one field:

| Field | Type | Source |
|-------|------|--------|
| team_logo_url | str \| None | `member.team.logo_url` (via a `_team_logo(member)` helper mirroring the existing `_team_name`) |

A player with no team (or a member whose team has no logo) → `None`. Sort order
(§3.6) is unaffected — the logo is display-only.

### PublicTeamRef (CHANGE — add logo)

`app/schemas.py` `PublicTeamRef` and the matching frontend type gain:

| Field | Type | Source |
|-------|------|--------|
| logo_url | str \| None | `match.team_a.logo_url` / `match.team_b.logo_url` |

Used by `PublicMatchOut.team_a` / `team_b`, served by `GET /api/matches`. The
schedule cards and match-detail headers read from here.

## Frontend type mirrors (`frontend/src/api/public.ts`)

- `LeaderboardEntry` gains `team_logo_url: string | null`.
- `PublicTeamRef` gains `logo_url: string | null`.
- `StandingsEntry` (in `api/standings.ts`) already has `logo_url` — no change.
- `admin.ts` `Team` already has `logo_url`; the `createTeam`/update calls start
  sending it (backend `TeamCreate`/`TeamUpdate` already accept it).

## Fallback rule (all display sites)

```
logo_url present AND image loads  → show <img>
otherwise (null, empty, or onError) → show text fallback
                                       (hero: initials; tables: neutral slot / name only)
```
Never render a broken-image icon (§9.7).
