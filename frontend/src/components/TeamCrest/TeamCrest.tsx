import { useState } from 'react'
import type { StandingsEntry } from '../../api/standings'
import { initials } from '../../lib/initials'
import styles from './TeamCrest.module.css'

interface TeamCrestProps {
  entry: StandingsEntry
  side: 'left' | 'right'
  // US3: when the hero has entered, this flips on to slide the crest to centre.
  entered?: boolean
}

export function TeamCrest({ entry, side, entered = true }: TeamCrestProps) {
  const isChampion = entry.rank === 1
  // If the logo URL fails to load, drop to the initials placeholder rather than
  // showing a broken image (FR-005, §9.7).
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = Boolean(entry.logo_url) && !logoFailed

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
        {showLogo ? (
          <img
            src={entry.logo_url!}
            alt={entry.team_name}
            className={styles.image}
            onError={() => setLogoFailed(true)}
          />
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
