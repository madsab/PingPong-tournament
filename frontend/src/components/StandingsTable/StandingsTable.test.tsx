import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StandingsTable } from './StandingsTable'
import type { StandingsEntry } from '../../api/standings'

function entry(over: Partial<StandingsEntry>): StandingsEntry {
  return {
    rank: 3,
    team_id: 3,
    team_name: 'Net Ninjas',
    logo_url: null,
    points: 6,
    point_difference: 8,
    played: 3,
    wins: 2,
    draws: 0,
    losses: 1,
    ...over,
  }
}

const rest = [
  entry({ rank: 3, team_id: 3, team_name: 'Net Ninjas', points: 6 }),
  entry({ rank: 4, team_id: 4, team_name: 'Table Titans', points: 3 }),
]

describe('StandingsTable', () => {
  it('lists the teams in rank order', () => {
    render(<StandingsTable entries={rest} />)
    const rows = screen.getAllByRole('row').slice(1) // skip header
    expect(within(rows[0]).getByText('Net Ninjas')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Table Titans')).toBeInTheDocument()
  })

  it('shows rank, played, W-D-L, points and point difference', () => {
    render(<StandingsTable entries={[rest[0]]} />)
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell')
    // Column order: rank, team, played, W-D-L, pts, diff.
    expect(cells[0]).toHaveTextContent('3') // rank
    expect(cells[3]).toHaveTextContent('2-0-1') // W-D-L
    expect(cells[4]).toHaveTextContent('6') // points
    expect(cells[5]).toHaveTextContent('+8') // point diff, signed
  })

  it('renders nothing when there are no rank 3+ teams', () => {
    const { container } = render(<StandingsTable entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the team logo before the team name (FR-004)', () => {
    render(
      <StandingsTable
        entries={[entry({ team_name: 'Net Ninjas', logo_url: '/logos/nn.png' })]}
      />,
    )
    const cell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[1]
    const img = cell.querySelector('img')
    expect(img).toHaveAttribute('src', '/logos/nn.png')
    // Logo comes before the name text within the cell.
    expect(cell.textContent).toContain('Net Ninjas')
    expect(cell.innerHTML.indexOf('img')).toBeLessThan(cell.innerHTML.indexOf('Net Ninjas'))
  })
})
