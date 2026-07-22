# Research: Team Logos

The spec had **no open `[NEEDS CLARIFICATION]` markers** — both scope questions
(URL vs. upload, where logos appear) were answered before the spec was written.
This document records the decisions that shape the design.

## Decision 1: Logo source = pasted image URL (not file upload)

- **Decision**: The admin provides a logo by typing/pasting an image URL. It is
  stored in the existing `Team.logo_url` column and rendered with a plain `<img>`.
- **Rationale**: The admin chose this. It reuses infrastructure that already
  exists end-to-end (column, admin `TeamCreate/TeamUpdate.logo_url`, public
  `StandingsEntryOut.logo_url`, and `TeamCrest`'s `<img>`), so it needs no file
  storage, no static-file serving, no `python-multipart`, and no new dependency —
  aligning with YAGNI and "use what's already there".
- **Alternatives considered**: File upload (store + serve files) — rejected: adds
  multipart handling, a storage location, a `StaticFiles` mount, and a new backend
  dependency for a benefit the admin explicitly declined.

## Decision 2: Logos appear everywhere a team name shows publicly

- **Decision**: Show the team logo immediately before the team name in the
  standings hero, standings table, leaderboard Team column, schedule match cards,
  and match-detail headers. Never on admin-page tables.
- **Rationale**: The admin asked for consistent identity across the public page.
  The hero and standings already have the data; the leaderboard and match
  responses do not, so those two API shapes must be extended (FR-007).
- **Alternatives considered**: Standings-only, or standings+leaderboard —
  rejected by the admin in favor of full coverage.

## Decision 3: One shared `TeamLogo` component for tables; keep `TeamCrest` for the hero

- **Decision**: Add a small `TeamLogo` component (renders the image, or a text/
  initials fallback when there is no logo or the image fails to load) and reuse it
  in all public tables. The hero keeps its existing, visually distinct circular
  `TeamCrest`.
- **Rationale**: The "small logo-or-fallback before a name" treatment repeats in
  4+ places — one component with a single responsibility (SOLID) beats copy-paste.
  The hero crest is a different size/shape/animation concern, so it stays separate
  (don't force one component to serve two very different looks — YAGNI on a shared
  abstraction that would need branching).
- **Alternatives considered**: (a) Inline `<img>` in each table — rejected:
  duplicates fallback logic five times. (b) Generalize `TeamCrest` to cover both
  hero and tables — rejected: would add size/variant branching to a component that
  today does one thing well.

## Decision 4: Graceful fallback, no broken images

- **Decision**: When `logo_url` is empty, render the existing text fallback
  (initials in the hero; a neutral slot / name-only in tables). When a URL is set
  but fails to load, the image's error handler collapses to the same fallback.
- **Rationale**: SPECIFICATIONS §9.7 — a visual must never be the only signal, and
  a broken-image icon is worse than no image. Cheap to do with an `<img onError>`
  handler + conditional render.
- **Alternatives considered**: Server-side URL validation / reachability checks —
  rejected: over-engineering (YAGNI); the admin owns the URL and the client-side
  fallback already covers the failure case.

## No further unknowns

Data shapes, endpoints, and render sites are all known from the existing code
(`leaderboard.py`, `schemas.py`, `routers/public.py`, `api/public.ts`, and the
component tree). Design proceeds to Phase 1.
