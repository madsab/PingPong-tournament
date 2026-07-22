# Data Model: Public Match & Player Views (F2–F4)

**No database schema change.** This feature is read-only and computes everything from the
existing `Team / Member / Match / Game` tables. The only "new" shapes are the
**computed** leaderboard entry and the **API response** shapes — none are stored.

## Existing entities used (unchanged)

| Entity | Fields used here | Notes |
|---|---|---|
| **Team** | `id`, `name`, `logo_url` | Team names shown in schedule/detail. |
| **Member** | `id`, `name`, `team_id` | The unit ranked by the leaderboard. |
| **Match** | `id`, `team_a_id`, `team_b_id`, `status`, `games` | `status` ∈ {`scheduled`, `completed`}. Only completed matches feed the leaderboard and show a result. |
| **Game** | `team_a_score`, `team_b_score`, `member_a_id`, `member_b_id` | `member_*_id` may be **NULL** (roster detached after completion, §3.1). Convention: `member_a_id`/`team_a_score` is the team_a side. |

## Computed: `LeaderboardEntry` (in `app/leaderboard.py`, never stored)

One per member, produced by `compute_leaderboard(members, matches)`.

| Field | Meaning |
|---|---|
| `rank` | 1-based position after sorting. |
| `member_id`, `member_name` | Who. |
| `team_name` | Their team (for display). |
| `played` | Games played in completed matches (where this member's link is present). |
| `won`, `lost` | Games won / lost. |
| `win_pct` | `won / played` (0 when `played == 0`). |
| `point_difference` | Σ(points scored − conceded) across their games. |

### Computation rules (§3.6)

1. Consider only games inside **completed** matches.
2. For each game, attribute it to `member_a_id` (team_a side) and `member_b_id` (team_b
   side). **Skip a side whose member id is NULL** (§3.1) — the game still counts for the
   other side if present.
3. A member can appear in more than one game of a match (smaller team repeats, §3.2) —
   each game counts separately.
4. `won`/`lost` from comparing that member's score vs the opponent's in each game (a game
   never ties, §3.3).
5. **Order**: `won` desc → `win_pct` desc → `point_difference` desc → `member_name` asc.
   Assign `rank` after sorting (name is the final always-stable tiebreak).

### Validation / edge behavior

- Zero completed games → member listed with all zeros, `win_pct = 0`, ranked last by name.
- NULL-link games contribute to neither side they're missing.
- No division by zero: `win_pct` guards `played == 0`.

## Computed: match result (reuse `decide_match()`)

For each completed match, derive for display:

- `winner` ∈ {`a`, `b`, `draw`} from `decide_match(match)` (§3.4).
- `games_won_a`, `games_won_b`: count of games each side won → the "score" shown (e.g. 2–1).

Scheduled matches have no games, no result.

## API response shapes (public, read-only — in `app/schemas.py`)

New, separate from the admin shapes (which expose ids only). See
[contracts/public-views.md](./contracts/public-views.md) for the JSON.

- **`LeaderboardEntryOut`**: `rank, member_id, member_name, team_name, played, won, lost, win_pct, point_difference`.
- **`LeaderboardResponse`**: `{ entries: [LeaderboardEntryOut] }`.
- **`PublicGameOut`**: `member_a_id, member_a_name, member_b_id, member_b_name, team_a_score, team_b_score` (names may be `null` when the link was detached).
- **`PublicMatchOut`**: `id, team_a {id,name}, team_b {id,name}, status, result {winner, games_won_a, games_won_b} | null, games: [PublicGameOut]`.
- **`PublicMatchesResponse`**: `{ matches: [PublicMatchOut] }`, ordered to-play first then played (Decision 6).
