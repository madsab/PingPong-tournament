# Quickstart / Validation: Fantasy Team Editing

Frontend-only feature. Validate with the frontend test suite and a short manual pass.

## Prerequisites

- `cd frontend && npm install`
- For the manual pass, the full stack running: `docker compose up --build` (frontend :5173, backend :8000). Seed demo data if needed: `docker compose exec backend python -m app.seed`.

## Automated tests

```bash
cd frontend
npm test                                   # whole suite
npx vitest run src/lib/fantasyCart         # pure cart/projection math
npx vitest run src/components/fantasy/Cart # cart component
npx vitest run src/components/fantasy/FantasyTeam  # orchestration behavior
```

Expected coverage (all must pass):

- **fantasyCart**: `refundOf` 85% floor; `netCost` for empty slot (full price) vs swap (net after refund); `cartTotals` total/remaining/overBudget; `canSave` true for a 1-player draft and false when over budget; `projectTeam` fills slots and reduces balance by the total.
- **Cart**: renders nothing with no lines; renders a line per pick with the right amount; disables Save when over budget; fires `onRemoveLine` / `onSave`.
- **FantasyTeam**:
  - Save button appears after one pick and is absent with no changes.
  - Saving a 1-player (partial) team calls `assignSlot` and succeeds — no 4-player gate.
  - Power-up click shows the icon immediately (before the mocked call resolves); a rejected call removes the icon and shows a message.
  - A rejected Save shows a message and refetches (team reverts to server state).

## Manual validation (`/fantasy`, logged in)

1. **Partial save** — pick one player, confirm the Save button appears, save, reload → the one-player team persists.
2. **Cart** — stage two picks; confirm the cart lists both with correct amounts, a net total, and remaining; remove one line and confirm totals update.
3. **Over budget** — stage picks beyond your balance; confirm Save is disabled and the shortfall is shown.
4. **Instant power-up** — add the Golden Racket / Booster; confirm the icon appears immediately.
5. **Sell** — click Sell; confirm the modal shows the refund amount and selling commits immediately.

## Cross-feature note

The "changes appear in my event log" outcome (spec 009) is validated once **009-fantasy-event-log** is implemented; 010's commits already call the endpoints 009 records from.
