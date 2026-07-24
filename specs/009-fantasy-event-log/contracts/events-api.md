# API & UI Contracts: Fantasy Event Log

## New endpoint

### `GET /api/fantasy/events`

Returns the signed-in manager's events, newest first. Auth: `Authorization: Bearer <token>` via the existing `require_fantasy_user` dependency.

**Response 200**

```json
{
  "events": [
    { "kind": "win",      "member_name": "Ada",  "amount":  5000000, "created_at": "2026-07-24T12:00:05" },
    { "kind": "purchase", "member_name": "Ada",  "amount": -20000000, "created_at": "2026-07-24T11:59:00" }
  ]
}
```

- `kind`: `"purchase" | "sale" | "win" | "loss"`.
- `amount`: signed integer CompuBucks (purchase/loss negative; sale/win positive).
- Order: `created_at` descending, then `id` descending.
- Empty account → `{ "events": [] }` (the frontend shows the empty state).

**Response 401**: missing/invalid token (same as the other `/api/fantasy/*` team endpoints).

No new write endpoints: events are written as a side effect of the **existing** `PUT/DELETE /api/fantasy/team/slots/{i}` (purchase/sale) and of `settle_match`, which the existing admin `PUT /api/admin/matches/{id}/result` already calls.

## Backend contracts

### Pure: `app/fantasy.py`

```python
def slot_game_events(slot, games) -> tuple[list[GameEvent], bool]
# GameEvent = {"won": bool, "amount": int}; second value = booster_consumed.
# INVARIANT: slot_match_delta(slot, games) is derived from this (sum of amounts
# + booster handling) so the banked-balance math is unchanged.
```

### Persistence: `app/events.py` (thin helpers over the model)

```python
def record_purchase(db, user_id, member_name, price) -> None       # amount = -price
def record_sale(db, user_id, member_name, refund) -> None          # amount = +refund
def record_game_results(db, user_id, match_id, member_name,
                        game_events) -> None                       # one win/loss row per game
def clear_match_results(db, user_id, match_id) -> None             # delete win/loss for (user, match)
```

`settle_match` calls `clear_match_results` then `record_game_results` per user (idempotent). `assign_slot`/`clear_slot` call `record_purchase`/`record_sale`.

## Frontend contracts

### `api/fantasy.ts`

```ts
export interface FantasyEvent {
  kind: 'purchase' | 'sale' | 'win' | 'loss'
  member_name: string
  amount: number
  created_at: string
}
export function fetchEvents(): Promise<FantasyEvent[]>  // GET /api/fantasy/events → data.events
```

### `FantasyLog` component

```ts
interface FantasyLogProps { events: FantasyEvent[] }
```

- Renders nothing-but-empty-state when `events` is empty (friendly Norwegian message).
- One row per event: a kind icon/label, the player name, a signed formatted amount (green gain / red spend-or-loss), and a readable timestamp.
- Newest first (as received). Responsive list.

### US2 — sell confirmation modal

The `ConfirmModal` shown when selling states the refund, e.g. `Selg <name> for <refund> CompuBucks?`. The `<refund>` = `refundOf(slot.price_paid)` from `lib/fantasyCart`, equal to the backend `sell_value` recorded on the resulting `sale` event.
