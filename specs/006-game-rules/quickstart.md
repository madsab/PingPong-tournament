# Quickstart: Game Rules Section

How to validate the feature works end-to-end. See [contracts/ui.md](./contracts/ui.md) for the exact rendered contract.

## Prerequisites

- Repo checked out on branch `006-game-rules`.
- Node dependencies installed: `cd frontend && npm install`.

## Run the automated test

```bash
cd frontend
npx vitest run src/components/RulesBanner
# also confirm the schedule section still passes with the banner mounted:
npx vitest run src/components/ScheduleSection
```

**Expected**: the `RulesBanner` test passes — the banner is labelled and all six rules render; `ScheduleSection` tests stay green.

## Verify in the browser

```bash
cd frontend
npm run dev            # or from repo root: docker compose up --build
```

Open http://localhost:5173 and confirm:

1. A compact **rules alert** appears **above the schedule content**, inside the Schedule block (under the "Schedule" eyebrow).
2. It is visually **subordinate/lower-opacity** — additive to the schedule, not a full-size separate section, and takes little vertical space.
3. All six rules are shown as a readable, numbered list; the "world cup racket (Fairplay)" prohibition is emphasized.
4. It matches the dark-arena look (tokens) of the rest of the page.
5. Narrow the window to ~320px (or use device toolbar) — the rules reflow with **no horizontal scrolling** and no clipped text.
6. The rules still show even with an empty database (they don't depend on any match data).

## Build check

```bash
cd frontend
npm run build          # tsc type-check + production build must pass
```
