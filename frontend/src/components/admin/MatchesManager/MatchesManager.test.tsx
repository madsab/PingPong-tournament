import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MatchesManager } from './MatchesManager'
import type { Match, Team } from '../../../api/admin'

vi.mock('../../../api/admin', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin')>(
    '../../../api/admin',
  )
  return {
    ...actual,
    listTeams: vi.fn(),
    listMatches: vi.fn(),
    generateSchedule: vi.fn(),
    createMatch: vi.fn(),
    deleteMatch: vi.fn(),
  }
})

import {
  createMatch,
  deleteMatch,
  generateSchedule,
  listMatches,
  listTeams,
} from '../../../api/admin'

const TEAMS: Team[] = [
  { id: 1, name: 'A', logo_url: null, members: [{ id: 11, name: 'Ann', team_id: 1 }] },
  { id: 2, name: 'B', logo_url: null, members: [{ id: 21, name: 'Bob', team_id: 2 }] },
]
const MATCHES: Match[] = [
  { id: 5, team_a: { id: 1, name: 'A' }, team_b: { id: 2, name: 'B' }, status: 'scheduled', games: [] },
]
// A completed match: 3 games, team A wins 2, team B wins 1 → score "2 – 1".
const COMPLETED_MATCHES: Match[] = [
  {
    id: 6,
    team_a: { id: 1, name: 'A' },
    team_b: { id: 2, name: 'B' },
    status: 'completed',
    games: [
      { id: 1, member_a_id: 11, member_b_id: 21, team_a_score: 11, team_b_score: 8 },
      { id: 2, member_a_id: 11, member_b_id: 21, team_a_score: 9, team_b_score: 11 },
      { id: 3, member_a_id: 11, member_b_id: 21, team_a_score: 11, team_b_score: 6 },
    ],
  },
]

describe('MatchesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listTeams).mockResolvedValue(TEAMS)
    vi.mocked(listMatches).mockResolvedValue(MATCHES)
    vi.mocked(generateSchedule).mockResolvedValue({ created: 1, skipped: 0 })
    vi.mocked(createMatch).mockResolvedValue(MATCHES[0])
    vi.mocked(deleteMatch).mockResolvedValue(undefined)
  })

  it('lists matches with their status', async () => {
    render(<MatchesManager />)
    expect(await screen.findByText('A vs B')).toBeInTheDocument()
    expect(screen.getByText('scheduled')).toBeInTheDocument()
  })

  it('shows the games-won score on a completed match card', async () => {
    vi.mocked(listMatches).mockResolvedValue(COMPLETED_MATCHES)
    render(<MatchesManager />)
    expect(await screen.findByText('A vs B')).toBeInTheDocument()
    // Team A won 2 of 3 games, team B won 1 → "2 – 1".
    expect(screen.getByText(/2\s*–\s*1/)).toBeInTheDocument()
  })

  it('shows no score for a match with no recorded games', async () => {
    render(<MatchesManager />) // default MATCHES is scheduled with games: []
    await screen.findByText('A vs B')
    expect(screen.queryByText(/\d+\s*–\s*\d+/)).not.toBeInTheDocument()
  })

  it('generates the round-robin and refreshes', async () => {
    render(<MatchesManager />)
    await screen.findByText('A vs B')

    await userEvent.click(screen.getByRole('button', { name: /generate round-robin/i }))

    expect(generateSchedule).toHaveBeenCalled()
    // listMatches is called once on mount and again after generating.
    await waitFor(() => expect(listMatches).toHaveBeenCalledTimes(2))
  })

  it('deletes a match', async () => {
    render(<MatchesManager />)
    await screen.findByText('A vs B')
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => expect(deleteMatch).toHaveBeenCalledWith(5))
  })

  it('opens the result form for a match', async () => {
    render(<MatchesManager />)
    await screen.findByText('A vs B')
    await userEvent.click(screen.getByRole('button', { name: /record result/i }))
    expect(screen.getByRole('button', { name: /save result/i })).toBeInTheDocument()
  })
})
