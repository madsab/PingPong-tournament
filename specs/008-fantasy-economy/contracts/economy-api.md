# Contract: Fantasy Economy API

All routes are under `/api/fantasy`, require the fantasy session cookie
(`require_fantasy_user`), and return a **Team view** unless noted. Errors are
`{ "detail": "<clear message>" }` with an appropriate 4xx status. This extends the 007
`fantasy-api.md`; only the economy additions/changes are shown.

## Shared response: Team view

`GET /api/fantasy/team` → `200`

```jsonc
{
  "balance": 100000000,          // banked CompuBucks, never < 0
  "boosters_available": 0,        // bought-but-unplaced boosters (0 or 1)
  "booster_price": 1000000,       // current shop price (from settings)
  "slots": [                      // always 4, slot_index 1..4
    {
      "slot_index": 1,
      "member_id": 12, "member_name": "Alice",
      "team_id": 3, "team_name": "Rockets", "team_logo_url": null,
      "price_paid": 20000000,     // 0 when empty
      "has_racket": true,          // Golden Racket on this player
      "booster_active": false      // unused Booster placed here
    }
    // ...slots 2..4 (empty slots: member_* null, price_paid 0, flags false)
  ]
}
```

`compubucks` from 007 is replaced by `balance`.

## Buy / swap a player (reuses 007 slot PUT)

`PUT /api/fantasy/team/slots/{slot_index}` body `{ "member_id": 12 }` → `200` Team view

- `422` if `member.price` is null (not pickable) or member/slot invalid.
- `409` if the member is already in another of the user's slots.
- `409`/`422` "Not enough CompuBucks" if `balance < price` (after any swap refund).
- Swap: refunds `floor(0.85 * old.price_paid)` first, then charges the new price; resets
  `added_at`; clears that slot's `has_racket`/`booster_active`.

## Sell / clear a player (reuses 007 slot DELETE)

`DELETE /api/fantasy/team/slots/{slot_index}` → `200` Team view

- Refunds `floor(0.85 * price_paid)` to `balance`, empties the slot, drops its
  racket/booster. Idempotent on an already-empty slot (no-op, no refund).

## Golden Racket

`PUT /api/fantasy/team/racket` body `{ "slot_index": 1 }` → `200` Team view

- Sets `has_racket=true` on that filled slot, `false` on all the user's other slots
  (at most one, FR-015). `422` if the slot is empty.

`DELETE /api/fantasy/team/racket` → `200` Team view

- Clears the racket from wherever it is (no-op if unset).

## Booster shop + placement

`POST /api/fantasy/shop/booster` → `200` Team view

- Charges `booster_price`; `boosters_available += 1`.
- `409`/`422` "Not enough CompuBucks" if unaffordable.
- `409` if the user already holds an unused booster (available **or** placed) — one at a
  time (FR-019 + assumption). Re-buyable after the placed one is consumed (FR-024).

`PUT /api/fantasy/team/booster` body `{ "slot_index": 2 }` → `200` Team view

- Requires `boosters_available >= 1` and a filled slot. Sets `booster_active=true`,
  `boosters_available -= 1`. `422`/`409` otherwise.

`DELETE /api/fantasy/team/booster` → `200` Team view

- Un-places an unused booster (`booster_active=false`, `boosters_available += 1`). No-op
  if none placed. (Consumed boosters cannot be recovered.)

## Earnings (no endpoint — server-side effect)

Realized inside admin `record_result` via `settle_match` (see admin-pricing.md and
research.md Decision 2). The user simply sees `balance` change on their next
`GET /api/fantasy/team`. Per-game amounts:

| Situation | Δ balance |
|---|---|
| player wins a game | +5,000,000 |
| player loses a game | −2,000,000 |
| racket player wins / loses | +10,000,000 / −4,000,000 |
| boosted (non-racket) player wins their next game | +7,500,000 (then booster consumed) |
| boosted player loses / non-winning game | normal loss; booster consumed |
| any result would take balance below 0 | balance clamped to 0 |
| game completed before the player was bought | ignored |
