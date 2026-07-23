import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FantasyTeam } from './FantasyTeam'
import * as api from '../../../api/fantasy'

vi.mock('../../../api/fantasy', async () => {
  const actual = await vi.importActual<typeof import('../../../api/fantasy')>(
    '../../../api/fantasy',
  )
  return {
    ...actual,
    fetchTeam: vi.fn(),
    fetchMembers: vi.fn(),
    assignSlot: vi.fn(),
    clearSlot: vi.fn(),
  }
})

const team: api.FantasyTeam = {
  compubucks: 46,
  slots: [
    { slot_index: 1, member_id: 7, member_name: 'Ada', team_id: 2, team_name: 'Paddlers', team_logo_url: null },
    { slot_index: 2, member_id: null, member_name: null, team_id: null, team_name: null, team_logo_url: null },
    { slot_index: 3, member_id: null, member_name: null, team_id: null, team_name: null, team_logo_url: null },
    { slot_index: 4, member_id: null, member_name: null, team_id: null, team_name: null, team_logo_url: null },
  ],
}

const players: api.Player[] = [
  { id: 7, name: 'Ada', team_id: 2, team_name: 'Paddlers', team_logo_url: null },
  { id: 8, name: 'Finn', team_id: 2, team_name: 'Paddlers', team_logo_url: null },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchTeam).mockResolvedValue(team)
  vi.mocked(api.fetchMembers).mockResolvedValue(players)
  vi.mocked(api.assignSlot).mockResolvedValue(team)
  vi.mocked(api.clearSlot).mockResolvedValue(team)
})

describe('FantasyTeam', () => {
  it('renders four player slots', async () => {
    render(<FantasyTeam />)
    await waitFor(() => expect(screen.getByTestId('slot-1')).toBeInTheDocument())
    for (const i of [1, 2, 3, 4]) {
      expect(screen.getByTestId(`slot-${i}`)).toBeInTheDocument()
    }
  })

  it('shows the CompuBucks total', async () => {
    render(<FantasyTeam />)
    expect(await screen.findByText('46')).toBeInTheDocument()
    expect(screen.getByText(/compubucks/i)).toBeInTheDocument()
  })

  it('opens the picker when a slot is clicked', async () => {
    render(<FantasyTeam />)
    fireEvent.click(await screen.findByTestId('slot-2'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('assigns a player when picked', async () => {
    render(<FantasyTeam />)
    fireEvent.click(await screen.findByTestId('slot-2'))
    await screen.findByRole('dialog')
    fireEvent.click(await screen.findByRole('button', { name: /Finn/i }))
    await waitFor(() => expect(api.assignSlot).toHaveBeenCalledWith(2, 8))
  })

  it('clears a slot from the picker', async () => {
    render(<FantasyTeam />)
    fireEvent.click(await screen.findByTestId('slot-1'))
    await screen.findByRole('dialog')
    fireEvent.click(await screen.findByRole('button', { name: /clear this slot/i }))
    await waitFor(() => expect(api.clearSlot).toHaveBeenCalledWith(1))
  })
})
