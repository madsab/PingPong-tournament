# Feature Specification: Fantasy Team Editing (Cart + Instant Power-ups)

**Feature Branch**: `010-fantasy-team-editing`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Add a feature of not being required to have 4 players on your team. The save button displays as long as something is changed. When editing the team, the card underneath must display what is being done, like a shopping cart. When the user hits save, then it is sent directly to the log, and to the database in the background. When adding booster and golden racket, display the icons instantly and make a database call in the background; if it fails, show the message and remove the icon."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a team of any size (Priority: P1)

As a fantasy manager, I can save my squad with **any number of players (0 to 4)** — I do not have to fill all four boxes first. The **Save** button shows up as soon as I've changed something and stays available until I save or undo the change.

**Why this priority**: Today the team can only be saved once all four boxes are full, which blocks a manager who only wants one or two players, or who wants to save progress and come back. Removing that gate is the core of this request and unblocks every other part.

**Independent Test**: Start from a team with empty boxes, pick just one player, and confirm the Save button appears and successfully saves a one-player team; also confirm an unchanged team shows no Save button.

**Acceptance Scenarios**:

1. **Given** a team with fewer than four players, **When** I pick one player into a box, **Then** the Save button appears.
2. **Given** I have made no changes since my last save, **When** I look at the team, **Then** no Save button is shown.
3. **Given** I have staged one or more changes I can afford, **When** I click Save, **Then** the team saves successfully even though fewer than four boxes are filled.
4. **Given** I staged a change then removed it (cart back to empty), **When** I look at the team, **Then** the Save button disappears again.

---

### User Story 2 - See a "shopping cart" of pending changes (Priority: P1)

As a fantasy manager editing my team, a card underneath the squad shows **what I am about to do**, like a shopping cart: each pending buy or swap as its own line with the player and the CompuBucks it will cost, plus a running total and what I'll have left. When I hit **Save**, those changes are committed — recorded to my event log and written to the database in the background so the page stays responsive.

**Why this priority**: Staging changes is only trustworthy if the manager can see exactly what will happen and what it costs before committing. The cart makes the pending state explicit; without it, "save" is a leap of faith.

**Independent Test**: Stage two player picks, confirm the cart lists both with correct amounts and a correct net total/remaining, click Save, and confirm the cart clears and the changes land in the team and the event log.

**Acceptance Scenarios**:

1. **Given** I stage a buy, **When** I look at the cart, **Then** it shows a line with the player's name and the CompuBucks it will cost.
2. **Given** I stage a swap (a new player into a box that already had one), **When** I look at the cart line, **Then** the cost shown is the net after the refund from the player being replaced.
3. **Given** the cart has one or more lines, **When** I look at it, **Then** it shows the combined net cost and the CompuBucks I would have left.
4. **Given** the total would put me over budget, **When** I look at the cart, **Then** Save is unavailable and the over-budget amount is made clear.
5. **Given** I click Save, **When** the save succeeds, **Then** the cart empties, the team reflects the new players, my balance updates, and each committed buy/swap appears in my event log.
6. **Given** I remove a line from the cart, **When** I look at the team, **Then** that box returns to its previous state and the totals update.

---

### User Story 3 - Instant power-up icons with background save (Priority: P2)

As a fantasy manager, when I add the **Golden Racket** or a **Booster** to a player, the icon appears **instantly**; the change is saved to the database in the background. If that background save fails, I see a clear message and the icon is removed, so the display never lies about what is actually saved.

**Why this priority**: Power-ups are quick, frequent tweaks; waiting for a round-trip on each one feels sluggish. Optimistic display makes it feel instant, and the revert-on-failure keeps it honest. It's high-value polish but depends on the editing model in US1/US2.

**Independent Test**: Add a racket to a player and confirm the icon shows immediately; simulate a failed background save and confirm the icon disappears and an error message is shown.

**Acceptance Scenarios**:

1. **Given** I add the Golden Racket to a player, **When** I click it, **Then** the racket icon appears immediately without waiting for a spinner.
2. **Given** I add a Booster to a player, **When** I click it, **Then** the Booster icon appears immediately.
3. **Given** a power-up's background save fails, **When** the failure comes back, **Then** the icon is removed and a clear message is shown.
4. **Given** a power-up's background save succeeds, **When** it completes, **Then** the icon stays and no message is shown.

---

### Edge Cases

