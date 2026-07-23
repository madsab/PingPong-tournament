# Contract: Admin Pricing API

Admin-only (Bearer token, existing `require_admin` guard). Adds player pricing and the
booster price, and hooks the fantasy settlement into result recording.

## Set a player's price (extends existing member update)

`PUT /api/admin/members/{member_id}` body may now include `price`:

```jsonc
{ "name": "Alice", "team_id": 3, "price": 20000000 }   // any field optional
```

- `price`: integer `>= 0` to set a price, or `null` to clear it (player becomes not
  pickable). `422` on negative / non-integer (FR-004).
- Member response (`MemberOut`) now includes `price`.
- Existing `GET /api/members` (public) also returns `price` on each `PlayerOut`, so the
  fantasy picker knows the cost and can disable unpriced players.

Player prices may also be settable on `POST /api/admin/members` (optional `price`), and
shown on the admin teams view — a UI convenience mirroring team-logo editing (005).

## Booster price (global setting)

`GET /api/admin/settings/booster-price` → `200 { "booster_price": 1000000 }`
(returns the default 1,000,000 when unset).

`PUT /api/admin/settings/booster-price` body `{ "booster_price": 1500000 }` → `200 { "booster_price": 1500000 }`

- `422` if negative / non-integer (FR-003/FR-004).

## Result recording now settles fantasy earnings

`PUT /api/admin/matches/{match_id}/result` — unchanged request/response shape. **Side
effect added**: after the match's games and `completed_at` are committed, the server runs
`settle_match(db, match)` which, for every affected fantasy user:

1. reverses any prior `FantasySettlement` for this (user, match) — restoring balance and
   any consumed booster (idempotent re-record);
2. computes the payout from the user's **current** slots whose player played in this
   match and whose `added_at < match.completed_at`, applying racket/booster and the pure
   math in `app/fantasy.py`;
3. applies the hard 0 floor and stores a fresh `FantasySettlement` with the actual
   applied delta and any consumed booster slot.

This is the only place game earnings enter the economy. It is deterministic and covered
by backend tests (pure math + a settle/re-settle API test).
