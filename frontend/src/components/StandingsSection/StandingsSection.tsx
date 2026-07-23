import { useEffect, useState } from "react"
import { fetchStandings, type StandingsEntry } from "../../api/standings"
import { StandingsHero } from "../StandingsHero/StandingsHero"
import { StandingsTable } from "../StandingsTable/StandingsTable"
import styles from "./StandingsSection.module.css"

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; teams: StandingsEntry[] }

// The F1 team-ranking section: hero (top two) + table (the rest), with the
// loading / empty / error states around them.
export function StandingsSection() {
  const [state, setState] = useState<LoadState>({ status: "loading" })

  useEffect(() => {
    let active = true
    fetchStandings()
      .then((teams) => active && setState({ status: "ready", teams }))
      .catch(
        (err: unknown) =>
          active &&
          setState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Something went wrong",
          }),
      )
    return () => {
      active = false
    }
  }, [])

  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>Standings</p>

      {state.status === "loading" && (
        <div className={styles.notice}>
          <p>Loading standings… </p>
          <p>
            As i'm using a free hosting platform the first load takes about 30
            seconds
          </p>
        </div>
      )}

      {state.status === "error" && (
        <p className={styles.notice}>
          Couldn’t load standings. Please refresh.
        </p>
      )}

      {state.status === "ready" && state.teams.length === 0 && (
        <p className={styles.notice}>No matches played yet. Check back soon!</p>
      )}

      {state.status === "ready" && state.teams.length > 0 && (
        <>
          <StandingsHero leaders={state.teams.slice(0, 2)} />
          <div className={styles.tableWrap}>
            <StandingsTable entries={state.teams.slice(2)} />
          </div>
        </>
      )}
    </section>
  )
}
