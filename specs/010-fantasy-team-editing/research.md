# Phase 0 Research: Fantasy Team Editing

All open questions were resolved during brainstorming and by reading the current code. No `NEEDS CLARIFICATION` remain.

## Decision 1 — This is a frontend-only feature

- **Decision**: Implement entirely in `frontend/`. No backend, schema, or migration change.
- **Rationale**: The backend already does what the feature needs:
  - `PUT/DELETE /api/fantasy/team/slots/{i}` buy/swap/sell per single slot; an empty slot is simply no stored row. There is **no** "must have 4 players" rule anywhere in `backend/app/routers/fantasy.py` — the gate lives only in `FantasyTeam.tsx` (`allFilled`).
  - `PUT/DELETE /api/fantasy/team/racket` and `PUT/DELETE /api/fantasy/team/booster` already toggle power-ups.
  - Each of these returns the full updated team, so the frontend can sync after a background call.
- **Alternatives considered**: A batch `PUT /api/fantasy/team` endpoint to commit all cart changes in one call. **Rejected** (YAGNI + "use what's there"): four sequential per-slot calls are simple and already exist; a batch endpoint is new surface, new tests, and new failure semantics for no user-visible gain at this scale.

## Decision 2 — Optimistic Save strategy

- **Decision**: On Save, compute the projected team locally (current server team + draft applied), render it immediately, and clear the cart. In the background, apply each pending change **sequentially** via the existing per-slot calls; the final response is the authority. On any error, show a Norwegian message and `loadTeam()` (refetch) to snap back to the server's real state.
- **Rationale**: Sequential application avoids races between the full-team responses each call returns (last-write-wins confusion). The UI already shows the projected result, so intermediate responses are ignored — only the end state (success) or a refetch (failure) matters. Matches brainstorming Approach A and the spec's "revert + show message" choice (FR-009).
- **Alternatives considered**: (a) Fire all calls concurrently — rejected, responses race and can flash stale slots. (b) A pending-operations reducer/queue with per-op rollback — rejected as YAGNI for a 4-slot, single-user screen.

## Decision 3 — Optimistic power-ups

- **Decision**: On racket/booster toggle, flip the flag in local team state immediately (icon shows), then fire the single existing call. On success, quietly accept (optionally sync from the response). On failure, `loadTeam()` to restore truth and show a message.
- **Rationale**: Directly implements FR-010/FR-011 and SC-003 ("within one interaction frame"). Reverting via refetch keeps the fix to "the display never lies" simple and correct even if several toggles overlap.
- **Alternatives considered**: Await the call before showing the icon (today's behavior) — rejected, that is the sluggish feel the spec removes.

## Decision 4 — Extract pure cart/projection math into `src/lib/fantasyCart.ts`

- **Decision**: Move `refundOf`, `netCost`, cart totals, and a new `projectTeam(team, draft)` into a pure, dependency-free module with its own unit tests; `FantasyTeam` and `Cart` consume it.
- **Rationale**: The money math (net cost of a swap, combined total, projected balance, over-budget) is the part most worth testing and is currently tangled inside the component. Extracting it mirrors the repo's existing `scheduleGraph.ts` pattern (pure logic in `src/lib`, unit-tested; component stays thin). Supports test-first (Principle I) and single responsibility (Principle II).
- **Alternatives considered**: Keep the math inline in `FantasyTeam.tsx` — rejected, harder to test the branchy money rules and grows an already-large component.

## Decision 5 — Selling stays immediate (spec 009 modal)

- **Decision**: Selling is not part of the cart. The Sell button keeps the existing `ConfirmModal` showing the refund and commits immediately via `clearSlot`.
- **Rationale**: Confirmed with the user during brainstorming; consistent with spec 009's US2. Selling is a deliberate, money-returning action that benefits from an explicit confirm rather than being batched.

## Decision 6 — Relationship to the event log (spec 009)

- **Decision**: 010 does not build the log. "Sent to the log" (FR-008, SC-005) is satisfied because the commit endpoints 010 calls are the same ones spec 009 records from. 010's acceptance for the log part is validated once 009 lands.
- **Rationale**: Keeps the two features independent; 010 delivers the editing UX regardless, and the log entries appear automatically once 009's backend recording exists. 009 should land first or alongside.
