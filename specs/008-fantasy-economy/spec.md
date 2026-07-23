# Feature Specification: Fantasy CompuBucks Economy

**Feature Branch**: `008-fantasy-economy`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "The fantasy team now costs money. Each signed-up user starts with 100 000 000 CompuBucks. Each player has a price (good players cost more); the price is set in the admin page. Earn 5 000 000 CompuBucks when a player on your fantasy team wins a submatch. To change a player, you sell that player for 85% of their buy-value. If a player on your team loses a submatch you lose 2 000 000 CompuBucks. You can never have less than 0 CompuBucks. A user can give the 'Golden Ping Pong Racket' to ONE player on their team (golden racket icon in the bottom-right of the player card); that player's win and loss are doubled (win 10 000 000, loss 4 000 000). Add a shop where a user can buy a one-time Booster and place it on a player for their next match; the Booster shows an icon on the player card; if the player wins their next match while boosted, the user earns 50% more CompuBucks; this does NOT stack with the golden racket. Update the rules — keep them simple and short."

## Overview

This feature turns the existing free Fantasy Ping Pong game (spec `007-fantasy-teams`) into a **paid economy**. Players now cost money to pick, real match results move a running CompuBucks balance up and down, and two special power-ups (the Golden Ping Pong Racket and a one-time Booster from a shop) let users amplify their earnings. It replaces the old "computed reward" model (+10 per win, read-only) with a real balance that starts at a fixed amount and changes as the user buys, sells, and watches their picked players compete.

**Currency amounts (v1 defaults — the two prices are admin-tunable):**

| Thing | Amount |
|---|---|
| Starting balance | 100,000,000 CompuBucks |
| Win a submatch (game) | +5,000,000 |
| Lose a submatch (game) | −2,000,000 |
| Golden Racket — win | +10,000,000 (2×) |
| Golden Racket — loss | −4,000,000 (2×) |
| Booster — win bonus | +50% of the win amount (base win → 7,500,000) |
| Sell a player | 85% of the price the user paid for them |
| Player price | Set per-player by admin (no default; unpriced players cannot be picked) |
| Booster price | Set by admin, default 1,000,000 |
| Floor | Balance can never drop below 0 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin prices the players (Priority: P1)

An admin opens the admin page and sets a CompuBucks price on each real player. Better/stronger players can be given higher prices. A player that has no price yet cannot be picked by fantasy users, so the admin controls when a player becomes available and how expensive they are.

**Why this priority**: Nothing in the economy works until players have prices — buying, selling, and budgeting all depend on a price existing. This is the enabling slice.

**Independent Test**: In the admin page, set a price on a player, confirm it saves, then confirm that player appears as buyable in the fantasy picker; a player left without a price does not appear as buyable.

**Acceptance Scenarios**:

1. **Given** an admin on the admin page, **When** they set a non-negative price on a player and save, **Then** the price is stored and shown for that player.
2. **Given** a player with no price set, **When** a fantasy user opens the picker, **Then** that player is not available to buy.
3. **Given** an admin sets a price of 0 on a player, **When** a fantasy user picks them, **Then** the pick succeeds and costs nothing.
4. **Given** an admin enters a negative or non-numeric price, **When** they save, **Then** it is rejected with a clear message.

---

### User Story 2 - Buy and sell players within a budget (Priority: P1)

A logged-in fantasy user starts with 100,000,000 CompuBucks. They fill their four slots by buying priced players; each purchase subtracts the player's current price from their balance. They cannot buy a player they can't afford. To change or remove a player, they sell the one in that slot and get back 85% of what they originally paid for that player; the slot is then free to buy someone new.

**Why this priority**: This is the core of the new economy and the main behaviour change from the free v1. It depends only on prices existing (P1) and delivers the "manage a budget" experience on its own.

**Independent Test**: Starting from 100,000,000, buy a player and confirm the balance drops by their price; try to buy a player you can't afford and confirm it's blocked; sell a bought player and confirm you get back exactly 85% of what you paid and the slot empties.

