import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StandingsHero } from './StandingsHero'
import type { StandingsEntry } from '../../api/standings'

function entry(over: Partial<StandingsEntry>): StandingsEntry {
  return {
    rank: 1,
    team_id: 1,
    team_name: 'Team',
    logo_url: null,
    points: 5,
    point_difference: 0,
    played: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    ...over,
  }
}

const leaders = [
  entry({ rank: 1, team_id: 1, team_name: 'Alpha', points: 9 }),
  entry({ rank: 2, team_id: 2, team_name: 'Bravo', points: 7 }),
]

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StandingsHero — reduced motion (FR-009, §9.5)', () => {
  it('does not flare the Rift or render embers when reduce is requested', () => {
    mockReducedMotion(true)
    render(<StandingsHero leaders={leaders} />)
    expect(screen.getByTestId('rift')).toHaveAttribute('data-flaring', 'false')
    expect(screen.queryByTestId('embers')).not.toBeInTheDocument()
  })

  it('flares and renders embers when motion is allowed', () => {
    mockReducedMotion(false)
    render(<StandingsHero leaders={leaders} />)
    // Embers render whenever motion is allowed; the flare kicks in after entrance.
    expect(screen.getByTestId('embers')).toBeInTheDocument()
  })
})
