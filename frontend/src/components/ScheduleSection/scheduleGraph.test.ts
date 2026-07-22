import { describe, expect, it } from 'vitest'
import { packRounds, toFlow, COL_GAP } from './scheduleGraph'
import type { PublicMatch } from '../../api/public'

let nextId = 1
function match(
  aId: number,
  bId: number,
  status: 'completed' | 'scheduled' = 'completed',
): PublicMatch {
  return {
    id: nextId++,
    team_a: { id: aId, name: `T${aId}`, logo_url: null },
    team_b: { id: bId, name: `T${bId}`, logo_url: null },
    status,
    result: status === 'completed' ? { winner: 'a', games_won_a: 2, games_won_b: 1 } : null,
    games: [],
  }
}

describe('packRounds', () => {
  it('never puts a team in the same round twice', () => {
    nextId = 1
    // Full 4-team round robin: 6 matches.
    const matches = [
      match(1, 2),
      match(1, 3),
      match(1, 4),
      match(2, 3),
      match(2, 4),
      match(3, 4),
    ]
    const rounds = packRounds(matches)
    for (const r of rounds) {
      const teams = r.matches.flatMap((m) => [m.team_a.id, m.team_b.id])
      expect(new Set(teams).size).toBe(teams.length) // no duplicate team in a round
    }
    // Every match placed exactly once.
    expect(rounds.flatMap((r) => r.matches)).toHaveLength(6)
  })

  it('puts played rounds before scheduled rounds', () => {
    nextId = 1
    const matches = [
      match(1, 2, 'completed'),
      match(3, 4, 'completed'),
      match(1, 3, 'scheduled'),
      match(2, 4, 'scheduled'),
    ]
    const rounds = packRounds(matches)
    const statusOf = (r: (typeof rounds)[number]) =>
      r.matches.every((m) => m.status === 'completed') ? 'played' : 'upcoming'
    const kinds = rounds.map(statusOf)
    // All played rounds come before any upcoming round.
    const firstUpcoming = kinds.indexOf('upcoming')
    expect(kinds.slice(0, firstUpcoming).every((k) => k === 'played')).toBe(true)
  })

  it('returns no rounds for an empty match list', () => {
    expect(packRounds([])).toEqual([])
  })
})

describe('toFlow', () => {
  it('makes a header node per round and a node per match, positioned by round column', () => {
    nextId = 1
    const rounds = packRounds([match(1, 2), match(3, 4), match(1, 3, 'scheduled')])
    const { nodes } = toFlow(rounds)

    const headers = nodes.filter((n) => n.type === 'roundHeader')
    const matchNodes = nodes.filter((n) => n.type === 'match')
    expect(headers).toHaveLength(rounds.length)
    expect(matchNodes).toHaveLength(3)

    // Round 2's column sits one COL_GAP to the right of round 1.
    expect(headers[1].position.x - headers[0].position.x).toBe(COL_GAP)
  })

  it('labels a round of only completed matches "played" and one with a scheduled match "upcoming"', () => {
    nextId = 1
    const rounds = packRounds([match(1, 2), match(1, 3, 'scheduled')])
    const headers = toFlow(rounds).nodes.filter((n) => n.type === 'roundHeader')
    const kinds = headers.map((h) => (h.data as { kind: string }).kind)
    expect(kinds).toContain('played')
    expect(kinds).toContain('upcoming')
  })

  it('connects consecutive rounds with edges', () => {
    nextId = 1
    // Two rounds, one match each -> one edge between them.
    const rounds = packRounds([match(1, 2), match(1, 3)])
    const { edges } = toFlow(rounds)
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('match-1')
    expect(edges[0].target).toBe('match-2')
  })
})
