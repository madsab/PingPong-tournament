# UI & API Contracts: Fantasy Team Editing

No **new** API endpoints. This feature is UI behavior over existing endpoints, plus one new pure module and one new component.

## Reused API endpoints (no change)

| Endpoint | Used for |
|----------|----------|
| `GET /api/fantasy/team` | Load team; also the **revert** source on any failure (`loadTeam`). |
| `PUT /api/fantasy/team/slots/{i}` (`assignSlot`) | Commit a staged buy/swap on Save. |
| `DELETE /api/fantasy/team/slots/{i}` (`clearSlot`) | Sell (immediate, via confirm modal — unchanged). |
| `PUT/DELETE /api/fantasy/team/racket` | Optimistic Golden Racket toggle. |
| `PUT/DELETE /api/fantasy/team/booster` | Optimistic Booster toggle. |
| `POST /api/fantasy/shop/booster` | Buy a Booster (unchanged). |

Each write returns the full `FantasyTeam` (balance + 4 slots), which the frontend uses to sync on success.

## New pure module: `src/lib/fantasyCart.ts`

```ts
refundOf(pricePaid: number): number
netCost(player: Player, replaced: FantasySlot | undefined): number
cartTotals(team: FantasyTeam, draft: Map<number, Player>):
  { total: number; remaining: number; overBudget: boolean; canSave: boolean }
projectTeam(team: FantasyTeam, draft: Map<number, Player>): FantasyTeam
```

Contract: pure (no I/O, no React), deterministic, fully unit-tested. `canSave` is `draft.size > 0 && !overBudget` — there is **no** requirement that all 4 slots are filled.

## New component: `Cart`

```ts
interface CartLine {
  slotIndex: number
  playerName: string
  netCost: number
  isSwap: boolean
}

interface CartProps {
  lines: CartLine[]         // one per pending draft pick
  total: number
  remaining: number
  overBudget: boolean
  canSave: boolean
  saving: boolean
  onRemoveLine: (slotIndex: number) => void
  onSave: () => void
}
```

Contract:
- Renders **nothing** when `lines` is empty (Save button only exists when there is a pending change — FR-002).
- Each line shows player name and `netCost` (swaps show the net-after-refund amount — FR-004).
- Shows `total` and `remaining`; when `overBudget`, makes the shortfall clear and Save is disabled (FR-006).
- Norwegian copy; responsive (wraps/stacks on mobile).

## `FantasyTeam` orchestration contract (behavioral)

- **Save visible** ⇔ `draft.size > 0`. Saving a 0–4 player team succeeds (FR-001).
- **Optimistic Save**: render `projectTeam(...)`, clear draft, apply picks in the background sequentially; on error → message + `loadTeam()` (FR-008, FR-009).
- **Optimistic power-up**: flip flag locally now, fire call; on error → remove icon + message via `loadTeam()` (FR-010, FR-011).
- **Sell**: unchanged — confirm modal showing refund, immediate `clearSlot` (FR-012).
