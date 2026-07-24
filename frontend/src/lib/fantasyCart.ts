// Pure cart / projection math for the fantasy team editor (feature 010).
//
// No React, no I/O — just the CompuBucks arithmetic behind the "shopping cart"
// of staged picks and the optimistic Save. Kept as its own module (like
// scheduleGraph.ts) so the branchy money rules are easy to unit-test and the
// FantasyTeam component stays thin.

import type { FantasySlot, FantasyTeam, Player } from '../api/fantasy'

// Selling a player refunds this share of what you paid for them.
export const SELL_RATE = 0.85

// The CompuBucks you get back for selling a player you paid `pricePaid` for.
export const refundOf = (pricePaid: number) => Math.floor(pricePaid * SELL_RATE)

// Net cost of putting `player` into a slot: their price, minus the refund from
// whoever (if anyone) they replace. An empty slot refunds nothing (full price);
// a swap refunds 85% of the replaced player's price.
export const netCost = (player: Player, replaced: FantasySlot | undefined): number =>
  (player.price ?? 0) - refundOf(replaced?.member_id != null ? replaced.price_paid : 0)

export interface CartTotals {
  total: number
  remaining: number
  overBudget: boolean
  canSave: boolean
}

// Combined cost of every pending pick and what the balance would be after Save.
// `canSave` is true as soon as there is at least one affordable pending change —
// there is NO requirement to fill all four slots (feature 010).
export function cartTotals(team: FantasyTeam, draft: Map<number, Player>): CartTotals {
  const byIndex = new Map(team.slots.map((s) => [s.slot_index, s]))
  let total = 0
  for (const [index, player] of draft) total += netCost(player, byIndex.get(index))
  const remaining = team.balance - total
  const overBudget = remaining < 0
  return { total, remaining, overBudget, canSave: draft.size > 0 && !overBudget }
}

// The team as it will look right after Save: drafted slots filled with their
// picks (fresh clock, no power-ups) and the balance reduced by the total. Used
// to render the result optimistically before the background calls finish.
export function projectTeam(team: FantasyTeam, draft: Map<number, Player>): FantasyTeam {
  const { total } = cartTotals(team, draft)
  const slots = team.slots.map((slot) => {
    const pick = draft.get(slot.slot_index)
    if (!pick) return slot
    return {
      ...slot,
      member_id: pick.id,
      member_name: pick.name,
      team_id: pick.team_id,
      team_name: pick.team_name,
      team_logo_url: pick.team_logo_url,
      price_paid: pick.price ?? 0,
      has_racket: false,
      booster_active: false,
    }
  })
  return { ...team, balance: team.balance - total, slots }
}
