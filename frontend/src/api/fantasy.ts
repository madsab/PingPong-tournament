// Talks to the Fantasy Ping Pong API (feature 007, see contracts/fantasy-api.md).
// Auth is a Bearer token (not a cookie): register/login return a token, we keep it
// in localStorage and send it in the `Authorization` header on every call. This
// works on any device/browser — including iOS Safari, which blocks the cross-site
// cookies this used to rely on. The stored token is what "remembered across visits"
// now means.

// Same base rule as public.ts/admin.ts: empty in production (same-origin via
// Vercel's /api proxy), localhost backend in dev.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

// Where we remember the fantasy token between visits.
const TOKEN_KEY = 'pingpong.fantasy.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Thrown when the backend rejects a request; carries the status so the UI can
// react (e.g. a 404 on login means "no such name → offer to register").
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    // A stale/invalid token can never work again — drop it so the UI can re-gate.
    if (res.status === 401) clearToken()
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // no JSON body — keep the generic message
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// --- Types ----------------------------------------------------------------------

export interface FantasyUser {
  id: number
  name: string
  fun_fact: string
}

export interface FantasySlot {
  slot_index: number
  member_id: number | null
  member_name: string | null
  team_id: number | null
  team_name: string | null
  team_logo_url: string | null
  price_paid: number
  has_racket: boolean
  booster_active: boolean
}

export interface FantasyTeam {
  balance: number
  boosters_available: number
  booster_price: number
  slots: FantasySlot[]
}

export interface Player {
  id: number
  name: string
  team_id: number
  team_name: string
  team_logo_url: string | null
  price: number | null // CompuBucks price; null = not for sale
}

// --- Auth & identity (US1) -------------------------------------------------------

// Auth response also carries the token we store for later calls.
type AuthResponse = FantasyUser & { token: string }

export async function register(name: string, funFact: string): Promise<FantasyUser> {
  const res = await request<AuthResponse>('/api/fantasy/register', {
    method: 'POST',
    body: JSON.stringify({ name, fun_fact: funFact }),
  })
  setToken(res.token)
  return res
}

export async function login(name: string): Promise<FantasyUser> {
  const res = await request<AuthResponse>('/api/fantasy/login', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  setToken(res.token)
  return res
}

export function getMe(): Promise<FantasyUser> {
  return request<FantasyUser>('/api/fantasy/me')
}

// Logging out is purely local — there's no server session to end, just drop the token.
export const logout = () => clearToken()

// --- Fantasy team (US2) ----------------------------------------------------------

export function fetchTeam(): Promise<FantasyTeam> {
  return request<FantasyTeam>('/api/fantasy/team')
}

export function assignSlot(slotIndex: number, memberId: number): Promise<FantasyTeam> {
  return request<FantasyTeam>(`/api/fantasy/team/slots/${slotIndex}`, {
    method: 'PUT',
    body: JSON.stringify({ member_id: memberId }),
  })
}

export function clearSlot(slotIndex: number): Promise<FantasyTeam> {
  return request<FantasyTeam>(`/api/fantasy/team/slots/${slotIndex}`, {
    method: 'DELETE',
  })
}

export async function fetchMembers(): Promise<Player[]> {
  const data = await request<{ members: Player[] }>('/api/members')
  return data.members
}

// --- Golden Racket (US4) ---------------------------------------------------------

export function setRacket(slotIndex: number): Promise<FantasyTeam> {
  return request<FantasyTeam>('/api/fantasy/team/racket', {
    method: 'PUT',
    body: JSON.stringify({ slot_index: slotIndex }),
  })
}

export function clearRacket(): Promise<FantasyTeam> {
  return request<FantasyTeam>('/api/fantasy/team/racket', { method: 'DELETE' })
}

// --- Booster shop (US5) ----------------------------------------------------------

export function buyBooster(): Promise<FantasyTeam> {
  return request<FantasyTeam>('/api/fantasy/shop/booster', { method: 'POST' })
}

export function placeBooster(slotIndex: number): Promise<FantasyTeam> {
  return request<FantasyTeam>('/api/fantasy/team/booster', {
    method: 'PUT',
    body: JSON.stringify({ slot_index: slotIndex }),
  })
}

export function removeBooster(): Promise<FantasyTeam> {
  return request<FantasyTeam>('/api/fantasy/team/booster', { method: 'DELETE' })
}
