# Phase 0 Research: Game Rules Section

No `NEEDS CLARIFICATION` items remained in Technical Context — this is a small, well-understood frontend addition. The decisions below record the choices made and why.

## Decision 1: Static, hard-coded rules (no backend)

- **Decision**: The six rules live as fixed text inside the `RulesSection` component. No database column, no `/api` endpoint, no admin editing.
- **Rationale**: The spec asks only to *display* the rules; nothing requires changing them through a UI. Constitution III (YAGNI) says implement the simplest thing that meets the current need.
- **Alternatives considered**: (a) Store rules in the DB and serve via a new endpoint — rejected: adds schema, endpoint, and admin UI for a requirement that doesn't exist. (b) Config/JSON file — rejected: extra indirection for text that changes about never.

## Decision 2: A compact alert banner inside the Schedule block (not a separate section)

- **Decision**: Render `RulesBanner` at the top of `ScheduleSection` — directly under the "Schedule" eyebrow, above the schedule content. Do **not** add a peer section in `App.tsx`.
- **Rationale**: Explicit user refinement — the rules "must not take up a considerate amount of space" and should be "a sort of alert above the schedule … additive to the schedule rather than a full separate section." Placing it inside the schedule block makes it read as reference for the schedule, not its own screen.
- **Alternatives considered**: (a) A full peer section in `App.tsx` — rejected: that is the "full separate section" the user explicitly did not want. (b) A collapsible/expandable panel — rejected: FR-006 requires the rules visible without interaction, and it adds needless state (YAGNI).

## Decision 3: Compact, reduced-opacity alert styling

- **Decision**: Style `RulesBanner` as a small alert — a subtle bordered/tinted box with **reduced opacity** (muted, e.g. `--color-ash`-level text / lowered opacity) so it sits quieter than the schedule it introduces. Minimal vertical padding; rules as a tight ordered list (`<ol>`) that wraps. Keep the "**No one** may use the world cup racket (Fairplay)" emphasis. Use a new CSS Module reading `tokens.css`; no hard-coded colors. Give it an accessible label (e.g. `aria-label`/`role="note"`).
- **Rationale**: "A little less opacity so that it is additive" → visually subordinate to the schedule. Constitution IV/V: tokens only, `clamp()` spacing, wraps at any width.
- **Alternatives considered**: Same visual weight as other sections — rejected: it would compete with the schedule instead of supporting it.

## Decision 4: Ordered list for scannability + emphasis preserved

- **Decision**: Render each rule as a separate `<li>`. Keep the "NO ONE can use the world cup racket (Fairplay)" emphasis (e.g. via `<strong>` on the key phrase).
- **Rationale**: FR-003 requires distinct scannable items; the edge case calls out preserving the prohibition's emphasis so it isn't missed.
- **Alternatives considered**: A single paragraph — rejected (fails FR-003).
