import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamsManager } from './TeamsManager'
import type { Team } from '../../../api/admin'

vi.mock('../../../api/admin', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin')>(
    '../../../api/admin',
  )
  return {
    ...actual,
    listTeams: vi.fn(),
    createTeam: vi.fn(),
    renameTeam: vi.fn(),
    updateTeamLogo: vi.fn(),
    deleteTeam: vi.fn(),
    createMember: vi.fn(),
    renameMember: vi.fn(),
    deleteMember: vi.fn(),
  }
})

import {
  createMember,
  createTeam,
  deleteTeam,
  listTeams,
  renameTeam,
  updateTeamLogo,
} from '../../../api/admin'

const TEAMS: Team[] = [
  {
    id: 1,
    name: 'Spin Doctors',
    logo_url: 'https://cdn.example/existing.png',
    members: [{ id: 10, name: 'Ann', team_id: 1 }],
  },
]

describe('TeamsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listTeams).mockResolvedValue(TEAMS)
    vi.mocked(createTeam).mockResolvedValue(TEAMS[0])
    vi.mocked(renameTeam).mockResolvedValue(TEAMS[0])
    vi.mocked(updateTeamLogo).mockResolvedValue(TEAMS[0])
    vi.mocked(deleteTeam).mockResolvedValue(undefined)
    vi.mocked(createMember).mockResolvedValue(TEAMS[0].members[0])
  })

  it('lists teams and their members', async () => {
    render(<TeamsManager />)
    expect(await screen.findByDisplayValue('Spin Doctors')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ann')).toBeInTheDocument()
  })

  it('creates a team with an optional logo URL', async () => {
    render(<TeamsManager />)
    await screen.findByDisplayValue('Spin Doctors')

    await userEvent.type(screen.getByLabelText(/new team name/i), 'Net Ninjas')
    await userEvent.type(
      screen.getByLabelText(/new team logo url/i),
      'https://cdn.example/nn.png',
    )
    await userEvent.click(screen.getByRole('button', { name: /add team/i }))

    expect(createTeam).toHaveBeenCalledWith('Net Ninjas', 'https://cdn.example/nn.png')
  })

  it('saves a team logo URL from the team card', async () => {
    render(<TeamsManager />)
    await screen.findByDisplayValue('Spin Doctors')

    const logoInput = screen.getByLabelText(/logo url for spin doctors/i)
    await userEvent.clear(logoInput)
    await userEvent.type(logoInput, 'https://cdn.example/spin.png')
    await userEvent.click(screen.getByRole('button', { name: /save logo/i }))

    expect(updateTeamLogo).toHaveBeenCalledWith(1, 'https://cdn.example/spin.png')
  })

  it('does not render team logo images in the admin tables (FR-006)', async () => {
    const { container } = render(<TeamsManager />)
    await screen.findByDisplayValue('Spin Doctors')
    expect(container.querySelector('img')).toBeNull()
  })

  it('renames and deletes a team', async () => {
    render(<TeamsManager />)
    await screen.findByDisplayValue('Spin Doctors')

    await userEvent.click(screen.getByRole('button', { name: /^rename$/i }))
    expect(renameTeam).toHaveBeenCalledWith(1, 'Spin Doctors')

    await userEvent.click(screen.getByRole('button', { name: /delete team/i }))
    await waitFor(() => expect(deleteTeam).toHaveBeenCalledWith(1))
  })

  it('adds a member to a team', async () => {
    render(<TeamsManager />)
    await screen.findByDisplayValue('Spin Doctors')

    await userEvent.type(screen.getByLabelText(/new member for/i), 'Ben')
    await userEvent.click(screen.getByRole('button', { name: /add member/i }))

    expect(createMember).toHaveBeenCalledWith('Ben', 1)
  })
})
