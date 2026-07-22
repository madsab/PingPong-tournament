import { useEffect, useState } from 'react'
import { fetchLeaderboard, type LeaderboardEntry } from '../../api/public'
import styles from './LeaderboardSection.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: LeaderboardEntry[] }

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

// The F2 individual leaderboard: every player ranked across all completed games
// (§3.6), with the same loading / empty / error states as the standings section.
export function LeaderboardSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    fetchLeaderboard()
      .then((entries) => active && setState({ status: 'ready', entries }))
      .catch(
        (err: unknown) =>
          active &&
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Something went wrong',
          }),
      )
    return () => {
      active = false
    }
  }, [])

  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>Leaderboard</p>

      {state.status === 'loading' && (
        <p className={styles.notice}>Loading leaderboard…</p>
      )}

      {state.status === 'error' && (
        <p className={styles.notice}>Couldn’t load the leaderboard. Please refresh.</p>
      )}

      {state.status === 'ready' && state.entries.length === 0 && (
        <p className={styles.notice}>No players yet. Check back soon!</p>
      )}

      {state.status === 'ready' && state.entries.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.rankCol}>Rank</th>
                <th className={styles.nameCol}>Player</th>
                <th className={styles.teamCol}>Team</th>
                <th>Won</th>
                <th>Lost</th>
                <th>Win %</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {state.entries.map((e) => (
                <tr key={e.member_id} className={styles.row}>
                  <td className={styles.rankCol}>{e.rank}</td>
                  <td className={styles.nameCol}>{e.member_name}</td>
                  <td className={styles.teamCol}>{e.team_name ?? '—'}</td>
                  <td className={styles.won}>{e.won}</td>
                  <td>{e.lost}</td>
                  <td>{pct(e.win_pct)}</td>
                  <td>{signed(e.point_difference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
