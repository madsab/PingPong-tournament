# Feature Specification: Team Logos

**Feature Branch**: `005-team-logos`
**Created**: 2026-07-22
**Status**: Draft
**Input**: User description: "The admin must be able to upload logos for each team what will be displayed with their name. The logo will appear in the circles on the main page to the leading teams. The logo must be displayed before the player/team name in tables (except for tables on admin page)."

## User Scenarios & Testing *(mandatory)*

Logos give each team a visual identity that carries across the whole public page.
The admin attaches a logo to a team once; from then on it appears in the standings
hero circles and immediately before the team's name in every public table. Admin
management tables stay text-only so they remain compact and fast to scan.

### User Story 1 - Admin sets a team's logo (Priority: P1)

An admin opens the team management area, edits a team (or creates one), pastes the
web address of an image into the team's logo field, and saves. The logo is now
attached to that team.

**Why this priority**: Nothing else in the feature can be seen until a logo can be
attached to a team. It is the entry point for all the display work.

**Independent Test**: Log in as admin, set a logo URL on a team, reload — the value
persists on the team. Clearing the field removes the logo.

**Acceptance Scenarios**:

1. **Given** the admin is on the team edit form, **When** they paste an image URL into the logo field and save, **Then** the team keeps that logo URL and it is returned by the admin team API.
2. **Given** a team that already has a logo, **When** the admin clears the logo field and saves, **Then** the team has no logo again.
3. **Given** the admin is creating a new team, **When** they provide a name and a logo URL, **Then** the team is created with both.

---

### User Story 2 - Leading teams show their logos in the hero (Priority: P1)

A visitor lands on the public page (`/`). The top two teams collide in the "versus"
hero (§9.4). Each leader's circle shows that team's logo. If a leader has no logo,
the circle shows its initials placeholder as it does today.

**Why this priority**: The hero is the signature element of the page (§9.1, §9.4);
logos there deliver the most visible value.

**Independent Test**: Set logos on the top two teams, open `/`, confirm both hero
circles show the images; remove one logo and confirm that circle falls back to
initials with no broken image.

**Acceptance Scenarios**:

1. **Given** the rank-1 and rank-2 teams both have logos, **When** the visitor opens the public page, **Then** each hero circle displays its team's logo.
2. **Given** a leading team has no logo, **When** the hero renders, **Then** its circle shows the initials placeholder (not a broken image).
3. **Given** the rank-1 team, **When** the hero renders, **Then** the Champion Gold crown/rank cues (§9.4, §9.7) still show over/around its logo.

---

### User Story 3 - Logos appear before team names in public tables (Priority: P2)

A visitor browsing the standings table, the individual leaderboard, the schedule,
and a match's detail sees each team's logo immediately before its name. Admin-page
tables show no logos.

**Why this priority**: Broadens the visual identity across the page after the
high-impact hero is covered; depends on the same logo data.

**Independent Test**: With logos set, open `/` and each public table/list — every
team name is preceded by its logo; open `/admin` and confirm its tables show none.

**Acceptance Scenarios**:

1. **Given** teams with logos, **When** the visitor views the standings table (ranks 3+), **Then** each row shows the team's logo before the team name.
2. **Given** the individual leaderboard (§3.6), **When** it renders, **Then** each player row shows their team's logo before the team name in the Team column.
3. **Given** the schedule (§3.3) and a match's detail (F4), **When** they render, **Then** both teams' logos appear before their names.
4. **Given** any admin-page table (teams, matches, result entry), **When** it renders, **Then** no logos are shown.
5. **Given** a team without a logo, **When** any public table renders its name, **Then** it falls back gracefully with no broken image.

### Edge Cases

- **No logo set**: hero shows initials; tables show the name with a neutral/blank logo slot — never a broken-image icon (§9.7: color/graphic is never the only signal).
- **Invalid or unreachable URL**: the image fails to load; the view falls back to the no-logo treatment rather than a broken image.
- **Odd aspect ratio (very wide/tall)**: hero circle uses contain-fit inside the round crop; table logos use a small fixed square slot so rows stay aligned.
- **Long team name next to a logo**: the logo + name must not overflow or break the row/circle layout on mobile or desktop (§9.6).
- **Player has no logo of their own**: the leaderboard shows the player's *team* logo; players never carry a separate logo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admin MUST be able to set, change, and clear a team's logo by entering an image URL in the team create and edit forms (§5.2). An empty value clears the logo.
- **FR-002**: A team's logo MUST be stored as an optional image URL on the team (reusing the existing `logo_url` field — no schema change).
- **FR-003**: The public standings hero circles MUST display each leading team's logo when set, falling back to the initials placeholder when not (§9.4).
- **FR-004**: Every public table or list that shows a team name MUST display that team's logo immediately before the name: the standings table, the leaderboard Team column (§3.6), the schedule rows (both teams, §3.3), and the match-detail team headers (F4).
- **FR-005**: When a team has no logo, or its logo fails to load, public views MUST fall back gracefully (initials in the hero; a neutral placeholder or name-only in tables) and MUST NOT show a broken image.
- **FR-006**: Admin-page tables (team, match, and result-entry views) MUST NOT display logos.
- **FR-007**: The leaderboard and match public API responses MUST include each referenced team's logo so the frontend can render it (this data is not exposed today).
- **FR-008**: Logo display MUST follow the §9 visual system — circular in the hero, small and rounded in tables, hairline border, sized with relative units, and respecting `prefers-reduced-motion` (§9.5, §9.6, §9.7).

### Key Entities *(include if feature involves data)*

- **Team**: has a name and an **optional logo** (an image URL). No schema change — the `logo_url` attribute already exists.
- **LeaderboardEntry** *(computed, never stored)*: gains the player's team logo alongside the existing team name.
- **Public match team reference** *(computed, never stored)*: gains the team's logo alongside its name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can attach a logo to a team and see it on the public page after a single save and refresh, with no redeploy.
- **SC-002**: 100% of public locations that display a team name also display that team's logo when one is set (hero, standings table, leaderboard, schedule, match detail).
- **SC-003**: Teams without a logo (or with an unreachable one) render a fallback in every public view — zero broken-image icons.
- **SC-004**: Admin-page tables display zero logos.
- **SC-005**: With and without logos, table rows and hero circles keep their layout intact on both mobile and desktop widths (§9.6).

## Assumptions

- **URL, not file upload**: per the admin's choice, a logo is provided by pasting an image URL, reusing the existing `logo_url` column. No file upload, file storage, or static-file serving is added, and no new dependencies.
- **Hosting is external**: the admin is responsible for hosting the image somewhere reachable; the app only stores and displays the URL.
- **Square-ish images expected**: contain-fit and a fixed table slot handle off-ratio images without breaking layout.
- **Minimal validation**: the value is treated as an optional string/URL; correctness of the linked image is the admin's responsibility (broken links fall back per FR-005).
- **Design tokens**: all logo styling uses the §9 tokens already in `tokens.css`; gold stays reserved for the rank-1 team (§9.2).
