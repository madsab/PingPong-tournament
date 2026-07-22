# Feature Specification: Admin Page (F6–F13)

**Feature Branch**: `002-admin-page`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Add the admin page feature in @SPECIFICATIONS.md"

> Scope note: This spec covers the password-protected admin area at `/admin` — features **F6–F13** in `SPECIFICATIONS.md` §5. The public read-only site (F1–F5) and the compute-on-read engine (F14) are covered by other specs; this feature is what lets a tournament organiser actually *enter and manage the data* the public site shows. Shared scoring and pairing rules live in `SPECIFICATIONS.md` §3 and are referenced here rather than repeated.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log in and log out of the admin area (Priority: P1)

An organiser opens `/admin`. The area is locked. They type the single shared password and are let in; all admin controls become available. When they finish — especially on a shared office laptop — they log out, and `/admin` locks again so the next person must re-enter the password.

**Why this priority**: Nothing else in the admin area is safe to expose without this gate. It is the entry point that protects every other admin action, so it must exist first.

**Independent Test**: Set the shared password, visit `/admin`, confirm the wrong password is rejected and the correct one grants access; then log out and confirm access is revoked and the password is required again.

**Acceptance Scenarios**:

1. **Given** the admin area is locked, **When** the organiser submits the correct password, **Then** they gain access to the admin controls and their session persists across page navigation until they log out.
2. **Given** the admin area is locked, **When** the organiser submits an incorrect password, **Then** access is denied and no admin action can be performed.
3. **Given** the organiser is logged in, **When** they choose "log out", **Then** their session ends and `/admin` requires the password again.
4. **Given** no valid session exists, **When** any admin-only action is attempted directly, **Then** it is refused.

---

### User Story 2 - Manage teams and members (Priority: P1)

A logged-in organiser sets up the tournament: they create teams, add members to each team's roster, rename or edit them as details change, and delete teams or members that were added by mistake. Teams may have different roster sizes.

**Why this priority**: There is no tournament without teams and players. Standings, schedule, and results all depend on this data existing, so it is core MVP.

**Independent Test**: While logged in, create two teams with different numbers of members, rename a team, edit a member's name, delete a member, and delete a team — confirming each change is saved and reflected on the public site.

**Acceptance Scenarios**:

1. **Given** the organiser is logged in, **When** they create a team with a name, **Then** the team is saved and appears in the team list.
2. **Given** a team exists, **When** the organiser adds members to it, **Then** those members belong to that team's roster.
3. **Given** a team or member exists, **When** the organiser renames/edits it, **Then** the new value is saved.
4. **Given** a team with members and matches exists, **When** the organiser deletes the team, **Then** the team, its members, and its matches are removed together and the public site no longer shows them.
5. **Given** a completed match already recorded games with a member, **When** that member's roster is later edited, **Then** the games already recorded for completed matches are unchanged (per §3.1).

---

### User Story 3 - Generate the round-robin schedule (Priority: P1)

Once the teams are in, the organiser clicks "generate round-robin". The system creates one scheduled match for every pair of teams that doesn't already have one. If a new team is added later and the organiser runs it again, only the missing pairings are filled in — nothing is duplicated.

**Why this priority**: This is the fast path to a full schedule and the alternative (creating dozens of matches by hand) is tedious and error-prone. It directly enables recording results.

**Independent Test**: With N teams and no matches, run "generate round-robin" and confirm exactly N·(N−1)/2 matches are created; add one team, run it again, and confirm only the new pairings are added and no existing match is duplicated.

**Acceptance Scenarios**:

1. **Given** several teams and no matches, **When** the organiser generates the round-robin, **Then** exactly one scheduled match exists for every distinct pair of teams.
2. **Given** a full round-robin already exists, **When** the organiser generates again, **Then** no new matches are created and none are duplicated.
3. **Given** a new team is added after a schedule exists, **When** the organiser generates again, **Then** only the pairings involving the new team are added.

---

### User Story 4 - Record a match result (Priority: P1)

