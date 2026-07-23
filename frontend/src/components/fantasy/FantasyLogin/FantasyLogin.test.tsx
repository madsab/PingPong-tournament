import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FantasyLogin } from './FantasyLogin'
import * as api from '../../../api/fantasy'

vi.mock('../../../api/fantasy', async () => {
  const actual = await vi.importActual<typeof import('../../../api/fantasy')>(
    '../../../api/fantasy',
  )
  return { ...actual, login: vi.fn(), register: vi.fn() }
})

describe('FantasyLogin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('logs in with a known name', async () => {
    vi.mocked(api.login).mockResolvedValue({ id: 1, name: 'Ada', fun_fact: 'x' })
    const onLoggedIn = vi.fn()
    render(<FantasyLogin onLoggedIn={onLoggedIn} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: /continue|log in|join/i }))

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled())
    expect(api.login).toHaveBeenCalledWith('Ada')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('reveals the fun-fact field when the name is unknown', async () => {
    vi.mocked(api.login).mockRejectedValue(new api.ApiError(404, 'No account'))
    render(<FantasyLogin onLoggedIn={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New' } })
    fireEvent.click(screen.getByRole('button', { name: /continue|log in|join/i }))

    await waitFor(() =>
      expect(screen.getByLabelText(/fun.?fact/i)).toBeInTheDocument(),
    )
  })

  it('blocks register when the fun-fact is empty', async () => {
    vi.mocked(api.login).mockRejectedValue(new api.ApiError(404, 'No account'))
    render(<FantasyLogin onLoggedIn={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New' } })
    fireEvent.click(screen.getByRole('button', { name: /continue|log in|join/i }))
    await screen.findByLabelText(/fun.?fact/i)

    // Submit again with an empty fun-fact.
    fireEvent.click(screen.getByRole('button', { name: /join|create|register/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/fun.?fact/i)
    expect(api.register).not.toHaveBeenCalled()
  })
})
