import { TeamLogo } from '../../TeamLogo/TeamLogo'
import type { FantasySlot } from '../../../api/fantasy'
import styles from './SlotCard.module.css'

interface SlotCardProps {
  slot: FantasySlot
  onClick: () => void
}

// One fantasy player box. A plain clickable card (no canvas): filled shows the
// player with their team and logo, empty shows an "add player" prompt. Clicking
// opens the picker.
export function SlotCard({ slot, onClick }: SlotCardProps) {
  const filled = slot.member_id !== null

  return (
    <button
      type="button"
      className={`${styles.card} ${filled ? styles.filled : styles.empty}`}
      onClick={onClick}
      data-testid={`slot-${slot.slot_index}`}
    >
      <span className={styles.slotLabel}>Player {slot.slot_index}</span>
      {filled ? (
        <span className={styles.player}>
          <TeamLogo logoUrl={slot.team_logo_url} name={slot.team_name ?? '?'} />
          <span className={styles.playerText}>
            <span className={styles.name}>{slot.member_name}</span>
            <span className={styles.team}>{slot.team_name}</span>
          </span>
        </span>
      ) : (
        <span className={styles.add}>+ Add player</span>
      )}
    </button>
  )
}
