import type { StandingsEntry } from '../../api/standings'
import styles from './TeamCrest.module.css'

interface TeamCrestProps {
  entry: StandingsEntry
  side: 'left' | 'right'
  // US3: when the hero has entered, this flips on to slide the crest to centre.
  entered?: boolean
}

// First letter of up to two words, e.g. "Spin Doctors" -> "SD".
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}

export function TeamCrest({ entry, side, entered = true }: TeamCrestProps) {
  const isChampion = entry.rank === 1

  const className = [
    styles.crest,
    styles[side],
    isChampion ? styles.champion : '',
    entered ? styles.entered : styles.offstage,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} data-testid={`crest-${side}`}>
      <div className={styles.logo}>
        {isChampion && (
          <span
            className={styles.crown}
            data-testid="champion-crown"
            aria-hidden="true"
          >
            ♔
          </span>
        )}
        {entry.logo_url ? (
          <img src={entry.logo_url} alt={entry.team_name} className={styles.image} />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            {initials(entry.team_name)}
          </span>
        )}
      </div>
      <span className={styles.rank}>#{entry.rank}</span>
      <h2 className={styles.name}>{entry.team_name}</h2>
    </div>
  )
}
