# Feature Specification: Fantasy Ping Pong Teams

**Feature Branch**: `007-fantasy-teams`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Fantasy Ping Pong page. A user registers with their name and a required fun-fact about themselves. Login is by name only — no password. The user must be remembered across visits. When logged in, the user builds a fantasy team by adding real players (existing Members from existing Teams) into 4 slots, displayed as 4 boxes using ReactFlow. Based on how those real players perform in the actual competition, the user earns CompuBucks (a fantasy currency). All input must be validated on the backend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and be remembered (Priority: P1)

A visitor opens the Fantasy page for the first time. They enter their name and a fun-fact about themselves and join. On any later visit — even after closing the browser — they land back in their own fantasy space without re-entering anything, because the browser remembers them. If they are on a new device, they type their name to log back in.

**Why this priority**: Nothing else in the feature works without an identity to attach a fantasy team and CompuBucks to. This is the smallest slice that delivers standalone value: "I have a remembered fantasy identity."

**Independent Test**: Register with a name + fun-fact, reload the page, and confirm you are still logged in and your fun-fact is stored. On a fresh browser, log in with just the name and reach the same account.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they submit a non-empty name and a non-empty fun-fact, **Then** an account is created and they are logged in.
2. **Given** a visitor submits a name but leaves the fun-fact empty, **When** they try to join, **Then** they are blocked with a clear message that the fun-fact is required.
3. **Given** a registered user who closes and reopens the browser on the same device, **When** they return to the Fantasy page, **Then** they are still logged in without typing anything.
4. **Given** a name that already belongs to an account, **When** someone enters that same name to log in, **Then** they are logged into the existing account (name is the identity).
5. **Given** a logged-in user, **When** they choose to log out, **Then** the device forgets them and shows the register/login screen again.

---

### User Story 2 - Build a 4-slot fantasy team (Priority: P2)

A logged-in user sees four empty boxes laid out on a ReactFlow canvas. They pick real players (Members from the real Teams) to fill each of the four slots, building their dream squad. They can swap a player out for another at any time. No player can occupy two of their own slots at once.

**Why this priority**: This is the core interactive experience of the feature, but it depends on an identity existing first (P1).

**Independent Test**: As a logged-in user, add four different real players into the four boxes, reload, and confirm the same four players are still shown. Try adding the same player twice and confirm it is rejected.

**Acceptance Scenarios**:

1. **Given** a logged-in user with empty slots, **When** they assign a real player to a slot, **Then** that slot shows the player (with team and logo) and the choice is saved.
2. **Given** a slot already holds a player, **When** the user assigns a different player to that slot, **Then** the slot updates to the new player.
3. **Given** a player already sits in one of the user's slots, **When** the user tries to add that same player to another of their slots, **Then** it is rejected with a clear message (no duplicate players on one team).
4. **Given** a user has filled some slots, **When** they reload or return later, **Then** their slot assignments are exactly as they left them.
5. **Given** a user picks a player id that does not exist, **When** the request reaches the backend, **Then** it is rejected as invalid.

---

### User Story 3 - Earn CompuBucks from real performance (Priority: P3)

Once a user has players on their fantasy team, they see how many CompuBucks they have earned. The total grows based on how their chosen players actually perform in the real competition's played games. Empty slots contribute nothing.

**Why this priority**: This is the payoff/reward layer. It is meaningful only after a team exists (P2), so it comes last while still being a complete, demonstrable slice.

**Independent Test**: Put a player who has won real games onto your team and confirm your CompuBucks total reflects their wins; remove them and confirm the total drops.

**Acceptance Scenarios**:

1. **Given** a user whose chosen player has won real games, **When** the user views their fantasy page, **Then** their CompuBucks total includes earnings for those wins.
2. **Given** a game in the real competition that has not been played yet, **When** CompuBucks are calculated, **Then** that game contributes nothing.
3. **Given** a user with four empty slots, **When** they view CompuBucks, **Then** the total is zero.
4. **Given** a user swaps out a player, **When** they view CompuBucks again, **Then** the total reflects the new roster's real performance.

---

### Edge Cases

