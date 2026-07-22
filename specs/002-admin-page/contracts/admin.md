# Contract: Admin Endpoints

All admin endpoints live under `/api/admin` and require a valid admin session
(FR-005) **except** login. The session is a signed cookie set on login and cleared on
logout (§5.1). Requests must send the cookie (`credentials: 'include'`). Any request
without a valid session → `401 { "detail": "Not authenticated" }`.

Errors use plain JSON `{ "detail": "..." }` — never a raw stack trace (CLAUDE.md).

## Auth

### POST /api/admin/login
- Body: `{ "password": "..." }`
- `200` → sets session cookie, body `{ "authenticated": true }`.
- `401` → wrong password, no cookie set.

### POST /api/admin/logout
- Clears the session cookie. `200 { "authenticated": false }`. Idempotent.

### GET /api/admin/session
- `200 { "authenticated": true|false }` — lets the frontend show the gate vs dashboard.
  Does not require a session (returns `false` when absent).

## Teams (F8) & Members (F9)

### GET /api/admin/teams
- `200 { "teams": [ { "id", "name", "logo_url", "members": [ { "id", "name" } ] } ] }`

### POST /api/admin/teams
- Body `{ "name", "logo_url"? }` → `201` team. `409` if name not unique.

### PUT /api/admin/teams/{id}
- Body `{ "name"?, "logo_url"? }` → `200` updated team. `404` if missing.

### DELETE /api/admin/teams/{id}
- `204`. Cascades to the team's members and matches (FR-010). `404` if missing.

### POST /api/admin/members
- Body `{ "name", "team_id" }` → `201` member. `404` if team missing.

### PUT /api/admin/members/{id}
- Body `{ "name"?, "team_id"? }` → `200`. `404` if missing.

### DELETE /api/admin/members/{id}
- `204`. Sets `member_a_id`/`member_b_id` on any recorded games to `NULL` (§3.1) — does
  not delete those games. `404` if missing.

## Matches (F10)

### GET /api/admin/matches
- `200 { "matches": [ { "id", "team_a", "team_b", "status",
  "games": [ { "id", "member_a_id", "member_b_id", "team_a_score", "team_b_score" } ] } ] }`

### POST /api/admin/matches
- Body `{ "team_a_id", "team_b_id" }` → `201` scheduled match.
  `400` if the two teams are equal. `404` if a team is missing.

### PUT /api/admin/matches/{id}
- Body `{ "team_a_id"?, "team_b_id"? }` → `200`. `404` if missing.

### DELETE /api/admin/matches/{id}
- `204`. Cascades to its games. `404` if missing.

## Generate round-robin (F11)

### POST /api/admin/schedule/generate
- No body. Creates one `scheduled` match for every team pair with no existing match.
- `200 { "created": <count>, "skipped": <existing pairs left alone> }`.
- Running again with a full schedule → `{ "created": 0 }`. Never duplicates (§5.3).
- Fewer than 2 teams → `{ "created": 0 }` (edge case, no error).

## Record a result (F12/F13)

### PUT /api/admin/matches/{id}/result
- Body:
  ```json
  {
    "games": [
      { "member_a_id": 5, "member_b_id": 8, "team_a_score": 11, "team_b_score": 7 }
    ]
  }
  ```
- On success → replaces the match's games, sets `status = completed`,
  `200` with the updated match.
- **Validation** (each violation → `422`/`400` with a clear message, match not completed):
  - `games` count MUST equal the larger team's roster size (§3.2).
  - Every member of the larger team appears exactly once; smaller-team members may repeat.
  - `member_a_id` belongs to team A, `member_b_id` belongs to team B.
  - Each game: scores are whole numbers ≥ 0 and `team_a_score != team_b_score` (§3.3/F13).
- `404` if match missing.

## Contract tests (must fail before implementation)

- Any admin endpoint without a session → `401`; login with wrong password → `401`;
  correct password sets a session that unlocks the endpoints; logout revokes it.
- Create/rename/delete team; deleting a team removes its members and matches (cascade).
- Create/edit/delete member; deleting a member NULLs recorded games' pairing, keeps games.
- `POST /schedule/generate` on N teams creates exactly N·(N−1)/2 matches; a second call
  creates 0; adding a team then regenerating adds only the new pairings.
- `PUT /matches/{id}/result` with uneven rosters accepts exactly `max(sizeA,sizeB)` games
  with a repeated smaller-team member and marks the match completed; standings recompute.
- Negative score and tied game score are both rejected and the match stays not-completed.