**Acceptance Scenarios**:

1. **Given** a user with 100,000,000 and an empty slot, **When** they buy a player priced 20,000,000, **Then** the player fills the slot and the balance becomes 80,000,000.
2. **Given** a user whose balance is lower than a player's price, **When** they try to buy that player, **Then** the purchase is rejected with a clear "not enough CompuBucks" message and nothing changes.
3. **Given** a slot holding a player the user bought for 20,000,000, **When** they sell that player, **Then** they receive 17,000,000 back (85%), the slot empties, and the balance increases by 17,000,000.
4. **Given** a user wants to swap a player, **When** they sell the current player and buy a different one, **Then** the balance reflects 85% back for the sale minus the new player's price.
5. **Given** the same real player already sits in one of the user's slots, **When** they try to buy that player again into another slot, **Then** it is rejected (no duplicate players on one team).
6. **Given** an admin changes a player's price after a user bought them, **When** the user later sells, **Then** they still get 85% of the price they actually paid, not 85% of the new price.

---

### User Story 3 - Earn and lose CompuBucks from real submatches (Priority: P2)

Once players are on a user's team, every real submatch (individual game) those players complete moves the user's balance. A win by a picked player adds 5,000,000; a loss subtracts 2,000,000. The balance can never go below 0. Only submatches finished after the user bought that player count, so a fresh purchase does not retroactively earn or lose from past games.

**Why this priority**: This is the reward/risk payoff that makes buying players meaningful, but it only matters once a user owns players (P1/P2).

**Independent Test**: Buy a player, have an admin record a completed game the player won, and confirm the balance rose by 5,000,000; have the player lose a game and confirm the balance dropped by 2,000,000; drive the balance toward zero with losses and confirm it stops at 0.

**Acceptance Scenarios**:

1. **Given** a picked player who wins a submatch completed after purchase, **When** the user views their balance, **Then** it has increased by 5,000,000 for that win.
2. **Given** a picked player who loses a submatch completed after purchase, **When** the user views their balance, **Then** it has decreased by 2,000,000 for that loss.
3. **Given** a user whose balance is 1,000,000 and a picked player loses a submatch (−2,000,000), **When** the balance is calculated, **Then** it is 0, not negative.
4. **Given** submatches a player completed before the user bought them, **When** the balance is calculated, **Then** those earlier submatches do not affect the balance.
5. **Given** an empty slot, **When** the balance is calculated, **Then** the empty slot contributes nothing.
6. **Given** a submatch that has not been completed yet, **When** the balance is calculated, **Then** it contributes nothing until it is completed.

---

### User Story 4 - Golden Ping Pong Racket (Priority: P3)

A user can hand the "Golden Ping Pong Racket" to exactly one player on their team. That player's stakes double: wins pay 10,000,000 and losses cost 4,000,000. The card of the chosen player shows a golden racket icon in its bottom-right corner. The user can move the racket to a different player, but only one player can hold it at a time.

**Why this priority**: A strategic amplifier layered on top of the earn/lose system (P2). Valuable but not required for the economy to function.

**Independent Test**: Give the racket to a picked player, confirm the golden racket icon shows on that player only, then confirm that player's win pays 10,000,000 and loss costs 4,000,000 while other players stay at 5,000,000 / −2,000,000.

**Acceptance Scenarios**:

1. **Given** a user with players on their team, **When** they assign the Golden Racket to one player, **Then** that player's card shows the golden racket icon (bottom-right) and no other player shows it.
2. **Given** the racket is on player A, **When** the user assigns it to player B, **Then** it moves to B and A no longer has it (only one racket per team).
3. **Given** a player holding the racket who wins a submatch, **When** the balance is calculated, **Then** the user earns 10,000,000 for that win.
4. **Given** a player holding the racket who loses a submatch, **When** the balance is calculated, **Then** the user loses 4,000,000 for that loss (still floored at 0).
5. **Given** the racket-holding player is sold or their slot cleared, **When** that happens, **Then** the racket is no longer assigned and the user may give it to another player.

