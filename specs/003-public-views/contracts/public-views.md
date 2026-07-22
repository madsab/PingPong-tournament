# API Contract: Public Match & Player Views (F2–F4)

Two new **public, read-only** endpoints in `backend/app/routers/public.py` (prefix
`/api`, no auth, no credentials). Both compute on read (§7).

---

## `GET /api/leaderboard` (F2)

Individual leaderboard, ranked per §3.6.

**Auth**: none. **Query params**: none.

**200 response**:

```json
{
  "entries": [
    {
      "rank": 1,
      "member_id": 3,
      "member_name": "Ada",
      "team_name": "Spin Doctors",
      "played": 6,
      "won": 5,
      "lost": 1,
      "win_pct": 0.833,
      "point_difference": 21
    }
  ]
}
```

- `entries` ordered by `won` desc → `win_pct` desc → `point_difference` desc →
  `member_name` asc. `rank` is 1-based and unique.
- Only games in **completed** matches count. Games with a NULL member link are skipped
  for the missing side (§3.1).
- Members with no completed games are included with all-zero stats (`win_pct` = 0).
- `win_pct` is a fraction in `[0,1]` (round for display on the frontend).

---

## `GET /api/matches` (F3 + F4)

Every match with games, player names, status, and result. Serves both the schedule (F3,
list) and the match detail (F4, expanded).

**Auth**: none. **Query params**: none.

**200 response**:

```json
{
  "matches": [
    {
      "id": 7,
      "team_a": { "id": 1, "name": "Spin Doctors" },
      "team_b": { "id": 2, "name": "Paddle Battle" },
      "status": "scheduled",
      "result": null,
      "games": []
    },
    {
      "id": 3,
      "team_a": { "id": 1, "name": "Spin Doctors" },
      "team_b": { "id": 3, "name": "Net Ninjas" },
      "status": "completed",
      "result": { "winner": "a", "games_won_a": 2, "games_won_b": 1 },
      "games": [
        {
          "member_a_id": 3, "member_a_name": "Ada",
          "member_b_id": 8, "member_b_name": "Finn",
          "team_a_score": 11, "team_b_score": 7
        }
      ]
    }
  ]
}
```

- `status` ∈ `"scheduled"` | `"completed"`.
- `result` is `null` for scheduled matches; for completed matches `winner` ∈
  `"a"` | `"b"` | `"draw"` (from `decide_match`, §3.4) and `games_won_*` are the games
  each side won (the score shown, e.g. 2–1).
- `games` is `[]` for scheduled matches.
- `member_a_name` / `member_b_name` may be `null` if the game's member link was cleared
  after completion (§3.1); the score still shows.
- Ordering: to-play (`scheduled`) first, then played (`completed`); stable by `id` within
  each group (Decision 6).

---

## Errors

- Both endpoints return `200` with empty lists (`entries: []` / `matches: []`) when there
  is no data — not an error.
- No 4xx paths (no params, no auth). A 500 only on an unexpected server fault (logged with
  request path per repo error-handling rules).
