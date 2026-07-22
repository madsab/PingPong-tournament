# Research: Public Match & Player Views (F2–F4)

Phase 0. The stack, patterns, and rules are already fixed by the repo and the
constitution, so there were **no open NEEDS CLARIFICATION** items. This records the
design decisions made and why.

## Decision 1 — Leaderboard math lives in a pure module

- **Decision**: Add `backend/app/leaderboard.py` with a `LeaderboardEntry` dataclass and
  a pure `compute_leaderboard(members, matches)` function, mirroring `standings.py`.
- **Rationale**: The ranking rules (§3.6) are the risky part and must be test-driven
  (constitution I). Keeping them DB-free lets us test with `SimpleNamespace` stand-ins
  exactly like `test_standings.py`, no Postgres needed. Matches the proven F1 shape
  (constitution IV, SOLID).
- **Alternatives considered**: Computing inside the endpoint (rejected — couples math to
  HTTP, harder to unit-test); a SQL aggregate query (rejected — YAGNI at this scale, and
  the NULL-link + repeated-player rules are clearer in Python).

## Decision 2 — Reuse `decide_match()` for match results

- **Decision**: F3/F4 match results (winner / draw + games-won tally) come from the
  existing `decide_match()` in `standings.py`, plus a small games-won count per side.
- **Rationale**: §3.4 is already implemented and tested there. Re-deriving it would risk
  the two paths disagreeing (SOLID / DRY).
- **Alternatives considered**: A new result helper (rejected — duplicates logic).

## Decision 3 — One `/api/matches` payload serves both F3 and F4

- **Decision**: A single public `GET /api/matches` returns every match with its games,
  player names, status, and result. F3 (schedule) renders the list; F4 (detail) expands a
  row's games. No separate detail endpoint.
- **Rationale**: At tournament scale the whole dataset is tiny — one fetch is simpler than
  a list + per-match detail call (YAGNI, fewer round-trips). The public page is one scroll
  anyway (§4).
- **Alternatives considered**: `GET /api/matches/{id}` for detail (rejected — extra
  endpoint and loading state for no benefit at this scale).

## Decision 4 — Public shapes add player **names**; keep separate from admin shapes

- **Decision**: Add public output schemas that include player **names** (not just ids),
  since F4 shows "who played whom" (FR-006). The existing `MatchOut`/`GameOut` are
  admin-only and expose ids; the public shapes are a superset with names resolved.
- **Rationale**: The public page must show human-readable names; ids are meaningless to a
  visitor. Keeping public and admin schemas separate lets each evolve independently (the
  existing `schemas.py` already documents this separation).
- **Alternatives considered**: Reuse admin `MatchOut` as-is (rejected — no names);
  frontend resolves ids→names from a teams fetch (rejected — extra request + join logic in
  the client).

## Decision 5 — Members with zero completed games stay on the leaderboard

- **Decision**: Every member appears, even with all-zero stats, ranked last by the
  name tiebreak.
- **Rationale**: Keeps the full roster visible early in the tournament (matches the spec
  Assumption). Simple to reason about; revisit only if it gets noisy.
- **Alternatives considered**: Hide zero-game members (rejected for now — hides real
  players before matchday).

## Decision 6 — Schedule ordering: to-play first, then played

- **Decision**: Group to-play matches first, then played; within each group, stable by
  match id (creation order).
- **Rationale**: "What's coming" is the most actionable thing on a tournament schedule;
  played results are also on the standings/detail. Stable id order avoids churn.
- **Alternatives considered**: Played first (rejected — buries upcoming matches); sort by
  a date field (rejected — matches have no scheduled datetime in the model, YAGNI).

## Decision 7 — Frontend reuses F1 patterns and design tokens

- **Decision**: Each new section copies `StandingsSection`'s load-state union
  (loading/error/ready) and `StandingsTable`'s semantic-table layout; all styling reads
  `src/theme/tokens.css`. Sections render as siblings after `StandingsSection` on `/`.
- **Rationale**: Consistency, less code, and the responsive/accessibility work is already
  solved (constitution IV/V). Gold stays reserved for rank-1 (§9.2) — not used here.
- **Alternatives considered**: A new shared table abstraction (rejected — YAGNI; only a
  couple of tables, extract later if a third appears).
