import { describe, it, expect } from 'vitest'
import { refundOf, netCost, cartTotals, projectTeam } from './fantasyCart'
import type { FantasySlot, FantasyTeam, Player } from '../api/fantasy'

const empty = (i: number): FantasySlot => ({
  slot_index: i,
  member_id: null,
  member_name: null,
  team_id: null,
  team_name: null,
  team_logo_url: null,
  price_paid: 0,
  has_racket: false,
  booster_active: false,
})

const ada: FantasySlot = {
  slot_index: 1,
  member_id: 7,
  member_name: 'Ada',
  team_id: 2,
  team_name: 'Paddlers',
  team_logo_url: null,
  price_paid: 20_000_000,
  has_racket: true,
  booster_active: false,
}

const team: FantasyTeam = {
  balance: 46_000_000,
  boosters_available: 0,
  booster_price: 1_000_000,
  slots: [ada, empty(2), empty(3), empty(4)],
}

const player = (id: number, price: number | null): Player => ({
  id,
  name: `P${id}`,
  team_id: 2,
  team_name: 'Paddlers',
  team_logo_url: null,
  price,
})

describe('refundOf', () => {
  it('gives back 85% of the price paid, floored', () => {
    expect(refundOf(20_000_000)).toBe(17_000_000)
    expect(refundOf(10_000_001)).toBe(8_500_000) // 8_500_000.85 floored
    expect(refundOf(0)).toBe(0)
  })
})

describe('netCost', () => {
  it('is the full price when the slot was empty', () => {
    expect(netCost(player(8, 10_000_000), undefined)).toBe(10_000_000)
    expect(netCost(player(8, 10_000_000), empty(2))).toBe(10_000_000)
  })

  it('subtracts the 85% refund of the replaced player on a swap', () => {
    // replacing Ada (paid 20M → refund 17M) with a 10M player => net -7M
    expect(netCost(player(8, 10_000_000), ada)).toBe(10_000_000 - 17_000_000)
  })

  it('treats a priceless player as 0 price', () => {
    expect(netCost(player(8, null), undefined)).toBe(0)
  })
})

describe('cartTotals', () => {
  it('is zero and not saveable with an empty draft', () => {
    expect(cartTotals(team, new Map())).toEqual({
      total: 0,
      remaining: 46_000_000,
      overBudget: false,
      canSave: false,
    })
  })

  it('sums net costs and allows saving a partial (1-player) team', () => {
    const draft = new Map<number, Player>([[2, player(8, 10_000_000)]])
    const t = cartTotals(team, draft)
    expect(t.total).toBe(10_000_000)
    expect(t.remaining).toBe(36_000_000)
    expect(t.overBudget).toBe(false)
    expect(t.canSave).toBe(true)
  })

  it('flags over budget and blocks saving', () => {
    const draft = new Map<number, Player>([[2, player(8, 99_000_000)]])
    const t = cartTotals(team, draft)
    expect(t.overBudget).toBe(true)
    expect(t.canSave).toBe(false)
    expect(t.remaining).toBe(46_000_000 - 99_000_000)
  })
})

describe('projectTeam', () => {
  it('fills drafted slots and reduces the balance by the total', () => {
    const draft = new Map<number, Player>([
      [2, player(8, 10_000_000)],
      [3, player(9, 5_000_000)],
    ])
    const projected = projectTeam(team, draft)
    expect(projected.balance).toBe(46_000_000 - 15_000_000)
    const slot2 = projected.slots.find((s) => s.slot_index === 2)!
    expect(slot2.member_id).toBe(8)
    expect(slot2.member_name).toBe('P8')
    expect(slot2.price_paid).toBe(10_000_000)
    expect(slot2.has_racket).toBe(false)
    // untouched slots stay as they were
    expect(projected.slots.find((s) => s.slot_index === 1)).toEqual(ada)
    expect(projected.slots.find((s) => s.slot_index === 4)!.member_id).toBeNull()
  })
})
