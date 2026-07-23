import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SlotCard } from './SlotCard'
import type { FantasySlot } from '../../../api/fantasy'

const base: FantasySlot = {
  slot_index: 1,
  member_id: 7,
  member_name: 'Ada',
  team_id: 2,
  team_name: 'Paddlers',
  team_logo_url: null,
  price_paid: 20_000_000,
  has_racket: false,
  booster_active: false,
}

const noop = () => {}

function renderCard(slot: FantasySlot) {
  render(
    <SlotCard
      slot={slot}
      onOpen={noop}
      onToggleRacket={noop}
      onToggleBooster={noop}
      onSell={vi.fn()}
    />,
  )
}

describe('SlotCard', () => {
  it('shows the Golden Racket badge only when the player holds it', () => {
    const { rerender } = render(
      <SlotCard slot={base} onOpen={noop} onToggleRacket={noop} onToggleBooster={noop} onSell={noop} />,
    )
    expect(screen.queryByLabelText('Golden Racket')).toBeNull()
    rerender(
      <SlotCard
        slot={{ ...base, has_racket: true }}
        onOpen={noop}
        onToggleRacket={noop}
        onToggleBooster={noop}
        onSell={noop}
      />,
    )
    expect(screen.getByLabelText('Golden Racket')).toBeInTheDocument()
  })

  it('shows the Booster badge when a Booster is placed', () => {
    renderCard({ ...base, booster_active: true })
    expect(screen.getByLabelText('Booster')).toBeInTheDocument()
  })

  it('an empty slot invites a purchase and has no controls', () => {
    renderCard({
      ...base,
      member_id: null,
      member_name: null,
      price_paid: 0,
    })
    expect(screen.getByText(/buy a player/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sell/i })).toBeNull()
  })
})
