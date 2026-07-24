import type { FantasyEvent } from '../../../api/fantasy'
import styles from './FantasyLog.module.css'

interface FantasyLogProps {
  events: FantasyEvent[]
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

// A spend/loss shows "-20M", a sale/win a green "+5M".
const signed = (amount: number) =>
  `${amount < 0 ? '-' : '+'}${compact.format(Math.abs(amount))}`

// Norwegian one-liner per event kind.
const describe = (e: FantasyEvent): string => {
  switch (e.kind) {
    case 'purchase':
      return `Kjøpte ${e.member_name}`
    case 'sale':
      return `Solgte ${e.member_name}`
    case 'win':
      return `${e.member_name} vant en kamp`
    case 'loss':
      return `${e.member_name} tapte en kamp`
  }
}

const ICON: Record<FantasyEvent['kind'], string> = {
  purchase: '🛒',
  sale: '💰',
  win: '✅',
  loss: '❌',
}

const when = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// The manager's CompuBucks history: purchases, sales, wins and losses, newest first.
export function FantasyLog({ events }: FantasyLogProps) {
  return (
    <section className={styles.log} aria-label="Hendelseslogg">
      <h2 className={styles.heading}>Logg</h2>
      {events.length === 0 ? (
        <p className={styles.empty}>Ingen hendelser enda.</p>
      ) : (
        <ul className={styles.list}>
          {events.map((e, i) => (
            <li key={i} className={styles.row}>
              <span className={styles.icon} aria-hidden="true">
                {ICON[e.kind]}
              </span>
              <span className={styles.what}>
                <span className={styles.text}>{describe(e)}</span>
                <span className={styles.time}>{when(e.created_at)}</span>
              </span>
              <span className={`${styles.amount} ${e.amount < 0 ? styles.spend : styles.gain}`}>
                {signed(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
