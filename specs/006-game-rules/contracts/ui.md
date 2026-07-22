# UI Contract: Game Rules Banner

This feature exposes no API. Its only contract is what the banner renders on the public page.

## Component: `RulesBanner`

- **Mount point**: top of `frontend/src/components/ScheduleSection/ScheduleSection.tsx` — rendered directly under the "Schedule" eyebrow and **above** the schedule content (load-state / `ScheduleFlow`). Not a peer section in `App.tsx`.
- **Props**: none.
- **Data**: none (static content).

## Rendered output (the contract)

1. A compact alert container (e.g. `<aside>`/`<div role="note">`) with an accessible label identifying it as the rules, and a small label/heading (e.g. "Rules").
2. An ordered list containing exactly these six items, in order, worded to match the spec:
   1. First to 11 points wins the subgame.
   2. The team that wins the most subgames wins the match.
   3. The first ball is played to decide who gets the serve.
   4. Pros play with the serve behind the backline of the table.
   5. **No one** may use the world cup racket (Fairplay).
   6. A team with fewer members than the opponent must choose who has to play again.
3. All content is visible on load — no click, expand, or login gates it (FR-006).

## Visual / responsive contract

- **Additive & compact**: reduced opacity / muted styling so it reads as subordinate to the schedule; minimal vertical space (no large hero-style padding).
- Uses `tokens.css` variables only; no hard-coded colors.
- No horizontal scrolling from 320px width up to desktop; long rule text wraps cleanly (FR-004, SC-003).
- Renders regardless of whether any match data exists (it is static and independent of the schedule's load state) (SC-004).

## Test contract (`RulesBanner.test.tsx`)

- Asserts the banner renders and is labelled as the rules.
- Asserts all six rule texts are present.
- (Written first, must fail before the component exists — Constitution I.)
