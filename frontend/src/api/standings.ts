// Talks to the public standings endpoint (see contracts/standings.md).

// One team's place in the standings. Mirrors the backend StandingsEntryOut.
export interface StandingsEntry {
  rank: number
  team_id: number
  team_name: string
  logo_url: string | null
  points: number
  point_difference: number
  played: number
  wins: number
  draws: number
  losses: number
}

export interface StandingsResponse {
  teams: StandingsEntry[]
}

// In dev the frontend (5173) and backend (8000) are separate origins. Allow an
// override so the same code works in Docker; fall back to the local backend.
// See public.ts: empty base in production (same-origin via Vercel's /api proxy),
// localhost backend in dev.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

export async function fetchStandings(): Promise<StandingsEntry[]> {
  const res = await fetch(`${API_BASE}/api/standings`)
  if (!res.ok) {
    throw new Error(`Failed to load standings (${res.status})`)
  }
  const data: StandingsResponse = await res.json()
  return data.teams
}
