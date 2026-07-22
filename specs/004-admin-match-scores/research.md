# Research: Admin Match-Card Scores & Pre-Filled Edit Form

No NEEDS CLARIFICATION markers came out of the spec. The one design decision was resolved with the user during `/speckit-specify`. Recorded here for traceability.

## Decision 1 — What "the score" on a card means

- **Decision**: Show the **match-level games-won score** (e.g. "2 – 1"): the count of games each team won.
- **Rationale**: Chosen by the user. It matches how the match winner is decided for standings (`backend/app/standings.py: decide_match` — most games won), so the card agrees with the ranking. It is one compact number pair that fits the existing card layout on mobile.
- **Alternatives considered**: (a) per-game point breakdown ("11–8 · 9–11 · 11–6") — more detail but no headline and more horizontal space; (b) both — rejected as more than the ask (YAGNI). Out of scope.

## Decision 2 — Where the score data comes from

- **Decision**: Compute games-won on the frontend from `Match.games`, which the admin API already returns.
- **Rationale**: `GET /api/admin/matches` (via `_match_out` in `backend/app/routers/admin.py`) already includes `games` with `team_a_score` and `team_b_score` per game. Backend model guarantees scores are whole numbers and never tied (`game_has_a_winner` constraint), so each game has a clear winner. No new endpoint or field is needed — reuse what's there (constitution Principle IV).
- **Alternatives considered**: adding a computed `score`/`games_won` field to the API response — rejected as unnecessary backend surface for a trivial client-side count (YAGNI).

## Decision 3 — How the edit form pre-fills

- **Decision**: In `ResultForm`, branch the `useState` row initializer: if `match.games.length > 0`, build one `Row` per saved game from `member_a_id`/`member_b_id` and `team_a_score`/`team_b_score`; otherwise keep today's blank generation (one row per larger-team member).
- **Rationale**: Reuses the existing `Row` model, render path, and `recordResult` save + validation. One saved game → one row naturally reproduces repeated smaller-team members (§3.2) without special logic. Scores become strings (`String(score)`) to match the existing `<input>` string state.
- **Missing-player fallback**: `member_a_id`/`member_b_id` are nullable (a member may have been deleted, `ON DELETE SET NULL`). Fall back to `0` for a null id — the same sentinel the current blank generator uses — so the select renders and the organiser can pick a current member before saving (FR-009).
- **Alternatives considered**: reconstructing rows from current rosters and only overlaying scores — rejected because it loses the exact saved pairing and breaks when rosters changed since the result was saved.
