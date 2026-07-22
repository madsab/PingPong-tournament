import type { PublicMatch } from '../../api/public'
import styles from './MatchDetail.module.css'

interface MatchDetailProps {
  match: PublicMatch
}

function resultLabel(match: PublicMatch): string {
  if (!match.result) return ''
  const { winner, games_won_a, games_won_b } = match.result
  const score = `${games_won_a}–${games_won_b}`
  if (winner === 'draw') return `Draw ${score}`
  const winnerName = winner === 'a' ? match.team_a.name : match.team_b.name
  return `${winnerName} win ${score}`
}

// Missing player link (§3.1) — show a placeholder rather than a blank cell.
function playerName(name: string | null): string {
  return name ?? '—'
}

// The F4 match detail: both teams, the overall result (or "Draw"), and every game
// with the two players' names and its score. Rendered inline when a played match
// is expanded in the schedule (reuses the already-fetched payload — no extra request).
export function MatchDetail({ match }: MatchDetailProps) {
  return (
    <div className={styles.detail}>
      <p className={styles.result}>{resultLabel(match)}</p>

      <table className={styles.games}>
        <thead>
          <tr>
            <th className={styles.playerCol}>{match.team_a.name}</th>
            <th className={styles.scoreCol}>Score</th>
            <th className={styles.playerCol}>{match.team_b.name}</th>
          </tr>
        </thead>
        <tbody>
          {match.games.map((g, i) => (
            <tr key={i}>
              <td className={styles.playerCol}>{playerName(g.member_a_name)}</td>
              <td className={styles.scoreCol}>
                {g.team_a_score}–{g.team_b_score}
              </td>
              <td className={styles.playerCol}>{playerName(g.member_b_name)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
