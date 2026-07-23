import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  assignSlot,
  buyBooster,
  clearRacket,
  clearSlot,
  fetchMembers,
  fetchTeam,
  placeBooster,
  removeBooster,
  setRacket,
  type FantasySlot,
  type FantasyTeam as FantasyTeamData,
  type Player,
} from '../../../api/fantasy'
import { SlotCard } from '../SlotCard/SlotCard'
import { MemberPicker } from '../MemberPicker/MemberPicker'
import { PingPongTable } from '../PingPongTable/PingPongTable'
import { CompuBucks } from '../CompuBucks/CompuBucks'
import { Shop } from '../Shop/Shop'
import styles from './FantasyTeam.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; team: FantasyTeamData }

const SELL_RATE = 0.85

// The fantasy squad laid out like a doubles match: two players on the left, a
// ping-pong table in the middle, two on the right (stacks on mobile). Buying,
// selling, the Golden Racket and the Booster all update the banked balance shown
// in the header. Backend errors (e.g. "Not enough CompuBucks") show inline.
export function FantasyTeam() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [players, setPlayers] = useState<Player[]>([])
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    const map = new Map<number, FantasySlot>()
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

  // Run an economy action, refresh from its response, and surface any error.
  async function run(action: () => Promise<FantasyTeamData>) {
    setError(null)
    try {
      const updated = await action()
      setState({ status: 'ready', team: updated })
      return true
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      return false
    }
  }

  async function pick(memberId: number) {
    if (openSlot === null) return
    const slot = openSlot
    const ok = await run(() => assignSlot(slot, memberId))
    if (ok) setOpenSlot(null)
  }

  function toggleRacket(slot: FantasySlot) {
    run(() => (slot.has_racket ? clearRacket() : setRacket(slot.slot_index)))
  }

  function toggleBooster(slot: FantasySlot) {
    run(() => (slot.booster_active ? removeBooster() : placeBooster(slot.slot_index)))
  }

  if (state.status === 'loading') return <p className={styles.notice}>Loading your team…</p>
  if (state.status === 'error')
    return <p className={styles.notice}>Couldn&rsquo;t load your team. Please refresh.</p>

  // What the user can spend on the open slot: balance plus the refund from selling
  // whoever is in it (85% of what they paid).
  const openSlotData = openSlot !== null ? slotByIndex.get(openSlot) : undefined
  const refund = openSlotData ? Math.floor((openSlotData.price_paid ?? 0) * SELL_RATE) : 0
  const spendable = state.team.balance + refund

  const renderSlot = (index: number) => {
    const slot = slotByIndex.get(index)
    if (!slot) return null
    return (
      <SlotCard
        slot={slot}
        onOpen={() => setOpenSlot(index)}
        onToggleRacket={() => toggleRacket(slot)}
        onToggleBooster={() => toggleBooster(slot)}
        onSell={() => run(() => clearSlot(index))}
      />
    )
  }

  return (
    <section>
      <div className={styles.bar}>
        <h2 className={styles.heading}>Your fantasy squad</h2>
        <CompuBucks amount={state.team.balance} />
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

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

      <Shop
        boosterPrice={state.team.booster_price}
        boostersAvailable={state.team.boosters_available}
        balance={state.team.balance}
        onBuy={() => run(() => buyBooster())}
      />

      {openSlot !== null && (
        <MemberPicker
          slotIndex={openSlot}
          players={players}
          takenMemberIds={takenMemberIds}
          spendable={spendable}
          onPick={pick}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </section>
  )
}
