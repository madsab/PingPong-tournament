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
import { ConfirmModal } from '../ConfirmModal/ConfirmModal'
import { PingPongTable } from '../PingPongTable/PingPongTable'
import { CompuBucks } from '../CompuBucks/CompuBucks'
import { Shop } from '../Shop/Shop'
import styles from './FantasyTeam.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; team: FantasyTeamData }

const SELL_RATE = 0.85

// The refund you get back for selling a player you paid `pricePaid` for.
const refundOf = (pricePaid: number) => Math.floor(pricePaid * SELL_RATE)

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

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

// The fantasy squad laid out like a doubles match: two players on the left, a
// ping-pong table in the middle, two on the right (stacks on mobile).
//
// Picking players is now STAGED: choosing a player fills a slot as a draft (no
// money moves). Once all four slots are filled the "Save team" button appears;
// only then are the picks committed and CompuBucks deducted. Selling a saved
// player is still instant, but asks for confirmation first.
export function FantasyTeam() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [players, setPlayers] = useState<Player[]>([])
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Locally-chosen players not yet bought, keyed by slot index.
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

  // A slot is "filled" if it has a saved player or a draft pick.
  const savedFilled = (i: number) => (savedByIndex.get(i)?.member_id ?? null) !== null
  const isFilled = (i: number) => draft.has(i) || savedFilled(i)

  // Members already on the team (saved) or chosen in the draft — shown disabled in
  // the picker so nobody is picked twice.
  const takenMemberIds = useMemo(() => {
    const ids = new Set<number>()
    for (const s of team?.slots ?? []) if (s.member_id !== null) ids.add(s.member_id)
    for (const p of draft.values()) ids.add(p.id)
    return ids
  }, [team, draft])

  // Net cost of one draft pick: its price minus the refund from the saved player it
  // replaces (empty slot = full price; a swap refunds 85% of the old one).
  const netCost = useCallback(
    (index: number, player: Player) =>
      (player.price ?? 0) - refundOf(savedByIndex.get(index)?.price_paid ?? 0),
    [savedByIndex],
  )

  // What committing every draft pick would cost, and what's left after.
  const draftCost = useMemo(() => {
    let sum = 0
    for (const [i, p] of draft) sum += netCost(i, p)
    return sum
  }, [draft, netCost])

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

  // Commit every draft pick by buying it into its slot, one call per slot (the
  // backend has no batch endpoint). Since Save is only enabled when the whole
  // draft is affordable, a mid-way failure is rare; if one happens we stop, show
  // the message and refetch so the UI matches the server.
  async function saveTeam() {
    setError(null)
    setSaving(true)
    try {
      let latest: FantasyTeamData | null = null
      for (const [index, player] of draft) {
        latest = await assignSlot(index, player.id)
      }
      if (latest) setState({ status: 'ready', team: latest })
      setDraft(new Map())
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
    run(() => (slot.has_racket ? clearRacket() : setRacket(slot.slot_index)))
  }

  function toggleBooster(slot: FantasySlot) {
    run(() => (slot.booster_active ? removeBooster() : placeBooster(slot.slot_index)))
  }

  if (state.status === 'loading') return <p className={styles.notice}>Loading your team…</p>
  if (state.status === 'error')
    return <p className={styles.notice}>Couldn&rsquo;t load your team. Please refresh.</p>

  const allFilled = [1, 2, 3, 4].every(isFilled)
  const hasDraft = draft.size > 0
  const remaining = state.team.balance - draftCost
  const canSave = allFilled && hasDraft && remaining >= 0

  // What the user can spend on the open slot: balance, minus committing the OTHER
  // draft picks, plus the refund from selling whoever is saved in this slot.
  let spendable = state.team.balance
  if (openSlot !== null) {
    let otherDraftCost = 0
    for (const [i, p] of draft) if (i !== openSlot) otherDraftCost += netCost(i, p)
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

      {allFilled && hasDraft && (
        <div className={styles.saveBar}>
          <span className={styles.savePreview}>
            {remaining >= 0
              ? `Costs ${compact.format(draftCost)} · ${compact.format(remaining)} left`
              : `Over budget by ${compact.format(-remaining)}`}
          </span>
          <button
            type="button"
            className={styles.save}
            disabled={!canSave || saving}
            onClick={saveTeam}
          >
            {saving ? 'Saving…' : 'Save team'}
          </button>
        </div>
      )}

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
          message={`Er du sikker på at du vil selge ${sellTarget.member_name}?`}
          confirmLabel="Selg"
          cancelLabel="Avbryt"
          onConfirm={confirmSell}
          onCancel={() => setSellTarget(null)}
        />
      )}
    </section>
  )
}
