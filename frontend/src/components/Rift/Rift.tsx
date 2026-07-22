import styles from './Rift.module.css'

interface RiftProps {
  // Points for the left (#1) and right (#2) leaders, shown stacked in the seam.
  leftScore: number
  rightScore: number
  // US3: brief brighten when the crests "collide".
  flaring?: boolean
  // US3: decorative embers drifting behind the seam.
  embers?: boolean
}

// The signature centre seam where the two leaders collide (SPECIFICATIONS §9.4).
export function Rift({ leftScore, rightScore, flaring = false, embers = false }: RiftProps) {
  const className = [styles.rift, flaring ? styles.flaring : ''].filter(Boolean).join(' ')

  return (
    <div className={className} data-testid="rift" data-flaring={flaring}>
      {embers && (
        <div className={styles.embers} data-testid="embers" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={styles.ember} style={{ ['--i' as string]: i }} />
          ))}
        </div>
      )}
      <div className={styles.seam} aria-hidden="true" />
      <div className={styles.scores}>
        <span className={styles.score}>{leftScore}</span>
        <span className={styles.vs}>VS</span>
        <span className={styles.score}>{rightScore}</span>
      </div>
    </div>
  )
}
