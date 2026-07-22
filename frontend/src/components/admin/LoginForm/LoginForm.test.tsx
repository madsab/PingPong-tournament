import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm, LogoutButton } from './LoginForm'
import { ApiError } from '../../../api/admin'

vi.mock('../../../api/admin', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin')>(
    '../../../api/admin',
  )
  return { ...actual, login: vi.fn(), logout: vi.fn() }
})

import { login, logout } from '../../../api/admin'

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('logs in with the entered password', async () => {
    vi.mocked(login).mockResolvedValue({ authenticated: true })
    const onLoggedIn = vi.fn()
    render(<LoginForm onLoggedIn={onLoggedIn} />)

    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(login).toHaveBeenCalledWith('hunter2')
    expect(onLoggedIn).toHaveBeenCalled()
  })

  it('shows an error message when the password is wrong', async () => {
    vi.mocked(login).mockRejectedValue(new ApiError(401, 'Wrong password'))
    render(<LoginForm onLoggedIn={vi.fn()} />)

    await userEvent.type(screen.getByLabelText(/password/i), 'nope')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong password')
  })
})

describe('LogoutButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('logs out and notifies the parent', async () => {
    vi.mocked(logout).mockResolvedValue({ authenticated: false })
    const onLoggedOut = vi.fn()
    render(<LogoutButton onLoggedOut={onLoggedOut} />)

    await userEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(logout).toHaveBeenCalled()
    expect(onLoggedOut).toHaveBeenCalled()
  })
})
