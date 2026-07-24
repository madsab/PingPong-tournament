# Phase 0 Research: Fantasy Event Log

All questions resolved by reading the current backend (`app/fantasy.py`, `app/settlement.py`, `app/routers/fantasy.py`, `app/routers/admin.py`, `app/models.py`) and the spec. No `NEEDS CLARIFICATION` remain.

## Decision 1 — Store events (banked), do not compute on read

- **Decision**: Add an append-only `fantasy_events` table and write a row at each economy event.
- **Rationale**: **Purchases and sales are recorded nowhere today** — `assign_slot` and `clear_slot` change `FantasyUser.balance` and return, keeping no history. There is no data from which a purchase/sale could be reconstructed after the fact, so a compute-on-read log is impossible for two of the four event kinds. Storing events is also consistent with feature 008, which already abandoned compute-on-read for the *balance* precisely because a spend-and-earn economy is path-dependent. This is the same reasoning, so it is not a new architectural precedent.
- **Alternatives considered**: (a) Compute-on-read from existing rows — impossible for purchase/sale; win/loss would need per-game historical roster state that isn't retained. Rejected. (b) Reuse `fantasy_settlements` for win/loss — it stores one *net* delta per (user, match), not per-game with a player name, so it cannot satisfy FR-002/FR-004. Rejected.

## Decision 2 — Win/loss granularity is per game, from one pure source of truth

- **Decision**: Add a pure `slot_game_events(slot, games) -> (list[GameEvent], booster_consumed)` to `app/fantasy.py` that returns one `{won, amount}` per game the picked player played, applying the racket multiplier per game and the booster (+50% of base win, first game, win only, no stack with racket). Re-express the existing `slot_match_delta` as the sum of these amounts so the two never drift. `settlement.py` writes one `win`/`loss` event per returned game event.
- **Rationale**: The spec is explicit — "one game = one +/- event" (FR-002, Edge Cases). Deriving both the per-game events and the net delta from a single function keeps settlement's banked-balance behaviour byte-for-byte identical while adding the granularity the log needs (Principle II, no duplicated rules).
- **Alternatives considered**: One aggregate win/loss event per match — simpler but contradicts the spec's per-game requirement. Rejected.

## Decision 3 — Idempotent win/loss on re-record

- **Decision**: In `settle_match`, when reversing a match's prior settlement for a user, also **delete that (user, match)'s existing win/loss events** and rewrite them from the fresh games. Purchase/sale events are never touched by settlement.
- **Rationale**: `record_result` already re-runs `settle_match` on re-record (reversing + re-applying the balance). Mirroring that delete-then-rewrite for events guarantees exactly one set of win/loss events per (user, match) (FR-009, SC-002). `match_id` on the event row is what makes the targeted delete possible.
- **Alternatives considered**: Append corrective events instead of rewriting — leaves confusing duplicate/negating rows in the user-facing log. Rejected.

## Decision 4 — The floor (never-below-0) and event amounts

- **Decision**: Win/loss event `amount` is the per-game economy amount (base × racket, + booster on the first win). The balance floor (`clamp0`) is applied once per match as today. In the rare case a match's losses would drive a balance below 0, the summed event amounts can exceed the actual applied delta.
- **Rationale**: Per-game attribution of a match-level floor is inherently ambiguous, and `settlement.py` already documents the clamp as "a documented approximation" for rare interleavings. Managers start at 100,000,000 and games move ±2–10M, so the floor almost never bites. Event amounts are therefore exact in the common case (SC-004) and a documented approximation only when the floor triggers — the same stance feature 008 takes.
- **Alternatives considered**: Distribute the clamp proportionally across per-game events — added complexity for a case that effectively never occurs. Rejected (YAGNI).

## Decision 5 — Swap = a sale + a purchase in the log

- **Decision**: `assign_slot` on an already-filled slot (a swap) writes a **sale** event for the replaced player (amount = +85% refund) and a **purchase** event for the new player (amount = −price). A buy into an empty slot writes only a purchase. `clear_slot` writes a sale.
- **Rationale**: A swap is economically a sell-then-buy (the endpoint already refunds the old before charging the new). Logging both is the faithful, unambiguous record and reuses the amounts the endpoint already computes. Fits feature 010's cart, where a swap turns into one `assign_slot` call.
- **Alternatives considered**: Log a swap as a single combined event — loses the refund detail managers care about. Rejected.

## Decision 6 — Amount sign convention & player-name durability

- **Decision**: `amount` is a signed integer: purchase negative, sale positive, win positive, loss negative. Store the player's `member_name` denormalized on the event.
- **Rationale**: Signed amounts make the log render and any future totals trivial (SC-004). A denormalized name keeps historical entries readable after an admin deletes a player (Edge Case) without a join to a possibly-gone `Member`.

## Decision 7 — US2 sell modal is a frontend change

- **Decision**: The sell confirmation modal shows the refund amount before commit; the value comes from `refundOf(price_paid)` (frontend `lib/fantasyCart`), which equals the backend `sell_value(price_paid)` the sale event records.
- **Rationale**: The refund is already computable on the client; showing it needs only a richer modal message. `int(0.85·x)` (backend) and `Math.floor(0.85·x)` (frontend) agree for positive values, so the modal, the balance change, and the sale event all match (SC-003).
