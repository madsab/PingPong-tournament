import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScheduleSection } from './ScheduleSection'
import type { PublicMatch } from '../../api/public'

vi.mock('../../api/public', () => ({
  fetchMatches: vi.fn(),
}))

// Stub the React Flow canvas — this test only covers the section's load/empty/
// error wiring. The diagram itself is tested in ScheduleFlow.test.tsx.
vi.mock('./ScheduleFlow', () => ({
  ScheduleFlow: ({ matches }: { matches: PublicMatch[] }) => (
    <div data-testid="flow">{matches.length} matches</div>
  ),
}))

import { fetchMatches } from '../../api/public'
const mockFetch = vi.mocked(fetchMatches)

const played: PublicMatch = {
  id: 1,
  team_a: { id: 1, name: 'Net Ninjas' },
  team_b: { id: 2, name: 'Table Titans' },
  status: 'completed',
  result: { winner: 'a', games_won_a: 2, games_won_b: 1 },
  games: [],
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ScheduleSection', () => {
  it('renders the flow with the fetched matches when ready', async () => {
    mockFetch.mockResolvedValue([played])
    render(<ScheduleSection />)
    await waitFor(() => expect(screen.getByTestId('flow')).toBeInTheDocument())
    expect(screen.getByTestId('flow')).toHaveTextContent('1 matches')
  })

  it('shows an empty state when there are no matches', async () => {
    mockFetch.mockResolvedValue([])
    render(<ScheduleSection />)
    await waitFor(() =>
      expect(screen.getByText(/no matches scheduled yet/i)).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('flow')).not.toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('boom'))
    render(<ScheduleSection />)
    await waitFor(() =>
      expect(screen.getByText(/couldn’t load the schedule/i)).toBeInTheDocument(),
    )
  })
})
