import { useEffect, useState } from 'react'
import {
  ApiError,
  createMatch,
  deleteMatch,
  generateSchedule,
  listMatches,
  listTeams,
  type Match,
  type Team,
} from '../../../api/admin'
import { ResultForm } from '../ResultForm/ResultForm'
import styles from './MatchesManager.module.css'

// Manage matches: generate the round-robin (F11), create/delete by hand (F10),
// and record results (F12).
export function MatchesManager() {
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [recording, setRecording] = useState<number | null>(null)
  const [aId, setAId] = useState<number | ''>('')
  const [bId, setBId] = useState<number | ''>('')

  function reload() {
    Promise.all([listTeams(), listMatches()])
      .then(([t, m]) => {
        setTeams(t)
        setMatches(m)
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load data'))
  }

  useEffect(reload, [])

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    }
  }

  async function generate() {
    setError(null)
    setNote(null)
    try {
      const res = await generateSchedule()
      setNote(`Created ${res.created} match(es).`)
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate schedule')
    }
  }

  const teamById = (id: number) => teams.find((t) => t.id === id)

  // Games won by each team for a completed match. Scores never tie (§3.3), so
  // every game has a winner.
  function gamesWon(m: Match): { a: number; b: number } {
    const a = m.games.filter((g) => g.team_a_score > g.team_b_score).length
    return { a, b: m.games.length - a }
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.toolbar}>
        <button className={styles.primary} onClick={generate}>
          Generate round-robin
        </button>
        {note && <span className={styles.note}>{note}</span>}
      </div>

      <form
        className={styles.createRow}
        onSubmit={(e) => {
          e.preventDefault()
          if (aId === '' || bId === '') return
          run(() => createMatch(Number(aId), Number(bId)))
        }}
      >
        <select
          aria-label="Match team A"
          value={aId}
          onChange={(e) => setAId(e.target.value === '' ? '' : Number(e.target.value))}
          className={styles.select}
        >
          <option value="">Team A…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className={styles.dash}>vs</span>
        <select
          aria-label="Match team B"
          value={bId}
          onChange={(e) => setBId(e.target.value === '' ? '' : Number(e.target.value))}
          className={styles.select}
        >
          <option value="">Team B…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.secondary}>
          Add match
        </button>
      </form>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <ul className={styles.matchList}>
        {matches.map((m) => {
          const teamA = teamById(m.team_a.id)
          const teamB = teamById(m.team_b.id)
          return (
            <li key={m.id} className={styles.match}>
              <div className={styles.matchHead}>
                <span className={styles.matchName}>
                  {m.team_a.name} vs {m.team_b.name}
                </span>
                {m.games.length > 0 && (
                  <span className={styles.score}>
                    {gamesWon(m).a} – {gamesWon(m).b}
                  </span>
                )}
                <span className={styles.status} data-status={m.status}>
                  {m.status}
                </span>
                <button
                  className={styles.secondary}
                  onClick={() => setRecording(recording === m.id ? null : m.id)}
                >
                  Record result
                </button>
                <button
                  className={styles.danger}
                  onClick={() => run(() => deleteMatch(m.id))}
                >
                  Delete
                </button>
              </div>

              {recording === m.id && teamA && teamB && (
                <ResultForm
                  match={m}
                  teamA={teamA}
                  teamB={teamB}
                  onSaved={() => {
                    setRecording(null)
                    reload()
                  }}
                  onCancel={() => setRecording(null)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
