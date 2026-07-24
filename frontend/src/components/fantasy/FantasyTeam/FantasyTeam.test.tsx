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

// slot 1 already has a saved player (Ada); slots 2-4 are empty.
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
  { id: 8, name: 'Finn', team_id: 2, team_name: 'Paddlers', team_logo_url: null, price: 10_000_000 },
  { id: 9, name: 'Guro', team_id: 2, team_name: 'Paddlers', team_logo_url: null, price: 10_000_000 },
  { id: 10, name: 'Ivar', team_id: 2, team_name: 'Paddlers', team_logo_url: null, price: 10_000_000 },
]

// Pick a player into an (empty) slot via the picker. Staging only — no server call.
async function pickInto(slotIndex: number, playerName: RegExp) {
  const slot = screen.getByTestId(`slot-${slotIndex}`)
  fireEvent.click(within(slot).getByRole('button'))
  await screen.findByRole('dialog')
  fireEvent.click(await screen.findByRole('button', { name: playerName }))
}

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

  it('staging a pick does NOT spend money (no assignSlot yet)', async () => {
    render(<FantasyTeam />)
    await screen.findByTestId('slot-2')
    await pickInto(2, /Finn/i)
    // The slot now shows the pick as unsaved, and nothing was bought.
    const slot2 = screen.getByTestId('slot-2')
    expect(within(slot2).getByText('Finn')).toBeInTheDocument()
    expect(within(slot2).getByText(/unsaved/i)).toBeInTheDocument()
    expect(api.assignSlot).not.toHaveBeenCalled()
  })

  it('shows the Save button as soon as something changes, and hides it when reverted', async () => {
    render(<FantasyTeam />)
    await screen.findByTestId('slot-2')
    // nothing staged yet → no Save
    expect(screen.queryByRole('button', { name: /save team/i })).toBeNull()
    await pickInto(2, /Finn/i)
    // one pending pick is enough — no need to fill all four
    expect(await screen.findByRole('button', { name: /save team/i })).toBeInTheDocument()
    // remove the only pending pick → Save disappears again
    const slot2 = screen.getByTestId('slot-2')
    fireEvent.click(within(slot2).getByRole('button', { name: /^remove$/i }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /save team/i })).toBeNull(),
    )
  })

  it('saves a partial team of fewer than four players', async () => {
    render(<FantasyTeam />)
    await screen.findByTestId('slot-2')
    await pickInto(2, /Finn/i)
    fireEvent.click(await screen.findByRole('button', { name: /save team/i }))
    await waitFor(() => expect(api.assignSlot).toHaveBeenCalledWith(2, 8))
    expect(api.assignSlot).toHaveBeenCalledTimes(1)
  })

  it('renders the saved result immediately and clears the cart on Save', async () => {
    let resolve!: (t: api.FantasyTeam) => void
    vi.mocked(api.assignSlot).mockReturnValue(
      new Promise<api.FantasyTeam>((r) => (resolve = r)),
    )
    render(<FantasyTeam />)
    await screen.findByTestId('slot-2')
    await pickInto(2, /Finn/i)
    fireEvent.click(await screen.findByRole('button', { name: /save team/i }))
    // Before the call resolves: the cart is gone and slot 2 shows Finn as saved.
    await waitFor(() => expect(screen.queryByTestId('cart')).toBeNull())
    const slot2 = screen.getByTestId('slot-2')
    expect(within(slot2).getByText('Finn')).toBeInTheDocument()
    expect(within(slot2).queryByText(/unsaved/i)).toBeNull()
    resolve(team)
  })

  it('reverts and shows a message when Save fails', async () => {
    vi.mocked(api.assignSlot).mockRejectedValue(
      new api.ApiError(409, 'Not enough CompuBucks'),
    )
    render(<FantasyTeam />)
    await screen.findByTestId('slot-2')
    await pickInto(2, /Finn/i)
    fireEvent.click(await screen.findByRole('button', { name: /save team/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not enough compubucks/i)
    // re-fetched server truth after the failure (initial load + revert)
    await waitFor(() => expect(api.fetchTeam).toHaveBeenCalledTimes(2))
  })

  it('commits every draft pick when Save is pressed', async () => {
    render(<FantasyTeam />)
    await screen.findByTestId('slot-2')
    await pickInto(2, /Finn/i)
    await pickInto(3, /Guro/i)
    await pickInto(4, /Ivar/i)
    fireEvent.click(await screen.findByRole('button', { name: /save team/i }))
    await waitFor(() => expect(api.assignSlot).toHaveBeenCalledWith(2, 8))
    expect(api.assignSlot).toHaveBeenCalledWith(3, 9)
    expect(api.assignSlot).toHaveBeenCalledWith(4, 10)
  })

  it('asks for confirmation before selling, and only sells on confirm', async () => {
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /^sell$/i }))
    // A Norwegian confirmation modal appears; nothing sold yet.
    expect(await screen.findByText(/er du sikker på at du vil selge ada\?/i)).toBeInTheDocument()
    expect(api.clearSlot).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^selg$/i }))
    await waitFor(() => expect(api.clearSlot).toHaveBeenCalledWith(1))
  })

  it('shows the refund amount in the sell confirmation modal', async () => {
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /^sell$/i }))
    // Ada was bought for 20M → 85% refund = 17M, shown before confirming.
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/17M/i)).toBeInTheDocument()
  })

  it('cancelling the sell modal does not sell', async () => {
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /^sell$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /avbryt/i }))
    await waitFor(() =>
      expect(screen.queryByText(/er du sikker/i)).toBeNull(),
    )
    expect(api.clearSlot).not.toHaveBeenCalled()
  })

  it('gives the Golden Racket to a player', async () => {
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /racket/i }))
    await waitFor(() => expect(api.setRacket).toHaveBeenCalledWith(1))
  })

  it('shows the Golden Racket icon immediately, before the server responds', async () => {
    vi.mocked(api.setRacket).mockReturnValue(new Promise<api.FantasyTeam>(() => {}))
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /racket/i }))
    // The corner badge appears right away, without waiting for the call.
    expect(within(slot1).getByLabelText(/golden racket/i)).toBeInTheDocument()
  })

  it('removes the power-up icon and shows a message when its background save fails', async () => {
    vi.mocked(api.setRacket).mockRejectedValue(new api.ApiError(500, 'Server error'))
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /racket/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/server error/i)
    // reverted to server truth (no racket)
    await waitFor(() =>
      expect(
        within(screen.getByTestId('slot-1')).queryByLabelText(/golden racket/i),
      ).toBeNull(),
    )
  })

  it('buys a Booster from the shop', async () => {
    render(<FantasyTeam />)
    await screen.findByTestId('slot-1')
    const shop = screen.getByRole('region', { name: /booster shop/i })
    fireEvent.click(within(shop).getByRole('button'))
    await waitFor(() => expect(api.buyBooster).toHaveBeenCalled())
  })

  it('shows an error when selling is rejected', async () => {
    vi.mocked(api.clearSlot).mockRejectedValue(new api.ApiError(409, 'Not enough CompuBucks'))
    render(<FantasyTeam />)
    const slot1 = await screen.findByTestId('slot-1')
    fireEvent.click(within(slot1).getByRole('button', { name: /^sell$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^selg$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not enough compubucks/i)
  })
})
