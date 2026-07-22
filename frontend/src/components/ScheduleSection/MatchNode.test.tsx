import type { ComponentProps } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MatchNode } from './MatchNode'
import type { PublicMatch } from '../../api/public'

// The Handle/Position bits need React Flow's store; stub them since this test
// only cares about the card's content.
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}))

function node(match: PublicMatch) {
  // MatchNode reads only `data`; the rest of NodeProps is irrelevant here.
  const props = { data: { match } } as unknown as ComponentProps<typeof MatchNode>
  return <MatchNode {...props} />
}

const completed: PublicMatch = {
  id: 1,
  team_a: { id: 1, name: 'Spin Doctors', logo_url: '/logos/spin.png' },
  team_b: { id: 2, name: 'Net Ninjas', logo_url: null },
  status: 'completed',
  result: { winner: 'a', games_won_a: 2, games_won_b: 1 },
  games: [],
}

describe('MatchNode', () => {
  it('shows both teams and the games-won score for a played match', () => {
    render(node(completed))
    expect(screen.getByText('Spin Doctors')).toBeInTheDocument()
    expect(screen.getByText('Net Ninjas')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows a Scheduled chip and no score for a to-play match', () => {
    const scheduled: PublicMatch = {
      ...completed,
      status: 'scheduled',
      result: null,
    }
    render(node(scheduled))
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('chips a drawn match as a draw', () => {
    const draw: PublicMatch = {
      ...completed,
      result: { winner: 'draw', games_won_a: 1, games_won_b: 1 },
    }
    render(node(draw))
    expect(screen.getByText('Draw')).toBeInTheDocument()
  })

  it('shows the team logo before the team name (FR-004)', () => {
    const { container } = render(node(completed))
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/logos/spin.png')
    // Logo precedes the team name in the DOM order of the row.
    const html = container.innerHTML
    expect(html.indexOf('img')).toBeLessThan(html.indexOf('Spin Doctors'))
  })

  it('marks the winning team row as the winner', () => {
    const { container } = render(node(completed))
    // The winner row carries a second class (the CSS-module winner modifier).
    const winnerRow = within(container).getByText('Spin Doctors').closest('div')
    expect(winnerRow?.className.split(' ').length).toBeGreaterThan(1)
  })
})
