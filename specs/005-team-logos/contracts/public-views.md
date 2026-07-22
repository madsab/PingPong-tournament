# Contract deltas: public API (Team Logos)

Only the **additive** changes for this feature are shown. Existing fields are
unchanged. These are backward-compatible: one new optional field per shape.

## `GET /api/standings` — no change

`StandingsEntryOut.logo_url: str | null` already exists and is already served.
Listed here only to note it is the reference pattern the two shapes below copy.

## `GET /api/leaderboard` — add team logo

`LeaderboardEntryOut` gains `team_logo_url` (nullable).

```jsonc
{
  "entries": [
    {
      "rank": 1,
      "member_id": 12,
      "member_name": "Ada",
      "team_name": "Spin Doctors",
      "team_logo_url": "https://example.com/spin.png",  // NEW — null when no team/logo
      "played": 8,
      "won": 6,
      "lost": 2,
      "win_pct": 0.75,
      "point_difference": 21
    }
  ]
}
```

## `GET /api/matches` — add logo to each team ref

`PublicTeamRef` (used by `team_a` and `team_b`) gains `logo_url` (nullable).

```jsonc
{
  "matches": [
    {
      "id": 5,
      "team_a": { "id": 1, "name": "Spin Doctors", "logo_url": "https://example.com/spin.png" },  // NEW field
      "team_b": { "id": 2, "name": "Paddle Batties", "logo_url": null },                          // null = no logo
      "status": "completed",
      "result": { "winner": "a", "games_won_a": 3, "games_won_b": 1 },
      "games": [ /* unchanged */ ]
    }
  ]
}
```

## Admin API — no shape change

`POST /api/admin/teams` (`TeamCreate`) and `PUT /api/admin/teams/{id}`
(`TeamUpdate`) already accept `logo_url: str | null`. The admin frontend simply
starts sending it. An empty value clears the logo (`null`).

## Contract test expectations

- Leaderboard: a member whose team has a logo → `team_logo_url` equals that URL;
  a member with no team or a logo-less team → `team_logo_url` is `null`. Ranking
  order is unchanged by the logo.
- Matches: `team_a.logo_url` / `team_b.logo_url` equal the teams' stored
  `logo_url`, `null` when unset.
- Admin round-trip: create/update a team with a `logo_url`, then read it back via
  the admin teams endpoint and the public standings/leaderboard/matches.
