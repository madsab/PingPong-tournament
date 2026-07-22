# Implementation Plan: Game Rules Section

**Branch**: `006-game-rules` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-game-rules/spec.md`

## Summary

Add the six fixed tournament rules to the public main page as a **compact, lower-opacity "alert" banner** rendered **inside the Schedule section, directly above the schedule content** — additive to the schedule rather than a full separate section (per user refinement). It shows the rules as scannable list items, styled with the existing dark-arena theme and design tokens, works on mobile and desktop, and takes minimal vertical space. No backend, no data, no new dependency — a single small `RulesBanner` component mounted at the top of `ScheduleSection`.

## Technical Context

**Language/Version**: TypeScript (Vite + React), matching the existing frontend.

**Primary Dependencies**: React only. No new library (rules are hard-coded text; no React Flow, no fetch client).

**Storage**: N/A — content is static, nothing stored or fetched.

**Testing**: Vitest + React Testing Library, co-located test next to the component.

**Target Platform**: Web (public page), responsive from 320px phone up to desktop.

**Project Type**: Web application (existing `frontend/` + `backend/`); this feature touches `frontend/` only.

**Performance Goals**: N/A — static markup, no measurable perf concern.

**Constraints**: No horizontal scrolling at any width (§9 responsive); reuse `tokens.css`, no hard-coded colors.

**Scale/Scope**: One new section component + its CSS module + test; one edit to `App.tsx`. ~1 screen of content.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First (NON-NEGOTIABLE) | ✅ | Write `RulesSection.test.tsx` first — asserts all six rules render and the section is labelled. Red → green. |
| II. SOLID Design | ✅ | One component, one responsibility (render fixed rules). No sprawling interface. |
| III. Simplicity First (YAGNI) | ✅ | Rules are hard-coded in the component. No admin editing, no DB, no endpoint, no config — none is required today. |
| IV. Use What's Already There | ✅ | React + CSS Modules + `tokens.css` only. No new dependency; mounts into the existing `ScheduleSection`. |
| V. Responsive design | ✅ | Uses `clamp()`-based spacing; the rule list wraps/reflows; no fixed width/height. Test/verify at 320px. |

**Result**: PASS. No violations → Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/006-game-rules/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A — no data)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui.md            # Phase 1 output — the rendered UI contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/src/
└── components/
    ├── ScheduleSection/
    │   └── ScheduleSection.tsx          # EDIT — render <RulesBanner/> under the eyebrow, above the schedule content
    └── RulesBanner/                     # NEW
        ├── RulesBanner.tsx              # compact alert: small label + <ol> of the six rules
        ├── RulesBanner.module.css       # scoped styling using tokens.css; reduced opacity, minimal height
        └── RulesBanner.test.tsx         # Vitest — all six rules present, labelled
```

**Structure Decision**: Web application; frontend-only change. `RulesBanner` is a small presentational component mounted at the top of `ScheduleSection` so it reads as part of the schedule block (additive), not a peer section. `App.tsx` is **not** changed — the public page order (Standings → Leaderboard → Schedule) stays, with the rules banner living inside the Schedule block above its content.

## Phase 0 — Research

See [research.md](./research.md). All Technical Context items are known (no NEEDS CLARIFICATION). Key decisions: static hard-coded content (no backend), placement above schedule per user request, reuse the `StandingsSection` eyebrow + `<section>` pattern.

## Phase 1 — Design & Contracts

- **data-model.md**: N/A — no entities, no stored/fetched data. Documented as such.
- **contracts/ui.md**: the UI contract — what the banner renders (label + ordered list of the six exact rules) as a compact reduced-opacity alert at the top of the schedule block, always visible without interaction, responsive with no horizontal scroll.
- **quickstart.md**: how to verify — run the frontend, load `/`, confirm the rules banner sits above the schedule content; run the Vitest test.
