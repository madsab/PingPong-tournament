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
import { cartTotals, netCost, projectTeam, refundOf } from '../../../lib/fantasyCart'
import { SlotCard } from '../SlotCard/SlotCard'
import { MemberPicker } from '../MemberPicker/MemberPicker'
import { ConfirmModal } from '../ConfirmModal/ConfirmModal'
import { PingPongTable } from '../PingPongTable/PingPongTable'
import { CompuBucks } from '../CompuBucks/CompuBucks'
import { Shop } from '../Shop/Shop'
import { Cart, type CartLine } from '../Cart/Cart'
import styles from './FantasyTeam.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; team: FantasyTeamData }

// Turn a picked Player into a slot-shaped object so SlotCard can render a draft
// pick the same way it renders a saved one. `price_paid` here is what they WILL
// pay on Save (the player's current price).
const draftToSlot = (index: number, player: Player): FantasySlot => ({
  slot_index: index,
  member_id: player.id,
  member_name: player.name,
  team_id: player.team_id,
  team_name: player.team_name,
  team_logo_url: player.team_logo_url,
  price_paid: player.price ?? 0,
  has_racket: false,
  booster_active: false,
})

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

// The fantasy squad laid out like a doubles match: two players on the left, a
// ping-pong table in the middle, two on the right (stacks on mobile).
//
// Editing (feature 010):
//  - Picking players is STAGED into a "shopping cart" (no money, no server call).
//    You can save ANY number of players (0-4); the Save button shows whenever the
//    cart has a change. Save is optimistic: the screen updates first, the buys are
//    written in the background, and a failure reverts to the server's real state.
//  - Selling is immediate and asks for confirmation first (shows the refund).
//  - Golden Racket / Booster are optimistic: the icon shows instantly, the call
//    runs in the background, and a failure removes the icon with a message.
//
// `onChange` is called after any successful mutation so the parent can refresh the
// event log (feature 009).
export function FantasyTeam({ onChange }: { onChange?: () => void } = {}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [players, setPlayers] = useState<Player[]>([])
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Locally-chosen players not yet bought, keyed by slot index (the cart).
  const [draft, setDraft] = useState<Map<number, Player>>(new Map())
  // The saved slot we're asking to sell (null = no modal open).
  const [sellTarget, setSellTarget] = useState<FantasySlot | null>(null)
  const [saving, setSaving] = useState(false)

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

  const savedByIndex = useMemo(() => {
    const map = new Map<number, FantasySlot>()
    for (const s of team?.slots ?? []) map.set(s.slot_index, s)
    return map
  }, [team])

  const savedFilled = (i: number) => (savedByIndex.get(i)?.member_id ?? null) !== null

  // Members already on the team (saved) or chosen in the draft — shown disabled in
  // the picker so nobody is picked twice.
  const takenMemberIds = useMemo(() => {
    const ids = new Set<number>()
    for (const s of team?.slots ?? []) if (s.member_id !== null) ids.add(s.member_id)
    for (const p of draft.values()) ids.add(p.id)
    return ids
  }, [team, draft])

  // One error-surfacing wrapper for the actions that stay synchronous (sell, shop
  // buy): run the call, refresh from its response, show any error.
  async function run(action: () => Promise<FantasyTeamData>) {
    setError(null)
    try {
      const updated = await action()
      setState({ status: 'ready', team: updated })
      onChange?.()
      return true
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      return false
    }
  }

  // Optimistic update for the power-ups: show the new slot state now, persist in
  // the background, and revert to server truth (with a message) if it fails.
  async function optimistic(
    mutate: (slots: FantasySlot[]) => FantasySlot[],
    action: () => Promise<FantasyTeamData>,
  ) {
    if (state.status !== 'ready') return
    setError(null)
    setState({ status: 'ready', team: { ...state.team, slots: mutate(state.team.slots) } })
    try {
      const updated = await action()
      setState({ status: 'ready', team: updated })
      onChange?.()
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      loadTeam()
    }
  }

  // Picking only stages the choice — no money, no server call until Save.
  function pick(memberId: number) {
    if (openSlot === null) return
    const player = players.find((p) => p.id === memberId)
    if (!player) return
    setDraft((d) => new Map(d).set(openSlot, player))
    setOpenSlot(null)
  }

  function discardDraft(index: number) {
    setDraft((d) => {
      const next = new Map(d)
      next.delete(index)
      return next
    })
  }

  // Commit the cart optimistically: show the projected team, empty the cart, then
  // buy each pick into its slot in the background (one call per slot — the backend
  // has no batch endpoint). On any failure, refetch so the UI matches the server.
  async function saveTeam() {
    if (state.status !== 'ready') return
    const server = state.team
    const picks = [...draft]
    setError(null)
    setState({ status: 'ready', team: projectTeam(server, draft) })
    setDraft(new Map())
    setSaving(true)
    try {
      let latest = server
      for (const [index, player] of picks) {
        latest = await assignSlot(index, player.id)
      }
      setState({ status: 'ready', team: latest })
      onChange?.()
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      loadTeam()
    } finally {
      setSaving(false)
    }
  }

  async function confirmSell() {
    if (sellTarget === null) return
    const index = sellTarget.slot_index
    setSellTarget(null)
    await run(() => clearSlot(index))
  }

  function toggleRacket(slot: FantasySlot) {
    const turningOn = !slot.has_racket
    optimistic(
      (slots) => slots.map((s) => ({ ...s, has_racket: turningOn && s.slot_index === slot.slot_index })),
      () => (slot.has_racket ? clearRacket() : setRacket(slot.slot_index)),
    )
  }

  function toggleBooster(slot: FantasySlot) {
    const turningOn = !slot.booster_active
    optimistic(
      (slots) =>
        slots.map((s) =>
          s.slot_index === slot.slot_index ? { ...s, booster_active: turningOn } : s,
        ),
      () => (slot.booster_active ? removeBooster() : placeBooster(slot.slot_index)),
    )
  }

  if (state.status === 'loading') return <p className={styles.notice}>Loading your team…</p>
  if (state.status === 'error')
    return <p className={styles.notice}>Couldn&rsquo;t load your team. Please refresh.</p>

  const totals = cartTotals(state.team, draft)

  // The cart lines, ordered by slot for a stable display.
  const cartLines: CartLine[] = [...draft]
    .map(([slotIndex, player]) => ({
      slotIndex,
      playerName: player.name,
      netCost: netCost(player, savedByIndex.get(slotIndex)),
      isSwap: savedFilled(slotIndex),
    }))
    .sort((a, b) => a.slotIndex - b.slotIndex)

  // What the user can spend on the open slot: balance, minus committing the OTHER
  // draft picks, plus the refund from selling whoever is saved in this slot.
  let spendable = state.team.balance
  if (openSlot !== null) {
    let otherDraftCost = 0
    for (const [i, p] of draft) if (i !== openSlot) otherDraftCost += netCost(p, savedByIndex.get(i))
    spendable =
      state.team.balance - otherDraftCost + refundOf(savedByIndex.get(openSlot)?.price_paid ?? 0)
  }

  const renderSlot = (index: number) => {
    const draftPlayer = draft.get(index)
    if (draftPlayer) {
      return (
        <SlotCard
          slot={draftToSlot(index, draftPlayer)}
          saved={false}
          onOpen={() => setOpenSlot(index)}
          onToggleRacket={() => {}}
          onToggleBooster={() => {}}
          onSell={() => {}}
          onRemove={() => discardDraft(index)}
        />
      )
    }
    const slot = savedByIndex.get(index)
    if (!slot) return null
    return (
      <SlotCard
        slot={slot}
        saved
        onOpen={() => setOpenSlot(index)}
        onToggleRacket={() => toggleRacket(slot)}
        onToggleBooster={() => toggleBooster(slot)}
        onSell={() => slot.member_id !== null && setSellTarget(slot)}
        onRemove={() => {}}
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

      <Cart
        lines={cartLines}
        total={totals.total}
        remaining={totals.remaining}
        overBudget={totals.overBudget}
        canSave={totals.canSave}
        saving={saving}
        onRemoveLine={discardDraft}
        onSave={saveTeam}
      />

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

      {sellTarget !== null && (
        <ConfirmModal
          message={`Er du sikker på at du vil selge ${sellTarget.member_name}? Du får ${compact.format(
            refundOf(sellTarget.price_paid),
          )} CompuBucks tilbake.`}
          confirmLabel="Selg"
          cancelLabel="Avbryt"
          onConfirm={confirmSell}
          onCancel={() => setSellTarget(null)}
        />
      )}
    </section>
  )
}