---

### User Story 5 - Booster shop (Priority: P4)

A user visits a shop and buys a one-time Booster (default price 1,000,000, set in admin). They place the Booster on one player. It applies to that player's very next submatch: if the player wins that game, the user earns 50% more than the normal win amount for that game (7,500,000 instead of 5,000,000). The Booster is used up after that one game whether the player wins or loses, and the boosted player's card shows a Booster icon while it is active. The Booster does not stack with the Golden Racket — a player who holds the racket gets no extra Booster bonus.

**Why this priority**: A fun, optional purchasable power-up on top of everything else. Nice-to-have, so it comes last.

**Independent Test**: Buy a Booster (balance drops by its price), place it on a player, have that player win their next game, and confirm the user earns 7,500,000 for that game and the Booster is then gone; repeat with the player losing and confirm the Booster is used up with no bonus.

**Acceptance Scenarios**:

1. **Given** a user with enough CompuBucks, **When** they buy a Booster in the shop, **Then** their balance drops by the Booster price and they hold one unused Booster.
2. **Given** a user with an unused Booster, **When** they place it on a picked player, **Then** that player's card shows the Booster icon.
3. **Given** a boosted player who wins their next submatch, **When** the balance is calculated, **Then** the user earns 7,500,000 for that game (50% more than 5,000,000) and the Booster is consumed.
4. **Given** a boosted player who loses their next submatch, **When** the balance is calculated, **Then** the normal loss applies, the Booster is consumed, and no bonus is given.
5. **Given** a player who holds both the Golden Racket and a Booster and wins their next submatch, **When** the balance is calculated, **Then** the user earns 10,000,000 (racket only — the Booster bonus does not stack) and the Booster is consumed.
6. **Given** a user who cannot afford the Booster, **When** they try to buy it, **Then** the purchase is rejected with a clear message and nothing changes.

---

### User Story 6 - Simple, short rules (Priority: P4)

The fantasy rules shown on the page are updated to explain the new economy — starting budget, buying/selling, earning and losing from submatches, the Golden Racket, and the Booster — in a few short, plain-language lines that a first-time visitor can read in under a minute.

**Why this priority**: Supports comprehension of everything above; low risk and can ship alongside the other stories.

**Independent Test**: Open the fantasy page and confirm the rules describe the starting balance, buy/sell (85%), win (+5M) / loss (−2M), the Golden Racket (double), and the Booster (+50%, one-time) briefly and clearly.

**Acceptance Scenarios**:

1. **Given** a visitor on the fantasy page, **When** they read the rules, **Then** the rules state the starting balance, that players cost money, the sell-back rate, the win/loss amounts, and what the Racket and Booster do.
2. **Given** the rules block, **When** measured, **Then** it stays short (a handful of lines/bullets), not a wall of text.

---

### Edge Cases

- **Balance floor on multiple losses**: several losses in a row stop the balance at exactly 0; it never goes negative, and the "missing" negative amount is simply not carried forward.
- **Selling rounds to a whole number**: 85% of an odd price is rounded (down) to a whole CompuBucks amount so no fractional currency exists.
- **Admin changes a price after purchase**: the user's sell-back is always 85% of what they actually paid, not the current price.
- **A picked player is deleted by an admin**: that slot empties, any racket/booster on that player is dropped, and the deleted player stops affecting the balance. (The user is not refunded automatically — treated the same as the player simply leaving; see Assumptions.)
- **Booster placed on the racket-holder**: allowed, but gives no extra bonus (no stacking); to avoid wasting it the interface should discourage this. The Booster is still consumed on the player's next game.
- **Buying with exactly enough**: buying a player priced exactly at the current balance is allowed and leaves the balance at 0.
- **Racket/Booster with no game yet played**: assigning them changes nothing until the player next completes a submatch.
- **Whitespace/invalid price input in admin**: rejected by the backend, never stored.

## Requirements *(mandatory)*

### Functional Requirements

**Pricing (admin)**

