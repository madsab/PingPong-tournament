import { useEffect, useState } from 'react'
import type { StandingsEntry } from '../../api/standings'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { Rift } from '../Rift/Rift'
import { TeamCrest } from '../TeamCrest/TeamCrest'
import styles from './StandingsHero.module.css'

interface StandingsHeroProps {
  // The top-two teams (rank 1 first). May contain a single team.
  leaders: StandingsEntry[]
}

// The "versus" hero: the two leaders face off with their points in the Rift (§9.4).
export function StandingsHero({ leaders }: StandingsHeroProps) {
  const reduced = useReducedMotion()
  // With motion allowed we start "off-stage" and flip to entered on mount so the
  // crests slide in and the Rift flares. With reduced motion we start entered.
  const [entered, setEntered] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      setEntered(true)
      return
    }
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [reduced])

  const first = leaders[0]
  const second = leaders[1]
  const animate = entered && !reduced

  return (
    <div className={styles.hero}>
      {first && <TeamCrest entry={first} side="left" entered={entered} />}

      <Rift
        leftScore={first?.points ?? 0}
        rightScore={second?.points ?? 0}
        flaring={animate}
        embers={!reduced}
      />

      {second ? (
        <TeamCrest entry={second} side="right" entered={entered} />
      ) : (
        <div className={styles.placeholder} data-testid="placeholder-opponent">
          <div className={styles.placeholderLogo} aria-hidden="true">
            ?
          </div>
          <span className={styles.placeholderText}>Awaiting challenger</span>
        </div>
      )}
    </div>
  )
}
