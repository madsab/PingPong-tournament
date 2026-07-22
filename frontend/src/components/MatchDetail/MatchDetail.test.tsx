import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MatchDetail } from './MatchDetail'
import type { PublicMatch } from '../../api/public'

function game(over: Partial<PublicMatch['games'][number]>) {
  return {
    member_a_id: 1,
    member_a_name: 'Ada',
    member_b_id: 2,
    member_b_name: 'Ben',
    team_a_score: 11,
    team_b_score: 7,
    ...over,
  }
}

const base: PublicMatch = {
  id: 1,
  team_a: { id: 1, name: 'Spin Doctors', logo_url: '/logos/spin.png' },
  team_b: { id: 2, name: 'Net Ninjas', logo_url: null },
  status: 'completed',
  result: { winner: 'a', games_won_a: 2, games_won_b: 1 },
  games: [game({}), game({ member_a_name: 'Ada', member_b_name: 'Cara', team_a_score: 9, team_b_score: 11 })],
}

describe('MatchDetail', () => {
  it('shows both team names and the winner with the games-won score', () => {
    render(<MatchDetail match={base} />)
    expect(screen.getByText('Spin Doctors')).toBeInTheDocument()
    expect(screen.getByText('Net Ninjas')).toBeInTheDocument()
    expect(screen.getByText(/spin doctors win 2–1/i)).toBeInTheDocument()
  })

  it('shows the team logo before the team name in the header (FR-004)', () => {
    render(<MatchDetail match={base} />)
    const header = screen.getAllByRole('row')[0]
    const th = within(header).getAllByRole('columnheader')[0]
    expect(th.querySelector('img')).toHaveAttribute('src', '/logos/spin.png')
    // Logo precedes the name within the header cell.
    const inner = th.innerHTML
    expect(inner.indexOf('img')).toBeLessThan(inner.indexOf('Spin Doctors'))
  })

  it('lists every game with its two players and score', () => {
    render(<MatchDetail match={base} />)
    const rows = screen.getAllByRole('row').slice(1) // skip header
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Ada')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Ben')).toBeInTheDocument()
    expect(within(rows[0]).getByText('11–7')).toBeInTheDocument()
  })

  it('shows a repeated player across more than one game (§3.2)', () => {
    render(<MatchDetail match={base} />)
    // Ada plays in both games.
    expect(screen.getAllByText('Ada')).toHaveLength(2)
  })

  it('renders a placeholder for a detached player link without breaking the score', () => {
    const detached: PublicMatch = {
      ...base,
      games: [game({ member_b_id: null, member_b_name: null, team_a_score: 11, team_b_score: 4 })],
    }
    render(<MatchDetail match={detached} />)
    const row = screen.getAllByRole('row')[1]
    expect(within(row).getByText('Ada')).toBeInTheDocument()
    expect(within(row).getByText('—')).toBeInTheDocument()
    expect(within(row).getByText('11–4')).toBeInTheDocument()
  })

  it('labels a draw as a draw rather than a winner (§3.4)', () => {
    const draw: PublicMatch = {
      ...base,
      result: { winner: 'draw', games_won_a: 1, games_won_b: 1 },
    }
    render(<MatchDetail match={draw} />)
    expect(screen.getByText(/draw 1–1/i)).toBeInTheDocument()
    expect(screen.queryByText(/win/i)).not.toBeInTheDocument()
  })
})
