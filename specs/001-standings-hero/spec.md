# Feature Specification: Team Ranking Hero (F1)

**Feature Branch**: `001-standings-hero`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Create specs for feature 1 (F1) in SPECIFICATIONS.md. The section must be like a hero section were the two leading teams are displayed on each side of the screen with their score in the middle. Other teams are displayed in a table right underneath. Each team has a logo or image that must slide in from their respective side on page load if they are first or second place (the two leading teams) giving the illusion that they are 'fighting' against each other."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See who is winning at a glance (Priority: P1)

A summer student opens the public site and immediately sees the two leading teams
facing off in a hero section: team #1 on one side, team #2 on the other, and their
points shown in the middle — like a versus screen. They can tell who is on top
without reading a table.

**Why this priority**: This is the emotional core of the tournament site — the
"who's winning the fight" moment. It delivers value on its own even before the
rest of the standings exist.

**Independent Test**: With at least two completed matches entered, load `/` and
confirm the top two ranked teams appear on opposite sides with their points
between them, ordered correctly per the ranking rules in SPECIFICATIONS §3.5.

**Acceptance Scenarios**:

1. **Given** two or more teams have completed matches, **When** a visitor loads the
   public page, **Then** the first-place team is shown on one side and the
   second-place team on the other, with each team's total points displayed in the
   middle.
2. **Given** the standings order changes after the admin records a new result,
   **When** the visitor reloads the page, **Then** the hero shows the new top two
   teams in the new order.
3. **Given** a visitor looks at the hero, **When** they read it, **Then** each of
   the two leading teams shows its name and its logo/image.

---

### User Story 2 - See the full standings table (Priority: P1)

Below the hero, the visitor sees every other team ranked in a table, so they can
see the complete standings, not just the top two.

**Why this priority**: The hero alone hides teams ranked 3rd and lower. The full
table is required for the standings feature (F1) to be complete and useful.

**Independent Test**: With three or more teams, load `/` and confirm all teams
ranked third and below appear in a table directly under the hero, in correct rank
order, each with its rank, name, and points.

**Acceptance Scenarios**:

1. **Given** three or more teams exist, **When** the page loads, **Then** a table
   directly beneath the hero lists the remaining teams (3rd place downward) in
   ranked order.
2. **Given** the table is shown, **When** the visitor reads a row, **Then** it
   shows at minimum the team's rank position, name, and total points.
3. **Given** two teams are tied on points, **When** they appear in the table,
   **Then** their order follows the tiebreak rules in SPECIFICATIONS §3.5 (point
   difference → head-to-head → team name).

---

### User Story 3 - Watch the leaders "fight" on load (Priority: P2)

When the page loads, the first-place team's logo/image slides in from its side and
the second-place team's logo/image slides in from the opposite side, meeting in the
middle — creating the illusion the two leaders are squaring up against each other.

**Why this priority**: This is the "fun and competition" polish that makes the site
feel alive. It is valuable but the standings still work correctly without it, so it
ranks below the two P1 stories.

**Independent Test**: Load `/` with at least two ranked teams and observe the top
two logos animate inward from opposite sides on first render; teams in the table
below do not animate this way.

**Acceptance Scenarios**:

1. **Given** the page loads with two leading teams, **When** it first renders,
   **Then** the first-place logo/image slides in from one side and the second-place
   logo/image slides in from the other, ending in their versus positions.
2. **Given** the slide-in animation has finished, **When** the visitor views the
   hero, **Then** both leaders rest in their final facing-off positions and remain
   fully readable.
3. **Given** a visitor has reduced-motion enabled in their system settings, **When**
   the page loads, **Then** the leaders appear in their final positions without the
   sliding motion.

---

### Edge Cases

- **Only one team exists (or only one has completed matches)**: the hero shows the
  single leader; the opposing side shows an empty/placeholder state instead of a
  second team, and no "fight" pairing is implied.
- **No teams / no completed matches yet**: the section shows a friendly empty state
  ("No matches played yet") instead of a broken or empty hero.