For a scheduled match, the organiser sets which member faces which for each game (choosing who the smaller team repeats when rosters are uneven, per §3.2), enters each game's score, and saves. The match becomes completed and the standings and leaderboards update automatically. Impossible scores are rejected at save time.

**Why this priority**: Recording results is the whole point of running the tournament — without it the public standings never change. It depends on teams, members, and matches existing.

**Independent Test**: For a scheduled match between an uneven pair of teams, set the pairings (repeating a smaller-team member), enter valid scores, save, and confirm the match shows as completed and standings recompute; then attempt a negative score and a tied game score and confirm both are rejected.

**Acceptance Scenarios**:

1. **Given** a scheduled match, **When** the organiser sets one game per member of the larger team and enters valid scores, **Then** the match is saved as completed with the correct number of games (equal to the larger team's size, per §3.2).
2. **Given** uneven team sizes, **When** the organiser assigns the pairings, **Then** they can choose which smaller-team member(s) play again to cover the extra opponents, and a member may appear in more than one game.
3. **Given** the organiser enters a score, **When** either score is negative or the two scores are equal (a tie), **Then** the save is rejected with a clear, actionable message and the match is not marked completed (per §3.3 / F13).
4. **Given** a completed match, **When** the organiser edits its games or scores, or deletes them, **Then** the change is saved and the standings and leaderboards recompute accordingly.

---

### User Story 5 - Manually manage matches (Priority: P2)

Beyond auto-generation, the organiser can create, edit, or delete individual matches by hand — for example to fix a mistake or handle a special case not covered by the round-robin generator.

**Why this priority**: Auto-generation covers the common case; manual match management is a less-used safety valve, so it ships after the core flows.

**Independent Test**: While logged in, create a match between two chosen teams by hand, edit which teams it is between, and delete it — confirming each change is saved.

**Acceptance Scenarios**:

1. **Given** two teams exist, **When** the organiser creates a match between them by hand, **Then** a scheduled match is created for that pair.
2. **Given** a match exists, **When** the organiser edits or deletes it, **Then** the change is saved and reflected on the public site.

---

### Edge Cases

- **Wrong or empty password**: submitting a blank or incorrect password never grants access; repeated wrong attempts stay locked out.
- **Expired or absent session**: if the session is missing or no longer valid, admin actions are refused and the organiser is returned to the login gate rather than seeing a broken page.
- **Deleting data referenced elsewhere**: deleting a team removes its members and its matches together (cascade), so no orphaned matches or members remain.
- **Round-robin with fewer than two teams**: generating a schedule with 0 or 1 team creates no matches and reports nothing to do, rather than erroring.
- **Recording a result before rosters are set**: attempting to record a match where a team has no members (so pairings can't be formed) is prevented with a clear message.
- **Uneven rosters where one team is empty**: the game count is driven by the larger team; if one side has zero members, no valid pairing exists and recording is blocked.
- **Editing a roster after results exist**: changing a member's name updates it everywhere, but does not alter the games already recorded for completed matches (per §3.1).
- **Concurrent editing on a shared machine**: the last save wins; there is no audit log of who changed what (per §6 non-goals).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST protect the entire admin area behind a single shared password (F6); no per-user accounts exist.
- **FR-002**: The shared password MUST be verified against a value that is never stored in plain text where the public could reach it, and MUST NOT be embedded in the public-facing site (per §5.1).
- **FR-003**: On a correct password, the system MUST establish an admin session that authorises subsequent admin actions until logout; an incorrect password MUST be rejected without granting access.
- **FR-004**: The system MUST let a logged-in organiser end their session ("log out"), after which the admin area requires the password again (F7) — important on shared machines.
- **FR-005**: The system MUST refuse every admin-only action (all create/update/delete and schedule-generation actions) when no valid admin session is present.
- **FR-006**: The system MUST let the organiser create, rename, and delete teams (F8).
- **FR-007**: The system MUST let the organiser create, edit, and delete members, each belonging to a team, and MUST support teams with different roster sizes (F9, §3.1).
- **FR-008**: Editing a member's roster MUST NOT change games already recorded for completed matches (§3.1).
- **FR-009**: The system MUST let the organiser create, edit, and delete matches manually (F10).
- **FR-010**: Deleting a team MUST also remove its members and its matches so no orphaned records remain.
- **FR-011**: The system MUST provide a single "generate round-robin" action that creates one scheduled match for every pair of teams that does not already have one, and MUST NOT create duplicate matches when run repeatedly (F11, §5.3).
- **FR-012**: The system MUST let the organiser record a result for a scheduled match by setting the member-vs-member pairing for each game and entering each game's two scores (F12, §5.4).
- **FR-013**: For uneven team sizes, the system MUST produce a number of games equal to the larger team's size and MUST let the organiser choose which smaller-team member(s) repeat to cover the extra opponents (§3.2); a member MAY appear in more than one game.
- **FR-014**: The system MUST reject any game score where either value is not a whole number ≥ 0, or where the two scores are equal (a tie), and MUST surface a clear, actionable message on rejection (F13, §3.3).
- **FR-015**: On a successful save of all games, the match MUST become "completed"; the organiser MUST also be able to edit or delete a completed match's games afterward.
- **FR-016**: After any change to teams, members, matches, or scores, the public standings and leaderboards MUST reflect the latest data (computed on read, per §3.5/§3.6/§7 — F14).
- **FR-017**: All admin actions MUST be usable on both desktop and mobile screen sizes without fixed pixel dimensions (constitution Principle V — responsive design).
- **FR-018**: Admin error messages MUST be clear and actionable to the organiser and MUST NOT expose raw stack traces (per project error-handling guidance).

### Key Entities *(include if feature involves data)*

- **Admin session**: represents a logged-in organiser. Created on correct password, cleared on logout; its presence authorises admin actions. Not tied to a named user.
- **Team**: a named group with a roster of members (existing entity; admin can create/rename/delete).
- **Member**: a player belonging to exactly one team (existing entity; admin can create/edit/delete).
- **Match**: a contest between two distinct teams with a status of scheduled or completed (existing entity; admin can create/edit/delete and generate in bulk).
- **Game**: one member-vs-member contest within a match, storing two scores with a required winner. **New relationship**: a game must record *which member played which* so pairings (including repeated smaller-team members) are captured — this member-to-game link does not exist yet and is introduced by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An organiser can go from an empty tournament to a full generated schedule (create teams + members, generate round-robin) in under 5 minutes.
- **SC-002**: 100% of round-robin generations produce exactly the missing pairings and zero duplicates, no matter how many times the action is run.
- **SC-003**: 100% of invalid scores (negative or tied) are rejected at save time, and no invalid result is ever marked completed.
- **SC-004**: After the admin saves a valid result, the public standings and leaderboards reflect it on the next load with no manual recompute step.
- **SC-005**: A logged-out organiser (or anyone without a session) can perform zero admin actions — every attempt is refused.
- **SC-006**: An organiser can record a result for an uneven-roster match (larger team of size N → N games, with a repeated smaller-team member) without error.
- **SC-007**: Every admin screen is usable on a phone-sized viewport with no horizontal scrolling of the page body.

## Assumptions

- The shared admin password is provided to the backend as configuration (e.g. an environment variable) by whoever deploys the app; managing/rotating it is an operational task outside this feature.
- Session-based access (a token/cookie established at login) is the authentication approach, consistent with §5.1; no OAuth or external identity provider is in scope.
- There is a single admin role — everyone who knows the password has full CRUD control. No per-user permissions, and no audit log of who changed what (per §6 non-goals).
- The existing data model (Team, Member, Match, Game) and the compute-on-read standings/leaderboard engine are reused; this feature adds the member-to-game pairing link and the admin write paths on top of them.
- Score-validation rules (whole numbers ≥ 0, no ties) already exist as data constraints and are the single source of truth this feature enforces at the admin boundary (§3.3).
- "Last save wins" is acceptable for concurrent edits on shared machines; real-time collaboration is out of scope (per §6).
- The admin UI reuses the existing project stack and design tokens; no new frameworks are added unless the existing ones genuinely cannot do the job (constitution Principle IV).
