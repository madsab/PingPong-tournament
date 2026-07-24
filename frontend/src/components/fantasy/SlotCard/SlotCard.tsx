import { TeamLogo } from '../../TeamLogo/TeamLogo'
import type { FantasySlot } from '../../../api/fantasy'
import styles from './SlotCard.module.css'

interface SlotCardProps {
  slot: FantasySlot
  // Whether this player is already bought and banked on the server. A card that is
  // filled but NOT saved is a draft pick — chosen locally, not yet paid for. Draft
  // picks show a "Remove" (discard) control; saved players show the money controls.
  saved: boolean
  onOpen: () => void
  onToggleRacket: () => void
  onToggleBooster: () => void
  onSell: () => void
  onRemove: () => void
}

// Compact money for the tight card ("20M"). The full amounts live in the balance
// and the rules; on a card we just need the size at a glance.
const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

// One fantasy player box. The player area is a button that opens the picker
// (buy / replace). A saved player shows the Golden Racket, Booster and Sell
// controls plus corner badges; a draft (unsaved) pick shows only a Remove button
// and an "unsaved" tag, because no money moves until the whole team is saved.
export function SlotCard({
  slot,
  saved,
  onOpen,
  onToggleRacket,
  onToggleBooster,
  onSell,
  onRemove,
}: SlotCardProps) {
  const filled = slot.member_id !== null
  const draft = filled && !saved

  return (
    <div
      className={`${styles.card} ${filled ? styles.filled : styles.empty} ${
        draft ? styles.draft : ''
      }`}
      data-testid={`slot-${slot.slot_index}`}
    >
      <button type="button" className={styles.main} onClick={onOpen}>
        <span className={styles.slotLabel}>
          Player {slot.slot_index}
          {draft && <span className={styles.unsaved}>unsaved</span>}
        </span>
        {filled ? (
          <span className={styles.player}>
            <TeamLogo logoUrl={slot.team_logo_url} name={slot.team_name ?? '?'} />
            <span className={styles.playerText}>
              <span className={styles.name}>{slot.member_name}</span>
              <span className={styles.team}>{slot.team_name}</span>
            </span>
            <span className={styles.price}>{compact.format(slot.price_paid)}</span>
          </span>
        ) : (
          <span className={styles.add}>+ Buy a player</span>
        )}
      </button>

      {draft && (
        <div className={styles.controls}>
          <button type="button" className={styles.sell} onClick={onRemove}>
            Remove
          </button>
        </div>
      )}

      {filled && saved && (
        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.chip} ${slot.has_racket ? styles.chipOn : ''}`}
            aria-pressed={slot.has_racket}
            onClick={onToggleRacket}
          >
            🏓 Racket
          </button>
          <button
            type="button"
            className={`${styles.chip} ${slot.booster_active ? styles.chipBoost : ''}`}
            aria-pressed={slot.booster_active}
            onClick={onToggleBooster}
          >
            ⚡ Booster
          </button>
          <button type="button" className={styles.sell} onClick={onSell}>
            Sell
          </button>
        </div>
      )}

      {slot.has_racket && (
        <span className={styles.racketBadge} title="Golden Racket" aria-label="Golden Racket">
          🏓
        </span>
      )}
      {slot.booster_active && (
        <span className={styles.boosterBadge} title="Booster" aria-label="Booster">
          ⚡
        </span>
      )}
    </div>
  )
}