- **Exactly two teams**: the hero shows both; the table below is empty or hidden.
- **A team has no logo/image**: a default placeholder image/initials is shown so the
  layout and animation still work.
- **Tie for first or second place**: the tiebreak rules in SPECIFICATIONS §3.5
  decide which team occupies which hero side, so the ordering is always stable.
- **Long team names / very large point totals**: text wraps or shrinks so it stays
  readable and does not break the layout on small screens.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The public page MUST display a hero section at the top showing the two
  highest-ranked teams, one on each side of the screen.
- **FR-002**: The hero MUST display each leading team's total points, positioned
  between the two teams (a versus-style score in the middle).
- **FR-003**: The hero MUST display each leading team's name and its logo/image.
- **FR-004**: Team ranking order (including which two teams are the leaders) MUST
  follow the standings rules defined in SPECIFICATIONS §3.5 (points → point
  difference → head-to-head → team name), counting only completed matches.
- **FR-005**: Directly beneath the hero, the page MUST display all remaining teams
  (third place and below) in a ranked table.
- **FR-006**: Each table row MUST show at minimum the team's rank position, name,
  and total points.
- **FR-007**: On page load, the first-place team's logo/image MUST animate (slide)
  in from one side and the second-place team's logo/image MUST slide in from the
  opposite side, meeting in their facing positions.
- **FR-008**: Only the two leading teams MUST have the slide-in "fight" animation;
  teams in the table below MUST NOT use it.
- **FR-009**: The system MUST respect the visitor's reduced-motion preference by
  skipping the slide-in animation and showing the leaders in their final positions.
- **FR-010**: When fewer than two teams (or fewer than two teams with completed
  matches) exist, the section MUST show a sensible fallback (single leader with a
  placeholder opponent, or an empty state) rather than breaking.
- **FR-011**: When a team has no logo/image, the system MUST show a default
  placeholder so layout and animation still work.
- **FR-012**: The section MUST reflect the latest data on each page load/refresh
  (no stored/cached standings — recomputed on read, per SPECIFICATIONS §3.5 and §7).
- **FR-013**: The hero and table MUST be readable and correctly laid out on both
  desktop and mobile screen sizes (per constitution Principle V — responsive design).

### Key Entities *(include if feature involves data)*

- **Team**: a competing team. Relevant attributes for this feature: name, logo/image,
  and its computed standings figures (total points, point difference, rank position).
- **Standings entry**: the computed ranking of a team — rank position and the points
  and tiebreak values used to order it. Derived on read from completed matches, not
  stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can correctly identify the current #1 and #2 teams
  within 5 seconds of the page loading.
- **SC-002**: 100% of the time, the two teams shown in the hero match the top two
  rows that the ranking rules produce (no mismatch between hero and computed order).
- **SC-003**: The full ranked order of every team is visible on the page (hero + table
  together cover all teams, none missing).
- **SC-004**: The leaders' slide-in animation completes within 1.5 seconds of load so
  visitors are not left waiting to read the standings.
- **SC-005**: The section renders without layout breakage on common desktop and mobile
  widths (e.g. 375px, 768px, 1440px).
- **SC-006**: Visitors with reduced-motion enabled see a fully usable, static hero with
  no sliding motion.

## Assumptions

- This feature covers the **Team ranking** section (item 1) of the public page in
  SPECIFICATIONS §4; the individual leaderboard, match schedule, and match detail are
  separate features (F2–F4) and out of scope here.
- Ranking math (points, tiebreaks, "completed matches only") is defined in
  SPECIFICATIONS §3.5 and is treated as an existing dependency this feature reads from,
  not something this feature redefines.
- "Score in the middle" means each leading team's **total standings points** (Win=3,
  Draw=1, Loss=0), the same number used for ranking — not a live per-match score.
- The two hero sides are left vs. right on desktop; on narrow mobile screens the two
  teams may stack (top vs. bottom) while keeping the "score in the middle" between
  them, to stay responsive.
- Team logos/images are provided/managed through the existing team data (admin manages
  teams per SPECIFICATIONS §5.2); uploading images is not part of this feature.
- The site is read-only with no login for this section (per F5 / SPECIFICATIONS §4).
