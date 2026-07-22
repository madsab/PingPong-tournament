import { useEffect, useState } from 'react'
import { fetchMatches, type PublicMatch } from '../../api/public'
import { ScheduleFlow } from './ScheduleFlow'
import styles from './ScheduleSection.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; matches: PublicMatch[] }

// The F3 match schedule, drawn as a matchday timeline (React Flow): rounds run
// left→right, played matches first then upcoming. Clicking a played match opens
// its per-game detail (F4). Same load/empty/error states as the other sections.
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

      {state.status === 'ready' && state.matches.length === 0 && (
        <p className={styles.notice}>No matches scheduled yet. Check back soon!</p>
      )}

      {state.status === 'ready' && state.matches.length > 0 && (
        <ScheduleFlow matches={state.matches} />
      )}
    </section>
  )
}
