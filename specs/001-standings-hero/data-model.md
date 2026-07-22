# Phase 1 Data Model: Team Ranking Hero (F1)

Only the entities needed to compute **team standings** are modeled in this slice.
Ranking rules referenced from SPECIFICATIONS §3.4–§3.5 (single source of truth).

## Entities

### Team

| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| name | str, unique, required | Used for the alphabetical final tiebreak (§3.5.4). |
| logo_url | str, nullable | Path/URL to logo/image. Null → frontend placeholder (FR-011). |

Relationships: has many `Member`; appears as `team_a` / `team_b` on `Match`.

### Member

| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| name | str, required | |
| team_id | int (FK → Team) | |

Included because a `Game` records who played. Member-level standings are F2 (out of scope).

### Match

| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| team_a_id | int (FK → Team) | |
| team_b_id | int (FK → Team) | Must differ from team_a_id. |
| status | enum: `scheduled` \| `completed` | Only `completed` matches count toward standings (§3.5). |

Relationships: has many `Game`.

### Game

| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| match_id | int (FK → Match) | |
| team_a_score | int ≥ 0 | |
| team_b_score | int ≥ 0 | Must not equal team_a_score — a game always has a winner (F13, §3.3). |

`team_a_score` / `team_b_score` align with the match's `team_a` / `team_b`.

## Validation rules (relevant to F1)

- `Game`: both scores whole numbers ≥ 0, and `team_a_score != team_b_score` (§3.3).
  (Enforced when writing games; F1 mainly reads, but the seed data must obey this.)
- `Match`: `team_a_id != team_b_id`.
- `Team.name`: unique, non-empty.

## Derived (computed on read — NOT stored)

Per team, over its **completed** matches:

- **Match outcome** (§3.4): more games won wins; tie on games won → higher total
  point-difference in that match wins; still tied → draw.
- **Points** (§3.5): Win = 3, Draw = 1, Loss = 0.
- **Point difference**: sum of (scored − conceded) across all the team's games.
- **Rank**: order by points → point difference → head-to-head → name (§3.5).

### StandingsEntry (response shape, not a table)

| Field | Meaning |
|---|---|
| rank | 1-based position after applying all tiebreaks |
| team_id, team_name, logo_url | team identity for display |
| points | total standings points |
| point_difference | total scored − conceded |
| played | number of completed matches |
| wins / draws / losses | match outcome counts (for the table) |

Rank 1 and rank 2 entries drive the hero; rank ≥ 3 fill the table.

## State transitions

`Match.status`: `scheduled → completed` when its games are recorded. F1 only reads
`completed` matches; the transition itself is a later feature (F12).
