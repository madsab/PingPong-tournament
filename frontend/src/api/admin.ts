// Talks to the admin API (see contracts/admin.md). Every call sends the session
// cookie with `credentials: 'include'` so the backend knows we're logged in.

// See public.ts: empty base in production (same-origin via Vercel's /api proxy),
// localhost backend in dev.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

export interface Member {
  id: number
  name: string
  team_id: number
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
  return res.json() as Promise<T>
}

// --- Auth ---
export const login = (password: string) =>
  request<{ authenticated: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })

export const logout = () =>
  request<{ authenticated: boolean }>('/api/admin/logout', { method: 'POST' })

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

export const deleteMember = (id: number) =>
  request<void>(`/api/admin/members/${id}`, { method: 'DELETE' })

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
