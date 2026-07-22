# Phase 0 Research: Team Ranking Hero (F1)

The spec left few unknowns (defaults were captured in its Assumptions). This file
records the design decisions and why the simpler option won.

## D1 — Standings computed on read (not stored)

- **Decision**: Compute standings in pure Python functions from completed matches on
  every request. Nothing derived is persisted.
- **Rationale**: Mandated by SPECIFICATIONS §7 and cheap at this scale (a few teams,
  dozens of matches). Avoids any "cache out of sync" bug and keeps the ranking rules
  in one well-tested place.
- **Alternatives rejected**: Storing a `points`/`rank` column — adds cache-invalidation
  complexity for no performance benefit at this scale (YAGNI).

## D2 — Signature "The Rift" + slide-in animation with CSS, not a library

- **Decision**: Build the SPECIFICATIONS §9 signature with plain CSS Modules:
  - **The Rift** = a center element with an `Ember → Flame` linear-gradient plus a
    `box-shadow`/`filter: blur` glow. Its "flare" is a keyframe brightening the glow.
  - **Slide-in** = the two leader crests start translated off their own side
    (`transform: translateX(±...)`) and transition to center on mount (a class toggled
    once). Only the top-two crests get this.
  - **Ambient embers** = a few absolutely-positioned dots with a slow upward
    `@keyframes` drift behind the Rift.
  - All motion sits inside `@media (prefers-reduced-motion: reduce)` → final positions,
    no flare, embers hidden (FR-009, §9.5).
- **Rationale**: Everything §9 asks for is expressible with gradients, transforms,
  transitions and keyframes — the boring, obvious solution (constitution III), no new
  dependency (constitution IV).
- **Alternatives rejected**: Installing Tailwind + Shadcn + Magic UI (or framer-motion)
  just for one orchestrated moment is disproportionate. CLAUDE.md says add them only
  when a component genuinely needs them — the Rift and table do not. Revisit if a later
  feature needs richer, stateful animation.

## D2b — §9 design as CSS custom properties (design tokens)

- **Decision**: Encode the §9 palette and type scale once in `src/theme/tokens.css` as
  CSS custom properties (e.g. `--color-ink`, `--color-ember`, `--color-flame`,
  `--color-gold`, `--font-display-weight`). Components reference the variables; no hex
  value is hard-coded in a component's CSS Module.
- **Rationale**: One source of truth in code that mirrors §9's single source of truth in
  the spec — a color change happens in one place. Keeps SOLID (constitution II): visual
  identity is decoupled from component structure.
- **Alternatives rejected**: Repeating hex codes across CSS Modules — drifts out of sync
  with §9 and multiplies the edit surface.

## D2c — Inter font, self-hosted

- **Decision**: Self-host Inter (the §9 family) as a static asset in the frontend, with
  the `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` fallback stack;
  use `tabular-nums` for scores. Preload the weights actually used (800/700/600/400).
- **Rationale**: Inter is §9's chosen family. Self-hosting avoids a runtime dependency on
  a third-party font CDN (privacy + offline-in-Docker friendly) and needs no new
  framework — just files. Fallback keeps text readable before the font loads.
- **Alternatives rejected**: Google Fonts CDN link — adds an external network dependency
  the Docker-local setup doesn't need. A different "standard" face — §9 already chose Inter.

## D3 — Data model scope for this slice

- **Decision**: Model `Team` (with `logo_url`), `Member`, `Match`, `Game` now — the
  minimum required to compute team standings (games won + point difference decide the
  match, per §3.4). `Member` is included because a `Game` references who played, but
  member-level features (F2) are out of scope here.
- **Rationale**: Team standings genuinely depend on per-game scores, so games must
  exist. Everything modeled is used by the ranking computation; nothing speculative.
- **Alternatives rejected**: Storing only match-level win/loss — cannot compute the
  point-difference tiebreak (§3.4.2 / §3.5.2), which the standings require.

## D4 — Getting real data before the admin exists (F6–F13)

- **Decision**: Ship a small `seed.py` that inserts sample teams (with logos), matches
  and games, runnable once for local dev/demo.
- **Rationale**: F1 must be demonstrable and testable end-to-end, but admin data entry
  is a separate, later feature. A seed script is the simplest bridge.
- **Alternatives rejected**: Building admin CRUD now — that is F8–F12, out of scope,
  and would balloon this slice.

## D5 — Team logo/image handling

- **Decision**: Store a `logo_url` string on `Team` (path or URL). When absent, the
  frontend shows a default placeholder (team initials on a colored tile).
- **Rationale**: Simplest representation; image *upload* is an admin concern (later).
  Placeholder keeps layout and animation intact (FR-011).
- **Alternatives rejected**: Binary image storage in Postgres — unnecessary complexity
  for this slice.

## D6 — Test runners

- **Decision**: pytest (backend), Vitest + React Testing Library + jsdom (frontend).
- **Rationale**: The standard, widely-used choices for FastAPI and Vite/React. Test-first
  is non-negotiable (constitution I), so runners must exist before feature code.
- **Alternatives rejected**: None meaningful — these are the defaults for the stack.

## D7 — Responsive layout for "score in the middle"

- **Decision**: Desktop = two teams left/right with the score column between them
  (fl/grid). Mobile = teams stack vertically, score band between the two stacked
  teams. Relative units only.
- **Rationale**: Keeps the "versus, score in the middle" idea on every screen while
  satisfying constitution V (no fixed dimensions, mobile must work).
- **Alternatives rejected**: A fixed-width desktop-only layout — violates constitution V.

## Resolved unknowns

All Technical Context items are resolved; no `NEEDS CLARIFICATION` markers remain.
