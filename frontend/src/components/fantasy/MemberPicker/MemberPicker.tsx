import { useMemo, useState } from 'react'
import { TeamLogo } from '../../TeamLogo/TeamLogo'
import type { Player } from '../../../api/fantasy'
import styles from './MemberPicker.module.css'

interface MemberPickerProps {
  slotIndex: number
  players: Player[]
  // Players already on the team (other slots) — shown disabled so you can't pick
  // the same person twice. The backend also enforces this.
  takenMemberIds: Set<number>
  onPick: (memberId: number) => void
  onClear: () => void
  onClose: () => void
}

export function MemberPicker({
  slotIndex,
  players,
  takenMemberIds,
  onPick,
  onClear,
  onClose,
}: MemberPickerProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.team_name.toLowerCase().includes(q),
    )
  }, [players, query])

  return (
    <div className={styles.overlay} role="dialog" aria-label={`Pick a player for slot ${slotIndex}`}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Pick a player — Slot {slotIndex}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <input
          className={styles.search}
          placeholder="Search players or teams…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <ul className={styles.list}>
          {filtered.map((p) => {
            const taken = takenMemberIds.has(p.id)
            return (
              <li key={p.id}>
                <button
                  className={styles.player}
                  disabled={taken}
                  onClick={() => onPick(p.id)}
                >
                  <TeamLogo logoUrl={p.team_logo_url} name={p.team_name} />
                  <span className={styles.playerText}>
                    <span className={styles.name}>{p.name}</span>
                    <span className={styles.team}>{p.team_name}</span>
                  </span>
                  {taken && <span className={styles.taken}>on team</span>}
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className={styles.empty}>No players match.</li>
          )}
        </ul>

        <button className={styles.clear} onClick={onClear}>
          Clear this slot
        </button>
      </div>
    </div>
  )
}
