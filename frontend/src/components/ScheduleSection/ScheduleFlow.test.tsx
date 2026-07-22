import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleFlow } from './ScheduleFlow'
import type { PublicMatch } from '../../api/public'

// Replace the React Flow canvas (which needs real DOM measurement jsdom lacks)
// with a light stub: render each node via its registered component, and forward
// clicks to onNodeClick so we can test the "click a match → open detail" wiring.
vi.mock('@xyflow/react', () => {
  type FakeNode = { id: string; type: string; data: unknown }
  return {
    ReactFlow: ({
      nodes,
      nodeTypes,
      onNodeClick,
    }: {
      nodes: FakeNode[]
      nodeTypes: Record<string, (p: { data: unknown }) => ReactElement>
      onNodeClick?: (e: unknown, n: FakeNode) => void
    }) => (
      <div>
        {nodes.map((n) => {
          const Comp = nodeTypes[n.type]
          return (
            <div key={n.id} data-testid={n.id} onClick={(e) => onNodeClick?.(e, n)}>
              <Comp data={n.data} />
            </div>
          )
        })}
      </div>
    ),
    Background: () => null,
    Controls: () => null,
    Handle: () => null,
    Position: { Left: 'left', Right: 'right' },
  }
})

const played: PublicMatch = {
  id: 1,
  team_a: { id: 1, name: 'Net Ninjas' },
  team_b: { id: 2, name: 'Table Titans' },
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

const scheduled: PublicMatch = {
  id: 2,
  team_a: { id: 1, name: 'Net Ninjas' },
  team_b: { id: 3, name: 'Spin Doctors' },
  status: 'scheduled',
  result: null,
  games: [],
}

describe('ScheduleFlow', () => {
  it('renders a node per match plus a round header', () => {
    render(<ScheduleFlow matches={[played, scheduled]} />)
    expect(screen.getByTestId('match-1')).toBeInTheDocument()
    expect(screen.getByTestId('match-2')).toBeInTheDocument()
    // Played and scheduled land in separate rounds -> two headers.
    expect(screen.getByTestId('round-0')).toBeInTheDocument()
    expect(screen.getByTestId('round-1')).toBeInTheDocument()
  })

  it('opens the match detail when a played match is clicked', async () => {
    render(<ScheduleFlow matches={[played]} />)
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('match-1'))
    // MatchDetail (F4) now shows the game's player names.
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Finn')).toBeInTheDocument()
  })

  it('does not open a detail for a scheduled match', async () => {
    render(<ScheduleFlow matches={[scheduled]} />)
    await userEvent.click(screen.getByTestId('match-2'))
    // Scheduled matches have no games -> no player-name detail.
    expect(screen.queryByText('Spin Doctors', { selector: 'td' })).not.toBeInTheDocument()
  })
})
