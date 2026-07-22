import type { StandingsEntry } from '../../api/standings'
import { TeamLogo } from '../TeamLogo/TeamLogo'
import styles from './StandingsTable.module.css'

interface StandingsTableProps {
  // Teams ranked 3rd and below (the hero covers 1 and 2).
  entries: StandingsEntry[]
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

// The ranked table sitting under the hero (§9.4).
export function StandingsTable({ entries }: StandingsTableProps) {
  if (entries.length === 0) return null

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.rankCol}>Rank</th>
          <th className={styles.teamCol}>Team</th>
          <th>Played</th>
          <th>W-D-L</th>
          <th>Pts</th>
          <th>Diff</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.team_id} className={styles.row}>
            <td className={styles.rankCol}>{e.rank}</td>
            <td className={styles.teamCol}>
              <span className={styles.teamCell}>
                <TeamLogo logoUrl={e.logo_url} name={e.team_name} />
                {e.team_name}
              </span>
            </td>
            <td>{e.played}</td>
            <td>{`${e.wins}-${e.draws}-${e.losses}`}</td>
            <td className={styles.pts}>{e.points}</td>
            <td>{signed(e.point_difference)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
