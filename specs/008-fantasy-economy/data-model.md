# Phase 1 Data Model: Fantasy CompuBucks Economy

All changes sit on top of the existing schema. New/changed fields are **bold**. Tables
not shown (Team, Match, Game) are unchanged.

## Changed tables

### `members` (existing)

| Field | Type | Notes |
|---|---|---|
| id, name, team_id | — | unchanged |
| **price** | integer, **nullable** | CompuBucks cost to buy this player. `null` = not priced → **not pickable** (FR-002). Must be `>= 0` when set (FR-001/FR-004). |

### `fantasy_users` (existing, 007)

| Field | Type | Notes |
|---|---|---|
| id, name, name_key, fun_fact, created_at | — | unchanged |
| **balance** | integer, not null, default 100_000_000 | The banked CompuBucks total. Never `< 0` (FR-013). |
| **boosters_available** | integer, not null, default 0 | Bought-but-not-yet-placed boosters. `0` or `1` in practice (one at a time, per spec). |

### `fantasy_slots` (existing, 007)

| Field | Type | Notes |
|---|---|---|
| id, user_id, slot_index, member_id, added_at | — | unchanged; UNIQUE(user,slot_index), UNIQUE(user,member_id), slot_index 1–4 all kept |
| **price_paid** | integer, not null, default 0 | What the user paid for the player now in this slot. Basis for the 85% sell-back (FR-007/FR-008). |
| **has_racket** | boolean, not null, default false | Golden Racket on this player. **At most one true per user** (FR-015, enforced in code + partial-unique guard). |
| **booster_active** | boolean, not null, default false | An unused Booster is placed on this player (FR-020/FR-023). |

## New tables

### `settings` — one tunable global (booster price)

| Field | Type | Notes |
|---|---|---|
| key | string, primary key | e.g. `"booster_price"` |
| value | integer, not null | Booster price in CompuBucks. Absent → default 1,000,000 (FR-003). |

### `fantasy_settlements` — idempotent per-match payout record

| Field | Type | Notes |
|---|---|---|
| id | integer, pk | |
| user_id | FK → fantasy_users (CASCADE) | |
| match_id | FK → matches (CASCADE) | |
| applied_delta | integer, not null | The **actual** balance change this match caused the user (post-floor). Reversed exactly on re-record (Decision 2). |
| consumed_booster_slot_index | integer, nullable | Which slot's booster this match consumed (so reversal can restore it), or `null`. |
| — constraint | UNIQUE(user_id, match_id) | one settlement per user per match |

## Relationships (unchanged shape)

```
Team 1───* Member ──(price)          Member *───1 FantasySlot 1───1 FantasyUser
                                                  (price_paid,           (balance,
Match 1───* Game (member_a/b_id)                   has_racket,           boosters_available)
Match 1───* FantasySettlement *───1 FantasyUser    booster_active)
```

## Validation rules (from Requirements)

| Rule | Where enforced | Req |
|---|---|---|
| price is a whole number `>= 0` (or null) | admin schema validator + backend | FR-001/FR-004 |
| unpriced player cannot be bought | fantasy buy endpoint (422) | FR-002 |
| balance `>= price` to buy | fantasy buy endpoint (409/422) | FR-006 |
| record price_paid on buy | fantasy buy endpoint | FR-007 |
| sell returns `floor(0.85 * price_paid)` | fantasy sell/swap | FR-008 |
| no duplicate player per user | existing UNIQUE + code | FR-009 |
| balance never `< 0` | `max(0, …)` at every mutation | FR-013 |
| only games completed after `added_at` count | `settle_match` filter | FR-011/FR-014 |
| at most one racket per user | racket endpoint clears others | FR-015 |
| racket doubles win **and** loss | pure payout math | FR-016 |
| booster: +50% on next winning game only, then consumed; no stack with racket | `settle_match` + pure math | FR-021/FR-022 |
| one booster held at a time; re-buyable after consumption | shop endpoint guard | FR-019/FR-024 |
| everything validated server-side | schemas + endpoints | FR-025 |
| per-user isolation | `require_fantasy_user` session | FR-026 |

## State transitions

**A slot** (per user, per box):

```
empty ──buy(price≤balance)──► filled(price_paid, added_at=now)
filled ──sell/clear──► empty            (+floor(0.85*price_paid), racket/booster dropped)
filled ──swap──► filled(new)            (refund old, buy new, clock reset, racket/booster dropped)
filled ──assign racket──► filled+racket (others' has_racket cleared)
filled ──place booster──► filled+booster (boosters_available -=1)
filled+booster ──settle_match plays a game──► filled  (booster consumed; +50% if won & no racket)
```

**A booster** (per user): `none → available (bought) → placed → consumed → none/available-again`.

## Constants

See research.md Decision 7. Money is integer CompuBucks; the only rounding is the
floored 85% sell-back.
