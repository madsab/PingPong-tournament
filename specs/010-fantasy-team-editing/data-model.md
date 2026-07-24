# Phase 1 Data Model: Fantasy Team Editing

**No persistent data model change.** No new tables, columns, or Alembic migration. The server-side `FantasyUser` / `FantasySlot` model and the fantasy endpoints are reused as-is. All new state introduced by this feature is **client-side and ephemeral** (lives only in `FantasyTeam` component state until committed).

## Client-side state

### Draft (the cart's contents)

The pending, unsaved buys/swaps. Already exists in `FantasyTeam` as `draft: Map<number, Player>` (slot index → chosen player). This feature renders it as the cart and lets each entry be removed.

| Field | Meaning |
|-------|---------|
| key: `slot_index` (1–4) | which box the pending pick targets |
| value: `Player` | the chosen player (id, name, team, price) |

A cart **line** is derived per draft entry:

| Derived field | Rule |
|---------------|------|
| `player` | the draft `Player` |
| `replaces` | the saved player currently in that slot, if any |
| `netCost` | `player.price − refundOf(replaces.price_paid or 0)` (swap refunds 85% of the replaced player; empty slot = full price) |

Cart totals (pure, from the draft + current team):

| Derived value | Rule |
|---------------|------|
| `total` | sum of every line's `netCost` |
| `remaining` | `team.balance − total` |
| `overBudget` | `remaining < 0` |
| `canSave` | `draft.size > 0 && !overBudget` |

### Optimistic team view

While a background Save or power-up call is in flight, the on-screen `team` is the **projected** result (`projectTeam(serverTeam, draft)` for Save; the flag-flipped copy for a power-up). It is replaced by the server's response on success, or by a fresh `loadTeam()` fetch on failure. Nothing here is persisted.

## Pure module: `src/lib/fantasyCart.ts`

Extracted, dependency-free functions (unit-tested), consumed by `FantasyTeam` and `Cart`:

- `refundOf(pricePaid: number): number` — 85% sell refund, floored.
- `netCost(player: Player, replaced: FantasySlot | undefined): number` — net cost of one pending pick.
- `cartTotals(team, draft): { total, remaining, overBudget, canSave }`.
- `projectTeam(team: FantasyTeam, draft: Map<number, Player>): FantasyTeam` — the team as it will look after Save (slots filled with picks, balance reduced by `total`), used for the optimistic render.

## Validation rules (unchanged, enforced by the backend)

- Player must have a price to be picked (`422` otherwise) — the picker already disables unpriced/unaffordable players.
- No duplicate player across slots (`409`).
- Balance never below 0 (`409` on an unaffordable buy). The cart's `canSave`/over-budget guard prevents sending an unaffordable Save, and a backend `409` is the safety net that triggers the revert.
