import styles from './Cart.module.css'

// One pending, unsaved roster change (a staged buy or swap).
export interface CartLine {
  slotIndex: number
  playerName: string
  // Net CompuBucks cost: positive = you pay, negative = a swap refunds more than
  // the new player costs (a gain).
  netCost: number
  isSwap: boolean
}

interface CartProps {
  lines: CartLine[]
  total: number
  remaining: number
  overBudget: boolean
  canSave: boolean
  saving: boolean
  onRemoveLine: (slotIndex: number) => void
  onSave: () => void
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

// A spend shows as "-10M", a gain (net-negative swap) as "+7M".
const signed = (cost: number) => `${cost < 0 ? '+' : '-'}${compact.format(Math.abs(cost))}`

// The "shopping cart" of staged changes shown under the squad. It lists each
// pending buy/swap with its net cost, the running total and what's left, and the
// Save button that commits everything. Renders nothing when there is nothing
// staged — so the Save button only exists when something has changed.
export function Cart({
  lines,
  total,
  remaining,
  overBudget,
  canSave,
  saving,
  onRemoveLine,
  onSave,
}: CartProps) {
  if (lines.length === 0) return null

  return (
    <div className={styles.cart} data-testid="cart">
      <h3 className={styles.title}>Pending changes</h3>
      <ul className={styles.lines}>
        {lines.map((line) => (
          <li key={line.slotIndex} className={styles.line}>
            <span className={styles.action}>{line.isSwap ? 'Swap' : 'Buy'}</span>
            <span className={styles.who}>{line.playerName}</span>
            <span className={`${styles.cost} ${line.netCost < 0 ? styles.gain : ''}`}>
              {signed(line.netCost)}
            </span>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${line.playerName}`}
              onClick={() => onRemoveLine(line.slotIndex)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.summary}>
        <span className={styles.preview}>
          {overBudget
            ? `Over budget by ${compact.format(-remaining)}`
            : `Costs ${compact.format(total)} · ${compact.format(remaining)} left`}
        </span>
        <button
          type="button"
          className={styles.save}
          disabled={!canSave || saving}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save team'}
        </button>
      </div>
    </div>
  )
}
