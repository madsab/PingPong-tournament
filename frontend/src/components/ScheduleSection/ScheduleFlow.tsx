import { useCallback, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  type Node,
} from '@xyflow/react'
import type { PublicMatch } from '../../api/public'
import { MatchDetail } from '../MatchDetail/MatchDetail'
import { MatchNode } from './MatchNode'
import { RoundHeaderNode } from './RoundHeaderNode'
import { packRounds, toFlow, type MatchNodeData } from './scheduleGraph'
import styles from './ScheduleFlow.module.css'

// Defined once outside the component: React Flow warns if these objects change
// identity between renders.
const nodeTypes = { match: MatchNode, roundHeader: RoundHeaderNode }

// The tournament schedule as a matchday timeline (React Flow). Rounds are columns
// left→right; clicking a played match opens its per-game detail (F4) below.
export function ScheduleFlow({ matches }: { matches: PublicMatch[] }) {
  const { nodes, edges } = useMemo(() => toFlow(packRounds(matches)), [matches])
  const [selected, setSelected] = useState<PublicMatch | null>(null)

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type !== 'match') return
    const { match } = node.data as MatchNodeData
    // Only completed matches have games to show; scheduled ones close the panel.
    setSelected(match.status === 'completed' ? match : null)
  }, [])

  return (
    <>
      <div className={styles.canvas}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          minZoom={0.3}
        >
          <Background gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {selected && (
        <div className={styles.detailWrap}>
          <MatchDetail match={selected} />
        </div>
      )}
    </>
  )
}
