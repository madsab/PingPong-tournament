// The iOS fix: fantasy auth is a Bearer token in localStorage, not a cookie. These
// tests lock in that the token is stored on login and sent on every later call, so
// requests never depend on a cross-site cookie (which iOS Safari blocks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, fetchTeam, getToken, login, logout } from './fantasy'

const TOKEN_KEY = 'pingpong.fantasy.token'

function mockJson(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fantasy api auth', () => {
  it('stores the token returned by login', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockJson({ id: 1, name: 'Ivy', fun_fact: 'hi', token: 'tok-123' }))

    await login('Ivy')

    expect(getToken()).toBe('tok-123')
    // Login itself carries no token yet (none stored before it).
    const loginInit = fetchMock.mock.calls[0][1] as RequestInit
    expect((loginInit.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('sends the stored token as a Bearer header on later calls', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok-abc')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockJson({ balance: 0, boosters_available: 0, booster_price: 0, slots: [] }))

    await fetchTeam()

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-abc')
    // No cookies — this is what makes it work on iOS Safari.
    expect(init.credentials).toBeUndefined()
  })

  it('drops the token on a 401 so the UI can re-gate to login', async () => {
    localStorage.setItem(TOKEN_KEY, 'stale')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJson({ detail: 'Not logged in' }, 401))

    await expect(fetchTeam()).rejects.toThrow()
    expect(getToken()).toBeNull()
  })

  it('logout is local — it just clears the stored token', () => {
    localStorage.setItem(TOKEN_KEY, 'tok-xyz')
    logout()
    expect(getToken()).toBeNull()
  })

  it('clearToken removes the token', () => {
    localStorage.setItem(TOKEN_KEY, 'tok')
    clearToken()
    expect(getToken()).toBeNull()
  })
})
