// Pure helpers that turn the flat match list into a matchday timeline for React
// Flow. No React, no @xyflow runtime — just data in, nodes/edges out — so the
// tournament-schedule logic is unit-tested on its own.

import type { Edge, Node } from '@xyflow/react'
import type { PublicMatch } from '../../api/public'

export interface Round {
  index: number
  matches: PublicMatch[]
}

// Canvas geometry (px). Columns = rounds left→right, rows = matches in a round.
export const COL_GAP = 260
export const ROW_GAP = 120
export const HEADER_OFFSET = 70

function byId(a: PublicMatch, b: PublicMatch): number {
  return a.id - b.id
}

// Greedy football-fixture packing: each match goes in the earliest round where
// neither of its teams already plays. The model stores no rounds (matches are
// team-pair combinations), so we derive valid matchdays here.
function packGroup(matches: PublicMatch[]): PublicMatch[][] {
  const rounds: { teams: Set<number>; matches: PublicMatch[] }[] = []
  for (const m of matches) {
    let round = rounds.find(
      (r) => !r.teams.has(m.team_a.id) && !r.teams.has(m.team_b.id),
    )
    if (!round) {
      round = { teams: new Set(), matches: [] }
      rounds.push(round)
    }
    round.teams.add(m.team_a.id)
    round.teams.add(m.team_b.id)
    round.matches.push(m)
  }
  return rounds.map((r) => r.matches)
}

// Played rounds first (left), then upcoming rounds (right) — the timeline reads
// left-to-right through the tournament. Scheduled matches never share a played
// round, so the two halves stay visually distinct.
export function packRounds(matches: PublicMatch[]): Round[] {
  const completed = matches.filter((m) => m.status === 'completed').sort(byId)
  const scheduled = matches.filter((m) => m.status === 'scheduled').sort(byId)
  const groups = [...packGroup(completed), ...packGroup(scheduled)]
  return groups.map((roundMatches, index) => ({ index, matches: roundMatches }))
}

export interface MatchNodeData extends Record<string, unknown> {
  match: PublicMatch
}

export interface RoundHeaderData extends Record<string, unknown> {
  label: string
  kind: 'played' | 'upcoming'
}

export function toFlow(rounds: Round[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const round of rounds) {
    const kind: RoundHeaderData['kind'] = round.matches.every(
      (m) => m.status === 'completed',
    )
      ? 'played'
      : 'upcoming'

    nodes.push({
      id: `round-${round.index}`,
      type: 'roundHeader',
      position: { x: round.index * COL_GAP, y: 0 },
      data: { label: `Round ${round.index + 1}`, kind },
      draggable: false,
      selectable: false,
    })

    round.matches.forEach((match, row) => {
      nodes.push({
        id: `match-${match.id}`,
        type: 'match',
        position: { x: round.index * COL_GAP, y: HEADER_OFFSET + row * ROW_GAP },
        data: { match },
      })
    })
  }

  // Horizontal arrows: row r of a round → row r of the next round (time flow).
  for (let c = 0; c < rounds.length - 1; c++) {
    const cur = rounds[c].matches
    const next = rounds[c + 1].matches
    const rows = Math.min(cur.length, next.length)
    for (let r = 0; r < rows; r++) {
      edges.push({
        id: `e-${cur[r].id}-${next[r].id}`,
        source: `match-${cur[r].id}`,
        target: `match-${next[r].id}`,
        animated: next[r].status === 'scheduled',
      })
    }
  }

  return { nodes, edges }
}
