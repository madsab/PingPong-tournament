import { Handle, Position, type NodeProps } from '@xyflow/react'
import { TeamLogo } from '../TeamLogo/TeamLogo'
import type { MatchNodeData } from './scheduleGraph'
import styles from './MatchNode.module.css'

// One match on the timeline: a small fixture card with both teams and either the
// games-won score (played) or a "Scheduled" chip (to-play). The winning team's
// row is highlighted; a draw is chipped. Clicking it opens the full detail (F4),
// wired up by the parent via React Flow's onNodeClick.
export function MatchNode({ data }: NodeProps) {
  const { match } = data as MatchNodeData
  const scheduled = match.status === 'scheduled'
  const result = match.result

  const rowClass = (side: 'a' | 'b') =>
    !scheduled && result?.winner === side ? `${styles.team} ${styles.winner}` : styles.team

  return (
    <div className={`${styles.node} ${scheduled ? styles.scheduled : ''}`}>
      <Handle type="target" position={Position.Left} className={styles.handle} />

      <div className={rowClass('a')}>
        <span className={styles.teamCell}>
          <TeamLogo logoUrl={match.team_a.logo_url} name={match.team_a.name} />
          <span className={styles.name}>{match.team_a.name}</span>
        </span>
        <span className={styles.score}>{scheduled ? '' : result?.games_won_a}</span>
      </div>
      <div className={rowClass('b')}>
        <span className={styles.teamCell}>
          <TeamLogo logoUrl={match.team_b.logo_url} name={match.team_b.name} />
          <span className={styles.name}>{match.team_b.name}</span>
        </span>
        <span className={styles.score}>{scheduled ? '' : result?.games_won_b}</span>
      </div>

      {scheduled && <span className={styles.chip}>Scheduled</span>}
      {!scheduled && result?.winner === 'draw' && (
        <span className={styles.chip}>Draw</span>
      )}

      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  )
}
