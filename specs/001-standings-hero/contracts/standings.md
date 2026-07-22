# Contract: Public Standings Endpoint

The public page reads team standings from one read-only endpoint. No auth (F5).

## GET /api/standings

Returns every team ranked per SPECIFICATIONS §3.5, computed on read from completed
matches. The frontend uses `rank` 1 & 2 for the hero and the rest for the table.

### Request

- Method: `GET`
- Path: `/api/standings`
- Auth: none
- Query params: none

### Response `200 OK`

```json
{
  "teams": [
    {
      "rank": 1,
      "team_id": 3,
      "team_name": "Spin Doctors",
      "logo_url": "/logos/spin-doctors.png",
      "points": 9,
      "point_difference": 24,
      "played": 3,
      "wins": 3,
      "draws": 0,
      "losses": 0
    }
  ]
}
```

### Field rules

- `teams` is ordered by `rank` ascending (already sorted; frontend does not re-sort).
- `rank` is 1-based and dense — ties are broken fully by §3.5 so no two teams share a
  rank.
- `logo_url` may be `null` → frontend renders a placeholder (FR-011).
- Only **completed** matches contribute; a team with no completed matches still
  appears with zeroed figures.
- Empty tournament → `{ "teams": [] }` (frontend shows the empty state, FR-010).

### Errors

- `500` only on unexpected server error, with a plain JSON `{ "detail": "..." }`
  message (no stack trace leaked to the client, per CLAUDE.md error handling).

## Contract tests (must fail before implementation)

- Returns `200` and `teams` sorted by `rank` ascending.
- Two teams tied on points are ordered by the §3.5 tiebreak chain (point diff →
  head-to-head → name), never sharing a rank.
- A team with only `scheduled` matches shows `played: 0` and zeroed points.
- Empty database returns `{ "teams": [] }`.
