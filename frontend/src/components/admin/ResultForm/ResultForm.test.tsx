import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResultForm } from './ResultForm'
import type { Match, Team } from '../../../api/admin'

vi.mock('../../../api/admin', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin')>(
    '../../../api/admin',
  )
  return { ...actual, recordResult: vi.fn() }
})

import { recordResult } from '../../../api/admin'

// Team A has 3 members, Team B has 2 → 3 games, B repeats a member (§3.2).
const teamA: Team = {
  id: 1,
  name: 'A',
  logo_url: null,
  members: [
    { id: 11, name: 'Ann', team_id: 1 },
    { id: 12, name: 'Amy', team_id: 1 },
    { id: 13, name: 'Al', team_id: 1 },
  ],
}
const teamB: Team = {
  id: 2,
  name: 'B',
  logo_url: null,
  members: [
    { id: 21, name: 'Bob', team_id: 2 },
    { id: 22, name: 'Ben', team_id: 2 },
  ],
}
const match: Match = {
  id: 5,
  team_a: { id: 1, name: 'A' },
  team_b: { id: 2, name: 'B' },
  status: 'scheduled',
  games: [],
}

// A completed match with saved games: A is the larger team, so each game's
// member_a_id is a team-A member and member_b_id is the repeated team-B member.
const completedMatch: Match = {
  id: 5,
  team_a: { id: 1, name: 'A' },
  team_b: { id: 2, name: 'B' },
  status: 'completed',
  games: [
    { id: 101, member_a_id: 11, member_b_id: 21, team_a_score: 11, team_b_score: 8 },
    { id: 102, member_a_id: 12, member_b_id: 22, team_a_score: 9, team_b_score: 11 },
    { id: 103, member_a_id: 13, member_b_id: 21, team_a_score: 11, team_b_score: 6 },
  ],
}

describe('ResultForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pre-fills scores and player pairings from a completed match', () => {
    render(
      <ResultForm
        match={completedMatch}
        teamA={teamA}
        teamB={teamB}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const aScores = screen.getAllByLabelText(/team A score/i) as HTMLInputElement[]
    const bScores = screen.getAllByLabelText(/team B score/i) as HTMLInputElement[]
    expect(aScores.map((i) => i.value)).toEqual(['11', '9', '11'])
    expect(bScores.map((i) => i.value)).toEqual(['8', '11', '6'])
    // The smaller team (B) is a select; its saved members are pre-selected.
    const bPlayers = screen.getAllByLabelText(/team B player/i) as HTMLSelectElement[]
    expect(bPlayers.map((s) => s.value)).toEqual(['21', '22', '21'])
  })

  it('lets the organiser edit a pre-filled score and save it', async () => {
    const onSaved = vi.fn()
    vi.mocked(recordResult).mockResolvedValue(completedMatch)
    render(
      <ResultForm
        match={completedMatch}
        teamA={teamA}
        teamB={teamB}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    )
    const aScores = screen.getAllByLabelText(/team A score/i)
    await userEvent.clear(aScores[0])
    await userEvent.type(aScores[0], '7')

    await userEvent.click(screen.getByRole('button', { name: /save result/i }))

    expect(recordResult).toHaveBeenCalledWith(5, expect.any(Array))
    const games = vi.mocked(recordResult).mock.calls[0][1]
    expect(games).toHaveLength(3)
    expect(games[0].team_a_score).toBe(7)
    expect(onSaved).toHaveBeenCalled()
  })

  it('pre-fills scores and does not crash when a saved player is missing', () => {
    const orphaned: Match = {
      ...completedMatch,
      games: [{ id: 201, member_a_id: null, member_b_id: null, team_a_score: 11, team_b_score: 5 }],
    }
    render(
      <ResultForm match={orphaned} teamA={teamA} teamB={teamB} onSaved={vi.fn()} onCancel={vi.fn()} />,
    )
    const aScores = screen.getAllByLabelText(/team A score/i) as HTMLInputElement[]
    expect(aScores).toHaveLength(1)
    expect(aScores[0].value).toBe('11')
  })

  it('renders one game row per larger-team member', () => {
    render(
      <ResultForm match={match} teamA={teamA} teamB={teamB} onSaved={vi.fn()} onCancel={vi.fn()} />,
    )
    // 3 games → 3 team-A score inputs.
    expect(screen.getAllByLabelText(/team A score/i)).toHaveLength(3)
    // The smaller team (B) is selectable so it can repeat a member.
    expect(screen.getAllByLabelText(/team B player/i)).toHaveLength(3)
  })

  it('blocks saving until all scores are valid, then submits', async () => {
    const onSaved = vi.fn()
    vi.mocked(recordResult).mockResolvedValue(match)
    render(
      <ResultForm match={match} teamA={teamA} teamB={teamB} onSaved={onSaved} onCancel={vi.fn()} />,
    )

    const save = screen.getByRole('button', { name: /save result/i })
    expect(save).toBeDisabled() // no scores yet

    const aScores = screen.getAllByLabelText(/team A score/i)
    const bScores = screen.getAllByLabelText(/team B score/i)
    for (let i = 0; i < 3; i++) {
      await userEvent.type(aScores[i], '11')
      await userEvent.type(bScores[i], '7')
    }

    expect(save).toBeEnabled()
    await userEvent.click(save)

    expect(recordResult).toHaveBeenCalledWith(5, expect.any(Array))
    const games = vi.mocked(recordResult).mock.calls[0][1]
    expect(games).toHaveLength(3)
    expect(onSaved).toHaveBeenCalled()
  })

  it('keeps save disabled when a game would be a tie', async () => {
    render(
      <ResultForm match={match} teamA={teamA} teamB={teamB} onSaved={vi.fn()} onCancel={vi.fn()} />,
    )
    const aScores = screen.getAllByLabelText(/team A score/i)
    const bScores = screen.getAllByLabelText(/team B score/i)
    for (let i = 0; i < 3; i++) {
      await userEvent.type(aScores[i], '9')
      await userEvent.type(bScores[i], '9') // tie → invalid
    }
    expect(screen.getByRole('button', { name: /save result/i })).toBeDisabled()
  })
})
