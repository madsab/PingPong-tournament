# Phase 1 Data Model: Fantasy Event Log

**One new table, `fantasy_events`.** No change to existing tables. Added via Alembic migration `0004` (idempotent, mirroring `FantasySettlement` in `0003`). Because `tests/conftest.py` uses `create_all` and `tests/test_migrations.py` runs `alembic check`, the new SQLAlchemy model and migration `0004` must land together.

## Entity: FantasyEvent

One thing that changed (or attempted to change) a manager's CompuBucks. Append-only — rows are inserted, never updated; win/loss rows for a match may be deleted and rewritten on re-record.

| Field | Type | Notes |
|-------|------|-------|
| `id` | int PK | |
| `user_id` | int FK → `fantasy_users.id` (ON DELETE CASCADE) | the manager this event belongs to |
| `kind` | str | one of `purchase`, `sale`, `win`, `loss` |
| `member_name` | str | denormalized player name (survives player deletion — Edge Case) |
| `amount` | int (signed) | purchase `< 0`, sale `> 0`, win `> 0`, loss `< 0` |
| `match_id` | int FK → `matches.id` (ON DELETE SET NULL), nullable | set for `win`/`loss` (enables idempotent delete+rewrite on re-record); null for `purchase`/`sale` |
| `created_at` | datetime | server default `now()`; ordering key |

**Index**: `(user_id, created_at)` — the log is always "this user's events, newest first" (`ORDER BY created_at DESC, id DESC`).

**Relationships**: `user_id` → `FantasyUser` (a user's events are removed with the user via CASCADE). `match_id` → `Match` with `SET NULL` so deleting a match keeps the historical win/loss entries readable.

## Where rows are written

| Trigger (existing code) | Events written |
|-------------------------|----------------|
| `assign_slot` — buy into empty slot | one `purchase` (amount = −price) |
| `assign_slot` — swap (slot already filled) | one `sale` for the replaced player (amount = +`sell_value(old price_paid)`) **and** one `purchase` for the new player (amount = −price) |
| `clear_slot` — sell | one `sale` (amount = +`sell_value(price_paid)`) |
| `settle_match` (called by admin `record_result`) | per eligible slot, one `win` or `loss` **per game the player played**, amount = actual per-game economy value (racket ×2; booster +50% of base win on first win). On re-record: delete this (user, match)'s existing win/loss events, then rewrite. |

## Validation / invariants

- `kind` is exactly one of the four strings (enforced in code; the pure math only ever emits win/loss, the router only ever emits purchase/sale).
- Win/loss events always carry a `match_id`; purchase/sale events never do.
- Idempotency: at most one set of win/loss events per `(user_id, match_id)` at any time (delete-before-rewrite in `settle_match`).
- Amount sign matches the kind (see table). The sale amount equals the refund shown in the US2 modal and the actual balance increase (SC-003).

## Pure helper (no DB): `app/fantasy.py`

```python
# One event per game the picked player played in a match.
class GameEvent:  # duck-typed dict/namedtuple: {"won": bool, "amount": int}
    ...

def slot_game_events(slot, games) -> tuple[list[GameEvent], bool]:
    """Per-game win/loss amounts for a slot (racket/booster applied), and whether
    the booster was consumed. slot_match_delta() == sum(e.amount) + booster handling,
    re-expressed via this so the two never diverge."""
```

## Output shape (read): `FantasyEventOut` (`app/schemas.py`)

| Field | Type |
|-------|------|
| `kind` | str (`purchase`/`sale`/`win`/`loss`) |
| `member_name` | str |
| `amount` | int (signed) |
| `created_at` | datetime (ISO) |

Returned by `GET /api/fantasy/events` as `{ "events": FantasyEventOut[] }`, newest first, for the token-authenticated user only.
