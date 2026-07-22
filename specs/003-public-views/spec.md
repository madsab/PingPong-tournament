# Feature Specification: Public Match & Player Views (F2–F4)

**Feature Branch**: `003-public-views`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "F2, F3 and F4 in SPECIFICATIONS.md"

## User Scenarios & Testing *(mandatory)*

The public page (`/`) already shows the team ranking (F1). This feature adds the three remaining public sections defined in SPECIFICATIONS.md §4, in order: the individual leaderboard, the match schedule, and the per-match detail. Everything here is read-only, needs no login, and is computed fresh from the data the admin has entered.

### User Story 1 - See the individual leaderboard (F2) (Priority: P1)

A visitor scrolls past the team standings and sees every player ranked against each other across all the games they have played, so they can find who the strongest individual players are.

**Why this priority**: The leaderboard is the second headline section of the public page (§4) and the main "who's winning as a person" view — high visitor value and independently useful even without the schedule/detail sections.

**Independent Test**: Load `/` with some completed matches recorded; confirm the leaderboard lists players ordered by games won (with the correct tiebreaks) showing games won, games lost, win %, and point-difference.

**Acceptance Scenarios**:

1. **Given** several completed matches with game scores, **When** the visitor views the leaderboard, **Then** each player appears once with their games won, games lost, win %, and point-difference, ordered by games won → win % → point-difference → name.
2. **Given** two players tied on games won, **When** the leaderboard is shown, **Then** the one with the higher win % is ranked above the other.
3. **Given** no completed matches yet, **When** the visitor views the leaderboard, **Then** the section shows a clear empty state rather than an error or blank space.

---

### User Story 2 - See the full match schedule (F3) (Priority: P1)

A visitor sees every match in the tournament in one place, clearly split into matches already **played** and matches still **to-play**, so they know what has happened and what is coming.

**Why this priority**: The schedule is the third section of the public page (§4) and answers "what's the state of the tournament" at a glance — core to the site's purpose.

**Independent Test**: With a mix of completed and scheduled matches, load `/` and confirm every match appears exactly once, correctly labelled played or to-play, with a result shown for the played ones.

**Acceptance Scenarios**:

1. **Given** a mix of completed and scheduled matches, **When** the visitor views the schedule, **Then** every match appears exactly once and is unambiguously marked as played or to-play.
2. **Given** a completed match, **When** it is shown in the schedule, **Then** its result is visible (winner, or a draw, with the games-won score such as 2–1).
3. **Given** a scheduled match, **When** it is shown in the schedule, **Then** it shows the two team names and no result.

---

### User Story 3 - Inspect a single match (F4) (Priority: P2)

For any match, the visitor can see the two teams, the match result, and every individual game inside it — who played whom and the score of each game.

**Why this priority**: The match detail is the deepest view (§4). It's valuable but depends on the schedule/standings existing first, so it ranks below the two P1 stories.

**Independent Test**: For a completed match with several games, confirm the detail shows both teams, the overall result, and each game's two player names plus its score.

**Acceptance Scenarios**:

1. **Given** a completed match, **When** the visitor opens its detail, **Then** they see both team names, the match result, and every game listed with the two players' names and the game score.
2. **Given** a match where the smaller team repeated a player to cover a larger opponent (§3.2), **When** the detail is shown, **Then** that player correctly appears in more than one game.
3. **Given** a match that ended in a draw (§3.4), **When** the detail is shown, **Then** it is labelled a draw rather than showing a winner.

---

### Edge Cases

- **No data yet**: no completed games → leaderboard is empty; all matches to-play → the "played" group is empty. Both show clear empty states, not errors.
- **Detached player link**: after a roster edit a completed game's player link can be cleared (§3.1). That game is skipped for the missing side's per-member tally, but the match and its scores still display.
- **Uneven team sizes**: a smaller team repeats a player (§3.2) — that player shows up in multiple games in the match detail and their stats count each game.
- **Draws**: a match tied on games won and point-difference is a draw (§3.4) — shown as a draw everywhere a result appears.
- **Scheduled matches**: have no games and no result; they never contribute to the leaderboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (F2)**: System MUST rank every player across all games in **completed** matches, computing games won, games lost, games played, win % (games won ÷ games played), and point-difference (points scored − conceded).
- **FR-002 (F2)**: System MUST order the leaderboard by games won, then win %, then point-difference, then player name (§3.6), producing a stable order.
- **FR-003 (F2)**: System MUST skip a game for a player's tally when that game's player link is missing (roster detached per §3.1), while still counting the game for the other player if their link is present.
- **FR-004 (F3)**: System MUST present every match with its two team names and a clear played/to-play state, so a visitor can tell them apart at a glance.
- **FR-005 (F3)**: System MUST show the result of each completed match — the winner (or a draw) and the games-won score for each team.
- **FR-006 (F4)**: For each match, system MUST list every game with each side's player **name** (not just an internal id) and that game's score.
- **FR-007 (F4)**: System MUST show the match-level result derived per §3.4 (games won by each team, point-difference tiebreak, winner or draw).
- **FR-008**: All three views MUST be read-only and require no login; they show whatever the admin has entered, with nothing hidden (§4, F5).
- **FR-009**: Standings, leaderboard, schedule, and match results MUST be computed from the current data on each load/refresh (no stored/derived values, no live updates) so they always match the admin's latest saves (F14, §7, §6).
- **FR-010**: Each section MUST show clear loading, error, and empty states (consistent with the existing standings section) rather than failing silently.

### Key Entities *(include if feature involves data)*

Reuses existing data — **no schema change**.

- **Team**: name, optional logo; owns a roster of members.
- **Member (player)**: name, belongs to one team. Basis for the leaderboard.
- **Match**: between two teams; has a state of scheduled (to-play) or completed (played). Owns its games.
- **Game**: one game inside a match — two scores (higher wins, never tied) and the two players who played (each player link may be absent if a roster was edited after completion).
- **LeaderboardEntry** *(computed, never stored)*: a player's rank plus games played/won/lost, win %, and point-difference — the read-only per-member view, mirroring how team standings are computed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can find any given player's rank and win count within the leaderboard section without leaving the public page.
- **SC-002**: 100% of matches appear exactly once in the schedule, each unambiguously marked played or to-play.
- **SC-003**: For any played match, the visitor can see every game's two players and its score.
- **SC-004**: After the admin saves a change, a visitor refreshing the public page sees the updated leaderboard and results with no stale numbers.
- **SC-005**: All three sections render and remain readable on both mobile (stacked) and desktop layouts (§9.6).

## Assumptions

- **Players with zero completed games are still listed** on the leaderboard with all-zero stats, so the full roster stays visible; revisit if this becomes noisy with many inactive players.
- A match "result score" is expressed as the count of games each team won (e.g. 2–1), matching §3.4 step 1 — not the sum of points.
- Default schedule ordering groups **to-play matches first, then played** (most recent interest first); exact within-group ordering (e.g. by id/created order) is a detail for the plan.
- No pagination or search — the tournament is a handful of teams and dozens of matches (§7 scale).
- The visual treatment follows the existing dark-arena design tokens (§9); gold stays reserved for the rank-1 team only and is not used in these sections.