- **Empty team**: saving zero players is allowed (the manager cleared their squad); the log records the resulting removals/sells as applicable.
- **Nothing changed**: with no pending cart lines, there is no Save button and nothing to commit.
- **Over budget**: if staged changes cost more than the balance, Save is blocked and the shortfall is shown; the manager must remove a line or pick cheaper players.
- **Background Save fails**: the optimistic team display is reverted to what the server actually holds, and a clear message is shown — no partial/ghost state is left on screen.
- **Power-up save fails**: only that icon is reverted; the rest of the team is untouched.
- **Selling a player** is *not* part of the cart — it keeps the immediate confirm modal from spec 009 that shows the refund and commits on confirm.
- **Rapid actions**: if a manager fires several optimistic changes quickly and one fails, the failure reverts to the server's real state so the display and the database agree.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A team MUST be savable with any number of players from 0 to 4; filling all four boxes MUST NOT be required.
- **FR-002**: The Save control MUST be shown whenever there is at least one pending (unsaved) roster change, and MUST be hidden when there are none.
- **FR-003**: While editing, a cart card MUST display each pending buy/swap as its own line showing the player and the CompuBucks it will cost.
- **FR-004**: A swap line MUST show the net cost after the refund from the player being replaced.
- **FR-005**: The cart MUST show the combined net cost of all pending lines and the CompuBucks the manager would have left.
- **FR-006**: Saving MUST be prevented when the pending changes exceed the manager's balance, and the over-budget shortfall MUST be made clear.
- **FR-007**: A manager MUST be able to remove an individual line from the cart before saving, which returns that box to its prior state and updates the totals.
- **FR-008**: On Save, pending changes MUST be committed to the database and recorded in the manager's event log; the commit MUST happen in the background so the page stays responsive.
- **FR-009**: If a background Save fails, the on-screen team MUST be reverted to the server's actual state and a clear message MUST be shown.
- **FR-010**: Adding a Golden Racket or Booster MUST display its icon immediately, then persist in the background.
- **FR-011**: If a power-up's background save fails, the system MUST remove that icon and show a clear message, leaving the rest of the team unchanged.
- **FR-012**: Selling a player MUST keep the existing immediate confirm modal (spec 009) that shows the refund amount; selling is NOT staged in the cart.
- **FR-013**: All new and changed UI copy MUST follow the fantasy area's existing Norwegian language, and the layout MUST remain responsive on mobile and desktop.

### Key Entities *(include if feature involves data)*

- **Pending change (cart line)**: a not-yet-saved roster edit held only on the manager's screen until Save. Attributes: which box (slot) it targets, the chosen player, whether it replaces an existing player, and the net CompuBucks cost. Has no server record until committed.
- **Optimistic power-up state**: the on-screen racket/booster flag for a player, shown before the background save confirms; reverts if the save fails. (Reuses the existing power-up model; no new stored entity.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can save a team with 1, 2, or 3 players (not just 4) and it persists across a page reload.
- **SC-002**: For any set of pending changes, the cart's displayed net total equals the actual change to the balance after Save (0 discrepancy).
- **SC-003**: A power-up icon appears within one interaction frame of the click, with no visible wait for the network.
- **SC-004**: When a background save (Save or power-up) fails, the on-screen state matches the database after the revert 100% of the time — no ghost players or ghost icons remain.
- **SC-005**: Every committed buy/swap and sell produces exactly one matching entry in the manager's event log (ties to spec 009).

## Assumptions

- **Depends on the event log (spec 009)**: "sent to the log" means the committed buys/swaps/sells appear in the per-manager event log defined in `009-fantasy-event-log`. That feature should land first or alongside; the database commit itself does not depend on it.
- **Frontend-focused change**: the backend already supports partial teams (an empty box is simply no stored row) and already exposes per-box buy/sell and per-player racket/booster actions, so no new server capability is assumed — this feature is primarily the editing experience on the fantasy page.
- **Selling stays immediate**: per the reconciliation with spec 009, only buys/swaps are staged in the cart; selling uses the existing confirm-modal path.
- **"Background" means non-blocking, optimistic**: the screen updates to the expected result first and the network call happens after; the manager is not shown a blocking spinner for the whole team on Save or for each power-up.
- **Single manager editing their own team**: concurrent edits from two devices at once are not a target scenario; on any failure the screen reverts to the server's truth, which resolves races simply.
- **No new dependency**: the cart and optimistic behavior reuse the existing frontend stack (React + CSS Modules); no state/data-fetching library is introduced.
