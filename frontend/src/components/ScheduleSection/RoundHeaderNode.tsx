import { type NodeProps } from '@xyflow/react'
import type { RoundHeaderData } from './scheduleGraph'
import styles from './MatchNode.module.css'

// The column label sitting above each round of matches ("Round 1 · Played").
// Non-interactive; just marks where a matchday sits on the timeline.
export function RoundHeaderNode({ data }: NodeProps) {
  const { label, kind } = data as RoundHeaderData
  return (
    <div className={`${styles.header} ${kind === 'upcoming' ? styles.headerUpcoming : ''}`}>
      <span className={styles.headerLabel}>{label}</span>
      <span className={styles.headerKind}>
        {kind === 'played' ? 'Played' : 'Upcoming'}
      </span>
    </div>
  )
}
