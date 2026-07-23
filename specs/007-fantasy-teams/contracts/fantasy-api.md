# API Contract: Fantasy Ping Pong Teams

All endpoints are JSON. Auth is the existing signed session cookie (Starlette
`SessionMiddleware`); the browser must send it (`credentials: 'include'`). Fantasy endpoints
read/write the `fantasy_user_id` session key, independent of the admin `admin` key.

`require_fantasy_user` is a dependency that loads the FantasyUser from `session["fantasy_user_id"]`
and returns **401** if missing or the user no longer exists.

## Auth & identity

### POST `/api/fantasy/register`
Create a new account and log in.
- Body: `{ "name": string, "fun_fact": string }`
- **201**: `{ "id", "name", "fun_fact" }` and sets the session.
- **422**: name or fun_fact empty after trim, or over length (name>100, fun_fact>280).
- **409**: name already taken (case-insensitive).

### POST `/api/fantasy/login`
Log in to an existing account by name only.
- Body: `{ "name": string }`
- **200**: `{ "id", "name", "fun_fact" }` and sets the session.
- **404**: no account with that name (frontend then offers register).
- **422**: name empty after trim.

### GET `/api/fantasy/me`
Who am I? Used on page load to decide login-vs-team.
- **200**: `{ "id", "name", "fun_fact" }`
- **401**: not logged in.

### POST `/api/fantasy/logout`
Clear the fantasy session key (device forgets the user). Safe when already logged out.
- **200**: `{ "authenticated": false }`

## Fantasy team

### GET `/api/fantasy/team` — *(requires login)*
The current user's four slots plus their CompuBucks total.
- **200**:
  ```json
  {
    "compubucks": 46,
    "slots": [
      { "slot_index": 1, "member_id": 7, "member_name": "Ada",
        "team_id": 2, "team_name": "Paddlers", "team_logo_url": "…" },
      { "slot_index": 2, "member_id": null, "member_name": null,
        "team_id": null, "team_name": null, "team_logo_url": null }
      // always exactly 4 entries, slot_index 1–4; empty slots have null member fields
    ]
  }
  ```
- **401**: not logged in.

### PUT `/api/fantasy/team/slots/{slot_index}` — *(requires login)*
Assign or replace the player in a slot.
- Path: `slot_index` 1–4.
- Body: `{ "member_id": int }`
- **200**: same shape as GET `/api/fantasy/team` (fresh team + recomputed compubucks).
- **422**: `slot_index` out of range 1–4.
- **404**: `member_id` does not exist.
- **409**: that member already fills another of this user's slots.

### DELETE `/api/fantasy/team/slots/{slot_index}` — *(requires login)*
Clear a slot (removes the row if present; idempotent).
- **200**: same shape as GET `/api/fantasy/team`.
- **422**: `slot_index` out of range 1–4.

## Player pick-list (public)

### GET `/api/members`
Every real player, for the slot picker. No login required.
- **200**:
  ```json
  { "members": [
      { "id": 7, "name": "Ada", "team_id": 2, "team_name": "Paddlers", "team_logo_url": "…" }
  ] }
  ```
- Ordered by team name, then player name (stable, easy to scan).
