# Feature Specification: Admin Match-Card Scores & Pre-Filled Edit Form

**Feature Branch**: `004-admin-match-scores`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Alter the Admin page to display the score for each completed match at the card. When wanting to edit the score for that match, the previous score must be the default value in the input fields."

> Scope note: This is a focused improvement to the existing admin matches area (feature **F12**, `SPECIFICATIONS.md` §5.4; spec `002-admin-page`). It changes two things on the admin **matches** list only: (1) each completed match's card shows its result at a glance, and (2) re-opening the result form for a match starts from the previously saved values instead of blank fields. It adds no new data, no new endpoints, and no changes to the public site. Scoring/pairing rules in `SPECIFICATIONS.md` §3 are referenced, not repeated.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a completed match's result on its card (Priority: P1)

An organiser looks at the list of matches in the admin area. For every match that has already been played, its card shows the result right there — the match score as games won by each team (e.g. "2 – 1") — so they can review results without having to open the result form. Matches that have not been played yet show no score.

**Why this priority**: This is the primary ask and delivers value on its own — at-a-glance visibility of results turns the match list into a usable scoreboard for the organiser. It depends on nothing else in this feature.

**Independent Test**: Record a result for a match, then view the matches list and confirm that match's card displays the correct games-won score; confirm a not-yet-played match shows no score.

**Acceptance Scenarios**:

1. **Given** a match has been completed with recorded games, **When** the organiser views the matches list, **Then** that match's card displays the match score as the number of games each team won (e.g. "2 – 1").
2. **Given** a match that has not been played (no recorded games), **When** the organiser views the matches list, **Then** the card shows no score, only the matchup and its status.
3. **Given** a completed match ends level on games (an equal number of games won by each side), **When** the organiser views its card, **Then** the score is still shown accurately (e.g. "1 – 1") without implying a winner the data does not support.

---

### User Story 2 - Edit a completed result starting from the saved values (Priority: P1)

An organiser needs to correct a completed match's result. They open that match's result form and find every field already filled with what was saved before — each game's two scores and which member played each game — so they only change what is wrong instead of re-entering everything. They adjust a score, save, and the result updates.

**Why this priority**: Editing is the natural follow-up to viewing, and re-typing an entire result just to fix one number is error-prone and slow. Pre-filling the saved values is what makes editing practical.

**Independent Test**: Record a result, re-open the result form for that match, and confirm the score inputs and player selections match exactly what was saved; change one score, save, and confirm the update is stored and the card's score updates.

**Acceptance Scenarios**:

1. **Given** a completed match with saved games, **When** the organiser opens its result form, **Then** every game's two score inputs are pre-filled with the previously saved scores.
2. **Given** a completed match with saved games, **When** the organiser opens its result form, **Then** the member-vs-member pairing for each game (including any repeated smaller-team member) matches what was saved.
3. **Given** the pre-filled result form, **When** the organiser changes one score to another valid value and saves, **Then** the match keeps its completed status with the updated games, and the card's displayed score reflects the change.
4. **Given** the pre-filled result form, **When** the organiser makes no changes and saves, **Then** the saved result is unchanged.

---

### Edge Cases

- **Not-yet-played match**: opening the result form for a match with no recorded games behaves exactly as today — one row per larger-team member, blank score fields — since there is nothing to pre-fill.
- **Recorded pairing no longer valid**: if a game was recorded against a member who has since been removed from the roster (the recorded member link may be empty), the form pre-fills the scores and falls back gracefully for the missing player rather than breaking; the organiser can re-select a current member before saving.
- **Roster changed since the result was saved**: if team sizes changed after the result was recorded, the pre-filled form reflects the saved games as closely as the current pairing rules allow, and any re-save is re-validated against §3.2/§3.3.
- **Editing must re-validate**: an edited result is subject to the same score rules as a first-time entry — negative or tied game scores are rejected (§3.3) and the match is not saved until every game is valid.
- **Card score with no clear format collision**: the games-won score on the card is derived only from recorded games and never shown for a match that has none.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The matches list MUST display, on each completed match's card, the match score expressed as the number of games won by each team (e.g. "2 – 1").
- **FR-002**: A match that has no recorded games MUST NOT display a score on its card; only the matchup and status are shown.
- **FR-003**: The games-won score MUST be derived from the match's recorded games (counting, per game, which team has the higher score) and MUST remain consistent with how the match winner is decided for standings (§3.4/§3.5).
- **FR-004**: When the organiser opens the result form for a match that already has recorded games, the system MUST pre-fill each game's two score inputs with the previously saved scores.
- **FR-005**: When pre-filling the result form, the system MUST also restore the member-vs-member pairing saved for each game, including any smaller-team member that was repeated across games (§3.2).
- **FR-006**: Opening the result form for a match with no recorded games MUST retain the current behaviour (one blank game row per larger-team member).
- **FR-007**: Saving from a pre-filled form MUST apply the same validation as a first-time entry — reject any game score that is not a whole number ≥ 0 or where the two scores are equal (§3.3) — and MUST surface a clear, actionable message on rejection.
- **FR-008**: Saving valid edits MUST update the match's recorded games and keep the match completed, and the change MUST be reflected in the card's displayed score and in the public standings/leaderboards on next load (computed on read, §3.5/§3.6).
- **FR-009**: If a saved game's recorded player can no longer be resolved (the member link is empty), the form MUST still pre-fill that game's scores and MUST NOT crash; the organiser MUST be able to select a valid current member before saving.
- **FR-010**: The match-card score and the result form MUST remain usable on both desktop and mobile viewports, with no fixed pixel dimensions that break small screens (responsive design per the project constitution).

### Key Entities *(include if feature involves data)*

- **Match**: an existing contest between two teams with a status of scheduled or completed and a set of recorded games. No new fields — this feature reads the games already stored.
- **Game**: an existing member-vs-member contest within a match, holding both teams' scores and which member played on each side. This feature reads these values both to compute the card's games-won score and to pre-fill the edit form.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed matches show a games-won score on their card that matches their recorded games.
- **SC-002**: 0% of not-yet-played matches show a score on their card.
- **SC-003**: When the result form is opened for a completed match, 100% of its score inputs and player pairings are pre-filled to match the saved result before any editing.
- **SC-004**: An organiser can correct a single wrong game score without re-entering the other games' values.
- **SC-005**: 100% of invalid edited results (negative or tied game scores) are still rejected at save time, exactly as for first-time entry.
- **SC-006**: After a valid edit is saved, the card's displayed score reflects the new result on the next view with no manual recompute step.

## Assumptions

- "The score" shown on a completed match's card means the **match-level games-won score** (e.g. "2 – 1"), not a per-game point breakdown. Chosen with the user; a per-game breakdown is out of scope for this change.
- The data needed for both behaviours (per-game scores and the member who played each game) is already stored on each match's games and already returned by the existing admin matches data; no new data or endpoints are introduced.
- "Completed" is determined by a match having recorded games; a match with no games is treated as not-yet-played for display purposes.
- Editing reuses the existing result form and the existing record-result save path and its §3.2/§3.3 validation — this feature changes only the form's initial (default) values and adds the card's score display.
- The change is confined to the admin matches area; the public read-only site is unaffected by this feature.
- The existing project stack, styling approach, and design tokens are reused; no new frameworks or libraries are added (constitution — minimal dependencies).
