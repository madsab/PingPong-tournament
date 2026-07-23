// Talks to the admin API (see contracts/admin.md). Auth is a Bearer token (not a
// cookie): login returns a token, we keep it in localStorage, and send it in the
// `Authorization` header on every call. This works the same on any device/browser.

// See public.ts: empty base in production (same-origin via Vercel's /api proxy),
// localhost backend in dev.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

// Where we remember the admin token between visits.
const TOKEN_KEY = 'pingpong.admin.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export interface Member {
  id: number
  name: string
  team_id: number
  price: number | null // CompuBucks price; null = not pickable (feature 008)
}

export interface Team {
  id: number
  name: string
  logo_url: string | null
  members: Member[]
}

export interface Game {
  id: number
  member_a_id: number | null
  member_b_id: number | null
  team_a_score: number
  team_b_score: number
}

export interface Match {
  id: number
  team_a: { id: number; name: string }
  team_b: { id: number; name: string }
  status: string
  games: Game[]
}

export interface GameInput {
  member_a_id: number
  member_b_id: number
  team_a_score: number
  team_b_score: number
}

// Thrown when the backend rejects a request; carries the status and a message the
// UI can show the organiser (FR-018).
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
  return res.json() as Promise<T>
}

// --- Auth ---
// Log in with the shared password; on success the token is stored for later calls.
export const login = async (password: string) => {
  const res = await request<{ authenticated: boolean; token: string }>(
    '/api/admin/login',
    { method: 'POST', body: JSON.stringify({ password }) },
  )
  setToken(res.token)
  return res
}

// Logging out is purely local — there's no server session to end.
export const logout = () => clearToken()

export const getSession = () =>
  request<{ authenticated: boolean }>('/api/admin/session')

// --- Teams & members ---
export const listTeams = () =>
  request<{ teams: Team[] }>('/api/admin/teams').then((r) => r.teams)

export const createTeam = (name: string, logoUrl = '') =>
  request<Team>('/api/admin/teams', {
    method: 'POST',
    body: JSON.stringify({ name, logo_url: logoUrl }),
  })

export const renameTeam = (id: number, name: string) =>
  request<Team>(`/api/admin/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })

// Set (or clear, with '') a team's logo URL. Separate from renameTeam so each edit
// on the team card saves just its own field.
export const updateTeamLogo = (id: number, logoUrl: string) =>
  request<Team>(`/api/admin/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ logo_url: logoUrl }),
  })

export const deleteTeam = (id: number) =>
  request<void>(`/api/admin/teams/${id}`, { method: 'DELETE' })

export const createMember = (name: string, teamId: number) =>
  request<Member>('/api/admin/members', {
    method: 'POST',
    body: JSON.stringify({ name, team_id: teamId }),
  })

export const renameMember = (id: number, name: string) =>
  request<Member>(`/api/admin/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })

// Set a player's CompuBucks price (feature 008). Pass null to clear it — a player
// with no price can't be bought in the fantasy game.
export const updateMemberPrice = (id: number, price: number | null) =>
  request<Member>(`/api/admin/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ price }),
  })

export const deleteMember = (id: number) =>
  request<void>(`/api/admin/members/${id}`, { method: 'DELETE' })

// --- Booster price (fantasy shop, feature 008) ---
export const getBoosterPrice = () =>
  request<{ booster_price: number }>('/api/admin/settings/booster-price').then(
    (r) => r.booster_price,
  )

export const setBoosterPrice = (price: number) =>
  request<{ booster_price: number }>('/api/admin/settings/booster-price', {
    method: 'PUT',
    body: JSON.stringify({ booster_price: price }),
  }).then((r) => r.booster_price)

// --- Matches ---
export const listMatches = () =>
  request<{ matches: Match[] }>('/api/admin/matches').then((r) => r.matches)

export const createMatch = (teamAId: number, teamBId: number) =>
  request<Match>('/api/admin/matches', {
    method: 'POST',
    body: JSON.stringify({ team_a_id: teamAId, team_b_id: teamBId }),
  })

export const deleteMatch = (id: number) =>
  request<void>(`/api/admin/matches/${id}`, { method: 'DELETE' })

export const generateSchedule = () =>
  request<{ created: number; skipped: number }>('/api/admin/schedule/generate', {
    method: 'POST',
  })

export const recordResult = (matchId: number, games: GameInput[]) =>
  request<Match>(`/api/admin/matches/${matchId}/result`, {
    method: 'PUT',
    body: JSON.stringify({ games }),
  })
