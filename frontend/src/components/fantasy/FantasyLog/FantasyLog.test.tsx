import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FantasyLog } from './FantasyLog'
import type { FantasyEvent } from '../../../api/fantasy'

const ev = (over: Partial<FantasyEvent> = {}): FantasyEvent => ({
  kind: 'purchase',
  member_name: 'Ada',
  amount: -20_000_000,
  created_at: '2026-07-24T12:00:00',
  ...over,
})

describe('FantasyLog', () => {
  it('shows a friendly empty state when there are no events', () => {
    render(<FantasyLog events={[]} />)
    expect(screen.getByText(/ingen hendelser/i)).toBeInTheDocument()
  })

  it('renders one row per event with the player and a signed amount', () => {
    render(
      <FantasyLog
        events={[
          ev({ kind: 'purchase', member_name: 'Ada', amount: -20_000_000 }),
          ev({ kind: 'win', member_name: 'Ada', amount: 5_000_000 }),
        ]}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText(/kjøpte ada/i)).toBeInTheDocument()
    // a spend shows a minus, a win shows a plus
    expect(screen.getByText(/-20M/i)).toBeInTheDocument()
    expect(screen.getByText(/\+5M/i)).toBeInTheDocument()
  })

  it('keeps the order it is given (newest first)', () => {
    render(
      <FantasyLog
        events={[
          ev({ kind: 'sale', member_name: 'Bea', amount: 17_000_000 }),
          ev({ kind: 'purchase', member_name: 'Ada', amount: -20_000_000 }),
        ]}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]).getByText(/solgte bea/i)).toBeInTheDocument()
    expect(within(rows[1]).getByText(/kjøpte ada/i)).toBeInTheDocument()
  })
})
