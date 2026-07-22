import { useState } from 'react'
import {
  ApiError,
  recordResult,
  type GameInput,
  type Match,
  type Team,
} from '../../../api/admin'
import styles from './ResultForm.module.css'

interface Row {
  aId: number
  bId: number
  aScore: string
  bScore: string
}

function validScore(a: string, b: string): boolean {
  const na = Number(a)
  const nb = Number(b)
  if (a === '' || b === '') return false
  if (!Number.isInteger(na) || !Number.isInteger(nb)) return false
  if (na < 0 || nb < 0) return false
  return na !== nb // a game must have a winner (§3.3)
}

// Record a result for one match (F12/F13). The larger team's members each play once;
// the smaller team repeats a member to cover the extra opponents (§3.2).
export function ResultForm({
  match,
  teamA,
  teamB,
  onSaved,
  onCancel,
}: {
  match: Match
  teamA: Team
  teamB: Team
  onSaved: () => void
  onCancel: () => void
}) {
  const largerIsA = teamA.members.length >= teamB.members.length
  const larger = largerIsA ? teamA : teamB
  const smaller = largerIsA ? teamB : teamA

  const [rows, setRows] = useState<Row[]>(() => {
    // Editing an already-recorded match: start from the saved games so the
    // previous scores and pairings are the default values (a missing player
    // falls back to 0 so the organiser can pick a current member).
    if (match.games.length > 0) {
      return match.games.map((g) => ({
        aId: g.member_a_id ?? 0,
        bId: g.member_b_id ?? 0,
        aScore: String(g.team_a_score),
        bScore: String(g.team_b_score),
      }))
    }
    // A fresh match: one blank row per larger-team member; the smaller team
    // repeats a member to cover the extra opponents (§3.2).
    return larger.members.map((lm, i) => {
      const opp = smaller.members[i % Math.max(smaller.members.length, 1)]
      const oppId = opp?.id ?? 0
      return largerIsA
        ? { aId: lm.id, bId: oppId, aScore: '', bScore: '' }
        : { aId: oppId, bId: lm.id, aScore: '', bScore: '' }
    })
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSave =
    smaller.members.length > 0 &&
    rows.every((r) => validScore(r.aScore, r.bScore))

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const games: GameInput[] = rows.map((r) => ({
        member_a_id: r.aId,
        member_b_id: r.bId,
        team_a_score: Number(r.aScore),
        team_b_score: Number(r.bScore),
      }))
      await recordResult(match.id, games)
      onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the result')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.form}>
      <p className={styles.heading}>
        {teamA.name} vs {teamB.name}
      </p>

      {rows.map((row, i) => {
        const fixedMember = larger.members[i]
        return (
          <div key={i} className={styles.row}>
            {/* Team A side */}
            {largerIsA ? (
              <span className={styles.fixed}>{fixedMember.name}</span>
            ) : (
              <select
                aria-label={`Game ${i + 1} team A player`}
                value={row.aId}
                onChange={(e) => update(i, { aId: Number(e.target.value) })}
                className={styles.select}
              >
                {smaller.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}

            <input
              aria-label={`Game ${i + 1} team A score`}
              type="number"
              min={0}
              value={row.aScore}
              onChange={(e) => update(i, { aScore: e.target.value })}
              className={styles.score}
            />
            <span className={styles.dash}>–</span>
            <input
              aria-label={`Game ${i + 1} team B score`}
              type="number"
              min={0}
              value={row.bScore}
              onChange={(e) => update(i, { bScore: e.target.value })}
              className={styles.score}
            />

            {/* Team B side */}
            {largerIsA ? (
              <select
                aria-label={`Game ${i + 1} team B player`}
                value={row.bId}
                onChange={(e) => update(i, { bId: Number(e.target.value) })}
                className={styles.select}
              >
                {smaller.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className={styles.fixed}>{fixedMember.name}</span>
            )}
          </div>
        )
      })}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button className={styles.primary} onClick={save} disabled={!canSave || busy}>
          {busy ? 'Saving…' : 'Save result'}
        </button>
        <button className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
