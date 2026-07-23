// Talks to the Fantasy Ping Pong API (feature 007, see contracts/fantasy-api.md).
// Sends the session cookie with `credentials: 'include'` — that cookie is what
// "remembered across visits" relies on.

// Same base rule as public.ts/admin.ts: empty in production (same-origin via
// Vercel's /api proxy), localhost backend in dev.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

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
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
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
}

export interface FantasyTeam {
  compubucks: number
  slots: FantasySlot[]
}

export interface Player {
  id: number
  name: string
  team_id: number
  team_name: string
  team_logo_url: string | null
}

// --- Auth & identity (US1) -------------------------------------------------------

export function register(name: string, funFact: string): Promise<FantasyUser> {
  return request<FantasyUser>('/api/fantasy/register', {
    method: 'POST',
    body: JSON.stringify({ name, fun_fact: funFact }),
  })
}

export function login(name: string): Promise<FantasyUser> {
  return request<FantasyUser>('/api/fantasy/login', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function getMe(): Promise<FantasyUser> {
  return request<FantasyUser>('/api/fantasy/me')
}

export function logout(): Promise<{ authenticated: boolean }> {
  return request<{ authenticated: boolean }>('/api/fantasy/logout', {
    method: 'POST',
  })
}

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
