import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TeamCrest } from './TeamCrest'
import type { StandingsEntry } from '../../api/standings'

function entry(overrides: Partial<StandingsEntry> = {}): StandingsEntry {
  return {
    rank: 1,
    team_id: 1,
    team_name: 'Spin Doctors',
    logo_url: null,
    points: 9,
    point_difference: 12,
    played: 3,
    wins: 3,
    draws: 0,
    losses: 0,
    ...overrides,
  }
}

describe('TeamCrest', () => {
  it('shows the team name and rank', () => {
    render(<TeamCrest entry={entry()} side="left" />)
    expect(screen.getByText('Spin Doctors')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('renders the logo image when logo_url is present', () => {
    render(<TeamCrest entry={entry({ logo_url: '/logos/spin.png' })} side="left" />)
    const img = screen.getByRole('img', { name: /spin doctors/i })
    expect(img).toHaveAttribute('src', '/logos/spin.png')
  })

  it('renders an initials placeholder when logo_url is null (FR-011)', () => {
    render(<TeamCrest entry={entry({ logo_url: null })} side="left" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('SD')).toBeInTheDocument() // Spin Doctors -> SD
  })

  it('keeps the champion crown when the rank-1 team has a logo', () => {
    render(<TeamCrest entry={entry({ rank: 1, logo_url: '/logos/spin.png' })} side="left" />)
    expect(screen.getByRole('img', { name: /spin doctors/i })).toBeInTheDocument()
    expect(screen.getByTestId('champion-crown')).toBeInTheDocument()
  })

  it('falls back to initials (no broken image) when the logo fails to load', () => {
    render(<TeamCrest entry={entry({ logo_url: '/logos/broken.png' })} side="left" />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('SD')).toBeInTheDocument()
  })

  it('shows the champion marker only for rank 1', () => {
    const { rerender } = render(<TeamCrest entry={entry({ rank: 1 })} side="left" />)
    expect(screen.getByTestId('champion-crown')).toBeInTheDocument()

    rerender(<TeamCrest entry={entry({ rank: 2 })} side="right" />)
    expect(screen.queryByTestId('champion-crown')).not.toBeInTheDocument()
  })
})