- **FR-001**: The system MUST let an admin set a per-player CompuBucks price (a non-negative whole number) and change it later.
- **FR-002**: The system MUST treat a player with no price set as not pickable/buyable by fantasy users.
- **FR-003**: The system MUST let an admin set the Booster price (a non-negative whole number), defaulting to 1,000,000 until changed.
- **FR-004**: The system MUST validate all admin price input on the backend and reject negative, non-numeric, or malformed values with a clear message.

**Budget, buying and selling**

- **FR-005**: The system MUST give every fantasy user a starting balance of 100,000,000 CompuBucks.
- **FR-006**: The system MUST subtract a player's current price from the user's balance when the user buys that player into a slot, and MUST reject the purchase (changing nothing) if the balance is less than the price.
- **FR-007**: The system MUST record the price the user actually paid for each bought player so sell-backs use that paid amount.
- **FR-008**: The system MUST return 85% of the paid price (rounded down to a whole number) to the balance when the user sells the player in a slot, and MUST empty that slot.
- **FR-009**: The system MUST prevent the same real player from occupying more than one of a single user's slots.
- **FR-010**: The system MUST keep the four-slot team model from the existing fantasy feature (an empty slot is simply unbought).

**Earning and losing**

- **FR-011**: The system MUST add 5,000,000 to the balance for each submatch (game) won by a player on the user's team that completes after that player was bought.
- **FR-012**: The system MUST subtract 2,000,000 from the balance for each submatch lost by a player on the user's team that completes after that player was bought.
- **FR-013**: The system MUST never let the balance drop below 0; any penalty that would take it negative leaves it at 0.
- **FR-014**: The system MUST ignore submatches that completed before the player was bought, submatches not yet completed, and empty slots when computing the balance.

**Golden Ping Pong Racket**

- **FR-015**: The system MUST let a user assign a "Golden Ping Pong Racket" to at most one player on their team at a time, and let them move it to another of their players.
- **FR-016**: The system MUST double both the win reward (to 10,000,000) and the loss penalty (to 4,000,000) for the submatches of the racket-holding player.
- **FR-017**: The system MUST display a golden racket indicator in the bottom-right corner of the racket-holding player's card, and on no other card.
- **FR-018**: The system MUST drop the racket assignment when the racket-holding player is sold, cleared, or deleted.

**Booster shop**

- **FR-019**: The system MUST provide a shop where a user can buy a one-time Booster for the current Booster price, subtracting that price from the balance and rejecting the purchase if the user cannot afford it.
- **FR-020**: The system MUST let a user place an unused Booster on exactly one player on their team.
- **FR-021**: The system MUST apply the Booster to the boosted player's next completed submatch only: on a win, the user earns 50% more than the normal win amount for that game; the Booster is then consumed regardless of win or loss.
- **FR-022**: The system MUST NOT stack the Booster with the Golden Racket — if the boosted player also holds the racket, the racket amounts apply and the Booster grants no additional bonus (and is consumed on the next game).
- **FR-023**: The system MUST display a Booster indicator on the card of a player currently carrying an unused Booster.
- **FR-024**: The system MUST let a user buy the Booster again after a previous one has been consumed, as often as they can afford it.

**Validation, isolation, rules**

- **FR-025**: The system MUST validate every economy action on the backend (affordability, valid player, one racket per team, no duplicate players, unused-Booster-exists) and reject invalid actions with a clear message, never trusting the frontend alone.
- **FR-026**: The system MUST keep each user's balance, roster, racket, and Booster private to that user's session.
- **FR-027**: The system MUST show the user's current balance clearly on the fantasy page at all times.
- **FR-028**: The system MUST update the fantasy rules text to explain, briefly and in plain language, the starting balance, buying/selling (85% back), win/loss amounts, the Golden Racket, and the Booster.

### Key Entities *(include if feature involves data)*

