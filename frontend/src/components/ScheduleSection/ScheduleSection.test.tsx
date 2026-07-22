import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScheduleSection } from './ScheduleSection'
import type { PublicMatch } from '../../api/public'

vi.mock('../../api/public', () => ({
  fetchMatches: vi.fn(),
}))

import { fetchMatches } from '../../api/public'
const mockFetch = vi.mocked(fetchMatches)

const scheduled: PublicMatch = {
  id: 1,
  team_a: { id: 1, name: 'Spin Doctors' },
  team_b: { id: 2, name: 'Paddle Battle' },
  status: 'scheduled',
  result: null,
  games: [],
}

const played: PublicMatch = {
  id: 2,
  team_a: { id: 1, name: 'Net Ninjas' },
  team_b: { id: 3, name: 'Table Titans' },
  status: 'completed',
  result: { winner: 'a', games_won_a: 2, games_won_b: 1 },
  games: [
    {
      member_a_id: 3,
      member_a_name: 'Ada',
      member_b_id: 8,
      member_b_name: 'Finn',
      team_a_score: 11,
      team_b_score: 7,
    },
  ],
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ScheduleSection', () => {
  it('splits matches into to-play and played groups, each once', async () => {
    mockFetch.mockResolvedValue([scheduled, played])
    render(<ScheduleSection />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'To play' })).toBeInTheDocument(),
    )
    // Both team pairings appear exactly once (team name shares a span with "vs").
    expect(screen.getAllByText(/spin doctors/i)).toHaveLength(1)
    expect(screen.getAllByText(/net ninjas/i)).toHaveLength(1)
    // The played match shows its games-won score.
    expect(screen.getByText('2–1')).toBeInTheDocument()
    // The scheduled match has no result, just a "Scheduled" marker.
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('expands a played match to its detail on click', async () => {
    mockFetch.mockResolvedValue([played])
    render(<ScheduleSection />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /net ninjas/i })).toBeInTheDocument(),
    )
    // Detail hidden until clicked.
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /net ninjas/i }))
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Finn')).toBeInTheDocument()
  })

  it('shows per-group empty states', async () => {
    mockFetch.mockResolvedValue([played]) // no scheduled matches
    render(<ScheduleSection />)
    await waitFor(() =>
      expect(screen.getByText(/no matches scheduled/i)).toBeInTheDocument(),
    )
  })

  it('shows a draw label on a drawn match', async () => {
    const draw: PublicMatch = {
      ...played,
      id: 5,
      result: { winner: 'draw', games_won_a: 1, games_won_b: 1 },
    }
    mockFetch.mockResolvedValue([draw])
    render(<ScheduleSection />)
    await waitFor(() => expect(screen.getByText(/draw/i)).toBeInTheDocument())
    const row = screen.getByRole('button', { name: /net ninjas/i })
    expect(within(row).getByText(/draw 1–1/i)).toBeInTheDocument()
  })
})
