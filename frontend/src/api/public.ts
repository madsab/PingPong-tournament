// Talks to the public, read-only endpoints (see contracts/public-views.md). No
// credentials — these views need no login (F5).

// In dev the frontend (5173) and backend (8000) are separate origins. Allow an
// override so the same code works in Docker; fall back to the local backend.
// In production the frontend and API share a domain (Vercel proxies /api to the
// backend — see frontend/vercel.json), so the base is empty and calls are
// same-origin. Local dev falls back to the separate backend on :8000.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

// Keep-alive ping. The backend runs on a free-tier host that spins down when idle;
// a periodic hit on this cheap endpoint keeps it warm. Best-effort: a failed ping
// must never surface to the user, so we swallow errors.
export async function pingHealth(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/health`)
  } catch {
    // ignored — keep-alive is best-effort
  }
}

// --- Leaderboard (F2) ----------------------------------------------------------

// One player's place in the leaderboard. Mirrors the backend LeaderboardEntryOut.
export interface LeaderboardEntry {
  rank: number
  member_id: number
  member_name: string
  team_name: string | null
  team_logo_url: string | null
  played: number
  won: number
  lost: number
  win_pct: number // fraction in [0, 1]
  point_difference: number
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/api/leaderboard`)
  if (!res.ok) {
    throw new Error(`Failed to load leaderboard (${res.status})`)
  }
  const data: LeaderboardResponse = await res.json()
  return data.entries
}

// --- Matches: schedule (F3) + detail (F4) --------------------------------------

export interface PublicTeamRef {
  id: number
  name: string
  logo_url: string | null
}

export interface PublicGame {
  member_a_id: number | null
  member_a_name: string | null
  member_b_id: number | null
  member_b_name: string | null
  team_a_score: number
  team_b_score: number
}

export interface PublicMatchResult {
  winner: 'a' | 'b' | 'draw'
  games_won_a: number
  games_won_b: number
}

export interface PublicMatch {
  id: number
  team_a: PublicTeamRef
  team_b: PublicTeamRef
  status: 'scheduled' | 'completed'
  result: PublicMatchResult | null
  games: PublicGame[]
}

export interface PublicMatchesResponse {
  matches: PublicMatch[]
}

export async function fetchMatches(): Promise<PublicMatch[]> {
  const res = await fetch(`${API_BASE}/api/matches`)
  if (!res.ok) {
    throw new Error(`Failed to load matches (${res.status})`)
  }
  const data: PublicMatchesResponse = await res.json()
  return data.matches
}