- **Player price** (new attribute on the existing real player/Member): the CompuBucks cost to buy that player; unset means not buyable. Set by admin.
- **Booster price** (single admin-configurable setting): the CompuBucks cost of one Booster; default 1,000,000.
- **Fantasy user balance**: the user's current CompuBucks. Starts at 100,000,000, moves with buys, sells, submatch results, and Booster purchases, floored at 0.
- **Slot purchase** (extends the existing fantasy slot): which real player fills the slot, the price the user paid, and when it was bought (the clock for which submatches count).
- **Golden Racket assignment**: which one player on a user's team currently holds the racket (at most one per user).
- **Booster** (per user): whether the user holds an unused Booster and, if placed, which player carries it; consumed after that player's next completed submatch.
- **Submatch result** (existing game with a winner/loser and completion time): the source of every earn/lose event; reused, not redefined.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every new fantasy user's balance begins at exactly 100,000,000 CompuBucks, 100% of the time.
- **SC-002**: 100% of purchase attempts that exceed the user's balance are rejected with the balance and roster unchanged.
- **SC-003**: Selling a player always returns exactly 85% (rounded down) of the price the user paid for that player, verifiable by buying at a known price and selling.
- **SC-004**: A player's win changes the balance by exactly +5,000,000 (normal), +10,000,000 (racket), or +7,500,000 (boosted, non-racket); a loss by −2,000,000 (normal) or −4,000,000 (racket) — verifiable per case.
- **SC-005**: The balance is never observed below 0 under any sequence of losses.
- **SC-006**: Only submatches completed after purchase affect the balance — verifiable by buying a player after some of their games are already done and seeing those earlier games ignored.
- **SC-007**: At most one player per team ever shows the Golden Racket indicator, and exactly the racket-holder's submatches use the doubled amounts.
- **SC-008**: A placed Booster affects exactly one subsequent submatch and is then gone; it never adds a bonus on top of the racket.
- **SC-009**: 100% of invalid backend requests (unaffordable buy, unpriced/nonexistent player, duplicate player, second racket, Booster without owning one) are rejected regardless of what the frontend sends.
- **SC-010**: A first-time visitor can read and understand the updated rules in under one minute (rules fit in a short, scannable block).

## Assumptions

These are reasonable decisions made where the description left room, kept deliberately simple and consistent with the existing app:

- **Replaces the v1 free reward model**: the old "+10 per win, no cost, computed read-only total" from spec 007 is superseded by this balance. On rollout, existing fantasy users are reset to the 100,000,000 starting balance and their existing (free) slot picks are cleared, since "sell for 85% of buy-value" requires a real purchase price. This reset is acceptable for a fun, low-stakes internal game.
- **"Submatch" = one game** (an individual game inside a real Match), which is the unit the existing system already records winners for. All win/loss amounts are per game.
- **Booster "next match" = next single game**: the Booster applies to the boosted player's very next completed submatch and is consumed after it (win or lose). The +50% applies only on a win.
- **Per-player purchase clock**: earnings/losses count only for submatches completed after the player was bought into the slot, matching the existing feature's "added_at" behaviour. Selling and re-buying resets that clock.
- **Balance floor is a hard 0**: penalties that would go negative are clipped to 0; the excess is not remembered or "owed".
- **Sell-back rounds down** to a whole CompuBucks amount.
- **Prices are whole non-negative numbers**; a price of 0 means free; no price means not buyable.
- **Booster and racket are free to hold except the Booster's shop price**; assigning the racket costs nothing.
- **Deleting a player is not refunded**: if an admin deletes a real player who is on a user's team, the slot empties and stops affecting the balance, but the user is not automatically given CompuBucks back (rare admin action, kept simple).
- **One Booster held at a time**: a user buys, places, and consumes a Booster before buying another (simplest model; no Booster stockpiling in v1).
- **Reuses the existing stack and fantasy identity** (name-only login, four slots, React + FastAPI + Postgres); no new auth, no new currency beyond CompuBucks, no new libraries expected.
- **Frontend visual design** for the player cards (racket + Booster icons, balance display) and the shop follows the project's `/frontend-design` guidance during planning/implementation; this spec stays implementation-agnostic.
