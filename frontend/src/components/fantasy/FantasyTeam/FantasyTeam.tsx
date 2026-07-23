import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  assignSlot,
  clearSlot,
  fetchMembers,
  fetchTeam,
  type FantasyTeam as FantasyTeamData,
  type Player,
} from '../../../api/fantasy'
import { SlotCard } from '../SlotCard/SlotCard'
import { MemberPicker } from '../MemberPicker/MemberPicker'
import { PingPongTable } from '../PingPongTable/PingPongTable'
import { CompuBucks } from '../CompuBucks/CompuBucks'
import styles from './FantasyTeam.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; team: FantasyTeamData }

// The fantasy squad laid out like a doubles match: two players on the left, a
// ping-pong table in the middle, two on the right (stacks on mobile). Clicking a
// slot opens the picker to assign/replace/clear a player. The CompuBucks total is
// shown like money in the header.
export function FantasyTeam() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [players, setPlayers] = useState<Player[]>([])
  const [openSlot, setOpenSlot] = useState<number | null>(null)

  const loadTeam = useCallback(() => {
    fetchTeam()
      .then((team) => setState({ status: 'ready', team }))
      .catch((err: unknown) =>
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong',
        }),
      )
  }, [])

  useEffect(() => {
    loadTeam()
    fetchMembers().then(setPlayers).catch(() => setPlayers([]))
  }, [loadTeam])

  const team = state.status === 'ready' ? state.team : null

  const slotByIndex = useMemo(() => {
    const map = new Map<number, FantasyTeamData['slots'][number]>()
    for (const s of team?.slots ?? []) map.set(s.slot_index, s)
    return map
  }, [team])

  const takenMemberIds = useMemo(
    () =>
      new Set(
        (team?.slots ?? [])
          .filter((s) => s.member_id !== null)
          .map((s) => s.member_id as number),
      ),
    [team],
  )

  async function pick(memberId: number) {
    if (openSlot === null) return
    const updated = await assignSlot(openSlot, memberId)
    setState({ status: 'ready', team: updated })
    setOpenSlot(null)
  }

  async function clear() {
    if (openSlot === null) return
    const updated = await clearSlot(openSlot)
    setState({ status: 'ready', team: updated })
    setOpenSlot(null)
  }

  if (state.status === 'loading') return <p className={styles.notice}>Loading your team…</p>
  if (state.status === 'error')
    return <p className={styles.notice}>Couldn&rsquo;t load your team. Please refresh.</p>

  // Slots 1 & 2 on the left, 3 & 4 on the right, table in the middle.
  const renderSlot = (index: number) => {
    const slot = slotByIndex.get(index)
    if (!slot) return null
    return <SlotCard slot={slot} onClick={() => setOpenSlot(index)} />
  }

  return (
    <section>
      <div className={styles.bar}>
        <h2 className={styles.heading}>Your fantasy squad</h2>
        <CompuBucks amount={state.team.compubucks} />
      </div>

      <div className={styles.court}>
        <div className={styles.side}>
          {renderSlot(1)}
          {renderSlot(2)}
        </div>
        <div className={styles.table}>
          <PingPongTable />
        </div>
        <div className={styles.side}>
          {renderSlot(3)}
          {renderSlot(4)}
        </div>
      </div>

      {openSlot !== null && (
        <MemberPicker
          slotIndex={openSlot}
          players={players}
          takenMemberIds={takenMemberIds}
          onPick={pick}
          onClear={clear}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </section>
  )
}
