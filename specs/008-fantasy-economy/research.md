# Phase 0 Research: Fantasy CompuBucks Economy

The spec left the *behaviour* clear (user answered the three scope questions). The open
questions here are all about **how** to model an economy on top of an app whose whole
style is "compute on read, never store". Each decision below is resolved.

---

## Decision 1 — Banked balance vs compute-on-read (the big one)

**Decision**: Store the balance. `FantasyUser.balance` is an integer that starts at
100,000,000 and is mutated by every event. Cash actions (buy / sell / buy-booster)
change it immediately. Game earnings are **realized once**, when an admin records a
match result, via a `settle_match()` step; the floor is applied at that moment.

**Why**: Three requirements make compute-on-read (the 007 approach) unworkable:

```
1. SELL returns 85% of BUY value  → you must KEEP earnings after selling a player.
                                     Recompute-from-current-roster would delete them.
2. Balance can never go below 0    → the floor is PATH-DEPENDENT: a loss that hits 0
   (FR-013, applied per loss)        forfeits the remainder; later wins start from 0.
                                     A single "sum then clamp" gives a different (wrong)
                                     answer than clamping at each loss.
3. BUY must check affordability    → needs a real balance at the moment of purchase.
```

A banked integer honors all three directly. Earnings become "real money you already
have", exactly what a spend-and-earn game implies.

**Alternatives considered**:

- *Compute-on-read from the current roster* (007 style): simplest, but violates #1 and
  #2 above — rejected.
- *Full event-sourced timeline, recomputed on every read*: perfectly faithful to the
  floor under any edit, but heavy (temporal holding periods, temporal racket/booster
  state). Over-engineering for a fun internal app — rejected (YAGNI).
- *Banked balance + per-match settlement ledger* (**chosen**): banked earnings, floor
  at event time, and idempotent re-settlement on admin edits, without temporal history.

---

## Decision 2 — When and how game earnings are realized

**Decision**: In the admin `PUT /api/admin/matches/{id}/result` endpoint, after the
match's games + `completed_at` are committed, call `settle_match(db, match)`:

```
for each fantasy user who has, in a current slot, a member who played in this match
and whose slot.added_at < match.completed_at:
    reverse any existing settlement for (user, match)      # idempotent re-record
    delta = sum over those slots of the pure per-match payout   # app/fantasy.py
    new_balance = max(0, balance + delta)                  # hard floor
    store FantasySettlement(user, match, applied = new_balance - balance, ...)
    balance = new_balance
```

**Why here**: earnings must be *banked*, so they have to be written down at a definite
moment. Match-record time is that moment, and it is not a hot path (admin action, a
handful of users). Reading each user's **current** slot/racket/booster state at that
moment means power-ups need no temporal history (Decision 4).

**Idempotency / admin edits**: `FantasySettlement (user_id, match_id)` UNIQUE stores the
**actual applied delta** (post-floor effect) and which booster it consumed. Re-recording
a result reverses the stored applied delta (exact, because it's the real effect, so it
composes with the floor) and re-settles. Documented rough edge: under the rare sequence
"admin records match A, then match B, then edits match A", the floor is re-applied in
record order rather than a full chronological replay — acceptable for a fun app and
noted in the spec's spirit (SC-005 still holds: balance is never observed below 0).

---

## Decision 3 — Buy / sell mapped onto existing slot endpoints

**Decision**: Reuse the 007 slot endpoints with economy behaviour instead of inventing
new verbs.

| Action | Endpoint | New behaviour |
|---|---|---|
| Buy into empty slot | `PUT /api/fantasy/team/slots/{i}` | require `member.price` set; require `balance >= price`; deduct; set `price_paid`, reset `added_at`. |
| Swap player | same PUT on a filled slot | first refund 85% of old `price_paid`, then buy new against the refunded balance; clears that slot's racket/booster. |
| Sell / clear | `DELETE /api/fantasy/team/slots/{i}` | refund `floor(0.85 * price_paid)`, empty the slot, drop its racket/booster. |