- **Same name, different person**: name is the identity, so two people typing the same name share one account. This is documented and accepted for this fun, low-stakes feature (no password by requirement).
- **Whitespace-only input**: a name or fun-fact that is only spaces counts as empty and is rejected.
- **Name casing / trimming**: "Alice" and "  alice " resolve to the same account (trimmed, case-insensitive) so people are not accidentally split into two accounts.
- **A chosen player is deleted by an admin**: the slot becomes empty and simply stops contributing CompuBucks; the rest of the team is unaffected.
- **Player belongs to a team with no played games**: player is valid to pick, just earns nothing yet.
- **Very long name or fun-fact**: input over a sensible length limit is rejected by the backend.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a visitor register by providing a name and a fun-fact, both required and both non-empty after trimming whitespace.
- **FR-002**: System MUST treat the name as the account identity: logging in with an existing name enters that existing account; there are no passwords.
- **FR-003**: System MUST match names case-insensitively and after trimming leading/trailing whitespace, so casing/spacing differences do not create duplicate accounts.
- **FR-004**: System MUST remember a logged-in user across browser sessions on the same device, so a returning user is not asked to log in again until they log out.
- **FR-005**: System MUST provide a way for a user to log out, which makes the device forget them.
- **FR-006**: System MUST give every fantasy team exactly four slots.
- **FR-007**: Users MUST be able to assign any existing real Member to any of their four slots, and change or clear that assignment later.
- **FR-008**: System MUST prevent the same real Member from occupying more than one of a single user's four slots.
- **FR-009**: System MUST persist each user's slot assignments so they survive reloads and future visits.
- **FR-010**: System MUST calculate a CompuBucks total for each user based on the real-competition performance of the Members currently in their slots, counting only games that have actually been played.
- **FR-011**: System MUST treat empty slots as contributing zero CompuBucks.
- **FR-012**: System MUST validate all input on the backend — presence of name and fun-fact, length limits, and that any referenced Member id actually exists — and reject invalid input with a clear message, never trusting the frontend alone.
- **FR-013**: System MUST keep each user's fantasy team private to that user's session (a user edits only their own team).
- **FR-014**: System MUST show, for each filled slot, enough to recognise the player: at least their name and their real team (reusing the existing team logo where available).

### Key Entities *(include if feature involves data)*

- **Fantasy User**: a person playing the fantasy game. Key attributes: a unique identity name (trimmed, case-insensitive), a required fun-fact, and the time they joined. Owns one fantasy team.
- **Fantasy Slot Assignment**: the link that places one real Member into one of a Fantasy User's four slots. Key attributes: which user, which slot position (1–4), which Member. A Member appears at most once per user.
- **Member** (existing): a real player on a real Team; reused, not redefined. Referenced by the slot assignment and the source of CompuBucks performance.
- **CompuBucks total** (computed, not stored): derived on read from the played real games of the Members in a user's slots, using the scoring rule in Assumptions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can register and reach their fantasy team in under 1 minute, providing only a name and a fun-fact.
- **SC-002**: A returning user on the same device lands in their own logged-in fantasy space with zero manual input on 100% of return visits (until they log out).
- **SC-003**: 100% of attempts to register or log in with an empty/whitespace-only name or fun-fact are rejected.
- **SC-004**: A user can fill all four slots in under 1 minute, and their exact roster is still present after a reload 100% of the time.
- **SC-005**: 100% of attempts to place the same player in two of one user's slots are rejected.
- **SC-006**: A user's CompuBucks total always equals the documented scoring rule applied to their current roster's played games — verifiable by adding/removing a player and seeing the total change accordingly.
- **SC-007**: 100% of invalid backend requests (missing fields, over-length input, non-existent Member id) are rejected regardless of what the frontend sends.

## Assumptions

These are the reasonable decisions made where the description left room, kept deliberately simple:

- **No passwords, name = identity**: by explicit requirement. Accepted trade-off: anyone who knows a name can enter that account. Fine for a fun, internal, low-stakes feature.
- **"Remembered" = remembered on the device**: the browser stores the identity so returning users skip login; logging out clears it. No email/verification.
- **Case-insensitive, trimmed names**: prevents accidental duplicate accounts from casing/spacing.
- **Four fixed slots**, no positions/roles — just four players, matching "4 boxes."
- **Any Member is pickable**, from any real team; no budget/cost to fill a slot (CompuBucks is a reward, not a spending currency in v1).
- **Team is editable anytime**; CompuBucks is computed on read from current roster, consistent with how the rest of this app computes standings/leaderboards on read. Swapping players re-computes earnings — accepted for simplicity in v1.
- **CompuBucks scoring rule (v1, simple and documented)**: for each *played* real game involving a Member in one of your slots, you earn **+10 CompuBucks if that Member won the game** and **+3 CompuBucks if they played but lost** (participation). Empty slots earn nothing. This reuses the existing per-game player links and scores already in the system; the exact numbers are a starting point and easy to tune later.
- **Fun-fact is free text** with a sensible max length (e.g. a couple hundred characters); it is displayed back to the user but not otherwise used in v1.
- **Reuses the existing stack** (React + ReactFlow already present for the schedule; FastAPI + Postgres backend). No new auth framework and no new libraries expected.
- **Separate from admin auth**: the fantasy login is its own lightweight identity, unrelated to the shared admin password.
