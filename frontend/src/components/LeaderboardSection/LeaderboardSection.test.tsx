import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LeaderboardSection } from './LeaderboardSection'
import type { LeaderboardEntry } from '../../api/public'

// Mock the API module so the component's fetch is controlled per test.
vi.mock('../../api/public', () => ({
  fetchLeaderboard: vi.fn(),
}))

import { fetchLeaderboard } from '../../api/public'
const mockFetch = vi.mocked(fetchLeaderboard)

function entry(over: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    rank: 1,
    member_id: 1,
    member_name: 'Ada',
    team_name: 'Spin Doctors',
    team_logo_url: null,
    played: 3,
    won: 2,
    lost: 1,
    win_pct: 0.667,
    point_difference: 8,
    ...over,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('LeaderboardSection', () => {
  it('renders players in rank order with their stat columns', async () => {
    mockFetch.mockResolvedValue([
      entry({ rank: 1, member_id: 1, member_name: 'Ada', won: 5, lost: 1, win_pct: 0.833, point_difference: 21 }),
      entry({ rank: 2, member_id: 2, member_name: 'Ben', won: 3, lost: 2, win_pct: 0.6, point_difference: 4 }),
    ])
    render(<LeaderboardSection />)

    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())
    const rows = screen.getAllByRole('row').slice(1) // skip header
    expect(within(rows[0]).getByText('Ada')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Ben')).toBeInTheDocument()

    // First row columns: rank, player, team, won, lost, win%, diff.
    const cells = within(rows[0]).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('1')
    expect(cells[3]).toHaveTextContent('5') // won
    expect(cells[4]).toHaveTextContent('1') // lost
    expect(cells[5]).toHaveTextContent('83%') // win % rounded
    expect(cells[6]).toHaveTextContent('+21') // point diff, signed
  })

  it('shows the team logo before the team name in the Team column (FR-004)', async () => {
    mockFetch.mockResolvedValue([
      entry({ member_name: 'Ada', team_name: 'Spin Doctors', team_logo_url: '/logos/spin.png' }),
    ])
    render(<LeaderboardSection />)
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())

    const teamCell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[2]
    expect(teamCell.querySelector('img')).toHaveAttribute('src', '/logos/spin.png')
    expect(teamCell.textContent).toContain('Spin Doctors')
  })

  it('shows an empty state when there are no players', async () => {
    mockFetch.mockResolvedValue([])
    render(<LeaderboardSection />)
    await waitFor(() =>
      expect(screen.getByText(/no players yet/i)).toBeInTheDocument(),
    )
  })

  it('shows an error state when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('boom'))
    render(<LeaderboardSection />)
    await waitFor(() =>
      expect(screen.getByText(/couldn’t load the leaderboard/i)).toBeInTheDocument(),
    )
  })
})
