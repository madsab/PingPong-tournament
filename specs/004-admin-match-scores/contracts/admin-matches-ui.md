# UI Contract: Admin Matches List & Result Form

This feature has no API contract change. It defines two UI behaviours on the admin matches area. Both are verified via Vitest + React Testing Library against the existing components.

## Contract A — Match card score (`MatchesManager`)

**Given** a match card in the matches list:

| Condition | Card MUST show |
|-----------|----------------|
| `games.length > 0` | The games-won score as text `"{aWon} – {bWon}"`, where `aWon` = games team A won, `bWon` = games team B won |
| `games.length === 0` | No score element at all (only matchup + status + actions, as today) |

- The score is derived from `games` (per-game higher score wins); it is not read from any new field.
- Layout stays responsive — the score is text within the existing card, no fixed dimensions (Principle V).

**Testable assertions**:
- A completed match with 3 games (A wins 2) renders text matching `/2\s*–\s*1/`.
- A scheduled match with `games: []` renders no score text.

## Contract B — Result form pre-fill (`ResultForm`)

**Given** the result form is opened for a match:

| Condition | Form MUST |
|-----------|-----------|
| `match.games.length > 0` | Pre-fill one row per saved game: each row's two score inputs hold the saved scores, and each row's player selection reflects the saved `member_a_id` / `member_b_id` |
| `match.games.length === 0` | Behave as today: one blank row per larger-team member, empty score inputs |
| A saved game's member id is `null` | Still pre-fill that game's scores; the player select falls back to the "pick a member" state without crashing |

- The save path and its validation are unchanged: editing a pre-filled form and saving reuses `recordResult` and rejects negative or tied scores (§3.3).

**Testable assertions**:
- Opening the form for a match with games shows score inputs whose values equal the saved scores.
- The player `<select>` values match the saved member ids.
- Changing one score to a valid value and saving calls `recordResult(matchId, <games>)` with the edited value; `onSaved` fires.
- Opening the form for a match with no games still shows empty score inputs (regression guard).
