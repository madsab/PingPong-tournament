import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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
    setRacket: vi.fn(),
    clearRacket: vi.fn(),
    buyBooster: vi.fn(),
    placeBooster: vi.fn(),
    removeBooster: vi.fn(),
  }
})

const empty = (i: number): api.FantasySlot => ({
  slot_index: i,
  member_id: null,
  member_name: null,
  team_id: null,
  team_name: null,
  team_logo_url: null,
  price_paid: 0,
  has_racket: false,
  booster_active: false,
})

const team: api.FantasyTeam = {
  balance: 46_000_000,
  boosters_available: 0,
  booster_price: 1_000_000,
  slots: [
    {
      slot_index: 1,
      member_id: 7,
      member_name: 'Ada',
      team_id: 2,
      team_name: 'Paddlers',
      team_logo_url: null,
      price_paid: 20_000_000,
      has_racket: false,
      booster_active: false,
    },
    empty(2),
    empty(3),
    empty(4),
  ],
}

const players: api.Player[] = [
  { id: 7, name: 'Ada', team_id: 2, team_name: 'Paddlers', team_logo_url: null, price: 20_000_000 },
  { id: 8, name: 'Finn', team_id: 2, team_name: 'Paddlers', team_logo_url: null, price: 20_000_000 },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchTeam).mockResolvedValue(team)
  vi.mocked(api.fetchMembers).mockResolvedValue(players)
  vi.mocked(api.assignSlot).mockResolvedValue(team)
  vi.mocked(api.clearSlot).mockResolvedValue(team)
  vi.mocked(api.setRacket).mockResolvedValue(team)
  vi.mocked(api.buyBooster).mockResolvedValue(team)
})

describe('FantasyTeam', () => {
  it('renders four player slots', async () => {
    render(<FantasyTeam />)
    await waitFor(() => expect(screen.getByTestId('slot-1')).toBeInTheDocument())
    for (const i of [1, 2, 3, 4]) {
      expect(screen.getByTestId(`slot-${i}`)).toBeInTheDocument()
    }
  })

  it('shows the banked balance', async () => {
    render(<FantasyTeam />)
    await screen.findByTestId('slot-1')
    expect(screen.getByTestId('cb-amount').textContent).toMatch(/46/)
    expect(screen.getByText(/compubucks/i)).toBeInTheDocument()
  })

  it('opens the picker when an empty slot is clicked', async () => {
    render(<FantasyTeam />)
    const slot2 = await screen.findByTestId('slot-2')
    fireEvent.click(within(slot2).getByRole('button')) // the buy area
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('buys a player when picked', async () => {
    render(<FantasyTeam />)
    const slot2 = await screen.findByTestId('slot-2')
    fireEvent.click(within(slot2).getByRole('button'))
    await screen.findByRole('dialog')
    fireEvent.click(await screen.findByRole('button', { name: /Finn/i }))
    await waitFor(() => expect(api.assignSlot).toHaveBeenCalledWith(2, 8))
  })

  it('sells the player from the card', async () => {
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /sell/i }))
    await waitFor(() => expect(api.clearSlot).toHaveBeenCalledWith(1))
  })

  it('gives the Golden Racket to a player', async () => {
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /racket/i }))
    await waitFor(() => expect(api.setRacket).toHaveBeenCalledWith(1))
  })

  it('buys a Booster from the shop', async () => {
    render(<FantasyTeam />)
    await screen.findByTestId('slot-1')
    const shop = screen.getByRole('region', { name: /booster shop/i })
    fireEvent.click(within(shop).getByRole('button'))
    await waitFor(() => expect(api.buyBooster).toHaveBeenCalled())
  })

  it('shows an error when an action is rejected', async () => {
    vi.mocked(api.clearSlot).mockRejectedValue(new api.ApiError(409, 'Not enough CompuBucks'))
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /sell/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not enough compubucks/i)
  })
})