**Why**: least surprise, least new surface, reuses the existing frontend wiring in
`FantasyTeam.tsx`. Unpriced players (`price is null`) are rejected with a clear message
(FR-002).

---

## Decision 4 — Golden Racket & Booster modelling (no temporal history)

**Decision**: Store power-up state as flags on the current slot, read at settlement time.

- `FantasySlot.has_racket` (bool). At most one true per user — enforced in code with a
  clear message (move = set new, clear others), backed by a partial-unique guard.
- `FantasySlot.booster_active` (bool) = an unused booster is sitting on this player.
- `FantasyUser.boosters_available` (int) = bought-but-not-yet-placed boosters. "One
  booster held at a time" (spec assumption): reject buying while the user already has an
  available or placed unused booster.
- **Consumption** happens inside `settle_match`: the booster applies to the player's
  first game in the settled match (the "next single game", per the user's answer), adds
  +50% of the base win *only on a win*, then `booster_active` is cleared regardless of
  win/loss. If the same player also `has_racket`, the racket amounts apply and the
  booster grants **no** extra (no stacking, FR-022) but is still consumed.

**Why**: because earnings realize at completion using current state, the multiplier a
game gets is simply "whatever the slot's flags are right now". No need to remember where
the racket was last week. Simple and matches the settlement design.

---

## Decision 5 — Admin pricing storage

**Decision**:
- Player price → new nullable `members.price` (integer CompuBucks). `null` = not
  pickable. Exposed on `GET /api/members` and set via the existing
  `PUT /api/admin/members/{id}` (add `price` to the update body) — mirrors how team logo
  was added in 005.
- Booster price → a tiny key/value `settings` table (`key` PK, `value` int). Read/write
  via `GET/PUT /api/admin/settings/booster-price`; defaults to 1,000,000 when absent
  (FR-003). Surfaced to the fantasy UI in the team/shop response.

**Why**: a nullable column is the boring, obvious home for a per-player price. A generic
`settings` table is the smallest way to hold one tunable global without a bespoke table;
it can hold future knobs too but we add only the one key now (YAGNI).

---

## Decision 6 — Migration & existing-user reset

**Decision**: New Alembic migration `0003` (idempotent, in the house style of 0001/0002):
adds `members.price`, `fantasy_users.balance` (default 100,000,000) + `boosters_available`,
`fantasy_slots.price_paid`/`has_racket`/`booster_active`, and the `settings` +
`fantasy_settlements` tables. Per the spec's rollout assumption it **resets existing
fantasy users to 100,000,000 and clears their (free) slot picks**, because "sell for 85%
of buy value" needs a real purchase price and the old picks had none.

**Why**: matches the documented product decision; keeps the sell math honest. Tests still
build tables directly via `create_all` in `conftest.py`, so they need no migration; the
`0003` model↔migration parity is covered by the existing `alembic check` test.

---

## Decision 7 — Constants (single source of truth)

Defined once in `app/fantasy.py` and imported where needed:

| Name | Value |
|---|---|
| `STARTING_BALANCE` | 100_000_000 |
| `WIN_REWARD` | 5_000_000 |
| `LOSS_PENALTY` | 2_000_000 |
| `RACKET_MULTIPLIER` | 2 |
| `BOOSTER_WIN_BONUS` | 0.5 (of base win; applied as +2_500_000, integer) |
| `SELL_RATE` | 0.85 (sell = `floor(0.85 * price_paid)`) |
| `DEFAULT_BOOSTER_PRICE` | 1_000_000 |

All money is whole integers; the only rounding is the sell-back, which floors.

---

## Decision 8 — Frontend visuals

**Decision**: Defer look-and-feel to the `/frontend-design` skill during implementation
(the user asked for it explicitly). This plan only fixes *what* the UI must show: the
balance, per-player price, a golden-racket icon in the card's bottom-right, a booster
icon on the card, and a small shop to buy a booster. Reuse existing CSS-module patterns
and the money formatting already in `CompuBucks`.

**Why**: keeps design decisions in the design phase; keeps this plan implementation-light.
