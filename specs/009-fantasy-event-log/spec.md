# Feature Specification: Fantasy Event Log

**Feature Branch**: `009-fantasy-event-log`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "The fantasy page must display a log of events. Purchases, sold, wins, losses. When selling a player the modal must display how much they are sold for."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my money history (Priority: P1)

As a fantasy manager, when I open the fantasy page I can see a running list of everything that has changed my CompuBucks balance — players I bought, players I sold, and each real game my picked players won or lost — so I understand *why* my balance is what it is instead of watching a number change with no explanation.

**Why this priority**: The whole point of the paid economy is that money goes up and down for reasons. Today the balance changes silently, which feels arbitrary and untrustworthy. A visible history is the single biggest value here and the rest of the feature builds on it.

**Independent Test**: Log in as a manager who has bought at least one player and had at least one game settled, open the fantasy page, and confirm each buy, sell, win, and loss appears as its own entry showing the player, what happened, and how much CompuBucks it added or removed.

**Acceptance Scenarios**:

1. **Given** I have bought a player, **When** I view the event log, **Then** I see a "purchase" entry naming that player and showing the CompuBucks amount spent.
2. **Given** a game I own a player in has been recorded as a win, **When** I view the event log, **Then** I see a "win" entry naming that player and showing the CompuBucks amount earned.
3. **Given** a game I own a player in has been recorded as a loss, **When** I view the event log, **Then** I see a "loss" entry naming that player and showing the CompuBucks amount deducted.
4. **Given** I have several events, **When** I view the event log, **Then** entries are ordered most-recent-first and each shows when it happened.
5. **Given** a brand-new manager with no activity, **When** I view the event log, **Then** I see a friendly empty state rather than a blank area.

---

### User Story 2 - Know a player's sale value before I sell (Priority: P2)

As a fantasy manager, when I choose to sell a player, a confirmation modal tells me exactly how many CompuBucks I will get back *before* I confirm, so I never sell without knowing the payout.

**Why this priority**: Selling refunds only part of what was paid, so the sale value is not obvious. Showing it at the moment of decision prevents regret and mistaken sales. It depends on the sell action but is a self-contained, high-value guardrail.

**Independent Test**: Own a bought player, click sell, and confirm the modal shows the exact refund amount; cancelling makes no change, confirming sells the player and records a matching "sale" entry in the log.

**Acceptance Scenarios**:

1. **Given** I own a bought player, **When** I click sell, **Then** a confirmation modal appears stating the CompuBucks amount I will receive for that player.
2. **Given** the sell confirmation modal is open, **When** I cancel, **Then** the player stays on my team and no sale entry is created.
3. **Given** the sell confirmation modal is open, **When** I confirm, **Then** the player is removed, my balance increases by the shown amount, and a "sale" entry appears in the event log showing that same amount.

---

### Edge Cases

- **New manager, no history**: log shows an empty state (US1 #5).
- **Multiple sub-games in one match**: each individual game a picked player played produces its own win or loss entry (one game = one +/- event), consistent with how earnings are already settled.
- **Power-ups change the amount**: a win or loss entry shows the *actual* CompuBucks applied, including the Golden Racket (doubled) or Booster (+50%) effect — not the base amount.
- **Balance hits the floor**: if a loss would push the balance below zero, the entry reflects the amount actually deducted (down to zero), matching the "never below zero" rule.
- **Sold player, then that player later wins a real game**: no win entry is created for a player no longer on the team — events only reflect players owned at the time the game was settled.
- **Player removed by admin**: an event that already references that player keeps showing the name it was recorded with, so the history stays readable.
- **A recorded result is corrected/re-recorded by admin**: the log must not double-count the same game's win/loss for the same manager.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The fantasy page MUST display an event log showing the signed-in manager's own events only.
- **FR-002**: The log MUST include four event kinds: **purchase** (bought a player), **sale** (sold a player), **win** (a picked player won a real game), and **loss** (a picked player lost a real game).
- **FR-003**: Every entry MUST show the player it concerns, the kind of event, and the CompuBucks amount added or removed (with a clear +/- direction).
- **FR-004**: Win and loss entries MUST show the actual CompuBucks amount applied, reflecting any Golden Racket or Booster effect active for that player at settlement.
- **FR-005**: Every entry MUST show when it happened, and entries MUST be ordered most-recent-first.
- **FR-006**: The log MUST show a friendly empty state when the manager has no events.
- **FR-007**: When a manager chooses to sell a player, the system MUST show a confirmation modal stating the exact CompuBucks refund amount before the sale is committed.
- **FR-008**: Cancelling the sell modal MUST make no change; confirming MUST sell the player and record a sale entry whose amount equals the value shown in the modal.
- **FR-009**: The log MUST NOT double-count the same real game for the same manager if an admin re-records that match's result.
- **FR-010**: Events MUST reflect only players the manager owned at the moment each event occurred (a game settles against the roster at settlement time).

### Key Entities *(include if feature involves data)*

- **Event log entry**: one thing that changed (or attempted to change) a manager's CompuBucks. Attributes: which manager it belongs to, kind (purchase / sale / win / loss), the player's display name, the signed CompuBucks amount applied, and the time it occurred. Win/loss entries relate back to the real game/match that caused them; purchase/sale entries relate to the roster slot action that caused them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can, within 5 seconds of opening the fantasy page, point to the specific event that most recently changed their balance and read its amount.
- **SC-002**: 100% of buy, sell, win, and loss actions that change a manager's balance produce exactly one matching log entry (no missing, no duplicate).
- **SC-003**: In every sale, the refund amount shown in the confirmation modal equals the amount by which the balance increases and the amount recorded in the resulting sale entry (0 discrepancy).
- **SC-004**: For each win/loss entry, the displayed amount equals the actual balance change for that game including power-up effects (0 discrepancy against the settled amount).
- **SC-005**: New managers with no activity always see a readable empty state rather than a blank or broken area.

## Assumptions

- **Scope is the fantasy page only**: the log is personal (per manager) and read-only; there is no shared/global activity feed and no admin view of other managers' logs.
- **Win/loss granularity is per game**: consistent with the existing economy, one settled sub-game a picked player played is one event (+ for a win, − for a loss), not one aggregated per-match total.
- **Amounts reuse the existing economy rules** (buy price, 85% sell refund, per-game win/loss values, Golden Racket doubling, Booster +50%) — this feature displays and logs those amounts, it does not change how they are calculated.
- **History going forward**: purchase and sale events are captured from when this feature is live. Win/loss history is shown for game results that have been settled under the economy; results settled before this feature existed appear if their settlement data supports it, otherwise the log begins accumulating from first use. (Confirmed retroactive coverage is a plan-time detail, not a scope commitment here.)
- **Reasonable list length**: the log shows recent events with an obvious way to see older ones if the list grows long (e.g. scroll or "show more"); an exact cap is a design detail, not a requirement.
- **Norwegian UI copy**: the fantasy area is already Norwegian, so event-log labels and the sell modal follow the same language as the rest of the fantasy page.
- **Existing identity model reused**: "the manager" is the token-authenticated fantasy user already used by the fantasy page; no new login or account concept is introduced.
