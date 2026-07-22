# Feature Specification: Game Rules Section

**Feature Branch**: `006-game-rules`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "A description of the rules for a game in the tournament must be displayed nicely on the main page. The rules are: first to 11 points wins the subgame; the team that wins the most subgames wins the match; first ball is playing for who gets the serve; pros play with serve behind the backline of the table; NO ONE can use the world cup racket (Fairplay); teams with less members than the opponent team must choose who has to play again."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the tournament rules (Priority: P1)

A visitor on the main page wants to understand how a match is played and scored. They scroll to a clearly labelled rules section and read each rule laid out so it is easy to scan and understand.

**Why this priority**: This is the entire feature. Without the rules being readable on the page, there is no value delivered at all. It is the MVP on its own.

**Independent Test**: Open the main page, find the rules section, and confirm all six rules are shown, readable, and correctly worded.

**Acceptance Scenarios**:

1. **Given** a visitor is on the main page, **When** they view the rules section, **Then** all six tournament rules are displayed with clear, readable text.
2. **Given** a visitor is on the main page, **When** they look for how scoring works, **Then** they see that a subgame is first to 11 points and the match is won by the team that wins the most subgames.
3. **Given** a visitor reads the rules, **When** they reach the equipment rule, **Then** they see that no one may use the "world cup racket (Fairplay)".

### User Story 2 - Read the rules on a phone (Priority: P2)

A visitor opens the main page on a mobile device and reads the rules section. The rules stay readable and well laid out without horizontal scrolling or cramped text.

**Why this priority**: The site is used on phones during events; rules that only look good on desktop would fail a large share of real viewers. It builds on Story 1 rather than replacing it.

**Independent Test**: Open the main page on a narrow (mobile-width) screen and confirm the rules section reflows cleanly and stays readable.

**Acceptance Scenarios**:

1. **Given** a visitor is on a mobile-width screen, **When** they view the rules section, **Then** the rules reflow to fit the screen without horizontal scrolling.
2. **Given** a visitor is on a desktop-width screen, **When** they view the rules section, **Then** the rules are laid out to make good use of the wider space.

### Edge Cases

- The rules section must appear even when there is no team, match, or standings data (it is static content and does not depend on the database).
- Rules with emphasis (e.g. "NO ONE can use the world cup racket") should keep that emphasis so the important prohibition is not missed.
- Long rule text (e.g. the "fewer members must choose who plays again" rule) must wrap cleanly rather than overflow its container.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The main page MUST display a rules section that is clearly labelled as the tournament/game rules.
- **FR-002**: The rules section MUST show all six rules: (1) first to 11 points wins the subgame; (2) the team that wins the most subgames wins the match; (3) the first ball is played to decide who gets the serve; (4) pros play with the serve behind the backline of the table; (5) no one may use the world cup racket (Fairplay); (6) a team with fewer members than the opponent must choose who has to play again.
- **FR-003**: Each rule MUST be presented as a distinct, scannable item (not one dense paragraph) so a visitor can read them one at a time.
- **FR-004**: The rules section MUST render correctly on both mobile and desktop screen widths without horizontal scrolling or clipped text.
- **FR-005**: The rules section MUST match the visual style of the rest of the main page (the same dark arena theme and design tokens already used across the public page).
- **FR-006**: The rules content MUST be visible without any interaction (no click, expand, or login required) so it is readable immediately on page load.

### Key Entities

*Not applicable — this feature displays fixed content and involves no stored data.*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the six rules are visible and correctly worded in the rules section on the main page.
- **SC-002**: A visitor can locate and finish reading the full rules section in under 30 seconds on first visit.
- **SC-003**: The rules section is fully readable with no horizontal scrolling on screen widths from 320px (small phone) up to typical desktop widths.
- **SC-004**: The rules section renders regardless of whether any team/match data exists, so it is never blank due to missing data.

## Assumptions

- The rules are **static content** — fixed text shown to everyone, not editable through the admin area and not stored in the database. This follows YAGNI: there is no current requirement to change rules through a UI.
- The rules section lives on the existing public main page (`/`) alongside the standings, leaderboard, and schedule sections, and reuses the existing dark-arena theme and design tokens rather than introducing new styling.
- Exact placement/order among the existing sections is a design detail left to implementation; the default assumption is to place it where it reads naturally as reference material (near the top as an intro, or at the end as a reference footer).
- The rules are shown in English, matching the rest of the current interface.
- No new dependency, library, or backend endpoint is required — this is a presentation-only addition.
