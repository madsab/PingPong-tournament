import { useEffect, useState } from 'react'
import { fetchMatches, type PublicMatch } from '../../api/public'
import { MatchDetail } from '../MatchDetail/MatchDetail'
import styles from './ScheduleSection.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; matches: PublicMatch[] }

function scoreLabel(match: PublicMatch): string {
  if (!match.result) return ''
  const { winner, games_won_a, games_won_b } = match.result
  const score = `${games_won_a}–${games_won_b}`
  return winner === 'draw' ? `Draw ${score}` : score
}

// A single played row that expands to show its MatchDetail (F4) inline.
function PlayedRow({ match }: { match: PublicMatch }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={styles.match}>
      <button
        type="button"
        className={styles.matchButton}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.teams}>
          {match.team_a.name} <span className={styles.vs}>vs</span> {match.team_b.name}
        </span>
        <span className={styles.score}>{scoreLabel(match)}</span>
      </button>
      {open && <MatchDetail match={match} />}
    </li>
  )
}

function ToPlayRow({ match }: { match: PublicMatch }) {
  return (
    <li className={styles.match}>
      <div className={styles.matchButton}>
        <span className={styles.teams}>
          {match.team_a.name} <span className={styles.vs}>vs</span> {match.team_b.name}
        </span>
        <span className={styles.pending}>Scheduled</span>
      </div>
    </li>
  )
}

// The F3 match schedule: every match once, split into to-play and played (§4).
// Played matches expand to their per-game detail (F4).
export function ScheduleSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    fetchMatches()
      .then((matches) => active && setState({ status: 'ready', matches }))
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
      <p className={styles.eyebrow}>Schedule</p>

      {state.status === 'loading' && <p className={styles.notice}>Loading matches…</p>}

      {state.status === 'error' && (
        <p className={styles.notice}>Couldn’t load the schedule. Please refresh.</p>
      )}

      {state.status === 'ready' && (
        <Groups matches={state.matches} />
      )}
    </section>
  )
}

function Groups({ matches }: { matches: PublicMatch[] }) {
  const toPlay = matches.filter((m) => m.status === 'scheduled')
  const played = matches.filter((m) => m.status === 'completed')

  return (
    <div className={styles.groups}>
      <div>
        <h3 className={styles.groupTitle}>To play</h3>
        {toPlay.length === 0 ? (
          <p className={styles.emptyGroup}>No matches scheduled.</p>
        ) : (
          <ul className={styles.list}>
            {toPlay.map((m) => (
              <ToPlayRow key={m.id} match={m} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className={styles.groupTitle}>Played</h3>
        {played.length === 0 ? (
          <p className={styles.emptyGroup}>No matches played yet.</p>
        ) : (
          <ul className={styles.list}>
            {played.map((m) => (
              <PlayedRow key={m.id} match={m} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
