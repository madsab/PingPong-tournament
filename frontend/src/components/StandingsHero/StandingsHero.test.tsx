import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StandingsHero } from './StandingsHero'
import type { StandingsEntry } from '../../api/standings'

function entry(over: Partial<StandingsEntry>): StandingsEntry {
  return {
    rank: 1,
    team_id: 1,
    team_name: 'Team',
    logo_url: null,
    points: 0,
    point_difference: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    ...over,
  }
}

const leaders = [
  entry({ rank: 1, team_id: 1, team_name: 'Spin Doctors', points: 9 }),
  entry({ rank: 2, team_id: 2, team_name: 'Paddle Battle', points: 7 }),
]

describe('StandingsHero', () => {
  it('shows rank 1 on the left and rank 2 on the right', () => {
    render(<StandingsHero leaders={leaders} />)
    const left = screen.getByTestId('crest-left')
    const right = screen.getByTestId('crest-right')
    expect(within(left).getByText('Spin Doctors')).toBeInTheDocument()
    expect(within(right).getByText('Paddle Battle')).toBeInTheDocument()
  })

  it('shows both leaders points in the middle (the Rift)', () => {
    render(<StandingsHero leaders={leaders} />)
    const rift = screen.getByTestId('rift')
    expect(within(rift).getByText('9')).toBeInTheDocument()
    expect(within(rift).getByText('7')).toBeInTheDocument()
  })

  it('shows a placeholder opponent when only one team exists (FR-010)', () => {
    render(<StandingsHero leaders={[leaders[0]]} />)
    expect(screen.getByText('Spin Doctors')).toBeInTheDocument()
    expect(screen.getByTestId('placeholder-opponent')).toBeInTheDocument()
  })
})
